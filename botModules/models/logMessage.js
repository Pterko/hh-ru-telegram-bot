const mongoose = require('mongoose');

const { Schema } = mongoose;

const logMessageSchema = new Schema({
  userid: Number,
  event: String,
  text: String,
  object: Schema.Types.Mixed,
  date: {type: Date, default: Date.now},
});

const LogMessage = mongoose.model('LogMessage', logMessageSchema);

module.exports = LogMessage;
