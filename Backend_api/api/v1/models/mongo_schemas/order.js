const { Schema, Embedded } = require('mongoose');
const { Collections, Order_Status, Order_type, Pre_order_Status } = require('../../enum_ish');


const scheduledSchema = new Schema({
  ready_time: {
    type: Date,
    required: true,
  },
}, { timestamps: true });

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
  paid_price: {
    type: Number,
    default: null,
  },
  scheduled_for: {
    type: scheduledSchema,
    default: null,
  }
}, { timestamps: true });

orderItemSchema.pre('save', function(next) {
  if (this.qty < 1) {
    return next(new Error('you cant order zero item'));
  }
  next();
});

const pre_orderSchema = new Schema({
  order_content: {
    type: [orderItemSchema],
    required: true,
  },
  total_qty: {
    type: Number,
  },
  status: {
    type: String,
    enum: Object.values(Pre_order_Status),
    default: Pre_order_Status.created,
  },
  order_total: {
    type: Number,
    default: 0,
  },
  shipping_fee: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    default: 0,
  },
  type: {
    type: String,
    enum: Object.values(Order_type),
    default: Order_type.delivery,
  },
  shipment: {
    type: Schema.Types.ObjectId,
    ref: Collections.Shipment,
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
  order_total: {
    type: Number,
    default: 0,
  },
  order_shipping_fee: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    default: 0,
  },
  total_qty: {
    type: Number,
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
    default: Order_type.delivery,
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
  if ((this.order_content.length < 1) && (this.pre_orders.length < 1)) {
    return next(new Error('you cant order zero items'));
  }
  next();
});

module.exports = { orderSchema, pre_orderSchema, scheduledSchema, orderItemSchema };
