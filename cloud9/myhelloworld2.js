#!/usr/bin/env node
var bb = require('bonescript');
var http = require('http');
var fs = require('fs');
var pconfig = require('./weatherstation/bmp085-pressure'); 


setup = function() {
    http.createServer(function (request, response) {
        response.writeHead(200,{'Content-Type': 'text/plain'});
        fs.readFile(pconfig.tempConfig.file, function(err, data) {
                if(err) throw("Unable to read data: " + err);
                response.write('tempData:' + data + '\t');
        });
        response.write('Hack Manhattan Enivromental Monitoring Station\n');
        response.write('Temperature: ' + 0 + '\t');
        response.write('Barometric Pressure: ' + 0 + '\t');
        response.write('Radiation: ' + 0 + '\t');
        response.end('\n');
    }).listen(4009);
};

loop = function() {

};

bb.run();