'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

////      ____ _         _
////     / ___| |       | |_
////    | |__ | | _   _ |  _\   _  ___  ___
////    |  __|| || | | || || | | ||  _// _ \
////    | |   | || |_| || || |_| || | |  __/
////    |_|   |_| \__,_||_| \__,_||_|  \___\
////
(function (global, f) {

  'use strict';

  /*istanbul ignore next*/

  if (module && typeof module.exports !== 'undefined') {
    module.exports = f(require('inspect-f'));
  } else {
    global.Fluture = f(global.inspectf);
  }
})( /*istanbul ignore next*/global || window || undefined, function (inspectf) {

  'use strict';

  ///////////////////
  // Type checking //
  ///////////////////

  var _Future$prototype;

  var TYPEOF_FUTURE = 'fluture/Future';
  var FL = {
    map: 'map',
    bimap: 'bimap',
    chain: 'chain',
    ap: 'ap',
    of: 'of'
  };

  function isForkable(m) {
    return Boolean(m) && typeof m.fork === 'function' && m.fork.length >= 2;
  }

  function isFuture(m) {
    return m instanceof FutureClass || Boolean(m) && m['@@type'] === TYPEOF_FUTURE;
  }

  function isFunction(f) {
    return typeof f === 'function';
  }

  function isBinary(f) {
    return f.length >= 2;
  }

  function isTernary(f) {
    return f.length >= 3;
  }

  function isPositiveInteger(n) {
    return n === Infinity || typeof n === 'number' && n > 0 && n % 1 === 0 && n === n;
  }

  function isObject(x) {
    return (typeof x === 'undefined' ? 'undefined' : _typeof(x)) === 'object' && x !== null;
  }

  function isIterator(i) {
    return isObject(i) && typeof i.next === 'function';
  }

  function isIteration(o) {
    return isObject(o) && 'value' in o && 'done' in o && typeof o.done === 'boolean';
  }

  ///////////////
  // Utilities //
  ///////////////

  //A small string representing a value, but not containing the whole value.
  var preview = function preview(x) {
    return typeof x === 'string' ? JSON.stringify(x) : Array.isArray(x) ? '[Array: ' + x.length + ']' : typeof x === 'function' ? typeof x.name === 'string' && x.name.length > 0 ? '[Function: ' + x.name + ']' : /*istanbul ignore next*/'[Function]' //Only for older JS engines.
    : x && (typeof x === 'undefined' ? 'undefined' : _typeof(x)) === 'object' ? '[Object: ' + Object.keys(x).map(String).join(', ') + ']' : String(x);
  };

  //A show function to provide a slightly more meaningful representation of values.
  var show = function show(x) {
    return typeof x === 'string' ? preview(x) : Array.isArray(x) ? '[' + x.map(preview).join(', ') + ']' : x && typeof x.toString === 'function' ? x.toString === Object.prototype.toString ? '{' + Object.keys(x).reduce(function (o, k) {
      return o.concat(preview(k) + ': ' + preview(x[k]));
    }, []).join(', ') + '}' : x.toString() : preview(x);
  };

  var noop = function noop() {};
  var call = function call(f) {
    f();
  };
  var padf = function padf(sf, s) {
    return s.replace(/^/gm, sf).replace(sf, '');
  };
  var showf = function showf(f) {
    return padf('  ', inspectf(2, f));
  };
  var fid = function fid(f) {
    return f.name ? f.name : '<anonymous>';
  };
  var ordinal = ['first', 'second', 'third', 'fourth', 'fifth'];

  //Partially apply a function with a single argument.
  function unaryPartial(f, a) {
    return function partial(b, c, d) {
      switch (arguments.length) {
        case 1:
          return f(a, b);
        case 2:
          return f(a, b, c);
        default:
          return f(a, b, c, d);
      }
    };
  }

  //Partially apply a function with two arguments.
  function binaryPartial(f, a, b) {
    return function partial(c, d) {
      return arguments.length === 1 ? f(a, b, c) : f(a, b, c, d);
    };
  }

  //Partially apply a function with three arguments.
  function ternaryPartial(f, a, b, c) {
    return function partial(d) {
      return f(a, b, c, d);
    };
  }

  ////////////
  // Errors //
  ////////////

  function error$invalidArgument(it, at, expected, actual) {
    throw new TypeError(it + ' expects its ' + ordinal[at] + ' argument to ' + expected + '\n  Actual: ' + show(actual));
  }

  function error$invalidContext(it, actual) {
    throw new TypeError(it + ' was invoked outside the context of a Future. You might want to use' + (' a dispatcher instead\n  Called on: ' + show(actual)));
  }

  function check$Future(fork) {
    if (!isFunction(fork)) error$invalidArgument('Future', 0, 'be a function', fork);
  }

  function check$fork(it, rej, res) {
    if (!isFuture(it)) error$invalidContext('Future#fork', it);
    if (!isFunction(rej)) error$invalidArgument('Future#fork', 0, 'be a function', rej);
    if (!isFunction(res)) error$invalidArgument('Future#fork', 1, 'be a function', res);
  }

  function check$fork$f(f, c) {
    if (!(f === undefined || isFunction(f) && f.length === 0)) throw new TypeError('Future#fork expected the computation to return a nullary function or void' + ('\n  Actual: ' + show(f) + '\n  From calling: ' + showf(c)));
  }

  function check$chain(it, f) {
    if (!isFuture(it)) error$invalidContext('Future#chain', it);
    if (!isFunction(f)) error$invalidArgument('Future#chain', 0, 'be a function', f);
  }

  function check$recur(it, f) {
    if (!isFuture(it)) error$invalidContext('Future#recur', it);
    if (!isFunction(f)) error$invalidArgument('Future#recur', 0, 'be a function', f);
  }

  function check$chain$f(m, f, x) {
    if (!isFuture(m)) throw new TypeError('Future#chain expects the function its given to return a Future' + ('\n  Actual: ' + show(m) + '\n  From calling: ' + showf(f) + '\n  With: ' + show(x)));
  }

  function check$recur$f(m, f, x) {
    if (!isFuture(m)) throw new TypeError('Future#recur expects the function its given to return a Future' + ('\n  Actual: ' + show(m) + '\n  From calling: ' + showf(f) + '\n  With: ' + show(x)));
  }

  function check$chainRej(it, f) {
    if (!isFuture(it)) error$invalidContext('Future.chainRej', it);
    if (!isFunction(f)) error$invalidArgument('Future.chainRej', 0, 'a function', f);
  }

  function check$chainRej$f(m, f, x) {
    if (!isFuture(m)) throw new TypeError('Future.chainRej expects the function its given to return a Future' + ('\n  Actual: ' + show(m) + '\n  From calling: ' + showf(f) + '\n  With: ' + show(x)));
  }

  function check$map(it, f) {
    if (!isFuture(it)) error$invalidContext('Future#map', it);
    if (!isFunction(f)) error$invalidArgument('Future#map', 0, 'be a function', f);
  }

  function check$mapRej(it, f) {
    if (!isFuture(it)) error$invalidContext('Future#mapRej', it);
    if (!isFunction(f)) error$invalidArgument('Future#mapRej', 0, 'be a function', f);
  }

  function check$bimap(it, f, g) {
    if (!isFuture(it)) error$invalidContext('Future#bimap', it);
    if (!isFunction(f)) error$invalidArgument('Future#bimap', 0, 'be a function', f);
    if (!isFunction(g)) error$invalidArgument('Future#bimap', 1, 'be a function', g);
  }

  function check$ap(it, m) {
    if (!isFuture(it)) error$invalidContext('Future#ap', it);
    if (!isFuture(m)) error$invalidArgument('Future#ap', 0, 'be a Future', m);
  }

  function check$ap$f(f) {
    if (!isFunction(f)) throw new TypeError('Future#ap can only be used on Future<Function> but was used on a Future of: ' + show(f));
  }

  function check$swap(it) {
    if (!isFuture(it)) error$invalidContext('Future#swap', it);
  }

  function check$race(it, m) {
    if (!isFuture(it)) error$invalidContext('Future#race', it);
    if (!isFuture(m)) error$invalidArgument('Future#race', 0, 'be a Future', m);
  }

  function check$or(it, m) {
    if (!isFuture(it)) error$invalidContext('Future#or', it);
    if (!isFuture(m)) error$invalidArgument('Future#or', 0, 'be a Future', m);
  }

  function check$fold(it, f, g) {
    if (!isFuture(it)) error$invalidContext('Future#fold', it);
    if (!isFunction(f)) error$invalidArgument('Future#fold', 0, 'be a function', f);
    if (!isFunction(g)) error$invalidArgument('Future#fold', 1, 'be a function', g);
  }

  function check$hook(it, f, g) {
    if (!isFuture(it)) error$invalidContext('Future#hook', it);
    if (!isFunction(f)) error$invalidArgument('Future#hook', 0, 'be a function', f);
    if (!isFunction(g)) error$invalidArgument('Future#hook', 1, 'be a function', g);
  }

  function check$hook$f(m, f, x) {
    if (!isFuture(m)) throw new TypeError('Future#hook expects the first function its given to return a Future' + ('\n  Actual: ' + show(m) + '\n  From calling: ' + showf(f) + '\n  With: ' + show(x)));
  }

  function check$hook$g(m, g, x) {
    if (!isFuture(m)) throw new TypeError('Future#hook expects the second function its given to return a Future' + ('\n  Actual: ' + show(m) + '\n  From calling: ' + showf(g) + '\n  With: ' + show(x)));
  }

  function check$finally(it, m) {
    if (!isFuture(it)) error$invalidContext('Future#finally', it);
    if (!isFuture(m)) error$invalidArgument('Future#finally', 0, 'be a Future', m);
  }

  function check$value(it, f) {
    if (!isFuture(it)) error$invalidContext('Future#value', it);
    if (!isFunction(f)) error$invalidArgument('Future#value', 0, 'be a function', f);
  }

  function check$promise(it) {
    if (!isFuture(it)) error$invalidContext('Future#promise', it);
  }

  function check$cache(it) {
    if (!isFuture(it)) error$invalidContext('Future#cache', it);
  }

  function check$after(n) {
    if (typeof n !== 'number') error$invalidArgument('Future.after', 0, 'be a number', n);
  }

  function check$cast(m) {
    if (!isForkable(m)) error$invalidArgument('Future.cast', 0, 'be a Forkable', m);
  }

  function check$encase(f) {
    if (!isFunction(f)) error$invalidArgument('Future.encase', 0, 'be a function', f);
  }

  function check$encase2(f) {
    if (!isFunction(f)) error$invalidArgument('Future.encase2', 0, 'be a function', f);
    if (!isBinary(f)) error$invalidArgument('Future.encase2', 0, 'take at least two arguments', f);
  }

  function check$encase3(f) {
    if (!isFunction(f)) error$invalidArgument('Future.encase3', 0, 'be a function', f);
    if (!isTernary(f)) error$invalidArgument('Future.encase3', 0, 'take at least three arguments', f);
  }

  function check$node(f) {
    if (!isFunction(f)) error$invalidArgument('Future.node', 0, 'be a function', f);
  }

  function check$parallel(i, ms) {
    if (!isPositiveInteger(i)) error$invalidArgument('Future.parallel', 0, 'be a positive integer', i);
    if (!Array.isArray(ms)) error$invalidArgument('Future.parallel', 0, 'be an array', ms);
  }

  function check$parallel$m(m, i) {
    if (!isFuture(m)) throw new TypeError('Future.parallel expects argument 1 to be an array of Futures.' + (' The value at position ' + i + ' in the array was not a Future.\n  Actual: ' + show(m)));
  }

  function check$do(f) {
    if (!isFunction(f)) error$invalidArgument('Future.do', 0, 'be a function', f);
  }

  function check$do$g(g) {
    if (!isIterator(g)) error$invalidArgument('Future.do', 0, 'return an iterator, maybe you forgot the "*"', g);
  }

  function check$do$next(o) {
    if (!isIteration(o)) throw new TypeError('Future.do was given an invalid generator:' + ' Its iterator did not return a valid iteration from iterator.next()' + ('\n  Actual: ' + show(o)));
    if (!o.done && !isFuture(o.value)) throw new TypeError('A non-Future was produced by iterator.next() in Future.do.' + ' If you\'re using a generator, make sure you always `yield` a Future' + ('\n  Actual: ' + o.value));
  }

  ////////////
  // Future //
  ////////////

  function FutureClass(f, guard) {
    this._f = guard === true ? Future$guardedFork : Future$rawFork;
    this._raw = f;
  }

  function Future(f) {
    check$Future(f);
    return new FutureClass(f, true);
  }

  function Future$of(x) {
    return new FutureClass(function Future$of$fork(rej, res) {
      res(x);
    });
  }

  function Future$fork(rej, res) {
    check$fork(this, rej, res);
    return this._f(rej, res);
  }

  function Future$rawFork(rej, res) {
    var f = this._raw(rej, res);
    check$fork$f(f, this._raw);
    return f || noop;
  }

  function Future$guardedFork(rej, res) {
    var open = true;
    var f = this._raw(function Future$guard$rej(x) {
      if (open) {
        open = false;
        rej(x);
      }
    }, function Future$guard$res(x) {
      if (open) {
        open = false;
        res(x);
      }
    });
    check$fork$f(f, this._raw);
    return function Future$guardedFork$cancel() {
      open && f && f();
      open = false;
    };
  }

  function Future$chain(f) {
    check$chain(this, f);
    var _this = this;
    return new FutureClass(function Future$chain$fork(rej, res) {
      var cancel = void 0;
      var r = _this._f(rej, function Future$chain$res(x) {
        var m = f(x);
        check$chain$f(m, f, x);
        cancel = m._f(rej, res);
      });
      return cancel ? cancel : (cancel = r, function Future$chain$cancel() {
        cancel();
      });
    });
  }

  function Future$recur(f) {
    check$recur(this, f);
    var _this = this;
    return new FutureClass(function Future$chain$fork(rej, res) {
      return _this._f(rej, function Future$chain$res(x) {
        var m = f(x);
        check$recur$f(m, f, x);
        m._f(rej, res);
      });
    });
  }

  function Future$chainRej(f) {
    check$chainRej(this, f);
    var _this = this;
    return new FutureClass(function Future$chainRej$fork(rej, res) {
      var cancel = void 0;
      var r = _this._f(function Future$chainRej$rej(x) {
        var m = f(x);
        check$chainRej$f(m, f, x);
        cancel = m._f(rej, res);
      }, res);
      return cancel ? cancel : (cancel = r, function Future$chainRej$cancel() {
        cancel();
      });
    });
  }

  function Future$map(f) {
    check$map(this, f);
    var _this = this;
    return new FutureClass(function Future$map$fork(rej, res) {
      return _this._f(rej, function Future$map$res(x) {
        res(f(x));
      });
    });
  }

  function Future$mapRej(f) {
    check$mapRej(this, f);
    var _this = this;
    return new FutureClass(function Future$mapRej$fork(rej, res) {
      return _this._f(function Future$mapRej$rej(x) {
        rej(f(x));
      }, res);
    });
  }

  function Future$bimap(f, g) {
    check$bimap(this, f, g);
    var _this = this;
    return new FutureClass(function Future$bimap$fork(rej, res) {
      return _this._f(function Future$bimap$rej(x) {
        rej(f(x));
      }, function Future$bimap$res(x) {
        res(g(x));
      });
    });
  }

  function Future$ap(m) {
    check$ap(this, m);
    var _this = this;
    return new FutureClass(function Future$ap$fork(g, res) {
      var _f = void 0,
          _x = void 0,
          ok1 = void 0,
          ok2 = void 0,
          ko = void 0;
      var rej = function rej(x) {
        return ko || (ko = 1, g(x));
      };
      var c1 = _this._f(rej, function Future$ap$resThis(f) {
        if (!ok2) return void (ok1 = 1, _f = f);
        check$ap$f(f);
        res(f(_x));
      });
      var c2 = m._f(rej, function Future$ap$resThat(x) {
        if (!ok1) return void (ok2 = 1, _x = x);
        check$ap$f(_f);
        res(_f(x));
      });
      return function Future$ap$cancel() {
        c1();c2();
      };
    });
  }

  function Future$swap() {
    check$swap(this);
    var _this = this;
    return new FutureClass(function Future$swap$fork(rej, res) {
      return _this._f(res, rej);
    });
  }

  function Future$toString() {
    return 'Future(' + this._raw.toString() + ')';
  }

  function Future$race(m) {
    check$race(this, m);
    var _this = this;
    return new FutureClass(function Future$race$fork(rej, res) {
      var settled = false,
          c1 = noop,
          c2 = noop;
      var once = function once(f) {
        return function (a) {
          return settled || (settled = true, c1(), c2(), f(a));
        };
      };
      c1 = _this._f(once(rej), once(res));
      c2 = m._f(once(rej), once(res));
      return function Future$race$cancel() {
        c1();c2();
      };
    });
  }

  function Future$or(m) {
    check$or(this, m);
    var _this = this;
    return new FutureClass(function Future$or$fork(rej, res) {
      var ok = false,
          ko = false,
          val = void 0,
          err = void 0;
      var c1 = _this._f(function () {
        return ko ? rej(err) : ok ? res(val) : ko = true;
      }, function (x) {
        return ok = true, res(x);
      });
      var c2 = m._f(function (e) {
        return ok || (ko ? rej(e) : (err = e, ko = true));
      }, function (x) {
        return ok || (ko ? res(x) : (val = x, ok = true));
      });
      return function Future$or$cancel() {
        c1();c2();
      };
    });
  }

  function Future$fold(f, g) {
    check$fold(this, f, g);
    var _this = this;
    return new FutureClass(function Future$fold$fork(rej, res) {
      return _this._f(function (e) {
        return res(f(e));
      }, function (x) {
        return res(g(x));
      });
    });
  }

  function Future$hook(dispose, consume) {
    check$hook(this, dispose, consume);
    var _this = this;
    return new FutureClass(function Future$hook$fork(rej, res) {
      var cancel = void 0;
      var ret = _this._f(rej, function Future$hook$res(resource) {
        var m = consume(resource);
        check$hook$g(m, consume, resource);
        cancel = m._f(function (e) {
          var c = dispose(resource);
          check$hook$f(c, dispose, resource);
          c._f(rej, function (_) {
            return rej(e);
          });
        }, function (x) {
          var c = dispose(resource);
          check$hook$f(c, dispose, resource);
          c._f(rej, function (_) {
            return res(x);
          });
        });
      });
      cancel = cancel || ret;
      return function Future$hook$cancel() {
        cancel();
      };
    });
  }

  function Future$finally(m) {
    check$finally(this, m);
    var _this = this;
    return new FutureClass(function Future$finally$fork(rej, res) {
      var cancel = void 0;
      var r = _this._f(function Future$finally$rej(e) {
        cancel = m._f(rej, function Future$finally$rej$res() {
          rej(e);
        });
      }, function Future$finally$res(x) {
        cancel = m._f(rej, function Future$finally$res$res() {
          res(x);
        });
      });
      return cancel ? cancel : (cancel = r, function Future$finally$cancel() {
        cancel();
      });
    });
  }

  function Future$value(f) {
    check$value(this, f);
    return this._f(function Future$value$rej(e) {
      throw new Error('Future#value was called on a rejected Future\n  Actual: Future.reject(' + show(e) + ')');
    }, f);
  }

  function Future$promise() {
    check$promise(this);
    var _this = this;
    return new Promise(function Future$promise$do(resolve, reject) {
      _this._f(reject, resolve);
    });
  }

  function Future$cache() {
    check$cache(this);
    var _this = this;
    var que = [];
    var value = void 0,
        state = void 0;
    var settleWith = function settleWith(newState) {
      return function Future$cache$settle(newValue) {
        value = newValue;state = newState;
        for (var i = 0, l = que.length; i < l; i++) {
          que[i][state](value);
          que[i] = undefined;
        }
        que = undefined;
      };
    };
    return new FutureClass(function Future$cache$fork(rej, res) {
      var cancel = noop;
      switch (state) {
        case 1:
          que.push({ 2: rej, 3: res });break;
        case 2:
          rej(value);break;
        case 3:
          res(value);break;
        default:
          state = 1;
          que.push({ 2: rej, 3: res });
          cancel = _this._f(settleWith(2), settleWith(3));
      }
      return function Future$cache$cancel() {
        que = [];
        value = undefined;
        state = undefined;
        cancel();
      };
    });
  }

  FutureClass.prototype = Future.prototype = (_Future$prototype = {
    '@@type': TYPEOF_FUTURE,
    _f: null,
    fork: Future$fork
  }, _defineProperty(_Future$prototype, FL.of, Future$of), _defineProperty(_Future$prototype, 'of', Future$of), _defineProperty(_Future$prototype, FL.chain, Future$chain), _defineProperty(_Future$prototype, 'chain', Future$chain), _defineProperty(_Future$prototype, 'recur', Future$recur), _defineProperty(_Future$prototype, 'chainRej', Future$chainRej), _defineProperty(_Future$prototype, FL.map, Future$map), _defineProperty(_Future$prototype, 'map', Future$map), _defineProperty(_Future$prototype, 'mapRej', Future$mapRej), _defineProperty(_Future$prototype, FL.bimap, Future$bimap), _defineProperty(_Future$prototype, 'bimap', Future$bimap), _defineProperty(_Future$prototype, FL.ap, Future$ap), _defineProperty(_Future$prototype, 'ap', Future$ap), _defineProperty(_Future$prototype, 'swap', Future$swap), _defineProperty(_Future$prototype, 'toString', Future$toString), _defineProperty(_Future$prototype, 'inspect', Future$toString), _defineProperty(_Future$prototype, 'race', Future$race), _defineProperty(_Future$prototype, 'or', Future$or), _defineProperty(_Future$prototype, 'fold', Future$fold), _defineProperty(_Future$prototype, 'hook', Future$hook), _defineProperty(_Future$prototype, 'finally', Future$finally), _defineProperty(_Future$prototype, 'value', Future$value), _defineProperty(_Future$prototype, 'promise', Future$promise), _defineProperty(_Future$prototype, 'cache', Future$cache), _Future$prototype);

  Future[FL.of] = Future.of = Future$of;
  Future.Future = Future;

  Future.util = {
    isForkable: isForkable,
    isFuture: isFuture,
    isFunction: isFunction,
    isBinary: isBinary,
    isTernary: isTernary,
    isPositiveInteger: isPositiveInteger,
    isObject: isObject,
    isIterator: isIterator,
    isIteration: isIteration,
    preview: preview,
    show: show,
    padf: padf,
    showf: showf,
    fid: fid,
    unaryPartial: unaryPartial,
    binaryPartial: binaryPartial,
    ternaryPartial: ternaryPartial
  };

  /////////////////
  // Dispatchers //
  /////////////////

  //Creates a dispatcher for a nullary method.
  function createNullaryDispatcher(method) {
    return function nullaryDispatch(m) {
      if (m && typeof m[method] === 'function') return m[method]();
      error$invalidArgument('Future.' + method, 1, 'have a "' + method + '" method', m);
    };
  }

  //Creates a dispatcher for a unary method.
  function createUnaryDispatcher(method) {
    return function unaryDispatch(a, m) {
      if (arguments.length === 1) return unaryPartial(unaryDispatch, a);
      if (m && typeof m[method] === 'function') return m[method](a);
      error$invalidArgument('Future.' + method, 1, 'have a "' + method + '" method', m);
    };
  }

  //Creates a dispatcher for a unary method, but takes the object first rather than last.
  function createInvertedUnaryDispatcher(method) {
    return function invertedUnaryDispatch(m, a) {
      if (arguments.length === 1) return unaryPartial(invertedUnaryDispatch, m);
      if (m && typeof m[method] === 'function') return m[method](a);
      error$invalidArgument('Future.' + method, 0, 'have a "' + method + '" method', m);
    };
  }

  //Creates a dispatcher for a binary method.
  function createBinaryDispatcher(method) {
    return function binaryDispatch(a, b, m) {
      if (arguments.length === 1) return unaryPartial(binaryDispatch, a);
      if (arguments.length === 2) return binaryPartial(binaryDispatch, a, b);
      if (m && typeof m[method] === 'function') return m[method](a, b);
      error$invalidArgument('Future.' + method, 2, 'have a "' + method + '" method', m);
    };
  }

  //Creates a dispatcher for a binary method, but takes the object first rather than last.
  function createInvertedBinaryDispatcher(method) {
    return function invertedBinaryDispatch(m, a, b) {
      if (arguments.length === 1) return unaryPartial(invertedBinaryDispatch, m);
      if (arguments.length === 2) return binaryPartial(invertedBinaryDispatch, m, a);
      if (m && typeof m[method] === 'function') return m[method](a, b);
      error$invalidArgument('Future.' + method, 0, 'have a "' + method + '" method', m);
    };
  }

  Future.chain = createUnaryDispatcher('chain');
  Future.recur = createUnaryDispatcher('recur');
  Future.chainRej = createUnaryDispatcher('chainRej');
  Future.map = createUnaryDispatcher('map');
  Future.mapRej = createUnaryDispatcher('mapRej');
  Future.bimap = createBinaryDispatcher('bimap');
  Future.ap = createInvertedUnaryDispatcher('ap');
  Future.swap = createNullaryDispatcher('swap');
  Future.fork = createBinaryDispatcher('fork');
  Future.race = createUnaryDispatcher('race');
  Future.or = createUnaryDispatcher('or');
  Future.fold = createBinaryDispatcher('fold');
  Future.hook = createInvertedBinaryDispatcher('hook');
  Future.finally = createUnaryDispatcher('finally');
  Future.value = createUnaryDispatcher('value');
  Future.promise = createNullaryDispatcher('promise');
  Future.cache = createNullaryDispatcher('cache');

  /////////////////////
  // Other functions //
  /////////////////////

  Future.isFuture = isFuture;
  Future.isForkable = isForkable;

  Future.reject = function Future$reject(x) {
    return new FutureClass(function Future$reject$fork(rej) {
      rej(x);
    });
  };

  Future.after = function Future$after(n, x) {
    if (arguments.length === 1) return unaryPartial(Future.after, n);
    check$after(n);
    return new FutureClass(function Future$after$fork(rej, res) {
      var t = setTimeout(res, n, x);
      return function Future$after$cancel() {
        clearTimeout(t);
      };
    });
  };

  Future.cast = function Future$cast(m) {
    check$cast(m);
    return new FutureClass(function Future$cast$fork(rej, res) {
      m.fork(rej, res);
    }, true);
  };

  Future.encase = function Future$encase(f, x) {
    check$encase(f);
    if (arguments.length === 1) return unaryPartial(Future.encase, f);
    return new FutureClass(function Future$encase$fork(rej, res) {
      var r = void 0;
      try {
        r = f(x);
      } catch (e) {
        return void rej(e);
      }
      res(r);
    });
  };

  Future.encase2 = function Future$encase2(f, x, y) {
    check$encase2(f);
    if (arguments.length === 1) return unaryPartial(Future.encase2, f);
    if (arguments.length === 2) return binaryPartial(Future.encase2, f, x);
    return new FutureClass(function Future$encase2$fork(rej, res) {
      var r = void 0;
      try {
        r = f(x, y);
      } catch (e) {
        return void rej(e);
      }
      res(r);
    });
  };

  Future.encase3 = function Future$encase3(f, x, y, z) {
    check$encase3(f);
    if (arguments.length === 1) return unaryPartial(Future.encase3, f);
    if (arguments.length === 2) return binaryPartial(Future.encase3, f, x);
    if (arguments.length === 3) return ternaryPartial(Future.encase3, f, x, y);
    return new FutureClass(function Future$encase3$fork(rej, res) {
      var r = void 0;
      try {
        r = f(x, y, z);
      } catch (e) {
        return void rej(e);
      }
      res(r);
    });
  };

  Future.try = function Future$try(f) {
    return Future.encase(f, undefined);
  };

  Future.node = function Future$node(f) {
    check$node(f);
    return new FutureClass(function Future$node$fork(rej, res) {
      f(function Future$node$done(a, b) {
        a ? rej(a) : res(b);
      });
    }, true);
  };

  Future.parallel = function Future$parallel(i, ms) {
    if (arguments.length === 1) return unaryPartial(Future.parallel, i);
    check$parallel(i, ms);
    var l = ms.length;
    return l < 1 ? Future$of([]) : new FutureClass(function Future$parallel$fork(rej, res) {
      var ko = false;
      var ok = 0;
      var cs = [];
      var out = new Array(l);
      var next = function next(j) {
        return i < l ? fork(ms[i], i++) : j === l && res(out);
      };
      var fork = function fork(m, j) {
        return check$parallel$m(m, j), cs[j] = m._f(function (e) {
          return ko || (rej(e), ko = true);
        }, function (x) {
          return ko || (out[j] = x, next(++ok));
        });
      };
      ms.slice(0, i).forEach(fork);
      return function Future$parallel$cancel() {
        cs.forEach(call);
      };
    });
  };

  Future.do = function Future$do(f) {
    check$do(f);
    return new FutureClass(function Future$do$fork(rej, res) {
      var g = f();
      check$do$g(g);
      var next = function Future$do$next(x) {
        var o = g.next(x);
        check$do$next(o);
        return o.done ? Future$of(o.value) : o.value.chain(Future$do$next);
      };
      return next()._f(rej, res);
    });
  };

  return Future;
});
