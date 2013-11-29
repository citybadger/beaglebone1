exports.pressureConfig = {
    file: "/sys/bus/i2c/drivers/bmp085/3-0077/pressure0_input",
    unit: "mBar",
    delay: 5000,
    scale: 100,
    rangeHigh: 1100,
    rangeLow: 900,
};

exports.tempConfig = {
    file: "/sys/bus/i2c/drivers/bmp085/3-0077/temp0_input",
    unit: "° C",
    delay: 2000,
    scale: 10,
    rangeHigh: 40,
    rangeLow: -20,
};

exports.luxConfig = {
    file: "/sys/bus/i2c/drivers/tsl2550/3-0039/lux1_input",
    unit: "lux",
    delay: 2000,
    scale: 1,
    rangeHigh: 40,
    rangeLow: -20,
};


exports.humidityConfig = {
    file: "/sys/bus/i2c/drivers/sht21/3-0040/humidity1_input",
    unit: "%",
    delay: 2000,
    scale: 1000,
    rangeHigh: 100,
    rangeLow: 0,
};

exports.temp2Config = {
    file: "/sys/bus/w1/devices/28-000004474964/w1_slave",
    unit: "° C",
    delay: 2000,
    scale: 1000,
    rangeHigh: 125,
    rangeLow: -20,

};
