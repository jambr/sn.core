'use strict';
let redis = require('redis');

function RedisStore(namespace) {
  let client = redis.createClient();

  this.get = (key, done) => {
    client.hget(namespace, key, (err, result) => {
      if(err) { return done(err); }
      done(null, JSON.parse(result));
    });
  };

  this.set = (key, value, done) => {
    let stringValue = JSON.stringify(value);
    client.hset(namespace, key, stringValue, done);
  };

  this.remove = (key, done) => {
    client.hdel(namespace, key, done);
  };

  this.keys = (done) => {
    client.hkeys(namespace, done);
  };

  this.flush = (done) => {
    client.del(namespace, done); 
  };
}
module.exports = RedisStore;
