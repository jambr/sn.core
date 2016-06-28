'use strict';
let amqp = require('amqplib/callback_api');
let async = require('async');
let debug = require('debug')('sn:core:amqp');

class RabbitMQ {
  constructor(namespace) {
    this.namespace = namespace;
  }

  subscribe(key, handler, done) {
    let _assertQueue = (done) => {
      debug('asserting queue...');
      this._amqp.channel.assertQueue('', { exclusive: true }, done);
    };

    let _bindQueueToChannel = (q, done) => {
      debug('binding queue "' + q.queue + '" to channel...');
      this._amqp.queue = q.queue;
      this._amqp.channel.bindQueue(q.queue, this.namespace, key);
      done();
    };  

    let _consume = (done) => {
      debug('consuming messages from ' + this._amqp.queue + '...');
      this._amqp.channel.consume(this._amqp.queue, (msg) => {
        if(msg === null) { 
          return debug(this._consumerTag, 'consumer recieved null, presuming cancelled');
        }
        debug(this._consumerTag, 'message received');
        handler(JSON.parse(msg.content.toString()));
      }, { noAck: true }, (err, ok) => {
        this._consumerTag = ok.consumerTag;
        debug(ok.consumerTag, 'consume setup');
        done();
      });
    };

    async.waterfall([
        (done) => { this._setup(done); },
        _assertQueue,
        _bindQueueToChannel,
        _consume
    ], done);
  }

  publish(key, message, done) {
    async.waterfall([
        (done) => { this._setup(done); },
        (done) => {
          debug('publishing message...');
          this._amqp.channel.publish(this.namespace, key, new Buffer(JSON.stringify(message)));
          done();
        }
    ], done);
  }

  clearSubscriptions(done) {
    if(this._amqp) {
      let _cancelConsume = (done) => {
        debug('cancelling consumer...');
        this._amqp.channel.cancel(this._consumerTag, done);
      };

      let _unbindQueue = (done) => {
        debug('unbinding queue...');
        this._amqp.channel.unbindQueue(this._amqp.queue, this.namespace, '*', null, done);
      };

      let _deleteQueue = (done) => {
        debug('deleting queue...');
        this._amqp.channel.deleteQueue(this._amqp.queue, null, done);
      };

      let _closeChannel = (done) => {
        debug('closing channel...');
        this._amqp.channel.close(done);
      };

      let _closeConnection = (done) => {
        debug('closing connection...');
        this._amqp.conn.close(done);
      };

      let _clean = (done) => {
        delete this._amqp;
        done();
      };

      async.series([
          _cancelConsume,
          _unbindQueue,
          _deleteQueue,
          _closeChannel,
          _closeConnection,
          _clean
      ], done);
    } else {
      done();
    }
  }

  _setup(done) {
    if(this._amqp) { return done(); }
    this._amqp = {};

    let _connect = (done) => {
      debug('connecting amqp...');
      amqp.connect('amqp://localhost', done);
    }; 

    let _createChannel = (conn, done) => {
      this._amqp.conn = conn;
      debug('creating channel...');
      conn.createChannel(done);
    };

    let _assertExchange = (channel, done) => {
      this._amqp.channel = channel;
      debug('asserting exchange (' + this.namespace + ')...');
      channel.assertExchange(this.namespace, 'topic', { durable: true }, done);
    };

    async.waterfall([
        _connect,
        _createChannel,
        _assertExchange,
    ], () => { done(); });
  }
}

module.exports = RabbitMQ;
