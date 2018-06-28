var fortune = require('fortune')
var indexedDBAdapter = require('../lib')

var store = fortune({
  person: {
    name: String,
    friends: [ Array('person'), 'friends' ]
  }
}, {
  adapter: indexedDBAdapter
})

store.connect().then(function () {
  return store.find('person')
}).then(function (result) {
	document.write('inital find<br/><pre>' + JSON.stringify(result, null, 2) + '</pre>')
  return store.adapter.delete('person')
}).then(function () {
  return store.create('person', {
    id: 1,
    name: 'A'
  })
}).then(function (result) {
  var record = result.payload.records[0]
  return store.create('person', {
    id: 2,
    name: 'B',
    friends: [ record.id ]
  })
}).then(function () {
  return store.find('person')
}).then(function (result) {
  document.write('memory find<br/><pre>' + JSON.stringify(result, null, 2) + '</pre>')
})
