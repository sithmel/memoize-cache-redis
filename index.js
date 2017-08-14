var BaseCache = require('memoize-cache/base-cache');
var waterfall = require('async-deco/callback/waterfall');
var redis = require('redis');
var snappy = require('./utils/snappy');

function CacheRedis(opts) {
  BaseCache.call(this, opts);
  this.client = redis.createClient(this.opts.redisOpts);
  if (this.opts.compress) {
    if (!snappy.isSnappyInstalled) {
      throw new Error('The "compress" option requires the "snappy" library. Its installation failed (hint missing libraries or compiler)');
    }
    this.serialize = waterfall([this.serialize, snappy.compress]);
    this.deserialize = waterfall([snappy.decompress, this.deserialize]);
  }
}

CacheRedis.prototype = Object.create(BaseCache.prototype);
CacheRedis.prototype.constructor = CacheRedis;

CacheRedis.prototype._set = function cache__set(keyObj, payload, maxAge, next) {
  var k = keyObj.key;
  var tags = keyObj.tags;
  var jsonData;
  try {
    jsonData = JSON.stringify(payload);
  } catch (e) {
    return next(e);
  }
  if (typeof maxAge !== 'undefined' && maxAge !== Infinity) {
    this.client.set(k, jsonData, 'PX', maxAge * 1000, next);
  } else {
    this.client.set(k, jsonData, next);
    // this.client.multi()
    // .sadd(tag1, key, cb)
    // .expire('tag1', '1',) seconds
    // .exec(next);
  }
};

CacheRedis.prototype._get = function cache__get(key, next) {
  this.client.get(key, function (err, jsonData) {
    var payload;
    if (err) {
      return next(err);
    }
    if (!jsonData) {
      return next(null, null);
    }
    try {
      payload = JSON.parse(jsonData);
    } catch (e) {
      return next(e);
    }
    next(null, payload);
  });
};

CacheRedis.prototype.purgeByKeys = function cache__purgeByKeys(keys, next) {
  next = next || function () {};
  keys = Array.isArray(keys) ? keys : [keys];
  client.del(keys, next);
};

CacheRedis.prototype.purgeByTags = function cache__purgeByTags(tags, next) {
  // next = next || function () {};
  // tags = Array.isArray(tags) ? tags : [tags];
  //
  // var cacheManager = this.cacheManager;
  // var changes = parallel(keys.map(function (key) {
  //   return function (cb) {
  //     cacheManager.del(key, cb);
  //   };
  // }));
  // changes(next);
};

CacheRedis.prototype.purgeAll = function cache__purgeAll(next) {
  next = next || function () {};
  this.client.flushdb(next);
};


module.exports = CacheRedis;
