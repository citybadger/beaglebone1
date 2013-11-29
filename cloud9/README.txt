===============
Getting started
===============

Information on the language is available at http://nodejs.org.

To get started, try running the blinkled.js app.

==================
Note on code state
==================

There is actually very little here right now, but I'm sharing this framework
to provide people with a starting point concept.  You can update this code
by performing 'git pull' in the Cloud9 IDE command bar at the bottom or by
performing the same command from the shell in the /var/lib/cloud9 folder.

I expect to have something that provides most of the Arduino functions and is
generally usable by Summer 2012.  The use of Arduino functions is for both
familiarity and because they represent a set of functions that new users have
been able to comprehend and utilize for interesting things.


========
Template
========

For a Bonescript application, you must currently manually 'require' the
bonescript library.  You will then typically define two functions, one called
'setup' and another one called 'loop'.  Bonescript will execute these
functions for you:

    require('bonescript');

    setup = function() {
      // Your setup function
    }

    loop = function() {
     // Your function to run in a loop
    }

You can also make loop an array of functions such that you can have several
parallel operations.


===
API
===


All functions in the ** categories take an optional callback.

-------------
New functions**
-------------
addLoop(loopFunc, loopDelay)
getLoops() -> loops
removeLoop(loopid)
doEval(evalFunc) -> value

-----------------
Arduino functions
-----------------
Digital I/O, Analog I/O, Advanced I/O and Time:**
analogRead(pin) -> value
analogWrite(pin, value, [freq])
attachInterrupt(pin, handler, mode)
detachInterrupt(pin)
delay(milliseconds)
digitalRead(pin) -> value
digitalWrite(pin, value)
getEeproms([callback]) -> eeproms
getPinMode(pin) -> pinMode
pinMode(pin, direction, [mux], [pullup], [slew])
shiftOut(dataPin, clockPin, bitOrder, val)

Bits/Bytes, Math, Trigonometry and Random Numbers:
lowByte(value)
highByte(value)
bitRead(value, bitnum)
bitWrite(value, bitnum, bitdata) 
bitSet(value, bitnum) 
bitClear(value, bitnum) 
bit(bitnum)
min(x, y)
max(x, y)
abs(x)
constrain(x, a, b)
map(value, fromLow, fromHigh, toLow, toHigh)
pow(x, y)
sqrt(x)
sin(radians)
cos(radians)
tan(radians)
randomSeed(x)
random([min], max)


===================
Note on performance
===================

This code is totally unoptimized.  The list of possible optimizations that run
through my head is staggering.  The good news is that I think it can all be
done without impacting the API, primarily thanks to the introspection
capabilities of JavaScript.

Eventually, this is planned to enable real-time usage, directly from
JavaScript.  The plan is to attact the ability to use this programming environment
in real-time on several fronts:
* Enabling multiple loops and analyzing them to determine if they can be off-
  loaded to a PRU.  This will be the primary mechanism for providing real-time
  servicing of the IOs.
* Providing higher-order services that utilize the standard peripherals for
  their intended use:
  - Serial drivers for I2C, SPI, UARTs, etc.
  - analogWrite for PWMs using hardware PWMs, timers, kernel GPIO drivers, etc.
* Adding real-time patches to the kernel


================================
Note on asynchronous programming
================================

The JavaScript language provides some features that I think are really cool
for doing embedded programming and node.js does some things to help enable
that.  The primary one is that the I/O functions are all asynchronous.  For
embedded systems, this is especially useful for performing low-latency tasks
that respond to events in the system.  What makes JavaScript so much easier
than other languages for doing this is that it keeps the full context around
the handler, so you don't have to worry about it.

Microcontroller users, however, are quite accustomed to programming operation
after operation in a sequential manner, rather than using events to trigger
operations.  My solution will be to utilize the 'setup' and 'loop' constructs
that provide something familiar, but to then layer-on the idea of having
handlers for events and multiple loops.  Stay tuned.


=================
Short-term issues
=================

* Need a real pinmux driver
* The rate of toggling a GPIO is too low.  Without going to PWM, I need to add
  a mechanism for speeding up back-to-back accesses.
* Delay operations currently fully load the CPU.  The concept of 'fibers' that
  add threads to node.js is a good compromise that can be abstracted away from
  the user.

