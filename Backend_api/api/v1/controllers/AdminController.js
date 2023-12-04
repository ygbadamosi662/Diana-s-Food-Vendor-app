require('dotenv').config();
const util = require('../util');
const { page_info, User, Food, Review, Order, Transaction, Connection } = require('../models/engine/db_storage');
const { user_repo } = require('../repos/user_repo');
const { food_repo } = require('../repos/food_repo');
const { review_repo } = require('../repos/review_repo');
const { notification_service } = require('../services/notification_service');
const { notification_repo } = require('../repos/notification_repo');
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
      const schema = Joi.object({
        id: Joi
          .string()
          .required(),
        schedules: Joi
          .array()
          .items(Joi.date())
          .required(),
        type: Joi
          .array()
          .items(Joi.string().valid(...Object.values(Schedule_type)))
          .default([Schedule_type.one_off, Schedule_type.one_off, Schedule_type.one_off, Schedule_type.one_off]),
        hashtag: Joi
          .array()
          .items(Joi.string()),
      });

      // validate body
      const { value, error } = schema.validate(req.body);
      
      if (error) {
        throw error;
      }

      let { type, hashtag } = value;
      let schedules = [];

      /**
       * Validates the timing of each schedule in the given value.
       *
       * @return {boolean} Returns true if all schedules have a reasonable timing in the future, otherwise false.
       */
      const validate_timing = () => {
        let index = 0;
        return value.schedules.every((schedule) => {
          let new_schedule =  {
            for_when: schedule,
            type: type[index],
          };
          let expiry_time = get_schedule_expiry(new_schedule);
          const reasonable = (expiry_time.getTime() - Time_share.hour) > Date.now(); //this means time to set expiration of schedule and for users to have ample time to preorder have been set to 1hour b4 schedule expiration.

          // collect schedule
          if(!reasonable) {
            return reasonable;
          }
          new_schedule.hashtag = hashtag ? `#${hashtag.toLocaleLowerCase()}` : null;
          new_schedule.expiry_time = expiry_time;

          schedules.push(new_schedule);

          index++;
          return reasonable;
        });
      };

      //promised food
      const food_pr = Food
        .findById(value.id)
        .select('schedules _id name');

      // validate schedules
      if(!validate_timing()) {
        return res
          .status(400)
          .json({
            msg: 'Invalid request, schedules must have a reasonable timing in the future',
          });
      }

      // collect food
      const food = await food_pr;
    
      // validate food
      if(!food) {
        return res
          .status(400)
          .json({
            msg: `Invalid request, There is no food with id: ${value.id}`,
          });
      }

      // check if schedule already exists
      let exists_msg = ""
      const does_not_exists = food.schedules.every((host_schedule) => {
        return schedules.every((schedule) => {
          const exists = schedule.for_when === host_schedule.for_when
          if(exists) {
            exists_msg = `Oops, food already has schedule: ${schedule.for_when.toISOString()}`;
            return false;
          }
          return true;
        });
      });

      if(does_not_exists === false) {
        return res
          .status(400)
          .json({
            msg: exists_msg,
          });
      }

      let scheduled_flag = false;

      // check if only one schedule is provided
      if((scheduled_flag === false) && schedules.length === 1) {
        food.schedules.push(schedules[0]);
        scheduled_flag = true;
      }

      // check if more than one schedule is provided
      if((scheduled_flag === false) && schedules.length > 1) {
         // check if food has schedules
        if((scheduled_flag === false) && food.schedules.length === 0) {
          food.schedules = schedules;
          scheduled_flag = true;
        }

        // if it has multiple schedules
        if((scheduled_flag === false) && food.schedules.length > 0) {
          food.schedules = [...food.schedules, ...schedules];
          scheduled_flag = true;
        }
      }

      // sort schedules in ascending order
      scheduled_flag && food.schedules.sort((a, b) => a.for - b.for);

      // save food
      scheduled_flag && await food.save();
      
      return res
        .status(201)
        .json({
          msg: `schedules successfully added`,
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
      let { filter } = value;
      const { name } = filter;
      if(name.fname) { filter['name.fname'] = name.fname }
      if(name.lname) { filter['name.lname'] = name.lname }
      if(name.aka) { filter['name.aka'] = name.aka }
      delete filter.name;

      // if count is true, consumer just wants a count of the filtered documents
      if (value.count) {
        const count = await User
            .countDocuments(value.filter);
        return res
          .status(200)
          .json({
            status: value.status,
            count: count,
          });
      }

      const { haveNextPage, currentPageExists, totalPages } = await page_info(filter, Collections.User, value.size, value.page);

      let gather_data = [];

      if(currentPageExists) {
        const users = await User
          .find(filter)
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
          have_next_page: gather_datas[1],
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
            user: Joi
              .string(),
            type: Joi
              .string()
              .valid(...Object.values(Order_type))
              .default(Order_type.pickup),
            pre_orders: Joi
              .object({
                type: Joi
                  .string()
                  .valid(...Object.values(Order_type))
                  .default(Order_type.pickup),
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
                    food: Joi
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
                    time_share: Joi
                      .string()
                      .valid(...Object.values(Time_share))
                      .default(Time_share.day),
                    times: Joi
                      .number()
                      .integer()
                      .default(1),
                  })
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
                food: Joi
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
                time_share: Joi
                  .string()
                  .valid(...Object.values(Time_share))
                  .default(Time_share.day),
                times: Joi
                  .number()
                  .integer()
                  .default(1),
              })
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

      // steal some seconds if value.query.user is set and validate user
      let a_user_wish = null;
      if(filter?.user) {
        const exists = await User.exists({_Id: Types.ObjectId(filter.user)});
        if(!exists) {
          return res
            .status(400)
            .json({
              message: 'Bad request, User does not exist',
            })
        }
        // make a wish
        a_user_wish = User
          .findById()
          .select('_id')
          .exec(); //get user
      }

      let query = {};
      // if query is set
      if(filter) {
        // building filter
        const {
          user, 
          type, 
          status, 
          total_range, 
          qty_range, 
          pickup_time_range, 
          order_total_range, 
          order_content,
          pre_orders
         } = filter;

        if(order_content) {
          if(order_content.paid_price_range) {
            order_content.paid_price = util.sort_array_filter(order_content.paid_price_range, res);
          }
          if(order_content.qty_range) {
            order_content.qty = util.sort_array_filter(order_content.qty_range, res);
          }
          if(order_content.food_query) {
            if(order_content.food_query.types) {
              order_content.food.types = { $in:  order_content.food_query.types};
            }
            if(order_content.food_query.name) {
              order_content.food.name = order_content.food_query.name;
            }
            if(order_content.food_query.fave_count) {
              order_content.food.fave_count = util.sort_array_filter(order_content.food_query.fave_count, res);
            }
          }
          query.order_content = { $elemMatch: order_content };
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
           } = pre_orders;

           let pre_orders_query = {};

          if(pre_orders.order_content) {
            let order_content_query = {};
            if(order_content.paid_price_range) {
              order_content_query.paid_price = util.sort_array_filter(order_content.paid_price_range, res);
            }
            if(order_content.qty_range) {
              order_content_query.qty = util.sort_array_filter(order_content.qty_range, res);
            }
            if(order_content.food_query) {
              order_content_query.food = {};
              if(order_content.food_query.types) {
                order_content_query.food.types = { $in:  order_content.food_query.types};
              }
              if(order_content.food_query.name) {
                order_content_query.food.name = order_content.food_query.name;
              }
              if(order_content.food_query.fave_count) {
                order_content_query.food.fave_count = util.sort_array_filter(order_content.food_query.fave_count, res);
              }
            }
            pre_orders_query.order_content = { $elemMatch: order_content_query };
          }

          if(total_range) {
            pre_orders_query.total = util.sort_array_filter(total_range, res);
          }
  
          if(order_total_range) {
            pre_orders_query.order_total = util.sort_array_filter(order_total_range, res);
          }
  
          if(qty_range) {
            pre_orders_query.total_qty = util.sort_array_filter(qty_range, res);
          }
  
          if(pickup_time_range) {
            const now = new Date();
            const minus_time = pickup_time_range.time_share * pickup_time_range.times;
            const time = new Date(now.getTime() - minus_time);
            pre_orders_query.ready_time = { $gte: time };
          }
  
          if(type) {
            pre_orders_query.type = type;
          }
  
          if(status) {
            pre_orders_query.status = status;
          }
          query.pre_orders = { $elemMatch: pre_orders_query };
        }

        if(total_range) {
          query.total = util.sort_array_filter(total_range, res);
        }

        if(order_total_range) {
          query.order_total = util.sort_array_filter(order_total_range, res);
        }

        if(qty_range) {
          query.total_qty = { $gte: qty_range[0], $lte: qty_range[1] };
        }

        if(pickup_time_range) {
          const now = new Date();
          const minus_time = pickup_time_range.time_share * pickup_time_range.times;
          const time = new Date(now.getTime() - minus_time);
          query.pickup_time = { $gte: time };
        }

        if(type) {
          query.type = type;
        }

        if(status) {
          query.status = status;
        }

        if(user) {
          //wish granted, you are welcome.
          query.user = await a_user_wish;
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
        filter: Joi
          .object({
            comment: Joi
              .string(),
            stars: Joi
              .array()
              .items(Joi.number().integer()),
            food_id: Joi
              .string(),
            user_id: Joi
              .string()
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

      let filter = {};
      // if value.filter is set
      if(value.filter) {
        // building filter
        filter = value.filter;
        // if user or food is set
        if(value.filter.user || value.filter.recipe) {
          if (value.filter.user && value.filter.recipe) {
            let donezo = [];
            await Connection.transaction(async () => {
              let gather_task = [
                User.findById(value.filter.user_id),
                Food.findById(value.filter.food_id)
              ];
              donezo = await Promise.all(gather_task);
            });

            // food or user does not exist
            if(!donezo[0] || !donezo[1]) {
              let who = [];
              if(!donezo[0]) {
                who.push('User');
              }
              if(!donezo[1]) {
                who.push('Food');
              }

              return res
                .status(400)
                .json({
                  msg: `Bad Request, ${who.length == 2 ? who.join(',') : who[0]} does not exist`,
                });
            }

            filter.user = donezo[0];
            filter.food = donezo[1];
          }

          if(value.filter.user_id) {
            const user = await User.findById(value.filter.user_id);
            if(!user) {
              return res
                .status(400)
                .json({
                  msg: 'Bad request, User does not exist',
                });
            }
            filter.user = user;
          }

          if(value.filter.food_id) {
            const food = await Food.findById(value.filter.food_id);
            if(!food) {
              return res
                .status(400)
                .json({
                  msg: 'Bad request, Food does not exist',
                });
            }
            filter.food = food;
          }
        }

        const { comment, stars } = filter;

        if(comment) {
          filter.comment = new RegExp(comment);
        }

        if(stars) {
          filter.stars = util.sort_array_filter(stars);
      }
    }

      // if count is true, consumer just wants a count of the filtered documents
      if (value.count) {
        const count = await Review
          .countDocuments(filter);

        return res
          .status(200)
          .json({
            count: count,
          });
      }
      
      const gather_data_task = Promise.all([
        Review
          .find(filter)
          .skip((value.page - 1) * value.size)
          .limit(value.size)
          .populate('user')
          .sort({ createdAt: -1 })
          .exec(), //get recipes
        review_repo.has_next_page(filter, value.page, value.size), //if there is a next page
        review_repo.total_pages(filter, value.size), //get total pages
      ]);

      const done = await gather_data_task;
      return res
        .status(200)
        .json({
          reviews: done[0],
          have_next_page: done[1],
          total_pages: done[2],
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

  static async get_notifications(req, res) {
    try {
      const schema = Joi.object({
        count: Joi
          .boolean()
          .required(),
        filter: Joi
          .object({
            comment: Joi
              .string(),
            createdAt: Joi // in hours
              .number()
              .precision(1),
            to: Joi
              .string(),
            status: Joi
              .string()
              .valid(...Object.values(Status))
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

      let filter = {};
      // if value.filter is set
      if(value.filter) {
        // building filter
        filter = value.filter;
        // if user or recipe is set
        if(value.filter.to) {
          const user = await User.findById(value.filter.to);
          if(!user) {
            return res
              .status(400)
              .json({
                message: 'Bad request, User does not exist',
              });
          }
          filter.to = user;
        }

        const { createdAt } = filter;
        if(createdAt) {
          const now = new Date();
          const x_ago = new Date(now.getTime() - (createdAt * 60 * 60 * 1000));
          filter.createdAt = { $gte: x_ago};
        }
      }

      // if count is true, consumer just wants a count of the filtered documents
      if (value.count) {
        const count = await Notification
          .countDocuments(filter);

        return res
          .status(200)
          .json({
            count: count,
          });
      }
      
      const gather_data_task = Promise.all([
        Notification
          .find(filter)
          .skip((value.page - 1) * value.size)
          .limit(value.size)
          .sort({ createdAt: -1 })
          .exec(), //get recipes
        notification_repo.has_next_page(filter, value.page, value.size), //if there is a next page
        notification_repo.total_pages(filter, value.size), //get total pages
      ]);

      const done = await gather_data_task;
      return res
        .status(200)
        .json({
          notifications: done[0],
          have_next_page: done[1],
          total_pages: done[2],
        });
        
    } catch (error) {
      if (error instanceof MongooseError) {
        console.log('We have a mongoose problem', error.message);
        return res.status(500).json({error: error.message});
      }
      if (error instanceof JsonWebTokenErro) {
        console.log('We have a jwt problem', error.message);
        return res.status(500).json({error: error.message});
      }
      console.log(error);
      return res.status(500).json({error: error.message});
    }
  }

  static async get_notification(req, res) {
    try {
      if (!req.params.id) { 
        return res
        .status(400)
        .json({ msg: 'Invalid request, id is required'}); 
      }
      const notification = await Notification.findById(req.params.id);

      if (!notification) {
        return res
          .status(401)
          .json({
            msg: 'Bad request, notification does not exist',
          });
      }

      return res
        .status(200)
        .json({
          notification,
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
}

module.exports = AdminController;
