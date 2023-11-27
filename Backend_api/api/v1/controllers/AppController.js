const { user_repo, User } = require('../repos/user_repo');
const { storage, Connection } = require('../models/engine/db_storage')
const util = require('../util');
const { jwt_service } = require('../services/jwt_service');
const { Mail_sender } = require('../services/mail_service');
const Joi = require('joi');
const crypto = require('crypto');
const jwt_web = require('jsonwebtoken');
const { Role, Gender } = require('../enum_ish')
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
    const integrity_task = Promise.all([
      user_repo.existsByEmail(value.email),
      user_repo.existsByPhone(value.phone)
    ]);
    const resolves = await integrity_task;

    // handle integrity
    if (resolves[0] || resolves[1]) {
      if (resolves[0]) { return res.status(400).json({ msg: 'Email exists'}); }
      if (resolves[1]) { return res.status(400).json({ msg: 'Phone exists'}); }
    }
    
   
    // persist user to the db
    const user = {
      name: {
        fname: value.fname,
        lname: value.lname
      },
      email: value.email,
      phone: value.phone,
      gender: value.gender,
      role: Role.user,
    };

    // encrypt pwd
    user.password = await util.encrypt_pwd(value.password);

    const resoled_u = await user_repo.create_user(user);
    return res
      .status(201)
      .json({user: {
        email: resoled_u.email,
        phone: resoled_u.phone
      }});
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

      let user = {}

      // validate email/phone
      if (/^\d+$/.test(value.email_or_phone)) {
        const who = await user_repo.findByPhone(value.email_or_phone, ['name', 'password', 'role', 'id', 'email', 'gender']);
        if (!who) {
          return re
            .status(400)
            .json({
            msg: 'email/phone or password incorrect',
          });
        }
        user = who;
      } else {
        const who = await user_repo.findByEmail(value.email_or_phone, ['name', 'password', 'role', 'id', 'email', 'phone', 'gender']);

        if (!who) {
          return re
            .status(400)
            .json({
            msg: 'email/phone or password incorrect',
          });
        }
        user = who;
      }
      
      const is_pwd = await util.validate_pwd(value.password, user.password);

      // validate password
      if (is_pwd === false) {
        return res
          .status(400)
          .json({
          msg: 'email/phone or password incorrect',
        });
      }

      const tokens = await jwt_service.generate_token({
        email: user.email,
        role: user.role,
        id: user._id.toString(),
        gender: user.gender
      });

      user.refresh_token = tokens.refreshToken;
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
            phone: user.phone
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
            error: 'Invalid request body',
            errors: error.details,
          });
      }
      console.log(error);
      return res.status(500).json({msg: error.message});
    }
  }

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

      const user = await User.findById(value.user_id, 'refresh_token email _id role gender').exec();
      // validate user
      if (!user) {
        return res
          .status(400)
          .json({
            msg: 'User does not exist',
          });
      }

      // validate refresh user's refresh_token
      if(user.refresh_token !== value.refresh_token) {
        return res
          .status(400)
          .json({
            msg: 'Refresh token invalid',
          });
      }

      // validate refresh_token
      jwt_web.verify(value.refresh_token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
          return res
            .status(401)
            .json({
              msg: 'Token expired',
              second_chance: false
            });
        }
      });

      // refresh access token
      const newAccessToken = await jwt_service.generate_token({
        email: user.email,
        role: user.role,
        _id: user._id,
        gender: user.gender
      }, true);

      return res
        .status(201)
        .json({
          msg: 'Token refresh succesful',
          user: {
            _id: user._id,
            role: user.role,
            name: user.name,
            email: user.email,
            phone: user.phone
          },
          token: newAccessToken,
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

  static async logout(req, res) {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1]; // Extract the token part
      const user_promise = user_repo.findByEmail(req.user.email, ['id']);
      const timestamp = new Date().toISOString();
      let user = await user_promise;
      const jwt = {
        token: token,
        user: user.id,
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
