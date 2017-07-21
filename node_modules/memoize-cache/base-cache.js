var keyGetter = require('memoize-cache-utils/key-getter');
var callbackify = require('async-deco/utils/callbackify');
/*

Cache object

*/

function BaseCache(opts) {
  this.opts = opts = opts || {};
  this.getCacheKey = keyGetter(opts.key);
  this.getMaxAge = typeof opts.maxAge !== 'function' ? function () { return opts.maxAge; } : opts.maxAge;

  this.serialize = opts.serializeAsync || (opts.serialize && callbackify(opts.serialize)) || function (v, cb) { cb(null, v); };
  this.deserialize = opts.deserializeAsync || (opts.deserialize && callbackify(opts.deserialize)) || function (v, cb) { cb(null, v); };

  this.maxValidity = typeof opts.maxValidity === 'undefined' ?
    function () {return Infinity;} :
    (typeof opts.maxValidity === 'function' ? opts.maxValidity : function () {return opts.maxValidity;});
}

BaseCache.prototype.push = function cache_push(args, output, next) {
  next = next || function () {}; // next is optional
  var serialize = this.serialize;
  var k = this.getCacheKey.apply(this, args);
  var maxAge = this.getMaxAge.call(this, args, output); // undefined === forever
  var set = this._set.bind(this);
  var maxValidity = (this.maxValidity.call(this, args, output) * 1000) + Date.now();

  if (k === null || maxAge === 0) {
    next();
    return;
  }

  serialize(output, function (err, data) {
    var jsonData, payload;
    if (err) {
      return next(err);
    }
    payload = { data: data, maxValidity: maxValidity };
    set(k, payload, maxAge, next);
  });
  return { key: k };
};

BaseCache.prototype.query = function cache_query(args, next) {
  var t0 = Date.now();
  var key = this.getCacheKey.apply(this, args);
  var deserialize = this.deserialize;
  var get = this._get.bind(this);
  var obj;

  if (key === null) {
    // if k is null I don't cache
    return next(null, {
      timing: Date.now() - t0,
      cached: false,
      key: key
    });
  }

  get(key, function (err, payload) {
    var data, maxValidity;
    if (err) {
      return next(err);
    }
    if (!payload) {
      return next(null, {
        timing: Date.now() - t0,
        cached: false,
        key: key
      });
    }
    maxValidity = payload.maxValidity;
    data = payload.data;
    deserialize(data, function (err, output) {
      if (err) {
        return next(err);
      }
      next(null, {
        timing: Date.now() - t0,
        cached: true,
        key: key,
        hit: output,
        stale: Boolean(maxValidity && maxValidity < Date.now())
      });
    });
  });
};

module.exports = BaseCache;
