[Mongo Portable](../README.md) > [SelectorMatcher](../classes/selectormatcher.md)



# Class: SelectorMatcher

## Index

### Constructors

* [constructor](selectormatcher.md#constructor)


### Properties

* [clauses](selectormatcher.md#clauses)
* [logger](selectormatcher.md#logger)


### Methods

* [test](selectormatcher.md#test)
* [all](selectormatcher.md#all)
* [cmp](selectormatcher.md#cmp)
* [equal](selectormatcher.md#equal)
* [in](selectormatcher.md#in)
* [matches](selectormatcher.md#matches)
* [matches_plus](selectormatcher.md#matches_plus)



---
## Constructors
<a id="constructor"></a>


### ⊕ **new SelectorMatcher**(selector: *`any`*): [SelectorMatcher](selectormatcher.md)


*Defined in [selector/SelectorMatcher.ts:7](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/selector/SelectorMatcher.ts#L7)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| selector | `any`   |  - |





**Returns:** [SelectorMatcher](selectormatcher.md)

---


## Properties
<a id="clauses"></a>

###  clauses

**●  clauses**:  *`any`* 

*Defined in [selector/SelectorMatcher.ts:7](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/selector/SelectorMatcher.ts#L7)*





___

<a id="logger"></a>

### «Protected» logger

**●  logger**:  *`JSWLogger`* 

*Defined in [selector/SelectorMatcher.ts:5](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/selector/SelectorMatcher.ts#L5)*





___


## Methods
<a id="test"></a>

###  test

► **test**(document: *`any`*): `boolean`



*Defined in [selector/SelectorMatcher.ts:15](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/selector/SelectorMatcher.ts#L15)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| document | `any`   |  - |





**Returns:** `boolean`





___

<a id="all"></a>

### «Static» all

► **all**(array: *`any`*, value: *`any`*): `boolean`



*Defined in [selector/SelectorMatcher.ts:69](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/selector/SelectorMatcher.ts#L69)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| array | `any`   |  - |
| value | `any`   |  - |





**Returns:** `boolean`





___

<a id="cmp"></a>

### «Static» cmp

► **cmp**(a: *`any`*, b: *`any`*): `any`



*Defined in [selector/SelectorMatcher.ts:226](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/selector/SelectorMatcher.ts#L226)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| a | `any`   |  - |
| b | `any`   |  - |





**Returns:** `any`





___

<a id="equal"></a>

### «Static» equal

► **equal**(array: *`any`*, qval: *`any`*): `boolean`



*Defined in [selector/SelectorMatcher.ts:125](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/selector/SelectorMatcher.ts#L125)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| array | `any`   |  - |
| qval | `any`   |  - |





**Returns:** `boolean`





___

<a id="in"></a>

### «Static» in

► **in**(array: *`any`*, value: *`any`*): `boolean`



*Defined in [selector/SelectorMatcher.ts:102](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/selector/SelectorMatcher.ts#L102)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| array | `any`   |  - |
| value | `any`   |  - |





**Returns:** `boolean`





___

<a id="matches"></a>

### «Static» matches

► **matches**(value: *`any`*, func: *`any`*): `any`



*Defined in [selector/SelectorMatcher.ts:192](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/selector/SelectorMatcher.ts#L192)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| value | `any`   |  - |
| func | `any`   |  - |





**Returns:** `any`





___

<a id="matches_plus"></a>

### «Static» matches_plus

► **matches_plus**(value: *`any`*, func: *`any`*): `any`



*Defined in [selector/SelectorMatcher.ts:209](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/selector/SelectorMatcher.ts#L209)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| value | `any`   |  - |
| func | `any`   |  - |





**Returns:** `any`





___


