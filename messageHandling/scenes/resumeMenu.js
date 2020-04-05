const Scene = require('telegraf/scenes/base');

const resumeMenu = new Scene('resumeMenu');

resumeMenu.enter(ctx =>{
  const selectedResume = ctx.user.resumeItems.find(x => x.id === ctx.user.selectedResumeId);
  if (!selectedResume){
    ctx.reply('Резюме не найдено. Вернитесь в меню.');
    return;
  }

  ctx.reply(`
Выбранное резюме: ${selectedResume.title}`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Управление резюме', callback_data: 'resume_management' }],
        [{ text: 'Забыть меня', callback_data: 'forget_me' }],
      ],
    },
  })
}
);

resumeMenu.action('resume_management', ctx => {

});

module.exports = resumeMenu; 