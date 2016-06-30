'use strict';
function DebugFactory() {
  let debugs = {};
  this.give = (routingKey) => {
    if(debugs[routingKey]) {
      return debugs[routingKey];
    }
    debugs[routingKey] = require('debug')(routingKey);
    return debugs[routingKey];
  }
  return Object.freeze(this);
}
module.exports = DebugFactory;
