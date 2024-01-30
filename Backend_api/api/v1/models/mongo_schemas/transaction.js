const { Schema } = require('mongoose');
const { Collections, Transaction_Status, Transaction_type } = require('../../enum_ish');

const bankAccSchema = new Schema({
  bank_name: {
    type: String,
    required: true,
  },
  account_name: {
    type: String,
    required: true,
  },
  account_number: {
    type: String,
    required: true,
  },
})

const transactionSchema = new Schema({
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
  pre_order: {
    type: Schema.Types.ObjectId,
    default: null,
  },
  amount: {
    type: Number,
    required: true,
  },
  credit_account: {
    type: bankAccSchema,
    required: true,
  },
  debit_account: {
    type: bankAccSchema,
    required: true,
  },
  data_from_payment_service: {
    type: Schema.Types.Mixed,
    required: true,
  },
  status: {
    type: String,
    enum: Object.values(Transaction_Status),
    default: Transaction_Status.waiting_on_confirmation,
  },
  // type in the users context.
  type: {
    type: String,
    enum: Object.values(Transaction_type),
    required: true,
  },
}, { timestamps: true });

module.exports = { transactionSchema, bankAccSchema };
