/**
 * Created by Pter on 26.06.2016.
 */


var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userSchema = new Schema({
    _id:  Number,
    firstName: String,
    lastName: String,
    username: String,
    state: String,
    stateValue: String,
    token:{
        access_token: String,
        token_type: String,
        expires_at: Number,
        refresh_token: String
    },
    lastTimeViews:[
        {
            id: String,
            views: Number
        }
    ],
    autoUpdatedResumes:[
        {
            id: String
        }
    ],
    storage:{
        vacancySearchQuery: String
    }

});


var User = mongoose.model('User',userSchema);

module.exports = User;