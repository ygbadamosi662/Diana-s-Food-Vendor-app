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
    default: null
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

transactionSchema.pre('save', function(next) {
  if ((![Transaction_Status.initiated, Transaction_Status.cancelled].includes(this.status)) && (!this.debit_account)) {
    return next(new Error('Error Debit account is required for a suuccessful transaction'));
  }
  next();
});

module.exports = { transactionSchema, bankAccSchema };
