var filefyBroker = require('../lib/index');

var port = process.env.PORT || 9999;
console.log('+ http://localhost:' + port + '/');

filefyBroker.listen(port, {
  log: function (severity, message) {
    console.log(severity[0] + ' ' + message);
  }
});
