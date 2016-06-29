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
        broker.subscribe('filter.test.givenchannel', (message) => {
          should(message).eql('test message'); 
          done();     
        }, () => { 
          broker.publish('filter.test.givenchannel', 'test message', (err) => {
            should.ifError(err);
          });    
        });
      });

      it('Should handle a JSON message', (done) => {
        broker.subscribe('filter.test.json', (message) => {
          should(message).eql({ data: 'test' }); 
          done();     
        }, () => {
          broker.publish('filter.test.json', { data: 'test' }, (err) => {
            should.ifError(err);
          });    
        });
      });

      it('a message sent to a different channel shouldnt appear on my subscription', (done) => {
        let setupGoodChannel = (next) => {
          broker.subscribe('filter.test.diff.chan1', () => {
            done();
          }, next);
        };

        let setupBadChannel = (next) => {
          broker.subscribe('filter.test.diff.chan2', () => {
            done(new Error('Message was receieved on the incorrect channel!'));
          }, next);
        };

        let sendMessage = (err) => {
          if(err) { return done(err); }
          broker.publish('filter.test.diff.chan1', 'test message', (err) => {
            should.ifError(err);
          });   
        };

        async.series([
            setupGoodChannel,
            setupBadChannel
        ], sendMessage);
      });

      it('messages should be received by all subscribers', (done) => {
        let count = 0;
        let gotMessage = () => {
          count++;
          if(count === 2) {
            done();
          }
        };

        let setupChannel = (next) => {
          broker.subscribe('filter.test.all', gotMessage, next);
        };

        let setupAnotherChannel = (next) => {
          broker.subscribe('filter.test.all', gotMessage, next);
        };

        let sendMessage = (err) => {
          if(err) { return done(err); }
          broker.publish('filter.test.all', 'test message', (err) => {
            should.ifError(err);
          });   
        };

        async.series([
            setupChannel,
            setupAnotherChannel
        ], sendMessage);
      });

      it('messages on worker subscriptions should be receieved by one', (done) => {
        let count = 0;
        let gotMessage = () => {
          count++;
          if(count === 2) {
            done(new Error('Too many messages were recieved!'));
          } else {
            done();
          }
        };

        let setupChannel = (next) => {
          broker.subscribeWorker('filter.test.worker', gotMessage, next);
        };

        let setupAnotherChannel = (next) => {
          broker.subscribeWorker('filter.test.worker', gotMessage, next);
        };

        let sendMessage = (err) => {
          if(err) { return done(err); }
          broker.publish('filter.test.worker', 'test message', (err) => {
            should.ifError(err);
          });   
        };

        async.series([
            setupChannel,
            setupAnotherChannel
        ], sendMessage);
      });

      it('messages already receieved shouldnt be receieved again on reconnect', (done) => {
        broker.subscribeWorker('filter.testingReconnect', () => {
          broker.reset(() => {
            broker.subscribeWorker('filter.testingReconnect', () => {
              done(new Error('Got another message when we shouldnt have!'));
            }, done);
          });
        }, () => {
          broker.publish('filter.testingReconnect', 'test', () => {});
        });
      });

    });
  };

  Object.keys(MessageBrokers).forEach(testSuite);
});
