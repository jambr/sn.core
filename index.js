'use strict';
let index = {
  Server: require('./lib/server'),
  Stores: require('./lib/stores'),
  Brokers: require('./lib/messageBrokers')
};

index.Default = {
  Store: index.Stores.Redis,
  Broker: index.Brokers.RabbitMQ
};

module.exports = index;
