/**
 * Created by Pter on 26.06.2016.
 */


var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var messageSchema = new Schema({
    userid: Number,
    text: String,
    object: Schema.Types.Mixed,
    date: Date

});


var Message = mongoose.model('Message',messageSchema);

module.exports = Message;