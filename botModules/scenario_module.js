const log4js = require('log4js');

const log = log4js.getLogger('HHTELEGRAMBOT');
const ScenarioHandler = require('./messageDispatcher.js');
const hh = require('../hhApi');

class scenarioModule {
  constructor(bot) {
    log.info('Initialize bot...');
    this.bot = bot;
    this.handler = new ScenarioHandler(bot, this);
  }

  vacancySearchTextHandler(user, text, callback) {
    log.info(text);
    const callbackResponse = {
      setState: 'vacancySearchState',
    };
    user.storage.search.vacancySearchQuery = text;
    callback(user, callbackResponse);
  }

  // this method should return buttons array
  vacancySearchButtonsGenerator(user) {
    const buttonsArrayLine = [];
    if (user.storage.search.page > 0) {
      buttonsArrayLine.push({ text: 'Предыдущая страница', callback_data: 'search_prev_page' });
    }
    if (user.storage.search.page !== user.storage.search.pages - 1) {
      buttonsArrayLine.push({ text: 'Следующая страница', callback_data: 'search_next_page' });
    }
    buttonsArrayLine.push({ text: 'В начало', callback_data: 'go_start' });

    log.info('Buttons line generated:', buttonsArrayLine);
    return [buttonsArrayLine];
  }

  resumeSelectButtonsGenerator(user) {
    const buttonsArray = [];
    for (let i = 0; i < user.storage.resume.resumes.length; i += 1) {
      const resume = JSON.parse(user.storage.resume.resumes[i]);
      buttonsArray.push([{ text: `№${i + 1} - ${resume.title}`, callback_data: `select_resume_${i}` }]);
    }
    buttonsArray.push([{ text: 'В начало', callback_data: 'go_start' }]);
    log.info('Buttons line generated:', buttonsArray);
    return buttonsArray;
  }

  specificResumeButtonsGenerator(user) {
    const buttonsArray = [];
    const selectedResume = JSON.parse(user.storage.resume.resumes[user.storage.resume.selectedResumeOffset]);
    // create button for "auto-update enable/disable"
    if (user.autoUpdatedResumes.find(x => x.id === selectedResume.id)) {
      buttonsArray.push([{ text: 'Выключить автообновление резюме', callback_data: 'resume_autoupdate_disable' }]);
    } else {
      buttonsArray.push([{ text: 'Включить автообновление резюме', callback_data: 'resume_autoupdate_enable' }]);
    }
    // create button for "resume views monitoring enable/disable"
    if (user.lastTimeViews.find(x => x.id === selectedResume.id)) {
      buttonsArray.push([
        { text: 'Выключить мониторинг просмотров резюме', callback_data: 'resume_monitoring_disable' },
      ]);
    } else {
      buttonsArray.push([{ text: 'Включить мониторинг просмотров резюме', callback_data: 'resume_monitoring_enable' }]);
    }

    buttonsArray.push([{ text: 'Обновить резюме', callback_data: 'resume_update' }]);
    buttonsArray.push([{ text: 'Увидеть просмотры резюме', callback_data: 'resume_show_views' }]);
    // buttonsArray.push([{ text: 'Аналитика резюме', callback_data: 'resume_analytics' }]);
    buttonsArray.push([{ text: 'Вернуться в начало', callback_data: 'go_start' }]);

    return buttonsArray;
  }

  resumeUpdateHandle(user, msg, callback) {
    log.info("We're into resumeUpdateHandle function");
    const selectedResume = JSON.parse(user.storage.resume.resumes[user.storage.resume.selectedResumeOffset]);
    if (selectedResume.status.id === 'published') {
      hh.updateResume(user.token.access_token, selectedResume.id, (err, res) => {
        log.info('UpdateResumeResult:', res);
        if (res === 204) {
          const autoUpdatedResume = user.autoUpdatedResumes.find(x => x.id === selectedResume.id);
          if (autoUpdatedResume) {
            autoUpdatedResume.lastTimeUpdate = Date.now();
          }
          return callback({
            showAlert: 'Резюме обновлено',
          });
        }
        if (res === 429) {
          return callback({
            showAlert: 'Еще рано для обновления, попробуйте позже',
          });
        }
        return callback({
          showAlert: 'Неизвестная ошибка',
        });
      });
    }
    return callback({
      showAlert: 'Данное резюме еще не опубликовано, не могу обновить его!',
    });
  }

