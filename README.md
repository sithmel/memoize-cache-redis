memoize-cache-redis
===================
[![Build Status](https://travis-ci.org/sithmel/memoize-cache-redis.svg?branch=master)](https://travis-ci.org/sithmel/memoize-cache-redis)

A configurable cache support for functions (https://www.npmjs.com/package/async-deco). Redis backend.

cache
=====
The constructor takes an cache-manager object, and an "options" object.
The options object may contain these attributes:
* redisOpts: an object of options passed to [redis](https://github.com/NodeRedis/node_redis). See below for default options.
* onError: called when connection to redis fails
* onReady: called when redis is ready to accept commands
* key: a function used to extract the cache key (used in the push and query method for storing, retrieving the cached value). The key returned should be a string or it will be converted to JSON and then md5. Default: a function returning a fixed key. The value won't be cached if the function returns null
* tags: a function that returns an array of tags (strings). You can use that for purging a set of items from the cache.
* maxAge: it is a function that allows you to use a different TTL for a specific item (in seconds). If it returns 0 it will avoid caching the item. The function takes the same arguments as the "push" method (an array of inputs and the output). If it returns undefined, the default ttl will be used.
* maxValidity: the maximum age of an item stored in the cache before being considered "stale" (in seconds). Default: Infinity. You can also pass a function that will calculate the validity of a specific item. The function will take the same arguments as the "push" method (an array of inputs and the output).
* serialize: it is an optional function that serialize the value stored (takes a value, returns a value). It can be used for pruning part of the object we don't want to save or even using a compression algorithm
* deserialize: it is an optional function that deserialize the value stored (takes a value, returns a value).
* serializeAsync: it is an optional function that serialize the value stored, it returns using a callback. It can be used for pruning part of the object we don't want to save or even using a custom compression algorithm
* deserializeAsync: it is an optional function that deserialize the value stored, it returns using a callback.
* compress: if "true" will serialize/deserialize the values using the "snappy" compression algorithms (it can be used in combination with either serialize/serializeAsync steps)

Example:
```js
var Cache = require('memoize-cache-redis');

var cache = new Cache({ redisOpts: {}, key: function (config){
  return config.id;
} });
```

redis default
-------------
By default redis is configured to NOT queue commands when connection is not established. It throws directly an error (enable_offline_queue: false).
Also there is the following default retry strategy (retry_strategy):
```js
function retry_strategy(options) {
  return Math.min(options.attempt * 1000, 5000);
}
```
You can override both parameters using redisOpts.

Methods
=======

Pushing a new cached value
--------------------------
```js
cache.push(args, output);
```
"args" is an array containing the arguments passed to the function that generated the output.
This function is a "fire and forget" caching request. So there is no need of waiting for an answer, but if you want you can use a callback as third argument.
It returns an object or undefined if the value won't be cached (because the TTL is 0 for example, or the resulting cachekey is null).
This object contains:
* key: the "cache key" if the value is scheduled to be cached
* tags: an array with tags. They can be used to track and delete other keys

Querying for cache hit
----------------------
```js
cache.query(args, function (err, result){
  // result.cached is true when you find a cached value
  // result.hit is the value cached
  // result.timing is the time spent in ms to retrieve the value (also used for cache miss)
  // cached.key is the key used to store the value (might be useful for debugging)
  // cache.stale (true/false) depending on the maxValidity function (if defined)
});
```
"args" is an array containing the arguments passed to the function that generated the output.

Getting the cache key
---------------------
```js
var key = cache.getCacheKey(...);
```
It takes as arguments the same arguments of the function. It returns the cache key.
It uses the function passed in the factory function. If it returns a string it uses it as key. In case it is not a string it tries to serialize it to JSON and then to an hash (using md5).

The cache object
----------------
The cache object is in the "cache" property and it support the API specified here: https://github.com/sithmel/little-ds-toolkit#lru-cache

Purging cache items
-------------------
There are 3 methods available:
```js
cache.purgeAll(); // it removes the whole cache (you can pass an optional callback)
```
```js
cache.purgeByKeys(keys);
// it removes the cache item with a specific key (string) or keys (array of strings).
// You can pass an optional callback.
```
```js
cache.purgeByTags(tags);
// it removes the cache item marked with a tag (string) or tags (array of strings).
// You can pass an optional callback.
```
