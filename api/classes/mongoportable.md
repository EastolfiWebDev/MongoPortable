[Mongo Portable](../README.md) > [MongoPortable](../classes/mongoportable.md)



# Class: MongoPortable


MongoPortable
*__module__*: MongoPortable

*__since__*: 0.0.1

*__classdesc__*: Portable database with persistence and MongoDB-like API

*__param__*: Name of the database.


## Hierarchy


 [EventEmitter](eventemitter.md)

**↳ MongoPortable**







## Index

### Constructors

* [constructor](mongoportable.md#constructor)


### Properties

* [_collections](mongoportable.md#_collections)
* [_databaseName](mongoportable.md#_databasename)
* [_stores](mongoportable.md#_stores)
* [createCollection](mongoportable.md#createcollection)
* [logger](mongoportable.md#logger)
* [pkFactory](mongoportable.md#pkfactory)
* [_connHelper](mongoportable.md#_connhelper)


### Methods

* [addStore](mongoportable.md#addstore)
* [collection](mongoportable.md#collection)
* [collectionNames](mongoportable.md#collectionnames)
* [collections](mongoportable.md#collections)
* [collectionsInfo](mongoportable.md#collectionsinfo)
* [createIndex](mongoportable.md#createindex)
* [dereference](mongoportable.md#dereference)
* [dropCollection](mongoportable.md#dropcollection)
* [dropDatabase](mongoportable.md#dropdatabase)
* [dropIndex](mongoportable.md#dropindex)
* [emit](mongoportable.md#emit)
* [ensureIndex](mongoportable.md#ensureindex)
* [fetchCollections](mongoportable.md#fetchcollections)
* [indexInformation](mongoportable.md#indexinformation)
* [reIndex](mongoportable.md#reindex)
* [renameCollection](mongoportable.md#renamecollection)
* [use](mongoportable.md#use)
* [getInstance](mongoportable.md#getinstance)


### Object literals

* [options](mongoportable.md#options)



---
## Constructors
<a id="constructor"></a>


### ⊕ **new MongoPortable**(databaseName: *`string`*, options: *`any`*): [MongoPortable](mongoportable.md)


*Overrides [EventEmitter](eventemitter.md).[constructor](eventemitter.md#constructor)*

*Defined in [core/MongoPortable.ts:40](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/core/MongoPortable.ts#L40)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| databaseName | `string`   |  - |
| options | `any`   |  - |





**Returns:** [MongoPortable](mongoportable.md)

---


## Properties
<a id="_collections"></a>

### «Private» _collections

**●  _collections**:  *`__type`* 

*Defined in [core/MongoPortable.ts:33](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/core/MongoPortable.ts#L33)*





___

<a id="_databasename"></a>

### «Private» _databaseName

**●  _databaseName**:  *`string`* 

*Defined in [core/MongoPortable.ts:35](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/core/MongoPortable.ts#L35)*





___

<a id="_stores"></a>

### «Private» _stores

**●  _stores**:  *`Array`.<`Object`⎮`Function`>* 

*Defined in [core/MongoPortable.ts:34](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/core/MongoPortable.ts#L34)*





___

<a id="createcollection"></a>

###  createCollection

**●  createCollection**:  *[collection](mongoportable.md#collection)*  =  this.collection

*Defined in [core/MongoPortable.ts:314](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/core/MongoPortable.ts#L314)*



Alias for {@link MongoPortable#collection}
*__method__*: MongoPortable#createCollection





___

<a id="logger"></a>

### «Protected» logger

**●  logger**:  *`JSWLogger`* 

*Overrides [EventEmitter](eventemitter.md).[logger](eventemitter.md#logger)*

*Defined in [core/MongoPortable.ts:31](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/core/MongoPortable.ts#L31)*





___

<a id="pkfactory"></a>

###  pkFactory

**●  pkFactory**:  *`any`* 

*Defined in [core/MongoPortable.ts:40](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/core/MongoPortable.ts#L40)*





___

<a id="_connhelper"></a>

### «Static»«Private» _connHelper

**●  _connHelper**:  *[ConnectionHelper](connectionhelper.md)*  =  new ConnectionHelper()

*Defined in [core/MongoPortable.ts:37](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/core/MongoPortable.ts#L37)*





___


## Methods
<a id="addstore"></a>

###  addStore

► **addStore**(store: *`any`*): `this`



*Defined in [core/MongoPortable.ts:91](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/core/MongoPortable.ts#L91)*



Adds a custom stores for remote and local persistence


**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| store | `any`   |  The custom store |





**Returns:** `this`
this - The current Instance






___

<a id="collection"></a>

###  collection

► **collection**(collectionName: *`any`*, options: *`any`*, callback?: *`any`*): `Promise`.<[Collection](collection.md)>



*Defined in [core/MongoPortable.ts:256](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/core/MongoPortable.ts#L256)*



Creates a collection on a server pre-allocating space, need to create f.ex capped collections.
*__method__*: MongoPortable#collection

*__fires__*: {@link MongoStore#createCollection}



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| collectionName | `any`   |  the collection name we wish to access. |
| options | `any`   |  - |
| callback | `any`   |  - |





**Returns:** `Promise`.<[Collection](collection.md)>







___

<a id="collectionnames"></a>

###  collectionNames

► **collectionNames**(options: *`any`*, callback?: *`any`*): `Array`.<`any`>



*Defined in [core/MongoPortable.ts:207](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/core/MongoPortable.ts#L207)*



Get the list of all collection names for the specified db, by calling MongoPortable#collections with [options.namesOnly = true]
*__method__*: MongoPortable#collectionNames



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| options | `any`   |  - |
| callback | `any`   |  - |





**Returns:** `Array`.<`any`>


{@link MongoPortable#collections}






___

<a id="collections"></a>

###  collections

► **collections**(options: *`any`*, callback?: *`any`*): `Array`.<`any`>



*Defined in [core/MongoPortable.ts:157](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/core/MongoPortable.ts#L157)*



Get the list of all collection for the specified db
*__method__*: MongoPortable#collections



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| options | `any`   |  - |
| callback | `any`   |  - |





**Returns:** `Array`.<`any`>







___

<a id="collectionsinfo"></a>

###  collectionsInfo

► **collectionsInfo**(collectionName: *`any`*, callback?: *`any`*): `void`



*Defined in [core/MongoPortable.ts:130](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/core/MongoPortable.ts#L130)*



Returns a cursor to all the collection information.
*__todo__*: Implement



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| collectionName | `any`   |  - |
| callback | `any`   |  - |





**Returns:** `void`







___

<a id="createindex"></a>

###  createIndex

► **createIndex**(collectionName: *`any`*, fieldOrSpec: *`any`*, options: *`any`*, callback: *`any`*): `void`



*Defined in [core/MongoPortable.ts:452](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/core/MongoPortable.ts#L452)*



Creates an index on the collection.
*__method__*: MongoPortable#createIndex

*__todo__*: Implement



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| collectionName | `any`   |  Name of the collection to create the index on. |
| fieldOrSpec | `any`   |  FieldOrSpec that defines the index. |
| options | `any`   |  - |
| callback | `any`   |  - |





**Returns:** `void`





___

<a id="dereference"></a>

###  dereference

► **dereference**(dbRef: *`any`*, callback: *`any`*): `void`



*Defined in [core/MongoPortable.ts:585](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/core/MongoPortable.ts#L585)*



Dereference a dbref, against a db
*__todo__*: Implement

*__ignore__*: 



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| dbRef | `any`   |  db reference object we wish to resolve. |
| callback | `any`   |  - |





**Returns:** `void`





___

<a id="dropcollection"></a>

###  dropCollection

► **dropCollection**(collectionName: *`any`*, callback?: *`any`*): `Promise`.<`Boolean`>



*Defined in [core/MongoPortable.ts:326](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/core/MongoPortable.ts#L326)*



Drop a collection from the database, removing it permanently. New accesses will create a new collection.
*__method__*: MongoPortable#dropCollection



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| collectionName | `any`   |  The name of the collection we wish to drop. |
| callback | `any`   |  - |





**Returns:** `Promise`.<`Boolean`>
Promise with "true" if dropped successfully






___

<a id="dropdatabase"></a>

###  dropDatabase

► **dropDatabase**(callback?: *`any`*): `Promise`.<`Boolean`>



*Defined in [core/MongoPortable.ts:548](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/core/MongoPortable.ts#L548)*



Drop the whole database.
*__method__*: MongoPortable#dropDatabase



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| callback | `any`   |  - |





**Returns:** `Promise`.<`Boolean`>
Promise with "true" if dropped successfully






___

<a id="dropindex"></a>

###  dropIndex

► **dropIndex**(collectionName: *`any`*, indexName: *`any`*, callback: *`any`*): `void`



*Defined in [core/MongoPortable.ts:501](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/core/MongoPortable.ts#L501)*



Drop an index on a collection.
*__method__*: MongoPortable#dropIndex

*__todo__*: Implement



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| collectionName | `any`   |  The name of the collection where the command will drop an index. |
| indexName | `any`   |  Name of the index to drop. |
| callback | `any`   |  - |





**Returns:** `void`





___

<a id="emit"></a>

###  emit

► **emit**(name: *`string`*, args: *`Object`*): `Promise`.<`void`>



*Overrides [EventEmitter](eventemitter.md).[emit](eventemitter.md#emit)*

*Defined in [core/MongoPortable.ts:63](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/core/MongoPortable.ts#L63)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| name | `string`   |  - |
| args | `Object`   |  - |





**Returns:** `Promise`.<`void`>





___

<a id="ensureindex"></a>

###  ensureIndex

► **ensureIndex**(collectionName: *`any`*, fieldOrSpec: *`any`*, options: *`any`*, callback: *`any`*): `void`



*Defined in [core/MongoPortable.ts:486](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/core/MongoPortable.ts#L486)*



Ensures that an index exists, if it does not it creates it
*__method__*: MongoPortable#ensureIndex

*__todo__*: Implement



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| collectionName | `any`   |  Name of the collection to create the index on. |
| fieldOrSpec | `any`   |  FieldOrSpec that defines the index. |
| options | `any`   |  - |
| callback | `any`   |  - |





**Returns:** `void`





___

<a id="fetchcollections"></a>

###  fetchCollections

► **fetchCollections**(options: *`any`*, callback?: *`any`*): `Array`.<`any`>



*Defined in [core/MongoPortable.ts:139](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/core/MongoPortable.ts#L139)*



Alias for {@link MongoPortable#collections}
*__method__*: MongoPortable#fetchCollections



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| options | `any`   |  - |
| callback | `any`   |  - |





**Returns:** `Array`.<`any`>





___

<a id="indexinformation"></a>

###  indexInformation

► **indexInformation**(collectionName: *`any`*, options: *`any`*, callback: *`any`*): `void`



*Defined in [core/MongoPortable.ts:535](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/core/MongoPortable.ts#L535)*



Retrieves this collections index info.
*__method__*: MongoPortable#indexInformation

*__todo__*: Implement



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| collectionName | `any`   |  The name of the collection. |
| options | `any`   |  - |
| callback | `any`   |  - |





**Returns:** `void`





___

<a id="reindex"></a>

###  reIndex

► **reIndex**(collectionName: *`any`*, callback: *`any`*): `void`



*Defined in [core/MongoPortable.ts:516](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/core/MongoPortable.ts#L516)*



Reindex all indexes on the collection Warning: "reIndex" is a blocking operation (indexes are rebuilt in the foreground) and will be slow for large collections.
*__method__*: MongoPortable#reIndex

*__todo__*: Implement



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| collectionName | `any`   |  The name of the collection to reindex |
| callback | `any`   |  - |





**Returns:** `void`





___

<a id="renamecollection"></a>

###  renameCollection

► **renameCollection**(fromCollection: *`any`*, toCollection: *`any`*, callback?: *`any`*): `Promise`.<[Collection](collection.md)>



*Defined in [core/MongoPortable.ts:369](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/core/MongoPortable.ts#L369)*



Rename a collection.
*__method__*: MongoPortable#renameCollection



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| fromCollection | `any`   |  The name of the current collection we wish to rename. |
| toCollection | `any`   |  The new name of the collection. |
| callback | `any`   |  - |





**Returns:** `Promise`.<[Collection](collection.md)>
Promise with the renamed collection






___

<a id="use"></a>

###  use

► **use**(name: *`any`*, obj: *`any`*): `void`



*Defined in [core/MongoPortable.ts:76](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/core/MongoPortable.ts#L76)*



Middleware functions


**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| name | `any`   |  Name of the middleware:

*   "store": Add a custom store |
| obj | `any`   |  - |





**Returns:** `void`





___

<a id="getinstance"></a>

### «Static» getInstance

► **getInstance**(name: *`string`*): [Connection](connection.md)



*Defined in [core/MongoPortable.ts:112](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/core/MongoPortable.ts#L112)*



Retrieves the instance of that DDBB name


**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| name | `string`   |  The DDBB name |





**Returns:** [Connection](connection.md)
- The DDBB instance






___


<a id="options"></a>

## Object literal: options


<a id="options.log"></a>

###  log

**●  log**:  *`object`* 

*Defined in [emitter/EventEmitter.ts:8](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/emitter/EventEmitter.ts#L8)*


#### Type declaration





___


