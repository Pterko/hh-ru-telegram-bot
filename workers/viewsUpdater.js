const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '/.env') });

const amqp = require('amqplib');
const mongoose = require('mongoose');

const log4js = require('log4js');

const log = log4js.getLogger('hh-telegram-bot-token-updater');

const User = require('../botModules/models/user');
// const LogMessage = require('../botModules/models/logMessage');

const hh = require('../hhApi');

mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const serverAddr = process.env.RABBITMQ_URL;
const q = `${process.env.ENV}_update_resume_views`;
const outboundQueueName = `${process.env.ENV}_notifications`;
let channel;

function sendNotification(user, payload) {
  channel.sendToQueue(
    outboundQueueName,
    Buffer.from(
      JSON.stringify({
        user,
        payload,
      })
    ),
    { deliveryMode: true }
  );
}

async function updateResumeViews(task) {
  const user = await User.findOne({ _id: task._id });

  return new Promise((resolve, reject) => {
    setTimeout(reject, 10000);
    hh.getMyResumes(user.token.access_token, async (err, json) => {
      if (err) {
        log.error('Error ', err, ' while processing user ', user);
        return;
      }
      const result = json;
      log.info(`Received result from hhApi:`, JSON.stringify(result));
      if (!result) return;

      for (const resume of result.items) {
        log.info(`Check resume ${resume.id}`);
        // check what that resume in our updating list
        const oldResume = user.lastTimeViews.find(x => x.id === resume.id);
        if (oldResume === undefined) {
          log.info(`Resume ${resume.id} don't needed to be monitored, skip it`);
          // eslint-disable-next-line no-continue
          continue;
        }
        if (resume.new_views > oldResume.views) {
          // send message, that we have new views
          oldResume.views = resume.new_views;

          user.storage.resume.selectedResumeOffset = user.storage.resume.resumes.findIndex(
            x => JSON.parse(x).id === resume.id
          );

          // this.handler.sendFakeDataMessage('new_resume_view_incoming', user);
          sendNotification(user, {
            action: 'fakeDataMessage',
            dataMessage: 'new_resume_view_incoming',
          });

          log.info(`New views detected on resume ${resume.id}`);
          // currently this function support updating olny of one resume at the same time
          break;
        } else {
          log.info(`No new views detected on resume ${resume.id}`);
          oldResume.views = resume.new_views;
        }
      }
      log.info(`Work of gettin resume views with user ${user.id} ended.`);
      await user.save();
      resolve();
    });
  });
}

async function proceedMessage(msg) {
  try {
    const body = msg.content.toString();
    const task = JSON.parse(body);

    await updateResumeViews(task);

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

        // eslint-disable-next-line no-unused-vars
        let ok = channel.assertQueue(q, { durable: true });
        ok = ok.then(function() {
          channel.prefetch(1);
        });
        ok = ok.then(function() {
          channel.consume(q, proceedMessage, { noAck: false });
          console.log(' [*] Waiting for messages. To exit press CTRL+C');
        });

        const outOk = ch.assertQueue(outboundQueueName, { durable: true });

        return outOk.then(function() {
          // channels[queueName] = ch;
          console.log('Connected to outbound queue');
        });
      });
    })
    .catch(console.warn);
}

start();
