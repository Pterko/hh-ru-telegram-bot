const mongoose = require('mongoose');

const { Schema } = mongoose;

const logMessageSchema = new Schema({
  userid: { type: Number, index: true },
  action: { type: String, index: true },
  text: String,
  object: Schema.Types.Mixed,
  date: { type: Date, default: Date.now, expires: '7 days', index: true },
});

const LogMessage = mongoose.model('LogMessage', logMessageSchema);

module.exports = LogMessage;
