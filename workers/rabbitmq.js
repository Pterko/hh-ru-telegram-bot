const path = require("path");
// require('dotenv').config({path: path.join(process.cwd(), '/.env')});

const mongoose = require("mongoose");
const amqp = require("amqplib");

const User = require("../botModules/models/user");
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
let channels = {};
let connection;

const exportInteval = 10 * 1000; //we will check every 30 seconds that queue is empty

setTimeout(() => {
  console.log("Starting...");
  connect();
}, 2000);

function connect() {
  console.log("Conencting");
  amqp
    .connect(serverAddr)
    .then(function(conn) {
      connection = conn;
      queueNames.forEach((queueName) => {
        conn
          .createChannel()
          .then(function(ch) {
            var ok = ch.assertQueue(queueName, { durable: true });

            return ok.then(function() {
              channels[queueName] = ch;
              console.log("Connected:", queueName);
            });
          })
          .finally();
      });
      return conn;
    })
    .catch((ex) => {
      console.log("Happened error:", ex);
      setTimeout(() => connect(), 5000);
    });

  setInterval(doExport, exportInteval);
}

async function doExport() {
  await sendTokenUpdateTasks();
  await sendResumeUpdateTasks();
  await sendResumeViewsUpdateTasks();
}

async function sendTokenUpdateTasks() {
  let queueStats = await getQueueStats(`${process.env.ENV}_update_tokens`);

  console.log(
    `Current ${process.env.ENV}_update_tokens queue stats: ${JSON.stringify(
      queueStats
    )}`
  );

  if (
    queueStats.messageCount !== 0 &&
    queueStats.messageCount >= queueStats.consumerCount * 2
  ) {
    console.log("Queue is not empty, we need to wait some time");
    return;
  }

  let eligibleUser = await User.find(
    { "token.expires_at": { $lt: Math.ceil(Date.now() / 1000) } },
    "id _id"
  );
  eligibleUser.forEach((user) =>
    channels[`${process.env.ENV}_update_tokens`].sendToQueue(
      `${process.env.ENV}_update_tokens`,
      Buffer.from(JSON.stringify(user)),
      { deliveryMode: true }
    )
  );
  return;
}

async function sendResumeUpdateTasks() {
  let queueStats = await getQueueStats(`${process.env.ENV}_update_resumes`);

  console.log(
    `Current ${process.env.ENV}_update_resumes queue stats: ${JSON.stringify(
      queueStats
    )}`
  );

  if (
    queueStats.messageCount !== 0 &&
    queueStats.messageCount >= queueStats.consumerCount * 2
  ) {
    console.log("Queue is not empty, we need to wait some time");
    return;
  }

  let eligibleLastUpdateDate = new Date();
  eligibleLastUpdateDate.setHours(eligibleLastUpdateDate.getHours() - 4);

  let eligibleLastTryToUpdateDate = new Date();
  eligibleLastTryToUpdateDate.setHours(
    eligibleLastTryToUpdateDate.getHours() - 1
  );

  let eligibleUser = await User.find(
    {
      autoUpdatedResumes: {
        $elemMatch: {
          $or: [
            {
              lastTimeUpdate: { $lt: eligibleLastUpdateDate.getTime() },
            },
            {
              lastTryToUpdate: { $lt: eligibleLastTryToUpdateDate.getTime() },
            },
          ],
        },
      },
    },
    "id _id autoUpdatedResumes"
  );
  eligibleUser.forEach((user) => {
    if (user.autoUpdatedResumes) {
      user.autoUpdatedResumes.forEach((autoUpdatedResumes) => {
        channels[`${process.env.ENV}_update_resumes`].sendToQueue(
          `${process.env.ENV}_update_resumes`,
          Buffer.from(
            JSON.stringify({
              _id: user._id,
              id: user.id,
              resume_id: autoUpdatedResumes.id,
            })
          ),
          { deliveryMode: true }
        );
      });
    }
  });
  return;
}

async function sendResumeViewsUpdateTasks() {
  let queueStats = await getQueueStats(
    `${process.env.ENV}_update_resume_views`
  );

  console.log(
    `Current ${
      process.env.ENV
    }_update_resume_views queue stats: ${JSON.stringify(queueStats)}`
  );

  if (
    queueStats.messageCount !== 0 &&
    queueStats.messageCount >= queueStats.consumerCount * 2
  ) {
    console.log("Queue is not empty, we need to wait some time");
    return;
  }

  let eligibleUser = await User.find(
    { "lastTimeViews.0": { $exists: true } },
    "id _id lastTimeViews"
  );
  eligibleUser.forEach((user) => {
    if (user.lastTimeViews) {
      user.lastTimeViews.forEach((viewsResume) => {
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
  return;
}

async function getQueueStats(queueName) {
  let result = await channels[queueName].assertQueue(queueName);
  return result;
}
