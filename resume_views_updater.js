const hhApi = require('./hhApi');
const User = require('./botModules/models/user');

var log4js = require('log4js');
log4js.loadAppender('file');
log4js.addAppender(log4js.appenders.file("./resume_views_updater.log"),'HHTELEGRAMBOT');
var log = log4js.getLogger('HHTELEGRAMBOT');


async function proceed(){
  try{
    log.info("Lets find our users");

    //log.info(User)
    //let users =  User.find({});
    User.find({})
    .then(res => log.info(res.length))
    .catch(err => log.info(err))

    // log.info("Finished!");
    // log.info(`We have ${users.length} users`);

  } catch(ex){
    log.info(ex);
  }
}



log.info("Starting...");

proceed();