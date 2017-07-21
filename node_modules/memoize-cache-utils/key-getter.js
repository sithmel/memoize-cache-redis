var md5omatic = require('md5-o-matic');

module.exports = function (func, prefix) {
  prefix = prefix || '';
  func = func || function () { return '_default'; };
  return function () {
    var args = Array.prototype.slice.call(arguments);
    var k = func.apply(undefined, args);
    if (k === null) {
      return null;
    }
    if (typeof k === 'undefined' ||
      (typeof k === 'number' && isNaN(k)) ||
      k === '' ||
      (typeof k === 'object' && Object.keys(k).length === 0)) {
      throw new Error('Not a valid key');
    }
    if (typeof k !== 'string') {
      k = md5omatic(JSON.stringify(k));
    }
    return prefix + k;
  };
};
