'use strict';
let amqp = require('amqplib/callback_api');
let debug = require('debug')('sn:core:amqp');
let async = require('async');

class AmqpState {
  handle(key, error, done) {
    return (err, value) => {
      if(err) {
        return done(error);
      }
      if(key) {
        this[key] = value;
      }
      done();
    };
  }
  clear() {
    Object.keys(this).forEach(key => {
      delete this[key];
    });
  }
}

class RabbitMQ {
  constructor(exchange) {
    this.exchange = exchange;
    this.amqpState = new AmqpState();
  }

  _sequence(functions, complete) {
    async.eachSeries(functions, (f, done) => {
      f.bind(this)(done);
    }, complete);
  }

  _connect(done) {
    if(this.amqpState && this.amqpState.conn) {
      debug('amqp already connected!');
      return done();
    }
    debug('connecting amqp...');
    amqp.connect(
        'amqp://localhost', 
        this.amqpState.handle(
          'conn',
          'Failed to connect to AMQP',
          done)
        );
  } 

  _createChannel(done) {
    if(this.amqpState && this.amqpState.channel) {
      debug('amqp channel already connected!');
      return done();
    }

    debug('creating amqp channel...');
    this.amqpState.conn.createChannel(
        this.amqpState.handle(
          'channel',
          'Failed to create AMQP Channel',
          done)
        );
  }

  _assertExchange(done) {
    debug('asserting exchange (' + this.exchange + ')...');
    this.amqpState.channel.assertExchange(
        this.exchange, 'topic', { durable: true }, 
        this.amqpState.handle(
          'exchange',
          'Failed to assert AMQP Exchange',
          done)
        );
  }

  _assertQueue(done) {
    debug('asserting queue...');
    this.amqpState.channel.assertQueue(
        '', { exclusive: true }, 
        this.amqpState.handle(
          'queue',
          'Failed to assert AMQP Queue',
          done)
        );
  }


  subscribe(key, handler, done) {
    let _bindQueueToChannel = (done) => {
      let queue = this.amqpState.queue.queue;
      debug('binding queue "' + queue + '" to channel...');
      this.amqpState.channel.bindQueue(
          queue, this.exchange, key, null,
          this.amqpState.handle(
            null,
            'Failed to bind AMQP Queue to Channel',
            done)
          );
    };  

    let _consume = (done) => {
      let queue = this.amqpState.queue.queue;
      debug('consuming messages from ' + queue + '...');
      this.amqpState.channel.consume(queue, (msg) => {
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

    this._sequence([ 
        this._connect,
        this._createChannel, 
        this._assertExchange,
        this._assertQueue,
        _bindQueueToChannel,
        _consume],
        done);
  }

  publish(key, message, done) {
    let _publish = (done) => {
      debug('publishing message...');
      this.amqpState.channel.publish(this.exchange, key, new Buffer(JSON.stringify(message)));
      done();
    };

    this._sequence([
        this._connect,
        this._createChannel,
        this._assertExchange,
        _publish], 
        done);
  }

  clearSubscriptions(done) {
    if(this.amqpState.conn) {
      let _cancelConsume = (done) => {
        debug('cancelling consumer...');
        this.amqpState.channel.cancel(this._consumerTag, done);
      };

      let _unbindQueue = (done) => {
        debug('unbinding queue...');
        this.amqpState.channel.unbindQueue(this.amqpState.queue.queue, this.exchange, '*', null, done);
      };

      let _deleteQueue = (done) => {
        debug('deleting queue...');
        this.amqpState.channel.deleteQueue(this.amqpState.queue.queue, null, done);
      };

      let _closeChannel = (done) => {
        debug('closing channel...');
        this.amqpState.channel.close(done);
      };

      let _closeConnection = (done) => {
        debug('closing connection...');
        this.amqpState.conn.close(done);
      };

      let _clean = (done) => {
        this.amqpState.clear();
        done();
      };

      this._sequence([
          _cancelConsume,
          _unbindQueue,
          _deleteQueue,
          _closeChannel,
          _closeConnection,
          _clean], 
          done);
    } else {
      done();
    }
  }

}

module.exports = RabbitMQ;
