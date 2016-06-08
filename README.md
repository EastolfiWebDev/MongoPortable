# MongoPortable
Solution for a MongoDB-like portable database.

[![Package Version][npm-image]][npm-url]
[![NodeJS Version][node-image]][node-url]

[![Linux Build][travis-image]][travis-url]
[![Windows Build][appveyor-image]][appveyor-url]
[![Test Coverage][coveralls-image]][coveralls-url]
[![Downloads][downloads-image]][npm-url]
[![Documentation Status][docs-image]][docs-url]

It handles the collections and documents in memory, and allow the use of stores for persistence.

# Installation
```shell
npm install --save mongo-portable
```
# Usage
```javascript
// Declaring the module dependency
var MongoPortable = require("MongoPortable");

// Instantiates a new ddbb object by passing a ddbb name
var db = new MongoPortable("TEST");

// Creates a new collection named "users" 
//      (if it's already created, it will just return it instead)
var users = db.collection("users");

// Inserts a new document into the collection
var document = users.insert({ name: "John", lastName: "Abruzzi" });
console.log(document);  // -> { name: "John", lastName: "Abruzzi" }

// Creates a cursor with the query information, ready to be fetched
var cursor = users.find({ name: "John" });

// Iterates over the cursor, obtaining each document that matchs the query
cursor.forEach(function(doc) {
    console.log(doc);  // -> { name: "John", lastName: "Abruzzi" }
});
```

# Modules
The modules visibles for an application are [MongoPortable](#MongoPortable), [Collection](#Collection) and [Cursor](#Cursor).

## MongoPortable
Handles the database, collections and connections.

Read the full API documentation [here][API-MongoPortable]

## Collection
Handles the list of documents by using cursors.

Read the full API documentation [here][API-Collection]

## Cursor
Fetchs and access the documents to return them to the client.

Read the full API documentation [here][API-Cursor]

----------

# Stores
## File System Store
It is located in a separated module, so install it by:
```shell
npm install --save FileSystemStore
```
And then use it in your application by adding it in your MongoPortable instance:
```javascript
var FileSystemStore = require("FileSystemStore");
db.addStore(FileSystemStore);
```
or as a middleware:
```javascript
var FileSystemStore = require("FileSystemStore");
db.use("store", FileSystemStore);
```

View the package [here][Module-FileSystemStore] and read the full API documentation [here][API-FileSystemStore]

----------

## TO-DO List
### Database Operations
- [ ] DDBB
    * [X] .use() (Middleware)
    * [X] .addStore()
    * [X] .dropDatabase()
    * [ ] Connections
- [ ] Collections
    * [ ] .collectionsInfo()
    * [X] .collections()
    * [X] .collectionNames()
    * [X] .collection()
    * [X] .dropCollection()
    * [X] .renameCollection()
    * [X] .dropCollection()
    * [X] .dropCollection()
    * [X] .dropCollection()
- [ ] Indexes
    * [ ] .createIndex()
    * [ ] .ensureIndex()
    * [ ] .dropIndex()
    * [ ] .reIndex()
    * [ ] .indexInformation()
- [ ] [db.runCommand()][Mongo-db-command]
    * [ ] User Commands
    * [ ] Database Operations
    * [ ] Internal Commands
    * [ ] Testing Commands
    * [ ] Auditing Commands

Read the full API documentation [here][API-MongoPortable]

----------

## Collection
- [X] Creating
    * [X] .insert()
- [X] Reading
    * [X] .find()
    * [X] .findOne()
- [X] Updating
    * [X] .update()
- [X] Deleting
    * [X] .remove()

Read the full API documentation [here][API-Collection]

----------

## Cursor
- [X] Fetching
    * [X] .rewind()
    * [X] .forEach()
    * [X] .map()
    * [X] .hasNext()
    * [X] .next()
    * [X] .fetchAll()
    * [X] .fetchOne()
    * [X] .count()
    * [X] .sort()
    * [X] .skip()
    * [X] .limit()
- [ ] Managing
    * [ ] .batchSize()
    * [ ] .close()
    * [ ] .comment()
    * [ ] .explain()
    * [ ] .hint()
    * [ ] .itcount()
    * [ ] .maxScan()
    * [ ] .maxTimeMS()
    * [ ] .max()
    * [ ] .min()
    * [ ] .noCursorTimeout()
    * [ ] .objsLeftInBatch()
    * [ ] .pretty()
    * [ ] .readConcern()
    * [ ] .readPref()
    * [ ] .returnKey()
    * [ ] .showRecordId()
    * [ ] .size()
    * [ ] .snapshot()
    * [ ] .tailable()
    * [ ] .toArray()

Read the full API documentation [here][API-Cursor]

----------

# License

MIT

[mongo-db-command]: https://docs.mongodb.com/manual/reference/command/

[API-MongoPortable]: https://github.com/EastolfiWebDev/MongoPortable/blob/master/api/MongoPortable.md
[API-Collection]: https://github.com/EastolfiWebDev/MongoPortable/blob/master/api/Collection.md
[API-Cursor]: https://github.com/EastolfiWebDev/MongoPortable/blob/master/api/Cursor.md

[Module-FileSystemStore]: https://github.com/EastolfiWebDev/FileSystemStore
[API-FileSystemStore]: https://github.com/EastolfiWebDev/FileSystemStore/blob/master/api/FileSystemStore.md

[npm-image]: https://img.shields.io/npm/v/mongo-portable.svg?label=Package%20Version
[npm-url]: https://www.npmjs.com/package/mongo-portable
[node-image]: https://img.shields.io/badge/node-v4.4.0-blue.svg?label=Node%20Version
[node-url]: https://nodejs.org/en/
[travis-image]: https://img.shields.io/travis/EastolfiWebDev/MongoPortable.svg?label=linux
[travis-url]: https://travis-ci.org/EastolfiWebDev/MongoPortable
[appveyor-image]: https://img.shields.io/appveyor/ci/eastolfi/MongoPortable/master.svg?label=windows
[appveyor-url]: https://ci.appveyor.com/project/eastolfi/mongoportable
[coveralls-image]: https://coveralls.io/repos/github/eastolfi/MongoPortable/badge.svg?branch=master
[coveralls-url]: https://coveralls.io/github/eastolfi/MongoPortable?branch=master
[downloads-image]: https://img.shields.io/npm/dt/mongo-portable.svg
[docs-image]: https://readthedocs.org/projects/mongoportable/badge/?version=latest
[docs-url]: http://mongoportable.readthedocs.io/en/latest/?badge=latest
