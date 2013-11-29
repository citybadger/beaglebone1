// Copyright (C) 2011 - Texas Instruments, Jason Kridner 
//
// 
var fs = require('fs');
var child_process = require('child_process');
var http = require('http');
var url = require('url');
var path = require('path');
var cluster = require('cluster');
var eeprom = require('./eeprom');
var bone = require('./bone').bone;
exports.bone = bone;

var myrequire = function(packageName, onfail) {
    var y = {};
    try {
        y = require(packageName);
        y.exists = true;
    } catch(ex) {
        y.exists = false;
        console.log("Optional package '" + packageName + "' not loaded");
        if(onfail) onfail();
    }
    return(y);
};

var socketio = myrequire('socket.io', function() {
    console.log("Dynamic web features not enabled");
});
var systemd = myrequire('systemd', function() {
    console.log("Startup as socket-activated service under systemd not enabled");
});

var misc = myrequire('./build/Release/misc');

OUTPUT = exports.OUTPUT = "out";
INPUT = exports.INPUT = "in";
INPUT_PULLUP = exports.INPUT_PULLUP = "in_pullup";
HIGH = exports.HIGH = 1;
LOW = exports.LOW = 0;
LSBFIRST = exports.LSBFIRST = 1;  // used in: shiftOut(dataPin, clockPin, bitOrder, val)
MSBFIRST = exports.MSBFIRST = 0;
CHANGE = exports.CHANGE = "both";
RISING = exports.RISING = "rising";
FALLING = exports.FALLING = "falling";

// Keep track of allocated resources
var gpio = [];
var pwm = [];

getPinMode = exports.getPinMode = function(pin, callback) {
    var muxFile = '/sys/kernel/debug/omap_mux/' + pin.mux;
    //console.log('getPinMode(' + pin.key + '): ' + muxFile);
    var parseMux = function(readout) {
        //console.log('' + readout);
        var mode = {};
        // The format read from debugfs looks like this:
        // name: mcasp0_axr0.spi1_d1 (0x44e10998/0x998 = 0x0023), b NA, t NA
        // mode: OMAP_PIN_OUTPUT | OMAP_MUX_MODE3
        // signals: mcasp0_axr0 | ehrpwm0_tripzone | NA | spi1_d1 | mmc2_sdcd_mux1 | NA | NA | gpio3_16
        var breakdown = '';
        try {
            breakdown = readout.split('\n');
        } catch(ex) {
            console.log('Unable to parse mux readout "' + readout + '": ' + ex);
            return(mode);
        }
        try {        
            // Parse the muxmode number, '3' in the above example
            mode.mux = breakdown[1].split('|')[1].substr(-1);
            // Parse the mux register value, '0x0023' in the above example
            var pinData = parseInt(breakdown[0].split('=')[1].substr(1,6));
            //console.log('pinData = ' + pinData);
            mode.slew = (pinData & 0x40) ? 'slow' : 'fast';
            mode.rx = (pinData & 0x20) ? 'enabled' : 'disabled';
            var pullup = (pinData & 0x18) >> 3;
            switch(pullup) {
            case 1:
                mode.pullup = 'disabled';
                break;
            case 2:
                mode.pullup = 'pullup';
                break;
            case 0:
                mode.pullup = 'pulldown';
                break;
            case 3:
            default:
                console.error('Unknown pullup value: '+pullup);
            }
        } catch(ex2) {
            console.log('Unable to parse mux mode "' + breakdown + '": ' + ex2);
        }
        try {
            mode.options = breakdown[2].split('|');
            for(var option in mode.options) {
                var x = ''+mode.options[option];
                try {
                    mode.options[option] = x.replace(/ /g, '').replace('signals:', '');
                } catch(ex) {
                    console.log('Unable to parse option "' + x + '": ' + ex);
                    mode.options[option] = 'NA';
                }
            }
        } catch(ex3) {
            console.log('Unable to parse options "' + breakdown + '": ' + ex3);
            mode.options = null;
        }
        return(mode);
    };
    var readMux = function(err, data) {
        var mode = parseMux(data);
        mode.pin = pin.key;
        callback(mode);
    };
    if(callback) {
        path.exists(muxFile, function(exists) {
            if(exists) {
                fs.readFile(muxFile, 'utf8', readMux);
            } else {
                // default mux
                callback({'pin': pin.key});
                console.log('getPinMode(' + pin.key + '): no valid mux data');
            }
        });
    } else {
        try {
            var data = fs.readFileSync(muxFile, 'utf8');
            var mode = parseMux(data);
            mode.pin = pin.key;
            return(mode);
        } catch(ex) {
            console.log('getPinMode(' + pin.key + '): ' + ex);
            return({'pin': pin.key});
        }
    }
};

