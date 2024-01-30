require('dotenv').config();
const util = require('../util');
const { page_info, User, Food, Review, Order, Transaction, Connection, Shipment, Address } = require('../models/engine/db_storage');
const { notification_service } = require('../services/notification_service');
const { food_schedule_service } = require('../services/food_schedule_service')
const MongooseError = require('mongoose').Error;
const { Types } = require('mongoose');
const JsonWebTokenErro = require('jsonwebtoken').JsonWebTokenError;
const Joi = require('joi');
const { get_schedule_expiry } = require('../models/mongo_schemas/food');
// const { redisClient } = require('../redis');
const { 
  Type, 
  Status, 
  Role, 
  Collections, 
  Order_Status, 
  Transaction_Status, 
  Schedule_type, 
  Schedule_expiry_prefix,
  Time_share,
  Events,
  Order_type,
  Pre_order_Status,
  userStatus,
  Time_Directory,
  Transaction_type,
  Shipemnt_status,
  States,
  Country,
  Where
 } = require('../enum_ish');
/**
 * Contains the UserController class 
 * which defines route handlers.
 * @author Yusuf Gbadamosi <https://github.com/ygbadamosi662>
 */

class AdminController {
  static async role_switcheroo(req, res) {
    // only super-admins have access to this endpoint
    try {
      const schema = Joi.object({
        email: Joi
          .string()
          .required(),
        role: Joi
          .string()
          .valid(...Object.values(Role))
          .required(),
      });

      // validate body
      const { value, error } = schema.validate(req.body);
      
      if (error) {
        throw error;
      }

      const user = await user_repo.findByEmail(value.email, ['role', 'id', 'name']);
      if(user.role === value.role) {
        return res
          .status(200)
          .json({
            message: `${value.email} has the Role: ${value.role} already`,
          })
      }

      user.role = value.role;

      // notify owner
      await Connection.transaction(async () => {
        const comment = `${user.name?.aka ? user.name.aka : user.name.fname + ' ' + user.name.lname} you are now a ${value.role} on this platform`;
        await user.save();
        await notification_service
          .notify({
            comment: comment,
            to: user,
            subject: {
              subject_id: user._id,
              doc_type: Collections.User
            },
          });
      });
      
      return res
        .status(201)
        .json({
          msg: 'Role succesfully updated',
          user: user,
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

  static async create_food(req, res) {
    try {
      const schema = Joi.object({
        name: Joi
          .string()
          .required(),
        description: Joi
          .string(),
        qty: Joi
          .number()
          .default(0),
        price: Joi
          .number()
          .precision(4)
          .required(),
        types: Joi
          .array()
          .items(Joi.string().valid(...Object.values(Type)))
          .default([Type.food])
      });

      // validate body
      const { value, error } = schema.validate(req.body);
      
      if (error) { 
        throw error;
      }

      const food_exists = await Food.exists({name: value.name});
      
      // if food already created by user
      if (food_exists) {
        return res
          .status(400)
          .json({
            msg: `Invalid request, you already created a ${value.name} Food, update it if you want`,
          });
      }
      // create food
      const food = await Food
        .create(value);

      // await Connection.transaction(async () => {
      //     user.save();
      //     if (user.followers) {
      //       // notify followers
      //       const comment = `${user.name.aka ? user.name.aka : [user.name.fname, user.name.lname].join(' ')} just created a recipe`;
      //       await notification_service.notify_all(user.followers, comment, recipe);
      //     }
      //   });

      return res
        .status(201)
        .json({
          msg: `Food ${food.name} successfully created`,
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

  static async update_food(req, res) {
    try {
      /**
       * Determines the gossip value based on the provided request body.
       * 
       * @param {object} req_body - The req.body object.
       * @returns {(boolean|Array<Type>|)} - The gossip value.
       */
      const gossip = (req_body) => {
        try {
          if (req_body.types) {
            const { event, types } = req_body.types;
          
            if (event === Events.add || event === Events.remove) {
              if (types.length > 0) {
                return true;
              }
              return false;
            }
          
            if (event === Events.overwrite) {
              if (types.length > 0) {
                return [Type.food, ...types]; // For Events.overwrite return a modified value to add Type.food by default
              }
              return false;
            }
          
            if (event === Events.clear) {
              if (types.length > 0) {
                return {
                  status: 400,
                  response: {
                    msg: `Concerning request: there shouldnt be any data in types.types for this action, choose remove to remove the data in types.types`,
                    data: types,
                  },
                };
              }
              return true;
            }
          }
        } catch (error) {
          throw error;
        }
      };

      const schema = Joi.object({
        id: Joi
          .string()
          .required(),
        update: Joi.object({
          name: Joi
            .string(),
          description: Joi
            .string(),
          qty: Joi
            .number(),
          price: Joi
            .number()
            .precision(4),
          types: Joi
            .object({
              event: Joi
                .string()
                .valid(...Object.values(Events))
                .default(Events.add),
              types: Joi
                .array()
                .items(Joi.string().valid(...Object.values(Type)))
                .custom((value, helpers) => {
                  const gist = gossip(req.body);
                  if(gist === false) {
                    return helpers.error('Validation Error: types not valid');
                  }
                  if(gist.length) {
                    value = gist;
                    return value;
                  }
                  return;
                }),
            })
          })
      });

      // validate body
      const { value, error } = schema.validate(req.body);
      
      if (error) {
        throw error;
      }

      if(!value.update) {
        return res
          .status(400)
          .json({
            msg: 'Invalid request, update data is required',
          });
      }
      
      const food_exists = await Food.exists({name: value.name});
      
      // if food already created by user
      if (food_exists) {
        return res
          .status(400)
          .json({
            msg: `Invalid request, you already have a ${value.name} Food, choose another name`,
          });
      }

      // validate food
      const food = await Food.findById(value.id);
      if (!food) {
        return res
          .status(400)
          .json({
            msg: `Invalid request, There is no food with id: ${value.id}`,
          })
      }

      if(value.name)
      {
        // notify food favors
        // update certain cache
        food.name = value.name;
      }

      if(value.description)  {
        // notify food favors
        // update certain cache
        food.description = value.description;
      }

      if(value.qty) {
        // notify food favors
        // update certain cache
        food.qty = value.qty;
      }

      if(value.price) {
        // notify food favors
        // update certain cache
        food.price = value.price;
      }

      if(value.types) {
        // update certain cache
        if(value.types.event === Events.add) {
          food.types = food.types.concat(value.types.types);
        }

        if(value.types.event === Events.remove) {
          food.types = food.types.filter(type => {
            return value.types.types.includes(type) === false;
          })
        }

        if(value.types.event === Events.overwrite) {
          food.types = value.types.types;
        }

        if(value.types.event === Events.clear) {
          food.types = [Type.food];
        }

      }
      // }


      // await Connection.transaction(async () => {
      //     if (user.followers) {
      //       // notify followers
      //       const comment = `${user.name.aka ? user.name.aka : [user.name.fname, user.name.lname].join(' ')} just updated a recipe`;
      //       await Recipe.updateOne({ id: value.id }, value);
      //       await notification_service.notify_all(user.followers, comment, rec.id);
      //     }
      //   })

      return res
        .status(201)
        .json({
          msg: `Food successfully updated`,
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

  static async add_schedule_to_food(req, res) {
    try {
      // schedule validation template
      const schedule_template = {
        for_when: Joi
          .date()
          .required(),
        type: Joi
          .string()
          .valid(...Object.values(Schedule_type))
          .required(),
        hashtag: Joi
          .string(),
        total_qty: Joi
          .number()
          .required(),
      };

      const schema = Joi.object({
        id: Joi
          .string()
          .required(),
        schedules: Joi
          .array()
          .items(Joi.object(schedule_template))
          .required()
      });

      // validate body
      const { value, error } = schema.validate(req.body);
      
      if (error) {
        throw error;
      }

      const { schedules, id } = value;

      const { 
        food_exists, 
        food, 
        hashtag_exists, 
        schedule_exists, 
        reasonable, 
        msg
      } = await food_schedule_service.validate_and_create_schedules(schedules, id);// this function updates the food document accordinly
    
      // validate food
      if(!food_exists) {
        return res
          .status(400)
          .json({
            msg: `Invalid request, There is no food with id: ${value.id}`,
          });
      }

      // checks if scheduld time has a reasonable timing(in the future)
      if(!reasonable) {
        return res
          .status(400)
          .json({
            msg: `Invalid request, ${msg}`
          });
      }

      // check if schedule already exists
      if(schedule_exists) {
        return res
          .status(400)
          .json({
            msg: `Invalid request, ${msg}`
          });
      }

      // check if hashtag already exists
      if(hashtag_exists) {
        return res
          .status(400)
          .json({
            msg: `Invalid request, ${msg}`
          });
      }
      
      return res
        .status(201)
        .json({
          msg: `schedules successfully added`,
          food: food
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

  static async delete_food(req, res) {
    try {
      if (!req.params.id) { 
        return res
        .status(400)
        .json({ msg: 'Invalid request, id is required'}); 
      }
      const food = await Food.findById(req.params.id);
      
      if (!food) {
        return res
          .status(400)
          .json({
            msg: 'Bad request, food does not exist',
          });
      }

      await Food.deleteOne({ _id: food._id});


      return res
        .status(200)
        .json({
          msg: `Food with id: ${req.params.id} successfully deleted`,
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
                orders: Joi
                  .object({
                    size_range: Joi
                      .array()
                      .items(Joi.number().integer().precision(2)),
                    qty_range: Joi
                      .array()
                      .items(Joi.number().integer().precision(2)),
                  }),
                disputed_orders: Joi
                  .object({
                    size_range: Joi
                      .array()
                      .items(Joi.number().integer().precision(2)),
                    qty_range: Joi
                      .array()
                      .items(Joi.number().integer().precision(2)),
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
            orders,
            disputed_orders,
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

          if(orders) {
            const { size_range, qty_range } = orders;
            if(size_range) {
              let setFlag = false
              // query["schedules"] = { $size: util.range_query(size_range) };
              if(size_range.length === 1) {
                query["schedules.orders"] = util.range_query(size_range, res, 'orders');
                setFlag = true;
              }
              if(setFlag == false ) {
                const q = util.range_query(size_range, res, 'orders');
                if(Array.isArray(q)) {
                  query["schedules"] = { $expr: q[0] };
                  query["schedules"] ={ $expr: q[1] };
                }
                else {
                  query["schedules"] = { $expr: q };
                }
              }
            }
            if(qty_range) {
              query["schedules.orders.qty"] = util.range_query(qty_range, res);
            }
          }

          if(disputed_orders) {
            const { size_range, qty_range } = disputed_orders;
            if(size_range) {
              let setFlag = false
              // query["schedules"] = { $size: util.range_query(size_range) };
              if(size_range.length === 1) {
                query["schedules.disputed_orders"] = util.range_query(size_range, res, 'disputed_orders');
                setFlag = true;
              }
              if(setFlag == false ) {
                const q = util.range_query(size_range, res, 'disputed_orders');
                if(Array.isArray(q)) {
                  query["schedules"] = { $expr: q[0] };
                  query["schedules"] ={ $expr: q[1] };
                }
                else {
                  query["schedules"] = { $expr: q };
                }
              }
            }
            if(qty_range) {
              query["schedules.disputed_orders.qty"] = util.range_query(qty_range, res);
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

  /**
   * Retrieves users based on the provided filter criteria.
   *
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   * @return {Promise} The promise that resolves to the response object.
   */
  static async get_users(req, res) {
    try {
      const schema = Joi.object({
        count: Joi
          .boolean()
          .default(false),
        filter: Joi
          .object({
            name: Joi
              .object({
                fname: Joi
                  .string(),
                lname: Joi
                  .string(),
                aka: Joi
                  .string(),
              }), 
            dob: Joi
              .date(),
            role: Joi
              .string()
              .valid(...Object.values(Role)),
            status: Joi
              .string()
              .valid(...Object.values(userStatus)),
            gender: Joi
              .string()
              .valid(...Object.values(Gender)),
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

      // building filter
      const { filter } = value;
      let query = {};
      const { name, dob, role, createdAt, gender, status } = filter;

      if(name) {
        const { fname, lname, aka } = name;
        if(fname) { query['name.fname'] = fname }
        if(lname) { query['name.lname'] = lname }
        if(aka) { query['name.aka'] = aka }

      }

      if(dob) {
        query.dob = dob;
      }

      if(role) {
        query.role = role;
      }

      if(status) {
        query.status = status;
      }

      if(gender) {
        query.gender = gender;
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

      // if count is true, consumer just wants a count of the filtered documents
      if (value.count) {
        const count = await User
            .countDocuments(query);
        return res
          .status(200)
          .json({
            count: count,
          });
      }

      const { haveNextPage, currentPageExists, totalPages } = await page_info(query, Collections.User, value.size, value.page);

      let gather_data = [];

      if(currentPageExists) {
        const users = await User
          .find(query)
          .skip((value.page - 1) * value.size)
          .limit(value.size)
          .sort({ createdAt: -1 })
          .exec(); //get orders

        gather_data = [
          users,
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
          users: gather_data[0],
          have_next_page: gather_data[1],
          total_pages: gather_data[1],
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
   * Asynchronously disables a user account.
   *
   * @param {Object} req - the request object
   * @param {Object} res - the response object
   * @return {Object} response object with status and message
   */
  static async ban_account(req, res) {
    try {
      const schema = Joi.object({
        password: Joi
          .string()
          .required()
          .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()])[a-zA-Z0-9!@#$%^&*()]{8,}$/),
        user_id: Joi
          .string()
          .required(),
      });

      // validate body
      const { value, error } = schema.validate(req.body);
      
      if (error) {
        throw error;
      }

      const { password, user_id } = value;

      const [admin, user] = await Promise.all([
        User.findById(req.user.id).exec(),
        User.findById(user_id).exec()
      ]);

      const is_pwd = await util.validate_encryption(password, admin.password);
      // validate admin password
      if(is_pwd === false) {
        return res
          .status(400)
          .json({ msg: 'Invalid Request, incorrect password'});
      }

      // validates user
      if(!user) {
        return res
          .status(400)
          .json({ msg: 'Invalid Request, user does not exist'});
      }

      // if user is already banned
      if(user.status === userStatus.banned) {
        return res
          .status(400)
          .json({ msg: 'Invalid Request, user already banned'});
      }

      // ban
      user.status = userStatus.banned;
      // reset refresh token
      user.refresh_token = '';
      // save
      await user.save();

      return res
        .status(200)
        .json({ msg: 'User banned successfully'});
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

  static async get_orders(req, res) {
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
            user_id: Joi
              .string(),
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
                  .valid(...Object.values(Pre_order_Status))
                  .default(Pre_order_Status.created),
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
              .valid(...Object.values(Order_Status)),
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
          user_id, 
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

        if(user_id) {
          query.user = Types.ObjectId(user_id);
        }

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
              const q = util.range_query(order_content.size_range, res, "pre_orders.order_content");
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
            const now = new Date();
            query.createdAt = { 
              $lte: now, 
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

      console.log(query)
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

  static async find_user(req, res) {
    try {
      const schema = Joi.object({
        phone: Joi
          .string()
          .pattern(/^[8792][01]\d{8}$/),
        email: Joi
          .string()
          .email({ minDomainSegments: 2, tlds: { allow: ['com', 'net'] } }),
      });

      // validate body
      const { value, error } = schema.validate(req.body);
      
      if (error) {
        throw error;
      }

      if(!value) {
        return res
          .status(400)
          .json({
            message: 'Invalid request, email or phone required'
          })
      }

      let user = {};

      // validate email/phone
      if (/^\d+$/.test(inputString)) {
        const who = await user_repo.findByPhone(value.email_or_phone);
        if (!who) {
          return re
            .status(400)
            .json({
            msg: 'phone incorrect',
          });
        }
        user = who;
      } else {
        const who = await user_repo.findByEmail(value.email_or_phone);

        if (!who) {
          return re
            .status(400)
            .json({
            msg: 'email incorrect',
          });
        }
        user = who;
      }

      return res
        .status(200)
        .json({
          user,
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

  static async get_reviews(req, res) {
    try {
      const schema = Joi.object({
        count: Joi
          .boolean()
          .default(false),
        filter: Joi.object({
          food_id: Joi
            .string(),
          user_id: Joi
            .string(),
          stars: Joi
            .array()
            .items(Joi.number().integer()),
          comment: Joi
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

      let query = {};
      const { filter, page, size, count } = value;
      // if filter is set
      if(filter) {
        const { food_id, user_id, stars, comment, createdAt } = filter;
        // build query
        if(food_id) {
          query.food = new Types.ObjectId(food_id);
        }

        if(user_id) {
          query.user = new Types.ObjectId(user_id);
        }

        if(comment) {
          filter.comment = comment;
        }

        if(stars) {
          query["stars"] = util.range_query(stars, res);
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

  static async get_transactions(req, res) {
    try {
      const schema = Joi.object({
        count: Joi
          .boolean()
          .default(false),
        filter: Joi
          .object({
            order_id: Joi
              .string(),
            user_id: Joi
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
          user_id, 
          pre_order_id, 
          type, 
          status, 
          amount_range, 
          debit_account, 
          credit_account,
          createdAt
        } = filter;

        if(order_id) {
          query.order = new Types.ObjectId(order_id);
        }

        if(user_id) {
          query.user = new Types.ObjectId(user_id);
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

  static async get_shipments(req, res) {
    try {
      const schema = Joi.object({
        count: Joi
          .boolean()
          .default(false),
        filter: Joi
          .object({
            order_id: Joi
              .string(),
            user_id: Joi
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
          user_id,
          address_id, 
          pre_order_id, 
          status,
          fee_range,
          estimated_delivery_time_range,
          delivery_time_range,
          createdAt
        } = filter;

        if(order_id) {
          query.order = new Types.ObjectId(order_id);
        }

        if(user_id) {
          query.user = new Types.ObjectId(user_id);
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

  static async get_addresses(req, res) {
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
}

module.exports = AdminController;
