var jsonfile = require('jsonfile');
var file = 'data.json';
var hh = require('./hhApi');
var config = jsonfile.readFileSync("./config.json");  // init config
var phrases = require('./phrases');
//init useful variables
//var defaultOptions = {
//    ReplyKeyboardHide: true,
//    reply_markup: JSON.stringify({
//        ReplyKeyboardHide: true
//    })
//};
//init logger
var log4js = require('log4js');
log4js.loadAppender('file');
log4js.addAppender(log4js.appenders.file("./bot.log"),'HHTELEGRAMBOT');
var log = log4js.getLogger('HHTELEGRAMBOT');


//init bot
var TelegramBot = require('node-telegram-bot-api');
var bot = new TelegramBot(config.token_dev, {polling: true});
var debug = true;

log.info("Bot started");

var inlineVacationsHandler = require("./botModules/inlineVacations");
var inline = new inlineVacationsHandler(bot);

var scenarioModule = require("./botModules/scenario_module");
var scenario = new scenarioModule(bot);


//bot.on('message',function(msg){
//    var options = {
//        reply_markup: JSON.stringify({
//            inline_keyboard: [
//                [{ text: 'Some button text 1', url: 'http://yandex.ru' }],
//                [{ text: 'Some button text 2', callback_data: '2' }],
//                [{ text: 'Some button text 3', callback_data: '3' }]
//            ]
//        })
//    };
//    bot.sendMessage(msg.chat.id, 'Some text giving three inline buttons', options);
//
//});


//For logging purposes, we catch all uncaught exception, also save our database to disk //
process.on('uncaughtException', function (err) {
    log.error(err);
    process.exit(1);
});

process.on('exit', function(code) {
    log.info("We are exiting with code "+code);
});