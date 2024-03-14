/**
 * Contains the PaymentService class
 * handles all payment operations
 * @author Yusuf Gbadamosi <https://github.com/ygbadamosi662>
 */
const { Order, Shipment, Address, Connection } = require('../models/engine/db_storage');
const axios = require('axios');
const { Types } = require('mongoose');
const { Order_Status, payFor, Order_type } = require('../enum_ish');
const { shipping_service } = require('../services/shipping_service');
const { payment_service } = require('../services/payment_service')
require('dotenv').config();

class CheckoutService {
  constructor (){
  }

  async checkoutOrder(payload, res) {
    const { user, preparedOrder, if_delivery } = payload;
    const dataFromService = await payment_service.initiate_payment({ user: user, amount: preparedOrder.total_breakdown.total }, res);

    const data = await Connection.transaction(async () => {
      const transaction = await payment_service.createTransaction(dataFromService,
      { 
        order: preparedOrder._id, 
        amount: preparedOrder.total_breakdown.total, 
        user: user 
      });
      let shipment = null;
      if(if_delivery) {
        const { if_old_address, address_id, new_address } = if_delivery;
        let address = {};
        if(if_old_address) {
          const _id = new Types.ObjectId(address_id);
          address = await Address.findOne({ _id: _id, user: user._id });
          if(!address) {
            return res
              .status(400)
              .json({
                msg: 'Invalid Request, address does not exist',
              });
          }
          
        } else {
          address = await Address.create({
            ...new_address,
            user: user._id
          })
        }
        shipment = await shipping_service.createShipment({ user, order: preparedOrder, address})
      }
      preparedOrder.transaction = transaction;
      preparedOrder.shipment = shipment;
      preparedOrder.status = Order_Status.pending_transaction;
      preparedOrder.type = shipment ? Order_type.delivery : Order_type.pickup;
      await preparedOrder.save();
      const expiresAt = new Date(dataFromService.account_expires_at);
  
      return {
        order_id: preparedOrder._id,
        bank: transaction.credit_account,
        amount: transaction.amount,
        expiresAt: expiresAt
      };
    });

    return data;
  }

  async handleInitiatePayment(payload, pay_for, res) {
    const { processedCart, ids, if_delivery, user } = payload;
    if(!processedCart || !pay_for || !user) {
      return null;
    }
    let data = null;
    if(pay_for === payFor.all) {
      const shippingFee = if_delivery ? shipping_service.get_fee() : 0;
      processedCart.total_breakdown.total += shippingFee;
      processedCart.total_breakdown.shipping_fee += shippingFee;
      data = await this.checkoutOrder({ user: user, preparedOrder: processedCart, if_delivery: if_delivery }, res);
    } else {
      if(pay_for === payFor.all_orders) {
        const order_content = processedCart.order_content;
        const shippingFee = if_delivery ? shipping_service.get_fee() : 0;
        data = await Connection.transaction(async () => {
          const newOrder = await Order.create({
            user: user._id,
            order_content: order_content,
            totalQty_breakdown: {
              orders_qty: processedCart.totalQty_breakdown.order_qty,
              total_qty: processedCart.totalQty_breakdown.order_qty
            },
            total_breakdown: {
              orders_total: processedCart.total_breakdown.order_total,
              shipping_fee: shippingFee,
              total: shippingFee + processedCart.total_breakdown.order_total
            },
          });
      
          return await this.checkoutOrder({ user: user, preparedOrder: newOrder, if_delivery: if_delivery }, res);
        });
      }
      if(pay_for === payFor.all_preOrders) {
        const preOrders = processedCart.pre_orders;
        const shippingFee = if_delivery ? shipping_service.get_fee() : 0;
        data = await Connection.transaction(async () => {
          const newOrder = await Order.create({
            user: user._id,
            pre_orders: preOrders,
            totalQty_breakdown: {
              preOrders_qty: processedCart.totalQty_breakdown.preOrders_qty,
              total_qty: processedCart.totalQty_breakdown.preOrders_qty
            },
            total_breakdown: {
              orders_total: processedCart.total_breakdown.preOrders_total,
              shipping_fee: shippingFee,
              total: shippingFee + processedCart.total_breakdown.preOrders_total
            },
          });

          return await this.checkoutOrder({ user: user, preparedOrder: newOrder, if_delivery: if_delivery }, res);
        });
      }
      if((pay_for === payFor.orders) && ids) {
        const selectedContent = processedCart.order_content.filter((order) => ids.includes(order._id.toString()));
        const total = selectedContent.reduce((acc, item) => acc + item.paid_price, 0);
        const total_qty = selectedContent.reduce((acc, item) => acc + item.qty, 0);
        const shippingFee = if_delivery ? shipping_service.get_fee() : 0;
        data = await Connection.transaction(async () => {
          const newOrder = await Order.create({
            user: user._id,
            order_content: selectedContent,
            totalQty_breakdown: {
              order_qty: total_qty,
              total_qty: total_qty
            },
            total_breakdown: {
              order_total: total,
              shipping_fee: shippingFee,
              total: shippingFee + total
            },
          });
    
          return await this.checkoutOrder({ user: user, preparedOrder: newOrder, if_delivery: if_delivery }, res);
        });
      }
      if((pay_for === payFor.preOrders) && ids) {
        const selectedPrs = processedCart.pre_orders.filter((pr) => ids.includes(pr._id.toString()));
        const total = selectedPrs.reduce((acc, pr) => acc + pr.total, 0);
        const total_qty = selectedPrs.reduce((acc, pr) => acc + pr.total_qty, 0);
        const shippingFee = if_delivery ? shipping_service.get_fee() : 0;
        data = await Connection.transaction(async () => {
          const newOrder = await Order.create({
            user: user._id,
            pre_orders: selectedPrs,
            totalQty_breakdown: {
              preOrders_qty: total_qty,
              total_qty: total_qty
            },
            total_breakdown: {
              preOrders_total: total,
              shipping_fee: shippingFee,
              total: shippingFee + total
            },
          });
    
          return await this.checkoutOrder({ user: user, preparedOrder: newOrder, if_delivery: if_delivery }, res);
        });
      }
    }

    return data;
  }
  
}

const checkout_service = new CheckoutService();

module.exports = { checkout_service };
