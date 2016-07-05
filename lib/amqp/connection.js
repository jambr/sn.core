'use strict';
let amqp = require('amqplib/callback_api');
let debug = require('debug')('sn:core:amqp:connection');
let Channel = require('./channel');

function Connection(address) {
  let _connection = null;
  let _channel = null;

  this.connect = (done) => {
    if(_connection !== null) {
      return done(null, _connection);
    }
    debug('connecting...');
    amqp.connect(address, {
      heartbeat: 30
    }, (err, ok) => {
      if(err) { 
        debug('connection failed!');
        return done(err);
      }

      debug('connection established!');
      _connection = ok;
      done();
    });
  };
  this.close = (done) => {
    if(_connection === null) {
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
    if(_channel !== null) {
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
