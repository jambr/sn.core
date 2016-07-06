'use strict';
let restify = require('restify');
let Controllers = require('./controllers');
let Routes = require('./routes');

function Server(port) {
  let server = restify.createServer({
    name: require('../package.json').name,
    version: require('../package.json').version
  });

  server.use(restify.acceptParser(server.acceptable));
  server.use(restify.queryParser());
  server.use(restify.bodyParser());

  this.use = (thing) => {
    server.use(thing);
  };

  this.applyRoute = (route) => {
    route.apply(server);
  };

  this.start = (done) => {
    server.listen(port,() => {
      done();
    });
  };

  this.stop = () => {
    server.close();
  };

  Object.keys(Controllers).forEach(key => {
    let controller = new Controllers[key]();
    let route = new Routes[key](controller);
    this.applyRoute(route);
  });

  return Object.freeze(this);
}

module.exports = Server;
