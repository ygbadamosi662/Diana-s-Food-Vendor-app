const { storage, Connection, User } = require('../models/engine/db_storage')
const util = require('../util');
const { jwt_service } = require('../services/jwt_service');
const { Mail_sender } = require('../services/mail_service');
const Joi = require('joi');
const crypto = require('crypto');
const jwt_web = require('jsonwebtoken');
const { Role, Gender, userStatus } = require('../enum_ish')
const mongoose = require('mongoose');
const MongooseError = mongoose.Error;
/**
 * Contains the AppController class 
 * which defines route handlers.
 * @author Yusuf Gbadamosi <https://github.com/ygbadamosi662>
 */

class AppController {
  static async home(req, res) {
    res.status(200).json({ message: 'Welcome To Food Vendor Api!' });
  }

  /**
   * Register a user.
   *
   * @param {Object} req - the request object
   * @param {Object} res - the response object
   * @return {Promise} a promise that resolves to the response object
   */
  static async register_user(req, res) {
    try {
      const schema = Joi.object({
        fname: Joi
          .string()
          .required(),
        lname: Joi
          .string()
          .required(),
        gender: Joi
          .string()
          .valid(...Object.values(Gender))
          .required(),
        phone: Joi
          .string()
          .required()
          .pattern(/^[8792][01]\d{8}$/),
        email: Joi
          .string()
          .email({ minDomainSegments: 2, tlds: { allow: ['com', 'net'] } })
          .required(),
        password: Joi
          .string()
          .required()
          .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()])[a-zA-Z0-9!@#$%^&*()]{8,}$/),
      });

    // validate body
    const { value, error } = schema.validate(req.body);
    
    if (error) {
      throw error;
    }

    // check email and phone integrity
    const integrity_tasks = await Promise.all([
      User.exists({ email: value.email }),
      User.exists({ phone: value.phone })
    ]);

    // valiadate doc integrity
    if (integrity_tasks[0] || integrity_tasks[1]) {
      if (integrity_tasks[0]) { return res.status(400).json({ msg: 'Email exists'}); }
      if (integrity_tasks[1]) { return res.status(400).json({ msg: 'Phone exists'}); }
    }
    
   
    // create user
    const user = {
      name: {
        fname: value.fname,
        lname: value.lname
      },
      email: value.email,
      phone: value.phone,
      gender: value.gender,
      role: Role.user,
      status: userStatus.active
    };

    // encrypt password
    const pwd = await util.encrypt(value.password);
    // set password
    user.password = pwd;

    const resoled_u = await User.create(user);
    return res
      .status(201)
      .json({
        user: {
          email: resoled_u.email,
          phone: resoled_u.phone,
          status: userStatus.active,
        }
      });
    } catch (error) {

      if (error instanceof MongooseError) {
        console.log('We have a mongoose problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      if (error instanceof Joi.ValidationError) {
        return res.status(400).json({
          msg: 'Invalid request body',
          errors: error.details,
        });
      }
      console.log(error);
      return res.status(500).json({msg: error.message});
    }
  }

