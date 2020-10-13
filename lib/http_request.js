// (C) 2016 Anton Zemlyanov, rewritten in JavaScript 6 (ES6)
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var http = require('http');
var https = require('https');
var url = require('url');
var zlib = require('zlib');
var Stream = require('stream');
var _ = require('lodash');

var cookieJar = require('./cookie_jar.js');

// always used with BF API
var USE_GZIP_COMPRESSION = true;
var NANOSECONDS_IN_SECOND = 1000000000;
var MAX_REQUEST_TIMEOUT = 15 * 1000;

var agentParams = { keepAlive: true, maxFreeSockets: 8 };
var httpAgent = new http.Agent(agentParams);
var httpsAgent = new https.Agent(agentParams);

var HttpRequest = function (_Stream) {
    _inherits(HttpRequest, _Stream);

    _createClass(HttpRequest, null, [{
        key: 'get',

        // get http request
        value: function get(url) {
            var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
            var cb = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : function () {};

            var opts = _.extend({
                url: url,
                method: 'get'
            }, options);
            return new HttpRequest(opts).execute(cb);
        }

        // post http request

    }, {
        key: 'post',
        value: function post(url, data) {
            var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
            var cb = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : function () {};

            var opts = _.extend({
                url: url,
                method: 'post',
                requestBody: data
            }, options);
            return new HttpRequest(opts).execute(cb);
        }

        // constructor

    }]);

    function HttpRequest() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        _classCallCheck(this, HttpRequest);

        // Stream stuff, HttpRequest is writable stream
        var _this = _possibleConstructorReturn(this, (HttpRequest.__proto__ || Object.getPrototypeOf(HttpRequest)).call(this));

        _this.readable = false;
        _this.writable = true;

        _this.options = options;
        _this.rawResponseLength = 0;
        _this.responseBody = '';
        _this.parsedUrl = url.parse(options.url);
        _this.method = options.method;
        return _this;
    }

    // do actual job


    _createClass(HttpRequest, [{
        key: 'execute',
        value: function execute() {
            var _this2 = this;

            var cb = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : function () {};

            this.callback = cb;
            var transport = this.parsedUrl.protocol === 'https:' ? https : http;
            var httpOptions = {
                agent: this.parsedUrl.protocol === 'https:' ? httpsAgent : httpAgent,
                host: this.parsedUrl.hostname,
                port: this.parsedUrl.port,
                path: this.parsedUrl.pathname,
                method: this.method,
                headers: this.options.headers || {},
                rejectUnauthorized: false
            };
            _.extend(httpOptions.headers, this.options.headers);
            httpOptions.headers.cookie = cookieJar.serialize();
            if (USE_GZIP_COMPRESSION) {
                httpOptions.headers['accept-encoding'] = 'gzip';
            }
            httpOptions.headers.cookie = cookieJar.serialize();

            var request = transport.request(httpOptions, function (result) {
                //console.log("statusCode: ", result.statusCode, "headers: ", result.headers);
                _this2.statusCode = result.statusCode;
                _this2.contentType = result.headers['content-type'];
                _this2.cookies = result.headers['set-cookie'];
                cookieJar.parse(_this2.cookies);

                // just for stats
                result.on('data', function (data) {
                    _this2.rawResponseLength += data.length;
                });
                result.on('error', function (err) {
                    _this2.callback(err);
                });

                // http request input to self output
                if (result.headers['content-encoding'] === 'gzip') {
                    // piping through gzip
                    var gunzip = zlib.createGunzip();
                    result.pipe(gunzip).pipe(_this2);
                } else {
                    // piping directly to self
                    result.pipe(_this2);
                }
            });
            request.on('error', function (err) {
                _this2.callback(err);
            });
            // request.on('socket', function (socket) {
            //     socket.setTimeout(MAX_REQUEST_TIMEOUT);
            //     socket.on('timeout', function() {
            //         request.abort();
            //     });
            // });
            request.setTimeout(MAX_REQUEST_TIMEOUT, function () {
                request.abort();
                //this.callback('REQUEST_TIMEOUT');
            });
            if (this.method === 'post') {
                request.write(this.options.requestBody);
            }
            this.startTime = process.hrtime();
            request.end();
        }

        // http(s) chuck data

    }, {
        key: 'write',
        value: function write(data) {
            this.responseBody += data.toString();
        }

        // http(s) end of chunk data

    }, {
        key: 'end',
        value: function end() {
            // duration
            this.endTime = process.hrtime();
            var start = this.startTime[0] + this.startTime[1] / NANOSECONDS_IN_SECOND;
            var end = this.endTime[0] + this.endTime[1] / NANOSECONDS_IN_SECOND;

            // gzip compression efficiency
            var responseBodyLength = this.responseBody.length;
            var ratio = 100.0 - this.rawResponseLength / responseBodyLength * 100.0;
            ratio = Math.round(ratio);

            // if JSON, parse JSON into JS object
            if (this.contentType === 'application/json') {
                try {
                    this.responseBody = JSON.parse(this.responseBody);
                } catch (error) {
                    this.responseBody = {
                        error: 'Bad JSON'
                    };
                }
            }

            this.callback(null, {
                statusCode: this.statusCode,
                contentType: this.contentType,
                responseBody: this.responseBody,
                cookies: this.cookies,
                length: responseBodyLength,
                compressionRation: ratio,
                duration: Math.round((end - start) * 1000)
            });
        }
    }]);

    return HttpRequest;
}(Stream);

module.exports = HttpRequest;