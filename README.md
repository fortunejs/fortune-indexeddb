# Fortune IndexedDB

[![Build Status](https://img.shields.io/travis/fortunejs/fortune-indexeddb/master.svg?style=flat-square)](https://travis-ci.org/fortunejs/fortune-indexeddb)
[![npm Version](https://img.shields.io/npm/v/fortune-indexeddb.svg?style=flat-square)](https://www.npmjs.com/package/fortune-indexeddb)
[![License](https://img.shields.io/npm/l/fortune-indexeddb.svg?style=flat-square)](https://raw.githubusercontent.com/fortunejs/fortune-indexeddb/master/LICENSE)

This is an IndexedDB adapter for Fortune.js.

```sh
$ npm install fortune-indexeddb --save
```


## Usage

This module works in web browsers only, and falls back to memory if IndexedDB is not available:

```js
const fortune = require('fortune')
const indexedDBAdapter = require('fortune-indexeddb')

const store = fortune(recordTypes, {
  adapter: [ indexedDBAdapter, {
    // Name of the IndexedDB database to use. Defaults to `fortune`.
    name: 'fortune'
  } ]
})
```


## License

This software is licensed under the [MIT license](https://raw.githubusercontent.com/fortunejs/fortune-indexeddb/master/LICENSE).
