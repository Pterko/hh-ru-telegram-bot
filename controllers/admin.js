var mongoose = require("mongoose");
mongoose.Promise = global.Promise;
mongoose.createConnection('mongodb://localhost/hhTelegramBot');
var User = require("./../botModules/models/user");
var Message = require('./../botModules/models/message');


module.exports.adminPanelIndexPage =  (req, res, next) => {
    //total users
    // let total_users = await User.count({});
    // let auth_ok = await User.count({token: {"$exists": true}})
    // let enabled_resume_update = await User.count({ $where: "this.autoUpdatedResumes.length >= 1" })
    // let enabled_views_alert = await User.count({ $where: "this.lastTimeViews.length >= 1" })


    let data = {
        total_users: total_users,
        auth_ok: auth_ok,
        enabled_resume_update: enabled_resume_update,
        enabled_views_alert: enabled_views_alert

    }

    res.render('myindex', data);
}
