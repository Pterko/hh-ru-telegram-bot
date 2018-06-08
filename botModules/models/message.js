const mongoose = require('mongoose');

const { Schema } = mongoose;

const messageSchema = new Schema({
  userid: Number,
  text: String,
  object: Schema.Types.Mixed,
  date: Date,
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
