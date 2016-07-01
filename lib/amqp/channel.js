'use strict';
let Exchange = require('./exchange');
let Queue = require('./queue');
let DebugFactory = require('../debugFactory');

function Channel(amqpChannel) {
  let debugFactory = new DebugFactory();
  let debug = debugFactory.give('sn:core:amqp:channel');

  // Creating and destroying exchanges
  this.assertTopicExchange = (name, options, done) => {
    debug(name, 'asserting topic'); 
    amqpChannel.assertExchange(name, 'topic', options, (err, ok) => {
      done(err, new Exchange(ok));
    });
  };
 
  // Creating and destroying queues
  this.assertQueue = (name, options, done) => {
    debug(name, 'asserting queue'); 
    amqpChannel.assertQueue(name, options, (err, ok) => {
      done(err, new Queue(ok));
    });
  };
  this.deleteQueue = (queue, done) => {
    debug(queue.name, 'deleting queue');
    amqpChannel.deleteQueue(queue.name, null, done);
  };
  this.consumeQueue = (queue, handler, done) => {
    debug(queue.name, 'consuming queue');
    if(queue.consumerTag) {
      return done(new Error('Queue is already being consumed!'));
    }
    let messageHandler = (msg) => {
      let message = JSON.parse(msg.content.toString());
      debugFactory.give('channel/' + msg.fields.routingKey)(message);
      handler(message, msg.fields);
    }; 
    amqpChannel.consume(queue.name, messageHandler, { noAck: true }, (err, ok) => {
        queue.consumerTag = ok.consumerTag;
        done(err);
    });
  };
  this.stopConsumingQueue = (queue, done) => {
    debug(queue.name, 'stopping consuming queue');
    amqpChannel.cancel(queue.consumerTag, () => {
      delete queue.consumerTag;
      done();
    });
  };

  // Binding and Unbinding queues for an exchange
  this.bindQueueToExchange = (queue, exchange, filter, done) => {
    debug(queue.name, 'binding to exchange with filter', filter);
    let args = null;
    amqpChannel.bindQueue(queue.name, exchange.name, filter, args, done);
  };
  this.unbindQueueFromExchange = (queue, exchange, filter, done) => {
    debug(queue.name, 'unbinding from exchange');
    let args = null;
    amqpChannel.unbindQueue(queue.name, exchange.name, filter, args, done);
  };

  this.publish = (exchange, key, message, done) => {
    debug(exchange.name, 'publishing message');
    amqpChannel.publish(exchange.name, key, new Buffer(JSON.stringify(message)));
    done();
  };
  return Object.freeze(this);
}
module.exports = Channel;