[Mongo Portable](../README.md) > [BinaryParser](../classes/binaryparser.md)



# Class: BinaryParser

## Index

### Constructors

* [constructor](binaryparser.md#constructor)


### Properties

* [allowExceptions](binaryparser.md#allowexceptions)
* [bigEndian](binaryparser.md#bigendian)
* [logger](binaryparser.md#logger)


### Methods

* [decodeFloat](binaryparser.md#decodefloat)
* [decodeInt](binaryparser.md#decodeint)
* [decode_utf8](binaryparser.md#decode_utf8)
* [encodeFloat](binaryparser.md#encodefloat)
* [encodeInt](binaryparser.md#encodeint)
* [encode_cstring](binaryparser.md#encode_cstring)
* [encode_int32](binaryparser.md#encode_int32)
* [encode_int64](binaryparser.md#encode_int64)
* [encode_utf8](binaryparser.md#encode_utf8)
* [fromByte](binaryparser.md#frombyte)
* [fromDWord](binaryparser.md#fromdword)
* [fromDouble](binaryparser.md#fromdouble)
* [fromFloat](binaryparser.md#fromfloat)
* [fromInt](binaryparser.md#fromint)
* [fromLong](binaryparser.md#fromlong)
* [fromQWord](binaryparser.md#fromqword)
* [fromShort](binaryparser.md#fromshort)
* [fromSmall](binaryparser.md#fromsmall)
* [fromWord](binaryparser.md#fromword)
* [generate12string](binaryparser.md#generate12string)
* [hlprint](binaryparser.md#hlprint)
* [hprint](binaryparser.md#hprint)
* [ilprint](binaryparser.md#ilprint)
* [toByte](binaryparser.md#tobyte)
* [toDWord](binaryparser.md#todword)
* [toDouble](binaryparser.md#todouble)
* [toFloat](binaryparser.md#tofloat)
* [toInt](binaryparser.md#toint)
* [toLong](binaryparser.md#tolong)
* [toQWord](binaryparser.md#toqword)
* [toShort](binaryparser.md#toshort)
* [toSmall](binaryparser.md#tosmall)
* [toWord](binaryparser.md#toword)
* [decode_utf8](binaryparser.md#decode_utf8-1)
* [encode_cstring](binaryparser.md#encode_cstring-1)
* [encode_int32](binaryparser.md#encode_int32-1)
* [encode_int64](binaryparser.md#encode_int64-1)
* [encode_utf8](binaryparser.md#encode_utf8-1)
* [fromByte](binaryparser.md#frombyte-1)
* [fromDWord](binaryparser.md#fromdword-1)
* [fromDouble](binaryparser.md#fromdouble-1)
* [fromFloat](binaryparser.md#fromfloat-1)
* [fromInt](binaryparser.md#fromint-1)
* [fromLong](binaryparser.md#fromlong-1)
* [fromQWord](binaryparser.md#fromqword-1)
* [fromShort](binaryparser.md#fromshort-1)
* [fromSmall](binaryparser.md#fromsmall-1)
* [fromWord](binaryparser.md#fromword-1)
* [hlprint](binaryparser.md#hlprint-1)
* [hprint](binaryparser.md#hprint-1)
* [ilprint](binaryparser.md#ilprint-1)
* [toByte](binaryparser.md#tobyte-1)
* [toDWord](binaryparser.md#todword-1)
* [toDouble](binaryparser.md#todouble-1)
* [toFloat](binaryparser.md#tofloat-1)
* [toInt](binaryparser.md#toint-1)
* [toLong](binaryparser.md#tolong-1)
* [toQWord](binaryparser.md#toqword-1)
* [toShort](binaryparser.md#toshort-1)
* [toSmall](binaryparser.md#tosmall-1)
* [toWord](binaryparser.md#toword-1)



---
## Constructors
<a id="constructor"></a>


### ⊕ **new BinaryParser**(bigEndian?: *`boolean`*, allowExceptions?: *`boolean`*): [BinaryParser](binaryparser.md)


*Defined in [binary/BinaryParser.ts:18](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L18)*



**Parameters:**

| Param | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| bigEndian | `boolean`  | false |   - |
| allowExceptions | `boolean`  | true |   - |





**Returns:** [BinaryParser](binaryparser.md)

---


## Properties
<a id="allowexceptions"></a>

### «Private» allowExceptions

**●  allowExceptions**:  *`boolean`* 

*Defined in [binary/BinaryParser.ts:18](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L18)*





___

<a id="bigendian"></a>

### «Private» bigEndian

**●  bigEndian**:  *`boolean`* 

*Defined in [binary/BinaryParser.ts:17](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L17)*





___

<a id="logger"></a>

### «Protected» logger

**●  logger**:  *`JSWLogger`* 

*Defined in [binary/BinaryParser.ts:15](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L15)*





___


## Methods
<a id="decodefloat"></a>

###  decodeFloat

► **decodeFloat**(data: *`string`⎮`number`*, precisionBits: *`number`*, exponentBits: *`number`*): `number`



*Defined in [binary/BinaryParser.ts:41](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L41)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `string`⎮`number`   |  - |
| precisionBits | `number`   |  - |
| exponentBits | `number`   |  - |





**Returns:** `number`





___

<a id="decodeint"></a>

###  decodeInt

► **decodeInt**(data: *`string`⎮`number`*, bits: *`number`*, signed: *`boolean`*, forceBigEndian?: *`boolean`*): `number`



*Defined in [binary/BinaryParser.ts:142](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L142)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `string`⎮`number`   |  - |
| bits | `number`   |  - |
| signed | `boolean`   |  - |
| forceBigEndian | `boolean`   |  - |





**Returns:** `number`





___

<a id="decode_utf8"></a>

###  decode_utf8

► **decode_utf8**(binaryStr: *`string`*): `string`



*Defined in [binary/BinaryParser.ts:514](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L514)*



UTF8 methods


**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| binaryStr | `string`   |  - |





**Returns:** `string`





___

<a id="encodefloat"></a>

###  encodeFloat

► **encodeFloat**(data: *`number`*, precisionBits: *`number`*, exponentBits: *`number`*): `string`



*Defined in [binary/BinaryParser.ts:160](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L160)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`   |  - |
| precisionBits | `number`   |  - |
| exponentBits | `number`   |  - |





**Returns:** `string`





___

<a id="encodeint"></a>

###  encodeInt

► **encodeInt**(data: *`number`*, bits: *`number`*, signed: *`boolean`*, forceBigEndian?: *`boolean`*): `string`



*Defined in [binary/BinaryParser.ts:364](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L364)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`   |  - |
| bits | `number`   |  - |
| signed | `boolean`   |  - |
| forceBigEndian | `boolean`   |  - |





**Returns:** `string`





___

<a id="encode_cstring"></a>

###  encode_cstring

► **encode_cstring**(s: *`string`⎮`number`*): `string`



*Defined in [binary/BinaryParser.ts:550](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L550)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| s | `string`⎮`number`   |  - |





**Returns:** `string`





___

<a id="encode_int32"></a>

###  encode_int32

► **encode_int32**(num: *`number`*, asArray?: *`boolean`*): `Array`.<`string`>⎮`string`



*Defined in [binary/BinaryParser.ts:457](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L457)*



**Parameters:**

| Param | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| num | `number`  | - |   - |
| asArray | `boolean`  | false |   - |





**Returns:** `Array`.<`string`>⎮`string`





___

<a id="encode_int64"></a>

###  encode_int64

► **encode_int64**(num: *`number`*): `string`



*Defined in [binary/BinaryParser.ts:477](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L477)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| num | `number`   |  - |





**Returns:** `string`





___

<a id="encode_utf8"></a>

###  encode_utf8

► **encode_utf8**(s: *`string`*): `string`



*Defined in [binary/BinaryParser.ts:558](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L558)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| s | `string`   |  - |





**Returns:** `string`





___

<a id="frombyte"></a>

###  fromByte

► **fromByte**(data: *`number`*): `string`



*Defined in [binary/BinaryParser.ts:416](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L416)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`   |  - |





**Returns:** `string`





___

<a id="fromdword"></a>

###  fromDWord

► **fromDWord**(data: *`number`*): `string`



*Defined in [binary/BinaryParser.ts:426](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L426)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`   |  - |





**Returns:** `string`





___

<a id="fromdouble"></a>

###  fromDouble

► **fromDouble**(data: *`number`*): `string`



*Defined in [binary/BinaryParser.ts:432](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L432)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`   |  - |





**Returns:** `string`





___

<a id="fromfloat"></a>

###  fromFloat

► **fromFloat**(data: *`number`*): `string`



*Defined in [binary/BinaryParser.ts:430](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L430)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`   |  - |





**Returns:** `string`





___

<a id="fromint"></a>

###  fromInt

► **fromInt**(data: *`number`*): `string`



*Defined in [binary/BinaryParser.ts:422](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L422)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`   |  - |





**Returns:** `string`





___

<a id="fromlong"></a>

###  fromLong

► **fromLong**(data: *`number`*): `string`



*Defined in [binary/BinaryParser.ts:424](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L424)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`   |  - |





**Returns:** `string`





___

<a id="fromqword"></a>

###  fromQWord

► **fromQWord**(data: *`number`*): `string`



*Defined in [binary/BinaryParser.ts:428](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L428)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`   |  - |





**Returns:** `string`





___

<a id="fromshort"></a>

###  fromShort

► **fromShort**(data: *`number`*): `string`



*Defined in [binary/BinaryParser.ts:418](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L418)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`   |  - |





**Returns:** `string`





___

<a id="fromsmall"></a>

###  fromSmall

► **fromSmall**(data: *`number`*): `string`



*Defined in [binary/BinaryParser.ts:414](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L414)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`   |  - |





**Returns:** `string`





___

<a id="fromword"></a>

###  fromWord

► **fromWord**(data: *`number`*): `string`



*Defined in [binary/BinaryParser.ts:420](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L420)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`   |  - |





**Returns:** `string`





___

<a id="generate12string"></a>

###  generate12string

► **generate12string**(): `string`



*Defined in [binary/BinaryParser.ts:34](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L34)*



Generate a 12 byte id string used in ObjectId"s
*__method__*: BinaryParser#generate12string





**Returns:** `string`
The 12 byte id binary string.






___

<a id="hlprint"></a>

###  hlprint

► **hlprint**(s: *`string`*): `number`



*Defined in [binary/BinaryParser.ts:626](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L626)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| s | `string`   |  - |





**Returns:** `number`





___

<a id="hprint"></a>

###  hprint

► **hprint**(s: *`string`*): `number`



*Defined in [binary/BinaryParser.ts:582](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L582)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| s | `string`   |  - |





**Returns:** `number`





___

<a id="ilprint"></a>

###  ilprint

► **ilprint**(s: *`string`*): `number`



*Defined in [binary/BinaryParser.ts:604](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L604)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| s | `string`   |  - |





**Returns:** `number`





___

<a id="tobyte"></a>

###  toByte

► **toByte**(data: *`number`⎮`string`*): `number`



*Defined in [binary/BinaryParser.ts:415](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L415)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`⎮`string`   |  - |





**Returns:** `number`





___

<a id="todword"></a>

###  toDWord

► **toDWord**(data: *`number`⎮`string`*): `number`



*Defined in [binary/BinaryParser.ts:425](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L425)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`⎮`string`   |  - |





**Returns:** `number`





___

<a id="todouble"></a>

###  toDouble

► **toDouble**(data: *`number`⎮`string`*): `number`



*Defined in [binary/BinaryParser.ts:431](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L431)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`⎮`string`   |  - |





**Returns:** `number`





___

<a id="tofloat"></a>

###  toFloat

► **toFloat**(data: *`number`⎮`string`*): `number`



*Defined in [binary/BinaryParser.ts:429](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L429)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`⎮`string`   |  - |





**Returns:** `number`





___

<a id="toint"></a>

###  toInt

► **toInt**(data: *`number`⎮`string`*): `number`



*Defined in [binary/BinaryParser.ts:421](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L421)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`⎮`string`   |  - |





**Returns:** `number`





___

<a id="tolong"></a>

###  toLong

► **toLong**(data: *`number`⎮`string`*): `number`



*Defined in [binary/BinaryParser.ts:423](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L423)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`⎮`string`   |  - |





**Returns:** `number`





___

<a id="toqword"></a>

###  toQWord

► **toQWord**(data: *`number`⎮`string`*): `number`



*Defined in [binary/BinaryParser.ts:427](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L427)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`⎮`string`   |  - |





**Returns:** `number`





___

<a id="toshort"></a>

###  toShort

► **toShort**(data: *`number`⎮`string`*): `number`



*Defined in [binary/BinaryParser.ts:417](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L417)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`⎮`string`   |  - |





**Returns:** `number`





___

<a id="tosmall"></a>

###  toSmall

► **toSmall**(data: *`number`⎮`string`*): `number`



*Defined in [binary/BinaryParser.ts:413](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L413)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`⎮`string`   |  - |





**Returns:** `number`





___

<a id="toword"></a>

###  toWord

► **toWord**(data: *`number`⎮`string`*): `number`



*Defined in [binary/BinaryParser.ts:419](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L419)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`⎮`string`   |  - |





**Returns:** `number`





___

<a id="decode_utf8-1"></a>

### «Static» decode_utf8

► **decode_utf8**(binaryStr: *`string`*): `string`



*Defined in [binary/BinaryParser.ts:547](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L547)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| binaryStr | `string`   |  - |





**Returns:** `string`





___

<a id="encode_cstring-1"></a>

### «Static» encode_cstring

► **encode_cstring**(s: *`string`⎮`number`*): `string`



*Defined in [binary/BinaryParser.ts:555](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L555)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| s | `string`⎮`number`   |  - |





**Returns:** `string`





___

<a id="encode_int32-1"></a>

### «Static» encode_int32

► **encode_int32**(num: *`number`*, asArray?: *`boolean`*): `Array`.<`string`>⎮`string`



*Defined in [binary/BinaryParser.ts:475](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L475)*



**Parameters:**

| Param | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| num | `number`  | - |   - |
| asArray | `boolean`  | false |   - |





**Returns:** `Array`.<`string`>⎮`string`





___

<a id="encode_int64-1"></a>

### «Static» encode_int64

► **encode_int64**(num: *`number`*): `string`



*Defined in [binary/BinaryParser.ts:507](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L507)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| num | `number`   |  - |





**Returns:** `string`





___

<a id="encode_utf8-1"></a>

### «Static» encode_utf8

► **encode_utf8**(s: *`string`*): `string`



*Defined in [binary/BinaryParser.ts:580](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L580)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| s | `string`   |  - |





**Returns:** `string`





___

<a id="frombyte-1"></a>

### «Static» fromByte

► **fromByte**(data: *`number`*): `string`



*Defined in [binary/BinaryParser.ts:438](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L438)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`   |  - |





**Returns:** `string`





___

<a id="fromdword-1"></a>

### «Static» fromDWord

► **fromDWord**(data: *`number`*): `string`



*Defined in [binary/BinaryParser.ts:448](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L448)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`   |  - |





**Returns:** `string`





___

<a id="fromdouble-1"></a>

### «Static» fromDouble

► **fromDouble**(data: *`number`*): `string`



*Defined in [binary/BinaryParser.ts:454](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L454)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`   |  - |





**Returns:** `string`





___

<a id="fromfloat-1"></a>

### «Static» fromFloat

► **fromFloat**(data: *`number`*): `string`



*Defined in [binary/BinaryParser.ts:452](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L452)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`   |  - |





**Returns:** `string`





___

<a id="fromint-1"></a>

### «Static» fromInt

► **fromInt**(data: *`number`*): `string`



*Defined in [binary/BinaryParser.ts:444](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L444)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`   |  - |





**Returns:** `string`





___

<a id="fromlong-1"></a>

### «Static» fromLong

► **fromLong**(data: *`number`*): `string`



*Defined in [binary/BinaryParser.ts:446](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L446)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`   |  - |





**Returns:** `string`





___

<a id="fromqword-1"></a>

### «Static» fromQWord

► **fromQWord**(data: *`number`*): `string`



*Defined in [binary/BinaryParser.ts:450](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L450)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`   |  - |





**Returns:** `string`





___

<a id="fromshort-1"></a>

### «Static» fromShort

► **fromShort**(data: *`number`*): `string`



*Defined in [binary/BinaryParser.ts:440](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L440)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`   |  - |





**Returns:** `string`





___

<a id="fromsmall-1"></a>

### «Static» fromSmall

► **fromSmall**(data: *`number`*): `string`



*Defined in [binary/BinaryParser.ts:436](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L436)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`   |  - |





**Returns:** `string`





___

<a id="fromword-1"></a>

### «Static» fromWord

► **fromWord**(data: *`number`*): `string`



*Defined in [binary/BinaryParser.ts:442](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L442)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`   |  - |





**Returns:** `string`





___

<a id="hlprint-1"></a>

### «Static» hlprint

► **hlprint**(s: *`string`*): `number`



*Defined in [binary/BinaryParser.ts:646](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L646)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| s | `string`   |  - |





**Returns:** `number`





___

<a id="hprint-1"></a>

### «Static» hprint

► **hprint**(s: *`string`*): `number`



*Defined in [binary/BinaryParser.ts:602](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L602)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| s | `string`   |  - |





**Returns:** `number`





___

<a id="ilprint-1"></a>

### «Static» ilprint

► **ilprint**(s: *`string`*): `number`



*Defined in [binary/BinaryParser.ts:624](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L624)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| s | `string`   |  - |





**Returns:** `number`





___

<a id="tobyte-1"></a>

### «Static» toByte

► **toByte**(data: *`number`⎮`string`*): `number`



*Defined in [binary/BinaryParser.ts:437](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L437)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`⎮`string`   |  - |





**Returns:** `number`





___

<a id="todword-1"></a>

### «Static» toDWord

► **toDWord**(data: *`number`⎮`string`*): `number`



*Defined in [binary/BinaryParser.ts:447](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L447)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`⎮`string`   |  - |





**Returns:** `number`





___

<a id="todouble-1"></a>

### «Static» toDouble

► **toDouble**(data: *`number`⎮`string`*): `number`



*Defined in [binary/BinaryParser.ts:453](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L453)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`⎮`string`   |  - |





**Returns:** `number`





___

<a id="tofloat-1"></a>

### «Static» toFloat

► **toFloat**(data: *`number`⎮`string`*): `number`



*Defined in [binary/BinaryParser.ts:451](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L451)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`⎮`string`   |  - |





**Returns:** `number`





___

<a id="toint-1"></a>

### «Static» toInt

► **toInt**(data: *`number`⎮`string`*): `number`



*Defined in [binary/BinaryParser.ts:443](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L443)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`⎮`string`   |  - |





**Returns:** `number`





___

<a id="tolong-1"></a>

### «Static» toLong

► **toLong**(data: *`number`⎮`string`*): `number`



*Defined in [binary/BinaryParser.ts:445](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L445)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`⎮`string`   |  - |





**Returns:** `number`





___

<a id="toqword-1"></a>

### «Static» toQWord

► **toQWord**(data: *`number`⎮`string`*): `number`



*Defined in [binary/BinaryParser.ts:449](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L449)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`⎮`string`   |  - |





**Returns:** `number`





___

<a id="toshort-1"></a>

### «Static» toShort

► **toShort**(data: *`number`⎮`string`*): `number`



*Defined in [binary/BinaryParser.ts:439](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L439)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`⎮`string`   |  - |





**Returns:** `number`





___

<a id="tosmall-1"></a>

### «Static» toSmall

► **toSmall**(data: *`number`⎮`string`*): `number`



*Defined in [binary/BinaryParser.ts:435](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L435)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`⎮`string`   |  - |





**Returns:** `number`





___

<a id="toword-1"></a>

### «Static» toWord

► **toWord**(data: *`number`⎮`string`*): `number`



*Defined in [binary/BinaryParser.ts:441](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/binary/BinaryParser.ts#L441)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `number`⎮`string`   |  - |





**Returns:** `number`





___


