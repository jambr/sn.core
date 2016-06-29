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

  Object.keys(Controllers).forEach(key => {
    let controller = new Controllers[key]();
    let routes = new Routes[key](controller);
    routes.apply(server);
  });

  this.start = (done) => {
    server.listen(port,() => {
      done();
    });
  };

  this.stop = () => {
    server.close();
  };
  return Object.freeze(this);
}

module.exports = Server;
