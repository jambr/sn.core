'use strict';

class Status {
  constructor(controller) {
    this.controller = controller;
  }

  apply(server) {
    server.get('/status', this.controller.getStatus);
  }
}

module.exports = Status;
