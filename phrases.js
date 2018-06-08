const phrases = {};

phrases.commandsList =
  '/help - получить список команд \n' +
  '/providetoken - пройти OAuth авторизацию бота\n' +
  '/resumemonitoring - настройка мониторинга просмотров Ваших резюме\n' +
  '/resume - получить список Ваших резюме и краткую информацию о них\n' +
  '/rate - оценить бота';

phrases.resumeListIntro = 'Краткая информация о Ваших резюме:';

phrases.noCommandFound = 'Нет такой команды. Для получения списка доступных команд используйте /help .';
phrases.helpMessage = `Данный бот является неофициальным ботом для упрощения работы с сайтом HeadHunter \n\n${phrases.commandsList}`;

phrases.startMessage = `${'Привет! Данный бот - это неофициальный бот, который создан для упрощения взаимодействия с сайтом ' +
  'HeadHunter.\n' +
  'Учтите, что методы, подразумевающие работу с Вашей информацией, требуют OAuth авторизации.\n' +
  'Список команд: \n'}${phrases.commandsList}`;

module.exports = phrases;
