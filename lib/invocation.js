// (C) 2016 Anton Zemlyanov, rewritten in JavaScript 6 (ES6)
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _ = require('lodash');
var HttpRequest = require('./http_request.js');

// BETFAIR API enpoints
var BETFAIR_API_HOST = 'https://api.betfair.com';
var BETFAIR_API_ENDPOINTS = {
    accounts: {
        type: "AccountAPING",
        version: "v1.0",
        service: BETFAIR_API_HOST + "/exchange/account/json-rpc/v1/"
    },
    betting: {
        type: "SportsAPING",
        version: "v1.0",
        service: BETFAIR_API_HOST + "/exchange/betting/json-rpc/v1/"
    },
    heartbeat: {
        type: "HeartbeatAPING",
        version: "v1.0",
        service: BETFAIR_API_HOST + "/exchange/heartbeat/json-rpc/v1"
    },
    scores: {
        type: "ScoresAPING",
        version: "v1.0",
        service: BETFAIR_API_HOST + "/exchange/scores/json-rpc/v1/"
    }
};

var ORDER_METHODS = ['placeOrders', 'replaceOrders', 'updateOrders', 'cancelOrders'];

// Betfair Exchange JSON-RPC API invocation (excluding Auth stuff)

var BetfairInvocation = function () {
    _createClass(BetfairInvocation, null, [{
        key: 'setApplicationKey',
        value: function setApplicationKey(appKey) {
            BetfairInvocation.applicationKey = appKey;
        }
    }, {
        key: 'startInvocationLog',
        value: function startInvocationLog(logger) {
            BetfairInvocation.logger = logger;
        }
    }, {
        key: 'stopInvocationLog',
        value: function stopInvocationLog() {
            BetfairInvocation.logger = null;
        }
    }, {
        key: 'setEmulator',
        value: function setEmulator(emulator) {
            BetfairInvocation.emulator = emulator;
        }
    }]);

    function BetfairInvocation(api, sessionKey, method) {
        var params = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
        var isEmulated = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

        _classCallCheck(this, BetfairInvocation);

        if (api !== "accounts" && api !== "betting" && api != "heartbeat" && api != "scores") {
            throw new Error('Bad api parameter:' + api);
        }
        //console.log(arguments);

        // input params
        this.api = api;
        this.sessionKey = sessionKey;
        this.method = method;
        this.params = params;
        this.isEmulated = isEmulated;

        // Request and Response stuff
        this.apiEndpoint = BETFAIR_API_ENDPOINTS[api] || BETFAIR_API_ENDPOINTS.betting;
        this.applicationKey = BetfairInvocation.applicationKey;
        this.service = this.apiEndpoint.service;
        this.request = {
            "jsonrpc": "2.0",
            "id": BetfairInvocation.jsonRpcId++,
            "method": this.apiEndpoint.type + '/' + this.apiEndpoint.version + '/' + this.method,
            "params": this.params
        };
        this.response = null;
    }

    _createClass(BetfairInvocation, [{
        key: '_executeEmulatedCall',
        value: function _executeEmulatedCall() {
            var _this = this;

            var cb = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : function () {};

            var result = {};
            var emulator = BetfairInvocation.emulator;

            var sendResult = function sendResult(method, error, result) {
                var cb = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : function () {};

                // log call
                if (BetfairInvocation.logger) {
                    BetfairInvocation.logger.info(method, {
                        api: _this.api,
                        duration: result.duration,
                        isSuccess: !(result.responseBody && result.responseBody.error),
                        length: 'n/a',
                        httpStatusCode: 'n/a'
                    });
                }

                // report result
                cb(null, {
                    request: _this.request,
                    response: { error: error, result: result }, // TODO place response
                    result: result,
                    error: error,
                    duration: 0
                });
            };

            switch (this.method) {
                case 'placeOrders':
                    //console.log('$', this.request.params);
                    emulator.placeOrders(this.request.params, function (err, result) {
                        sendResult('placeOrders', err, result, cb);
                    });
                    break;
                case 'replaceOrders':
                    sendResult('replaceOrders', { error: 'not supported' }, cb);
                    break;
                case 'updateOrders':
                    sendResult('updateOrders', { error: 'not supported' }, cb);
                    break;
                case 'cancelOrders':
                    emulator.cancelOrders(this.request.params, function (err, result) {
                        sendResult('cancelOrders', err, result, cb);
                    });
                    break;
            }
        }
    }, {
        key: 'execute',
        value: function execute() {
            var _this2 = this;

            var cb = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : function () {};

            // if emulator is enabled, redirect orders methods there
            var emulator = BetfairInvocation.emulator;
            if (emulator && _.indexOf(ORDER_METHODS, this.method) >= 0) {
                var marketId = this.params.marketId;
                var isEmulatedMarket = emulator.isEmulatedMarket(marketId);
                if (isEmulatedMarket) {
                    this._executeEmulatedCall(cb);
                    return;
                }
            }

            var callback = _.once(cb);
            this.jsonRequestBody = JSON.stringify(this.request);
            var httpOptions = {
                headers: {
                    'X-Authentication': this.sessionKey,
                    'Content-Type': 'application/json',
                    'Content-Length': this.jsonRequestBody.length,
                    'Connection': 'keep-alive'
                }
            };
            if (this.applicationKey) {
                httpOptions.headers['X-Application'] = this.applicationKey;
            }

            HttpRequest.post(this.service, this.jsonRequestBody, httpOptions, function (err, result) {
                if (err) {
                    callback(err);
                    return;
                }
                // provide prices to emulator, updates bets status
                if (emulator && _this2.method == 'listMarketBook') {
                    var res = result.responseBody && result.responseBody.result;
                    emulator.onListMarketBook(_this2.params, res);
                }
                // log invocation
                if (BetfairInvocation.logger) {
                    BetfairInvocation.logger.info(_this2.method, {
                        api: _this2.api,
                        duration: result.duration,
                        isSuccess: !(result.responseBody && result.responseBody.error),
                        length: result.length,
                        httpStatusCode: result.statusCode
                    });
                }
                callback(null, {
                    request: _this2.request,
                    response: result.responseBody,
                    result: result.responseBody && result.responseBody.result,
                    error: result.responseBody && result.responseBody.error,
                    duration: result.duration
                });
            });
        }
    }]);

    return BetfairInvocation;
}();

BetfairInvocation.jsonRpcId = 1;

module.exports = BetfairInvocation;