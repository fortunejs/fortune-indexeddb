# Fortune IndexedDB

[![Build Status](https://img.shields.io/travis/fortunejs/fortune-indexeddb/master.svg?style=flat-square)](https://travis-ci.org/fortunejs/fortune-indexeddb)
[![npm Version](https://img.shields.io/npm/v/fortune-indexeddb.svg?style=flat-square)](https://www.npmjs.com/package/fortune-indexeddb)
[![License](https://img.shields.io/npm/l/fortune-indexeddb.svg?style=flat-square)](https://raw.githubusercontent.com/fortunejs/fortune-indexeddb/master/LICENSE)

This is an IndexedDB adapter for Fortune.js. Various performance and compatibility optimizations are included:

- Runs in a Web Worker so that database operations don't [block the main thread](https://nolanlawson.com/2015/09/29/indexeddb-websql-localstorage-what-blocks-the-dom/), and uses [MessagePack](http://msgpack.org) for [messaging](https://developer.mozilla.org/en/docs/Web/API/Worker/postMessage).
- Lazy loads records as they're requested and keeps them in memory.
- Primary keys are universally unique, which solves some [compatibility problems](https://www.raymondcamden.com/2014/09/25/IndexedDB-on-iOS-8-Broken-Bad).

```sh
$ npm install fortune-indexeddb
```


## Usage

This module works in web browsers only, and falls back to memory if IndexedDB is not available:

```js
const fortune = require('fortune')
const indexedDBAdapter = require('fortune-indexeddb')

const store = fortune(recordTypes, {
  adapter: [ indexedDBAdapter, {
    // Name of the IndexedDB database to use. Defaults to `db`.
    name: 'db',
    // These are optional to implement, if storage compression is needed.
    compress: uint8array => uint8array,
    decompress: uint8array => uint8array,
  } ]
})
```


## License

This software is licensed under the [MIT license](https://raw.githubusercontent.com/fortunejs/fortune-indexeddb/master/LICENSE).
