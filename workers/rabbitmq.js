const mongoose = require('mongoose');
const amqp = require('amqplib');

const User = require('../botModules/models/user');

mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const serverAddr = process.env.RABBITMQ_URL;

const queueNames = [
  `${process.env.ENV}_update_tokens`,
  `${process.env.ENV}_update_resumes`,
  `${process.env.ENV}_update_resume_views`,
];
const channels = {};
// let connection;

const exportInteval = 10 * 1000; // we will check every 30 seconds that queue is empty

async function getQueueStats(queueName) {
  const result = await channels[queueName].assertQueue(queueName);
  return result;
}

async function sendTokenUpdateTasks() {
  const queueStats = await getQueueStats(`${process.env.ENV}_update_tokens`);

  console.log(`Current ${process.env.ENV}_update_tokens queue stats: ${JSON.stringify(queueStats)}`);

  if (queueStats.messageCount !== 0 && queueStats.messageCount >= queueStats.consumerCount * 2) {
    console.log('Queue is not empty, we need to wait some time');
    return;
  }

  const eligibleUser = await User.find({ 'token.expires_at': { $lt: Math.ceil(Date.now() / 1000) } }, 'id _id');
  eligibleUser.forEach(user =>
    channels[`${process.env.ENV}_update_tokens`].sendToQueue(
      `${process.env.ENV}_update_tokens`,
      Buffer.from(JSON.stringify(user)),
      { deliveryMode: true }
    )
  );
}

async function sendResumeUpdateTasks() {
  const queueStats = await getQueueStats(`${process.env.ENV}_update_resumes`);

  console.log(`Current ${process.env.ENV}_update_resumes queue stats: ${JSON.stringify(queueStats)}`);

  if (queueStats.messageCount !== 0 && queueStats.messageCount >= queueStats.consumerCount * 2) {
    console.log('Queue is not empty, we need to wait some time');
    return;
  }

  const eligibleLastUpdateDate = new Date();
  eligibleLastUpdateDate.setHours(eligibleLastUpdateDate.getHours() - 4);

  const eligibleLastTryToUpdateDate = new Date();
  eligibleLastTryToUpdateDate.setHours(eligibleLastTryToUpdateDate.getHours() - 1);

  const eligibleUser = await User.find(
    {
      'token.access_token': { $exists: true },
      autoUpdatedResumes: {
        $elemMatch: {
          $or: [
            {
              $and: [
                {
                  lastTimeUpdate: { $lt: eligibleLastUpdateDate.getTime() },
                },
                {
                  lastTryToUpdate: {
                    $lt: eligibleLastTryToUpdateDate.getTime(),
                  },
                },
              ],
            },
            { lastTimeUpdate: { $exists: false } },
            { lastTryToUpdate: { $exists: false } },
          ],
        },
      },
    },
    'id _id autoUpdatedResumes'
  );
  eligibleUser.forEach(user => {
    if (user.autoUpdatedResumes) {
      user.autoUpdatedResumes.forEach(autoUpdatedResume => {
        if (
          // case for usual resumes which were sucessefully updated at least one time
          (autoUpdatedResume.lastTimeUpdate < eligibleLastUpdateDate.getTime() &&
            autoUpdatedResume.lastTryToUpdate < eligibleLastTryToUpdateDate.getTime()) ||
          // case for new resumes which have attempt, but it was failed
          (!autoUpdatedResume.lastTimeUpdate &&
            autoUpdatedResume.lastTryToUpdate &&
            autoUpdatedResume.lastTryToUpdate < eligibleLastTryToUpdateDate.getTime()) ||
          // case for new resumes
          (!autoUpdatedResume.lastTimeUpdate && !autoUpdatedResume.lastTryToUpdate) ||
          // case for resumes that have only success attempts
          (!autoUpdatedResume.lastTryToUpdate && autoUpdatedResume.lastTimeUpdate < eligibleLastUpdateDate.getTime())
        ) {
          channels[`${process.env.ENV}_update_resumes`].sendToQueue(
            `${process.env.ENV}_update_resumes`,
            Buffer.from(
              JSON.stringify({
                _id: user._id,
                id: user.id,
                resume_id: autoUpdatedResume.id,
              })
            ),
            { deliveryMode: true }
          );
        }
      });
    }
  });
}

async function sendResumeViewsUpdateTasks() {
  const queueStats = await getQueueStats(`${process.env.ENV}_update_resume_views`);

  console.log(`Current ${process.env.ENV}_update_resume_views queue stats: ${JSON.stringify(queueStats)}`);

  if (queueStats.messageCount !== 0 && queueStats.messageCount >= queueStats.consumerCount * 2) {
    console.log('Queue is not empty, we need to wait some time');
    return;
  }

  const eligibleUser = await User.find(
    {
      'token.access_token': { $exists: true },
      'lastTimeViews.0': { $exists: true },
    },
    'id _id lastTimeViews'
  );
  eligibleUser.forEach(user => {
    if (user.lastTimeViews) {
      user.lastTimeViews.forEach(viewsResume => {
        channels[`${process.env.ENV}_update_resume_views`].sendToQueue(
          `${process.env.ENV}_update_resume_views`,
          Buffer.from(
            JSON.stringify({
              _id: user._id,
              id: user.id,
              resume_id: viewsResume.id,
            })
          ),
          { deliveryMode: true }
        );
      });
    }
  });
}

async function doExport() {
  await sendTokenUpdateTasks();
  await sendResumeUpdateTasks();
  await sendResumeViewsUpdateTasks();
}

function connect() {
  console.log('Conencting');
  amqp
    .connect(serverAddr)
    .then(conn => {
      // connection = conn;
      queueNames.forEach(queueName => {
        conn
          .createChannel()
          .then(ch => {
            const ok = ch.assertQueue(queueName, { durable: true });

            return ok.then(() => {
              channels[queueName] = ch;
              console.log('Connected:', queueName);
            });
          })
          .finally();
      });
      return conn;
    })
    .catch(ex => {
      console.log('Happened error:', ex);
      setTimeout(() => connect(), 5000);
    });

  setInterval(doExport, exportInteval);
}

setTimeout(() => {
  console.log('Starting...');
  connect();
}, 2000);
