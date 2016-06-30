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

  let _subscribe = (queueName, filters, handler, opts, done) => {
    let queue;
    let _assertQueue = (done) => {
      amqp.channel.assertQueue(queueName, opts, done);
    };
    let _bindQueueToExchange = (q, done) => {
      queue = q;
      queues.push(q);
      if(!(filters instanceof Array)) {
        filters = [filters];
      }
      async.forEach(filters, (filter, next) => {
        amqp.channel.bindQueueToExchange(queue, amqp.exchange, filter, next);
      }, done);
    };
    let _consumeQueue = (done) => {
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

  this.subscribeWorker = (filter, handler, done) => {
    _subscribe('worker-' + filter, filter, handler, { exclusive: false }, done);
  };

  this.subscribe = (filter, handler, done) => {
    _subscribe(null, filter, handler, { exclusive: true }, done);
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
