memoize-cache
=============
[![Build Status](https://travis-ci.org/sithmel/memoize-cache.svg?branch=master)](https://travis-ci.org/sithmel/memoize-cache)

A configurable cache support for functions (https://www.npmjs.com/package/async-deco). It contains:

* base-cache: a prototype implementing all the logic common between different implementations
* cache-ram: is a lightweight yet complete implementation of an in-ram cache. Suitable for using it in the browser
* no-cache: a mock object useful for testing caching errors.

Other implementations
=====================
* [memoize-cache-manager](https://github.com/sithmel/memoize-cache-manager) a [cache-manager](https://github.com/BryanDonovan/node-cache-manager) adapter
* [memoize-cache-redis](https://github.com/sithmel/memoize-cache-manager) using redis as backend

base-cache
==========
Extend this object to implement the cache with different storage/databases. The extension should include a "_set" and "_get" Use cache-ram source as reference implementation.

cache-ram
=========
The constructor takes an option object with 3 optional attributes:
* key: a function used to extract the cache key (used in the push and query method for storing, retrieving the cached value). The key returned should be a string or it will be converted to JSON and then md5. Default: a function returning a fixed key. The value won't be cached if the function returns null
* maxLen: the maximum number of items stored in the cache. Default: Infinity. Cache items will be purged using an LRU algorithm
* maxAge: the maximum age of the item stored in the cache (in seconds). Default: Infinity. You can also pass a function that will calculate the ttl of a specific item (0 will mean no cache). The function will take the same arguments as the "push" method (an array of inputs and the output).
* maxValidity: the maximum age of the item stored in the cache (in seconds) to be considered "not stale". Default: Infinity. You can also pass a function that will calculate the validity of a specific item. The function will take the same arguments as the "push" method (an array of inputs and the output).
* serialize: it is an optional function that serialize the value stored (takes a value, returns a value). It can be used for pruning part of the object we don't want to save or even using a compression algorithm
* deserialize: it is an optional function that deserialize the value stored (takes a value, returns a value).

Both serialize/deserialize can be synchronous (using return) or asynchronous (using a callback with the node convention).

Example:
```js
var Cache = require('memoize-cache/cache-ram'); // or require('memoize-cache').CacheRAM;

// no values, uses always the same key for store any value
var cache = new Cache();

// using the id property of the first argument
// this cache will store maximum 100 items
// every item will be considered stale and purged after 20 seconds.
var cache = new Cache({ key: function (config){
  return config.id;
} }, maxLen: 100, maxAge: 20000);
```

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
* surrogateKeys: an array with surrogate keys. They can be used to track and delete other keys


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