  // this method should return buttons array
  resumeViewsButtonsGenerator(user) {
    const buttonsArrayLine = [];
    if (user.storage.resume.viewsShow.page > 0) {
      buttonsArrayLine.push({ text: 'Предыдущая страница', callback_data: 'resume_views_prev_page' });
    }
    if (user.storage.resume.viewsShow.page !== user.storage.resume.viewsShow.pages - 1) {
      buttonsArrayLine.push({ text: 'Следующая страница', callback_data: 'resume_views_next_page' });
    }
    buttonsArrayLine.push({ text: 'К резюме', callback_data: 'go_specific_resume_menu' });

    log.info('Buttons line generated:', buttonsArrayLine);
    return [buttonsArrayLine];
  }

  prepareViewsInfo(user, callback) {
    log.warn("We're in prepareViewsInfo");
    user.storage.resume.viewsShow.page = 0;
    this.generateViewsForResumeViewsShow(user, callback);
  }

  viewsShowNextPageEvent(user, msg, callback) {
    user.storage.resume.viewsShow.page += 1;
    this.generateViewsForResumeViewsShow(user, callback);
  }

  viewsShowPrevPageEvent(user, msg, callback) {
    user.storage.resume.viewsShow.page -= 1;
    this.generateViewsForResumeViewsShow(user, callback);
  }

  generateViewsForResumeViewsShow(user, callback) {
    hh.getResumeViews(
      {
        token: user.token.access_token,
        resume_id: JSON.parse(user.storage.resume.resumes[user.storage.resume.selectedResumeOffset]).id,
        page: user.storage.resume.viewsShow.page,
        per_page: 10,
      },
      (err, json) => {
        if (err) {
          throw new Error(err);
        }
        user.storage.resume.viewsShow.page = json.page;
        user.storage.resume.viewsShow.pages = json.pages;
        user.storage.resume.viewsShow.found = json.found;
        // now we need to generate String-list for message
        log.info(json);
        let viewsStr = '';
        for (const view of json.items) {
          const datNorm = new Date(view.created_at);
          const options = {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour12: false,
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
          };

          viewsStr += `${datNorm.toLocaleString('ru-RU', options)} | `;

          viewsStr += `[${view.employer.name}](${view.employer.alternate_url})`;

          viewsStr += '\n';
        }

        user.storage.resume.viewsShow.pageStr = viewsStr;
        log.info('Prepared pageStr, user looks now like: ', user);
        callback(user, undefined);
      }
    );
  }

  prepareSearchInfo(user, callback) {
    user.storage.search.page = 0;
    this.generateVacanciesForUserSearch(user, callback);
  }

  searchNextPageEvent(user, msg, callback) {
    user.storage.search.page += 1;
    this.generateVacanciesForUserSearch(user, callback);
  }

  searchPrevPageEvent(user, msg, callback) {
    user.storage.search.page -= 1;
    this.generateVacanciesForUserSearch(user, callback);
  }

  enableResumeAutoupdate(user) {
    log.info('We are in enableResumeAutoupdate function');
    const currentResumeId = JSON.parse(user.storage.resume.resumes[user.storage.resume.selectedResumeOffset]).id;
    if (user.autoUpdatedResumes.find(x => x.id === currentResumeId)) {
      return {
        showAlert: 'Автообновление уже включено!',
      };
    }
    user.autoUpdatedResumes.push({ id: currentResumeId });
    log.info('User after push:', user);
    return {
      showAlert: 'Автообновление резюме было включено!',
    };
  }

  disableResumeAutoupdate(user) {
    log.info('We are in disableResumeAutoupdate function');
    const currentResumeId = JSON.parse(user.storage.resume.resumes[user.storage.resume.selectedResumeOffset]).id;
    const resumeIndex = user.autoUpdatedResumes.findIndex(x => x.id === currentResumeId);
    log.info('Index of deleted element:', resumeIndex);
    if (resumeIndex > -1) {
      user.autoUpdatedResumes.splice(resumeIndex, 1);
    }
    log.info('User after splice:', user);
    return {
      showAlert: 'Автообновление резюме было выключено!',
    };
  }

