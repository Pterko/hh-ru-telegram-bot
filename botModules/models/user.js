/**
 * Created by Pter on 26.06.2016.
 */


var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userSchema = new Schema({
    id:  Number,
    lastMessageId: Number,
    firstName: String,
    lastName: String,
    state: String,
    username: String,
    token: {
        access_token: String,
        token_type: String,
        expires_at: Number,
        expires_in: Number,
        refresh_token: String
    },
    lastTimeViews: [
        {
            id: String,
            views: Number
        }
    ],
    autoUpdatedResumes: [
        {
            id: String,
            lastTimeUpdate: Number
        }
    ],
    storage: {
        search: {
            vacancySearchQuery: String,
            page: Number,
            pages: Number,
            found: Number,
            vacancyStr: String
        },
        resume: {
            resumes: [String], // each element: resume
            selectedResumeOffset: Number,
            viewsShow: {
                pages: Number,
                page: Number,
                found: Number,
                pageStr: String
            }
        }
    }

});


var User = mongoose.model('User',userSchema);

module.exports = User;