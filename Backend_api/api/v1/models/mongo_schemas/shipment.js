const { Schema } = require('mongoose');
const { Collections, Shipemnt_status } = require('../../enum_ish');


const shipmentSchema = new Schema({
  order: {
    type: Schema.Types.ObjectId,
    ref: Collections.Order,
    required: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: Collections.User,
    required: true,
  },
  pre_order: {
    type: Schema.Types.ObjectId,
    default: null,
  },
  address: {
    type: Schema.Types.ObjectId,
    ref: Collections.Address,
    required: true,
  },
  status: {
    type: String,
    enum: Object.values(Shipemnt_status),
    default: Shipemnt_status.pending,
  },
  estimated_delivery_time: {
    type: Date,
    required: true,
  },
  delivery_time: {
    type: Date,
  },
  fee: {
    type: Number,
    required: true,
  }
  
}, { timestamps: true });

module.exports = { shipmentSchema };
