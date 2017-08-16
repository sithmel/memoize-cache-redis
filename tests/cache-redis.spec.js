var assert = require('chai').assert;
var Cache = require('..');
var snappy = require('snappy');
var redis = require('redis');

describe('cache-redis', function () {

  beforeEach(function () {
    redis.createClient().flushdb();
  });

  it('must translate args to key', function () {
    var cache = new Cache({ key: function (n) {return n;} });
    assert.equal(cache.getCacheKey('1'), '1');
    assert.equal(cache.getCacheKey(1), 'c4ca4238a0b923820dcc509a6f75849b');
    assert.equal(cache.getCacheKey({d:1}), 'dc6f789c90af7a7f8156af120f33e3be');
  });

  it('returns the key', function () {
    var cache = new Cache();
    var obj = cache.push([], 'result');
    assert.equal(obj.key, '_default');
  });

  it('must configure cache: default key', function (done) {
    var cache = new Cache();
    cache.push([], 'result', function (err) {
      cache.query({}, function (err, res) {
        assert.equal(res.cached, true);
        assert.equal(res.key, '_default');
        assert.equal(res.hit, 'result');
        done();
      });
    });
  });

  it('must remove key', function (done) {
    var cache = new Cache();
    cache.push([], 'result', function (err) {
      cache.purgeByKeys('_default', function (err) {
        cache.query({}, function (err, res) {
          assert.equal(res.cached, false);
          assert.equal(res.key, '_default');
          assert.isUndefined(res.hit);
          done();
        });
      });
    });
  });

  it('must remove key using a tag', function (done) {
    var cache = new Cache({tags: function () { return ['tag']; } });
    cache.push([], 'result', function (err) {
      cache.purgeByTags('tag', function (err) {
        cache.query({}, function (err, res) {
          assert.equal(res.cached, false);
          assert.equal(res.key, '_default');
          assert.isUndefined(res.hit);
          done();
        });
      });
    });
  });

  it('must push twice', function (done) {
    var cache = new Cache();
    cache.push([], 'result1', function (err) {
      cache.push([], 'result2', function (err) {
        cache.query({}, function (err, res) {
          assert.equal(res.cached, true);
          assert.equal(res.stale, false);
          assert.equal(res.key, '_default');
          assert.equal(res.hit, 'result2');
          done();
        });
      });
    });
  });

  describe('maxValidity', function () {
    it('must use value', function (done) {
      var cache = new Cache({ maxValidity: 0.100 });
      cache.push([], 'result', function (err) {
        cache.query({}, function (err, res) {
          assert.equal(res.cached, true);
          assert.equal(res.stale, false);
          assert.equal(res.key, '_default');
          assert.equal(res.hit, 'result');
          done();
        });
      });
    });

    it('must use value (2)', function (done) {
      var cache = new Cache({ maxValidity: 0.030 });
      cache.push([], 'result', function (err) {
        setTimeout(function () {
          cache.query({}, function (err, res) {
            assert.equal(res.cached, true);
            assert.equal(res.stale, true);
            assert.equal(res.key, '_default');
            assert.equal(res.hit, 'result');
            done();
          });
        }, 40);
      });
    });

    it('must use func', function (done) {
      var cache = new Cache({ maxValidity: function () {
        return 0.010;
      }});
      cache.push([], 'result', function (err) {
        setTimeout(function () {
          cache.query({}, function (err, res) {
            assert.equal(res.cached, true);
            assert.equal(res.stale, true);
            assert.equal(res.key, '_default');
            assert.equal(res.hit, 'result');
            done();
          });
        }, 15);
      });
    });
  });

  it('must return null key', function () {
    var cache = new Cache({ key: function (n) {return null;}});
    assert.equal(cache.getCacheKey('1'), null);
  });

  it('must not cache if key is null', function (done) {
    var cache = new Cache({ key: function (n) {return null;} });
    cache.push([], 'result', function (err) {
      cache.query({}, function (err, res) {
        assert.equal(res.cached, false);
        assert.equal(res.key, null);
        assert.isUndefined(res.hit);
        done();
      });
    });
  });

  it('must not cache with specific output', function (done) {
    var cache = new Cache({
      key: function (n) {
        return n;
      },
      maxAge: function (args, output) {
        if (output === 'result') {
          return 0;
        }
        return Infinity;
      }
    });
    cache.push(['1'], 'result', function (err) {
      cache.query(['1'], function (err, res) {
        assert.equal(res.cached, false);
        assert.equal(res.key, '1');
        assert.isUndefined(res.hit);
        done();
      });
    });
  });

  describe('simple key', function () {
    var cache;

    beforeEach(function (done) {
      cache = new Cache({ key: function (data) {
        return data.test;
      } });
      cache.push([{test: '1'}], 'result1', function (err) {
        cache.push([{test: '2'}], 'result2', done);
      });
    });

    it('must configure cache: string key 1', function (done) {
      cache.query([{test: '1'}], function (err, res1) {
        assert.equal(res1.cached, true);
        assert.equal(res1.key, '1');
        assert.equal(res1.hit, 'result1');
        done();
      });
    });

    it('must configure cache: string key 2', function (done) {
      cache.query([{test: '2'}], function (err, res2) {
        assert.equal(res2.cached, true);
        assert.equal(res2.key, '2');
        assert.equal(res2.hit, 'result2');
        done();
      });
    });

    it('must configure cache: string key 3', function (done) {
      cache.query([{test: '3'}], function (err, res3) {
        assert.equal(res3.cached, false);
        assert.equal(res3.key, '3');
        assert.isUndefined(res3.hit);
        done();
      });
    });
  });

  it('must configure cache: string key/object', function (done) {
    var cache = new Cache({ key: function (data) {
      return data.test;
    } });

    cache.push([{test: [1, 2]}], 'result1', function (err) {
      cache.push([{test: [3, 4]}], 'result2', function (err) {
        cache.query([{test: [1, 2]}], function (err, res1) {
          assert.equal(res1.cached, true);
          assert.equal(res1.key, 'f79408e5ca998cd53faf44af31e6eb45');
          assert.equal(res1.hit, 'result1');
          done();
        });
      });
    });

  });

  it('must configure cache: array key', function (done) {
    var cache = new Cache({ key: function (data) {
      return data.test[0];
    } });
    cache.push([{test: [1, 2]}], 'result1', function (err) {
      cache.query([{test: [1, 'x']}], function (err, res1) {
        assert.equal(res1.cached, true);
        assert.equal(res1.key, 'c4ca4238a0b923820dcc509a6f75849b');
        assert.equal(res1.hit, 'result1');
        done();
      });
    });

  });

  it('must configure cache: array key/object', function (done) {
    var cache = new Cache({ key: function (data) {
      return data.test;
    }});
    cache.push([{test: [1, 2]}], 'result1', function (err) {
      cache.query([{test: [1, 2]}], function (err, res1) {
        assert.equal(res1.cached, true);
        assert.equal(res1.key, 'f79408e5ca998cd53faf44af31e6eb45');
        assert.equal(res1.hit, 'result1');
        done();
      });
    });

  });

  it('must configure cache: func', function (done) {
    var cache = new Cache({ key: function (config) {
      return config.test * 2;
    } });
    cache.push([{test: 4}], 'result1', function (err) {
      cache.query([{test: 4}], function (err, res1) {
        assert.equal(res1.cached, true);
        assert.equal(res1.key, 'c9f0f895fb98ab9159f51fd0297e236d');
        assert.equal(res1.hit, 'result1');
        done();
      });
    });
  });

  describe('maxAge', function () {
    var cache;

    beforeEach(function (done) {
      cache = new Cache({ key: function (data) {
        return data.test;
      }, maxAge: 0.030 });
      cache.push([{test: '1'}], 'result1', done);
    });

    it('must be cached', function (done) {
      cache.query([{test: '1'}], function (err, res1) {
        assert.equal(res1.cached, true);
        assert.equal(res1.key, '1');
        assert.equal(res1.hit, 'result1');
        done();
      });
    });

    it('must be cached after a bit', function (done) {
      setTimeout(function () {
        cache.query([{test: '1'}], function (err, res1) {
          assert.equal(res1.cached, true);
          assert.equal(res1.key, '1');
          assert.equal(res1.hit, 'result1');
          done();
        });
      }, 10);
    });

    it('must be expired after a while', function (done) {
      setTimeout(function () {
        cache.push([{test: '2'}], 'result2', function (err) {
          cache.query([{test: '1'}], function (err, res1) {
            assert.equal(res1.cached, false);
            assert.equal(res1.key, '1');
            assert.isUndefined(res1.hit);
            cache.query([{test: '2'}], function (err, res1) {
              assert.equal(res1.cached, true);
              assert.equal(res1.key, '2');
              assert.equal(res1.hit, 'result2');
              done();
            });
          });
        });
      }, 40);
    });
  });

  describe('maxAge (function)', function () {
    var cache;

    beforeEach(function (done) {
      cache = new Cache({
        key: function (data) {
          return data.test;
        },
        maxAge: function (args, output) {
          var data = args[0];
          return data.test === '1' ? 0 : 0.050;
        }
      });

      cache.push([{test: '1'}], 'result1', done);
    });

    it('must not be cached', function (done) {
      cache.query([{test: '1'}], function (err, res1) {
        assert.equal(res1.cached, false);
        assert.equal(res1.key, '1');
        assert.isUndefined(res1.hit);
        done();
      });
    });

    it('must be not expired', function (done) {
      cache.push([{test: '2'}], 'result2', function (err) {
        setTimeout(function () {
          cache.query([{test: '2'}], function (err, res1) {
            assert.equal(res1.cached, true);
            assert.equal(res1.key, '2');
            assert.equal(res1.hit, 'result2');
            done();
          });
        }, 40);
      });
    });

    it('must be expired after a while', function (done) {
      cache.push([{test: '2'}], 'result2', function (err) {
        setTimeout(function () {
          cache.query([{test: '2'}], function (err, res1) {
            assert.equal(res1.cached, false);
            assert.equal(res1.key, '2');
            assert.isUndefined(res1.hit);
            done();
          });
        }, 60);
      });
    });
  });

  it('must serialize/deserialize data with snappy', function (done) {
    var serialize = function (obj) {
      var data = new Buffer(JSON.stringify(obj), 'binary');
      var compressed = snappy.compressSync(data).toString('binary');
      return compressed;
    };

    var deserialize = function (str) {
      var buf = new Buffer(str, 'binary');
      var uncompressed = snappy.uncompressSync(buf, { asBuffer: false });
      return JSON.parse(uncompressed);
    };

    var cache = new Cache({ serialize: serialize, deserialize: deserialize});
    cache.push([], 'result', function (err) {
      cache.query({}, function (err, res) {
        assert.equal(res.cached, true);
        assert.equal(res.key, '_default');
        assert.equal(res.hit, 'result');
        done();
      });
    });
  });

  it('must serialize/deserialize data with snappy async', function (done) {
    var serialize = function (obj, cb) {
      snappy.compress(JSON.stringify(obj), function (err, buf) {
        cb(err, buf.toString('binary'));
      });
    };

    var deserialize = function (str, cb) {
      // var buf = Buffer.from(str, 'binary');
      var buf = new Buffer(str, 'binary');
      snappy.uncompress(buf, { asBuffer: false }, function (err, uncompressed) {
        var obj;
        if (err) {
          cb(err);
        }
        else {
          try {
            obj = JSON.parse(uncompressed);
          }
          catch (e) {
            return cb(e);
          }
          cb(null, obj);
        }
      });
    };

    var cache = new Cache({ serializeAsync: serialize, deserializeAsync: deserialize });
    cache.push([], 'result', function (err) {
      cache.query({}, function (err, res) {
        assert.equal(res.cached, true);
        assert.equal(res.key, '_default');
        assert.equal(res.hit, 'result');
        done();
      });
    });
  });

  it('must serialize/deserialize data with snappy (use flag)', function (done) {
    var cache = new Cache({ compress: true });
    cache.push([], 'result', function (err) {
      cache.query({}, function (err, res) {
        assert.equal(res.cached, true);
        assert.equal(res.key, '_default');
        assert.equal(res.hit, 'result');
        done();
      });
    });
  });

  it('must serialize/deserialize data with snappy (use flag + serialize)', function (done) {
    var serialize = function (obj) {
      return obj.split();
    };

    var deserialize = function (arr) {
      return arr.join('');
    };

    var cache = new Cache({ compress: true, serialize: serialize, deserialize: deserialize });
    cache.push([], 'result', function (err) {
      cache.query({}, function (err, res) {
        assert.equal(res.cached, true);
        assert.equal(res.key, '_default');
        assert.equal(res.hit, 'result');
        done();
      });
    });
  });
});
