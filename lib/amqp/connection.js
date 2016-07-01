'use strict';
let amqp = require('amqplib/callback_api');
let debug = require('debug')('sn:core:amqp:connection');
let Channel = require('./channel');

function Connection(address) {
  let _connection;
  let _channel;

  this.connect = (done) => {
    if(_connection) {
      return done(_connection);
    }
    debug('connecting...');
    amqp.connect(address, (err, ok) => {
      _connection = ok;
      done(err);
    });
  };
  this.close = (done) => {
    if(!_connection) {
      debug('connection already disconnected');
      return done();
    }
    debug('disconnecting...');
    _connection.close(() => {
      _connection = null;
      _channel = null;
      done();
    });
  };
  this.createChannel = (done) => {
    if(_channel) {
      return done(null, _channel);
    }
    debug('creating channel');
    _connection.createChannel((err, ok) => {
      _channel = new Channel(ok);
      done(err, _channel);
    });
  };
  return Object.freeze(this);
}
module.exports = Connection;
