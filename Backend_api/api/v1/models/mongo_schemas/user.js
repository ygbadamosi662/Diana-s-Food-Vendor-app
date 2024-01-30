const validator = require('validator');
const { Schema } = require('mongoose');
const { Role, Gender, Collections, userStatus, Note_Status } = require('../../enum_ish');

const subjectSchema = new Schema({
  subject: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  doc_type: {
    type: String,
    enum: Object.values(Collections),
    required: true,
  },
});

const notificationSchema = new Schema({
  comment: {
    type: String,
    required: true,
  },
  subject: {
    type: subjectSchema,
    required: true,
  },
  status: {
    type: String,
    enum: Object.values(Note_Status),
    default: Note_Status.sent,
  },
}, { timestamps: true });

const userSchema = new Schema({
  name: {
    type: {
      fname: { type: String, required: true, min: 3, max: 20 },
      lname: { type: String, required: true, min: 3, max: 20 },
      aka: { type: String, min: 3, max: 20},
    },
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    validate: {
        validator: (value) => {
          return validator.isEmail(value);
        },
        message: 'Invalid email address',
    },
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    validate: {
       validator: (value) => {
        return validator.matches(value, /^[8792][01]\d{8}$/)
       },
       message: 'Invalid phone number',
    },
  },
  faves: {
    type: [Schema.Types.ObjectId],
    ref: Collections.Food,
    default: [],
  },
  dob: {
    type: Date,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: Object.values(Role),
    default: Role.user,
  },
  gender: {
    type: String,
    enum: Object.values(Gender),
    required: true,
  },
  status: {
    type: String,
    enum: Object.values(userStatus),
    required: true,
  },
  notifications: {
    type: [notificationSchema],
    default: [],
  },
  resetPassword: { 
    type: {
      passwordToken: { type: String, required: true},
      passwordTokenExpires: { type: Date, required: true },
    },
    default: null,
  },
}, { timestamps: true });

module.exports = { userSchema };
