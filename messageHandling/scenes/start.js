const Scene = require('telegraf/scenes/base');


const start = new Scene('start');

start.enter(ctx =>
  ctx.reply(`
Привет! Я - бот, который поможет тебе отслеживать изменения с твоими резюме на сайте HeadHunter.
Что я умею:
• Уведомлять тебя о новых просмотрах твоих резюме
• Обновлять твои резюме автоматически, каждые 4 часа
• Помогать тебе удобно просматривать список просмотров твоих резюме

И да, в случае чего, можешь писать моему создателю - @Pterko , он поможет тебе поладить со мной, а также может добавить мне новые функции.`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Управление резюме', callback_data: 'resume_management' }],
        [{ text: 'Забыть меня', callback_data: 'forget_me' }],
      ],
    },
  })
);

start.action('resume_management', ctx => {
  log.info('ctx action: ', ctx);
  ctx.scene.enter('selectResume');
  ctx.answerCbQuery();
});

module.exports = start; 