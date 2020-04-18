const amqp = require("amqplib");

const serverAddr = process.env.RABBITMQ_URL;
const q = `${process.env.ENV}_notifications`;
let channel;


setTimeout(() => start(), 10000);

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

    await proceedNotification(task);

    await new Promise((resolve) => setTimeout(resolve, 300));

    console.log(" [x] Done");
    channel.ack(msg);
  } catch (ex) {
    console.log("Error!", ex);
    channel.ack(msg);
  }
}

function proceedNotification(notification){
  console.log('proceedNotification', notification);
  // if (notification.action === "fakeDataMessage"){
  global.scenario.acceptNotification(notification);
  // }
}