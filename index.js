var BaseCache = require('memoize-cache/base-cache')
var redis = require('redis')
var snappy = require('./utils/snappy')
var Tags = require('./utils/tags.js')

function isString (value) {
  return typeof value === 'string'
}

function retryStrategy (options) {
  return Math.min(options.attempt * 1000, 5000)
}

var defaultRedisCfg = {
  enable_offline_queue: false, // better fail than queue
  retry_strategy: retryStrategy
}

function CacheRedis (opts) {
  BaseCache.call(this, opts)
  if (this.opts.redisClient && this.opts.redisOpts) {
    throw new Error('redisClient and redisOpts options are mutually exclusive')
  }

  if (this.opts.redisClient && (this.opts.onError || this.opts.onReady)) {
    throw new Error('You cannot use onError and onReady when passing redisClient. You can attach the handlers directly to that one.')
  }
  if (this.opts.redisClient) {
    this.client = this.opts.redisClient
  } else {
    this.client = redis.createClient(Object.assign({}, defaultRedisCfg, this.opts.redisOpts))
    var onError = this.opts.onError || function () {}
    var onReady = this.opts.onReady || function () {}
    this.client.on('error', onError) // default on Error swallow the error
    this.client.on('ready', onReady)
  }
  this.tagsLib = new Tags(this.client, this.opts.prefixKeysSet, this.opts.prefixTagsSet)

  this.compress = function (obj, cb) { cb(null, obj) }
  this.decompress = function (str, cb) { cb(null, str) }
  if (this.opts.compress) {
    if (!snappy.isSnappyInstalled) {
      throw new Error('The "compress" option requires the "snappy" library. Its installation failed (hint missing libraries or compiler)')
    }
    this.compress = snappy.compress
    this.decompress = snappy.decompress
  }
}

CacheRedis.prototype = Object.create(BaseCache.prototype)
CacheRedis.prototype.constructor = CacheRedis

CacheRedis.prototype._set = function _cacheSet (keyObj, payload, maxAge, next) {
  var that = this
  var k = keyObj.key
  var tags = keyObj.tags
  var tagsLib = this.tagsLib
  var jsonData

  if (!isString(k)) {
    return next(new Error('Set cache: The cache key must be a string'))
  }

  if (!tags.every(isString)) {
    return next(new Error('Set cache: The cache tags must be an array of strings'))
  }

  try {
    jsonData = JSON.stringify(payload)
  } catch (e) {
    return next(e)
  }

  var hasMaxAge = typeof maxAge !== 'undefined' && maxAge !== Infinity

  var callback = !tags.length ? next : function (err) {
    if (err) return next(err)
    tagsLib.add(k, tags, hasMaxAge ? (maxAge * 1000) : undefined, next)
  }

  this.compress(jsonData, function (err, compressed) {
    if (err) return callback(err)
    if (hasMaxAge) {
      that.client.set(k, compressed, 'PX', maxAge * 1000, callback)
    } else {
      that.client.set(k, compressed, callback)
    }
  })
}

CacheRedis.prototype._get = function _cacheGet (key, next) {
  if (!isString(key)) {
    return next(new Error('Get cache: The cache key must be a string'))
  }
  var that = this
  this.client.get(key, function (err, compressed) {
    if (err) {
      return next(err)
    }
    that.decompress(compressed, function (err, jsonData) {
      var payload
      if (err) {
        return next(err)
      }
      if (!jsonData) {
        return next(null, null)
      }
      try {
        payload = JSON.parse(jsonData)
      } catch (e) {
        return next(e)
      }
      next(null, payload)
    })
  })
}

CacheRedis.prototype.purgeByKeys = function cachePurgeByKeys (keys, next) {
  next = next || function () {}
  keys = Array.isArray(keys) ? keys : [keys]
  var that = this
  if (!keys.length) {
    return next(null)
  }
  this.client.del(keys, function (err) {
    if (err) return next(err)
    that.tagsLib.removeKeys(keys, next)
  })
}

CacheRedis.prototype.purgeByTags = function cachePurgeByTags (tags, next) {
  next = next || function () {}
  tags = Array.isArray(tags) ? tags : [tags]
  var that = this
  this.tagsLib.getKeys(tags, function (err, keys) {
    if (err) return next(err)
    that.purgeByKeys(keys, next)
  })
}

CacheRedis.prototype.purgeAll = function cachePurgeAll (next) {
  next = next || function () {}
  this.client.flushdb(next)
}

CacheRedis.prototype.close = function cacheClose (next) {
  next = next || function () {}
  this.client.quit(next)
}

module.exports = CacheRedis
