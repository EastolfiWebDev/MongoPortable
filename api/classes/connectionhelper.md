[Mongo Portable](../README.md) > [ConnectionHelper](../classes/connectionhelper.md)



# Class: ConnectionHelper

## Index

### Constructors

* [constructor](connectionhelper.md#constructor)


### Methods

* [addConnection](connectionhelper.md#addconnection)
* [dropConnection](connectionhelper.md#dropconnection)
* [getConnection](connectionhelper.md#getconnection)
* [hasConnection](connectionhelper.md#hasconnection)
* [validateDatabaseName](connectionhelper.md#validatedatabasename)



---
## Constructors
<a id="constructor"></a>


### ⊕ **new ConnectionHelper**(): [ConnectionHelper](connectionhelper.md)


*Defined in [utils/ConnectionHelper.ts:20](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/utils/ConnectionHelper.ts#L20)*





**Returns:** [ConnectionHelper](connectionhelper.md)

---



## Methods
<a id="addconnection"></a>

###  addConnection

► **addConnection**(name: *`string`*, id: *`any`*, instance: *[MongoPortable](mongoportable.md)*): `void`



*Defined in [utils/ConnectionHelper.ts:24](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/utils/ConnectionHelper.ts#L24)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| name | `string`   |  - |
| id | `any`   |  - |
| instance | [MongoPortable](mongoportable.md)   |  - |





**Returns:** `void`





___

<a id="dropconnection"></a>

###  dropConnection

► **dropConnection**(name: *`string`*): `boolean`



*Defined in [utils/ConnectionHelper.ts:40](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/utils/ConnectionHelper.ts#L40)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| name | `string`   |  - |





**Returns:** `boolean`





___

<a id="getconnection"></a>

###  getConnection

► **getConnection**(name: *`string`*): [Connection](connection.md)



*Defined in [utils/ConnectionHelper.ts:30](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/utils/ConnectionHelper.ts#L30)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| name | `string`   |  - |





**Returns:** [Connection](connection.md)





___

<a id="hasconnection"></a>

###  hasConnection

► **hasConnection**(name: *`string`*): `boolean`



*Defined in [utils/ConnectionHelper.ts:52](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/utils/ConnectionHelper.ts#L52)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| name | `string`   |  - |





**Returns:** `boolean`





___

<a id="validatedatabasename"></a>

### «Private» validateDatabaseName

► **validateDatabaseName**(name: *`string`*): `boolean`



*Defined in [utils/ConnectionHelper.ts:72](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/utils/ConnectionHelper.ts#L72)*



Validates the database name
*__method__*: MongoPortable#_validateDatabaseName



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| name | `string`   |  - |





**Returns:** `boolean`
"true" if the name is valid






___


