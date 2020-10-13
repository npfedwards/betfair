// (C) 2016 Anton Zemlyanov, rewritten in JavaScript 6 (ES6)
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var HttpRequest = require('./http_request.js');
var querystring = require('querystring');
var cookieJar = require('./cookie_jar.js');

var AUTH_URLS = {
    interactiveLogin: 'https://identitysso.betfair.com:443/api/login',
    botLogin: 'https://identitysso-api.betfair.com:443/api/certlogin',
    logout: 'https://identitysso.betfair.com:443/api/logout',
    keepAlive: 'https://identitysso.betfair.com:443/api/keepAlive'
};

var BetfairAuth = function () {
    function BetfairAuth() {
        _classCallCheck(this, BetfairAuth);
    }

    _createClass(BetfairAuth, [{
        key: 'startInvocationLog',
        value: function startInvocationLog(logger) {
            this.logger = logger;
        }
    }, {
        key: 'stopInvocationLog',
        value: function stopInvocationLog() {
            this.logger = null;
        }
    }, {
        key: 'logAuthCall',
        value: function logAuthCall(method, result) {
            if (this.logger) {
                this.logger.info(method, {
                    api: 'auth',
                    duration: result.duration,
                    isSuccess: !(result.responseBody && result.responseBody.error),
                    length: result.length,
                    httpStatusCode: result.statusCode
                });
            }
        }
    }, {
        key: 'loginInteractive',
        value: function loginInteractive(login, password) {
            var _this = this;

            var cb = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : function () {};

            var formData = querystring.stringify({
                username: login,
                password: password,
                login: true,
                redirectMethod: 'POST',
                product: 'home.betfair.int',
                url: 'https://www.betfair.com/'
            });
            var options = {
                headers: {
                    "accept": "application/json",
                    "content-type": "application/x-www-form-urlencoded",
                    'content-length': formData.length,
                    'x-application': 'BetfairAPI'
                }
            };
            HttpRequest.post(AUTH_URLS.interactiveLogin, formData, options, function (err, res) {
                if (err) {
                    cb(err);
                    return;
                }
                if (res.responseBody.status != 'SUCCESS') {
                    cb(res.responseBody.error);
                    return;
                }
                cb(null, {
                    success: res.responseBody.status == 'SUCCESS',
                    sessionKey: res.responseBody.token,
                    duration: res.duration,
                    responseBody: res.responseBody
                });
                // log successful result
                _this.logAuthCall('loginInteractive', res);
            });
        }
    }, {
        key: 'loginBot',
        value: function loginBot(login, password, options) {
            var cb = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : function () {};
        }
    }, {
        key: 'logout',
        value: function logout(sessionKey) {
            var _this2 = this;

            var cb = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function () {};

            var formData = querystring.stringify({
                product: 'home.betfair.int',
                url: 'https://www.betfair.com/'
            });

            // {'X-Authentication':sessionKey}
            var options = {
                headers: {
                    "accept": "application/json",
                    "content-type": "application/x-www-form-urlencoded",
                    'content-length': formData.length,
                    "x-authentication": sessionKey
                }
            };
            HttpRequest.post(AUTH_URLS.logout, formData, options, function (err, res) {
                if (err) {
                    cb(err);
                    return;
                }
                if (res.responseBody.status != 'SUCCESS') {
                    cb(res.responseBody.error);
                    return;
                }
                cb(null, {
                    success: res.responseBody.status == 'SUCCESS',
                    duration: res.duration,
                    responseBody: res.responseBody
                });
                // log successful result
                _this2.logAuthCall('logout', res);
            });
        }
    }, {
        key: 'keepAlive',
        value: function keepAlive(sessionKey) {
            var _this3 = this;

            var cb = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function () {};

            var formData = querystring.stringify({
                product: 'home.betfair.int',
                url: 'https://www.betfair.com/'
            });

            // {'X-Authentication':sessionKey}
            var options = {
                headers: {
                    "accept": "application/json",
                    "content-type": "application/x-www-form-urlencoded",
                    'content-length': formData.length,
                    "x-authentication": sessionKey
                }
            };
            HttpRequest.post(AUTH_URLS.keepAlive, formData, options, function (err, res) {
                if (err) {
                    cb(err);
                    return;
                }
                if (res.responseBody.status != 'SUCCESS') {
                    cb(res.responseBody.error);
                    return;
                }
                cb(null, {
                    success: res.responseBody.status == 'SUCCESS',
                    duration: res.duration,
                    responseBody: res.responseBody
                });
                // log successful result
                _this3.logAuthCall('keepAlive', res);
            });
        }
    }]);

    return BetfairAuth;
}();

module.exports = new BetfairAuth();