const util = require('../util');
const { shipping_service } = require('../services/shipping_service');
const { appAx } = require('../appAxios');
const { user_repo } = require('../repos/user_repo');
const { review_repo } = require('../repos/review_repo');
const { Shipment, Address, Transaction, User, Food, Review, Order, Notification, page_info } = require('../models/engine/db_storage')
const { notification_service } = require('../services/notification_service');
const { notification_repo } = require('../repos/notification_repo');
const { Connection } = require('../models/engine/db_storage');
const MongooseError = require('mongoose').Error;
const JsonWebTokenErro = require('jsonwebtoken').JsonWebTokenError;
const Joi = require('joi');
const { Types } = require('../models/mongo_schemas/food');
const { Collections, 
  Order_Status, 
  Transaction_Status, 
  Role, 
  Type, 
  Order_type, 
  Where, 
  States,
  Countries,
  Time_share
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
      
      const paystack_res = await appAx.post('https://api.paystack.co/transaction/initialize', {
        email: "vendor@gmail.com",
        amount:  100000,
      });
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
      const notification = await Notification
        .findById(req.params.id)
        .exec();

      if (!notification) {
        return res
          .status(400)
          .json({
            msg: 'Bad request, notification does not exist',
          });
      }

      if (notification.to.toString() !== req.user._id) {
        return res
          .status(400)
          .json({
            msg: 'Invalid credentials',
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
// needs update
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
            schedule: Joi
              .date()
              .iso(),
            price_range: Joi
              .array()
              .items(Joi.number().integer().precision(2)),
            qty_range: Joi
              .array()
              .items(Joi.number().integer()),
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
        const { name, fave_count, types, price_range, qty_range, schedule } = filter;

        if(schedule) {
          query.schedules = { $elemMatch: { for_when: schedule } };
        }
        
        if(name) {
          query.name = new RegExp(name);
        }

        if(price_range) {
          query.price = util.sort_array_filter(price_range, res);
        }

        if(qty_range) {
          query.qty = util.sort_array_filter(qty_range, res);
        }

        if(fave_count) {
          query.fave_count = util.sort_array_filter(fave_count, res);
        }

        if(types) {
          query.types = { $in: types };
        }
      }

      console.log(query);
      // if count is true, consumer just wants a count of the filtered documents
      if (value.count) {
        const count = await Food
          .countDocuments(query);

        return res
          .status(200)
          .json({
            count: count,
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
          .exec(); //get orders

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
        phone: Joi.object({
            new_phone: Joi
              .string()
              .pattern(/^[8792][01]\d{8}$/)
              .required(),
            password: Joi
              .string()
              .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()])[a-zA-Z0-9!@#$%^&*()]{8,}$/)
              .required(),
          }),
        email: Joi.object({
            new_email: Joi
              .string()
              .email({ minDomainSegments: 2, tlds: { allow: ['com', 'net'] } })
              .required(),
            password: Joi
              .string()
              .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()])[a-zA-Z0-9!@#$%^&*()]{8,}$/)
              .required(),
          }),
        password: Joi.object({
            new_password: Joi
              .string()
              .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()])[a-zA-Z0-9!@#$%^&*()]{8,}$/)
              .required(),
            old_password: Joi
              .string()
              .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()])[a-zA-Z0-9!@#$%^&*()]{8,}$/)
              .required(),
          }),
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

      const user = await user_repo.findByEmail(req.user.email);

      // validates password for updating sensitive data
      if (value.email || value.phone || value.password) {
        if (value.email) {
          if(await util.validate_pwd(value.email.password, user.password)) {
            user.email = value.email.new_email;
          } else {
            return res
              .status(400)
              .json({ msg: 'Invalid Credentials'})
          }
        }
        if (value.phone) {
          if(await util.validate_pwd(value.phone.password, user.password)) {
            user.phone = value.phone.new_phone;
          } else {
            return res
              .status(400)
              .json({ msg: 'Invalid Credentials'})
          }
        }
        if (value.password) {
          if(await util.validate_pwd(value.password.old_password, user.password)) {
            user.password = await util.encrypt_pwd(value.password.new_password);
          } else {
            return res
              .status(400)
              .json({ msg: 'Invalid Credentials'})
          }
        }
      }

      if(value.fname) { user.name.fname = value.fname; }
      if(value.lname) { user.name.lname = value.lname; }
      if(value.dob) { user.dob = value.dob; }
      if(value.aka) { user.name.aka = value.aka; }

      await user.save();
      user.password = "";
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
          yes: Joi
            .boolean()
            .default(false),
          schedule: Joi
            .number()
            .default(0),
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

      const validate_timing = () => {
        return value.pre_order.delivery_time.getTime() > Date.now();
      };

      // validate schedules
      if(value.pre_order.yes && !validate_timing()) {
        return res
          .status(400)
          .json({
            msg: 'Invalid request, delivery must have a reasonable timing in the future',
          });
      }

      // check if food exists
      const food = await Food
        .findById(value.food_id)
        .exec();

      // validate food
      if(!food) {
        return res
          .status(400)
          .json({
            msg: 'Invalid Request, food does not exist',
          });
      }

      // validate qty
      if(!util.can_food_fullfill_order(food, value.qty)) {
        return res
          .status(400)
          .json({
            msg: `Invalid Request, not enough ${food.name} in stock`,
          });
      }
      
      // validate schedule
      if(!food.schedules[value.pre_order.schedule]) {
        return res
          .status(400)
          .json({
            msg: 'Invalid Request, schedule does not exist',
          });
      }

      const user = await user_repo.findByEmail(req.user.email);

      // find open cart
      let order = await Order
        .find({
          user: user,
          status: Order_Status.in_cart,
        })
        .populate('pre_orders.order_content.food order_content.food');
      // console.log(order.pre_orders[0]);

      let added_flag = false;
      const cost = food.price * value.qty;

      // if no existing cart
      if((added_flag === false) && (order.length === 0)) {
        const shipping_fee = shipping_service.get_fee(true);
        // if pre-order
        if((added_flag === false) && (value.pre_order.yes)) {
          const now = new Date();
          // check if pre-order time has expired
          if(now.getTime() > food.schedules[value.pre_order.schedule]?.expiry_time.getTime()) {
            return res
              .status(400)
              .json({
                msg: 'Pre-order time has expired',
              });
          }
          // create pre-order
          const pre_order = {
            order_content: [{
              food: food,
              qty: value.qty,
              scheduled_for: {
                ready_time: food.schedules[value.pre_order.schedule]?.for_when,
              },
            }],
            ready_time: value.pre_order.delivery_time ? value.pre_order.delivery_time : food.schedules[value.pre_order.schedule]?.for_when,
            total_qty: value.qty,
            order_total: cost,
            shipping_fee: shipping_fee,
            total: cost + shipping_fee
          };

          // create order
          order = await Order.create({
            user: user,
            status: Order_Status.in_cart,
            pre_orders: [pre_order],
            total_qty: value.qty,
            total: cost + shipping_fee
          });

          // update food schedule
          let pre_order_id = order.pre_orders[0]._id.toString();
          let ssf = food.schedules[value.pre_order.schedule].orders;
          ssf.push({
            order: order,
            user: user,
            pre_order_id: pre_order_id,
            qty: value.qty,
          })
          food.schedules[value.pre_order.schedule].orders = ssf;
          added_flag = true;
        }

        // not pre-order
        if((added_flag === false) && (!value.pre_order.yes)) {
          order = await Order.create({
            user: user,
            status: Order_Status.in_cart,
            order_content: [{
              food: food,
              qty: value.qty,
            }],
            total_qty: value.qty,
            order_total: cost,
            shipping_fee: shipping_fee,
            total: cost + shipping_fee
          });
        }
      } 
      // if existing cart
      if((added_flag === false) && (order.length > 0)) {
        // if pre-order
        if((added_flag === false) && (value.pre_order.yes)) {
          const now = new Date();
          // check if pre-order time has expired
          if(now.getTime() > food.schedules[value.pre_order.schedule]?.expiry_time.getTime()) {
            return res
              .status(400)
              .json({
                msg: 'Pre-order time has expired',
              });
          }
    
          // find pre-order
          let found = false;
          order[0].pre_orders = order[0].pre_orders?.map((pre_order) => {
            // delivery time or ready time matches any existing pre-order
            if((pre_order.ready_time.getTime() === value.pre_order.delivery_time.getTime()) || (food.schedules[value.pre_order.schedule]?.for_when.getTime() === pre_order.ready_time.getTime())) {
              // update pre-order
              pre_order.order_content.push({
                food: food,
                qty: value.qty,
                scheduled_for: {
                  ready_time: food.schedules[value.pre_order.schedule]?.for_when,
                },
              });

              pre_order.total_qty += value.qty;
              pre_order.order_total += cost;
              pre_order.shipping_fee = shipping_service.get_fee(true);
              pre_order.total = pre_order.order_total + pre_order.shipping_fee;
              // found pre-order
              // update food schedule
              food.schedules[value.pre_order.schedule].orders.push({
                order: order[0],
                user: user,
                pre_order_id: pre_order._id.toString(),
                qty: value.qty,
              });
              // found
              found = true;
              return pre_order;
            }
            return pre_order;
          })

          if(!found) {
            const shipping_fee = shipping_service.get_fee(true);
            // create pre-order
            order[0].pre_orders.push({
              order_content: [{
                food: food,
                qty: value.qty,
                scheduled_for: {
                  ready_time: food.schedules[value.pre_order.schedule]?.for_when,
                },
              }],
              ready_time: value.pre_order.delivery_time ? value.pre_order.delivery_time : food.schedules[value.pre_order.schedule]?.for_when,
              total_qty: value.qty,
              order_total: cost,
              shipping_fee: shipping_fee,
              total: cost + shipping_fee
            });

            // update food schedule
            food.schedules[value.pre_order.schedule].orders.push({
              order: order[0],
              user: user,
              pre_order_id: order[0].pre_orders[ order[0].pre_orders.length - 1 ]._id.toString(),
              qty: value.qty,
            });
          }
          order[0].total_qty += value.qty;
          order[0].total += cost;
        }

        // not pre-order
        if((added_flag === false) && (!value.pre_order.yes)) {
          order[0].order_content.push({
            food: food,
            qty: value.qty,
          });
          order[0].total_qty += value.qty;
          order[0].total += cost;
          order[0].order_total += cost;
        }
        order = order[0];
      }

      // save order and food
      await Connection
        .transaction(async () => {
          const gather_task = Promise.all([food.save(), order.save()])
          // save
          await gather_task;
        });

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
                  return helpers.error('invalid request, for address_id');
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
                  return helpers.error('invalid request, address is required');
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

      const order = await Order
        .findById(value.order_id)
        .exec();

      // check if recipe exists
      if(!order) {
        return res
          .status(400)
          .json({
            msg: 'Invalid Request, food does not exist',
          });
      }

      const user = await user_repo.findByEmail(req.user.email, ['_id']);
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
          food: Joi
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

      // validates food
      const food = await Food.findById(value.filter.food);
      if(!food) {
        return res
          .status(400)
          .json({
            msg: 'Invalid Request, food does not exist',
          });
      }

      // build query
      let filter = {};
      filter = value.filter;
      filter.food = food;
      if(filter.comment) {
        filter.comment = new RegExp(filter.comment);
      }

      if(filter.stars) {
        filter.stars = util.sort_array_filter(filter.stars, res);
      }

      // if count is true, consumer just wants a count of the filtered documents
      if (value.count) {
        const count = await Review.countDocuments(filter);

        return res
            .status(200)
            .json({
              count: count,
            });
      }

      const gather_data_task = Promise.all([
        review_repo.get_revs(filter, value.page, value.size), //get reviewa
        review_repo.has_next_page(filter, value.page, value.size), //if there is a next page
        review_repo.total_pages(filter, value.size), //get total pages
      ]);

      const done = await gather_data_task;

      return res
        .status(200)
        .json({
          reviews: done[0].map((rev) => {
            rev.food = rev.food.toString();
            return rev;
          }),
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

  static async get_review(req, res) {
    try {
      if (!req.params.id) {
        return res
          .status(400)
          .json({
            msg: 'Invalid Request, id is required',
          });
      }
      const rev = await Review
        .findById(req.params.id)
        .populate('user', 'name _id gender');
      if(!rev) {
        return res
          .status(400)
          .json({
            msg: 'Invalid Request, review does not exist',
          });
      }

      // rev.recipe = rev.recipe._id;
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

  static async get_notifications(req, res) {
    try {
      const schema = Joi.object({
        count: Joi
          .boolean()
          .default(false),
        status: Joi
          .string()
          .valid(...Object.values(Status)),
        page: Joi
          .number()
          .integer()
          .default(1),
        size: Joi
          .number()
          .integer()
          .default(5),
      });

      // validate body
      const { value, error } = schema.validate(req.body);
      
      if (error) {
        throw error;
      }
      
      const user_pr = user_repo.findByEmail(req.user.email, ['_id']);

      // fill up filter
      let filter = {};

      if(value.status) { 
        if(value.status === Status.not_read) {
          filter.$or = [{ status: Status.received }, {status: Status.sent }];
        } else {
          filter.status = value.status;
        }
      }
      const user = await user_pr;

      if(!user) {
        return res
          .status(400)
          .json({
            msg: "Cant find jwt user"
          });
      }
      filter.user = user;

      // if count is true, consumer just wants a count of the filtered documents
      if (value.count) {
        const count = await Notification
          .countDocuments(filter);
        return res
          .status(200)
          .json({
            status: value.status,
            count: count,
          });
      }
  
      const gather_data_task = Promise.all([
        Notification
          .find(filter)
          .skip((value.page - 1) * value.size)
          .limit(value.size)
          .sort({ createdAt: -1 })
          .exec(), //get notifications
        notification_repo.has_next_page(filter, value.page, value.size), //if there is a next page
        notification_repo.total_pages(filter, value.size), //get total pages
      ]);
      const donezo = await gather_data_task;

      let result = [];
      if (donezo[0]) {
        // update notification status
        await Connection
          .transaction(async () => {
            let gather_task = [];
            donezo[0]?.map((note) => {
              if(note.status === Status.sent) {
                note.status = Status.received;
                gather_task.push(note.save());
              }
            });
            donezo[0].filter((note) => {
              return note.status === Status.sent
            });

            result = await Promise.all(gather_task);
            if(result) {
              result = [...donezo[0], ...result];
            }
            if(!result) {
              result = donezo[0];
            }
          });
      }
      return res
        .status(200)
        .json({
          notes: result ? result?.map((note) => {
            return {
              id: note.id,
              comment: note.comment,
              status: note.status,
            };
          }) : [],
          have_next_page: donezo[1],
          total_pages: donezo[2]
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

  static async read_notifications(req, res) {
    try {
      const schema = Joi.object({
        ids: Joi
          .array()
          .items(Joi.string())
          .required()
      });

      // validate body
      const { value, error } = schema.validate(req.body);
      
      if (error) {
        throw error;
      }

      await Connection
        .transaction(async () => {
          let gather_task = [];
          value.ids.map((id) => {
           gather_task.push(Notification.findByIdAndUpdate(id, { status: Status.read }));
          });
          await Promise.all(gather_task);
        });

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

  static async get_notification(req, res) {
    try {
      if (!req.params.id) {
        return res
          .status(400)
          .json({ error: 'Invalid request, id is required'});
      }

      const note = await Notification
        .findById(req.params.id)
        .exec();

      if(!note) {
        return res
          .status(400)
          .json({ msg: 'Invalid request, id does not exist'});
      }

      const user = await user_repo.findByEmail(req.user.email, ['_id']);

      // validates user 
      if(note.to.toString() !== user._id.toString()) {
        return res
          .status(400)
          .json({ msg: 'Invalid Credentials'});
      }

      if (note.status !== Status.read) {
         note.status =  Status.read;
      }
      await note.save();
      return res
        .status(200)
        .json({ note: note});
      
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

  static async delete_review(req, res) {
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

  static async get_order(req, res) {
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

  static async get_transaction(req, res) {
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

  static async get_shipment(req, res) {
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

  static async get_address(req, res) {
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
}
  
module.exports = UserController;
