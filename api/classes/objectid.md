[Mongo Portable](../README.md) > [ObjectId](../classes/objectid.md)



# Class: ObjectId


ObjectId
*__module__*: ObjectId

*__since__*: 0.0.1

*__author__*: Eduardo Astolfi [eastolfi91@gmail.com](mailto:eastolfi91@gmail.com)

*__copyright__*: 2016 Eduardo Astolfi [eastolfi91@gmail.com](mailto:eastolfi91@gmail.com)

*__license__*: MIT Licensed

*__classdesc__*: Represents the BSON ObjectId type

*__param__*: Can be a 24 byte hex string, a 12 byte binary string or a Number.


## Index

### Constructors

* [constructor](objectid.md#constructor)


### Properties

* [___id](objectid.md#___id)
* [_bsontype](objectid.md#_bsontype)
* [binaryParser](objectid.md#binaryparser)
* [id](objectid.md#id)
* [logger](objectid.md#logger)
* [cacheHexString](objectid.md#cachehexstring)
* [index](objectid.md#index)


### Accessors

* [generationTime](objectid.md#generationtime)


### Methods

* [equals](objectid.md#equals)
* [generate](objectid.md#generate)
* [getInc](objectid.md#getinc)
* [getTimestamp](objectid.md#gettimestamp)
* [returnHash](objectid.md#returnhash)
* [toHexString](objectid.md#tohexstring)
* [toJSON](objectid.md#tojson)
* [toString](objectid.md#tostring)
* [createFromHexString](objectid.md#createfromhexstring)
* [createFromTime](objectid.md#createfromtime)
* [createPk](objectid.md#createpk)



---
## Constructors
<a id="constructor"></a>


### ⊕ **new ObjectId**(id?: *`string`⎮`number`*): [ObjectId](objectid.md)


*Defined in [document/ObjectId.ts:56](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/document/ObjectId.ts#L56)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| id | `string`⎮`number`   |  - |





**Returns:** [ObjectId](objectid.md)

---


## Properties
<a id="___id"></a>

### «Private» ___id

**●  ___id**:  *`string`* 

*Defined in [document/ObjectId.ts:53](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/document/ObjectId.ts#L53)*





___

<a id="_bsontype"></a>

### «Private» _bsontype

**●  _bsontype**:  *`string`*  = "ObjectId"

*Defined in [document/ObjectId.ts:52](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/document/ObjectId.ts#L52)*





___

<a id="binaryparser"></a>

###  binaryParser

**●  binaryParser**:  *[BinaryParser](binaryparser.md)* 

*Defined in [document/ObjectId.ts:55](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/document/ObjectId.ts#L55)*





___

<a id="id"></a>

###  id

**●  id**:  *`string`* 

*Defined in [document/ObjectId.ts:56](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/document/ObjectId.ts#L56)*





___

<a id="logger"></a>

### «Protected» logger

**●  logger**:  *`JSWLogger`* 

*Defined in [document/ObjectId.ts:47](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/document/ObjectId.ts#L47)*





___

<a id="cachehexstring"></a>

### «Static»«Private» cacheHexString

**●  cacheHexString**:  *`string`* 

*Defined in [document/ObjectId.ts:49](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/document/ObjectId.ts#L49)*





___

<a id="index"></a>

### «Static» index

**●  index**:  *`number`*  = 0

*Defined in [document/ObjectId.ts:50](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/document/ObjectId.ts#L50)*





___


## Accessors
<a id="generationtime"></a>

###  generationTime


getgenerationTime(): `string`⎮`number`setgenerationTime(value: *`string`⎮`number`*): `void`

*Defined in [document/ObjectId.ts:263](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/document/ObjectId.ts#L263)*





**Returns:** `string`⎮`number`

*Defined in [document/ObjectId.ts:267](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/document/ObjectId.ts#L267)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| value | `string`⎮`number`   |  - |





**Returns:** `void`



___


## Methods
<a id="equals"></a>

###  equals

► **equals**(otherID: *`any`*): `boolean`



*Defined in [document/ObjectId.ts:241](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/document/ObjectId.ts#L241)*



Compares the equality of this ObjectId with [otherID].
*__method__*: ObjectId#equals



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| otherID | `any`   |  ObjectId instance to compare against. |





**Returns:** `boolean`
The result of comparing two ObjectId"s






___

<a id="generate"></a>

### «Private» generate

► **generate**(time?: *`string`⎮`number`*): `string`



*Defined in [document/ObjectId.ts:178](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/document/ObjectId.ts#L178)*



Generate a 12 byte id string used in ObjectId"s
*__method__*: ObjectId#generate



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| time | `string`⎮`number`   |  - |





**Returns:** `string`
The 12 byte id binary string.






___

<a id="getinc"></a>

### «Private» getInc

► **getInc**(): `number`



*Defined in [document/ObjectId.ts:153](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/document/ObjectId.ts#L153)*



Update the ObjectId index used in generating new ObjectId"s on the driver
*__method__*: ObjectId#get_inc





**Returns:** `number`
Next index value.






___

<a id="gettimestamp"></a>

###  getTimestamp

► **getTimestamp**(): `Date`



*Defined in [document/ObjectId.ts:254](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/document/ObjectId.ts#L254)*



Returns the generation time in seconds that this ID was generated.
*__method__*: ObjectId#getTimestamp





**Returns:** `Date`
Number of seconds in the timestamp part of the 12 byte id.






___

<a id="returnhash"></a>

###  returnHash

► **returnHash**(length: *`number`*): `string`



*Defined in [document/ObjectId.ts:157](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/document/ObjectId.ts#L157)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| length | `number`   |  - |





**Returns:** `string`





___

<a id="tohexstring"></a>

###  toHexString

► **toHexString**(): `string`



*Defined in [document/ObjectId.ts:100](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/document/ObjectId.ts#L100)*



Return the ObjectId id as a 24 byte hex string representation
*__method__*: ObjectId#toHexString





**Returns:** `string`
The 24 byte hex string representation.






___

<a id="tojson"></a>

###  toJSON

► **toJSON**(): `string`



*Defined in [document/ObjectId.ts:141](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/document/ObjectId.ts#L141)*



Alias for {@link ObjectId#toHexString}
*__method__*: Cursor#next





**Returns:** `string`





___

<a id="tostring"></a>

###  toString

► **toString**(): `string`



*Defined in [document/ObjectId.ts:132](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/document/ObjectId.ts#L132)*



Alias for {@link ObjectId#toHexString}
*__method__*: Cursor#next





**Returns:** `string`





___

<a id="createfromhexstring"></a>

### «Static» createFromHexString

► **createFromHexString**(hexString: *`any`*): [ObjectId](objectid.md)



*Defined in [document/ObjectId.ts:286](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/document/ObjectId.ts#L286)*



Creates an ObjectId from a hex string representation of an ObjectId.
*__method__*: ObjectId#createFromHexString



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| hexString | `any`   |  An ObjectId 24 byte hexstring representation. |





**Returns:** [ObjectId](objectid.md)
The created ObjectId






___

<a id="createfromtime"></a>

### «Static» createFromTime

► **createFromTime**(time: *`any`*): [ObjectId](objectid.md)



*Defined in [document/ObjectId.ts:318](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/document/ObjectId.ts#L318)*



Creates an ObjectId from a second based number, with the rest of the ObjectId zeroed out. Used for comparisons or sorting the ObjectId.
*__method__*: ObjectId#createFromTime



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| time | `any`   |  A number of seconds. |





**Returns:** [ObjectId](objectid.md)
The created ObjectId






___

<a id="createpk"></a>

### «Static» createPk

► **createPk**(): [ObjectId](objectid.md)



*Defined in [document/ObjectId.ts:333](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/document/ObjectId.ts#L333)*



Creates an ObjectId from a second based number, with the rest of the ObjectId zeroed out. Used for comparisons or sorting the ObjectId.
*__method__*: ObjectId#createPk





**Returns:** [ObjectId](objectid.md)
return the created ObjectId






___


