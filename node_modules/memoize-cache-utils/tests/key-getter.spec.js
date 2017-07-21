var assert = require('chai').assert;
var keyGetter = require('../key-getter');

describe('key-getter', function () {
  var getKey;
  beforeEach(function () {
    getKey = keyGetter(function (n) {return n;});
  });

  it('must translate string to key', function () {
    assert.equal(getKey('1'), '1');
  });

  it('must translate number to key', function () {
    assert.equal(getKey(1), 'c4ca4238a0b923820dcc509a6f75849b');
  });

  it('must translate object to key', function () {
    assert.equal(getKey({d:1}), 'dc6f789c90af7a7f8156af120f33e3be');
  });

  it('must not translate undefined to key', function () {
    assert.throws(getKey, 'Not a valid key');
  });

  it('must translate null to null', function () {
    assert.equal(getKey(null), null);
  });

  it('must add prefix', function () {
    var getKey2 = keyGetter(function (n) {return n;}, 'v2_');
    assert.equal(getKey2('1'), 'v2_1');
  });

});
