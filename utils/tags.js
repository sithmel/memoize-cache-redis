var parallel = require('./parallel')

function Tags (client, prefixKeys, prefixTags) {
  this.client = client
  this.prefixKeys = prefixKeys || 'keysSet-'
  this.prefixTags = prefixTags || 'tagsSet-'
}

Tags.prototype.add = function add (key, tags, ttl, next) {
  var multi = this.client.multi()
  multi.sadd(this.prefixKeys + key, tags)

  if (ttl) {
    multi.expire(this.prefixKeys + key, Math.round(ttl / 1000))
  }

  for (var i = 0; i < tags.length; i++) {
    multi.sadd(this.prefixTags + tags[i], key)
    if (ttl) {
      multi.expire(this.prefixTags + tags[i], Math.round(ttl / 1000))
    }
  }
  multi.exec(next)
}

function flatten (arrayOfArrays) {
  return arrayOfArrays.reduce(function (a, b) {
    return a.concat(b)
  }, [])
}

Tags.prototype.getTags = function getTags (keys, next) {
  keys = Array.isArray(keys) ? keys : [keys]
  var that = this
  var getTags = parallel(keys.map(function (key) {
    return function (cb) {
      return that.client.smembers(that.prefixKeys + key, cb)
    }
  }))
  getTags(function (err, tagsArray) {
    if (err) return next(err)
    var tags = flatten(tagsArray)
    next(null, tags)
  })
}

Tags.prototype.getKeys = function getKeys (tags, next) {
  tags = Array.isArray(tags) ? tags : [tags]
  var that = this
  var getKeys = parallel(tags.map(function (tag) {
    return function (cb) {
      return that.client.smembers(that.prefixTags + tag, cb)
    }
  }))
  getKeys(function (err, keysArray) {
    if (err) return next(err)
    var keys = flatten(keysArray)
    next(null, keys)
  })
}

Tags.prototype.removeKeys = function removeKeys (keys, next) {
  keys = Array.isArray(keys) ? keys : [keys]
  var multi = this.client.multi()
  var prefixTags = this.prefixTags
  var prefixKeys = this.prefixKeys
  this.getTags(keys, function (err, tags) {
    if (err) return next(err)
    for (var i = 0; i < tags.length; i++) {
      multi.srem(prefixTags + tags[i], keys)
    }
    for (var j = 0; j < keys.length; j++) {
      multi.del(prefixKeys + keys[j])
    }
    multi.exec(next)
  })
}

Tags.prototype.removeTags = function removeTags (tags, next) {
  tags = Array.isArray(tags) ? tags : [tags]
  var multi = this.client.multi()
  var prefixTags = this.prefixTags
  var prefixKeys = this.prefixKeys
  this.getKeys(tags, function (err, keys) {
    if (err) return next(err)
    for (var i = 0; i < keys.length; i++) {
      multi.srem(prefixKeys + keys[i], tags)
    }
    for (var j = 0; j < tags.length; j++) {
      multi.del(prefixTags + tags[j])
    }
    multi.exec(next)
  })
}

module.exports = Tags