  enableResumeMonitoring(user) {
    log.info('We are in enableResumeMonitoring function');
    const currentResumeId = JSON.parse(user.storage.resume.resumes[user.storage.resume.selectedResumeOffset]).id;
    if (user.lastTimeViews.find(x => x.id === currentResumeId)) {
      return {
        showAlert: 'Мониторинг уже включен!',
      };
    }
    user.lastTimeViews.push({
      id: currentResumeId,
      views: JSON.parse(user.storage.resume.resumes[user.storage.resume.selectedResumeOffset]).new_views,
    });
    log.info('User after push:', user);
    return {
      showAlert: 'Мониторинг новых просмотров активирован!',
    };
  }

  disableResumeMonitoring(user) {
    log.info('We are in disableResumeMonitoring function');
    const currentResumeId = JSON.parse(user.storage.resume.resumes[user.storage.resume.selectedResumeOffset]).id;
    const resumeIndex = user.lastTimeViews.findIndex(x => x.id === currentResumeId);
    log.info('Index of deleted element:', resumeIndex);
    if (resumeIndex > -1) {
      user.lastTimeViews.splice(resumeIndex, 1);
      // user.markModified('storage');
    }
    log.info('User after splice:', user);
    return {
      showAlert: 'Мониторинг резюме деактивировано!',
    };
  }

  generateVacanciesForUserSearch(user, callback) {
    hh.findVacanciesByQuery(
      {
        query: user.storage.search.vacancySearchQuery,
        page: user.storage.search.page,
        per_page: 5,
      },
      (err, json) => {
        if (err) {
          throw new Error(err);
        }
        user.storage.search.page = json.page;
        user.storage.search.pages = json.pages;
        user.storage.search.found = json.found;
        // now we need to generate String-list for message
        let vacancyStr = '';
        for (const vacancy of json.items) {
          vacancyStr += `[${vacancy.name}](${vacancy.alternate_url})| `;
          if (vacancy.salary != null) {
            if (vacancy.salary.from != null) {
              vacancyStr += ` от ${vacancy.salary.from}${vacancy.salary.currency}`;
            }
            if (vacancy.salary.to != null) {
              vacancyStr += ` до ${vacancy.salary.to}${vacancy.salary.currency}`;
            }
          } else {
            vacancyStr += 'Зарплата не указана';
          }
          vacancyStr += '\n';
          if (vacancy.snippet != null) {
            if (vacancy.snippet.requirement != null) {
              vacancyStr += `Требования: ${vacancy.snippet.requirement}\n`;
            }
          }
          vacancyStr += '\n';
        }
        vacancyStr = vacancyStr
          .replace(new RegExp('<highlighttext>', 'g'), '*')
          .replace(new RegExp('</highlighttext>', 'g'), '*');
        user.storage.search.vacancyStr = vacancyStr;
        log.info('Prepared vacancyStr, user looks now like: ', user);
        callback(user, undefined);
      }
    );
  }

  forgetUser(user, msg, callback) {
    callback(user, {});
    user.remove();
  }

  resumeManageSelect(user, msg, callback) {
    // in this method we need to check token existence
    log.info("We're in resume manage select function ", user.token);
    log.info(user.token.length);
    const callbackAnswer = {};
    if (user.token.access_token == null || user.token.access_token === undefined) {
      log.info('We in no token branch');
      // change state to awaitTokenState
      callbackAnswer.setState = 'awaitTokenState';
      return callback(callbackAnswer);
    }
    // check that user have resumes and token is working
    hh.getMyResumes(user.token.access_token, (err, json) => {
      if (err) {
        // return bot.sendMessage(user.id, "Возникла ошибка при выполнении запроса:", err);
        log.error('Возникла ошибка при выполнении запроса(resumeManageSelect):', err);
        return callback({
          showAlert: `Возникла ошибка при выполнении запроса:${err}`,
        });
      }
      const resumes = json.items;
      if (resumes.length === 0) {
        callbackAnswer.setState = 'noResumesState';
        return callback(callbackAnswer);
      }
      user.storage.resume.resumes = [];
      // if we have resumes, prepare info for button and text-generators
      for (let i = 0; i < resumes.length; i += 1) {
        user.storage.resume.resumes.push(JSON.stringify(resumes[i]));
      }
      callbackAnswer.setState = 'selectResumeState';
      return callback(callbackAnswer);
    });
    return callback({ setState: 'awaitTokenState' });
  }

