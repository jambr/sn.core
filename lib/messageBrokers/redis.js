'use strict';
let redis = require('redis');

class RedisMessageBroker {
  constructor(namespace) {
    this.namespace = namespace;
    this.subscriptions = {};
    this.sub = redis.createClient();
    this.pub = redis.createClient();

    this.sub.on('message', (channel, msg) => {
      this.subscriptions[channel](JSON.parse(msg));
    });
  }

  subscribe(channel, handler, done) {
    this.subscriptions[channel] = handler;
    this.sub.subscribe(channel);
    done();
  }

  publish(channel, message, done) {
    this.pub.publish(channel, JSON.stringify(message));
    done();
  }

  clearSubscriptions(done) {
    Object.keys(this.subscriptions).forEach(key => {
      this.sub.unsubscribe(key);
    });
    done();
  }
}
module.exports = RedisMessageBroker;
