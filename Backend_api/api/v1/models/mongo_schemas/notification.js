const { Schema } = require('mongoose');
const { Note_Status, Collections } = require('../../enum_ish');

const subjectSchema = new Schema({
  subject_id: {
    type: String,
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
  to: {
    type: Schema.Types.ObjectId,
    ref: Collections.User,
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


module.exports = { notificationSchema, subjectSchema };
