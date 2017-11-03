[Mongo Portable](../README.md) > [EventEmitter](../classes/eventemitter.md)



# Class: EventEmitter

## Hierarchy

**EventEmitter**

↳  [MongoPortable](mongoportable.md)








## Index

### Constructors

* [constructor](eventemitter.md#constructor)


### Properties

* [logger](eventemitter.md#logger)


### Methods

* [emit](eventemitter.md#emit)


### Object literals

* [options](eventemitter.md#options)



---
## Constructors
<a id="constructor"></a>


### ⊕ **new EventEmitter**(options?: *`any`*): [EventEmitter](eventemitter.md)


*Defined in [emitter/EventEmitter.ts:9](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/emitter/EventEmitter.ts#L9)*



**Parameters:**

| Param | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| options | `any`  |  {} |   - |





**Returns:** [EventEmitter](eventemitter.md)

---


## Properties
<a id="logger"></a>

### «Protected» logger

**●  logger**:  *`JSWLogger`* 

*Defined in [emitter/EventEmitter.ts:6](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/emitter/EventEmitter.ts#L6)*





___


## Methods
<a id="emit"></a>

###  emit

► **emit**(event: *`string`*, args: *`Object`*, stores?: *`Array`.<`Object`⎮`Function`>*): `Promise`.<`void`>



*Defined in [emitter/EventEmitter.ts:18](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/emitter/EventEmitter.ts#L18)*



**Parameters:**

| Param | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| event | `string`  | - |   - |
| args | `Object`  | - |   - |
| stores | `Array`.<`Object`⎮`Function`>  |  [] |   - |





**Returns:** `Promise`.<`void`>





___


<a id="options"></a>

## Object literal: options


<a id="options.log"></a>

###  log

**●  log**:  *`object`* 

*Defined in [emitter/EventEmitter.ts:8](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/emitter/EventEmitter.ts#L8)*


#### Type declaration





___


