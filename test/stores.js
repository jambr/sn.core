'use strict';
let Stores = require('../').Stores;
let should = require('should');
let async = require('async');

describe('Stores', () => {
  let store;
  let helpers = {
    addKey: (done) => {
      store.set('key', 'value', done);
    },
    checkKeyAdded: (done) => { 
      store.get('key', (err, value) => {
        should.ifError(err); 
        should(value).eql('value');
        done();
      });
    },
    removeKey: (done) => {
      store.remove('key', done);
    },
    checkKeyRemoved: (done) => { 
      store.get('key', (err, value) => {
        should.ifError(err); 
        should(value).eql(null);
        done();
      });
    }
  };

  let testSuite = (type) => {
    describe(type, () => {
      before(() => {
        store = new Stores[type]('sn:core:testing');
      });
      beforeEach(done => {
        store.flush(done);
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
