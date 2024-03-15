/**
 * Contains the FoodScheduleService class
 * handles all food schedule operations
 * @author Yusuf Gbadamosi <https://github.com/ygbadamosi662>
 */
const { Order, Food } = require('../models/engine/db_storage');
const { Time_share, Schedule_type } = require('../enum_ish');
const { Types } = require('mongoose');



class CartService {

  async revamp_cart(cart=null, update=false) {
    try {
      if(!cart) { return cart; }
      const { 
        pre_orders, 
        order_content: order_items, 
      } = cart;
      
      let normal_order_items = [];
      let preOrders = [];
      let orderTotal = 0;
      let orderQty = 0;
      let preOrders_qty = 0;
      let preOrders_total = 0;
      let scheduledExpired_orders = [];
      let cartPreOrders = [];
      let cartNormOrder = [];
      
    
      if(order_items.length === 1) {
        const food = await Food.findById(order_items[0].food).select('qty name price');
      
        // managing order_qty and order_total
        orderQty = order_items[0].qty > food.qty ? food.qty : order_items[0].qty;
        
        orderTotal = orderQty * food.price;
      
        normal_order_items.push({
          id: order_items[0]._id,
          food_name: food.name * order_items[0].qty,
          price: food.price,
          qty: {
            ordered: order_items[0].qty,
            currently_available: order_items[0].qty > food.qty ? food.qty : false
          }
        });
        order_items[0].qty = orderQty;
        order_items[0].price = order_items[0].qty * food.price
        cartNormOrder = order_items;
      }
      if(order_items.length > 1) {
        const content = order_items.map(async (ordered_item) => {
          const food = await Food.findById(ordered_item.food).select('qty name price');
          // managing order_qty and order_total
          const updatedQty = ordered_item.qty > food.qty ? food.qty : ordered_item.qty;
          orderQty += updatedQty;
          orderTotal += (updatedQty * food.price);
          ordered_item.qty = updatedQty;
        
          
          normal_order_items.push({
            id: ordered_item._id,
            food_name: food.name,
            price: food.price * ordered_item.qty,
            qty: {
              ordered: ordered_item.qty,
              currently_available: ordered_item > food.qty ? food.qty : false
            }
          });
        
          ordered_item.qty = updatedQty;
          ordered_item.price = ordered_item.qty * food.price;
          return ordered_item;
        });
        cartNormOrder = await Promise.all(content);
      }
      if(pre_orders) {
        if(pre_orders.length === 1) {
          const { order_content } = pre_orders[0];
          let preOrder_qty = 0;
          let preOrder_total = 0;
        
          if(order_content.length === 1) {
            const food = await Food.findById(order_content[0].food).select('qty name price schedules');
            const schedule = food.schedules.id(order_content[0].food_schedule);
            if(schedule.expiry_time.getTime() < Date.now()) {
              scheduledExpired_orders.push(order_content[0]);
              pre_orders[0].order_content.id(order_content[0]._id).deleteOne();
            } else {
              preOrder_qty = order_content[0].qty > schedule.available_qty ? schedule.available_qty: order_content[0].qty;
              preOrder_total = preOrder_qty * food.price;
              pre_orders[0].total_qty = preOrder_qty;
              pre_orders[0].total = preOrder_total;
              
              preOrders.push({
                id: pre_orders[0]._id,
                order_content: [{
                  id: order_content[0]._id,
                  food_name: food.name,
                  price: preOrder_total,
                  qty: {
                    ordered: order_content[0].qty,
                    currently_available: order_content[0].qty > schedule.available_qty ? schedule.available_qty : false
                  }
                }],
                total: preOrder_total,
                total_qty: preOrder_qty
              });
            
              order_content[0].qty = preOrder_qty;
              
              order_content[0].price = preOrder_total;
              pre_orders[0].order_content = order_content;
              cartPreOrders = pre_orders;
            
              // managing preOrders_qty and preOrders_total
              preOrders_qty += preOrder_qty;
              preOrders_total += preOrder_total;
            }
          }
          if(order_content.length > 1) {
            let revampedItems = [];
            let preOrder_order_items = order_content.map(async (ordered_item) => {
              const food = await Food.findById(ordered_item.food).select('qty name price schedules');
              const schedule = food.schedules.id(ordered_item.food_schedule);
              if(schedule.expiry_time.getTime() < Date.now()) {
                scheduledExpired_orders.push(ordered_item);
                pre_orders[0].order_content.id(ordered_item._id).deleteOne();
              } else {
                const updatedQty = ordered_item.qty > schedule.available_qty ? schedule.available_qty : ordered_item.qty;
                preOrder_qty += updatedQty;
                preOrder_total += (updatedQty * food.price);
              
                revampedItems.push({
                  id: ordered_item._id,
                  food_name: food.name,
                  price: food.price * updatedQty,
                  qty: {
                    ordered: updatedQty,
                    currently_available: ordered_item.qty > schedule.available_qty ? schedule.available_qty : false
                  }
                });
                ordered_item.qty = updatedQty;
                ordered_item.price = ordered_item.qty * food.price;
              }
              
              return ordered_item;
            });
          
            preOrder_order_items = await Promise.all(preOrder_order_items);
          
            pre_orders[0].total_qty = preOrder_qty;
            pre_orders[0].total = preOrder_total;
            pre_orders[0].order_content = preOrder_order_items;
          
            preOrders.push({
              id: pre_orders[0]._id,
              order_content: revampedItems,
              total: preOrder_total,
              total_qty: preOrder_qty
            });
          
            cartPreOrders = pre_orders;
          
            // managing preOrders_qty and preOrders_total
            preOrders_qty += preOrder_qty;
            preOrders_total += preOrder_total;
          }
        }
      
        if(pre_orders.length > 1) {
          let prs = pre_orders.map(async (pre_order) => {
            const { order_content } = pre_order;
            let preOrder_qty = 0;
            let preOrder_total = 0;
          
            if(order_content.length === 1) {
              const food = await Food.findById(order_content[0].food).select('qty name price schedules');
              const schedule = food.schedules.id(ordered_item.food_schedule);
              if(schedule.expiry_time.getTime() < Date.now()) {
                scheduledExpired_orders.push(order_content[0]);
                pre_order.order_content.id(order_content[0]._id).deleteOne();
              } else {
                preOrder_qty = order_content[0].qty > schedule.available_qty ? schedule.available_qty : order_content[0].qty;
                preOrder_total = preOrder_qty * food.price;
                
              
                pre_order.total_qty = preOrder_qty;
                pre_order.total = preOrder_total;
              
                preOrders.push({
                  id: pre_order._id,
                  order_content: [{
                    id: order_content[0]._id,
                    food_name: food.name,
                    price: preOrder_total,
                    qty: {
                      ordered: order_content[0].qty,
                      currently_available: order_content[0].qty > schedule.available_qty ? schedule.available_qty : false
                    }
                  }],
                  total: preOrder_total,
                  total_qty: preOrder_qty
                });
              
                order_content[0].qty = preOrder_qty;
                order_content[0].price = order_content[0].qty * food.price
              
                pre_order.order_content = order_content;
              
                // managing preOrders_qty and preOrders_total
                preOrders_qty += preOrder_qty;
                preOrders_total += preOrder_total;
              }
              
            }
          
            if(order_content.length > 1) {
              let revampedItems = [];
              let preOrder_order_items = order_content.map(async (ordered_item) => {
                const food = await Food.findById(ordered_item.food).select('qty name price schedules');
                const schedule = food.schedules.id(ordered_item.food_schedule);
                if(schedule.expiry_time.getTime() < Date.now()) {
                  scheduledExpired_orders.push(ordered_item);
                  pre_orders[0].order_content.id(ordered_item._id).deleteOne();
                } else {
                  const updatedQty = ordered_item.qty > schedule.available_qty ? schedule.available_qty : ordered_item.qty;
                  preOrder_qty += updatedQty;
                  preOrder_total += (preOrder_qty * food.price);
                
                  revampedItems.push({
                    id: ordered_item._id,
                    food_name: food.name,
                    qty: {
                      ordered: updatedQty,
                      currently_available: ordered_item.qty > schedule.available_qty ? schedule.available_qty : false
                    }
                  });
                  
                  ordered_item.qty = updatedQty;
                  order_content[0].price = order_content[0].qty * food.price;
                }
                return ordered_item;
              });
            
              preOrder_order_items = await Promise.all(preOrder_order_items);
              pre_order.order_content = preOrder_order_items;
              pre_order.total_qty = preOrder_qty;
              pre_order.total = preOrder_total;
            
              preOrders.push({
                id: pre_order._id,
                order_content: revampedItems,
                total: preOrder_total,
                total_qty: preOrder_qty
              });
            
              // managing preOrders_qty and preOrders_total
              preOrders_qty += preOrder_qty;
              preOrders_total += preOrder_total;
            }
          
            return pre_order
          });
        
          prs = await Promise.all(prs);
          cartPreOrders = prs;
        }
      }
    
      cart.total_breakdown = {
        preOrders_total,
        total: preOrders_total + orderTotal,
        order_total: orderTotal
      };
      cart.totalQty_breakdown = {
        preOrders_qty,
        total_qty: preOrders_qty + orderQty,
        order_qty: orderQty
      };
    
      cart.pre_orders = cartPreOrders;
      cart.order_content = cartNormOrder;
    
      cart = await cart.save();
    
      if(update) {
        return cart;
      }
    
      return {
        ordered_items: normal_order_items,
        preOrders,
        total_breakdown: cart.total_breakdown,
        totalQty_breakdown: cart.totalQty_breakdown,
        expired_orders: scheduledExpired_orders
      };
    } catch (error) {
      
    }
  }
}

const cart_service = new CartService();

module.exports = { cart_service };
