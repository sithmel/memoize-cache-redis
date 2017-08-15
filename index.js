var BaseCache = require('memoize-cache/base-cache');
var waterfall = require('async-deco/callback/waterfall');
var redis = require('redis');
var snappy = require('./utils/snappy');
var Tags = require('./utils/tags.js');


function CacheRedis(opts) {
  BaseCache.call(this, opts);
  this.client = redis.createClient(this.opts.redisOpts);
  this.tagsLib = new Tags(this.client, this.opts.prefixKeysSet, this.opts.prefixTagsSet);
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
  var tagsLib = this.tagsLib;
  var jsonData;
  try {
    jsonData = JSON.stringify(payload);
  } catch (e) {
    return next(e);
  }

  var hasMaxAge = typeof maxAge !== 'undefined' && maxAge !== Infinity;

  var callback = !tags.length ? next : function (err) {
    if (err) return next(err);
    tagsLib.add(k, tags, hasMaxAge ? maxAge : undefined, next);
  };

  if (hasMaxAge) {
    this.client.set(k, jsonData, 'PX', maxAge * 1000, callback);
  } else {
    this.client.set(k, jsonData, callback);
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
  var that = this;
  this.client.del(keys, function (err) {
    if (err) return next(err);
    that.tagsLib.removeKeys(keys, next);
  });
};

CacheRedis.prototype.purgeByTags = function cache__purgeByTags(tags, next) {
  next = next || function () {};
  tags = Array.isArray(tags) ? tags : [tags];
  var that = this;
  this.tagsLib.getKeys(tags, function (err, keys) {
    that.purgeByKeys(keys, next);
  });
};

CacheRedis.prototype.purgeAll = function cache__purgeAll(next) {
  next = next || function () {};
  this.client.flushdb(next);
};


module.exports = CacheRedis;
