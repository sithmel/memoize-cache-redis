var assert = require('chai').assert;
var Cache = require('../cache-ram');
var lzma = require('lzma-purejs');

describe('cache-ram', function () {

  it('must translate args to key', function () {
    var cache = new Cache({key: function (n) {return n;}});
    assert.equal(cache.getCacheKey('1'), '1');
    assert.equal(cache.getCacheKey(1), 'c4ca4238a0b923820dcc509a6f75849b');
    assert.equal(cache.getCacheKey({d:1}), 'dc6f789c90af7a7f8156af120f33e3be');
  });

  it('must return null key', function () {
    var cache = new Cache({key: function (n) {return null;}});
    assert.equal(cache.getCacheKey('1'), null);
  });

  it('must configure cache: default key', function (done) {
    var cache = new Cache();
    cache.push([], 'result');
    cache.query({}, function (err, res) {
      assert.equal(res.cached, true);
      assert.equal(res.stale, false);
      assert.equal(res.key, '_default');
      assert.equal(res.hit, 'result');
      done();
    });
  });

  it('returns the key', function () {
    var cache = new Cache();
    var obj = cache.push([], 'result');
    assert.equal(obj.key, '_default');
  });

  it('must push twice', function (done) {
    var cache = new Cache();
    cache.push([], 'result1');
    cache.push([], 'result2');
    cache.query({}, function (err, res) {
      assert.equal(res.cached, true);
      assert.equal(res.stale, false);
      assert.equal(res.key, '_default');
      assert.equal(res.hit, 'result2');
      done();
    });
  });

  describe('maxValidity', function () {
    it('must use value', function (done) {
      var cache = new Cache({maxValidity: 0.010});
      cache.push([], 'result');
      cache.query({}, function (err, res) {
        assert.equal(res.cached, true);
        assert.equal(res.stale, false);
        assert.equal(res.key, '_default');
        assert.equal(res.hit, 'result');
        done();
      });
    });

    it('must use value (2)', function (done) {
      var cache = new Cache({maxValidity: 0.010});
      cache.push([], 'result');
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

    it('must use func', function (done) {
      var cache = new Cache({maxValidity: function () {
        return 0.010;
      }});
      cache.push([], 'result');
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

  it('must not cache if key is null', function (done) {
    var cache = new Cache({key: function (n) {return null;}});
    cache.push([], 'result');
    cache.query({}, function (err, res) {
      assert.equal(res.cached, false);
      assert.equal(res.key, null);
      assert.isUndefined(res.hit);
      done();
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

    cache.push(['1'], 'result');
    cache.query(['1'], function (err, res) {
      assert.equal(res.cached, false);
      assert.equal(res.key, '1');
      assert.isUndefined(res.hit);
      done();
    });
  });

  describe('simple key', function () {
    var cache;

    beforeEach(function () {
      cache = new Cache({key: function (data) {
        return data.test;
      }});
      cache.push([{test: '1'}], 'result1');
      cache.push([{test: '2'}], 'result2');
    });

    it('must configure cache: string key 1', function (done) {
      cache.query([{test: '1'}], function (err, res1) {
        assert.equal(res1.cached, true);
        assert.equal(res1.stale, false);
        assert.equal(res1.key, '1');
        assert.equal(res1.hit, 'result1');
        done();
      });
    });

    it('must configure cache: string key 2', function (done) {
      cache.query([{test: '2'}], function (err, res2) {
        assert.equal(res2.cached, true);
        assert.equal(res2.stale, false);
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
    var cache = new Cache({key: function (data) {
      return data.test;
    }});
    cache.push([{test: [1, 2]}], 'result1');
    cache.push([{test: [3, 4]}], 'result2');

    cache.query([{test: [1, 2]}], function (err, res1) {
      assert.equal(res1.cached, true);
      assert.equal(res1.stale, false);
      assert.equal(res1.key, 'f79408e5ca998cd53faf44af31e6eb45');
      assert.equal(res1.hit, 'result1');
      done();
    });
  });

  it('must configure cache: array key', function (done) {
    var cache = new Cache({key: function (data) {
      return data.test[0];
    }});
    cache.push([{test: [1, 2]}], 'result1');

    cache.query([{test: [1, 'x']}], function (err, res1) {
      assert.equal(res1.cached, true);
      assert.equal(res1.stale, false);
      assert.equal(res1.key, 'c4ca4238a0b923820dcc509a6f75849b');
      assert.equal(res1.hit, 'result1');
      done();
    });
  });

  it('must configure cache: array key/object', function (done) {
    var cache = new Cache({key: function (data) {
      return data.test;
    }});
    cache.push([{test: [1, 2]}], 'result1');

    cache.query([{test: [1, 2]}], function (err, res1) {
      assert.equal(res1.cached, true);
      assert.equal(res1.key, 'f79408e5ca998cd53faf44af31e6eb45');
      assert.equal(res1.hit, 'result1');
      done();
    });
  });

  it('must configure cache: func', function (done) {
    var cache = new Cache({key: function (config) {
      return config.test * 2;
    }});
    cache.push([{test: 4}], 'result1');

    cache.query([{test: 4}], function (err, res1) {
      assert.equal(res1.cached, true);
      assert.equal(res1.key, 'c9f0f895fb98ab9159f51fd0297e236d');
      assert.equal(res1.hit, 'result1');
      done();
    });
  });

  describe('maxLen', function () {
    var cache;

    beforeEach(function () {
      cache = new Cache({key: function (data) {
        return data.test;
      }, maxLen: 2});
      cache.push([{test: '1'}], 'result1');
      cache.push([{test: '2'}], 'result2');
    });

    describe('remove one', function () {
      beforeEach(function (done) {
        cache.query([{test: '2'}], function () {
          cache.push([{test: '3'}], 'result3');
          done();
        });
      });

      it('must not be cached (purged)', function (done) {
        cache.query([{test: '1'}], function (err, res1) {
          assert.equal(res1.cached, false);
          done();
        });
      });

      it('must not be cached 1', function (done) {
        cache.query([{test: '2'}], function (err, res2) {
          assert.equal(res2.cached, true);
          assert.equal(res2.key, '2');
          assert.equal(res2.hit, 'result2');
          done();
        });
      });

      it('must not be cached 2', function (done) {
        cache.query([{test: '3'}], function (err, res3) {
          assert.equal(res3.cached, true);
          assert.equal(res3.key, '3');
          assert.equal(res3.hit, 'result3');
          done();
        });
      });
    });
  });

  describe('maxAge', function () {
    var cache;

    beforeEach(function () {
      cache = new Cache({key: function (data) {
        return data.test;
      }, maxAge: 0.030});
      cache.push([{test: '1'}], 'result1');
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
        cache.push([{test: '2'}], 'result2');
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
      }, 40);
    });
  });

  describe('maxAge (function)', function () {
    var cache;

    beforeEach(function () {
      cache = new Cache({
        key: function (data) {
          return data.test;
        },
        maxAge: function (args, output) {
          var data = args[0];
          return data.test === '1' ? 0 : 0.050;
        }});
      cache.push([{test: '1'}], 'result1');
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
      cache.push([{test: '2'}], 'result2');
      setTimeout(function () {
        cache.query([{test: '2'}], function (err, res1) {
          assert.equal(res1.cached, true);
          assert.equal(res1.key, '2');
          assert.equal(res1.hit, 'result2');
          done();
        });
      }, 40);
    });

    it('must be expired after a while', function (done) {
      cache.push([{test: '2'}], 'result2');
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

  it('must serialize/deserialize data with lzma', function (done) {

    var serialize = function (obj) {
      var data = new Buffer(JSON.stringify(obj), 'utf8');
      var compressed = lzma.compressFile(data);
      return compressed;
    };

    var deserialize = function (buf) {
      var uncompressed = lzma.decompressFile(buf);
      var data2 = new Buffer(uncompressed).toString('utf8');
      return JSON.parse(data2);
    };

    var cache = new Cache({serialize: serialize, deserialize: deserialize});
    cache.push([], 'result');
    cache.query({}, function (err, res) {
      assert.equal(res.cached, true);
      assert.equal(res.key, '_default');
      assert.equal(res.hit, 'result');
      done();
    });
  });
});
