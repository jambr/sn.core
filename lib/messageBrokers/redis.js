'use strict';
let redis = require('redis');

class Redis {
  constructor(namespace) {
    this.namespace = namespace;
    this.subscriptions = {};
    this.sub = redis.createClient();
    this.pub = redis.createClient();

    this.sub.on('message', (topic, msg) => {
      this.subscriptions[topic](JSON.parse(msg));
    });
  }

  subscribe(topic, handler, done) {
    this.subscriptions[topic] = handler;
    this.sub.subscribe(topic);
    done();
  }

  publish(topic, message, done) {
    this.pub.publish(topic, JSON.stringify(message));
    done();
  }

  clearSubscriptions(done) {
    Object.keys(this.subscriptions).forEach(key => {
      this.sub.unsubscribe(key);
    });
    done();
  }
}
module.exports = Redis;
