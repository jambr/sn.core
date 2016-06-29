'use strict';
function Exchange(amqpExchange) {
  this.name = amqpExchange.exchange;
  return Object.freeze(this);
}
module.exports = Exchange;
