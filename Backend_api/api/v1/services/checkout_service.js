/**
 * Contains the PaymentService class
 * handles all payment operations
 * @author Yusuf Gbadamosi <https://github.com/ygbadamosi662>
 */
const { Order, Address, Connection } = require('../models/engine/db_storage');
const axios = require('axios');
const { Types } = require('mongoose');
const { Order_Status, payFor, Order_type, Transaction_Status } = require('../enum_ish');
const { shipping_service } = require('../services/shipping_service');
const { payment_service } = require('../services/payment_service');
require('dotenv').config();

class CheckoutService {

  async checkoutOrder(payload) {
    try {
      const { user, preparedOrder, if_delivery } = payload;

      const data = await Connection.transaction(async () => {
        const dataFromService = await payment_service.initiate_payment({ user: user, amount: preparedOrder.total_breakdown.total });
        const transaction = await payment_service.createTransaction(dataFromService.data,
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
        const expiresAt = new Date(dataFromService.data.account_expires_at);
      
        return {
          order_id: preparedOrder._id,
          bank: transaction.credit_account,
          amount: transaction.amount,
          expiresAt: expiresAt
        };
      });

      return data;
    } catch (error) {
      throw error;
    }
  }

  async handleInitiatePayment(payload, pay_for) {
    const { processedCart, ids, if_delivery, user } = payload;
    if(!processedCart || !pay_for || !user) {
      return null;
    }
    let data = null;
    if(pay_for === payFor.all) {
      // this still need some work, to hanlde pre orders properly
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
              order_qty: processedCart.totalQty_breakdown.order_qty,
              total_qty: processedCart.totalQty_breakdown.order_qty
            },
            total_breakdown: {
              order_total: processedCart.total_breakdown.order_total,
              shipping_fee: shippingFee,
              total: shippingFee + processedCart.total_breakdown.order_total
            },
          });
      
          const result =  await this.checkoutOrder({ user: user, preparedOrder: newOrder, if_delivery: if_delivery });

          if(result) {
            const total = processedCart.order_content.reduce((acc, item) => acc + item.price, 0);
            const total_qty = selectedContent.reduce((acc, item) => acc + item.qty, 0);
            processedCart.order_content = [];
            processedCart.total_breakdown.order_total = 0;
            processedCart.total_breakdown.total -= total;
            processedCart.totalQty_breakdown.order_qty = 0;
            processedCart.totalQty_breakdown.total_qty -= total_qty;
          }