  /**
   * Login function that handles the login process for users.
   *
   * @param {Object} req - the request object
   * @param {Object} res - the response object
   * @return {Promise} a promise that resolves to the response sent to the client
   */
  static async login(req, res) {
    try {
      const schema = Joi.object({
        email_or_phone: Joi
          .string()
          .required(),
        password: Joi
          .string()
          .required(),
      });
    
      // validate body
      const { value, error } = schema.validate(req.body);
      
      if (error) {
        throw error;
      }

      let query = {}

      // validate email/phone
      if (/^\d+$/.test(value.email_or_phone)) {
        query = User.findOne({ phone: value.email_or_phone } , 'name password role id email phone gender status');
      } else {
        query = User.findOne({ email: value.email_or_phone } , 'name password role id email phone gender status');
      }

      // validate user
      const user = await query.exec();
      if (!user) {
        return res
          .status(400)
          .json({
          msg: 'email/phone or password or answer incorrect',
        });
      }

      if([userStatus.deactivated, userStatus.deleted, userStatus.banned].includes(user.status)) {
        /**
         * Resolves the status and returns the corresponding API endpoint.
         *
         * @param {string} status - the status to be resolved
         * @return {string|boolean} the corresponding API endpoint or false if deleted or disabled
         */
        const resolve = (status) => {
          let resolve = false;
          if(status === userStatus.deactivated) {
            resolve = '/api/v1/auth/user/reactivate';
          }

          return resolve;
        };

        return res
          .status(400)
          .json({
          msg: `Account ${user.status}`,
          resolve: resolve(user.status),
        });
      }
      
      // validate password
      const is_pwd = await util.validate_encryption(value.password, user.password);

      // validate password
      if (is_pwd === false) {
        return res
          .status(400)
          .json({
          msg: 'email/phone or password incorrect',
        });
      }

      const tokens = await jwt_service.generate_token({
        role: user.role,
        id: user._id.toString(),
        gender: user.gender,
        status: user.status
      });

      
      user.jwt_refresh_token = tokens.refreshToken;

      await user.save();

      return res
        .status(201)
        .json({
          msg: 'Login succesful',
          user: {
            _id: user._id,
            role: user.role,
            name: user.name,
            email: user.email,
            phone: user.phone,
            status: user.status
          },
          tokens: tokens,
        });
      
    } catch (error) {
      if (error instanceof MongooseError) {
        console.log('We have a mongoose problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      if (error instanceof Joi.ValidationError) {
        return res
          .status(400)
          .json({
            msg: error.details,
          });
      }
      console.log(error);
      return res.status(500).json({msg: error.message});
    }
  }

/**
 * Refreshes the access token for a user.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @return {Object} The response containing the new access token and user information.
 */
  static async refreshToken(req, res) {
    try {
      const schema = Joi.object({
        refresh_token: Joi
          .string()
          .required(),
        user_id: Joi
          .string()
          .required(),
      });
    
      // validate body
      const { value, error } = schema.validate(req.body);
      
      if (error) {
        throw error;
      }

      const user = await User.findById(value.user_id, 'jwt_refresh_token email _id role gender').exec();
      // validate user
      if (!user) {
        return res
          .status(400)
          .json({
            msg: 'User does not exist',
          });
      }

      // validate refresh user's refresh_token
      if(user.jwt_refresh_token !== value.refresh_token) {
        return res
          .status(400)
          .json({
            msg: 'Invalid Credential, Refresh token invalid',
          });
      }

      // validate refresh_token
      jwt_web.verify(value.refresh_token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
          return res
            .status(401)
            .json({
              msg: 'Refresh Token expired, user should login again',
              second_chance: false
            });
        }
      });

      // refresh access token
      const newAccessToken = await jwt_service.generate_token({
        role: user.role,
        id: user._id,
        gender: user.gender
      }, true);

      return res
        .status(201)
        .json({
          msg: 'Token refresh succesful',
          user: {
            _id: user._id,
          },
          new_token: newAccessToken,
        });
      
    } catch (error) {
      if (error instanceof MongooseError) {
        console.log('We have a mongoose problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      if (error instanceof Joi.ValidationError) {
        return res
          .status(400)
          .json({
            msg: 'Invalid request body',
            errors: error.details,
          });
      }
      console.log(error);
      return res.status(500).json({msg: error.message});
    }
  }

  /**
   * Logout function that handles logging out a user.
   *
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   * @return {Object} The response with the logged out message.
   */
  static async logout(req, res) {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1]; // Extract the token part
      const user = await User.findById(req.user.id).exec();
      const timestamp = new Date().toISOString();
      
      const jwt = {
        token: token,
        user: user._id.toString(),
        created_on: timestamp,
      };

      // blacklist jwt
      await storage.blacklist_jwt(jwt);

      // reset refresh token
      user.refresh_token = '';

      await user.save();
    
