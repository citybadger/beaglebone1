var bb = require('bonescript');

setup = function() {
    var server = new bb.Server(6484, "smoothietest");
    server.begin();
};