var CacheRAM = require('./src/cache-ram');
var NoCache = require('./src/no-cache');
var BaseCache = require('./src/base-cache');
var keyGetter = require('memoize-cache-utils/key-getter');

module.exports = {
  CacheRAM: CacheRAM,
  NoCache: NoCache,
  BaseCache: BaseCache,
  keyGetter: keyGetter,
};
