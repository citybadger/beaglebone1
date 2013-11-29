#!/usr/bin/env node
var bb = require('bonescript');
var http = require('http');
var fs = require('fs');
var pconfig = require('./sensors'); 


setup = function() {
    http.createServer(function (request, response) {
        response.writeHead(200,{'Content-Type': 'text/html; charset=utf-8'});
        fs.readFile(pconfig.tempConfig.file, function(err, data) {
                if(err) throw("Unable to read data: " + err);
                response.write('tempData:' + data + '\t');
        });
        response.write('Hack Manhattan Enivromental Monitoring Station<br>');
        response.write('Temperature: ' + fs.readFileSync(pconfig.tempConfig.file)/pconfig.tempConfig.scale + pconfig.tempConfig.unit + ' ');
        response.write('Barometric Pressure: ' + fs.readFileSync(pconfig.pressureConfig.file)/pconfig.pressureConfig.scale + pconfig.pressureConfig.unit + ' ');
        response.write('Luminance: ' + fs.readFileSync(pconfig.luxConfig.file)/pconfig.luxConfig.scale + pconfig.luxConfig.unit + ' ');
        response.write('Radiation: ' + '?');
        response.end('<br>');
    }).listen(4009);
};

loop = function() {

};

bb.run();