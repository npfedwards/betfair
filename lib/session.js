// (C) 2016 Anton Zemlyanov, rewritten in JavaScript 6 (ES6)
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _ = require('lodash');
var auth = require('./auth.js');
var BetfairInvocation = require('./invocation.js');
var Logger = require('./logger.js');
var Emulator = require('betfair-emulator');
//let Emulator = require('/opt/projects/betfair-emulator');

// ************************************************************************
// * Betting API - https://api.betfair.com:443/exchange/betting/json-rpc/v1/
// ************************************************************************
var API_BETTING_METHODS = [
// read-only
'listEventTypes', 'listCompetitions', 'listTimeRanges', 'listEvents', 'listMarketTypes', 'listCountries', 'listVenues', 'listMarketCatalogue', 'listMarketBook', 'listMarketProfitAndLoss', 'listCurrentOrders', 'listClearedOrders',
// transactional
'placeOrders', 'cancelOrders', 'replaceOrders', 'updateOrders'];

// ************************************************************************
// * Accounts API - https://api.betfair.com:443/exchange/account/json-rpc/v1/
// ************************************************************************
var API_ACCOUNT_METHODS = ['createDeveloperAppKeys', 'getAccountDetails', 'getAccountFunds', 'getDeveloperAppKeys', 'getAccountStatement', 'listCurrencyRates', 'transferFunds'];

// ************************************************************************
// * Heartbeat API - https://api.betfair.com:443/exchange/betting/json-rpc/v1/
// ************************************************************************
var API_HEARTBEAT_METHODS = ['heartbeat'];

// ************************************************************************
// * Scores API - https://api.betfair.com:443/exchange/scores/json-rpc/v1/
// ************************************************************************
var API_SCORES_METHODS = ['listRaceDetails', 'listScores', 'listIncidents', 'listAvailableEvents'];

var BetfairSession = function () {
    // Constructor
    function BetfairSession(applicationKey) {
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

        _classCallCheck(this, BetfairSession);

        this.sessionKey = null;
        this.applicationKey = applicationKey;
        BetfairInvocation.setApplicationKey(applicationKey);

        this.createApiMethods('betting', API_BETTING_METHODS);
        this.createApiMethods('accounts', API_ACCOUNT_METHODS);
        this.createApiMethods('heartbeat', API_HEARTBEAT_METHODS);
        this.createApiMethods('scores', API_SCORES_METHODS);

        // optionaly init emulator
        if (options.emulator) {
            var level = options.emulatorLogLevel || 'info';
            var logger = new Logger('emu', level);
            if (options.emulatorLogFile) {
                logger.addFileLog(options.emulatorLogFile);
            }
            this.emulator = new Emulator(logger);
            BetfairInvocation.setEmulator(this.emulator);
        }
    }

    _createClass(BetfairSession, [{
        key: 'startInvocationLog',
        value: function startInvocationLog(logger) {
            auth.startInvocationLog(logger);
            BetfairInvocation.startInvocationLog(logger);
        }
    }, {
        key: 'stopInvocationLog',
        value: function stopInvocationLog() {
            auth.stopInvocationLog();
            BetfairInvocation.stopInvocationLog();
        }
    }, {
        key: 'setSslOptions',
        value: function setSslOptions() {
            // TODO, bot login is not supported yet
        }
    }, {
        key: 'enableEmulationForMarket',
        value: function enableEmulationForMarket(marketId) {
            if (!this.emulator) {
                throw new Error('Emulator is not enabled');
            }
            this.emulator.enableEmulationForMarket(marketId);
        }
    }, {
        key: 'disableEmulationForMarket',
        value: function disableEmulationForMarket(marketId) {
            if (!this.emulator) {
                throw new Error('Emulator is not enabled');
            }
            this.emulator.disableEmulationForMarket(marketId);
        }
    }, {
        key: 'isEmulatedMarket',
        value: function isEmulatedMarket(marketId) {
            if (!this.emulator) {
                throw new Error('Emulator is not enabled');
            }
            return this.emulator.isEmulatedMarket(marketId);
        }
    }, {
        key: 'login',
        value: function login(_login, password) {
            var _this = this;

            var cb = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : function () {};

            auth.loginInteractive(_login, password, function (err, res) {
                if (err) {
                    cb(err);
                    return;
                }
                _this.sessionKey = res.sessionKey;
                cb(null, res);
            });
        }
    }, {
        key: 'keepAlive',
        value: function keepAlive() {
            var cb = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : function () {};

            auth.keepAlive(this.sessionKey, function (err, res) {
                cb(err, res);
            });
        }
    }, {
        key: 'logout',
        value: function logout() {
            var cb = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : function () {};

            auth.logout(this.sessionKey, function (err, res) {
                cb(err, res);
            });
        }

        // Create multiple Betfair API calls (account API, bettint api, etc)

    }, {
        key: 'createApiMethods',
        value: function createApiMethods(api, methods) {
            var _this2 = this;

            methods.forEach(function (method) {
                BetfairSession.prototype[method] = _this2.createMethod(api, method);
            });
        }

        // Arbitrary Betfair API RPC call constructor

    }, {
        key: 'createMethod',
        value: function createMethod(api, methodName) {
            return function (params) {
                var callback = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : function () {};

                if (!_.isObject(params)) {
                    throw 'params should be object';
                }
                var invocation = new BetfairInvocation(api, this.sessionKey, methodName, params);
                invocation.execute(function (err, result) {
                    //console.log(methodName, 'error', err, 'result', result);
                    if (err) {
                        callback(err);
                        return;
                    }
                    callback(null, result);
                });
                return invocation;
            };
        }
    }]);

    return BetfairSession;
}();

module.exports = BetfairSession;