          return result;
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
              preOrders_total: processedCart.total_breakdown.preOrders_total,
              shipping_fee: shippingFee,
              total: shippingFee + processedCart.total_breakdown.preOrders_total
            },
          });

          const result = await this.checkoutOrder({ user: user, preparedOrder: newOrder, if_delivery: if_delivery });

          if(result) {
            const total = processedCart.pre_orders.reduce((acc, pr) => acc + pr.total, 0);
            const total_qty = processedCart.pre_orders.reduce((acc, pr) => acc + pr.total_qty, 0);
            processedCart.pre_orders = [];
            processedCart.total_breakdown.preOrders_total = 0;
            processedCart.total_breakdown.total -= total;
            processedCart.totalQty_breakdown.preOrders_qty = 0;
            processedCart.totalQty_breakdown.total_qty -= total_qty;
          }

          return result;
        });
      }
      if((pay_for === payFor.orders) && ids) {
        const selectedContent = processedCart.order_content.filter((order) => ids.includes(order._id.toString()));
        const total = selectedContent.reduce((acc, item) => acc + item.price, 0);
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
    
          const result = await this.checkoutOrder({ user: user, preparedOrder: newOrder, if_delivery: if_delivery }, res);

          if(result) {
            const notSelectedContent = processedCart.order_content.filter((order) => !ids.includes(order._id.toString()));
            processedCart.order_content = notSelectedContent;
            processedCart.total_breakdown.order_total -= total;
            processedCart.total_breakdown.total -= total;
            processedCart.totalQty_breakdown.order_qty -= total_qty;
            processedCart.totalQty_breakdown.total_qty -= total_qty;
          }
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
    
          const result = await this.checkoutOrder({ user: user, preparedOrder: newOrder, if_delivery: if_delivery }, res);

          if(result) {
            const notSelectedContent = processedCart.order_content.filter((pr) => !ids.includes(pr._id.toString()));
            processedCart.pre_orders = notSelectedContent;
            processedCart.total_breakdown.preOrders_total -= total;
            processedCart.total_breakdown.total -= total;
            processedCart.totalQty_breakdown.preOrders_qty -= total_qty;
            processedCart.totalQty_breakdown.total_qty -= total_qty;
          }
        });
      }
    }
    if(data) {
      await processedCart.save();
    }
    return data;
  }

  async finalizeCheckout(order) {
    // still need some testing, to properly handle payment service responses
    try {
      const { transaction } = order;
      const newDataFromService = await payment_service.finalizePayment(transaction);

      if(!newDataFromService.data) {
        return newDataFromService;
      }

      return await Connection.transaction(async () => {
        transaction.status = Transaction_Status.successful;
        transaction.data_from_payment_service = newDataFromService.msg;
        const { order_content, pre_orders } = order;
        let foods = [];
        if(order_content.length === 1) {
          const { food } = order_content[0];
          if(foods.length === 0) {
            food.qty -= order_content[0].qty;
            food.sold_out = food.qty === 0;
            foods.push(food);
          } else {
            let isNew = false;
            foods.map((mapFood) => {
              if(food._id === mapFood._id) {
                mapFood -= order_content[0].qty;
                mapFood.sold_out = mapFood.qty === 0;
              } else {
                isNew = true;
              }
              return mapFood;
            });

            if(isNew) {
              food.qty -= order_content[0].qty;
              food.sold_out = food.qty === 0;
              foods.push(food);
            }
          }
        }
        if(order_content.length > 1) {
          order_content.forEach((item) => {
            const { food } = item;
            if(foods.length === 0) {
              food.qty -= item.qty;
              food.sold_out = food.qty === 0;
              foods.push(food);
            } else {
              let isNew = false;
              foods.map((mapFood) => {
                if(food._id === mapFood._id) {
                  mapFood -= item.qty;
                  mapFood.sold_out = mapFood.qty === 0;
                } else {
                  isNew = true;
                }
                return mapFood;
              });
  
              if(isNew) {
                food.qty -= item.qty;
                food.sold_out = food.qty === 0;
                foods.push(food);
              }
            }
          });
        }
        if(pre_orders) {
          if(pre_orders.length === 1) {
            const { order_content } = pre_orders[0];
          
            if(order_content.length === 1) {
              const { food } = order_content[0];
              if(foods.length === 0) {
                const schedule = food.schedules.id(order_content[0].food_schedule);
                schedule.available_qty -= order_content[0].qty;
                schedule.sold_out = schedule.available_qty === 0;
                schedule.orders.push({
                  order: order._id,
                  pre_order: pre_orders[0]._id,
                  qty: order_content[0].qty
                });
            
                food.schedules = food.schedules.map((foodSchedule) => {
                  if(foodSchedule._id === schedule._id) {
                    foodSchedule = schedule;
                  }
                  return foodSchedule;
                });
                foods.push(food);
              } else {
                let isNew = false;
                foods.map((mapFood) => {
                  if(food._id === mapFood._id) {
                    const schedule = mapFood.schedules.id(order_content[0].food_schedule);
                    schedule.available_qty -= order_content[0].qty;
                    schedule.sold_out = schedule.available_qty === 0;
                    schedule.orders.push({
                      order: order._id,
                      pre_order: pre_orders[0]._id,
                      qty: order_content[0].qty
                    });

                    mapFood.schedules = food.schedules.map((foodSchedule) => {
                      if(foodSchedule._id === schedule._id) {
                        foodSchedule = schedule;
                      }
                      return foodSchedule;
                    });
                  } else {
                    isNew = true;
                  }
                  return mapFood;
                });
              
                if(isNew) {
                  const schedule = food.schedules.id(order_content[0].food_schedule);
                  schedule.available_qty -= order_content[0].qty;
                  schedule.sold_out = schedule.available_qty === 0;
                  schedule.orders.push({
                    order: order._id,
                    pre_order: pre_orders[0]._id,
                    qty: order_content[0].qty
                  });

                  food.schedules = food.schedules.map((foodSchedule) => {
                    if(foodSchedule._id === schedule._id) {
                      foodSchedule = schedule;
                    }
                    return foodSchedule;
                  });
                  foods.push(food);
                }
              }
            }
            if(order_content.length > 1) {
              order_content.map((ordered_item) => {
                const { food } = ordered_item;
                if(foods.length === 0) {
                  const schedule = food.schedules.id(ordered_item.food_schedule);
                  schedule.available_qty -= ordered_item.qty;
                  schedule.sold_out = schedule.available_qty === 0;
                  schedule.orders.push({
                    order: order._id,
                    pre_order: pre_orders[0]._id,
                    qty: ordered_item.qty
                  });
              
                  food.schedules = food.schedules.map((foodSchedule) => {
                    if(foodSchedule._id === schedule._id) {
                      foodSchedule = schedule;
                    }
                    return foodSchedule;
                  });
                  foods.push(food);
                } else {
                  let isNew = false;
                  foods.map((mapFood) => {
                    
                    if(food._id === mapFood._id) {
                      const schedule = mapFood.schedules.id(ordered_item.food_schedule);
                      schedule.available_qty -= ordered_item.qty;
                      schedule.sold_out = schedule.available_qty === 0;
                      schedule.orders.push({
                        order: order._id,
                        pre_order: pre_orders[0]._id,
                        qty: ordered_item.qty
                      });

                      mapFood.schedules = food.schedules.map((foodSchedule) => {
                        if(foodSchedule._id === schedule._id) {
                          foodSchedule = schedule;
                        }
                        return foodSchedule;
                      });
                    } else {
                      isNew = true;
                    }
                    return mapFood;
                  });
                
                  if(isNew) {
                    const schedule = food.schedules.id(ordered_item.food_schedule);
                    schedule.available_qty -= ordered_item.qty;
                    schedule.sold_out = schedule.available_qty === 0;
                    schedule.orders.push({
                      order: order._id,
                      pre_order: pre_orders[0]._id,
                      qty: ordered_item.qty
                    });

                    food.schedules = food.schedules.map((foodSchedule) => {
                      if(foodSchedule._id === schedule._id) {
                        foodSchedule = schedule;
                      }
                      return foodSchedule;
                    });
                    foods.push(food);
                  }
                }
                
              });
            }
          }
        
          if(pre_orders.length > 1) {
            pre_orders.map((pre_order) => {
              const { order_content } = pre_order;
            
              if(order_content.length === 1) {
                const { food } = order_content[0];
                if(foods.length === 0) {
                  const schedule = food.schedules.id(order_content[0].food_schedule);
                  schedule.available_qty -= order_content[0].qty;
                  schedule.sold_out = schedule.available_qty === 0;
                  schedule.orders.push({
                    order: order._id,
                    pre_order: pre_order._id,
                    qty: order_content[0].qty
                  });
              
                  food.schedules = food.schedules.map((foodSchedule) => {
                    if(foodSchedule._id === schedule._id) {
                      foodSchedule = schedule;
                    }
                    return foodSchedule;
                  });
                  foods.push(food);
                } else {
                  let isNew = false;
                  foods.map((mapFood) => {
                    if(food._id === mapFood._id) {
                      const schedule = mapFood.schedules.id(order_content[0].food_schedule);
                      schedule.available_qty -= order_content[0].qty;
                      schedule.sold_out = schedule.available_qty === 0;
                      schedule.orders.push({
                        order: order._id,
                        pre_order: pre_order._id,
                        qty: order_content[0].qty
                      });
  
                      mapFood.schedules = food.schedules.map((foodSchedule) => {
                        if(foodSchedule._id === schedule._id) {
                          foodSchedule = schedule;
                        }
                        return foodSchedule;
                      });
                    } else {
                      isNew = true;
                    }
                    return mapFood;
                  });
                
                  if(isNew) {
                    const schedule = food.schedules.id(order_content[0].food_schedule);
                    schedule.available_qty -= order_content[0].qty;
                    schedule.sold_out = schedule.available_qty === 0;
                    schedule.orders.push({
                      order: order._id,
                      pre_order: pre_order._id,
                      qty: order_content[0].qty
                    });
  
                    food.schedules = food.schedules.map((foodSchedule) => {
                      if(foodSchedule._id === schedule._id) {
                        foodSchedule = schedule;
                      }
                      return foodSchedule;
                    });
                    foods.push(food);
                  }
                }
              }
            
              if(order_content.length > 1) {
                order_content.map(async (ordered_item) => {
                  const { food } = ordered_item;
                  if(foods.length === 0) {
                    const schedule = food.schedules.id(ordered_item.food_schedule);
                    schedule.available_qty -= ordered_item.qty;
                    schedule.sold_out = schedule.available_qty === 0;
                    schedule.orders.push({
                      order: order._id,
                      pre_order: pre_order._id,
                      qty: ordered_item.qty
                    });
                
                    food.schedules = food.schedules.map((foodSchedule) => {
                      if(foodSchedule._id === schedule._id) {
                        foodSchedule = schedule;
                      }
                      return foodSchedule;
                    });
                    foods.push(food);
                  } else {
                    let isNew = false;
                    foods.map((mapFood) => {
                      if(food._id === mapFood._id) {
                        const schedule = mapFood.schedules.id(ordered_item.food_schedule);
                        schedule.available_qty -= ordered_item.qty;
                        schedule.sold_out = schedule.available_qty === 0;
                        schedule.orders.push({
                          order: order._id,
                          pre_order: pre_order._id,
                          qty: ordered_item.qty
                        });
    
                        mapFood.schedules = food.schedules.map((foodSchedule) => {
                          if(foodSchedule._id === schedule._id) {
                            foodSchedule = schedule;
                          }
                          return foodSchedule;
                        });
                      } else {
                        isNew = true;
                      }
                      return mapFood;
                    });
                  
                    if(isNew) {
                      const schedule = food.schedules.id(ordered_item.food_schedule);
                      schedule.available_qty -= ordered_item.qty;
                      schedule.sold_out = schedule.available_qty === 0;
                      schedule.orders.push({
                        order: order._id,
                        pre_order: pre_order._id,
                        qty: ordered_item.qty
                      });
    
                      food.schedules = food.schedules.map((foodSchedule) => {
                        if(foodSchedule._id === schedule._id) {
                          foodSchedule = schedule;
                        }
                        return foodSchedule;
                      });
                      foods.push(food);
                    }
                  }
                });
              }
            });
          }
        }

        order.status = Order_Status.ready;
        if(foods.length === 1) {
          await Promise.all([foods[0].save(), transaction.save(), order.save()]);
        }
        if(foods.length > 1) {
          const foodPromises = foods.map((food) => food.save());
          await Promise.all([...foodPromises, transaction.save(), order.save()]);
        }

        return {
          data: {
            order_id: order._id,
            msg: "Checkout successful",
          }
        };
      });
    } catch (error) {
      throw error;
    }
  }
  
}

const checkout_service = new CheckoutService();

module.exports = { checkout_service };
