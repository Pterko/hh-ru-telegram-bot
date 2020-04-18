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
const q = `${process.env.ENV}_update_tokens`;
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
        return ok;
      });
    })
    .catch(console.warn);
}

async function proceedMessage(msg) {
  try {
    let body = msg.content.toString();
    let task = JSON.parse(body);

    await updateUserToken(task);

    await new Promise((resolve) => setTimeout(resolve, 300));

    console.log(" [x] Done");
    channel.ack(msg);
  } catch (ex) {
    console.log("Error!", ex);
    channel.ack(msg);
  }
}

async function updateUserToken(task) {
  const user = await User.findOne({ _id: task._id });
  if (user.token.access_token == undefined || user.token.access_token == null) {
    // useless user, don't have resume, that needed to be monitored
    log.info(`User ${user.id} doesn't have a token, ignore it`);
    LogMessage.create({
      userid: user.id,
      action: "token_update",
      text: `Возникла ошибка при обновлении: пользователь не имеет токена авторизации.`,
      object: { user },
    });
    return;
  }

  if (user.token.expires_at > Math.ceil(Date.now() / 1000)) {
    log.info(`User ${user.id} don't look like expired`);
    LogMessage.create({
      userid: user.id,
      action: "token_update",
      text: `Возникла ошибка при обновлении: пользователь не выглядит так, как будто его токен нужно обновить.`,
      object: { user },
    });
    return;
  }
  return new Promise((resolve, reject) => {
    setTimeout(reject, 10000);
    hh.updateToken(
      user.token.access_token,
      user.token.refresh_token,
      (err, json) => {
        if (err) {
          log.error(
            "Error ",
            err,
            " while processing token for user ",
            user.id,
            "Also res is ",
            json
          );
          if (
            (err.error == "invalid_grant" || err.error == "invalid_request") &&
            (err.error_description == "token deactivated" ||
              err.error_description == "bad token" ||
              err.error_description == "token was revoked" ||
              err.error_description == "token has already been refreshed" ||
              err.error_description == "token not found")
          ) {
            //we need to delete a token for this user
            log.info(`Delete a token for user ${user.id}`);
            user.token = undefined;
            user.save();
          }

          LogMessage.create({
            userid: user.id,
            action: "token_update",
            text: `Возникла ошибка при обновлении: ${err.error_description}`,
            object: { err: err, json: json },
          });
          return;
        }
        log.info(json);
        user.token = json;
        LogMessage.create({
          userid: user.id,
          action: "token_update",
          text: `Успешное обновление токена`,
          object: { err: err, json: json },
        });
        //user.token.expires_at = Date.now() + parseInt(user.token.expires_in);
        user.token.expires_at =
          Math.round(Date.now() / 1000) + parseInt(json.expires_in);
        log.warn(user);
        user.markModified("token");
        log.info(`Work of updating token with user ${user.id} ended.`);
        user.save();
        resolve();
      }
    );
  });
}
