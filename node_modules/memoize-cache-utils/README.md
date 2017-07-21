memoize-cache-utils
===================
Utilities for memoize-cache.

key-getter
==========
This is an utility function used to generate a function that returns a key from a variable number of arguments.
```js
var keyGetter = require('memoize-cache-utils/key-getter')
var getKey = keyGetter(func, prefix);
```
It takes 2 arguments:
* a function that returns a key (if undefined the default will be a function returning null). Valid outputs are: null, a string or an object. null will default to the key "_default" a string will be used as it is and objects wiil be serialized and hashed.
* an optional prefix. This will be added to the key (default '')
