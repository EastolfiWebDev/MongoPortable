[Mongo Portable](../README.md) > [BinaryParserBuffer](../classes/binaryparserbuffer.md)



# Class: BinaryParserBuffer


BinaryParserBuffer
*__module__*: BinaryParserBuffer

*__since__*: 0.0.1

*__author__*: Eduardo Astolfi [eastolfi91@gmail.com](mailto:eastolfi91@gmail.com)

*__copyright__*: 2016 Eduardo Astolfi [eastolfi91@gmail.com](mailto:eastolfi91@gmail.com)

*__license__*: MIT Licensed

*__classdesc__*: BinaryParserBuffer - based on ([Binary Parser](http://jsfromhell.com/classes/binary-parser)) by Jonas Raoni Soares Silva


## Index

### Constructors

* [constructor](binaryparserbuffer.md#constructor)


### Properties

* [bigEndian](binaryparserbuffer.md#bigendian)
* [buffer](binaryparserbuffer.md#buffer)
* [logger](binaryparserbuffer.md#logger)


### Methods

* [checkBuffer](binaryparserbuffer.md#checkbuffer)
* [hasNeededBits](binaryparserbuffer.md#hasneededbits)
* [readBits](binaryparserbuffer.md#readbits)
* [setBuffer](binaryparserbuffer.md#setbuffer)



---
## Constructors
<a id="constructor"></a>


### ⊕ **new BinaryParserBuffer**(bigEndian: *`any`*, buffer: *`string`⎮`number`*): [BinaryParserBuffer](binaryparserbuffer.md)


*Defined in [binary/BinaryParserBuffer.ts:19](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParserBuffer.ts#L19)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| bigEndian | `any`   |  - |
| buffer | `string`⎮`number`   |  - |





**Returns:** [BinaryParserBuffer](binaryparserbuffer.md)

---


## Properties
<a id="bigendian"></a>

###  bigEndian

**●  bigEndian**:  *`number`* 

*Defined in [binary/BinaryParserBuffer.ts:18](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParserBuffer.ts#L18)*





___

<a id="buffer"></a>

###  buffer

**●  buffer**:  *`Array`.<`any`>*  =  []

*Defined in [binary/BinaryParserBuffer.ts:19](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParserBuffer.ts#L19)*





___

<a id="logger"></a>

### «Protected» logger

**●  logger**:  *`JSWLogger`* 

*Defined in [binary/BinaryParserBuffer.ts:16](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParserBuffer.ts#L16)*





___


## Methods
<a id="checkbuffer"></a>

###  checkBuffer

► **checkBuffer**(neededBits: *`any`*): `void`



*Defined in [binary/BinaryParserBuffer.ts:50](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParserBuffer.ts#L50)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| neededBits | `any`   |  - |





**Returns:** `void`





___

<a id="hasneededbits"></a>

###  hasNeededBits

► **hasNeededBits**(neededBits: *`any`*): `boolean`



*Defined in [binary/BinaryParserBuffer.ts:46](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParserBuffer.ts#L46)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| neededBits | `any`   |  - |





**Returns:** `boolean`





___

<a id="readbits"></a>

###  readBits

► **readBits**(start: *`number`*, length: *`number`*): `number`



*Defined in [binary/BinaryParserBuffer.ts:56](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParserBuffer.ts#L56)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| start | `number`   |  - |
| length | `number`   |  - |





**Returns:** `number`





___

<a id="setbuffer"></a>

###  setBuffer

► **setBuffer**(data: *`string`*): `void`



*Defined in [binary/BinaryParserBuffer.ts:33](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParserBuffer.ts#L33)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `string`   |  - |





**Returns:** `void`





___


