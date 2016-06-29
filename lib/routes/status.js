'use strict';

function Status(controller) {
  this.apply = (server) => {
    server.get('/status', controller.getStatus);
  };
  return Object.freeze(this);
}

module.exports = Status;
