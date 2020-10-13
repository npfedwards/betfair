// (C) 2016 Anton Zemlyanov, rewritten in JavaScript 6 (ES6)
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _ = require('lodash');

var CookieJar = function () {
    function CookieJar() {
        _classCallCheck(this, CookieJar);

        this.cookies = {};
    }

    // serialize the whole jar


    _createClass(CookieJar, [{
        key: 'serialize',
        value: function serialize() {
            var cookies = [];
            _.each(this.cookies, function (value, name) {
                cookies.push([name, value].join('='));
            });
            return cookies.join('; ');
        }

        // parse string and add cookies to cookie var

    }, {
        key: 'parse',
        value: function parse() {
            var _this = this;

            var cookies = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

            cookies.forEach(function (cookie) {
                var parts = cookie.split(';');

                var _parts$0$split = parts[0].split('='),
                    _parts$0$split2 = _slicedToArray(_parts$0$split, 2),
                    name = _parts$0$split2[0],
                    value = _parts$0$split2[1];

                _this.cookies[name] = value;
            });
        }

        // get cookie from jar

    }, {
        key: 'get',
        value: function get(name) {
            return this.cookies[name];
        }

        // store cookie to jar

    }, {
        key: 'set',
        value: function set(name, value) {
            this.cookies[name] = value;
        }
    }]);

    return CookieJar;
}();

module.exports = new CookieJar();