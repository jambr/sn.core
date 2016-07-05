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

      it('should allow me to do remote procedure calls', (done) => {
        broker.subscribePersistent(
          'filter.test.rpc',
          'filter-test-rpc-owner', (message, meta, ack) => {
          should(message).eql('test message'); 
          ack(null, 'and this is the result');     
        }, () => { 
          broker.rpc('filter.test.rpc', 'test message', (err, message, meta, ack) => {
            should(message).eql('and this is the result');
            ack();
            done();
          });    
        });
      });

      it('should allow me to bind to multiple channels', (done) => {
        broker.subscribe(['filter.test.multiple.channel1', 'filter.test.multiple.channel2'], (message) => {
          should(message).eql('test message'); 
          done();     
        }, () => { 
          broker.publish('filter.test.multiple.channel1', 'test message', (err) => {
            should.ifError(err);
          });    
        });
      });

      it('should publish to a given channel', (done) => {
        broker.subscribe('filter.test.givenchannel', (message) => {
          should(message).eql('test message'); 
          done();     
        }, () => { 
          broker.publish('filter.test.givenchannel', 'test message', (err) => {
            should.ifError(err);
          });    
        });
      });

      it('should handle a JSON message', (done) => {
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
        let gotMessage = (msg, meta, ack) => {
          ack();
          count++;
          if(count === 2) {
            done(new Error('Too many messages were recieved!'));
          } else {
            done();
          }
        };

        let setupChannel = (next) => {
          broker.subscribePersistent('filter.test.worker', 'persistent.test.worker', gotMessage, next);
        };

        let setupAnotherChannel = (next) => {
          broker.subscribePersistent('filter.test.worker', 'persistent.test.worker', gotMessage, next);
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
        broker.subscribePersistent(
            'filter.testingReconnect', 
            'persistent.test.reconnect', 
            (msg, meta, ack) => {
              ack();
              broker.reset(() => {
                broker.subscribePersistent(
                    'filter.testingReconnect', 
                    'persistent.test.reconnect', 
                    () => {
                      done(new Error('Got another message when we shouldnt have!'));
                    }, done);
              });
            }, () => {
              broker.publish('filter.testingReconnect', 'test', () => {});
            });
      });

      it('messages that get nakd (ie an error) get redlivered', (done) => {
        let first = true;
        broker.subscribePersistent(
            'filter.testingRedelivery', 
            'persistent.test.redelivery', 
            (msg, meta, ack) => {
              if(first) {
                first = false;
                return ack(new Error('something bad'));
              }
              ack();
              done();
            }, () => {
              broker.publish('filter.testingRedelivery', 'test', () => {});
            });
      });

    });
  };

  Object.keys(MessageBrokers).forEach(testSuite);
});
