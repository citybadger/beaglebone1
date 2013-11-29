#!/usr/bin/env node
var bb = require('bonescript');
/* var io = require('socket.io'); */
var http = require('http');
var fs = require('fs');
var pconfig = require('./weatherstation/bmp085-pressure'); 
/* var pconfig = require('./weatherstation'); */
setup = function() {
/*
/*    var server = new bb.Server(4001,"myserver");
    server.begin();

    try {   
        fs.writeFileSync('/sys/class/i2c-adapter/i2c-3/new_device', 'bmp085 0x77', encoding='ascii');
    } catch(ex) { console.log('bmp085 driver load failed.'); }
*/    
    http.createServer(function (request, response) {
        response.writeHead(200,{'Content-Type': 'text/plain'});
        response.write('Hack Manhattan Enivromental Monitoring Station\n');
        
        var tdelay = pconfig.tempConfig.delay;
        var tscale = pconfig.tempConfig.scale;
        var tfileData = pconfig.tempConfig.file;
        var tempData;

/*        
        var treadData = function(fd) {
*/
        fs.readFile(tfileData, function(err, data) {
                if(err) throw("Unable to read data: " + err);
                tempData = data;
/*                
                socket.emit('tempdata', "" + data / tscale); 

                console.log('tempdata ',data);
                response.write(data); 
*/
        });
/*            setTimeout(treadData, tdelay);
        };
*/       
        response.write('Temperature: ' + tempData + '\t');
        response.write('Barometric Pressure: ' + 0 + '\t');
        response.write('Radiation: ' + 0 + '\t');
        response.end('\n');
    }).listen(4009);

*/
};

loop = function() {

};

bb.run();