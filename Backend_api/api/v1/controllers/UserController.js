const util = require('../util');
const { shipping_service } = require('../services/shipping_service');
const { appAx } = require('../appAxios');
const { Shipment, Address, Transaction, User, Food, Review, Order, page_info } = require('../models/engine/db_storage')
const { notification_service } = require('../services/notification_service');
const { Types } = require('mongoose');
const { Connection } = require('../models/engine/db_storage');
const MongooseError = require('mongoose').Error;
const JsonWebTokenErro = require('jsonwebtoken').JsonWebTokenError;
const Joi = require('joi');
const { Collections, 
  Order_Status, 
  Transaction_Status, 
  Role, 
  Type, 
  Order_type, 
  Where, 
  States,
  Country,
  Time_share,
  userStatus,
  Note_Status,
  Schedule_type,
  Time_Directory,
  Pre_order_Status
 } = require('../enum_ish');
/**
 * Contains the UserController class 
 * which defines route handlers.
 * @author Yusuf Gbadamosi <https://github.com/ygbadamosi662>
 */

class UserController {
  static async get_user(req, res) {
    // serves both user and admin
    try {
      if(!req.params.id) {
        return res
          .status(400)
          .json({ msg: 'Bad request, id is required'});
      }

      const query = User.findById(req.params.id);

      // if not user or admin
      if((req.user.id !== req.params.id) || (![Role.admin, Role.super_admin].includes(req.user.role))) {
        query
          .select(
            [
              'name',
              '_id',
              'faves',
              'gender'
            ].join(' ')
            );
      }
      const user = await query
        .populate('faves')
        .exec();
      // if user does not exist
      if(!user) {
        return res
          .status(400)
          .json({ msg: 'User does not exist'});
      }
      user.password = "";

      return res
        .status(200)
        .json({ user: user});
    } catch (error) {
      if (error instanceof MongooseError) {
        console.log('We have a mongoose problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      if (error instanceof JsonWebTokenErro) {
        console.log('We have a jwt problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      console.log(error);
      return res.status(500).json({msg: error.message});
    }
  }

  /**
   * Asynchronously deletes or deactivates the user account based on the provided request and response.
   *
   * @param {Object} req - the request object containing the user information
   * @param {Object} res - the response object for sending the result
   * @return {Object} the result of the delete or deactivate operation
   */
  static async delete_or_deactivate_account(req, res) {
    try {
      const schema = Joi.object({
        password: Joi
          .string()
          .required()
          .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()])[a-zA-Z0-9!@#$%^&*()]{8,}$/),
        want: Joi
          .string()
          .valid(...[userStatus.deleted, userStatus.deactivated])
          .required(),
      });

      // validate body
      const { value, error } = schema.validate(req.body);
      
      if (error) {
        throw error;
      }

      const { password, want } = value;

      const user = await User.findById(req.user.id);

      // if user does not exist
      if(!user) {
        return res
          .status(400)
          .json({ msg: 'User does not exist'});
      }

      const is_pwd = await util.validate_encryption(password, user.password);

      // validate password
      if (is_pwd === false) {
        return res
          .status(400)
          .json({
          msg: 'password/ans incorrect',
        });
      }

      if(user.status === userStatus.deactivated) {
        return res
          .status(400)
          .json({
            msg: 'User Account is already deactivated',
          })
      }

      user.status = want;

      // log user out
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1]; // Extract the token part
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

      // save
      await user.save();

      return res
        .status(200)
        .json({ 
          msg: `User ${want} successfully`,
        });
    } catch (error) {
      if (error instanceof MongooseError) {
        console.log('We have a mongoose problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      if (error instanceof JsonWebTokenErro) {
        console.log('We have a jwt problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      console.log(error);
      return res.status(500).json({msg: error.message});
    }
  }

  /**
   * Reactivates a user account by validating password and answer, updating status,
   * blacklisting JWT, and resetting refresh token.
   *
   * @param {Object} req - the request object
   * @param {Object} res - the response object
   * @return {Object} JSON object with the reactivation result message
   */
  static async reactivate_account(req, res) {
    try {
      const schema = Joi.object({
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

      const { password } = value;

      const user = await User.findById(req.user.id);

      // if user does not exist
      if(!user) {
        return res
          .status(400)
          .json({ msg: 'User does not exist'});
      }

      const is_pwd = await util.validate_encryption(password, user.password);

      // validate password
      if (is_pwd === false) {
        return res
          .status(400)
          .json({
          msg: 'password/ans incorrect',
        });
      }

      if(user.status === userStatus.active) {
        return res
          .status(400)
          .json({
            msg: 'User Account is already active',
          })
      }

      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1]; // Extract the token part
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

      // reactivate account
      user.status = userStatus.active;

      // save
      await user.save();

      return res
        .status(200)
        .json({ 
          msg: 'Account reactivated succesfully',
        });
    } catch (error) {
      if (error instanceof MongooseError) {
        console.log('We have a mongoose problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      if (error instanceof JsonWebTokenErro) {
        console.log('We have a jwt problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      console.log(error);
      return res.status(500).json({msg: error.message});
    }
  }

  static async create_address(req, res) {
    try {
      const schema = Joi.object({
        where: Joi
          .string()
          .valid(...Object.values(Where)),
        street_addy: Joi
          .string()
          .required(),
        city: Joi
          .string()
          .required(),
        local_description: Joi
          .string(),
        state: Joi
          .string()
          .valid(...Object.values(States))
          .default(States.lagos),
        country: Joi
          .string()
          .valid(...Object.values(Country))
          .default(Country.nigeria),
        zip_code: Joi
          .string()
          .length(5)
          .pattern(/^\d+$/)
          .required(),
      });

    // validate body
    const { value, error } = schema.validate(req.body);
    
    if (error) {
      throw error;
    }

    const { where, street_addy, city, local_description, state, country, zip_code } = value;
    const address = {
      street_addy,
      city,
      state,
      country,
      zip_code,
      user: new Types.ObjectId(req.user.id),
    };

    if(local_description) {
      address['local_description'] = local_description;
    }
  
    if(where) {
      address['where'] = where;
    }
  
    // create address
    await Address.create(address);

    return res
      .status(201)
      .json({
        msg: 'Address created successfully',
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

  static async get_food(req, res) {
    try {
      if (!req.params.id) { 
        return res
        .status(400)
        .json({ msg: 'Invalid request, id is required'}); 
      }
      const food = await Food
        .findById(req.params.id)
        .exec();

      if (!food) {
        return res
          .status(400)
          .json({
            msg: 'Bad request, food does not exist',
          });
      }

      return res
        .status(200)
        .json({
          food: food,
        });
    } catch (error) {
      
      if (error instanceof MongooseError) {
        console.log('We have a mongoose problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      if (error instanceof JsonWebTokenErro) {
        console.log('We have a jwt problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      console.log(error);
      return res.status(500).json({msg: error.message});
    }
  }

  static async test_pwt(req, res) {
    try {
      let now = new Date();
      now.setMinutes(now.getMinutes() + 5);
      
      const paystack_res = await appAx.post('https://api.paystack.co/charge', JSON.stringify({
        email: "vendor@gmail.com",
        amount:  100000,
        bank_transfer: {
          "account_expires_at": "2023-12-12T13:10:00Z"
        }
      }));
      console.log(paystack_res)
      return res
        .status(200)
        .json({
          pwt: paystack_res,
        });
    } catch (error) {
      
      if (error instanceof MongooseError) {
        console.log('We have a mongoose problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      if (error instanceof JsonWebTokenErro) {
        console.log('We have a jwt problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      console.log(error);
      return res.status(500).json({msg: error.message});
    }
  }

  static async get_review(req, res) {
    try {
      if (!req.params.id) { 
        return res
        .status(400)
        .json({ msg: 'Invalid request, id is required'}); 
      }
      const rev = await Review.findById(req.params.id);

      if (!rev) {
        return res
          .status(401)
          .json({
            msg: 'Bad request, review does not exist',
          });
      }

      return res
        .status(200)
        .json({
          review: rev,
        });
    } catch (error) {
      
      if (error instanceof MongooseError) {
        console.log('We have a mongoose problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      if (error instanceof JsonWebTokenErro) {
        console.log('We have a jwt problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      console.log(error);
      return res.status(500).json({msg: error.message});
    }
  }

  static async get_notification(req, res) {
    try {
      if (!req.params.id) { 
        return res
        .status(400)
        .json({ msg: 'Invalid request, id is required'}); 
      }
      

      const user = await User
        .findById(req.user.id)
        .exec();

      if (!user) {
        return res
          .status(400)
          .json({
            msg: 'Bad request, user does not exist',
          });
      }

      const notification = user.notifications.id(new Types.ObjectId(req.params.id));

      if (!notification) {
        return res
          .status(400)
          .json({
            msg: 'Bad request, notification does not exist',
          });
      }

      return res
        .status(200)
        .json({
          notification: notification,
        });
    } catch (error) {
      
      if (error instanceof MongooseError) {
        console.log('We have a mongoose problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      if (error instanceof JsonWebTokenErro) {
        console.log('We have a jwt problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      console.log(error);
      return res.status(500).json({msg: error.message});
    }
  }

  /**
   * Retrieves food items based on the provided request and response objects.
   *
   * @param {Object} req - the request object
   * @param {Object} res - the response object
   * @return {Object} an object containing the retrieved food items and page information
   */
  static async get_foods(req, res) {
    try {
      const schema = Joi.object({
        count: Joi
          .boolean()
          .default(false),
        filter: Joi
          .object({
            name: Joi
              .string(),
            fave_count: Joi
              .array()
              .items(Joi.number().integer()),
            types: Joi
              .array()
              .items(Joi.string().valid(...Object.values(Type))),
            schedules: Joi
              .object({
                size_range: Joi
                  .array()
                  .items(Joi.number().integer().precision(2)),
                for_when_range: Joi
                  .object({
                    range: Joi
                      .object({
                        dir: Joi
                          .string()
                          .valid(...Object.values(Time_Directory))
                          .default(Time_Directory.future),
                        time_share: Joi
                          .string()
                          .valid(...Object.keys(Time_share))
                          .default(Object.keys(Time_share)[0]),
                        times: Joi
                          .number()
                          .integer()
                          .default(1),
                      }),
                    exact: Joi
                      .date(),
                  })
                  .custom((value, helpers) => {
                    const { exact, range } = value;
                    if(Object.values(value).length === 0) {
                      return helpers.error('Validation Error: no values found');
                    }
                    if(exact && range) {
                      return helpers.error('Validation Error: You either set the exact field or set the range field, can\'t have it both ways');
                    }
                    return value;
                  }),
                expiry_time_range: Joi
                  .object({
                    range: Joi
                      .object({
                        dir: Joi
                          .string()
                          .valid(...Object.values(Time_Directory))
                          .default(Time_Directory.future),
                        time_share: Joi
                          .string()
                          .valid(...Object.keys(Time_share))
                          .default(Object.keys(Time_share)[0]),
                        times: Joi
                          .number()
                          .integer()
                          .default(1),
                      }),
                    exact: Joi
                      .date(),
                  })
                  .custom((value, helpers) => {
                    const { exact, range } = value;
                    if(Object.values(value).length === 0) {
                      return helpers.error('Validation Error: no values found');
                    }
                    if(exact && range) {
                      return helpers.error('Validation Error: You either set the exact field or set the range field, can\'t have it both ways');
                    }
                    return value;
                  }),
                available_qty_range: Joi
                  .array()
                  .items(Joi.number().integer()),
                total_qty_range: Joi
                  .array()
                  .items(Joi.number().integer()),
                type: Joi
                  .string()
                  .valid(...Object.values(Schedule_type))
                  .default(Schedule_type.one_off),
                hashtag: Joi
                  .string(),
                createdAt: Joi
                  .object({
                    range: Joi
                      .object({
                        time_share: Joi
                          .string()
                          .valid(...Object.keys(Time_share))
                          .default(Object.keys(Time_share)[0]),
                        times: Joi
                          .number()
                          .integer()
                          .default(1),
                      }),
                    exact: Joi
                      .date(),
                  })
                  .custom((value, helpers) => {
                    if(Object.values(value).length === 0) {
                      return helpers.error('Validation Error: no values found');
                    }
                    const { exact, range } = value;
                    if(exact && range) {
                      return helpers.error('Validation Error: You either set the exact field or set the range field, can\'t have it both ways');
                    }
                    return value;
                  }),
              }),
            price_range: Joi
              .array()
              .items(Joi.number().integer().precision(2)),
            qty_range: Joi
              .array()
              .items(Joi.number().integer()),
            createdAt: Joi
              .object({
                range: Joi
                  .object({
                    time_share: Joi
                      .string()
                      .valid(...Object.keys(Time_share))
                      .default(Object.keys(Time_share)[0]),
                    times: Joi
                      .number()
                      .integer()
                      .default(1),
                  }),
                exact: Joi
                  .date(),
              })
              .custom((value, helpers) => {
                if(Object.values(value).length === 0) {
                  return helpers.error('Validation Error: no values found');
                }
                const { exact, range } = value;
                if(exact && range) {
                  return helpers.error('Validation Error: You either set the exact field or set the range field, can\'t have it both ways');
                }
                return value;
              }),
          }),
        page: Joi
          .number()
          .integer()
          .default(1),
        size: Joi
          .number()
          .integer()
          .default(20),
      });

      // validate body
      const { value, error } = schema.validate(req.body);
      
      if (error) {
        throw error;
      }

      const { filter, page, size, count } = value;

      let query = {};
      // if filter is set
      if(filter) {
        // building filter
        const { name, fave_count, types, price_range, qty_range, schedules } = filter;

        if(schedules) {
          const {
            size_range, 
            for_when_range, 
            expiry_time_range, 
            available_qty_range, 
            total_qty_range,
            createdAt,
            hashtag
          } = schedules;

          if(size_range) {
            const q = util.range_query(size_range, res, 'schedules');
            if(size_range.length === 1) {
              query["schedules"] = q;
            } else {
              query.$expr = q;
            }
          }

          if(for_when_range) {
            const { exact, range } = for_when_range;
            if(exact) {
              query['schedules.for_when'] = exact;
            }
            if(range) {
              const { times, time_share, dir } = range;
              // between now and the stipulated time
              query['schedules.for_when'] = util.date_query(Time_share[time_share], times, dir);
            }
          }

          if(expiry_time_range) {
            const { exact, range } = expiry_time_range;
            if(exact) {
              query['schedules.expiry_time'] = exact;
            }
            if(range) {
              const { times, time_share, dir } = range;
              // between now and the stipulated time
              query['schedules.expiry_time'] = util.date_query(Time_share[time_share], times, dir);
            }
          }

          if(available_qty_range) {
            query["schedules.available_qty"] = util.range_query(available_qty_range, res);
          }

          if(total_qty_range) {
            query["schedules.total_qty"] = util.range_query(total_qty_range, res);
          }

          if(hashtag) {
            query["schedules.hashtag"] = hashtag;
          }

          if(createdAt) {
            const { exact, range } = createdAt;
            if(exact) {
              query.createdAt = exact;
            }
            if(range) {
              const { times, time_share } = range;
              // between now and the stipulated time
              query.createdAt = { 
                $lte: new Date(), 
                $gte: util.last_times(Time_share[time_share], times, Time_Directory.past)
              };
            }
          }
        }
        
        if(name) {
          query.name = name;
        }

        if(price_range) {
          query["price"] = util.range_query(price_range, res);
        }

        if(qty_range) {
          query["qty"] = util.range_query(qty_range, res);
        }

        if(fave_count) {
          query["fave_count"] = util.range_query(fave_count, res);
        }

        if(types) {
          query.types = { $in: types };
        }
      }

      // if count is true, consumer just wants a count of the filtered documents
      if (count) {
        const result = await Food
          .countDocuments(query);

        return res
          .status(200)
          .json({
            count: result,
          });
      }

      const { haveNextPage, currentPageExists, totalPages } = await page_info(query, Collections.Food, size, page);

      let gather_data = [];

      if(currentPageExists) {
        const foods = await Food
          .find(query)
          .skip((page - 1) * size)
          .limit(size)
          .sort({ createdAt: -1 })
          .exec(); //get foods

        gather_data = [
          foods,
          haveNextPage, //have next page
          totalPages, //total pages
        ];
      }

      if(!currentPageExists) {
        gather_data = [
          [],
          haveNextPage, //have next page
          totalPages, //total pages
        ];
      }
      
      return res
        .status(200)
        .json({
          foods: gather_data[0],
          have_next_page: gather_data[1],
          total_pages: gather_data[2],
        });
        
    } catch (error) {
      if (error instanceof MongooseError) {
        console.log('We have a mongoose problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      if (error instanceof JsonWebTokenErro) {
        console.log('We have a jwt problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      console.log(error);
      return res.status(500).json({msg: error.message});
    }
  }

  static async update_user(req, res) {
    try {
      const schema = Joi.object({
        fname: Joi
          .string(),
        lname: Joi
          .string(),
        aka: Joi
          .string(),
        dob: Joi
          .date(),
        sensitive: Joi.object({
            phone: Joi
              .string()
              .pattern(/^[8792][01]\d{8}$/)
              .required(),
            email: Joi
              .string()
              .email({ minDomainSegments: 2, tlds: { allow: ['com', 'net'] } })
              .required(),
            new_password: Joi
              .string()
              .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()])[a-zA-Z0-9!@#$%^&*()]{8,}$/)
              .required(),
          }),
        password: Joi
          .string()
          .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()])[a-zA-Z0-9!@#$%^&*()]{8,}$/),
      })
      .custom((value, helpers) => {
        if(Object.values(value).length === 0) {
          return helpers.error('Validation Error: no values found');
        }
        const { sensitive, password } = value;
        const { phone, email, new_password } = sensitive;
        if(phone || email || new_password) {
          if(!password) {
            return helpers.error('Validation Error: Password is required for updating sensitive fields(email, phone, password');
          }
        }
        return value;
      });

      // validate body
      const { value, error } = schema.validate(req.body);
      if (error) {
        throw error;
      }

      // if no value is set
      if(!value) {
        return res
          .status(400)
          .json({ msg: 'No data provided'});
      }
      const { fname, lname, aka, dob, sensitive, password } = value;
      
      const user = await User.findOne({ email: req.user.email }).exec();

      // validates password for updating sensitive data
      if (sensitive) {
        const { phone, email, new_password } = sensitive;
        const is_pwd = await util.validate_encryption(password, user.password);
        // validate password
        if(!is_pwd) {
          return res
              .status(400)
              .json({ msg: 'Invalid Credentials'})
        }

        if (email) {
          user.email = email;
        }
        if (phone) {
          user.phone = phone;
        }
        if (new_password) {
          user.password = await util.encrypt(new_password);
        }
      }

      if(fname) { user.name.fname = fname; }
      if(lname) { user.name.lname = lname; }
      if(dob) { user.dob = dob; }
      if(aka) { user.name.aka = aka; }
      if(aka) { user.name.aka = aka; }

      await user.save();
      user.password = "";
      user.notifications = [];
      return res
        .status(201)
        .json({ 
          msg: 'User succesfully updated',
          user: user,
        });

    } catch (error) {
      
      if (error instanceof MongooseError) {
        console.log('We have a mongoose problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      if (error instanceof JsonWebTokenErro) {
        console.log('We have a jwt problem', error.message);
        res.status(500).json({msg: error.message});
      }
      console.log(error);
      return res.status(500).json({msg: error.message});
    }
  }

  static async fave_food_or_not(req, res) {
    try {
      const schema = Joi.object({
        id: Joi
          .string()
          .required(),
        fave_or_not: Joi
          .boolean()
          .default(true),
      });

      // validate body
      const { value, error } = schema.validate(req.body);
      
      if (error) {
        throw error;
      }

      const food_pr = Food.findById(value.id);
      const user_pr = user_repo.findByEmail(req.user.email);

      const food = await food_pr;
      const user = await user_pr;

      let msg = '';

      // fave
      if(value.fave_or_not) {
        // checks if user has faved the food
        if(user.faves.includes(food._id)) {
          return res
            .status(200)
            .json({
              msg: `Food with ${food.id} is already faved by the user`
            });
        }
        // update food
        food.fave_count = food.fave_count + 1;

        // update user
        user.faves.push(food);

        msg = `user faved ${food.name} successfully`;
      }

      // unfave
      if(!value.fave_or_not) {
        // checks if user has faved the food
        if(!user.faves.includes(food._id)) {
          return res
            .status(200)
            .json({
              msg: `Food with ${food.id} is not faved by the user`
            });
        }
        // update food
        food.fave_count = food.fave_count - 1;

        // update user
        user.faves = user.faves.filter(fave => fave.toString() !== food._id.toString());

        msg = `user unfaved ${food.name} successfully`;
      }

      // save both
      await Connection.transaction(async () => {
        await food.save();
        await user.save();
      });

      return res
        .status(201)
        .json({
          msg: msg,
        });
      
    } catch (error) {
      
      if (error instanceof MongooseError) {
        console.log('We have a mongoose problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      if (error instanceof JsonWebTokenErro) {
        console.log('We have a jwt problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      console.log(error);
      return res.status(500).json({msg: error.message});
    }
  }

  static async review_food(req, res) {
    try {
      const schema = Joi.object({
        id: Joi
          .string()
          .required(),
        comment: Joi
          .string(),
        stars: Joi
          .number()
          .integer()
          .min(0)
          .max(5)
          .default(0),
      });

      // validate body
      const { value, error } = schema.validate(req.body);
      
      if (error) {
        throw error;
      }

      // check if recipe exists
      const food = await Food
                    .findById(value.id)
                    .exec();
      if(!food) {
        return res
          .status(400)
          .json({
            msg: 'Invalid Request, food does not exist',
          });
      }

      const user_pr = user_repo.findByEmail(req.user.email);

      // create review
      const rev = await Review.create({
        comment: value.comment,
        stars: value.stars,
        food: food,
        user: await user_pr,
      });

      
      return res
        .status(201)
        .json({
          msg: `user reviewed ${food.name} successfully`,
        });
    } catch (error) {
      
      if (error instanceof MongooseError) {
        console.log('We have a mongoose problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      if (error instanceof JsonWebTokenErro) {
        console.log('We have a jwt problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      console.log(error);
      return res.status(500).json({msg: error.message});
    }
  }

  static async add_to_cart(req, res) {
    try {
      const schema = Joi.object({
        food_id: Joi
          .string()
          .required(),
        qty: Joi
          .number()
          .integer()
          .min(1)
          .default(1),
        pre_order: Joi.object({
          schedule_id: Joi
            .string()
            .required(),
          delivery_time: Joi
            .date()
            .default(null),
        }),
      });

      // validate body
      const { value, error } = schema.validate(req.body);
      
      if (error) {
        throw error;
      }

      const { food_id, qty, pre_order } = value;

      // validate delivery time
      if(pre_order) {
        if(pre_order.delivery_time) {
          if(pre_order.delivery_time.getTime() < Date.now()) {
            return res
              .status(400)
              .json({
                msg: 'Invalid request, delivery must have a reasonable timing in the future',
              });
          }
        }
      }

      // check if food exists
      const food = await Food
        .findById(food_id)
        .exec();

      // validate food
      if(!food) {
        return res
          .status(400)
          .json({
            msg: 'Invalid Request, food does not exist',
          });
      }

      if(pre_order) {
        // validate schedule
        if(!food.schedules.id(new Types.ObjectId(pre_order.schedule_id))) {
          return res
            .status(400)
            .json({
              msg: 'Invalid Request, schedule does not exist',
            });
        }
      }

      // validate qty
      if(!util.can_food_fullfill_order(food, qty, pre_order ? pre_order.schedule_id : null)) {
        return res
          .status(400)
          .json({
            msg: `Invalid Request, not enough ${pre_order ? "schedule "+food.schedules.id(new Types.ObjectId(pre_order.schedule_id)).hashtag: food.name} in stock`,
          });
      }

      const user = await User.findById(req.user.id);

      // find open cart
      let order = await Order
        .findOne({
          user: user._id,
          status: Order_Status.in_cart,
        })
        .populate('pre_orders.order_content.food order_content.food')
        .exec();

      let added_flag = false;
      const cost = food.price * qty;

      // if no existing cart
      if((added_flag === false) && !order) {
        // if pre-order
        if((added_flag === false) && (pre_order)) {
          const { schedule_id, delivery_time } = pre_order;
          const schedule = food.schedules.id(new Types.ObjectId(schedule_id));
          const now = new Date();
          // check if food schedule have expired
          if(now.getTime() > schedule.expiry_time.getTime()) {
            return res
              .status(400)
              .json({
                msg: `${schedule.hashtag} schedule has expired`,
              });
          }
          // create pre-order
          const new_pre_order = {
            order_content: [{
              food: food,
              qty: qty,
              food_schedule: new Types.ObjectId(schedule_id),
            }],
            ready_time: delivery_time ? delivery_time : schedule.for_when,
            total_qty: qty,
            order_total: cost,
            total: cost
          };

          // create order
          order = await Order.create({
            user: user,
            status: Order_Status.in_cart,
            pre_orders: [new_pre_order],
            total_qty: qty,
            total: cost,
            order_total: cost
          });

          // update food schedule
          // let pre_order_id = order.pre_orders[0]._id.toString();
          // let ssf = schedule.orders;
          // ssf.push({
          //   order: order,
          //   user: user,
          //   pre_order_id: pre_order_id,
          //   qty: value.qty,
          // })
          // schedule.orders = ssf;
          added_flag = true;
        }

        // not pre-order
        if((added_flag === false) && (!pre_order)) {
          order = await Order.create({
            user: user,
            status: Order_Status.in_cart,
            order_content: [{
              food: food,
              qty: qty,
            }],
            total_qty: qty,
            order_total: cost,
            total: cost
          });
        }
      } 
      // if existing cart
      if((added_flag === false) && order) {
        // if pre-order
        if(pre_order) {
          const { schedule_id, delivery_time } = pre_order;
          const schedule = food.schedules.id(new Types.ObjectId(schedule_id));
          const now = new Date();
          // check if food schedule have expired
          if(now.getTime() > schedule.expiry_time.getTime()) {
            return res
              .status(400)
              .json({
                msg: `${schedule.hashtag} schedule has expired`,
              });
          }
    
          if(order.pre_orders.length > 0) {
            if(order.pre_orders.length === 1) {
              if(delivery_time) {
                if(delivery_time.getTime() === order.pre_orders[0].ready_time.getTime()) {
                  order.pre_orders[0].order_content.push({
                    food: food,
                    qty: qty,
                    food_schedule: new Types.ObjectId(schedule_id),
                  });
                  order.pre_orders[0].total += cost
                  order.pre_orders[0].order_total += cost

                  // added
                  added_flag = true;
                }
              }

              if(!added_flag) {
                const new_preOrder = {
                  order_content: [{
                    food: food,
                    qty: qty,
                    food_schedule: new Types.ObjectId(schedule_id),
                  }],
                  ready_time: delivery_time ? delivery_time : schedule.for_when,
                  total_qty: qty,
                  order_total: cost,
                  total: cost
                };
                order.pre_orders.push(new_preOrder);
                added_flag = true;
              }

            }

            if(order.pre_orders.length > 1) {
              if(delivery_time) {
                order.pre_orders = order.pre_orders?.map((pr) => {
                  // delivery time or ready time matches any existing pre-order
                  if(
                    (pr.ready_time.getTime() === delivery_time.getTime()) || 
                    (schedule.for_when.getTime() === pr.ready_time.getTime())
                  ) {
                    // update pre-order
                    pr.order_content.push({
                      food: food,
                      qty: qty,
                      food_schedule: new Types.ObjectId(schedule_id),
                    });
                  
                    pr.total_qty += qty;
                    pr.order_total += cost;
                    pr.total += cost;
                  
                    // added
                    added_flag = true;
                    return pr;
                  }
                  return pr;
                });
              }

              if(!added_flag) {
                // create pre-order
                order.pre_orders.push({
                  order_content: [{
                    food: food,
                    qty: qty,
                    food_schedule: new Types.ObjectId(schedule_id),
                  }],
                  ready_time: delivery_time ? delivery_time : schedule.for_when,
                  total_qty: qty,
                  order_total: cost,
                  total: cost
                });
              }
            }

            if(added_flag) {
              order.total_qty += qty;
              order.order_total += cost;
              order.total += cost;
            }
          }
        }

        // not pre-order
        if((added_flag === false) && (!pre_order)) {
          order.order_content.push({
            food: food,
            qty: qty,
          });
          order.total_qty += qty;
          order.total += cost;
          order.order_total += cost;
        }
      }

      // save order
      await order.save();

      return res
        .status(201)
        .json({
          msg: `item added to cart successfully`,
          order: order._id
        });
    } catch (error) {
      
      if (error instanceof MongooseError) {
        console.log('We have a mongoose problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      if (error instanceof JsonWebTokenErro) {
        console.log('We have a jwt problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      console.log(error);
      return res.status(500).json({msg: error.message});
    }
  }

  // when payment have been implemented, come back here
  static async checkout(req, res) {
    try {
      /**
       * Check if the order type is delivery.
       * 
       * @param {object} req - The request object.
       * @returns {boolean} - True if the order type is delivery, false otherwise.
       * @throws {Error} - If there is an error while checking the order type.
       */
      const gossip = (req) => {
        try {
          // Check if the order type is delivery
          if (req.body.type === Order_type.delivery) {
            return true;
          }
          return false;
        } catch (error) {
          // Throw any error that occurs while checking the order type
          throw error;
        }
      };

      const schema = Joi.object({
        order_id: Joi
          .string()
          .required(),
        type: Joi
          .string()
          .valid(...Object.values(Order_type))
          .default(Order_type.pickup),
        if_delivery: Joi
          .object({
            if_old_addres: Joi
              .boolean()
              .required(),
            address_id: Joi
              .string()
              .custom((value, helpers) => {
                const { if_old_address, type } = this.context();

                if(if_old_address) {
                  if(value) {
                    return value;
                  }
                  return helpers.error('invalid request, address_id is required');
                }
                return;
              }),
            new_address: Joi
              .object({
                where: Joi
                  .string()
                  .valid(...Object.values(Where))
                  .default(Where.other),
                addy: Joi
                  .string()
                  .required(),
                city: Joi
                  .string()
                  .required(),
                country: Joi
                  .string()
                  .valid(...Object.values(Countries))
                  .default(Countries.nigeria),
                states: Joi
                  .string()
                  .valid(...Object.values(States))
                  .default(States.lagos),
                zip_code: Joi
                  .string()
                  .length(6)
                  .pattern(/^[0-9]+$/)
                  .required(),
                local_description: Joi
                  .string(),
              })
              .custom((value, helpers) => {
                const { if_old_address, type } = this.context();

                if(!if_old_address) {
                  if(value) {
                    return value;
                  }
                  return helpers.error('invalid request, new_address should not be set, if_old_address is true');
                }
                return;
              }),
          })
          .custom((value, helpers) => {
            if(gossip()) {
              if(value) {
                return value;
              }
              return helpers.error('invalid request, address is required');
            }
            return;
          }),
      });

      // validate body
      const { value, error } = schema.validate(req.body);
      
      if (error) {
        throw error;
      }

      const { order_id, type, if_delivery } = value;

      const order = await Order
        .findById(order_id)
        .exec();

      // check if recipe exists
      if(!order) {
        return res
          .status(400)
          .json({
            msg: 'Invalid Request, order does not exist',
          });
      }

      const user = await User.findById(req.user.id)
        .select('_id')
        .exec();
      // validating order,user
      if(order.user !== user._id) {
        return res
          .status(400)
          .json({
            msg: 'Bad Request, Invalid credentials',
          });
      }

      // to be continued

      // if delivery
      if(value.type === Order_type.pickup) {

      }

      // if pickup
      if(value.type === Order_type.delivery) {

      }

      return res
        .status(201)
        .json({
          msg: `order added to cart successfully`,
          order_id: order._id
        });
    } catch (error) {
      
      if (error instanceof MongooseError) {
        console.log('We have a mongoose problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      if (error instanceof JsonWebTokenErro) {
        console.log('We have a jwt problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      console.log(error);
      return res.status(500).json({msg: error.message});
    }
  }

  static async get_food_reviews(req, res) {
    try {
      const schema = Joi.object({
        count: Joi
          .boolean()
          .default(false),
        filter: Joi.object({
          food_id: Joi
            .string()
            .required(),
          stars: Joi
            .array()
            .items(Joi.number().integer()),
          comment: Joi
            .string(),
          })
          .required(),
        page: Joi
          .number()
          .integer()
          .default(1),
        size: Joi
          .number()
          .integer()
          .default(20),
      });

      // validate body
      const { value, error } = schema.validate(req.body);
      if (error) {
        throw error;
      }

      // build query
      let query = {};
      const { filter, page, size } = value;
      const { food_id, stars, comment, count } = filter;

      query.food = new Types.ObjectId(food_id);

      if(comment) {
        filter.comment = comment;
      }

      if(stars) {
        query["stars"] = util.range_query(stars, res);
      }

      // if count is true, consumer just wants a count of the filtered documents
      if (count) {
        const count = await Review.countDocuments(filter);

        return res
            .status(200)
            .json({
              count: count,
            });
      }

      const { 
        haveNextPage, 
        currentPageExists, 
        totalPages
      } = await page_info(query, Collections.Review, size, page);

      let gather_data = [];

      if(currentPageExists) {
        const reviews = await Review
          .find(query)
          .skip((page - 1) * size)
          .limit(size)
          .sort({ createdAt: -1 })
          .exec(); //get reviews

        gather_data = [
          reviews,
          haveNextPage, //have next page
          totalPages, //total pages
        ];
      }

      if(!currentPageExists) {
        gather_data = [
          [],
          haveNextPage, //have next page
          totalPages, //total pages
        ];
      }


      return res
        .status(200)
        .json({
          reviews: gather_data[0],
          have_next_page: gather_data[1],
          total_pages: gather_data[2],
        });
    } catch (error) {
      
      if (error instanceof MongooseError) {
        console.log('We have a mongoose problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      if (error instanceof JsonWebTokenErro) {
        console.log('We have a jwt problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      console.log(error);
      return res.status(500).json({msg: error.message});
    }
  }

  /**
   * Retrieves notifications based on the provided criteria.
   *
   * @param {Object} req - the request object
   * @param {Object} res - the response object
   * @return {Promise} the response with the retrieved notifications
   */
  static async get_my_notifications(req, res) {
    try {
      const schema = Joi.object({
        count: Joi
          .boolean()
          .default(false),
        status: Joi
          .string()
          .valid(...Object.values(Note_Status)),
      });

      // validate body
      const { value, error } = schema.validate(req.body);
      
      if (error) {
        throw error;
      }

      const { count, status } = value;

      const user = await User.findById(req.user.id).exec();

      if(!user) {
        return res
          .status(400)
          .json({
            msg: "Cant find user"
          });
      }

      // if count is true, consumer just wants a count of the filtered documents
      if (count) {
        let count = 0;

        if(user.notifications.length > 0) {
          if(status) {
            count = user.notifications
            .filter((note) => {
              return note.status === status
            })
            .length;
          } else {
            count = user.notifications.length;
          }
        }

        return res
          .status(200)
          .json({
            count: count,
          });
      }
  
      let notes = [];
      if(user.notifications.length > 0) {
        if(status) {
          notes = user.notifications
            .map((note) => {
              if(note.status === status) {
                if(note.status === Note_Status.sent) {
                  note.status = Note_Status.received;
                }
                return note;
              }
            });
        } else {
          notes = user.notifications
            .map((note) => {
              if(note.status === Note_Status.sent) {
                note.status = Note_Status.received;
                return note;
              }
            });
        }
      }

      // update user
      await user.save();

      return res
        .status(200)
        .json({
          notes
        });
    } catch (error) {
      
      if (error instanceof MongooseError) {
        console.log('We have a mongoose problem', error.message);
        console.log(error)
        return res.status(500).json({msg: error.message});
      }
      if (error instanceof JsonWebTokenErro) {
        console.log('We have a jwt problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      console.log(error);
      return res.status(500).json({msg: error.message});
    }
  }

  /**
   * Updates the status of a notification for a user.
   *
   * @param {Object} req - the request object
   * @param {Object} res - the response object
   * @return {Object} the updated notification status
   */
  static async read_my_notification(req, res) {
    try {
      if (!req.params.id) { 
        return res
        .status(400)
        .json({ msg: 'Invalid request, id is required'}); 
      }

      const user = await User
        .findById(req.user.id)
        .exec();

      if (!user) {
        return res
          .status(400)
          .json({
            msg: 'Bad request, cant find jwt user',
          });
      }

      const note = user.notifications.id(Types.ObjectId(req.params.id));

      if(!note) {
        return res
          .status(400)
          .json({ msg: 'Notification does not exist'});
      }
      
      if(note.status === Note_Status.read) {
        return res
          .status(400)
          .json({ msg: 'Notification already read'});
      }

      user.notifications.map((note) => {
        if(note._id === Types.ObjectId(req.params.id)) {
          note.status = Note_Status.read;
        }
      });

      await user.save();
      
      return res
        .status(201)
        .json({ msg: "Notifications update successful"});

    } catch (error) {
      
      if (error instanceof MongooseError) {
        console.log('We have a mongoose problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      if (error instanceof JsonWebTokenErro) {
        console.log('We have a jwt problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      console.log(error);
      return res.status(500).json({msg: error.message});
    }
  }

  /**
   * Retrieves a notification based on the provided ID.
   *
   * @param {Object} req - the request object
   * @param {Object} res - the response object
   * @return {Object} the retrieved notification
   */
  static async get_my_notification(req, res) {
    try {
      if (!req.params.id) { 
        return res
        .status(400)
        .json({ msg: 'Invalid request, id is required'}); 
      }
      const user = await User
        .findById(req.user.id)
        .exec();

      if (!user) {
        return res
          .status(400)
          .json({
            msg: 'Bad request, cant find jwt user',
          });
      }

      const note = user.notifications.id(Types.ObjectId(req.params.id));

      if(!note) {
        return res
          .status(400)
          .json({ msg: 'Notification does not exist'});
      }

      return res
        .status(200)
        .json({
          note,
        });
    } catch (error) {
      
      if (error instanceof MongooseError) {
        console.log('We have a mongoose problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      if (error instanceof JsonWebTokenErro) {
        console.log('We have a jwt problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      console.log(error);
      return res.status(500).json({msg: error.message});
    }
  }

  static async delete_my_review(req, res) {
    try {
      if (!req.params.id) { 
        return res
        .status(400)
        .json({ msg: 'Invalid request, id is required'}); 
      }
      const review = await Review.findById(req.params.id);
      if(![Role.admin, Role.super_admin].includes(req.user.role)) {
        if(req.user.id !== review.user.toString()) {
          return res
            .status(400)
            .json({
              msg: 'Bad request, Invalid credentials'
            })
        }
      }

      if (!review) {
        return res
          .status(400)
          .json({
            msg: 'Bad request, review does not exist',
          });
      }

      // if deleted by user
      if(req.user.role === Role.user) {
        await Review.deleteOne({ _id: review._id});
      }

      // if deleted by admin
      if([Role.admin, Role.super_admin].includes(req.user.role)) {
        await Connection
          .transaction(async () => {
            await Review.deleteOne({ _id: review._id});
            // notifies user
            await notification_service.notify({
              to: review.user,
              comment: `Your Review: ${review.comment} on food: ${review.food.toString()} have been deleted, check your email for further details`,
              subject: {
                subject_id: review._id.toString(),
                doc_type: Collections.Review,
              },
            });
          });
      }
      

      return res
        .status(201)
        .json({
          message: `Review with id: ${req.params.id} successfully deleted`,
        });
    } catch (error) {
      
      if (error instanceof MongooseError) {
        console.log('We have a mongoose problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      if (error instanceof JsonWebTokenErro) {
        console.log('We have a jwt problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      console.log(error);
      return res.status(500).json({msg: error.message});
    }
  }

  static async get_my_order(req, res) {
    // serves both user and admin
    try {
      if(!req.params.id) {
        return res
          .status(400)
          .json({ msg: 'Bad request, id is required'});
      }

      const order = await Order.findById(req.params.id);

      // validates order
      if(!order) {
        return res
          .status(400)
          .json({ msg: 'Invalid Request, order does not exist'});
      }

      // if not order.user or admin
      if((req.user.id !== order.user.toString()) || (![Role.admin, Role.super_admin].includes(req.user.role))) {
        return res
          .status(400)
          .json({ msg: 'Bad request, Invalid credentials'});
      }

      return res
        .status(200)
        .json({ order});
    } catch (error) {
      if (error instanceof MongooseError) {
        console.log('We have a mongoose problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      if (error instanceof JsonWebTokenErro) {
        console.log('We have a jwt problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      console.log(error);
      return res.status(500).json({msg: error.message});
    }
  }

  static async get_my_transaction(req, res) {
    // serves both user and admin
    try {
      if(!req.params.id) {
        return res
          .status(400)
          .json({ msg: 'Bad request, id is required'});
      }

      const transaction = await Transaction.findById(req.params.id);

      // validates transaction
      if(!transaction) {
        return res
          .status(400)
          .json({ msg: 'Invalid Request, transaction does not exist'});
      }

      // if not order.user or admin
      if((req.user.id !== transaction.user.toString()) || (![Role.admin, Role.super_admin].includes(req.user.role))) {
        return res
          .status(400)
          .json({ msg: 'Bad request, Invalid credentials'});
      }

      return res
        .status(200)
        .json({ transaction});
    } catch (error) {
      if (error instanceof MongooseError) {
        console.log('We have a mongoose problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      if (error instanceof JsonWebTokenErro) {
        console.log('We have a jwt problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      console.log(error);
      return res.status(500).json({msg: error.message});
    }
  }

  static async get_my_shipment(req, res) {
    // serves both user and admin
    try {
      if(!req.params.id) {
        return res
          .status(400)
          .json({ msg: 'Bad request, id is required'});
      }

      const shipment = await Shipment
        .findById(req.params.id)
        .populate('order', 'user');

      // validates shipment
      if(!shipment) {
        return res
          .status(400)
          .json({ msg: 'Invalid Request, shipment does not exist'});
      }

      // if not order.user or admin
      if((req.user.id !== shipment.order.user.toString()) || (![Role.admin, Role.super_admin].includes(req.user.role))) {
        return res
          .status(400)
          .json({ msg: 'Bad request, Invalid credentials'});
      }

      return res
        .status(200)
        .json({ shipment});
    } catch (error) {
      if (error instanceof MongooseError) {
        console.log('We have a mongoose problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      if (error instanceof JsonWebTokenErro) {
        console.log('We have a jwt problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      console.log(error);
      return res.status(500).json({msg: error.message});
    }
  }

  static async get_my_address(req, res) {
    // serves both user and admin
    try {
      if(!req.params.id) {
        return res
          .status(400)
          .json({ msg: 'Bad request, id is required'});
      }

      const address = await Address.findById(req.params.id);

      // validates address
      if(!address) {
        return res
          .status(400)
          .json({ msg: 'Invalid Request, address does not exist'});
      }

      // if not order.user or admin
      if((req.user.id !== address.user.toString()) || (![Role.admin, Role.super_admin].includes(req.user.role))) {
        return res
          .status(400)
          .json({ msg: 'Bad request, Invalid credentials'});
      }

      return res
        .status(200)
        .json({ address});
    } catch (error) {
      if (error instanceof MongooseError) {
        console.log('We have a mongoose problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      if (error instanceof JsonWebTokenErro) {
        console.log('We have a jwt problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      console.log(error);
      return res.status(500).json({msg: error.message});
    }
  }

  static async get_my_transactions(req, res) {
    try {
      const schema = Joi.object({
        count: Joi
          .boolean()
          .default(false),
        filter: Joi
          .object({
            order_id: Joi
              .string(),
            pre_order_id: Joi
              .string(),
            type: Joi
              .string()
              .valid(...Object.values(Transaction_type))
              .default(Transaction_type.credit),
            status: Joi
              .string()
              .valid(...Object.values(Transaction_Status))
              .default(Transaction_Status.successful),
            amount_range: Joi
              .array()
              .items(Joi.number().integer().precision(2)),
            credit_account: Joi
              .object({
                bank_name: Joi
                  .string(),
                account_name: Joi
                  .string(),
                account_number: Joi
                  .string(),
              }),
            debit_account: Joi
              .object({
                bank_name: Joi
                  .string(),
                account_name: Joi
                  .string(),
                account_number: Joi
                  .string(),
              }),
            createdAt: Joi
              .object({
                range: Joi
                  .object({
                    time_share: Joi
                      .string()
                      .valid(...Object.keys(Time_share))
                      .default(Object.keys(Time_share)[0]),
                    times: Joi
                      .number()
                      .integer()
                      .default(1),
                  }),
                exact: Joi
                  .date(),
              })
              .custom((value, helpers) => {
                if(Object.values(value).length === 0) {
                  return helpers.error('Validation Error: no values found');
                }
                const { exact, range } = value;
                if(exact && range) {
                  return helpers.error('Validation Error: You either set the exact field or set the range field, can\'t have it both ways');
                }
                return value;
              }),
          }),
        page: Joi
          .number()
          .integer()
          .default(1),
        size: Joi
          .number()
          .integer()
          .default(20),
      });

      // validate body
      const { value, error } = schema.validate(req.body);
      
      if (error) {
        throw error;
      }

      const { filter, page, size } = value;

      let query = {};
      // if filter is set
      if(filter) {
        // building filter
        const { 
          order_id, 
          pre_order_id, 
          type, 
          status, 
          amount_range, 
          debit_account, 
          credit_account,
          createdAt
        } = filter;

        // set current user
        query.user = new Types.ObjectId(req.user.id);

        if(order_id) {
          query.order = new Types.ObjectId(order_id);
        }

        if(pre_order_id) {
          query.pre_order = new Types.ObjectId(order_id);
        }

        if(amount_range) {
          query["amount"] = util.range_query(amount_range);
        }

        if(type) {
          query['type'] = type;
        }

        if(status) {
          query['status'] = status;
        }

        if(credit_account) {
          const { bank_name, account_name, account_number} = credit_account;
          if(bank_name) {
            query['credit_account.bank_name'] = bank_name;
          }

          if(account_name) {
            query['credit_account.account_name'] = account_name;
          }

          if(account_number) {
            query['credit_account.account_number'] = account_number;
          }
        }

        if(debit_account) {
          const { bank_name, account_name, account_number} = debit_account;
          if(bank_name) {
            query['debit_account.bank_name'] = bank_name;
          }

          if(account_name) {
            query['debit_account.account_name'] = account_name;
          }

          if(account_number) {
            query['debit_account.account_number'] = account_number;
          }

        }
    
        if(createdAt) {
          const { exact, range } = createdAt;
          if(exact) {
            query.createdAt = exact;
          }
          if(range) {
            const { times, time_share } = range;
            // between now and the stipulated time
            query.createdAt = { 
              $lte: new Date(), 
              $gte: util.last_times(Time_share[time_share], times, Time_Directory.past)
            };
          }
        }
      }

      // if count is true, consumer just wants a count of the filtered documents
      if (value.count) {
        const count = await Transaction
          .countDocuments(query);

        return res
          .status(200)
          .json({
            count: count,
          });
      }

      const { 
        haveNextPage, 
        currentPageExists, 
        totalPages
      } = await page_info(query, Collections.Transaction, size, page);

      let gather_data = [];

      if(currentPageExists) {
        const transactions = await Transaction
          .find(query)
          .skip((page - 1) * size)
          .limit(size)
          .sort({ createdAt: -1 })
          .exec(); //get transactions

        gather_data = [
          transactions,
          haveNextPage, //have next page
          totalPages, //total pages
        ];
      }

      if(!currentPageExists) {
        gather_data = [
          [],
          haveNextPage, //have next page
          totalPages, //total pages
        ];
      }
      
      return res
        .status(200)
        .json({
          transactions: gather_data[0],
          have_next_page: gather_data[1],
          total_pages: gather_data[2],
        });
        
    } catch (error) {
      if (error instanceof MongooseError) {
        console.log('We have a mongoose problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      if (error instanceof JsonWebTokenErro) {
        console.log('We have a jwt problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      console.log(error);
      return res.status(500).json({msg: error.message});
    }
  }

  static async get_my_shipments(req, res) {
    try {
      const schema = Joi.object({
        count: Joi
          .boolean()
          .default(false),
        filter: Joi
          .object({
            order_id: Joi
              .string(),
            pre_order_id: Joi
              .string(),
            address_id: Joi
              .string(),
            status: Joi
              .string()
              .valid(...Object.values(Shipemnt_status))
              .default(Shipemnt_status.delivered),
            fee_range: Joi
              .array()
              .items(Joi.number().integer().precision(2)),
            estimated_delivery_time_range: Joi
              .object({
                range: Joi
                  .object({
                    dir: Joi
                      .string()
                      .valid(...Object.values(Time_Directory))
                      .default(Time_Directory.future),
                    time_share: Joi
                      .string()
                      .valid(...Object.keys(Time_share))
                      .default(Object.keys(Time_share)[0]),
                    times: Joi
                      .number()
                      .integer()
                      .default(1),
                  }),
                exact: Joi
                  .date(),
              })
              .custom((value, helpers) => {
                const { exact, range } = value;
                if(Object.values(value).length === 0) {
                  return helpers.error('Validation Error: no values found');
                }
                if(exact && range) {
                  return helpers.error('Validation Error: You either set the exact field or set the range field, can\'t have it both ways');
                }
                return value;
              }),
            delivery_time_range: Joi
              .object({
                range: Joi
                  .object({
                    dir: Joi
                      .string()
                      .valid(...Object.values(Time_Directory))
                      .default(Time_Directory.future),
                    time_share: Joi
                      .string()
                      .valid(...Object.keys(Time_share))
                      .default(Object.keys(Time_share)[0]),
                    times: Joi
                      .number()
                      .integer()
                      .default(1),
                  }),
                exact: Joi
                  .date(),
              })
              .custom((value, helpers) => {
                const { exact, range } = value;
                if(Object.values(value).length === 0) {
                  return helpers.error('Validation Error: no values found');
                }
                if(exact && range) {
                  return helpers.error('Validation Error: You either set the exact field or set the range field, can\'t have it both ways');
                }
                return value;
              }),
            createdAt: Joi
              .object({
                range: Joi
                  .object({
                    time_share: Joi
                      .string()
                      .valid(...Object.keys(Time_share))
                      .default(Object.keys(Time_share)[0]),
                    times: Joi
                      .number()
                      .integer()
                      .default(1),
                  }),
                exact: Joi
                  .date(),
              })
              .custom((value, helpers) => {
                if(Object.values(value).length === 0) {
                  return helpers.error('Validation Error: no values found');
                }
                const { exact, range } = value;
                if(exact && range) {
                  return helpers.error('Validation Error: You either set the exact field or set the range field, can\'t have it both ways');
                }
                return value;
              }),
          }),
        page: Joi
          .number()
          .integer()
          .default(1),
        size: Joi
          .number()
          .integer()
          .default(20),
      });

      // validate body
      const { value, error } = schema.validate(req.body);
      
      if (error) {
        throw error;
      }

      const { filter, page, size } = value;

      let query = {};
      // if filter is set
      if(filter) {
        // building filter
        const { 
          order_id, 
          address_id, 
          pre_order_id, 
          status,
          fee_range,
          estimated_delivery_time_range,
          delivery_time_range,
          createdAt
        } = filter;

        // set current user
        query.user = new Types.ObjectId(req.user.id);

        if(order_id) {
          query.order = new Types.ObjectId(order_id);
        }

        if(address_id) {
          query.address = new Types.ObjectId(address_id);
        }

        if(pre_order_id) {
          query.pre_order = new Types.ObjectId(order_id);
        }

        if(fee_range) {
          query["amount"] = util.range_query(fee_range);
        }

        if(status) {
          query['status'] = status;
        }

        if(estimated_delivery_time_range) {
          const { exact, range } = estimated_delivery_time_range;
          if(exact) {
            query.estimated_delivery_time = exact;
          }
          if(range) {
            const { times, time_share, dir } = range;
            // between now and the stipulated time
            query.estimated_delivery_time = util.date_query(Time_share[time_share], times, dir);
          }
        }

        if(delivery_time_range) {
          const { exact, range } = delivery_time_range;
          if(exact) {
            query.delivery_time = exact;
          }
          if(range) {
            const { times, time_share, dir } = range;
            // between now and the stipulated time
            query.delivery_time = util.date_query(Time_share[time_share], times, dir);
          }
        }
    
        if(createdAt) {
          const { exact, range } = createdAt;
          if(exact) {
            query.createdAt = exact;
          }
          if(range) {
            const { times, time_share } = range;
            // between now and the stipulated time
            query.createdAt = { 
              $lte: new Date(), 
              $gte: util.last_times(Time_share[time_share], times, Time_Directory.past)
            };
          }
        }
      }

      // if count is true, consumer just wants a count of the filtered documents
      if (value.count) {
        const count = await Shipment
          .countDocuments(query);

        return res
          .status(200)
          .json({
            count: count,
          });
      }

      const { 
        haveNextPage, 
        currentPageExists, 
        totalPages
      } = await page_info(query, Collections.Shipment, size, page);

      let gather_data = [];

      if(currentPageExists) {
        const shipments = await Shipment
          .find(query)
          .skip((page - 1) * size)
          .limit(size)
          .sort({ createdAt: -1 })
          .exec(); //get shipments

        gather_data = [
          shipments,
          haveNextPage, //have next page
          totalPages, //total pages
        ];
      }

      if(!currentPageExists) {
        gather_data = [
          [],
          haveNextPage, //have next page
          totalPages, //total pages
        ];
      }
      
      return res
        .status(200)
        .json({
          shipments: gather_data[0],
          have_next_page: gather_data[1],
          total_pages: gather_data[2],
        });
        
    } catch (error) {
      if (error instanceof MongooseError) {
        console.log('We have a mongoose problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      if (error instanceof JsonWebTokenErro) {
        console.log('We have a jwt problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      console.log(error);
      return res.status(500).json({msg: error.message});
    }
  }

  static async get_my_addresses(req, res) {
    try {
      const schema = Joi.object({
        count: Joi
          .boolean()
          .default(false),
        filter: Joi
          .object({
            where: Joi
              .string()
              .valid(...Object.values(Where)),
            street_addy: Joi
              .string(),
            city: Joi
              .string(),
            state: Joi
              .string()
              .valid(...Object.values(States))
              .default(States.lagos),
            country: Joi
              .string()
              .valid(...Object.values(Country))
              .default(Country.nigeria),
            zip_code: Joi
              .string()
              .length(5)
              .pattern(/^\d+$/),
            createdAt: Joi
              .object({
                range: Joi
                  .object({
                    time_share: Joi
                      .string()
                      .valid(...Object.keys(Time_share))
                      .default(Object.keys(Time_share)[0]),
                    times: Joi
                      .number()
                      .integer()
                      .default(1),
                  }),
                exact: Joi
                  .date(),
              })
              .custom((value, helpers) => {
                if(Object.values(value).length === 0) {
                  return helpers.error('Validation Error: no values found');
                }
                const { exact, range } = value;
                if(exact && range) {
                  return helpers.error('Validation Error: You either set the exact field or set the range field, can\'t have it both ways');
                }
                return value;
              }),
          }),
        page: Joi
          .number()
          .min(1)
          .default(1),
        size: Joi
          .number()
          .min(1)
          .default(5),
      });

    // validate body
    const { value, error } = schema.validate(req.body);
    
    if (error) {
      throw error;
    }

    const { count, filter, page, size } = value;
    let query = {};
    if(filter) {
      // build query
      const { where, street_addy, city, state, country, zip_code, createdAt } = filter;

      // set current user
      query.user = new Types.ObjectId(req.user.id);
    
      if(street_addy) {
        query.street_addy = street_addy;
      }
      if(city) {
        query.city = city;
      }
      if(state) {
        query.state = state;
      }
      if(country) {
        query.country = country;
      }
      if(zip_code) {
        query.zip_code = zip_code;
      }
    
      if(where) {
        query.where = where;
      }

      if(createdAt) {
        const { exact, range } = createdAt;
        if(exact) {
          query.createdAt = exact;
        }
        if(range) {
          const { times, time_share } = range;
          // between now and the stipulated time
          query.createdAt = { 
            $lte: new Date(), 
            $gte: util.last_times(Time_share[time_share], times, Time_Directory.past)
          };
        }
      }
    }
  
    // if count is true, consumer just wants a count of the filtered documents
    if (count) {
      const result = await Address
          .countDocuments(query);

      return res
        .status(200)
        .json({
          count: result,
        });
    }

    const { haveNextPage, currentPageExists, totalPages } = await page_info(query, Collections.Address, size, page);

    let gather_data = [];

    if(currentPageExists) {
      const addresses = await Address
        .find(query)
        .skip((page - 1) * size)
        .limit(size)
        .sort({ createdAt: -1 })
        .exec(); //get addresses

      gather_data = [
        addresses,
        haveNextPage, //have next page
        totalPages, //total pages
      ];
    }

    if(!currentPageExists) {
      gather_data = [
        [],
        haveNextPage, //have next page
        totalPages, //total pages
      ];
    }


    return res
      .status(201)
      .json({
        addresses: gather_data[0],
        have_next_page: gather_data[1],
        total_pages: gather_data[2],
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

  static async get_my_orders(req, res) {
    try {
      // validate body
      const schema = Joi.object({
        count: Joi
          .boolean()
          .default(false),
        pre_order: Joi
          .boolean()
          .default(false),
        filter: Joi
          .object({
            type: Joi
              .string()
              .valid(...Object.values(Order_type)),
            pre_orders: Joi
              .object({
                size_range: Joi
                  .array()
                  .items(Joi.number().integer().precision(2)),
                type: Joi
                  .string()
                  .valid(...Object.values(Order_type)),
                status: Joi
                  .string()
                  .valid(...Object.values(Pre_order_Status)),
                total_range: Joi
                  .array()
                  .items(Joi.number().integer().precision(2)),
                order_total_range: Joi
                  .array()
                  .items(Joi.number().integer().precision(2)),
                qty_range: Joi
                  .array()
                  .items(Joi.number().integer()),
                order_content: Joi
                  .object({
                    size_range: Joi
                      .array()
                      .items(Joi.number().integer().precision(2)),
                    food_id: Joi
                      .string(),
                    qty_range: Joi
                      .array()
                      .items(Joi.number().integer()),
                    paid_price_range: Joi
                      .array()
                      .items(Joi.number().integer()),
                  }),
                pickup_time_range: Joi
                  .object({
                    range: Joi
                      .object({
                        dir: Joi
                          .string()
                          .valid(...Object.values(Time_Directory))
                          .default(Time_Directory.future),
                        time_share: Joi
                          .string()
                          .valid(...Object.keys(Time_share))
                          .default(Object.keys(Time_share)[0]),
                        times: Joi
                          .number()
                          .integer()
                          .default(1),
                      }),
                    exact: Joi
                      .date(),
                  })
                  .custom((value, helpers) => {
                    const { exact, range } = value;
                    if(Object.values(value).length === 0) {
                      return helpers.error('Validation Error: no values found');
                    }
                    if(exact && range) {
                      return helpers.error('Validation Error: You either set the exact field or set the range field, can\'t have it both ways');
                    }
                    return value;
                  }),
                createdAt: Joi
                  .object({
                    range: Joi
                      .object({
                        time_share: Joi
                          .string()
                          .valid(...Object.keys(Time_share))
                          .default(Object.keys(Time_share)[0]),
                        times: Joi
                          .number()
                          .integer()
                          .default(1),
                      }),
                    exact: Joi
                      .date(),
                  })
                  .custom((value, helpers) => {
                    if(Object.values(value).length === 0) {
                      return helpers.error('Validation Error: no values found');
                    }
                    const { exact, range } = value;
                    if(exact && range) {
                      return helpers.error('Validation Error: You either set the exact field or set the range field, can\'t have it both ways');
                    }
                    return value;
                  }),
              }),
            status: Joi
              .string()
              .valid(...Object.values(Order_Status))
              .default(Order_Status.in_cart),
            total_range: Joi
              .array()
              .items(Joi.number().integer().precision(2)),
            order_total_range: Joi
              .array()
              .items(Joi.number().integer().precision(2)),
            qty_range: Joi
              .array()
              .items(Joi.number().integer()),
            order_content: Joi
              .object({
                size_range: Joi
                  .array()
                  .items(Joi.number().integer().precision(2)),
                food_id: Joi
                  .string(),
                qty_range: Joi
                  .array()
                  .items(Joi.number().integer()),
                paid_price_range: Joi
                  .array()
                  .items(Joi.number().integer()),
              }),
            pickup_time_range: Joi
              .object({
                range: Joi
                  .object({
                    dir: Joi
                      .string()
                      .valid(...Object.values(Time_Directory))
                      .default(Time_Directory.future),
                    time_share: Joi
                      .string()
                      .valid(...Object.keys(Time_share))
                      .default(Object.keys(Time_share)[0]),
                    times: Joi
                      .number()
                      .integer()
                      .default(1),
                  }),
                exact: Joi
                  .date(),
              })
              .custom((value, helpers) => {
                const { exact, range } = value;
                if(Object.values(value).length === 0) {
                  return helpers.error('Validation Error: no values found');
                }
                if(exact && range) {
                  return helpers.error('Validation Error: You either set the exact field or set the range field, can\'t have it both ways');
                }
                return value;
              }),
            createdAt: Joi
              .object({
                range: Joi
                  .object({
                    time_share: Joi
                      .string()
                      .valid(...Object.keys(Time_share))
                      .default(Object.keys(Time_share)[0]),
                    times: Joi
                      .number()
                      .integer()
                      .default(1),
                  }),
                exact: Joi
                  .date(),
              })
              .custom((value, helpers) => {
                if(Object.values(value).length === 0) {
                  return helpers.error('Validation Error: no values found');
                }
                const { exact, range } = value;
                if(exact && range) {
                  return helpers.error('Validation Error: You either set the exact field or set the range field, can\'t have it both ways');
                }
                return value;
              }),
          }),
        page: Joi
          .number()
          .integer()
          .default(1),
        size: Joi
          .number()
          .integer()
          .default(20),
      });

      // validate body
      const { value, error } = schema.validate(req.body);
      
      if (error) {
        throw error;
      }

      const { count, pre_order, filter, page, size } = value;

      let query = {};
      // if filter is set
      if(filter) {
        // build query
        const { 
          type, 
          status, 
          total_range, 
          qty_range, 
          pickup_time_range, 
          order_total_range, 
          order_content,
          createdAt,
          pre_orders
        } = filter;

        // set current user
        query.user = Types.ObjectId(user_id);

        if(order_content) {
          const { paid_price_range, qty_range, food_id, size_range } = order_content;
          if(paid_price_range) {
            query["order_content.paid_price"] = util.range_query(paid_price_range, res);
          }
          if(qty_range) {
            query["order_content.qty"] = util.range_query(qty_range, res);
          }
          if(food_id) {
            query["order_content.food"] = Types.ObjectId(food_id);
          }

          if(size_range) {
            const q = util.range_query(size_range, res, "order_content");
            if(size_range.length === 1) {
              query["order_content"] = q;
            } else {
              query.$expr = q;
            }
          }
        }

        if(pre_orders) {
          const { 
            type, 
            status, 
            total_range, 
            qty_range, 
            pickup_time_range, 
            order_total_range, 
            order_content,
            size_range
           } = pre_orders;

          if(size_range) {
            const q = util.range_query(size_range, res, "pre_orders");
            if(size_range.length === 1) {
              query["pre_orders"] = q;
            } else {
              query.$expr = q;
            }
          }

          if(pre_orders.order_content) {
            if(order_content.paid_price_range) {
              query["pre_orders.order_content.paid_price"] = util.range_query(order_content.paid_price_range, res);
            }
            if(order_content.qty_range) {
              query["pre_orders.order_content.qty"] = util.range_query(order_content.qty_range, res);
            }
            if(order_content.food_id) {
              query["pre_orders.order_content.food"] = Types.ObjectId(order_content.food_id);
            }
            if(order_content.size_range) {
              query["pre_orders.order_content"] = util.range_query(order_content.size_range, res);
            }
            if(order_content.size_range) {
              const q = util.range_query(size_range, res, "pre_orders.order_content");
              if(size_range.length === 1) {
                query["pre_orders.order_content"] = q;
              } else {
                query.$expr = q;
              }
            }
          }

          if(pre_orders.total_range) {
            query["pre_orders.total"] = util.range_query(total_range, res);
          }
  
          if(pre_orders.order_total_range) {
            query["pre_orders.order_total"] = util.range_query(order_total_range, res);
          }
  
          if(pre_orders.qty_range) {
            query["pre_orders.total_qty"] = util.range_query(qty_range, res);
          }
  
          if(pickup_time_range) {
            const { exact, range } = pickup_time_range;
            if(exact) {
              query.pickup_time = exact;
            }
            if(range) {
              const { times, time_share, dir } = range;
              // between now and the stipulated time
              query['pre_orders.pickup_time'] = util.date_query(Time_share[time_share], times, dir);
            }
          }
    
          if(createdAt) {
            const { exact, range } = createdAt;
            if(exact) {
              query.createdAt = exact;
            }
            if(range) {
              const { times, time_share } = range;
              // between now and the stipulated time
              query['pre_orders.createdAt'] = { 
                $lte: new Date(), 
                $gte: util.last_times(Time_share[time_share], times, Time_Directory.past)
              };
            }
          }
  
          if(type) {
            query["pre_orders.type"] = type;
          }
  
          if(status) {
            query["pre_orders.status"] = status;
          }
        }

        if(total_range) {
          query["total"] = util.range_query(total_range, res);
        }

        if(order_total_range) {
          query["order_total"] = util.range_query(order_total_range, res);
        }

        if(qty_range) {
          query["total_qty"] = util.range_query(qty_range, res);
        }

        if(pickup_time_range) {
          const { exact, range } = pickup_time_range;
          if(exact) {
            query.pickup_time = exact;
          }
          if(range) {
            const { times, time_share, dir } = range;
            // between now and the stipulated time
            query.pickup_time = util.date_query(Time_share[time_share], times, dir);
          }
        }
  
        if(createdAt) {
          const { exact, range } = createdAt;
          if(exact) {
            query.createdAt = exact;
          }
          if(range) {
            const { times, time_share } = range;
            // between now and the stipulated time
            query.createdAt = { 
              $lte: new Date(), 
              $gte: util.last_times(Time_share[time_share], times, Time_Directory.past)
            };
          }
        }

        if(type) {
          query.type = type;
        }

        if(status) {
          query.status = status;
        }
      }

      // if count is true, consumer just wants a count of the filtered documents
      if (count) {
        const result = await Order
            .countDocuments(query);

        return res
          .status(200)
          .json({
            count: result,
          });
      }

      const { haveNextPage, currentPageExists, totalPages } = await page_info(query, Collections.Order, size, page);

      let gather_data = [];

      if(currentPageExists) {
        const orders = await Order
          .find(query)
          .skip((page - 1) * size)
          .limit(size)
          .sort({ createdAt: -1 })
          .exec(); //get orders

        gather_data = [
          pre_order ? orders.map((order) => order.pre_orders).flat() : orders,
          haveNextPage, //have next page
          totalPages, //total pages
        ];
      }

      if(!currentPageExists) {
        gather_data = [
          [],
          haveNextPage, //have next page
          totalPages, //total pages
        ];
      }

      return res
        .status(200)
        .json({
          orders: gather_data[0],
          have_next_page: gather_data[1],
          total_pages: gather_data[2],
        });
        
    } catch (error) {
      if (error instanceof MongooseError) {
        console.log('We have a mongoose problem', error);
        return res.status(500).json({msg: error.message});
      }
      if (error instanceof JsonWebTokenErro) {
        console.log('We have a jwt problem', error.message);
        return res.status(500).json({msg: error.message});
      }
      console.log(error);
      return res.status(500).json({msg: error.message});
    }
  }
}
  
module.exports = UserController;