      return res
        .status(201)
        .json({
          msg: 'Logged out succesfully',
        });
      
    } catch (error) {
      if (error instanceof MongooseError) {
        console.log('We have a mongoose problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      console.log(error);
      return res.status(500).json({msg: error.message});
    }
  }

  static async forget_pwd(req, res) {
    try {
      const schema = Joi.object({
        email: Joi
          .string()
          .email()
          .required(),
        front_url: Joi
          .string()
          .required()
      });
    
      // validate body
      const { value, error } = schema.validate(req.body);
      if (error) {
        throw error;
      }

      // validate user
      const user = await user_repo.findByEmail(value.email);
      if(!user) {
        return res
          .status(400)
          .json({
            message: 'Email does not exist',
          });
      }

      const token = crypto.randomBytes(20).toString('hex');
      const tokenexp = new Date(Date.now() + 1800000); // 30mins
      const reset_link = value.front_url + token;
      // console.log(user, 'out trans')

      await Connection.transaction(async () => {
        user.resetPasswordToken = token;
        user.resetPasswordTokenExpires = tokenexp;
        // console.log(user, 'in trans')
        user.save();

        const receiver = {
          to: value.email,
          subject: 'Password Reset',
          text: `Click the following link to reset your password: ${reset_link}, do not share this link with anyone.
          This link will expire in 30 mins. If you didn't make this request then ignore it.`,
        };
    
        try {
          await Mail_sender.sendMail(receiver);
          console.lof('Email sent successfully');
        } catch (error) {
          console.log('Error sending email', error.message);
          return res
            .status(500)
            .json({
              Error: 'Internal server error, error sending email',
            })
        }
      });

      return res
        .status(201)
        .json({
          message: `Password reset link succesfully sent to ${value.email}`,
        })

    } catch (error) {
      if (error instanceof MongooseError) {
        console.log('We have a mongoose problem', error.message);
        return res.status(500).json({error: error.message});
      }
      if (error instanceof Joi.ValidationError) {
        return res
          .status(400)
          .json({
            error: 'Invalid request body',
            errors: error.details,
          });
      }
      console.log(error);
      return res.status(500).json({error: error.message});
    }
  }

  static async validate_reset_pwd_token(req, res) {
    try {
      if(!req.params.token) {
        return res
          .status(400)
          .json({
            message: 'Invalid request, token is required',
          });
      }

      const { token } = req.params
      // checks if token has been blacklisted
      if(await db_storage.get_reset_token(token)) {
        return res
          .status(400)
          .json({
            message: 'Invalid request, token is blacklisted',
          });
      }

      // checks if token has expired
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordTokenExpires: { $gt: Date.now() },

      })

      if(!user) {
        return res
          .status(400)
          .json({
            message: 'Invalid request, token has expired',
          });
      }

      return res
        .status(200)
        .json({
          message: 'Token is valid',
          token,
        });

    } catch (error) {
      if (error instanceof MongooseError) {
        console.log('We have a mongoose problem', error.message);
        return res.status(500).json({error: error.message});
      }
      if (error instanceof Joi.ValidationError) {
        return res
          .status(400)
          .json({
            error: 'Invalid request body',
            errors: error.details,
          });
      }
      console.log(error);
      return res.status(500).json({error: error.message});
    }
  }

  static async reset_password(req, res) {
    try {
      const schema = Joi.object({
        new_pwd: Joi
          .string()
          .required()
          .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()])[a-zA-Z0-9!@#$%^&*()]{8,}$/),
        token: Joi
          .string()
          .required(),
      });
    
      // validate body
      const { value, error } = schema.validate(req.body);
      if (error) {
        throw error;
      }

      const { token, new_pwd } = value
      // checks if token has been blacklisted
      if(await db_storage.get_reset_token(token)) {
        return res
          .status(400)
          .json({
            message: 'Invalid request, token is blacklisted',
          });
      }

      
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordTokenExpires: { $gt: Date.now() },

      })

      // checks if token has expired
      if(!user) {
        return res
          .status(400)
          .json({
            message: 'Invalid request, token expired',
          });
      }

      user.password = await util.encrypt_pwd(new_pwd);
      user.save();

      return res
        .status(201)
        .json({
          Message: 'Password successfully updated',
        });
    } catch (error) {
      if (error instanceof MongooseError) {
        console.log('We have a mongoose problem', error.message);
        return res.status(500).json({error: error.message});
      }
      if (error instanceof Joi.ValidationError) {
        return res
          .status(400)
          .json({
            error: 'Invalid request body',
            errors: error.details,
          });
      }
      console.log(error);
      return res.status(500).json({error: error.message});
    }
  }
}

module.exports = AppController;
