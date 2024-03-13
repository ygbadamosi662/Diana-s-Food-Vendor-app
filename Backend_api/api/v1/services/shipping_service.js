/**
 * Contains the ShippingService class
 * handles all shipping operations
 * @author Yusuf Gbadamosi <https://github.com/ygbadamosi662>
 */
const { Shipment, Order } = require('../models/engine/db_storage');
const { appAx } = require('../appAxios');
const { Shipemnt_status, Time_share } = require('../enum_ish');
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

  
  async createShipment(payload) {
    const { user, order, address} = payload;
    
    const shipment = await Shipment.create({
      user: user._id,
      order: order._id,
      address: address._id,
      status: Shipemnt_status.pending,
      fee: order.total_breakdown.shipping_fee
    });

    return shipment;
  }

  getEstimatedDeliveryTime(shipment) {
    const now = new Date();
    const estimated_delivery_time = new Date((now.getTime() + (Time_share.hour)));

    return estimated_delivery_time;
  }
}

const shipping_service = new ShippingService();

module.exports = { shipping_service };
