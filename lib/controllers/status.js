'use strict';
class Status {
  getStatus(req, res, next) {
      res.send({
        status: 'up'
      });
      return next();
  }
}

module.exports = Status;
