const amqp = require('amqplib');

const serverAddr = process.env.RABBITMQ_URL;
const q = `${process.env.ENV}_notifications`;
let channel;

function proceedNotification(notification) {
  console.log('proceedNotification', notification);
  // if (notification.action === "fakeDataMessage"){
  global.scenario.acceptNotification(notification);
  // }
}

async function proceedMessage(msg) {
  try {
    const body = msg.content.toString();
    const task = JSON.parse(body);

    await proceedNotification(task);

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

setTimeout(() => start(), 10000);