pinMode = exports.pinMode = function(pin, direction, mux, pullup, slew, callback) {
    if(direction == INPUT_PULLUP) pullup = 'pullup';
    pullup = pullup || ((direction == INPUT) ? 'pulldown' : 'disabled');
    slew = slew || 'fast';
    mux = mux || 7; // default to GPIO mode
    //console.log('pinmode(' + [pin.key, direction, mux, pullup, slew].join(',') + ')');
    
    if(!pin.mux) {
        console.log('Invalid pin object for pinMode: ' + pin);
        throw('Invalid pin object for pinMode: ' + pin);
    }

    var muxFile = '/sys/kernel/debug/omap_mux/' + pin.mux;
    var gpioFile = '/sys/class/gpio/gpio' + pin.gpio + '/value';
    
    // Handle case where pin is allocated as a gpio-led
    if(pin.led) {
        if((direction != OUTPUT) || (mux != 7)) {                    
            console.log('pinMode only supports GPIO output for LEDs: ' + pin);
            if(callback) callback(false);
            return(false);
        }
        gpioFile = '/sys/class/leds/beaglebone::' + pin.led + '/brightness';
    }

    // Figure out the desired value
    var pinData = 0;
    if(slew == 'slow') pinData |= 0x40;
    if(direction != OUTPUT) pinData |= 0x20;
    switch(pullup) {
    case 'disabled':
        pinData |= 0x08;
        break;
    case 'pullup':
        pinData |= 0x10;
        break;
    default:
        break;
    }
    pinData |= (mux & 0x07);
    
    try {
        var fd = fs.openSync(muxFile, 'w');
        fs.writeSync(fd, pinData.toString(16), null);
    } catch(ex) {
        console.error('Unable to configure mux for pin ' + pin + ': ' + ex);
        gpio[n] = {};
        if(callback) callback(false);
        return(false);
    }

    // Enable GPIO, if not already done
    var n = pin.gpio;
    if(mux == 7) {
        if(!gpio[n] || !gpio[n].path) {
            gpio[n] = {'path': gpioFile};
    
            if(pin.led) {
                fs.writeFileSync(
                    "/sys/class/leds/beaglebone::" + pin.led + "/trigger",
                    "gpio");
            } else {    
                // Export the GPIO controls
                var exists = path.existsSync(gpioFile);
                if(exists) {
                    //console.log("gpio: " + n + " already exported.");
                    fs.writeFileSync("/sys/class/gpio/gpio" + n + "/direction",
                        direction, null);
                } else {
                    try {
                        fs.writeFileSync("/sys/class/gpio/export", "" + n, null);
                        fs.writeFileSync("/sys/class/gpio/gpio" + n + "/direction",
                            direction, null);
                    } catch(ex) {
                        console.error('Unable to export gpio-' + n + ': ' + ex);
                        var gpioUsers = fs.readFileSync('/sys/kernel/debug/gpio', 'utf-8');
                        gpioUsers = gpioUsers.split('\n');
                        for(var x in gpioUsers) {
                            var y = gpioUsers[x].match(/gpio-(\d+)\s+\((\S+)\s*\)/);
                            if(y && y[1] == n) {
                                console.error('gpio-' + n + ' consumed by ' + y[2]);
                            }
                        }
                        gpio[n] = {};
                        if(callback) callback(false);
                        return(false);
                    }
                }
            }
        }
    } else {
        gpio[n] = {};
    }
    
    if(callback) callback(true);
    return(true);
};

digitalWrite = exports.digitalWrite = function(pin, value, callback) {
    var gpioFile = '/sys/class/gpio/gpio' + pin.gpio + '/value';
    if(pin.led) {
        gpioFile = '/sys/class/leds/beaglebone::' + pin.led + '/brightness';
    }
    if(callback) {
        fs.writeFile(gpioFile, '' + value, null, callback);
    } else {
        fs.writeFileSync(gpioFile, '' + value, null);
    }
    return(true);
};

