'use strict'

var testAdapter = require('fortune/test/adapter')
var indexeddbAdapter = require('../lib')

testAdapter(indexeddbAdapter, {
  name: 'fortune_test'
})
