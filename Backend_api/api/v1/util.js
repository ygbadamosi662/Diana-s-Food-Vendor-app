const bcrypt = require('bcrypt');
const { Time_Directory, Time_share } = require('./enum_ish');
const { Order, Food} = require('./models/engine/db_storage');
const { shipping_service } = require('./services/shipping_service');
const { Types } = require('mongoose');

/**
 * Defines Utility class.
 * 
 * @author Yusuf Gbadamosi <https://github.com/ygbadamosi662>
 */

class Utility {
  /**
   * Validates a password against an encrypted password.
   *
   * @param {string} og - The value entered by the user.
   * @param {string} encrypted - The encrypted value to compare against.
   * @return {Promise<boolean>} The result of the comparison, true if the values match, false otherwise.
   */
  async validate_encryption(og, encrypted) {
    try {
      const result = await bcrypt.compare(og, encrypted);
      return result;
    } catch (error) {
      // Handle error
      throw error;
    }
  }

  /**
   * Encrypts a password using bcrypt.
   *
   * @param {string} og - The password to be encrypted.
   * @return {Promise<string>} The hashed password.
   */
  async encrypt(og) {
    try {
      const salt = await bcrypt.genSalt(10);
      const hashedValue = await bcrypt.hash(og, salt);
      return hashedValue;
    } catch (error) {
      throw error;
    }
  }

  /**
   * A function to handle range queries on an array or field size.
   *
   * @param {Array|null} arr - the array for the range query
   * @param {Response} res - the response object
   * @param {number|null} size_of_field - the size of the array field
   * @return {Object} the result of the range query
   */
  range_query(arr=null, res, size_of_field=null) {
    try {
      // [0, x]: will mean <= x
      // [x, 0]: will mean >= x
      // [x, y]: will mean >= x, <= y
      // [x]: will mean === x

      // size_of_field is used to check if the query is for size of an array field and size_of_field is the name of the field
      if (arr) {
        if((arr.length < 1) || (arr.length > 2)) {
          return res
            .status(400)
            .json({
              msg: 'array expects one or two elements'
            });
        }

        if (arr.length === 1) {
          if(size_of_field) {
            return { $size: arr[0] };
          }
          return arr[0];
        }
        if (arr.length === 2) {
          if(arr[0] === 0) {
            if(size_of_field) {
              return { $lte: [{ $size: `$${size_of_field}` }, arr[1]] };
            }
            return { $lte: arr[1] };
          }
          if(arr[1] === 0) {
            if(size_of_field) {
              return { $gte: [{ $size: `$${size_of_field}` }, arr[0]] };
            }
            return { $gte: arr[0] };
          }
          if(size_of_field) {
            return {
              $and: [
                { $gte: [{ $size: `$${size_of_field}` }, arr[0]] },
                { $lte: [{ $size: `$${size_of_field}` }, arr[1]] }
              ]
            };
          }
          return { $gte: arr[0], $lte: arr[1] };
        }

      }
    } catch (error) {
      throw error;
    }
  };

  /**
   * Generates a new date based on the given time share, number of times, and time direction.
   *
   * @param {Time_share} time_share - The time share to be used for calculation (default: Time_share.hour).
   * @param {number} times - The number of times to multiply the time share by (default: 1).
   * @param {Time_Directory} time_dir - The direction of time (default: Time_Directory.past).
   * @return {Date} The generated date based on the given parameters.
   */
  last_times(time_share=Time_share.hour, times=1, time_dir=Time_Directory.past) {
    try {
      if(Object.values(Time_Directory).includes(time_dir) === false) {
        return null;
      }
      const now = new Date();
      const time = time_share * times;
      if(time_dir === Time_Directory.past) {
        return new Date(now.getTime() - time);
      }
      if(time_dir === Time_Directory.future) {
        return new Date(now.getTime() + time);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generates a date query based on the specified time parameters.
   *
   * @param {Time_share} [time_share=Time_share.hour] - The time share to use for the query.
   * @param {number} [times=1] - The number of times to include in the query.
   * @param {Time_Directory} [time_dir=Time_Directory.past] - The time direction for the query.
   * @return {Object} The date query object.
   */
  date_query(time_share=Time_share.hour, times=1, time_dir=Time_Directory.past) {
    try {
      // between now and the stipulated time
      const now = new Date();
      if(time_dir === Time_Directory.past) {
        return { 
          $lte: now,
          $gte: util.last_times(time_share, times, Time_Directory.past)
        };
      }
      if(time_dir === Time_Directory.future) {
        return { 
          $gte: now, 
          $lte: util.last_times(time_share, times, Time_Directory.future)
        };
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Checks if the given food can fulfill the order quantity.
   *
   * @param {Object} food - The food object to check.
   * @param {number} qty - The quantity of food needed.
   * @return {boolean} True if the food can fulfill the order quantity, false otherwise.
   */
  can_food_fullfill_order (food=null, qty=1, schedule_id=null) {
    if(!food) {
      return false;
    }
    try {
      if(schedule_id) {
        const schedule = food.schedules.id(new Types.ObjectId(schedule_id));
        return schedule.available_qty >= qty;
      }
      return food.qty >= qty;
    } catch (error) {
      throw error;
    }
  }
}

const util = new Utility();

module.exports = util;
