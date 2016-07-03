'use strict';
let Amqp = require('../amqp');
let async = require('async');
let uuid = require('node-uuid');

function RabbitMQ(namespace, url) {
  url = url || 'amqp://localhost';
  let amqp = {
    connection: new Amqp.Connection(url)
  };  
  let queues = [];
  this.namespace = namespace;

  let _connect = (done) => {
    amqp.connection.connect(() => {
      amqp.connection.createChannel((err, channel) => {
        if(err) { return done(err); }
        amqp.channel = channel;
        done(null);
      });
    });
  };
  let _disconnect = (done) => {
    amqp.connection.close(done);
  };
  let _assertTopicExchange = (done) => {
    amqp.channel.assertTopicExchange(namespace, { durable: true }, (err, exchange) => {
      if(err) { return done(err); }
      amqp.exchange = exchange;
      done(null);
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
      // exlusive queues are non-persistent death on disconnect queues
      // subsequently, we don't want to have to ack and nack them
      let noAck = opts.exclusive;
      amqp.channel.consumeQueue(queue, handler, noAck, done);
    };

    async.waterfall([
        _connect,
        _assertTopicExchange, 
        _assertQueue, 
        _bindQueueToExchange,
        _consumeQueue],
        done);
  };

  this.subscribePersistent = (filter, name, handler, done) => {
    _subscribe(namespace + '/' + name, filter, handler, { exclusive: false }, done);
  };

  this.subscribe = (filter, handler, done) => {
    _subscribe(namespace + '/' + uuid.v4(), filter, handler, { exclusive: true }, done);
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
