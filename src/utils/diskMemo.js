const FileCache = require('./FileCache');

/**
 * Async memoize that uses a file cache
 * @param {*} func
 */
const diskMemo = (func) => {
  const cache = new FileCache();
  async function memoized(...args) {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = await func.apply(this, args);
    memoized.cache = cache.set(key, result) || cache;
    return result;
  }
  return memoized;
};

module.exports = diskMemo;
