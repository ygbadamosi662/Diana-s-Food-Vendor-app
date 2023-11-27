const { Schema } = require('mongoose');
const { Collections, Where } = require('../../enum_ish');


const addressSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: Collections.User,
    required: true,
  },
  where: {
    type: String,
    enum: Object.values(Where),
    default: Where.home,
  },
  addy: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  country: {
    type: String,
    required: true,
  },
  zipcode: {
    type: Number,
    required: true,
  }
}, { timestamps: true });

module.exports = { addressSchema };
