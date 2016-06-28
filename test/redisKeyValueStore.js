'use strict';
let RedisKeyValueStore = require('../lib/stores/redisKeyValueStore');
let should = require('should');
let async = require('async');

describe('Redis KeyValueStore', () => {
  let client;
  before(() => {
    client = new RedisKeyValueStore('sn:core:testing');
  });
  beforeEach(done => {
    client.flush(done);
  });

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
