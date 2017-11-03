
# MongoPortable
Solution for a MongoDB-like portable database.

[![Package Version][npm-image]][npm-url]
[![NodeJS Version][node-image]][node-url]

[![Linux Build][travis-image]][travis-url]
[![Windows Build][appveyor-image]][appveyor-url]
[![Codeship Build][codeship-image]][codeship-url]

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
var MongoPortable = require("mongo-portable").MongoPortable;

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
npm install --save file-system-store
```
And then use it in your application by adding it in your MongoPortable instance:
```javascript
var FileSystemStore = require("file-system-store");
db.addStore(FileSystemStore);
```
or as a middleware:
```javascript
var FileSystemStore = require("file-system-store");
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
[codeship-image]: https://codeship.com/projects/d57e8820-5e10-0134-8b6d-42ae3f63aed8/status?branch=master
[codeship-url]: https://codeship.com/projects/174143

[coveralls-image]: https://coveralls.io/repos/github/EastolfiWebDev/MongoPortable/badge.svg?branch=master
[coveralls-url]: https://coveralls.io/github/EastolfiWebDev/MongoPortable?branch=master
[downloads-image]: https://img.shields.io/npm/dt/mongo-portable.svg
[docs-image]: https://readthedocs.org/projects/mongoportable/badge/?version=latest
[docs-url]: http://mongoportable.readthedocs.io/en/latest/?badge=latest



## Index

### Classes

* [Aggregation](classes/aggregation.md)
* [BaseStore](classes/basestore.md)
* [BinaryParser](classes/binaryparser.md)
* [BinaryParserBuffer](classes/binaryparserbuffer.md)
* [Clause](classes/clause.md)
* [Collection](classes/collection.md)
* [Connection](classes/connection.md)
* [ConnectionHelper](classes/connectionhelper.md)
* [Cursor](classes/cursor.md)
* [EventEmitter](classes/eventemitter.md)
* [MongoPortable](classes/mongoportable.md)
* [ObjectId](classes/objectid.md)
* [Options](classes/options.md)
* [Selector](classes/selector.md)
* [SelectorMatcher](classes/selectormatcher.md)
* [Utils](classes/utils.md)


### Interfaces

* [IAbstractStore](interfaces/iabstractstore.md)


### Variables