  resumeAnalyticsHandler(user) {
    // get id of current resume
    const currentResumeId = JSON.parse(user.storage.resume.resumes[user.storage.resume.selectedResumeOffset]).id;
    const analytics = user.storage.resume.resume_analytics.find(x => x.resume_id === currentResumeId);
    if (!analytics) {
      return { setState: 'analyticsNotReadyState' };
    }
    user.storage.analytics = analytics.toObject();

    if (!user.storage.analytics || !user.storage.analytics.comparison_percent) {
      return { setState: 'analyticsNotReadyState' };
    }

    if (user.storage.analytics.comparison_percent >= 50) {
      user.storage.analytics.comparison_word = 'чаще';
    } else {
      user.storage.analytics.comparison_word = 'реже';
      log.info('Before comparison_percent: ', user.storage.analytics.comparison_percent);
      user.storage.analytics.comparison_percent = 100 - parseInt(user.storage.analytics.comparison_percent, 10);
      log.info('Modified comparison_percent: ', user.storage.analytics.comparison_percent);
    }
    return { setState: 'analyticsState' };
    // set state analyticsState
  }

  handleResumeSelect(user, msg) {
    log.info("I'M INTO HANDLE RESUME SELECT");
    if (msg.value) {
      user.storage.resume.selectedResumeOffset = msg.value;
      // so, now we need to change our state specific resume dialog
      return { setState: 'specificResumeState' };
    }
    return {};
  }

  async acceptNotification(notification) {
    log.info('acceptNotification', notification);
    if (notification.payload.action === 'fakeDataMessage') {
      this.handler.getUserObjectFromMsg({ from: { id: notification.user.id } }, (err, user) => {
        this.handler.sendFakeDataMessage(notification.payload.dataMessage, user);
      });
    }
  }

  acceptCode(code, userId) {
    // so, in this method we accept code from user and try to receive normal hh.ru api code
    log.info('Received code ', code, ' for user ', userId);
    this.handler.getUserObjectFromMsg({ from: { id: userId } }, (getUserErr, user) => {
      log.info('User: ', user);

      user.token.access_token = '123';
      hh.getAccessTokenByCode(code, (err, json) => {
        if (err) {
          log.info('Error while getting token:', err, json, code);
          // bot.sendMessage(user_id, 'Токен неправильный, попробуйте еще.');
          return;
        }
        user.token = json;
        // user.token.expires_at = Date.now() + parseInt(user.token.expires_in);
        user.token.expires_at = Math.round(Date.now() / 1000) + parseInt(json.expires_in, 10);
        log.warn(user);
        user.markModified('token');
        user.save(result => {
          log.warn(result);
          log.info('User saved, lets move to event receiver');
          this.handler.foreignEventReceiver(userId, { setState: 'tokenReceivedSuccess' });
        });
      });
    });
  }

  updateResumeTaskFunction(task, callback) {
    hh.updateResume(task.user.token.access_token, task.resume.id, (err, statusCode) => {
      if (err) {
        log.warn(`Received error while updating ${task.user.id} resume:`, err);
        return callback(err, statusCode);
      }
      log.info(
        `Auto-updating of ${task.user.first_name} resume ${task.resume.id} finished with code ${statusCode} and error ${err}`
      );
      return callback(null, statusCode);
    });
  }

  updateResumeViewsTaskFunction(task, callback) {
    hh.getMyResumes(task.user.token.access_token, (err, json) => {
      if (err) {
        log.warn(`Received error while updating ${task.user.id} resume:`, err);
        return callback(err);
      }
      return callback(null, json);
    });
  }

  updateUserTokensTaskFunction(task, callback) {
    hh.updateToken(task.user.token.access_token, task.user.token.refresh_token, (err, json) => {
      if (err) {
        log.error(`Received error while updating ${task.user.id} resume:`, err);
        return callback(err);
      }
      return callback(null, json);
    });
  }
}

module.exports = scenarioModule;
