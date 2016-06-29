'use strict';
let MessageBrokers = require('../').Brokers;
let should = require('should');
let async = require('async');

describe('Brokers', () => {

  let testSuite = (type) => {
    describe(type, () => {
      let broker;
      before(() => {
        broker = new MessageBrokers[type]('sn:core:testing');
      });

      beforeEach(done => {
        broker.reset(done);
      });

      afterEach(done => {
        broker.reset(done);
      });

      it('Should publish to a given channel', (done) => {
        broker.subscribe('test', (message) => {
          should(message).eql('test message'); 
          done();     
        }, () => { 
          broker.publish('test', 'test message', (err) => {
            should.ifError(err);
          });    
        });
      });

      it('Should handle a JSON message', (done) => {
        broker.subscribe('test', (message) => {
          should(message).eql({ data: 'test' }); 
          done();     
        }, () => {
          broker.publish('test', { data: 'test' }, (err) => {
            should.ifError(err);
          });    
        });
      });

      it('a message sent to a different channel shouldnt appear on my subscription', (done) => {
        let setupGoodChannel = (next) => {
          broker.subscribe('good-channel', () => {
            done();
          }, next);
        };

        let setupBadChannel = (next) => {
          broker.subscribe('bad-channel', () => {
            done(new Error('Message was receieved on the incorrect channel!'));
          }, next);
        };

        let sendMessage = (err) => {
          if(err) { return done(err); }
          broker.publish('good-channel', 'test message', (err) => {
            should.ifError(err);
          });   
        };

        async.series([
          setupGoodChannel,
          setupBadChannel
        ], sendMessage);

      });
    });
  };

  Object.keys(MessageBrokers).forEach(testSuite);
});
