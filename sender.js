let config = require('./config.json');
let request = require('request');
var TelegramBot = require('node-telegram-bot-api');
var bot = new TelegramBot(config.token, {polling: false});

var log4js = require('log4js');
log4js.loadAppender('file');
log4js.addAppender(log4js.appenders.file("./sender.log"),'HHTELEGRAMBOT');
var log = log4js.getLogger('HHTELEGRAMBOT');

var users = require('./users.json');
let sendIds = ['97407819', '97407819', '97407819', '97407819']

//  sendIds = [];

for (let user of users){
    sendIds.push(user.id);
}


let message = "*Приветствую!* С Вами на связи разработчик этого бота, и надеюсь, что это обращение вас не потревожило.\n\nНедавно исполнился год, как существует этот чат бот, и за это время мы достигли хороших показателей - тысячи пользователей попробовали нашего бота в деле и использовали его для своих нужд, чтобы облегчить себе жизнь. Но сейчас помощь нужна мне.\n\nПомощь заключается в том, что мне необходимо реализовать *новый функционал чат-бота*, и только Вы, как пользователь, можете помочь мне понять, чего именно Вам не хватает. Так что ответом на это сообщение я попрошу Вас написать тот функционал, которого Вам не хватает в чат-боте. Больше всего меня интересуют функции, которых *нет на самом сайте hh* (такие как автоматическое обновление резюме, например). Также Вы можете написать @Pterko и сказать ему, какие функции Вам хотелось бы увидеть. Спасибо, жду Ваших *идей*!\n";
let overall = sendIds.length;
let completed = 0;

let errors = [];

async function sendMessages(){
    for(let id of sendIds){
        log.info("Working with id ", id);
        await (bot.sendMessage(id, message, {parse_mode: 'markdown'})
        .then((re) => {
            log.info("Message sent:", re);
        })
        .catch(((err) => {
            errors.push(err);
            log.error("Meet error:", err)
        })));
        log.info("Message sent. Waiting ", id);
        await (new Promise((resolve, reject) => {
            setTimeout(resolve, 500);
        }));
        completed++;
        log.info(`Status: ${completed}/${overall}`)
    }
    log.info("Completed!");
}



sendMessages();