digitalRead = exports.digitalRead = function(pin, callback) {
    var gpioFile = '/sys/class/gpio/gpio' + pin.gpio + '/value';
    if(callback) {
        var readFile = function(err, data) {
            var value = parseInt(data);
            callback({'value':value});
        };
        fs.readFile(gpioFile, readFile);
        return(true);
    }
    var value = parseInt(fs.readFileSync(gpioFile));
    return(value);
};

analogRead = exports.analogRead = function(pin, callback) {
    var ainFile = '/sys/bus/platform/devices/tsc/ain' + (pin.ain+1);
    if(callback) {
        var readFile = function(err, data) {
            var value = parseInt(data) / pin.scale;
            callback({'value': value});
        };
        fs.readFile(ainFile, readFile);
        return(true);
    }
    var data = parseInt(fs.readFileSync(ainFile));
    if(isNaN(data)) {
        throw('analogRead(' + pin.key + ') returned ' + data);
    }
    data = data / pin.scale;
    if(isNaN(data)) {
        throw('analogRead(' + pin.key + ') scaled to ' + data);
    }
    return(data);
}; 

shiftOut = exports.shiftOut = function(dataPin, clockPin, bitOrder, val, callback) {
  var i;
  var bit;
  for (i = 0; i < 8; i++)  
  {
    if (bitOrder == LSBFIRST) 
    {
         bit = val & (1 << i);
    } else
    {
         bit = val & (1 << (7 - i));
    }

    digitalWrite(dataPin, bit);
    digitalWrite(clockPin, HIGH);
    digitalWrite(clockPin, LOW);            
  }
};

attachInterrupt = exports.attachInterrupt = function(pin, handler, mode, callback) {
    if(!gpio[pin.gpio]) {
        if(callback) callback({'pin':pin, 'attached':false, 'configured':false});
        return(false);
    };
    if(gpio[pin.gpio].intProc) {
        if(callback) callback({'pin':pin, 'attached':false, 'configured':true});
        return(false);
    };
    console.log('Adding handler ' + handler + ' to pin ' + pin.key);
    var gpioFile = '/sys/class/gpio/gpio' + pin.gpio + '/value';
    fs.writeFileSync('/sys/class/gpio/gpio' + pin.gpio + '/edge', mode);
    var handler = (typeof handler === "string") ? eval('(' + handler + ')') : handler;
    var intHandler = function(m) {
        var output = handler({'pin':pin, 'value':m.value});
        if(output && callback) callback({'pin':pin, 'output':output});
    };
    var intProc;
    if(child_process.fork) {
        intProc = child_process.fork(__dirname + '/gpioint.js');
    } else {
        var fork = require('fork');
        intProc = fork.fork(__dirname + '/gpioint.js');
    }
    intProc.on('message', intHandler);
    intProc.on('exit', function(code, signal) {
        if(callback) callback({
            'pin':pin,
            'code':code,
            'signal':signal,
            'died':true
        });
    });
    intProc.send({'pin':pin, 'mode':mode, 'file':gpioFile});
    gpio[pin.gpio].intProc = intProc;
    process.on('SIGTERM', function() {
        intProc.kill();
        if(callback) callback({'pin':pin, 'died':true});
    });
    if(callback) callback({'pin':pin, 'attached':true});
    return(true);
};

detachInterrupt = exports.detachInterrupt = function(pin, callback) {
    if(!gpio[pin.gpio] || !gpio[pin.gpio].intProc) {
        if(callback) callback({'pin':pin, 'detached':false});
        return(false);
    };
    gpio[pin.gpio].intProc.kill();
    delete gpio[pin.gpio].intProc;
    if(callback) callback({'pin':pin, 'detached':true});
};

