'use strict';
let Amqp = require('../lib/amqp');
let assert = require('assert');
let deride = require('deride');

describe('AMQP', () => {
  describe('Connection', () => {
    it('should connect & disconnect', (done) => {
      let connection = new Amqp.Connection('amqp://localhost');
      connection.connect(err => {
        assert.ifError(err);
        connection.close(done);      
      });
    });

    it('should let me create a channel', (done) => {
      let connection = new Amqp.Connection('amqp://localhost');
      connection.connect(() => {
        connection.createChannel((err, channel) => {
          assert.ifError(err);
          assert(channel instanceof Amqp.Channel);      
          connection.close(done);
        });
      });
    });
  });

  describe('Channel', () => {
    let channel, connection;
    beforeEach(done => {
      connection = new Amqp.Connection('amqp://localhost');
      connection.connect(() => {
        connection.createChannel((err, chan) => {
          channel = chan;
          done(err);
        });
      });
    });
    afterEach(done => {
      connection.close(done);
    });

    it('should let me assert a topic exchange', (done) => {
      channel.assertTopicExchange('test-topic-exchange', { durable: true }, (err, exchange) => {
        assert(exchange instanceof Amqp.Exchange);     
        exchange.name.should.eql('test-topic-exchange'); 
        done(err);
      });
    });

    it('should let me assert a queue', (done) => {
      channel.assertQueue('test-queue', { exclusive: true }, (err, queue) => {
        assert(queue instanceof Amqp.Queue);     
        queue.name.should.eql('test-queue'); 
        done(err);
      });
    });

    it('should let me delete a queue', (done) => {
      channel.assertQueue('test-queue', { exclusive: true }, (err, queue) => {
        channel.deleteQueue(queue, done);
      });
    });

    it('should let me bind and unbind a queue to an exchange', (done) => {
      channel.assertTopicExchange('test-topic-exchange', { durable: true }, (err, exchange) => {
        channel.assertQueue('test-queue', { exclusive: true }, (err, queue) => {
          channel.bindQueueToExchange(queue, exchange, '*', (err) => {
            assert.ifError(err);
            channel.unbindQueueFromExchange(queue, exchange, '*', done);
          });
        });
      });
    });

    it('should let me consume and uncomsume a queue', (done) => {
      channel.assertTopicExchange('test-topic-exchange', { durable: true }, (err, exchange) => {
        channel.assertQueue('test-queue', { exclusive: true }, (err, queue) => {
          channel.bindQueueToExchange(queue, exchange, '*', () => {
            channel.consumeQueue(queue, deride.stub, (err) => {
              assert.ifError(err);
              channel.stopConsumingQueue(queue, done);
            });
          });
        });
      });
    });

  });
});
