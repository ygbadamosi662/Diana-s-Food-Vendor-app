const { Schema } = require('mongoose');
const { Type, Schedule_type } = require('../../enum_ish');


const scheduleSchema = new Schema({
  for: {
    type: Date,
    required: true,
  },
  expiry_time: {
    type: Date,
    required: true,
  },
  type: {
    type: String,
    enum: Object.values(Schedule_type),
    default: Schedule_type.one_off,
  }
}, { timestamps: true });

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
  type: {
    type: String,
    enum: Object.values(Type),
    default: Type.food,
  },
  price: {
    type: Number,
    required: true,
  },
  qty: {
    type: Number,
    default: 0,
  },
  schedules: {
    type: [scheduleSchema],
    default: [],
  }
}, { timestamps: true });

module.exports = { foodSchema, scheduleSchema };
