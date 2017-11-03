[Mongo Portable](../README.md) > [Collection](../classes/collection.md)



# Class: Collection

## Index

### Constructors

* [constructor](collection.md#constructor)


### Properties

* [databaseName](collection.md#databasename)
* [doc_indexes](collection.md#doc_indexes)
* [docs](collection.md#docs)
* [emit](collection.md#emit)
* [fullName](collection.md#fullname)
* [logger](collection.md#logger)
* [name](collection.md#name)
* [snapshots](collection.md#snapshots)


### Methods

* [aggregate](collection.md#aggregate)
* [backup](collection.md#backup)
* [backups](collection.md#backups)
* [bulkInsert](collection.md#bulkinsert)
* [clearBackups](collection.md#clearbackups)
* [delete](collection.md#delete)
* [destroy](collection.md#destroy)
* [drop](collection.md#drop)
* [ensureIndex](collection.md#ensureindex)
* [find](collection.md#find)
* [findOne](collection.md#findone)
* [insert](collection.md#insert)
* [remove](collection.md#remove)
* [removeBackup](collection.md#removebackup)
* [rename](collection.md#rename)
* [restore](collection.md#restore)
* [save](collection.md#save)
* [update](collection.md#update)
* [checkCollectionName](collection.md#checkcollectionname)


### Object literals

* [_noCreateModifiers](collection.md#_nocreatemodifiers)



---
## Constructors
<a id="constructor"></a>


### ⊕ **new Collection**(db: *`any`*, collectionName: *`any`*): [Collection](collection.md)


*Defined in [collection/Collection.ts:59](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L59)*




**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| db | `any`   |  Additional options |
| collectionName | `any`   |  The name of the collection |





**Returns:** [Collection](collection.md)

---


## Properties
<a id="databasename"></a>

###  databaseName

**●  databaseName**:  *`any`* 

*Defined in [collection/Collection.ts:53](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L53)*





___

<a id="doc_indexes"></a>

###  doc_indexes

**●  doc_indexes**:  *`any`* 

*Defined in [collection/Collection.ts:56](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L56)*





___

<a id="docs"></a>

###  docs

**●  docs**:  *`any`* 

*Defined in [collection/Collection.ts:55](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L55)*





___

<a id="emit"></a>

###  emit

**●  emit**:  *`Function`* 

*Defined in [collection/Collection.ts:59](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L59)*





___

<a id="fullname"></a>

###  fullName

**●  fullName**:  *`any`* 

*Defined in [collection/Collection.ts:54](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L54)*





___

<a id="logger"></a>

### «Protected» logger

**●  logger**:  *`JSWLogger`* 

*Defined in [collection/Collection.ts:50](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L50)*





___

<a id="name"></a>

###  name

**●  name**:  *`any`* 

*Defined in [collection/Collection.ts:52](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L52)*





___

<a id="snapshots"></a>

###  snapshots

**●  snapshots**:  *`any`* 

*Defined in [collection/Collection.ts:57](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L57)*





___


## Methods
<a id="aggregate"></a>

###  aggregate

► **aggregate**(pipeline: *`any`*, options?: *`object`*): `any`



*Defined in [collection/Collection.ts:1045](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L1045)*



Calculates aggregate values for the data in a collection


**Parameters:**

| Param | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| pipeline | `any`  | - |   A sequence of data aggregation operations or stages |
| options | `object`  |  { forceFetch: false } |   - |





**Returns:** `any`
If "options.forceFetch" set to true returns the array of documents, otherwise returns a cursor






___

<a id="backup"></a>

###  backup

► **backup**(backupID: *`any`*, callback?: *`any`*): `Promise`.<`any`>



*Defined in [collection/Collection.ts:888](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L888)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| backupID | `any`   |  - |
| callback | `any`   |  - |





**Returns:** `Promise`.<`any`>





___

<a id="backups"></a>

###  backups

► **backups**(): `Array`.<`any`>



*Defined in [collection/Collection.ts:926](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L926)*





**Returns:** `Array`.<`any`>





___

<a id="bulkinsert"></a>

###  bulkInsert

► **bulkInsert**(docs: *`any`*, options: *`any`*, callback?: *`any`*): `ThenPromise`.<`Object`>



*Defined in [collection/Collection.ts:232](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L232)*



Inserts several documents into the collection


**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| docs | `any`   |  Documents to be inserted |
| options | `any`   |  - |
| callback | `any`   |  - |





**Returns:** `ThenPromise`.<`Object`>
Returns a promise with the inserted documents






___

<a id="clearbackups"></a>

###  clearBackups

► **clearBackups**(): `void`



*Defined in [collection/Collection.ts:972](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L972)*





**Returns:** `void`





___

<a id="delete"></a>

###  delete

► **delete**(selection: *`any`*, options: *`any`*, callback?: *`any`*): `Promise`.<`Object`>



*Defined in [collection/Collection.ts:767](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L767)*



Alias for {@link Collection#remove}


**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| selection | `any`   |  - |
| options | `any`   |  - |
| callback | `any`   |  - |





**Returns:** `Promise`.<`Object`>





___

<a id="destroy"></a>

###  destroy

► **destroy**(selection: *`any`*, options: *`any`*, callback?: *`any`*): `Promise`.<`Object`>



*Defined in [collection/Collection.ts:776](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L776)*



Alias for {@link Collection#remove}


**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| selection | `any`   |  - |
| options | `any`   |  - |
| callback | `any`   |  - |





**Returns:** `Promise`.<`Object`>





___

<a id="drop"></a>

###  drop

► **drop**(options: *`any`*, callback?: *`any`*): `Promise`.<`Object`>



*Defined in [collection/Collection.ts:794](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L794)*



Drops a collection


**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| options | `any`   |  - |
| callback | `any`   |  - |





**Returns:** `Promise`.<`Object`>
Promise with the deleted documents






___

<a id="ensureindex"></a>

###  ensureIndex

► **ensureIndex**(): `void`



*Defined in [collection/Collection.ts:877](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L877)*





**Returns:** `void`





___

<a id="find"></a>

###  find

► **find**(selection: *`any`*, fields: *`any`*, options: *`any`*, callback?: *`any`*): `ThenPromise`.<`Object`>



*Defined in [collection/Collection.ts:288](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L288)*



Finds all matching documents


**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| selection | `any`   |  - |
| fields | `any`   |  - |
| options | `any`   |  - |
| callback | `any`   |  - |





**Returns:** `ThenPromise`.<`Object`>
Returns a promise with the documents (or cursor if "options.forceFetch" set to true)






___

<a id="findone"></a>

###  findOne

► **findOne**(selection: *`any`*, fields: *`any`*, options: *`any`*, callback?: *`any`*): `Promise`.<`any`>



*Defined in [collection/Collection.ts:357](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L357)*



Finds the first matching document


**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| selection | `any`   |  - |
| fields | `any`   |  - |
| options | `any`   |  - |
| callback | `any`   |  - |





**Returns:** `Promise`.<`any`>
Returns a promise with the first matching document of the collection






___

<a id="insert"></a>

###  insert

► **insert**(doc: *`any`*, options: *`any`*, callback?: *`any`*): `Promise`.<`any`>



*Defined in [collection/Collection.ts:159](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L159)*



Inserts a document into the collection


**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| doc | `any`   |  Document to be inserted |
| options | `any`   |  - |
| callback | `any`   |  - |





**Returns:** `Promise`.<`any`>
Returns a promise with the inserted document






___

<a id="remove"></a>

###  remove

► **remove**(selection: *`any`*, options: *`any`*, callback?: *`any`*): `Promise`.<`Object`>



*Defined in [collection/Collection.ts:686](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L686)*



Removes one or many documents


**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| selection | `any`   |  - |
| options | `any`   |  - |
| callback | `any`   |  - |





**Returns:** `Promise`.<`Object`>
Promise with the deleted documents






___

<a id="removebackup"></a>

###  removeBackup

► **removeBackup**(backupID: *`any`*): `String`



*Defined in [collection/Collection.ts:944](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L944)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| backupID | `any`   |  - |





**Returns:** `String`





___

<a id="rename"></a>

###  rename

► **rename**(newName: *`any`*): `any`



*Defined in [collection/Collection.ts:1070](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L1070)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| newName | `any`   |  - |





**Returns:** `any`





___

<a id="restore"></a>

###  restore

► **restore**(backupID: *`any`*, callback: *`any`*): `Promise`.<`String`>



*Defined in [collection/Collection.ts:981](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L981)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| backupID | `any`   |  - |
| callback | `any`   |  - |





**Returns:** `Promise`.<`String`>





___

<a id="save"></a>

###  save

► **save**(doc: *`any`*, options: *`any`*, callback?: *`any`*): `Promise`.<`any`>



*Defined in [collection/Collection.ts:852](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L852)*



Insert or update a document. If the document has an "_id" is an update (with upsert), if not is an insert.


**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| doc | `any`   |  Document to be inserted/updated |
| options | `any`   |  - |
| callback | `any`   |  - |





**Returns:** `Promise`.<`any`>
Returns a promise with the inserted document or the update information






___

<a id="update"></a>

###  update

► **update**(selection: *`any`*, update: *`any`*, options: *`any`*, callback?: *`any`*): `Promise`.<`any`>



*Defined in [collection/Collection.ts:437](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L437)*



Updates one or many documents


**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| selection | `any`   |  - |
| update | `any`   |  - |
| options | `any`   |  - |
| callback | `any`   |  - |





**Returns:** `Promise`.<`any`>
Returns a promise with the update/insert (if upsert=true) information






___

<a id="checkcollectionname"></a>

### «Static» checkCollectionName

► **checkCollectionName**(collectionName: *`any`*): `void`



*Defined in [collection/Collection.ts:121](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L121)*


*__ignore__*: 



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| collectionName | `any`   |  - |





**Returns:** `void`





___


<a id="_nocreatemodifiers"></a>

## Object literal: _noCreateModifiers

*__ignore__*: 



<a id="_nocreatemodifiers._pop"></a>

###  $pop

**●  $pop**:  *`boolean`*  = true

*Defined in [collection/Collection.ts:112](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L112)*





___
<a id="_nocreatemodifiers._pull"></a>

###  $pull

**●  $pull**:  *`boolean`*  = true

*Defined in [collection/Collection.ts:114](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L114)*





___
<a id="_nocreatemodifiers._pullall"></a>

###  $pullAll

**●  $pullAll**:  *`boolean`*  = true

*Defined in [collection/Collection.ts:115](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L115)*





___
<a id="_nocreatemodifiers._rename"></a>

###  $rename

**●  $rename**:  *`boolean`*  = true

*Defined in [collection/Collection.ts:113](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L113)*





___
<a id="_nocreatemodifiers._unset"></a>

###  $unset

**●  $unset**:  *`boolean`*  = true

*Defined in [collection/Collection.ts:111](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Collection.ts#L111)*





___


