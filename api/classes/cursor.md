[Mongo Portable](../README.md) > [Cursor](../classes/cursor.md)



# Class: Cursor


Cursor
*__module__*: Cursor

*__since__*: 0.0.1

*__author__*: Eduardo Astolfi [eduardo.astolfi91@gmail.com](mailto:eduardo.astolfi91@gmail.com)

*__copyright__*: 2016 Eduardo Astolfi [eduardo.astolfi91@gmail.com](mailto:eduardo.astolfi91@gmail.com)

*__license__*: MIT Licensed

*__classdesc__*: Cursor class that maps a MongoDB-like cursor


## Index

### Constructors

* [constructor](cursor.md#constructor)


### Properties

* [cursor_pos](cursor.md#cursor_pos)
* [db_objects](cursor.md#db_objects)
* [documents](cursor.md#documents)
* [fetch_mode](cursor.md#fetch_mode)
* [fields](cursor.md#fields)
* [indexes](cursor.md#indexes)
* [limitValue](cursor.md#limitvalue)
* [logger](cursor.md#logger)
* [selector](cursor.md#selector)
* [selector_compiled](cursor.md#selector_compiled)
* [selector_id](cursor.md#selector_id)
* [skipValue](cursor.md#skipvalue)
* [sortValue](cursor.md#sortvalue)
* [sort_compiled](cursor.md#sort_compiled)
* [sorted](cursor.md#sorted)
* [COLSCAN](cursor.md#colscan)
* [IDXSCAN](cursor.md#idxscan)


### Methods

* [batchSize](cursor.md#batchsize)
* [close](cursor.md#close)
* [comment](cursor.md#comment)
* [count](cursor.md#count)
* [explain](cursor.md#explain)
* [fetch](cursor.md#fetch)
* [fetchAll](cursor.md#fetchall)
* [fetchOne](cursor.md#fetchone)
* [forEach](cursor.md#foreach)
* [hasNext](cursor.md#hasnext)
* [hint](cursor.md#hint)
* [itcount](cursor.md#itcount)
* [limit](cursor.md#limit)
* [map](cursor.md#map)
* [max](cursor.md#max)
* [maxScan](cursor.md#maxscan)
* [maxTimeMS](cursor.md#maxtimems)
* [min](cursor.md#min)
* [next](cursor.md#next)
* [noCursorTimeout](cursor.md#nocursortimeout)
* [objsLeftInBatch](cursor.md#objsleftinbatch)
* [pretty](cursor.md#pretty)
* [readConcern](cursor.md#readconcern)
* [readPref](cursor.md#readpref)
* [returnKey](cursor.md#returnkey)
* [rewind](cursor.md#rewind)
* [setSorting](cursor.md#setsorting)
* [showRecordId](cursor.md#showrecordid)
* [size](cursor.md#size)
* [skip](cursor.md#skip)
* [snapshot](cursor.md#snapshot)
* [sort](cursor.md#sort)
* [tailable](cursor.md#tailable)
* [toArray](cursor.md#toarray)
* [project](cursor.md#project)
* [sort](cursor.md#sort-1)



---
## Constructors
<a id="constructor"></a>


### ⊕ **new Cursor**(documents: *`any`*, selection: *`any`*, fields?: *`any`*, options?: *`Object`*): [Cursor](cursor.md)


*Defined in [collection/Cursor.ts:57](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L57)*




**Parameters:**

| Param | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| documents | `any`  | - |   The list of documents |
| selection | `any`  | - |   - |
| fields | `any`  | - |   - |
| options | `Object`  |  {} |   - |





**Returns:** [Cursor](cursor.md)

---


## Properties
<a id="cursor_pos"></a>

###  cursor_pos

**●  cursor_pos**:  *`any`* 

*Defined in [collection/Cursor.ts:54](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L54)*





___

<a id="db_objects"></a>

###  db_objects

**●  db_objects**:  *`any`* 

*Defined in [collection/Cursor.ts:53](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L53)*





___

<a id="documents"></a>

###  documents

**●  documents**:  *`any`* 

*Defined in [collection/Cursor.ts:41](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L41)*





___

<a id="fetch_mode"></a>

###  fetch_mode

**●  fetch_mode**:  *`any`* 

*Defined in [collection/Cursor.ts:50](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L50)*





___

<a id="fields"></a>

###  fields

**●  fields**:  *`any`* 

*Defined in [collection/Cursor.ts:43](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L43)*





___

<a id="indexes"></a>

###  indexes

**●  indexes**:  *`any`*  =  null

*Defined in [collection/Cursor.ts:51](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L51)*





___

<a id="limitvalue"></a>

###  limitValue

**●  limitValue**:  *`any`* 

*Defined in [collection/Cursor.ts:45](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L45)*





___

<a id="logger"></a>

### «Protected» logger

**●  logger**:  *`JSWLogger`* 

*Defined in [collection/Cursor.ts:39](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L39)*





___

<a id="selector"></a>

###  selector

**●  selector**:  *`any`* 

*Defined in [collection/Cursor.ts:42](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L42)*





___

<a id="selector_compiled"></a>

###  selector_compiled

**●  selector_compiled**:  *`any`* 

*Defined in [collection/Cursor.ts:48](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L48)*





___

<a id="selector_id"></a>

###  selector_id

**●  selector_id**:  *`any`* 

*Defined in [collection/Cursor.ts:49](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L49)*





___

<a id="skipvalue"></a>

###  skipValue

**●  skipValue**:  *`any`* 

*Defined in [collection/Cursor.ts:44](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L44)*





___

<a id="sortvalue"></a>

###  sortValue

**●  sortValue**:  *`any`* 

*Defined in [collection/Cursor.ts:46](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L46)*





___

<a id="sort_compiled"></a>

###  sort_compiled

**●  sort_compiled**:  *`any`* 

*Defined in [collection/Cursor.ts:52](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L52)*





___

<a id="sorted"></a>

###  sorted

**●  sorted**:  *`boolean`*  = false

*Defined in [collection/Cursor.ts:47](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L47)*





___

<a id="colscan"></a>

### «Static» COLSCAN

**●  COLSCAN**:  *`string`*  = "colscan"

*Defined in [collection/Cursor.ts:56](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L56)*





___

<a id="idxscan"></a>

### «Static» IDXSCAN

**●  IDXSCAN**:  *`string`*  = "idxscan"

*Defined in [collection/Cursor.ts:57](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L57)*





___


## Methods
<a id="batchsize"></a>

###  batchSize

► **batchSize**(): `void`



*Defined in [collection/Cursor.ts:323](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L323)*


*__todo__*: Implement





**Returns:** `void`





___

<a id="close"></a>

###  close

► **close**(): `void`



*Defined in [collection/Cursor.ts:331](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L331)*


*__todo__*: Implement





**Returns:** `void`





___

<a id="comment"></a>

###  comment

► **comment**(): `void`



*Defined in [collection/Cursor.ts:339](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L339)*


*__todo__*: Implement





**Returns:** `void`





___

<a id="count"></a>

###  count

► **count**(): `any`



*Defined in [collection/Cursor.ts:234](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L234)*



Obtains the total of documents of the cursor
*__method__*: Cursor#count





**Returns:** `any`
The total of documents in the cursor






___

<a id="explain"></a>

###  explain

► **explain**(): `void`



*Defined in [collection/Cursor.ts:347](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L347)*


*__todo__*: Implement





**Returns:** `void`





___

<a id="fetch"></a>

###  fetch

► **fetch**(): `any`



*Defined in [collection/Cursor.ts:201](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L201)*



Alias for {@link Cursor#fetchAll}
*__method__*: Cursor#fetch





**Returns:** `any`





___

<a id="fetchall"></a>

###  fetchAll

► **fetchAll**(): `any`



*Defined in [collection/Cursor.ts:212](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L212)*



Fetch all documents in the cursor
*__method__*: Cursor#fetchAll





**Returns:** `any`
All the documents contained in the cursor






___

<a id="fetchone"></a>

###  fetchOne

► **fetchOne**(): `any`



*Defined in [collection/Cursor.ts:223](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L223)*



Retrieves the next document in the cursor
*__method__*: Cursor#fetchOne





**Returns:** `any`
The next document in the cursor






___

<a id="foreach"></a>

###  forEach

► **forEach**(callback: *`any`*): `void`



*Defined in [collection/Cursor.ts:149](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L149)*



Iterates over the cursor, calling a callback function
*__method__*: Cursor#forEach



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| callback | `any`   |  - |





**Returns:** `void`





___

<a id="hasnext"></a>

###  hasNext

► **hasNext**(): `boolean`



*Defined in [collection/Cursor.ts:183](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L183)*



Checks if the cursor has one document to be fetched
*__method__*: Cursor#hasNext





**Returns:** `boolean`
True if we can fetch one more document






___

<a id="hint"></a>

###  hint

► **hint**(): `void`



*Defined in [collection/Cursor.ts:355](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L355)*


*__todo__*: Implement





**Returns:** `void`





___

<a id="itcount"></a>

###  itcount

► **itcount**(): `void`



*Defined in [collection/Cursor.ts:363](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L363)*


*__todo__*: Implement





**Returns:** `void`





___

<a id="limit"></a>

###  limit

► **limit**(limit: *`any`*): `this`



*Defined in [collection/Cursor.ts:312](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L312)*



Set the max number of document to fetch
*__method__*: Cursor#limit



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| limit | `any`   |  The max number of documents |





**Returns:** `this`
This instance so it can be chained with other methods






___

<a id="map"></a>

###  map

► **map**(callback: *`any`*): `Array`.<`any`>



*Defined in [collection/Cursor.ts:166](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L166)*



Iterates over the cursor, returning a new array with the documents affected by the callback function
*__method__*: Cursor#map



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| callback | `any`   |  - |





**Returns:** `Array`.<`any`>
The documents after being affected with the callback function






___

<a id="max"></a>

###  max

► **max**(): `void`



*Defined in [collection/Cursor.ts:387](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L387)*


*__todo__*: Implement





**Returns:** `void`





___

<a id="maxscan"></a>

###  maxScan

► **maxScan**(): `void`



*Defined in [collection/Cursor.ts:371](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L371)*


*__todo__*: Implement





**Returns:** `void`





___

<a id="maxtimems"></a>

###  maxTimeMS

► **maxTimeMS**(): `void`



*Defined in [collection/Cursor.ts:379](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L379)*


*__todo__*: Implement





**Returns:** `void`





___

<a id="min"></a>

###  min

► **min**(): `void`



*Defined in [collection/Cursor.ts:395](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L395)*


*__todo__*: Implement





**Returns:** `void`





___

<a id="next"></a>

###  next

► **next**(): `any`



*Defined in [collection/Cursor.ts:192](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L192)*



Alias for {@link Cursor#fetchOne}
*__method__*: Cursor#next





**Returns:** `any`





___

<a id="nocursortimeout"></a>

###  noCursorTimeout

► **noCursorTimeout**(): `void`



*Defined in [collection/Cursor.ts:403](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L403)*


*__todo__*: Implement





**Returns:** `void`





___

<a id="objsleftinbatch"></a>

###  objsLeftInBatch

► **objsLeftInBatch**(): `void`



*Defined in [collection/Cursor.ts:411](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L411)*


*__todo__*: Implement





**Returns:** `void`





___

<a id="pretty"></a>

###  pretty

► **pretty**(): `void`



*Defined in [collection/Cursor.ts:419](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L419)*


*__todo__*: Implement





**Returns:** `void`





___

<a id="readconcern"></a>

###  readConcern

► **readConcern**(): `void`



*Defined in [collection/Cursor.ts:427](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L427)*


*__todo__*: Implement





**Returns:** `void`





___

<a id="readpref"></a>

###  readPref

► **readPref**(): `void`



*Defined in [collection/Cursor.ts:435](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L435)*


*__todo__*: Implement





**Returns:** `void`





___

<a id="returnkey"></a>

###  returnKey

► **returnKey**(): `void`



*Defined in [collection/Cursor.ts:443](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L443)*


*__todo__*: Implement





**Returns:** `void`





___

<a id="rewind"></a>

###  rewind

► **rewind**(): `void`



*Defined in [collection/Cursor.ts:137](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L137)*



Moves a cursor to the begining
*__method__*: Cursor#rewind





**Returns:** `void`





___

<a id="setsorting"></a>

###  setSorting

► **setSorting**(spec: *`any`*): `this`



*Defined in [collection/Cursor.ts:247](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L247)*



Set the sorting of the cursor
*__method__*: Cursor#sort



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| spec | `any`   |  The sorting specification |





**Returns:** `this`
This instance so it can be chained with other methods






___

<a id="showrecordid"></a>

###  showRecordId

► **showRecordId**(): `void`



*Defined in [collection/Cursor.ts:451](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L451)*


*__todo__*: Implement





**Returns:** `void`





___

<a id="size"></a>

###  size

► **size**(): `void`



*Defined in [collection/Cursor.ts:459](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L459)*


*__todo__*: Implement





**Returns:** `void`





___

<a id="skip"></a>

###  skip

► **skip**(skip: *`any`*): `this`



*Defined in [collection/Cursor.ts:295](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L295)*



Set the number of document to skip when fetching the cursor
*__method__*: Cursor#skip



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| skip | `any`   |  The number of documents to skip |





**Returns:** `this`
This instance so it can be chained with other methods






___

<a id="snapshot"></a>

###  snapshot

► **snapshot**(): `void`



*Defined in [collection/Cursor.ts:467](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L467)*


*__todo__*: Implement





**Returns:** `void`





___

<a id="sort"></a>

###  sort

► **sort**(spec: *`any`*): `this`



*Defined in [collection/Cursor.ts:267](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L267)*



Applies a sorting on the cursor
*__method__*: Cursor#sort



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| spec | `any`   |  The sorting specification |





**Returns:** `this`
This instance so it can be chained with other methods






___

<a id="tailable"></a>

###  tailable

► **tailable**(): `void`



*Defined in [collection/Cursor.ts:476](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L476)*


*__todo__*: Implement





**Returns:** `void`





___

<a id="toarray"></a>

###  toArray

► **toArray**(): `void`



*Defined in [collection/Cursor.ts:484](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L484)*


*__todo__*: Implement





**Returns:** `void`





___

<a id="project"></a>

### «Static» project

► **project**(doc: *`any`*, spec: *`any`*, aggregation?: *`boolean`*): `any`



*Defined in [collection/Cursor.ts:503](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L503)*



Projects the fields of one or several documents, changing the output
*__method__*: Cursor.project



**Parameters:**

| Param | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| doc | `any`  | - |   The document/s that will be projected |
| spec | `any`  | - |   Fields projection specification. Can be an space/comma separated list, an array, or an object |
| aggregation | `boolean`  | false |   - |





**Returns:** `any`
The document/s after the projection






___

<a id="sort-1"></a>

### «Static» sort

► **sort**(doc: *`any`*, fields: *`any`*): `void`



*Defined in [collection/Cursor.ts:489](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/collection/Cursor.ts#L489)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| doc | `any`   |  - |
| fields | `any`   |  - |





**Returns:** `void`





___