// See http://processors.wiki.ti.com/index.php/AM335x_PWM_Driver's_Guide
analogWrite = exports.analogWrite = function(pin, value, freq, callback) {
    freq = freq || 1000;
    var path = '/sys/class/pwm/' + pin.pwm.path;
    //var curMode = getPinMode(pin);
    // Not yet possible to implement this test
    //if(curMode.direction != OUTPUT) {
    //    throw(pin.key + ' must be configured as OUTPUT for analogWrite()');
    //}
    if(!pin.pwm) {
        throw(pin.key + ' does not support analogWrite()');
    }
    if(pwm[pin.pwm.path] && pwm[pin.pwm.path].key) {
        if(pwm[pin.pwm.path].key != pin.key) {
            throw(pin.key + ' requires pwm ' + pin.pwm.name +
                ' but it is already in use by ' +
                pwm[pin.pwm].key
            );
         }
    } else {
        pwm[pin.pwm.path] = {};
        pwm[pin.pwm.path].key = '' + pin.key;
        pwm[pin.pwm.path].freq = freq;
        pinMode(pin, OUTPUT, pin.pwm.muxmode, 'disabled', 'fast');

        // Clear up any unmanaged usage
        fs.writeFileSync(path+'/request', '0');

        // Allocate and configure the PWM
        fs.writeFileSync(path+'/request', '1');
        fs.writeFileSync(path+'/period_freq', freq);
        fs.writeFileSync(path+'/polarity', '0');
        fs.writeFileSync(path+'/run', '1');
    }
    if(pwm[pin.pwm.path].freq != freq) {
        fs.writeFileSync(path+'/run', '0');
        fs.writeFileSync(path+'/duty_percent', '0');
        fs.writeFileSync(path+'/period_freq', freq);
        fs.writeFileSync(path+'/run', '1');
        pwm[pin.pwm.path].freq = freq;
    }
    fs.writeFileSync(path+'/duty_percent', Math.round(value*100));
    if(callback) callback();
};

getEeproms = exports.getEeproms = function(callback) {
    var EepromFiles = {
        '/sys/bus/i2c/drivers/at24/1-0050/eeprom': { type: 'bone' },
        '/sys/bus/i2c/drivers/at24/3-0054/eeprom': { type: 'cape' },
        '/sys/bus/i2c/drivers/at24/3-0055/eeprom': { type: 'cape' },
        '/sys/bus/i2c/drivers/at24/3-0056/eeprom': { type: 'cape' },
        '/sys/bus/i2c/drivers/at24/3-0057/eeprom': { type: 'cape' },
    };
    var eeproms = eeprom.readEeproms(EepromFiles);
    if(eeproms == {}) {
        console.warn('No valid EEPROM contents found');
    }
    if(callback) {
        callback(eeproms);
    }
    return(eeproms);
};

myWorkers = [];
addLoop = exports.addLoop = function(loopFunc, loopDelay, callback) {
    console.log('Adding loop ' + loopFunc);
    loopDelay = loopDelay || 0;
    callback = callback || function(){};
    var worker = cluster.fork();
    process.on('SIGTERM', function() {
        worker.kill();
    });
    worker.on('message', function(m) {
        //console.log('Parent got message ' + JSON.stringify(m));
        if(m.resolve) {
            var pairs = [];
            for(var name in m.resolve) {
                var value = eval(m.resolve[name]);
                pairs.push({
                    'name': m.resolve[name],
                    'value': value.toString()
                });
            }
            worker.send({'vars': pairs});
        } else if(m.callback) {
            callback({'callback':m.value});
        }
    });
    myWorkers.push({
        'worker': worker,
        'loopFunc': loopFunc.toString(),
        'loopDelay': loopDelay
    });
    if(callback) {
        callback({'loopid':worker.pid});
    }
    return(worker.pid);
};

getLoops = exports.getLoops = function(callback) {
    var loops = {};
    for(var worker in myWorkers) {
        var id = myWorkers[worker].worker.pid;
        loops[id] = {};
        loops[id].loopFunc = myWorkers[worker].loopFunc;
        loops[id].loopDelay = myWorkers[worker].loopDelay;
    }
    if(callback) {
        callback({'loops':loops});
    }
    return(loops);
};

removeLoop = exports.removeLoop = function(loopId, callback) {
    for(var worker in myWorkers) {
        if(myWorkers[worker].worker.pid == loopId) {
            process.kill(loopId);
            myWorkers.splice(worker, 1);
            if(callback) {
                callback({'loopId':loopId, 'removed':true});
            }
            return(true);
	}
    }
    if(callback) {
        callback({'loopId':loopId, 'removed':false});
    }
    return(false);
};

doEval = exports.doEval = function(evalFunc, callback) {
    var evalFunc = (typeof evalFunc === "string") ? eval('(' + evalFunc + ')') : evalFunc;
    var value = evalFunc(callback);
    if(callback) callback({'value':value});
    return(value);
};

// Wait for some time
if(misc.exists) {
    delay = exports.delay = function(milliseconds, callback) {
        misc.delay(milliseconds);
        if(callback) callback();
    };
} else {
    delay = exports.delay = function(milliseconds, callback) {
        var startTime = new Date().getTime();
        while(new Date().getTime() < startTime + milliseconds) {
        }
        if(callback) callback();
    };
}
