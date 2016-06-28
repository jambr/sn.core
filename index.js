'use strict';
module.exports = {
  Server: require('./lib/server'),
  KeyValueStore: require('./lib/stores/redisKeyValueStore')
};
