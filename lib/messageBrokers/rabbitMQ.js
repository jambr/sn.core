'use strict';
let Amqp = require('../amqp');
let async = require('async');

function RabbitMQ(namespace) {
  let amqp = {
    connection: new Amqp.Connection('amqp://localhost')
  };  
  let queues = [];

  let _connect = (done) => {
    amqp.connection.connect(() => {
      amqp.connection.createChannel((err, channel) => {
        amqp.channel = channel;
        done();
      });
    });
  };
  let _disconnect = (done) => {
    amqp.connection.close(done);
  };
  let _assertTopicExchange = (done) => {
    amqp.channel.assertTopicExchange(namespace, { durable: true }, (err, exchange) => {
      amqp.exchange = exchange;
      done(err);
    }); 
  };

  this.subscribe = (filter, handler, done) => {
    let queue;
    let _assertQueue = (done) => {
      amqp.channel.assertQueue(null, { exclusive: true }, done);
    };
    let _bindQueueToExchange = (q, done) => {
      queue = q;
      queues.push(q);
      amqp.channel.bindQueueToExchange(queue, amqp.exchange, filter, done);
    };
    let _consumeQueue = (ok, done) => {
      amqp.channel.consumeQueue(queue, handler, done);
    };

    async.waterfall([
        _connect,
        _assertTopicExchange, 
        _assertQueue, 
        _bindQueueToExchange,
        _consumeQueue],
        done);
  };

  this.publish = (key, message, done) => {
    let _publish = (done) => {
      amqp.channel.publish(amqp.exchange, key, message, done);
    };

    async.waterfall([
        _connect,
        _assertTopicExchange,
        _publish],
        done);
  };

  this.reset = (done) => {
    let _handleQueue = (queue, next) => {
      async.series([
          (done) => { amqp.channel.stopConsumingQueue(queue, done); },
          (done) => { amqp.channel.unbindQueueFromExchange(queue, amqp.exchange, '*', done); },
          (done) => { amqp.channel.deleteQueue(queue, done); },
      ], () => {
        queues.splice(queues.indexOf(queue), 1);
        next();
      });
    };

    let _removeQueues = (next) => {
      async.forEach(queues, _handleQueue, next);
    };

    async.series([
        _removeQueues,
        _disconnect
    ], done);
  };

  return Object.freeze(this);
}
module.exports = RabbitMQ;
