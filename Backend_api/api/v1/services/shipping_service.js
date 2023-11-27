/**
 * Contains the ShippingService class
 * handles all shipping operations
 * @author Yusuf Gbadamosi <https://github.com/ygbadamosi662>
 */
const { storage } = require('../models/engine/db_storage');
const { appAx } = require('../appAxios');
require('dotenv').config();

class ShippingService {
  constructor (){
    this.test_shipping_fee = 1500;
  }

  get_fee(test=true) {
    if(test) {
      return this.test_shipping_fee;
    }
  }
}

const shipping_service = new ShippingService();

module.exports = { shipping_service };
