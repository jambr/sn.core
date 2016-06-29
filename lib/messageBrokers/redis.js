'use strict';
let redis = require('redis');

function Redis(namespace) {
  this.namespace = namespace;
  let subscriptions = {};
  let sub = redis.createClient();
  let pub = redis.createClient();

  sub.on('message', (topic, msg) => {
    subscriptions[topic](JSON.parse(msg));
  });

  this.subscribe = (topic, handler, done) => {
    subscriptions[topic] = handler;
    sub.subscribe(topic);
    done();
  };

  this.publish = (topic, message, done) => {
    pub.publish(topic, JSON.stringify(message));
    done();
  };

  this.reset = (done) => {
    Object.keys(subscriptions).forEach(key => {
      sub.unsubscribe(key);
    });
    done();
  };
  return Object.freeze(this);
}
module.exports = Redis;
