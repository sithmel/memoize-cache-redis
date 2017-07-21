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

CacheRedis.prototype._set = function cache__set(k, payload, maxAge, next) {
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

module.exports = CacheRedis;
