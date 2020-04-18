const mongoose = require('mongoose');

const { Schema } = mongoose;

const logMessageSchema = new Schema({
  userid: Number,
  event: String,
  text: String,
  object: Schema.Types.Mixed,
  date: {type: Date, default: Date.now, expires: '7 days'},
});

const LogMessage = mongoose.model('LogMessage', logMessageSchema);

module.exports = LogMessage;
