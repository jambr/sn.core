'use strict';
function Status() {
  this.getStatus = (req, res, next) => {
      res.send({
        status: 'up'
      });
      return next();
  };
  return Object.freeze(this);
}

module.exports = Status;
