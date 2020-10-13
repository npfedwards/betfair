// (C) 2016 Anton Zemlyanov, rewritten in JavaScript 6 (ES6)
'use strict';

/*
 * This logger generates bunyan-compatible logs
 * use 'npm install -g bunyan' to install log formatter
 */

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var os = require('os');
var fs = require('fs');
var _ = require('lodash');

var LOG_LEVELS = {
    TRACE: 10,
    DEBUG: 20,
    INFO: 30,
    WARN: 40,
    ERROR: 50,
    FATAL: 60
};

var Logger = function () {
    function Logger(name) {
        var _this = this;

        var logLevel = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'INFO';

        _classCallCheck(this, Logger);

        this.name = name;
        this.currentLogLevel = LOG_LEVELS[logLevel.toUpperCase()];
        this.logs = [];

        ['trace', 'debug', 'info', 'warn', 'error', 'fatal'].forEach(function (level) {
            _this[level] = function (message, data) {
                var logLevel = LOG_LEVELS[level.toUpperCase()];
                if (logLevel < _this.currentLogLevel) {
                    return;
                }
                var now = new Date();
                var logItem = {
                    name: _this.name,
                    hostname: os.hostname(),
                    pid: process.pid,
                    level: logLevel,
                    msg: message,
                    time: now.toISOString(),
                    v: '0'
                };
                if (data) {
                    if (_.isArray(data)) {
                        data = { data: data };
                    }
                    _.extend(logItem, data);
                }
                _this.logs.forEach(function (log) {
                    log.write(logItem);
                });
            };
        });
    }

    _createClass(Logger, [{
        key: 'addFileLog',
        value: function addFileLog(filename) {
            var log = new FileLog(filename);
            this.logs.push(log);
            return log;
        }
    }, {
        key: 'addMemoryLog',
        value: function addMemoryLog(limit) {
            var log = new MemoryLog(limit);
            this.logs.push(log);
            return log;
        }
    }, {
        key: 'close',
        value: function close() {
            this.logs.forEach(function (log) {
                log.close();
            });
            this.logs = [];
        }
    }]);

    return Logger;
}();

var FileLog = function () {
    function FileLog(filename) {
        _classCallCheck(this, FileLog);

        this.file = fs.createWriteStream(filename, { flags: 'w', defaultEncoding: 'utf8', autoClose: true });
        this.file.on('error', function (error) {
            console.log('file log error', error);
        });
    }

    _createClass(FileLog, [{
        key: 'write',
        value: function write(data) {
            this.file.write(JSON.stringify(data) + '\n');
        }
    }, {
        key: 'close',
        value: function close() {
            this.file.end();
        }
    }]);

    return FileLog;
}();

var MemoryLog = function () {
    function MemoryLog() {
        var limit = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 256;

        _classCallCheck(this, MemoryLog);

        this.limit = limit;
        this.log = [];
    }

    _createClass(MemoryLog, [{
        key: 'write',
        value: function write(data) {
            this.log.push(data);
            while (this.log.length > this.limit) {
                this.log.shift();
            }
        }
    }, {
        key: 'flush',
        value: function flush() {}
    }, {
        key: 'getRecords',
        value: function getRecords() {
            return this.log;
        }
    }]);

    return MemoryLog;
}();

module.exports = Logger;