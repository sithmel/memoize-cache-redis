var BaseCache = require('./base-cache');
var LRU = require('little-ds-toolkit/lib/lru-cache');

function CacheRam(opts) {
  BaseCache.call(this, opts);
  this._maxLen = this.opts.maxLen;
  this._maxSize = this.opts.maxSize;
  this.cache = new LRU({ maxSize: this._maxSize, maxLen: this._maxLen });
}

CacheRam.prototype = Object.create(BaseCache.prototype);
CacheRam.prototype.constructor = CacheRam;

CacheRam.prototype._set = function cache__set(k, payload, maxAge, next) {
  try {
    this.cache.set(k, payload, maxAge * 1000);
    next();
  } catch (e) {
    next(e);
  }
};

CacheRam.prototype._get = function cache__get(key, next) {
  var hit;
  try {
    next(null, this.cache.get(key));
  } catch (e) {
    next(e);
  }
};

module.exports = CacheRam;
