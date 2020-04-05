const log4js = require('log4js');
log4js.configure({
  appenders: { console: { type: 'console' } },
  categories: { default: { appenders: ['console'], level: 'info' } },
});

const log = log4js.getLogger('HeadHunter-Chat-Bot');
global.log = log;