* [MACHINE_ID](#machine_id)
* [checkForHexRegExp](#checkforhexregexp)
* [chr](#chr)
* [database](#database)
* [maxBits](#maxbits)
* [pid](#pid)


### Functions

* [_applyModifier](#_applymodifier)
* [_ensureFindParams](#_ensurefindparams)
* [_getDocuments](#_getdocuments)
* [_mapFields](#_mapfields)
* [_modify](#_modify)
* [_testClause](#_testclause)
* [_testLogicalClause](#_testlogicalclause)
* [_testObjectClause](#_testobjectclause)
* [_testOperatorClause](#_testoperatorclause)
* [_testOperatorConstraint](#_testoperatorconstraint)
* [do_complex_group](#do_complex_group)
* [do_group](#do_group)
* [do_match](#do_match)
* [do_project](#do_project)
* [do_single_group](#do_single_group)
* [do_sort](#do_sort)
* [getObjectSize](#getobjectsize)
* [hasSorting](#hassorting)
* [isValidHexRegExp](#isvalidhexregexp)


### Object literals

* [BsonTypes](#bsontypes)
* [_modifiers](#_modifiers)
* [group_operators](#group_operators)
* [stages](#stages)



---
# Variables
<a id="machine_id"></a>

###  MACHINE_ID

**●  MACHINE_ID**:  *`number`*  =  parseInt(`${Math.random() * 0xFFFFFF}`, 10)

*Defined in [document/ObjectId.ts:15](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/document/ObjectId.ts#L15)*



Machine id.

Create a random 3-byte value (i.e. unique for this process). Other drivers use a md5 of the machine id here, but that would mean an asyc call to gethostname, so we don"t bother.
*__ignore__*: 





___

<a id="checkforhexregexp"></a>

###  checkForHexRegExp

**●  checkForHexRegExp**:  *`RegExp`*  =  new RegExp("^[0-9a-fA-F]{24}$")

*Defined in [document/ObjectId.ts:18](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/document/ObjectId.ts#L18)*





___

<a id="chr"></a>

###  chr

**●  chr**:  *`fromCharCode`*  =  String.fromCharCode

*Defined in [binary/BinaryParser.ts:7](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L7)*





___

<a id="database"></a>

###  database

**●  database**:  *`any`*  =  null

*Defined in [collection/Collection.ts:48](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L48)*



Collection
*__module__*: Collection

*__constructor__*: 

*__since__*: 0.0.1

*__author__*: Eduardo Astolfi [eastolfi91@gmail.com](mailto:eastolfi91@gmail.com)

*__copyright__*: 2016 Eduardo Astolfi [eastolfi91@gmail.com](mailto:eastolfi91@gmail.com)

*__license__*: MIT Licensed

*__classdesc__*: Collection class that maps a MongoDB-like collection





___

<a id="maxbits"></a>

###  maxBits

**●  maxBits**:  *`Array`.<`any`>*  =  []

*Defined in [binary/BinaryParser.ts:9](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L9)*





___

<a id="pid"></a>

###  pid

**●  pid**:  *`number`*  =  Math.floor(Math.random() * 100000)

*Defined in [document/ObjectId.ts:25](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/document/ObjectId.ts#L25)*





___


# Functions
<a id="_applymodifier"></a>

###  _applyModifier

► **_applyModifier**(_docUpdate: *`any`*, key: *`any`*, val: *`any`*): `any`



*Defined in [collection/Collection.ts:1091](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L1091)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| _docUpdate | `any`   |  - |
| key | `any`   |  - |
| val | `any`   |  - |





**Returns:** `any`





___

<a id="_ensurefindparams"></a>

###  _ensureFindParams

► **_ensureFindParams**(params: *`any`*): `any`



*Defined in [collection/Collection.ts:1374](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L1374)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| params | `any`   |  - |





**Returns:** `any`





___

<a id="_getdocuments"></a>

### «Private» _getDocuments

► **_getDocuments**(cursor: *`any`*, justOne?: *`boolean`*): `any`



*Defined in [collection/Cursor.ts:601](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L601)*



Retrieves one or all the documents in the cursor


**Parameters:**

| Param | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| cursor | `any`  | - |   The cursor with the documents |
| justOne | `boolean`  | false |   - |





**Returns:** `any`
If [justOne=true] returns the next document, otherwise returns all the documents






___

<a id="_mapfields"></a>

###  _mapFields

► **_mapFields**(doc: *`any`*, fields: *`any`*): `any`



*Defined in [collection/Cursor.ts:526](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L526)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| doc | `any`   |  - |
| fields | `any`   |  - |





**Returns:** `any`





___

<a id="_modify"></a>

###  _modify

► **_modify**(document: *`any`*, keyparts: *`any`*, value: *`any`*, key: *`any`*, level?: *`number`*): `any`



*Defined in [collection/Collection.ts:1116](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L1116)*



**Parameters:**

| Param | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| document | `any`  | - |   - |
| keyparts | `any`  | - |   - |
| value | `any`  | - |   - |
| key | `any`  | - |   - |
| level | `number`  | 0 |   - |





**Returns:** `any`





___

<a id="_testclause"></a>

###  _testClause

► **_testClause**(clause: *`any`*, val: *`any`*): `any`



*Defined in [selector/SelectorMatcher.ts:368](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/selector/SelectorMatcher.ts#L368)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| clause | `any`   |  - |
| val | `any`   |  - |





**Returns:** `any`





___

<a id="_testlogicalclause"></a>

###  _testLogicalClause

► **_testLogicalClause**(clause: *`any`*, doc: *`any`*, key: *`any`*): `any`



*Defined in [selector/SelectorMatcher.ts:467](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/selector/SelectorMatcher.ts#L467)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| clause | `any`   |  - |
| doc | `any`   |  - |
| key | `any`   |  - |





**Returns:** `any`





___

<a id="_testobjectclause"></a>

###  _testObjectClause

► **_testObjectClause**(clause: *`any`*, doc: *`any`*, key: *`any`*): `any`



*Defined in [selector/SelectorMatcher.ts:442](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/selector/SelectorMatcher.ts#L442)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| clause | `any`   |  - |
| doc | `any`   |  - |
| key | `any`   |  - |





**Returns:** `any`





___

<a id="_testoperatorclause"></a>

###  _testOperatorClause

► **_testOperatorClause**(clause: *`any`*, value: *`any`*): `boolean`



*Defined in [selector/SelectorMatcher.ts:498](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/selector/SelectorMatcher.ts#L498)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| clause | `any`   |  - |
| value | `any`   |  - |





**Returns:** `boolean`





___

<a id="_testoperatorconstraint"></a>

###  _testOperatorConstraint

► **_testOperatorConstraint**(key: *`any`*, operatorValue: *`any`*, clauseValue: *`any`*, docVal: *`any`*, clause: *`any`*): `any`



*Defined in [selector/SelectorMatcher.ts:510](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/selector/SelectorMatcher.ts#L510)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| key | `any`   |  - |
| operatorValue | `any`   |  - |
| clauseValue | `any`   |  - |
| docVal | `any`   |  - |
| clause | `any`   |  - |





**Returns:** `any`





___

<a id="do_complex_group"></a>

###  do_complex_group

► **do_complex_group**(): `void`



*Defined in [aggregation/Aggregation.ts:158](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/aggregation/Aggregation.ts#L158)*





**Returns:** `void`





___

<a id="do_group"></a>

###  do_group

► **do_group**(documents: *`any`*, group_stage: *`any`*): `Array`.<`Object`>



*Defined in [aggregation/Aggregation.ts:172](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/aggregation/Aggregation.ts#L172)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| documents | `any`   |  - |
| group_stage | `any`   |  - |





**Returns:** `Array`.<`Object`>





___

<a id="do_match"></a>

###  do_match

► **do_match**(documents: *`any`*, match_stage: *`any`*): `any`



*Defined in [aggregation/Aggregation.ts:166](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/aggregation/Aggregation.ts#L166)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| documents | `any`   |  - |
| match_stage | `any`   |  - |





**Returns:** `any`





___

<a id="do_project"></a>

###  do_project

► **do_project**(documents: *`any`*, project_stage: *`any`*): `any`



*Defined in [aggregation/Aggregation.ts:194](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/aggregation/Aggregation.ts#L194)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| documents | `any`   |  - |
| project_stage | `any`   |  - |





**Returns:** `any`





___

<a id="do_single_group"></a>

###  do_single_group

► **do_single_group**(group_id: *`any`*, group_stage: *`any`*, documents: *`any`*): `Array`.<`Object`>



*Defined in [aggregation/Aggregation.ts:97](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/aggregation/Aggregation.ts#L97)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| group_id | `any`   |  - |
| group_stage | `any`   |  - |
| documents | `any`   |  - |





**Returns:** `Array`.<`Object`>





___

<a id="do_sort"></a>

###  do_sort

► **do_sort**(documents: *`any`*, sort_stage: *`any`*): `any`



*Defined in [aggregation/Aggregation.ts:162](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/aggregation/Aggregation.ts#L162)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| documents | `any`   |  - |
| sort_stage | `any`   |  - |





**Returns:** `any`





___

<a id="getobjectsize"></a>

###  getObjectSize

► **getObjectSize**(obj: *`any`*): `number`



*Defined in [collection/Collection.ts:21](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L21)*



Gets the size of an object.


**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| obj | `any`   |  The object |





**Returns:** `number`
The size of the object






___

<a id="hassorting"></a>

### «Private» hasSorting

► **hasSorting**(cursor: *`any`*): `boolean`



*Defined in [collection/Cursor.ts:679](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L679)*



Checks if a cursor has a sorting defined


**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| cursor | `any`   |  The cursor |





**Returns:** `boolean`
Whether the cursor has sorting or not






___

<a id="isvalidhexregexp"></a>

###  isValidHexRegExp

► **isValidHexRegExp**(str: *`any`*, len?: *`number`*): `boolean`



*Defined in [document/ObjectId.ts:19](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/document/ObjectId.ts#L19)*



**Parameters:**

| Param | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| str | `any`  | - |   - |
| len | `number`  | 24 |   - |





**Returns:** `boolean`





___


<a id="bsontypes"></a>

## Object literal: BsonTypes


<a id="bsontypes._types"></a>

###  _types

**●  _types**:  *`Array`.<`object`⎮`object`>*  =  [
		{ alias: "minKey", number: -1, order: 1, isType: null },
		{ alias: "null", number: 10, order: 2, isType: null },
		{ alias: "int", number: 16, order: 3, isType: _.isInteger },
		{ alias: "long", number: 18, order: 3, isType: _.isNumber },
		{ alias: "double", number: 1, order: 3, isType: _.isNumber },
		{ alias: "number", number: null, order: 3, isType: _.isNumber },
		{ alias: "string", number: 2, order: 4, isType: _.isString },
		{ alias: "symbol", number: 14, order: 4, isType: _.isSymbol },
		{ alias: "object", number: 3, order: 5, isType: _.isPlainObject },
		{ alias: "array", number: 4, order: 6, isType: _.isArray },
		{ alias: "binData", number: 5, order: 7, isType: null },
		{ alias: "objectId", number: 7, order: 8, isTypefnc: null },
		{ alias: "bool", number: 8, order: 9, isType: _.isBoolean },
		{ alias: "date", number: 9, order: 10, isTypefnc: _.isDate },           // format
		{ alias: "timestamp", number: 17, order: 11, isType: _.isDate },        // format
		{ alias: "regex", number: 11, order: 12, isType: _.isRegExp },
		{ alias: "maxKey", number: 127, order: 13, isType: null }
		
// 		undefined 6
// 		dbPointer
// 		javascript
// 		javascriptWithScope
// 		function
	]

*Defined in [selector/SelectorMatcher.ts:658](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/selector/SelectorMatcher.ts#L658)*





___
<a id="bsontypes.getbyalias"></a>

###  getByAlias

► **getByAlias**(alias: *`any`*): `any`



*Defined in [selector/SelectorMatcher.ts:684](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/selector/SelectorMatcher.ts#L684)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| alias | `any`   |  - |





**Returns:** `any`





___
<a id="bsontypes.getbyvalue"></a>

###  getByValue

► **getByValue**(val: *`any`*): `any`



*Defined in [selector/SelectorMatcher.ts:689](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/selector/SelectorMatcher.ts#L689)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| val | `any`   |  - |





**Returns:** `any`





___

<a id="_modifiers"></a>

## Object literal: _modifiers

*__ignore__*: 



<a id="_modifiers._addtoset"></a>

###  $addToSet

► **$addToSet**(target: *`any`*, field: *`any`*, arg: *`any`*): `void`



*Defined in [collection/Collection.ts:1231](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L1231)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| target | `any`   |  - |
| field | `any`   |  - |
| arg | `any`   |  - |





**Returns:** `void`





___
<a id="_modifiers._bit"></a>

###  $bit

► **$bit**(target: *`any`*, field: *`any`*, arg: *`any`*): `void`



*Defined in [collection/Collection.ts:1363](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L1363)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| target | `any`   |  - |
| field | `any`   |  - |
| arg | `any`   |  - |





**Returns:** `void`





___
<a id="_modifiers._inc"></a>

###  $inc

► **$inc**(target: *`any`*, field: *`any`*, arg: *`any`*): `void`



*Defined in [collection/Collection.ts:1173](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L1173)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| target | `any`   |  - |
| field | `any`   |  - |
| arg | `any`   |  - |





**Returns:** `void`





___
<a id="_modifiers._pop"></a>

###  $pop

► **$pop**(target: *`any`*, field: *`any`*, arg: *`any`*): `void`



*Defined in [collection/Collection.ts:1261](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L1261)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| target | `any`   |  - |
| field | `any`   |  - |
| arg | `any`   |  - |





**Returns:** `void`





___
<a id="_modifiers._pull"></a>

###  $pull

► **$pull**(target: *`any`*, field: *`any`*, arg: *`any`*): `void`



*Defined in [collection/Collection.ts:1277](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L1277)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| target | `any`   |  - |
| field | `any`   |  - |
| arg | `any`   |  - |





**Returns:** `void`





___
<a id="_modifiers._pullall"></a>

###  $pullAll

► **$pullAll**(target: *`any`*, field: *`any`*, arg: *`any`*): `void`



*Defined in [collection/Collection.ts:1319](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L1319)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| target | `any`   |  - |
| field | `any`   |  - |
| arg | `any`   |  - |





**Returns:** `void`





___
<a id="_modifiers._push"></a>

###  $push

► **$push**(target: *`any`*, field: *`any`*, arg: *`any`*): `void`



*Defined in [collection/Collection.ts:1205](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L1205)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| target | `any`   |  - |
| field | `any`   |  - |
| arg | `any`   |  - |





**Returns:** `void`





___
<a id="_modifiers._pushall"></a>

###  $pushAll

► **$pushAll**(target: *`any`*, field: *`any`*, arg: *`any`*): `void`



*Defined in [collection/Collection.ts:1217](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L1217)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| target | `any`   |  - |
| field | `any`   |  - |
| arg | `any`   |  - |





**Returns:** `void`





___
<a id="_modifiers._rename"></a>

###  $rename

► **$rename**(target: *`any`*, field: *`any`*, value: *`any`*): `void`



*Defined in [collection/Collection.ts:1349](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L1349)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| target | `any`   |  - |
| field | `any`   |  - |
| value | `any`   |  - |





**Returns:** `void`





___
<a id="_modifiers._set"></a>

###  $set

► **$set**(target: *`any`*, field: *`any`*, arg: *`any`*): `void`



*Defined in [collection/Collection.ts:1189](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L1189)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| target | `any`   |  - |
| field | `any`   |  - |
| arg | `any`   |  - |





**Returns:** `void`





___
<a id="_modifiers._unset"></a>

###  $unset

► **$unset**(target: *`any`*, field: *`any`*, arg: *`any`*): `void`



*Defined in [collection/Collection.ts:1193](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L1193)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| target | `any`   |  - |
| field | `any`   |  - |
| arg | `any`   |  - |





**Returns:** `void`





___

<a id="group_operators"></a>

## Object literal: group_operators


<a id="group_operators._avg"></a>

###  $avg

► **$avg**(documents: *`any`*, new_id: *`any`*, new_field: *`any`*, value: *`any`*, isCount: *`any`*): `object`



*Defined in [aggregation/Aggregation.ts:61](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/aggregation/Aggregation.ts#L61)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| documents | `any`   |  - |
| new_id | `any`   |  - |
| new_field | `any`   |  - |
| value | `any`   |  - |
| isCount | `any`   |  - |





**Returns:** `object`





___
<a id="group_operators._sum"></a>

###  $sum

► **$sum**(documents: *`any`*, new_id: *`any`*, new_field: *`any`*, value: *`any`*, isCount: *`any`*): `object`



*Defined in [aggregation/Aggregation.ts:33](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/aggregation/Aggregation.ts#L33)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| documents | `any`   |  - |
| new_id | `any`   |  - |
| new_field | `any`   |  - |
| value | `any`   |  - |
| isCount | `any`   |  - |





**Returns:** `object`





___

<a id="stages"></a>

## Object literal: stages


<a id="stages._geonear"></a>

###  $geoNear

**●  $geoNear**:  *`boolean`*  = false

*Defined in [aggregation/Aggregation.ts:26](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/aggregation/Aggregation.ts#L26)*





___
<a id="stages._group"></a>

###  $group

**●  $group**:  *`boolean`*  = true

*Defined in [aggregation/Aggregation.ts:23](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/aggregation/Aggregation.ts#L23)*





___
<a id="stages._indexstats"></a>

###  $indexStats

**●  $indexStats**:  *`boolean`*  = false

*Defined in [aggregation/Aggregation.ts:29](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/aggregation/Aggregation.ts#L29)*





___
<a id="stages._limit"></a>

###  $limit

**●  $limit**:  *`boolean`*  = false

*Defined in [aggregation/Aggregation.ts:20](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/aggregation/Aggregation.ts#L20)*





___
<a id="stages._lookup"></a>

###  $lookup

**●  $lookup**:  *`boolean`*  = false

*Defined in [aggregation/Aggregation.ts:27](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/aggregation/Aggregation.ts#L27)*





___
<a id="stages._match"></a>

###  $match

**●  $match**:  *`boolean`*  = true

*Defined in [aggregation/Aggregation.ts:18](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/aggregation/Aggregation.ts#L18)*





___
<a id="stages._out"></a>

###  $out

**●  $out**:  *`boolean`*  = false

*Defined in [aggregation/Aggregation.ts:28](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/aggregation/Aggregation.ts#L28)*





___
<a id="stages._project"></a>

###  $project

**●  $project**:  *`boolean`*  = true

*Defined in [aggregation/Aggregation.ts:17](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/aggregation/Aggregation.ts#L17)*





___
<a id="stages._redact"></a>

###  $redact

**●  $redact**:  *`boolean`*  = false

*Defined in [aggregation/Aggregation.ts:19](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/aggregation/Aggregation.ts#L19)*





___
<a id="stages._sample"></a>

###  $sample

**●  $sample**:  *`boolean`*  = false

*Defined in [aggregation/Aggregation.ts:24](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/aggregation/Aggregation.ts#L24)*





___
<a id="stages._skip"></a>

###  $skip

**●  $skip**:  *`boolean`*  = false

*Defined in [aggregation/Aggregation.ts:21](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/aggregation/Aggregation.ts#L21)*





___
<a id="stages._sort"></a>

###  $sort

**●  $sort**:  *`boolean`*  = true

*Defined in [aggregation/Aggregation.ts:25](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/aggregation/Aggregation.ts#L25)*





___
<a id="stages._unwind"></a>

###  $unwind

**●  $unwind**:  *`boolean`*  = false

*Defined in [aggregation/Aggregation.ts:22](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/aggregation/Aggregation.ts#L22)*





___


