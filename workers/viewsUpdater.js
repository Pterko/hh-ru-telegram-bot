const path = require("path");
require("dotenv").config({ path: path.join(process.cwd(), "/.env") });

const amqp = require("amqplib");
const mongoose = require("mongoose");

const log4js = require("log4js");
const log = log4js.getLogger("hh-telegram-bot-token-updater");

const User = require("../botModules/models/user");
const LogMessage = require("../botModules/models/logMessage");

const hh = require("../hhApi");

mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const serverAddr = process.env.RABBITMQ_URL;
const q = `${process.env.ENV}_update_views`;
const outbound_queue_name = `${process.env.ENV}_notifications`;
let channel;

start();

async function start() {
  amqp
    .connect(serverAddr)
    .then(function(conn) {
      process.once("SIGINT", function() {
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
          console.log(" [*] Waiting for messages. To exit press CTRL+C");
        });

        let outOk = ch.assertQueue(outbound_queue_name, { durable: true });

        return outOk.then(function() {
          // channels[queueName] = ch;
          console.log("Connected to outbound queue");
        });

        return ok;
      });
    })
    .catch(console.warn);
}

async function proceedMessage(msg) {
  try {
    let body = msg.content.toString();
    let task = JSON.parse(body);

    await updateResumeViews(task);

    await new Promise((resolve) => setTimeout(resolve, 300));

    console.log(" [x] Done");
    channel.ack(msg);
  } catch (ex) {
    console.log("Error!", ex);
    channel.ack(msg);
  }
}

async function updateResumeViews(task) {
  const user = await User.findOne({ _id: task._id });

  return new Promise((resolve, reject) => {
    setTimeout(reject, 10000);
    hh.getMyResumes(task.user.token.access_token, (err, json) => {
      if (err) {
        log.error("Error ", err, " while processing user ", user);
        return;
      }
      log.info(`Received result from hhApi: ${result}`);
      if (!result) return;

      for (let resume of result.items) {
        log.info(`Check resume ${resume.id}`);
        //check what that resume in our updating list
        var oldResume = user.lastTimeViews.find((x) => x.id == resume.id);
        if (oldResume == undefined) {
          log.info(`Resume ${resume.id} don't needed to be monitored, skip it`);
          continue;
        }
        if (resume.new_views > oldResume.views) {
          //send message, that we have new views
          oldResume.views = resume.new_views;

          user.storage.resume.selectedResumeOffset = user.storage.resume.resumes.findIndex(
            (x) => JSON.parse(x).id == resume.id
          );

          // this.handler.sendFakeDataMessage('new_resume_view_incoming', user);
          sendNotification(user, {
            action: "fakeDataMessage",
            dataMessage: "new_resume_view_incoming",
          });

          log.info(`New views detected on resume ${resume.id}`);
          //currently this function support updating olny of one resume at the same time
          break;
        } else {
          log.info(`No new views detected on resume ${resume.id}`);
          oldResume.views = resume.new_views;
        }
      }
      log.info(`Work of gettin resume views with user ${user.id} ended.`);
      user.save();
    });
  });
}

function sendNotification(user, payload) {
  channel.sendToQueue(
    outbound_queue_name,
    Buffer.from(
      JSON.stringify({
        user: user,
        payload: payload,
      })
    ),
    { deliveryMode: true }
  );
}
