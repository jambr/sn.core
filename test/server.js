'use strict';
let Server = require('../lib/server');
let restify = require('restify');
let should = require('should');

describe('Server', () => {
  let client, server;

  before(done => {
    let targetPort = 9001;
    client = restify.createJsonClient({
      url: 'http://127.0.0.1:' + targetPort,
      version: require('../package.json').version
    }); 
    server = new Server(targetPort);
    server.start(done);
  });

  after(() => {
    server.stop();
  });

  it('Return 200 on /status', (done) => {
    client.get('/status', (err, req, res) => {
      should.ifError(err);
      should(res.statusCode).eql(200);
      done();
    });
  });
});
