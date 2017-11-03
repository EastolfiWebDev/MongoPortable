[Mongo Portable](../README.md) > [Selector](../classes/selector.md)



# Class: Selector

## Index

### Constructors

* [constructor](selector.md#constructor)


### Properties

* [clauses](selector.md#clauses)
* [logger](selector.md#logger)
* [selector_compiled](selector.md#selector_compiled)
* [AGG_FIELD_SELECTOR](selector.md#agg_field_selector)
* [FIELD_SELECTOR](selector.md#field_selector)
* [MATCH_SELECTOR](selector.md#match_selector)
* [SORT_SELECTOR](selector.md#sort_selector)


### Methods

* [___buildDocumentSelector](selector.md#___builddocumentselector)
* [___buildKeypathSelector](selector.md#___buildkeypathselector)
* [___buildSelector](selector.md#___buildselector)
* [compile](selector.md#compile)
* [compileFields](selector.md#compilefields)
* [compileSort](selector.md#compilesort)
* [test](selector.md#test)
* [isSelectorCompiled](selector.md#isselectorcompiled)
* [matches](selector.md#matches)



---
## Constructors
<a id="constructor"></a>


### ⊕ **new Selector**(selector: *`any`*, type?: *`string`*): [Selector](selector.md)


*Defined in [selector/Selector.ts:25](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/selector/Selector.ts#L25)*



**Parameters:**

| Param | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| selector | `any`  | - |   - |
| type | `string`  |  Selector.MATCH_SELECTOR |   - |





**Returns:** [Selector](selector.md)

---


## Properties
<a id="clauses"></a>

###  clauses

**●  clauses**:  *`any`* 

*Defined in [selector/Selector.ts:25](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/selector/Selector.ts#L25)*





___

<a id="logger"></a>

### «Protected» logger

**●  logger**:  *`JSWLogger`* 

*Defined in [selector/Selector.ts:17](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/selector/Selector.ts#L17)*





___

<a id="selector_compiled"></a>

###  selector_compiled

**●  selector_compiled**:  *`any`* 

*Defined in [selector/Selector.ts:24](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/selector/Selector.ts#L24)*





___

<a id="agg_field_selector"></a>

### «Static» AGG_FIELD_SELECTOR

**●  AGG_FIELD_SELECTOR**:  *`string`*  = "project"

*Defined in [selector/Selector.ts:22](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/selector/Selector.ts#L22)*





___

<a id="field_selector"></a>

### «Static» FIELD_SELECTOR

**●  FIELD_SELECTOR**:  *`string`*  = "field"

*Defined in [selector/Selector.ts:21](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/selector/Selector.ts#L21)*





___

<a id="match_selector"></a>

### «Static» MATCH_SELECTOR

**●  MATCH_SELECTOR**:  *`string`*  = "match"

*Defined in [selector/Selector.ts:19](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/selector/Selector.ts#L19)*





___

<a id="sort_selector"></a>

### «Static» SORT_SELECTOR

**●  SORT_SELECTOR**:  *`string`*  = "sort"

*Defined in [selector/Selector.ts:20](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/selector/Selector.ts#L20)*





___


## Methods
<a id="___builddocumentselector"></a>

### «Private» ___buildDocumentSelector

► **___buildDocumentSelector**(key: *`any`*, value: *`any`*): [Clause](clause.md)



*Defined in [selector/Selector.ts:67](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/selector/Selector.ts#L67)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| key | `any`   |  - |
| value | `any`   |  - |





**Returns:** [Clause](clause.md)





___

<a id="___buildkeypathselector"></a>

### «Private» ___buildKeypathSelector

► **___buildKeypathSelector**(keypath: *`any`*, value: *`any`*): [Clause](clause.md)



*Defined in [selector/Selector.ts:99](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/selector/Selector.ts#L99)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| keypath | `any`   |  - |
| value | `any`   |  - |





**Returns:** [Clause](clause.md)





___

<a id="___buildselector"></a>

### «Private» ___buildSelector

► **___buildSelector**(selector: *`any`*): `Array`.<`any`>



*Defined in [selector/Selector.ts:45](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/selector/Selector.ts#L45)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| selector | `any`   |  - |





**Returns:** `Array`.<`any`>





___

<a id="compile"></a>

###  compile

► **compile**(selector: *`any`*): [SelectorMatcher](selectormatcher.md)



*Defined in [selector/Selector.ts:194](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/selector/Selector.ts#L194)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| selector | `any`   |  - |





**Returns:** [SelectorMatcher](selectormatcher.md)





___

<a id="compilefields"></a>

###  compileFields

► **compileFields**(spec: *`any`*, aggregation: *`any`*): `any`



*Defined in [selector/Selector.ts:369](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/selector/Selector.ts#L369)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| spec | `any`   |  - |
| aggregation | `any`   |  - |





**Returns:** `any`





___

<a id="compilesort"></a>

###  compileSort

► **compileSort**(spec: *`any`*): `any`



*Defined in [selector/Selector.ts:246](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/selector/Selector.ts#L246)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| spec | `any`   |  - |





**Returns:** `any`





___

<a id="test"></a>

###  test

► **test**(doc: *`any`*): `any`



*Defined in [selector/Selector.ts:190](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/selector/Selector.ts#L190)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| doc | `any`   |  - |





**Returns:** `any`





___

<a id="isselectorcompiled"></a>

### «Static» isSelectorCompiled

► **isSelectorCompiled**(selector: *`any`*): `boolean`



*Defined in [selector/Selector.ts:460](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/selector/Selector.ts#L460)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| selector | `any`   |  - |





**Returns:** `boolean`





___

<a id="matches"></a>

### «Static» matches

► **matches**(selector: *`any`*, doc: *`any`*): `any`



*Defined in [selector/Selector.ts:471](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/selector/Selector.ts#L471)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| selector | `any`   |  - |
| doc | `any`   |  - |





**Returns:** `any`





___


