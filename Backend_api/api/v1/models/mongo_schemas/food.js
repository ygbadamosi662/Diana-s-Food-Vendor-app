const { Schema } = require('mongoose');
const { Type, Schedule_type, Schedule_expiry_prefix, Collections } = require('../../enum_ish');


const sheduleOrderSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: Collections.User,
    required: true,
  },
  order: {
    type: Schema.Types.ObjectId,
    ref: Collections.Order,
    required: true,
  },
  pre_order_id: {
    type: String,
    required: true,
  },
  qty: {
    type: Number,
    required: true,
  },
}, { timestamps: true });

const scheduleSchema = new Schema({
  for: {
    type: Date,
    required: true,
  },
  expiry_time: {
    type: Date,
    required: true,
  },
  orders: {
    type: [sheduleOrderSchema],
    default: [],
  },
  dispute_orders: {
    type: [sheduleOrderSchema],
    default: [],
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

/**
 * Calculates the expiry time for a given schedule.
 *
 * @param {object} schedule - The schedule object.
 * @param {string|null} prefix - The prefix value.
 * @param {string} expiry_prefix - The expiry prefix value. Defaults to "1 hour".
 * @return {number} The expiry time in milliseconds.
 */
const get_schedule_expiry = (schedule, prefix=null, expiry_prefix=Schedule_expiry_prefix.hour) => {
  // if daily
  if(schedule.type === Schedule_type.daily) {
    return schedule.for.getTime() - (4 * Schedule_expiry_prefix.hour);
  }
  // one off
  if(schedule.type === Schedule_type.one_off) {
    if(prefix) {
      return schedule.for.getTime() - (prefix * Schedule_expiry_prefix[expiry_prefix]);
    }
    return schedule.for.getTime() - (Schedule_expiry_prefix.hour);
  }
  // if weekly
  if((schedule.type === Schedule_type.weekly) || (schedule.type === Schedule_type.monthly)) {
    return schedule.for.getTime() - (Schedule_expiry_prefix.day);
  }
}

module.exports = { foodSchema, scheduleSchema, get_schedule_expiry, sheduleOrderSchema };
