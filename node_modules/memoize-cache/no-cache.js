/*

Cache object

*/
var keyGetter = require('memoize-cache-utils/key-getter');

function Cache(opts) {
  opts = opts || {};
  this.getCacheKey = keyGetter(opts.key);
}

Cache.prototype.push = function cache_push(args, output) {};

Cache.prototype.query = function cache_query(args, next) {
  var key = this.getCacheKey.apply(this, args);
  if (key === '__error__') {
    return next(new Error('Error test'));
  }

  return next(null, {
    cached: false,
    key: key
  });
};

module.exports = Cache;
