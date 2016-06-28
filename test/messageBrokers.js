'use strict';
let MessageBrokers = require('../').Brokers;
let should = require('should');

describe('Brokers', () => {

  let testSuite = (type) => {
    describe(type, () => {
      let broker;
      before(() => {
        broker = new MessageBrokers[type]('sn:core:testing');
      });

      beforeEach(done => {
        broker.clearSubscriptions(done);
      });

      afterEach(done => {
        broker.clearSubscriptions(done);
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

      it('Should not allow multiple subscriptions to the same channel (for now)', (done) => {
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
    });
  };

  Object.keys(MessageBrokers).forEach(testSuite);
});
