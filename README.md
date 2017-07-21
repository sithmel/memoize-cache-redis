memoize-cache-redis
===================
[![Build Status](https://travis-ci.org/sithmel/memoize-cache-redis.svg?branch=master)](https://travis-ci.org/sithmel/memoize-cache-redis)

A configurable cache support for functions (https://www.npmjs.com/package/async-deco). Redis backend.

cache
=====
The constructor takes an cache-manager object, and an "options" object.
The options object may contain these attributes:
* redisOpts: an object of options passed to [redis](https://github.com/NodeRedis/node_redis)
* key: a function used to extract the cache key (used in the push and query method for storing, retrieving the cached value). The key returned should be a string or it will be converted to JSON and then md5. Default: a function returning a fixed key. The value won't be cached if the function returns null
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

Methods
=======
Check [memoize-cache](https://github.com/sithmel/memoize-cache) for the list of methods
