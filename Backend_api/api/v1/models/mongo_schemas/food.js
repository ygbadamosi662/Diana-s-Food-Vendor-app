const { Schema, Types } = require('mongoose');
const { Type, Schedule_type, Time_share, Collections } = require('../../enum_ish');


const scheduleOrderSchema = new Schema({
  order: {
    type: Schema.Types.ObjectId,
    ref: Collections.Order,
    required: true,
  },
  pre_order: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  qty: {
    type: Number,
    required: true,
  },
}, { timestamps: true });

const scheduleSchema = new Schema({
  for_when: {
    type: Date,
    required: true,
  },
  expiry_time: {
    type: Date,
    required: true,
  },
  sold_out: {
    type: Boolean,
    default: false,
  },
  orders: {
    type: [scheduleOrderSchema],
    default: [],
  },
  disputed_orders: {
    type: [scheduleOrderSchema],
    default: [],
  },
  available_qty: {
    type: Number,
    required: true,
  },
  total_qty: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    enum: Object.values(Schedule_type),
    default: Schedule_type.one_off,
  },
  hashtag: {
    type: String,
    default: null,
  }
}, { timestamps: true });

scheduleSchema.pre('save', function(next) {
  // to check if sold_out
  if(this.available_qty === 0) {
    this.sold_out = true;
  }
  next();
});

const foodSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  description: String,
  fave_count: { 
    type: Number,
    default: 0,
  },
  types: {
    type: [String],
    enum: Object.values(Type),
    default: [Type.food],
  },
  price: {
    type: Number,
    required: true,
  },
  qty: {
    type: Number,
    default: 0,
  },
  sold_out: {
    type: Boolean,
    default: false,
  },
  schedules: {
    type: [scheduleSchema],
    default: [],
  }
}, { timestamps: true });

foodSchema.pre('save', function(next) {
  // to check valid types in the doc
  if(this.types) {
    const invalid_type = this.types.find((type) => {
      return Object.values(Type).includes(type) === false;
    })
    if(invalid_type) {
      return next(new Error(`Invalid food type: ${invalid_type}`));
    }
  }

  // to check if sold_out
  if(this.qty === 0) {
    this.sold_out = true;
  }
  
  next();
});

module.exports = { foodSchema, scheduleSchema, scheduleOrderSchema, Types };
