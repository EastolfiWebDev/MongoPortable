# MongoPortable
Solution for a MongoDB-like portable database.

[![Package Version][npm-image]][npm-url]
[![NodeJS Version][node-image]][node-url]

[![Travis Build][travis-image]][travis-url]
[![Appveyor Build][appveyor-image]][appveyor-url]
[![Codeship Build][codeship-image]][codeship-url]

[![Test Coverage][coveralls-image]][coveralls-url]
[![Downloads][downloads-image]][npm-url]
[![Documentation Status][docs-image]][docs-url]

MongoPortable is a module that handles collections and documents in memory, and allow the use of stores for persistence.

This project adheres to the Contributor Covenant [code of conduct](CODE_OF_CONDUCT.md).
By participating, you are expected to uphold this code. Please report unacceptable behavior to eduardo.astolfi91.com.

# Installation
```shell
npm install mongo-portable
yarn add mongo-portable
```
# Usage
```javascript
// Declaring the module dependency
import { MongoPortable } from "mongo-portable";

// Instantiates a new ddbb object by passing a ddbb name
let db = new MongoPortable("DB_NAME");

// Creates a new collection named "users" 
//      (if it's already created, it will just return it instead)
db.collection("users").then(collection => {
    // Inserts a new document into the collection
    collection.insert({ name: "John", lastName: "Abruzzi" }).then(document => {
        console.log(document);  // -> { name: "John", lastName: "Abruzzi" }
        
        // Performs a query against this collection, fetching all the results
        users.find({ name: "John" }).then(documents => {
            console.log(documents);  // -> [ { name: "John", lastName: "Abruzzi" } ]
        });
    });
});
```

# Modules
The main modules available are [MongoPortable](#MongoPortable) and [Collection](#Collection) (and [Cursor](#Cursor) when using the "doNotFetch" option).

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
npm install file-system-store
yarn add file-system-store
```
And then use it in your application by adding it in your MongoPortable instance:
```javascript
import { FileSystemStore } from "file-system-store";

db.addStore(new FileSystemStore(/* options */));
```
or as a middleware:
```javascript
import { FileSystemStore } from "file-system-store";

db.use("store", new FileSystemStore(/* options */));
```

View the package [here][Module-FileSystemStore] and read the full API documentation [here][API-FileSystemStore]

----------

## Contributing
Feel free to contribute with your own ideas / fixes!

There is a [to-do list](#TO-DO List) with the features I'd like to add in the feature, and a serie of milestones with the roadmap I have in mind.
Take a look at them if you want to :)

Every contribution should be addressed with a well-formed pull request -> [Contributing](CONTRIBUTING.md)

----------

# License

[MIT](LICENSE.txt)

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
[codeship-image]: https://codeship.com/projects/d57e8820-5e10-0134-8b6d-42ae3f63aed8/status?branch=master
[codeship-url]: https://codeship.com/projects/174143

[coveralls-image]: https://coveralls.io/repos/github/EastolfiWebDev/MongoPortable/badge.svg?branch=master
[coveralls-url]: https://coveralls.io/github/EastolfiWebDev/MongoPortable?branch=master
[downloads-image]: https://img.shields.io/npm/dt/mongo-portable.svg
[docs-image]: https://readthedocs.org/projects/mongoportable/badge/?version=latest
[docs-url]: http://mongoportable.readthedocs.io/en/latest/?badge=latest
