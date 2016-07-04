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

  let connect = (done) => {
    amqp.connection.connect((err) => {
      if(err) { return done(err); }
      amqp.connection.createChannel((err, channel) => {
        if(err) { return done(err); }
        amqp.channel = channel;
        done(null);
      });
    });
  };

  let disconnect = (done) => {
    amqp.connection.close(done);
  };

  let assertTopicExchange = (done) => {
    amqp.channel.assertTopicExchange(namespace, { durable: true }, (err, exchange) => {
      if(err) { return done(err); }
      amqp.exchange = exchange;
      done(null);
    }); 
  };

  let assertQueue = (queueName, queueOptions, done) => {
    amqp.channel.assertQueue(queueName, queueOptions, done);
  };

  let subscribe = (queueName, filters, handler, opts, done) => {
    let queue;

    let _bindQueueToExchange = (q, next) => {
      queue = q;
      queues.push(q);
      if(!(filters instanceof Array)) {
        filters = [filters];
      }
      async.forEach(filters, (filter, next) => {
        amqp.channel.bindQueueToExchange(queue, amqp.exchange, filter, next);
      }, next);
    };

    let _consumeQueue = (next) => {
      // exlusive queues are non-persistent death on disconnect queues
      // subsequently, we don't want to have to ack and nack them
      let noAck = opts.exclusive;
      amqp.channel.consumeQueue(queue, handler, noAck, (err) => {
        next(err, queue);
      });
    };

    let _setupQueue = (next) => {
      assertQueue(queueName, opts, next); 
    };

    async.waterfall([
        connect,
        assertTopicExchange,
        _setupQueue, 
        _bindQueueToExchange,
        _consumeQueue],
        done);
  };

  let publishWithOptions = (key, message, options, done) => {
    let _publish = (done) => {
      amqp.channel.publish(amqp.exchange, key, message, options, done);
    };

    async.waterfall([
        connect,
        assertTopicExchange,
        _publish],
        done);
  };

  this.subscribePersistent = (filter, name, handler, done) => {
    subscribe(namespace + '/' + name, filter, handler, { exclusive: false }, done);
  };

  this.subscribe = (filter, handler, done) => {
    subscribe(namespace + '/' + uuid.v4(), filter, handler, { exclusive: true }, done);
  };

  // TODO: Create a single reply-to queue and assert on the correlation id
  // At the moment, we have a reply queue per RPC request
  this.rpc = (key, message, rpcResultHandler, rpcSentHandler) => {
    let corrId = uuid.v4();
    let queue;

    let _setupReplyQueue = (next) => {
      assertQueue('', { exclusive: true }, (err, q) => {
        queue = q;
        next();
      }); 
    };

    let _consumeReplyQueue = (next) => {
      amqp.channel.consumeQueue(queue, (msg, meta, ack) => { 
        rpcResultHandler(msg, meta, () => {
          ack(); 
          async.series([
            (next) => { amqp.channel.stopConsumingQueue(queue, next); },
            (next) => { amqp.channel.deleteQueue(queue, next); }
          ]);
        });
      }, false, next);
    };

    let _publish = (done) => {
      publishWithOptions(key, message, { correlationId: corrId, replyTo: queue.name }, done);
    };

    async.waterfall([
        connect,
        _setupReplyQueue,
        _consumeReplyQueue,
        _publish
    ], () => {
      if(rpcSentHandler) { rpcSentHandler(); }
    });

  };

  this.publish = (key, message, done) => {
    publishWithOptions(key, message, null, done);
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
        disconnect
    ], done);
  };

  return Object.freeze(this);
}
module.exports = RabbitMQ;
