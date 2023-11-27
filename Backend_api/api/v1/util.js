const bcrypt = require('bcrypt');
const { Order_Status, Order_type } = require('./enum_ish');
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
   * Makes sense of an array of two elements and returns a range filter object.
   * @param {Array} arr - The array to make sense of.
   * @param   res - The response object.
   * @returns {any} - The sorted array or an error response.
   */
  sort_array_filter(arr=null, res) {
    if(arr) {
      if(arr.length > 2) {
        // Return an error response if the array has more than two elements
        return res
          .status(400)
          .json({
            msg: 'array only expects two elements'
          });
      }
      if(arr[0] === arr[1]) {
        // Return the first element if both elements are equal
        return arr[0];
      }
      if(arr.length === 1) {
        // Return the only element if the array has only one element
        return arr[0];
      }
      if(arr.length === 2) {
        // Return a range object if the array has two elements
        return { $lte: arr[1], $gte: arr[0] };
      }
    }
  };

/**
 * Solves the order math problem.
 *
 * @param {null | object} order - The order object to be processed.
 * @return {null | object} Returns null if the order parameter is not provided and returns processed order when provided.
 */
  solve_order_math_problem(order=null) {
    if(!order) {
      return null;
    }

    let { 
      order_content, 
      pre_orders,
      status, 
      type
    } = order;

    if(status === Order_Status.in_cart) {
      // total cost of not-preordered items
      if(order_content.length > 0) {
        order.order_total = order_content.reduce((acc, item) => {
          return acc + (item.food.price * item.qty);
        }, 0);
        // if type of not-preordered items is delivery
        if(type === Order_type.delivery) {
          order.order_shipping_fee = shipping_service.get_fee();
        }
      }
      // handle pre-orders
      let no_math_problem_pre_orders = [];
      if(pre_orders.length > 0) {
        no_math_problem_pre_orders = pre_orders.map((pre_order) => {
          console.log(pre_order)
          pre_order.order_total = pre_order.order_content.reduce((acc, item) => {
            return acc + (item.food.price * item.qty);
          }, 0);

          if(pre_order.type === Order_type.delivery) {
            pre_order.shipping_fee = shipping_service.get_fee();
          }
          pre_order.total = pre_order.order_total + pre_order.shipping_fee;
          return pre_order;
        });
      }

      let total_pre_orders = no_math_problem_pre_orders.reduce((acc, pre_order) => {
        return acc + pre_order.total;
      }, 0);

      order.total = order.order_total + order.order_shipping_fee + total_pre_orders;

      if(pre_orders.length > 1) {
        order.pre_orders = no_math_problem_pre_orders;
      }
      if(pre_orders.length === 1) {
        order.pre_order = [no_math_problem_pre_orders[0]];
      }
    }
    return order;
  }
}

const util = new Utility();

module.exports = util;
