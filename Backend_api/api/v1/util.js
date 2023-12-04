const bcrypt = require('bcrypt');
const { Order_Status, Order_type, Collections, Pre_order_Status } = require('./enum_ish');
const { Order, Food} = require('./models/engine/db_storage');
const { shipping_service } = require('./services/shipping_service');

/**
 * Defines Utility class.
 * 
 * @author Yusuf Gbadamosi <https://github.com/ygbadamosi662>
 */

class Utility {
  constructor () {
    this._bcrypt = bcrypt;
  }

  async validate_pwd(entered_pwd, encrypted_pwd) {
    try {
      const result = await bcrypt.compare(entered_pwd, encrypted_pwd);
      return result;
    } catch (error) {
      // Handle error
      throw error;
    }
  }

  async encrypt_pwd(pwd) {
    try {
      const salt = await this._bcrypt.genSalt(10);
      const hashedPassword = await this._bcrypt.hash(pwd, salt);
      return hashedPassword;
    } catch (error) {
      throw error;
    }
  }

  get_what_is_set(obj, except_these=[]) {
    try {
      if (!obj) { return }
      if (!except_these) {
        return Object.entries(obj)
          .filter(([key, value]) => value !== undefined && value !== null)
          .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
      }
      return Object.entries(obj)
        .filter(([key, value]) => value !== undefined && value !== null && !except_these.includes(key))
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
    } catch (error) {
      throw error;
    }
  }

  /**
   * Makes sense of an array of two elements and returns a mongoose range filter object.
   * @param {Array} arr - The array to make sense of.
   * @param   res - The response object.
   * @returns {Object} - The range filter object.
   */
  sort_array_filter(arr=null, res) {
    try {
      if (arr) {
        if (arr.length > 2) {
          return res.status(400).json({
            msg: 'array only expects two elements'
          });
        }
        if (arr.length === 1) {
          return arr[0];
        }
        if (arr.length === 2) {
          // Return an object suitable for range query
          return { $gte: arr[0], $lte: arr[1] };
        }
      }
    } catch (error) {
      throw error;
    }
  };

  /**
   * Checks if the given food can fulfill the order quantity.
   *
   * @param {Object} food - The food object to check.
   * @param {number} qty - The quantity of food needed.
   * @return {boolean} True if the food can fulfill the order quantity, false otherwise.
   */
  can_food_fullfill_order (food=null, qty=1) {
    try {
      if(!food) {
        return false;
      }
      return food.qty >= qty;
    } catch (error) {
      throw error;
    }
  }
}

const util = new Utility();

module.exports = util;
