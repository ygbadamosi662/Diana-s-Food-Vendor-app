const { Schema } = require('mongoose');
const { Collections, Shipemnt_status } = require('../../enum_ish');


const shipmentSchema = new Schema({
  order: {
    type: Schema.Types.ObjectId,
    ref: Collections.Order,
    required: true,
  },
  pre_order_id: {
    type: String,
    default: null,
  },
  to: {
    type: Schema.Types.ObjectId,
    ref: Collections.Address,
    required: true,
  },
  status: {
    type: String,
    enum: Object.values(Shipemnt_status),
    default: Shipemnt_status.pending,
  },
  fee: {
    type: Number,
    required: true,
  }
  
}, { timestamps: true });

module.exports = { shipmentSchema };
