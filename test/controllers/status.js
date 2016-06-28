'use strict';
let Controllers = require('../../lib/controllers');
let deride = require('deride');

describe('Controller: Status', () => {
  let controller;
  beforeEach(() => {
    controller = new Controllers.Status();
  });

  it('Should return a status object', (done) => {
    let mockResponse = deride.stub(['send']);
    controller.getStatus(null, mockResponse, () => {
      mockResponse.expect.send.called.withArg({
        status: 'up'
      });
      done();
    });
  });
});
