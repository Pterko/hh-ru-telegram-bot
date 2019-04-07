var jsonfile = require('jsonfile');
var file = 'data.json';
var hh = require('./hhApi');
var config = jsonfile.readFileSync("./config.json");  // init config
var phrases = require('./phrases');
var adminController = require('./controllers/admin');
//init logger
var log4js = require('log4js');
log4js.loadAppender('file');
log4js.addAppender(log4js.appenders.file("./bot.log"),'HHTELEGRAMBOT');
var log = log4js.getLogger('HHTELEGRAMBOT');
var exphbs  = require('express-handlebars');
var path = require('path');



//init bot
var TelegramBot = require('node-telegram-bot-api');
var bot = new TelegramBot(config.token || config.token_dev, {polling: true});
var debug = true;

log.info("Bot started");

var inlineVacationsHandler = require("./botModules/inlineVacations");
var inline = new inlineVacationsHandler(bot);

var scenarioModule = require("./botModules/scenario_module");
var scenario = new scenarioModule(bot);


var express = require('express');
var app = express();

app.set('views', path.join(__dirname, './public/production/'))
app.set('view partials', path.join(__dirname, './partials'));
app.engine('.html', exphbs({
    defaultLayout: null,
    extname: '.html',
    layoutsDir: path.join(__dirname, './public/production/'),
    partialsDir: path.join(__dirname, './partials')
  }));
app.set('view engine', '.html');

app.use(express.static('public'));

app.get('/hh_redirect_uri', function (req, res) {
    if(req.query.code){
        scenario.acceptCode(req.query.code, req.query.state);
    }
    res.send("Отлично, теперь вы можете перейти обратно к боту!");
});

app.listen(12000, function () {
    console.log('Example app listening on port 3000!');
});

app.get('/admin/main', adminController.adminPanelIndexPage)








//For logging purposes, we catch all uncaught exception, also save our database to disk //
process.on('uncaughtException', function (err) {
    log.error(err);
    process.exit(1);
});

process.on('exit', function(code) {
    log.info("We are exiting with code "+code);
});