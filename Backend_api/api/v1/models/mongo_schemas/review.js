const { Schema } = require('mongoose');
const { Collections } = require('../../enum_ish')

const reviewSchema = new Schema({
  comment: {
    type: String,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: Collections.User,
    required: true,
  },
  food: {
    type: Schema.Types.ObjectId,
    ref: Collections.Food,
    required: true,
  },
  stars: {
    type: Number,
    default: 0,
  }
}, { timestamps: true });

reviewSchema.pre('validate', function (next) {
  if (this.stars > 5) {
    return next(new Error('stars cannot be > 5'));
  }
  next();
});

module.exports = { reviewSchema };
