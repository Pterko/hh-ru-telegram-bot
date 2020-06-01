require('dotenv').config();
require('./workers/rabbitmq.js');

const path = require('path');
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const log4js = require('log4js');

const ScenarioModule = require('./botModules/scenarioModule');

const log = log4js.getLogger('HHTELEGRAMBOT');

log.info('Using token:', process.env.BOT_TOKEN);

log.info('Our env:', process.env);

const bot = new TelegramBot(process.env.BOT_TOKEN, {
  polling: true,
});

bot.on('polling_error', err => console.log(err));

log.info('Bot started');

const scenario = new ScenarioModule(bot);

global.scenario = scenario;

require('./botModules/notificationsСatcher');

const app = express();

app.set('views', path.join(__dirname, './public/production/'));
app.set('view partials', path.join(__dirname, './partials'));
app.set('view engine', '.html');

app.use(express.static('public'));

app.get('/hh_redirect_uri', (req, res) => {
  log.info('received http request:', req);
  log.info('query:', req.query);
  if (req.query.code) {
    scenario.acceptCode(req.query.code, req.query.state);
  }
  res.send('Отлично, теперь вы можете перейти обратно к боту!');
});

app.listen(12000, () => {
  log.info('Express server started!');
});

// For logging purposes, we catch all uncaught exception, also save our database to disk //
process.on('uncaughtException', err => {
  log.error('UNCAUGHT_EXCEPTION TRIGGERED');
  log.error(err.message);
  log.error(err.message);
  process.exit(1);
});

process.on('exit', code => {
  log.info(`We are exiting with code ${code}`);
});
