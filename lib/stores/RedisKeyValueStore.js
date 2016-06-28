'use strict';
let redis = require('redis');

class RedisKeyValueStore {
  constructor(namespace) {
    this.namespace = namespace;
    this.client = redis.createClient();
  }

  get(key, done) {
    this.client.hget(this.namespace, key, (err, result) => {
      if(err) { return done(err); }
      done(null, JSON.parse(result));
    });
  }

  set(key, value, done) {
    let stringValue = JSON.stringify(value);
    this.client.hset(this.namespace, key, stringValue, done);
  }

  remove(key, done) {
    this.client.hdel(this.namespace, key, done);
  }

  flush(done) {
    this.client.del(this.namespace, done); 
  }
}
module.exports = RedisKeyValueStore;
