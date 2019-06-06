'use strict'

var msgpack = require('msgpack-lite')

var worker = require('./worker')
var helpers = require('./helpers')
var inputRecord = helpers.inputRecord
var outputRecord = helpers.outputRecord
var delimiter = helpers.delimiter


/**
 * IndexedDB adapter. Available options:
 *
 * - `name`: Name of the database to connect to. Default: `db`.
 */
module.exports = function (Adapter) {
  var MemoryAdapter = Adapter.DefaultAdapter

  function IndexedDBAdapter (properties) {
    MemoryAdapter.call(this, properties)
    if (!this.options.name) this.options.name = 'db'

    // No LRU for IndexedDB, allow as many records as possible.
    delete this.options.recordsPerType
  }

  IndexedDBAdapter.prototype = Object.create(MemoryAdapter.prototype)


  IndexedDBAdapter.prototype.connect = function () {
    var self = this
    var primaryKey = self.common.constants.primary
    var assign = self.common.assign
    var typesArray = Object.keys(self.recordTypes)
    var name = self.options.name
    var id = self.common.generateId()

    return MemoryAdapter.prototype.connect.call(self)
      .then(function () {
        return new Promise(function (resolve, reject) {
          var hasIndexedDB = 'indexedDB' in window
          var hasWebWorker = 'Worker' in window
          var hasBlob = 'Blob' in window
          var hasCreateObjectURL = 'URL' in window && 'createObjectURL' in URL
          var blob, objectURL, worker

          // Now that we're in here, need to check for private browsing modes.
          if (hasIndexedDB && hasWebWorker && hasBlob && hasCreateObjectURL)
            try {
              // This will fail synchronously if it's not supported.
              indexedDB.open('').onsuccess = function (event) {
                event.target.result.close() // Close unused connection.
              }
            }
            catch (error) {
              return reject(new Error('IndexedDB capabilities detected, but ' +
                'a connection could not be opened. This is most likely due ' +
                'to browser security settings.'))
            }
          else return reject(new Error('IndexedDB pre-requisites not met.'))

          // Need to check for IndexedDB support within Web Worker.
          blob = new Blob([
            'self.postMessage(Boolean(self.indexedDB))'
          ], { type: 'text/javascript' })
          objectURL = URL.createObjectURL(blob)
          worker = new Worker(objectURL)

          worker.onmessage = function (message) {
            return message.data ? resolve() :
              reject(new Error('No IndexedDB support in Web Worker.'))
          }

          return null
        })
        // After this point, no more checks.
          .then(function () {
            return new Promise(function (resolve, reject) {
              var script, blob, objectURL

              script = [
                'var primaryKey = "' + primaryKey + '"',
                'var delimiter = "' + delimiter + '"',
                'var dataKey = "__data"',
                '(' + worker.toString() + ')()'
              ].join(';')
              blob = new Blob([ script ], { type: 'text/javascript' })
              objectURL = URL.createObjectURL(blob)

              self.worker = new Worker(objectURL)
              self.worker.addEventListener('message', listener)
              self.worker.postMessage({
                id: id, method: 'connect',
                name: name, typesArray: typesArray
              })

              function listener (event) {
                var data = event.data

                if (data.id !== id) return null
                if (data.error) return reject(new Error(data.error))

                self.worker.removeEventListener('message', listener)

                return resolve()
              }
            })
          })
          // Warning and fallback to memory adapter.
          .catch(function (error) {
            console.warn(error.message) // eslint-disable-line no-console

            // Assign instance methods of the memory adapter.
            assign(self, MemoryAdapter.prototype)
          })
      })
  }


  IndexedDBAdapter.prototype.disconnect = function () {
    this.worker.postMessage({ method: 'disconnect' })
    return MemoryAdapter.prototype.disconnect.call(this)
  }


  IndexedDBAdapter.prototype.find = function (type, ids, options) {
    var self = this
    var primaryKey = self.common.constants.primary
    var id = self.common.generateId()

    return new Promise(function (resolve, reject) {
      self.worker.addEventListener('message', listener)
      self.worker.postMessage({
        id: id, method: ids ? 'find' : 'findAll',
        type: type, ids: ids
      })

      function listener (event) {
        var data = event.data

        if (data.id !== id) return null
        if (data.error) return reject(new Error(data.error))

        self.worker.removeEventListener('message', listener)

        return resolve(data.result)
      }
    })
      .then(function (records) {
        var record, i

        // Populating memory database with results from IndexedDB.
        for (i = 0; i < records.length; i++) {
          record = outputRecord.call(self, type, msgpack.decode(records[i]))
          self.db[type][record[primaryKey]] = record
        }

        return MemoryAdapter.prototype.find.call(self, type, ids, options)
      })
  }


  IndexedDBAdapter.prototype.create = function (type, records, meta) {
    var self = this
    var primaryKey = self.common.constants.primary
    var reduce = self.common.reduce
    var collection = self.db[type]
    var ConflictError = self.errors.ConflictError
    var message = self.message
    var language

    if (!meta) meta = {}
    language = meta.language

    return Promise.resolve(records.length ?
      new Promise(function (resolve, reject) {
        var id = self.common.generateId()
        var transfer = []

        self.worker.addEventListener('message', listener)
        self.worker.postMessage({
          id: id, method: 'create', type: type,
          records: reduce(records, function (hash, record) {
            var data, id

            // Need to set the primary key and get the raw value, since it
            // will be transformed later.
            id = record[primaryKey] = primaryKey in record ?
              record[primaryKey] : self.common.generateId()

            record = inputRecord.call(self, type, record)
            data = msgpack.encode(record)

            if (collection.hasOwnProperty(id))
              throw new ConflictError(
                message('RecordExists', language, { id: id }))

            transfer.push(data.buffer)
            hash[id] = data
            return hash
          }, {})
        }, transfer)

        function listener (event) {
          var data = event.data

          if (data.id !== id) return null
          if (data.error) return reject(new Error(data.error))

          self.worker.removeEventListener('message', listener)
          return resolve(records)
        }
      }) : records)
      .then(function (records) {
        return MemoryAdapter.prototype.create.call(self, type, records)
      })
  }


  IndexedDBAdapter.prototype.update = function (type, updates) {
    var self = this
    var primaryKey = self.common.constants.primary
    var reduce = self.common.reduce
    var db = self.db
    var id = self.common.generateId()
    var applyUpdate = self.common.applyUpdate
    var clone = self.common.clone

    return Promise.resolve(updates.length ?
      new Promise(function (resolve, reject) {
        var i, j, update, record, clonedRecord, records = [], transfer = []

        for (i = 0, j = updates.length; i < j; i++) {
          update = updates[i]
          record = db[type][update[primaryKey]]
          if (!record) continue

          // Clone the record then apply the update before sending to
          // worker thread, or else the update won't be transferred.
          clonedRecord = clone(record)
          applyUpdate(clonedRecord, update)
          records.push(clonedRecord)
        }

        if (!records.length) return resolve()

        self.worker.addEventListener('message', listener)
        self.worker.postMessage({
          id: id, method: 'update', type: type,
          records: reduce(records, function (hash, record) {
            var data

            record = inputRecord.call(self, type, record)
            data = msgpack.encode(record)
            transfer.push(data.buffer)
            hash[record[primaryKey]] = data
            return hash
          }, {})
        }, transfer)

        return null

        function listener (event) {
          var data = event.data

          if (data.id !== id) return null
          if (data.error) return reject(new Error(data.error))

          self.worker.removeEventListener('message', listener)

          return resolve()
        }
      }) : null)
      .then(function () {
        return MemoryAdapter.prototype.update.call(self, type, updates)
      })
  }


  IndexedDBAdapter.prototype.delete = function (type, ids) {
    var self = this
    var id = self.common.generateId()

    return Promise.resolve(!ids || ids.length ?
      new Promise(function (resolve, reject) {
        self.worker.addEventListener('message', listener)
        self.worker.postMessage({
          id: id, method: ids ? 'delete' : 'deleteAll',
          type: type, ids: ids
        })

        function listener (event) {
          var data = event.data

          if (data.id !== id) return null
          if (data.error) return reject(new Error(data.error))

          self.worker.removeEventListener('message', listener)

          return resolve()
        }
      }) : null)
      .then(function () {
        return MemoryAdapter.prototype.delete.call(self, type, ids)
      })
  }

  return IndexedDBAdapter
}
