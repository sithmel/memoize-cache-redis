var assert = require('chai').assert;
var Tags = require('../utils/tags.js');
var redis = require('redis');

describe('tags', function () {

  it('is a function constructor', function () {
    assert.typeOf(Tags, 'function');
  });

  it('returns an object', function () {
    var client = redis.createClient();
    var tags = new Tags(client);
    assert.instanceOf(tags, Object);
  });

  describe('test methods', function () {
    var client = redis.createClient();
    var tags;

    beforeEach(function () {
      client.flushdb();
      tags = new Tags(client);
    });

    it('adds a key without ttl', function (done) {
      tags.add('key1', ['a', 'b', 'c'], null, function (err) {
        tags.getTags('key1', function (err, tags) {
          assert.notEqual(tags.indexOf('a'), -1);
          assert.notEqual(tags.indexOf('b'), -1);
          assert.notEqual(tags.indexOf('c'), -1);
          done();
        });
      });
    });

    it('adds a key without ttl (2)', function (done) {
      tags.add('key1', ['a', 'b', 'c'], null, function (err) {
        tags.getKeys('a', function (err, keys) {
          assert.deepEqual(keys, ['key1']);
          done();
        });
      });
    });

    it('adds 2 keys without ttl', function (done) {
      tags.add('key1', ['a', 'b'], null, function (err) {
        tags.add('key2', ['b', 'c'], null, function (err) {
          tags.getTags(['key1', 'key2'], function (err, tags) {
            assert.notEqual(tags.indexOf('a'), -1);
            assert.notEqual(tags.indexOf('b'), -1);
            assert.notEqual(tags.indexOf('c'), -1);
            done();
          });
        });
      });
    });

    it('adds 2 keys without ttl (2)', function (done) {
      tags.add('key1', ['a', 'b'], null, function (err) {
        tags.add('key2', ['b', 'c'], null, function (err) {
          tags.getKeys(['b'], function (err, keys) {
            assert.notEqual(keys.indexOf('key1'), -1);
            assert.notEqual(keys.indexOf('key2'), -1);
            done();
          });
        });
      });
    });

    it('returns empty array for unexisting key', function (done) {
      tags.getTags(['key1', 'key2'], function (err, tags) {
        assert.deepEqual(tags, []);
        done();
      });
    });

    it('returns empty array for unexisting tag', function (done) {
      tags.getKeys(['tag1'], function (err, keys) {
        assert.deepEqual(keys, []);
        done();
      });
    });

    it('adds a key with ttl', function (done) {
      tags.add('key1', ['a', 'b', 'c'], 1000, function (err) {
        setTimeout(function () {
          tags.getTags('key1', function (err, tags) {
            assert.deepEqual(tags, []);
            done();
          });
        }, 1100);
      });
    });

    it('adds a key with ttl (2)', function (done) {
      tags.add('key1', ['a', 'b', 'c'], 1000, function (err) {
        setTimeout(function () {
          tags.getKeys('a', function (err, keys) {
            assert.deepEqual(keys, []);
            done();
          });
        }, 1100);
      });
    });

    it('removes a key', function (done) {
      tags.add('key1', ['a', 'b', 'c'], null, function (err) {
        tags.removeKeys('key1', function (err) {
          tags.getTags('key1', function (err, tgs) {
            assert.deepEqual(tgs, []);
            tags.getKeys('a', function (err, keys) {
              assert.deepEqual(keys, []);
              done();
            });
          });
        });
      });
    });

    it('removes tags', function (done) {
      tags.add('key1', ['a', 'b', 'c'], null, function (err) {
        tags.removeTags(['b', 'c'], function (err) {
          tags.getTags('key1', function (err, tgs) {
            assert.deepEqual(tgs, ['a']);
            tags.getKeys('a', function (err, keys) {
              assert.deepEqual(keys, ['key1']);
              tags.getKeys('b', function (err, keys) {
                assert.deepEqual(keys, []);
                done();
              });
            });
          });
        });
      });
    });

  });
});
