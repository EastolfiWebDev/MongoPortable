[Mongo Portable](../README.md) > [IAbstractStore](../interfaces/iabstractstore.md)



# Interface: IAbstractStore

## Implemented by

* [BaseStore](../classes/basestore.md)


## Methods
<a id="all"></a>

###  all

► **all**(event: *`any`*): `any`⎮`Promise`.<`any`>



*Defined in [store/IAbstractStore.ts:10](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/store/IAbstractStore.ts#L10)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| event | `any`   |  - |





**Returns:** `any`⎮`Promise`.<`any`>





___

<a id="backup"></a>

###  backup

► **backup**(event: *`any`*): `any`⎮`Promise`.<`any`>



*Defined in [store/IAbstractStore.ts:22](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/store/IAbstractStore.ts#L22)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| event | `any`   |  - |





**Returns:** `any`⎮`Promise`.<`any`>





___

<a id="backups"></a>

###  backups

► **backups**(event: *`any`*): `any`⎮`Promise`.<`any`>



*Defined in [store/IAbstractStore.ts:24](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/store/IAbstractStore.ts#L24)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| event | `any`   |  - |





**Returns:** `any`⎮`Promise`.<`any`>





___

<a id="createcollection"></a>

###  createCollection

► **createCollection**(event: *`any`*): `boolean`⎮`Promise`.<`boolean`>



*Defined in [store/IAbstractStore.ts:4](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/store/IAbstractStore.ts#L4)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| event | `any`   |  - |





**Returns:** `boolean`⎮`Promise`.<`boolean`>





___

<a id="ensureindex"></a>

###  ensureIndex

► **ensureIndex**(event: *`any`*): `any`⎮`Promise`.<`any`>



*Defined in [store/IAbstractStore.ts:20](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/store/IAbstractStore.ts#L20)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| event | `any`   |  - |





**Returns:** `any`⎮`Promise`.<`any`>





___

<a id="find"></a>

###  find

► **find**(event: *`any`*): `any`⎮`Promise`.<`any`>



*Defined in [store/IAbstractStore.ts:12](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/store/IAbstractStore.ts#L12)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| event | `any`   |  - |





**Returns:** `any`⎮`Promise`.<`any`>





___

<a id="findone"></a>

###  findOne

► **findOne**(event: *`any`*): `any`⎮`Promise`.<`any`>



*Defined in [store/IAbstractStore.ts:14](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/store/IAbstractStore.ts#L14)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| event | `any`   |  - |





**Returns:** `any`⎮`Promise`.<`any`>





___

<a id="insert"></a>

###  insert

► **insert**(event: *`any`*): `boolean`⎮`Promise`.<`boolean`>



*Defined in [store/IAbstractStore.ts:6](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/store/IAbstractStore.ts#L6)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| event | `any`   |  - |





**Returns:** `boolean`⎮`Promise`.<`boolean`>





___

<a id="remove"></a>

###  remove

► **remove**(event: *`any`*): `boolean`⎮`Promise`.<`boolean`>



*Defined in [store/IAbstractStore.ts:18](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/store/IAbstractStore.ts#L18)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| event | `any`   |  - |





**Returns:** `boolean`⎮`Promise`.<`boolean`>





___

<a id="removebackup"></a>

###  removeBackup

► **removeBackup**(event: *`any`*): `any`⎮`Promise`.<`any`>



*Defined in [store/IAbstractStore.ts:26](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/store/IAbstractStore.ts#L26)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| event | `any`   |  - |





**Returns:** `any`⎮`Promise`.<`any`>





___

<a id="restore"></a>

###  restore

► **restore**(event: *`any`*): `any`⎮`Promise`.<`any`>



*Defined in [store/IAbstractStore.ts:28](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/store/IAbstractStore.ts#L28)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| event | `any`   |  - |





**Returns:** `any`⎮`Promise`.<`any`>





___

<a id="save"></a>

###  save

► **save**(event: *`any`*): `any`⎮`Promise`.<`any`>



*Defined in [store/IAbstractStore.ts:8](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/store/IAbstractStore.ts#L8)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| event | `any`   |  - |





**Returns:** `any`⎮`Promise`.<`any`>





___

<a id="update"></a>

###  update

► **update**(event: *`any`*): `boolean`⎮`Promise`.<`boolean`>



*Defined in [store/IAbstractStore.ts:16](https://github.com/EastolfiWebDev/MongoPortable/blob/b563243/src/store/IAbstractStore.ts#L16)*



**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| event | `any`   |  - |





**Returns:** `boolean`⎮`Promise`.<`boolean`>





___


