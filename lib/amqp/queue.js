'use strict';
function Queue(amqpQueue) {
  this.name = amqpQueue.queue;
}
module.exports = Queue;
