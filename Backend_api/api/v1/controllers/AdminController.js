require('dotenv').config();
const util = require('../util');
const { user_repo, User } = require('../repos/user_repo');
const { Food, food_repo } = require('../repos/food_repo');
const { Review, review_repo } = require('../repos/review_repo');
const { Order, order_repo } = require('../repos/order_repo');
const { Transaction, transaction_repo } = require('../repos/transaction_repo');
const { notification_service } = require('../services/notification_service');
const { Notification, notification_repo } = require('../repos/notification_repo');
const { Connection } = require('../models/engine/db_storage');
const MongooseError = require('mongoose').Error;
const JsonWebTokenErro = require('jsonwebtoken').JsonWebTokenError;
const Joi = require('joi');
// const { redisClient } = require('../redis');
const { Type, Status, Role, Collections } = require('../enum_ish');
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
          .precision(4),
        type: Joi
          .string()
          .valid(...Object.values(Type))
          .default(Type.food)
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
          type: Joi
            .string()
            .valid(...Object.values(Type))
          }),
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

      const food = await Food.findByIdAndUpdate(value.id, value.update);
      // validate food
      if (!food) {
        return res
          .status(400)
          .json({
            msg: `Invalid request, There is no food with id: ${value.id}`,
          })
      }

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

      const gather_data_task = Promise.all([
        User
        .find(value.filter)
        .skip((value.page - 1) * value.size)
        .limit(value.size)
        .sort({ createdAt: -1 })
        .exec(), //get users
        user_repo.has_next_page(value.filter, value.page, value.size), //if there is a next page
        user_repo.total_pages(value.filter, value.size), //get total pages
      ]);

      const datas = await gather_data_task;

      return res
        .status(200)
        .json({
          users: datas[0],
          have_next_page: datas[1],
          total_pages: datas[1],
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
