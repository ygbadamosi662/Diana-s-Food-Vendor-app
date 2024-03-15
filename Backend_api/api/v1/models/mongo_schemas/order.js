const { Schema, Embedded } = require('mongoose');
const { Collections, Order_Status, Order_type, Pre_order_Status, payFor } = require('../../enum_ish');


const orderItemSchema = new Schema({
  food: {
    type: Schema.Types.ObjectId,
    ref: Collections.Food,
    required: true,
  },
  qty: {
    type: Number,
    required: true,
  },
  price: {
    type: Number,
    default: null,
  },
  food_schedule: {
    type: Schema.Types.ObjectId,
    default: null,
  }
}, { timestamps: true });

orderItemSchema.pre('save', function(next) {
  if (this.qty < 1) {
    return next(new Error('you cant order zero item'));
  }
  if (this.price < 0) {
    return next(new Error('Price cannot be less than zero'));
  }
  next();
});

const TotalBreakdownSchema = new Schema({
  order_total: {
    type: Number,
    default: 0,
  },
  preOrders_total: {
    type: Number,
    default: 0,
  },
  shipping_fee: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    required: true,
  },
}, { timestamps: false });

TotalBreakdownSchema.pre('save', function(next) {
  if ((this.total < 0) || (this.order_total < 0) || (this.preOrders_total < 0) || (this.shipping_fee < 0)) {
    return next(new Error('Amount cannot be less than zero'));
  }
  next();
});

const TotalQtyBreakdownSchema = new Schema({
  order_qty: {
    type: Number,
    default: 0,
  },
  preOrders_qty: {
    type: Number,
    default: 0,
  },
  total_qty: {
    type: Number,
    required: true,
  },
}, { timestamps: false });

const pre_orderSchema = new Schema({
  order_content: {
    type: [orderItemSchema],
    required: true,
  },
  total_qty: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: Object.values(Pre_order_Status),
    default: Pre_order_Status.created,
  },
  total: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    enum: Object.values(Order_type),
    default: null,
  },
  ready_time: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

const orderSchema = new Schema({ 
  user: {
    type: Schema.Types.ObjectId,
    ref: Collections.User,
    required: true,
  },
  order_content: {
    type: [orderItemSchema],
    default: [],
  },
  pre_orders: {
    type: [pre_orderSchema],
    default: [],
  },
  order_shipping_fee: {
    type: Number,
    default: null,
  },
  total_breakdown: {
    type: TotalBreakdownSchema,
    required: true,
  },
  totalQty_breakdown: {
    type: TotalQtyBreakdownSchema,
    required: true,
  },
  transaction: {
    type: Schema.Types.ObjectId,
    ref: Collections.Transaction,
    default: null,
  },
  status: {
    type: String,
    enum: Object.values(Order_Status),
    default: Order_Status.in_cart,
  },
  type: {
    type: String,
    enum: Object.values(Order_type),
    default: null,
  },
  shipment: {
    type: Schema.Types.ObjectId,
    ref: Collections.Shipment,
    default: null,
  },
  pickup_time: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

orderSchema.pre('save', function(next) {
  if ((this.order_content.length === 0) && (this.pre_orders.length === 0)) {
    return next(new Error('you cant order zero items'));
  }
  next();
});

module.exports = { orderSchema, pre_orderSchema, orderItemSchema };
