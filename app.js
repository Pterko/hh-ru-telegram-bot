const jsonfile = require('jsonfile');

const config = jsonfile.readFileSync('./config.json'); // init config
// init logger
const log4js = require('log4js');

log4js.loadAppender('file');
log4js.addAppender(log4js.appenders.file('./bot.log'), 'HHTELEGRAMBOT');
const log = log4js.getLogger('HHTELEGRAMBOT');
const exphbs = require('express-handlebars');
const path = require('path');
const express = require('express');

// init bot
const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(config.token || config.token_dev, {
  polling: true,
});

log.info('Bot started');

const scenarioModule = require('./botModules/scenario_module');

const scenario = new scenarioModule(bot);

const app = express();

app.set('views', path.join(__dirname, './public/production/'));
app.set('view partials', path.join(__dirname, './partials'));
app.engine(
  '.html',
  exphbs({
    defaultLayout: null,
    extname: '.html',
    layoutsDir: path.join(__dirname, './public/production/'),
    partialsDir: path.join(__dirname, './partials'),
  })
);
app.set('view engine', '.html');

app.use(express.static('public'));

app.get('/hh_redirect_uri', function(req, res) {
  if (req.query.code) {
    scenario.acceptCode(req.query.code, req.query.state);
  }
  res.send('Отлично, теперь вы можете перейти обратно к боту!');
});

app.listen(12000, () => {
  console.log('Express server started!');
});

// For logging purposes, we catch all uncaught exception, also save our database to disk //
process.on('uncaughtException', err => {
  log.error(err);
  process.exit(1);
});

process.on('exit', code => {
  log.info(`We are exiting with code ${code}`);
});
