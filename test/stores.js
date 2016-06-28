'use strict';
let Stores = require('../').Stores;
let should = require('should');
let async = require('async');

describe('Stores', () => {
  let client;
  let helpers = {
    addKey: (done) => {
      client.set('key', 'value', done);
    },
    checkKeyAdded: (done) => { 
      client.get('key', (err, value) => {
        should.ifError(err); 
        should(value).eql('value');
        done();
      });
    },
    removeKey: (done) => {
      client.remove('key', done);
    },
    checkKeyRemoved: (done) => { 
      client.get('key', (err, value) => {
        should.ifError(err); 
        should(value).eql(null);
        done();
      });
    }
  };

  let testSuite = (type) => {
    describe(type, () => {
      before(() => {
        client = new Stores[type]('sn:core:testing');
      });
      beforeEach(done => {
        client.flush(done);
      });

      it('Should add keys', (done) => {
        async.series([
            helpers.addKey, 
            helpers.checkKeyAdded
        ], done);
      });

      it('Should remove keys', (done) => {
        async.series([
            helpers.addKey, 
            helpers.checkKeyAdded, 
            helpers.removeKey, 
            helpers.checkKeyRemoved
        ], done);
      });
    });
  };

  Object.keys(Stores).forEach(testSuite);
});
