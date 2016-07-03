'use strict';
let redis = require('redis');

function RedisStore(namespace, url) {
  url = url || 'redis://localhost:6379';
  let client = redis.createClient(url);

  this.get = (key, done) => {
    client.hget(namespace, key, (err, result) => {
      if(err) { return done(err); }
      done(null, JSON.parse(result));
    });
  };

  this.getAll = (done) => {
    client.hgetall(namespace, (err, results) => {
      if(results === undefined || results === null) {
        return done(null, null);
      }
      let keys = Object.keys(results);
      for(var x = 0; x < keys.length; x++) {
        let key = keys[x];
        let result = results[key];
        results[key] = JSON.parse(result);
      }
      done(err, results);
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
