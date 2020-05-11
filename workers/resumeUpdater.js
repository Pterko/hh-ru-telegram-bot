const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '/.env') });

const amqp = require('amqplib');
const mongoose = require('mongoose');

const log4js = require('log4js');

const log = log4js.getLogger('hh-telegram-bot-resume-updater');

const User = require('../botModules/models/user');
const LogMessage = require('../botModules/models/logMessage');

const hh = require('../hhApi');

mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true });

const serverAddr = process.env.RABBITMQ_URL;
const q = `${process.env.ENV}_update_resumes`;
let channel;

async function updateResume(task) {
  return new Promise(async (resolve, reject) => {
    setTimeout(reject, 5000);
    const user = await User.findOne({ _id: task._id });
    const resume = user.autoUpdatedResumes.find(x => x.id === task.resume_id);

    hh.updateResume(user.token.access_token, task.resume_id, async (err, statusCode) => {
      log.info('Received statusCode:', statusCode);
      if (err) {
        log.error(
          'Error ',
          err,
          ' while processing user ',
          user,
          ' and resume ',
          resume,
          'Also, status code is ',
          statusCode
        );

        LogMessage.create({
          userid: user.id,
          action: 'resume_update',
          text: `Возникла ошибка при обновлении резюме.`,
          object: { err, statusCode, user, task },
        });

        if (err.oauth_error && err.oauth_error === 'token-revoked') {
          log.info('Delete token');
          LogMessage.create({
            userid: user.id,
            action: 'resume_update',
            text: `Удаляем невалидный токен`,
            object: { err, statusCode, user, task },
          });
          user.token = undefined;
          user.markModified('token');
        }
      }
      log.info(statusCode);
      switch (statusCode) {
        case 429:
          resume.lastTryToUpdate = Date.now();
          log.info('lastTryToUpdate updated');
          LogMessage.create({
            userid: user.id,
            action: 'resume_update',
            text: `Мы получили ошибку 429, обновили время последней попытки обновления`,
            object: { err, statusCode, user, task },
          });
          break;
        case 204:
          resume.lastTimeUpdate = Date.now();
          log.info('lastTimeUpdate updated');
          LogMessage.create({
            userid: user.id,
            action: 'resume_update',
            text: `Резюме обновлено успешно`,
          });
          break;
        case 404:
          await LogMessage.create({
            userid: user.id,
            action: 'resume_update',
            text: `Удалено автообновление резюме по причине полученного статуса 404`,
            object: { task, resume, err, statusCode },
          });
          // This resume doesn't exists anymore, we should delete it from the resumes array
          user.autoUpdatedResumes = user.autoUpdatedResumes.filter(x => x.id !== resume.id);
          log.info('This auto-updated resume deleted');

          break;
        default:
          log.error(`Unexpected result: ${statusCode} while updating resume ${resume} of user ${user}`);
      }
      log.info(`Work with user ${user.id} ended.`);
      user.markModified('autoUpdatedResumes');
      user.save();
      resolve();
    });
  });
}

async function proceedMessage(msg) {
  try {
    const body = msg.content.toString();
    const task = JSON.parse(body);

    await updateResume(task);

    await new Promise(resolve => setTimeout(resolve, 300));

    console.log(' [x] Done');
    channel.ack(msg);
  } catch (ex) {
    console.log('Error!', ex);
    channel.ack(msg);
  }
}

async function start() {
  amqp
    .connect(serverAddr)
    .then(function(conn) {
      process.once('SIGINT', function() {
        conn.close();
      });
      return conn.createChannel().then(function(ch) {
        channel = ch;

        let ok = channel.assertQueue(q, { durable: true });
        ok = ok.then(function() {
          channel.prefetch(1);
        });
        ok = ok.then(function() {
          channel.consume(q, proceedMessage, { noAck: false });
          console.log(' [*] Waiting for messages. To exit press CTRL+C');
        });
        return ok;
      });
    })
    .catch(console.warn);
}

start();
