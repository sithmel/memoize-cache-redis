var snappy
try {
  snappy = require('snappy')
} catch (e) {
  snappy = null
}

var compress = function (obj, cb) {
  snappy.compress(JSON.stringify(obj), function (err, buf) {
    cb(err, buf.toString('binary'))
  })
}

var decompress = function (str, cb) {
  // var buf = Buffer.from(str, 'binary');
  var buf = Buffer.from(str, 'binary')
  snappy.uncompress(buf, { asBuffer: false }, function (err, uncompressed) {
    var obj
    if (err) {
      cb(err)
    } else {
      try {
        obj = JSON.parse(uncompressed)
      } catch (e) {
        return cb(e)
      }
      cb(null, obj)
    }
  })
}

module.exports = {
  compress: compress,
  decompress: decompress,
  isSnappyInstalled: !!snappy
}
