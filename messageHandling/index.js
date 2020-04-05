const Telegraf = require('telegraf');
const session = require('telegraf/session');
const Stage = require('telegraf/stage');
const Scene = require('telegraf/scenes/base');
const User = require('../models/user');
const { Context } = Telegraf;

class MyContext extends Context {
  constructor(update, telegram, options) {
    // Extract custom options if needed
    super(update, telegram, options);
  }

  async reply(...args) {
    const reply = await super.reply(...args);
    
    this.user.lastMessageId = reply.message_id;
    await this.user.save();

    return reply;
  }
}

const bot = new Telegraf(process.env.BOT_TOKEN, { contextType: MyContext });

bot.use(session());

bot.use(async (ctx, next) => {
  if (ctx.update.message) {
    ctx.user = await User.findOne({ id: ctx.update.message.from.id });
    ctx.user.lastMessageId = ctx.update.message.id;
  }
  if (ctx.update.callback_query) {
    ctx.user = await User.findOne({ id: ctx.update.callback_query.from.id });
  }
  log.info('update is:', ctx.update);
  await next();
});

const stage = new Stage();

const normalizedPath = require('path').join(__dirname, 'scenes');

require('fs')
  .readdirSync(normalizedPath)
  .forEach(function (file) {
    stage.register(require('./scenes/' + file));
  });

bot.use(stage.middleware());

bot.on('message', ctx => {
  log.info('Bot event happened:', ctx);
  ctx.scene.enter('start');
});

bot.use(async (ctx, next) => {
  if (ctx.user) {
    ctx.user.save();
  }
});

// bot.command('start', (ctx) => ctx.scene.enter('start'))
bot.launch();
