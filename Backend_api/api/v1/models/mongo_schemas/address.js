const { Schema } = require('mongoose');
const { Collections, Where, States, Country, Countries } = require('../../enum_ish');


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
  street_addy: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    enum: Object.values(States),
    default: States.lagos,
  },
  country: {
    type: String,
    enum: Object.values(Country),
    default: Country.nigeria,
  },
  zip_code: {
    type: String,
    required: true,
  },
  local_description: {
    type: String,
  }
}, { timestamps: true });

module.exports = { addressSchema };
