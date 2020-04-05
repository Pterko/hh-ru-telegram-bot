const Scene = require('telegraf/scenes/base');
const Stage = require('telegraf/stage');
const { leave } = Stage;

const hhApi = require('../../hhApi');

const selectResume = new Scene('selectResume');
selectResume.enter(async ctx => {
  const apiResult = await hhApi.getMyResumes({ token: ctx.user.token.access_token });
  log.info('Get Resume result:', apiResult);
  if (!apiResult.items || apiResult.items.length === 0) {
    ctx.reply('У вас еще нет ни одного резюме! Попробуйте эту функцию позже, когда добавите хотя бы одно', {
      reply_markup: {
        inline_keyboard: [[{ text: 'Вернуться в начало', callback_data: 'menu' }]],
      },
    });
    return;
  }

  ctx.user.resumeItems = apiResult.items;
  await ctx.user.save();

  ctx.reply('Пожалуйста, выберите резюме:', {
    reply_markup: {
      inline_keyboard: apiResult.items.map( resume => {return [{text: resume.title, callback_data: `select_resume_${resume.id}`}] })
    }
  })
  // ctx.reply(`selectResume message`);
});

selectResume.action('menu', ctx => {
  ctx.scene.enter('start');
  ctx.answerCbQuery();
});

selectResume.action(/select_resume/g, async ctx => {
  log.info('select resume action ctx', ctx);
  const resumeId = ctx.update.callback_query.data.replace('select_resume_', '');
  ctx.user.selectedResumeId = resumeId;
  await ctx.user.save();

  ctx.scene.enter('resumeMenu');
  ctx.answerCbQuery();
})

module.exports = selectResume;
