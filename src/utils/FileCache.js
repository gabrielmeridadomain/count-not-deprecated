/* eslint-disable class-methods-use-this */
const { createHash } = require('crypto');
const fs = require('fs');

const rootDir = '.cache';
const hash = (value) =>
  createHash('sha1')
    .update(value, 'utf8')
    .digest('hex');
const fsOpts = { encoding: 'utf-8' };

class FileCache {
  constructor() {
    if (!fs.existsSync(rootDir)) {
      fs.mkdirSync(rootDir);
    }
  }

  has(key) {
    return fs.existsSync(`${rootDir}/${hash(key)}`);
  }

  get(key) {
    return JSON.parse(fs.readFileSync(`${rootDir}/${hash(key)}`, fsOpts));
  }

  set(key, value) {
    fs.writeFileSync(
      `${rootDir}/${hash(key)}`,
      JSON.stringify(value, null, 2),
      fsOpts,
    );
  }
}

module.exports = FileCache;
