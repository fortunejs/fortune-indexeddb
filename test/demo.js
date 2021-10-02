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

var time;

store.connect().then(function () {
  return store.adapter.delete('person')
}).then(function () {
  time = Date.now()
  return store.create('person', {
    id: 1,
    name: 'A'
  })
}).then(function (result) {
  var record = result.payload.records[0]
  return store.create('person', new Array(100).fill().map(() => ({
    // id: 2,
    name: 'B',
    friends: [ record.id ]
  })))
}).then(function () {
  document.write('<pre>write ' + (Date.now() - time) + ' ms</pre>')
  time = Date.now()
  return store.find('person')
}).then(function (result) {
  document.write('<pre>read ' + (Date.now() - time) + ' ms</pre>')
  // document.write('<pre>' + JSON.stringify(result, null, 2) + '</pre>')
  time = Date.now()
  const { payload: { records: [{ friends }] } } = result;
  return Promise.all(friends.map(id => store.find('person', id)))
}).then(function (result) {
  document.write('<pre>read parallel ' + (Date.now() - time) + ' ms</pre>')
})
