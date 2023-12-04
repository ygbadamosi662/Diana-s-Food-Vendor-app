const { Schema, Types } = require('mongoose');
const { Type, Schedule_type, Time_share, Collections } = require('../../enum_ish');


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
  for_when: {
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
  },
  hashtag: {
    type: String,
    default: null,
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
  
  next();
});

/**
 * Calculates the expiry time for a given schedule.
 *
 * @param {object} schedule - The schedule object.
 * @param {string|null} prefix - The prefix value.
 * @param {string} expiry_prefix - The expiry prefix value. Defaults to "1 hour".
 * @return {Date || null} The expiry time or null.
 */
const get_schedule_expiry = (schedule, time_share=Time_share.hour, times=1) => {
  try {
    if((!schedule.type) || (!schedule.for_when)) {
      return null;
    }
    // if daily
    if(schedule.type === Schedule_type.daily) {
      return new Date(schedule.for_when.getTime() - (4 * Time_share.hour));
    }
    // one off
    if(schedule.type === Schedule_type.one_off) {
      return new Date(schedule.for_when.getTime() - (times * Time_share[time_share]));
    }
    // if weekly
    if((schedule.type === Schedule_type.weekly) || (schedule.type === Schedule_type.monthly)) {
      return new Date(schedule.for_when.getTime() - (Time_share.day));
    }
    return null;
  } catch (error) {
    throw error;
  }
}

module.exports = { foodSchema, scheduleSchema, get_schedule_expiry, sheduleOrderSchema, Types };
