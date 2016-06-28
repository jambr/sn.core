'use strict';
let restify = require('restify');
let Controllers = require('./controllers');
let Routes = require('./routes');

class Server {
  constructor(port) {
    let server = restify.createServer({
      name: require('../package.json').name,
      version: require('../package.json').version
    });
    this.port = port;

    server.use(restify.acceptParser(server.acceptable));
    server.use(restify.queryParser());
    server.use(restify.bodyParser());

    Object.keys(Controllers).forEach(key => {
      let controller = new Controllers[key]();
      let routes = new Routes[key](controller);
      routes.apply(server);
    });

    this.server = server;
  }

  start(done) {
    this.server.listen(this.port,() => {
      done();
    });
  }

  stop() {
    this.server.close();
  }
}

module.exports = Server;
