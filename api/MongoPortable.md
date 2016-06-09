<a name="MongoPortable"></a>

## MongoPortable
Portable database with persistence and MongoDB-like API

**Kind**: global class  
**Since**: 0.0.1  

* [MongoPortable](#MongoPortable)
    * [new MongoPortable(databaseName)](#new_MongoPortable_new)
    * _instance_
        * [.use(name, fn)](#MongoPortable+use)
        * [.addStore(store)](#MongoPortable+addStore) ⇒ <code>[MongoPortable](#MongoPortable)</code>
        * [.collectionsInfo([collectionName], [callback])](#MongoPortable+collectionsInfo) ⇒ <code>Array</code>
        * [.fetchCollections()](#MongoPortable+fetchCollections)
        * [.collections([options], [callback])](#MongoPortable+collections) ⇒ <code>Array</code>
        * [.collectionNames([options], [callback])](#MongoPortable+collectionNames) ⇒ <code>Array</code>
        * [.collection(collectionName, [options], [callback])](#MongoPortable+collection) ⇒ <code>Collection</code>
        * [.createCollection()](#MongoPortable+createCollection)
        * [.dropCollection(collectionName, [callback])](#MongoPortable+dropCollection) ⇒ <code>Boolean</code>
        * [.renameCollection(fromCollection, toCollection, [callback])](#MongoPortable+renameCollection) ⇒ <code>Boolean</code> &#124; <code>Collection</code>
        * [.createIndex(collectionName, fieldOrSpec, [options], [callback])](#MongoPortable+createIndex)
        * [.ensureIndex(collectionName, fieldOrSpec, [options], [callback])](#MongoPortable+ensureIndex)
        * [.dropIndex(collectionName, indexName, [callback])](#MongoPortable+dropIndex)
        * [.reIndex(collectionName, [callback])](#MongoPortable+reIndex)
        * [.indexInformation(collectionName, [options], [full], [readPreference], [callback])](#MongoPortable+indexInformation)
        * [.dropDatabase([callback])](#MongoPortable+dropDatabase) ⇒ <code>Boolean</code>
    * _static_
        * [.connections](#MongoPortable.connections)
        * [.version](#MongoPortable.version)
    * _inner_
        * ["createCollection"](#MongoPortable..event_createCollection)
        * ["createCollection"](#MongoPortable..event_createCollection)

<a name="new_MongoPortable_new"></a>

### new MongoPortable(databaseName)
MongoPortable


| Param | Type | Description |
| --- | --- | --- |
| databaseName | <code>string</code> | Name of the database. |

<a name="MongoPortable+use"></a>

### mongoPortable.use(name, fn)
Middleware functions

**Kind**: instance method of <code>[MongoPortable](#MongoPortable)</code>  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>String</code> | Name of the middleware:      <ul>          <li>"store": Add a custom store</li>      </ul> |
| fn | <code>Object</code> &#124; <code>function</code> | Function to implement the middleware |

<a name="MongoPortable+addStore"></a>

### mongoPortable.addStore(store) ⇒ <code>[MongoPortable](#MongoPortable)</code>
Adds a custom stores for remote and local persistence

**Kind**: instance method of <code>[MongoPortable](#MongoPortable)</code>  
**Returns**: <code>[MongoPortable](#MongoPortable)</code> - this - The current Instance  

| Param | Type | Description |
| --- | --- | --- |
| store | <code>Object</code> &#124; <code>function</code> | The custom store |

<a name="MongoPortable+collectionsInfo"></a>

### mongoPortable.collectionsInfo([collectionName], [callback]) ⇒ <code>Array</code>
Returns a cursor to all the collection information.

**Kind**: instance method of <code>[MongoPortable](#MongoPortable)</code>  
**Todo**

- [ ] Implement


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [collectionName] | <code>String</code> | <code></code> | the collection name we wish to retrieve the information from. |
| [callback] | <code>function</code> | <code></code> | Callback function to be called at the end with the results |

<a name="MongoPortable+fetchCollections"></a>

### mongoPortable.fetchCollections()
Alias for [collections](#MongoPortable+collections)

**Kind**: instance method of <code>[MongoPortable](#MongoPortable)</code>  
<a name="MongoPortable+collections"></a>

### mongoPortable.collections([options], [callback]) ⇒ <code>Array</code>
Get the list of all collection for the specified db

**Kind**: instance method of <code>[MongoPortable](#MongoPortable)</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [options] | <code>Object</code> |  | Additional options |
| [options.namesOnly] | <code>Boolean</code> | <code>false</code> | Return only the collections names |
| [options.collectionName] | <code>String</code> &#124; <code>Array</code> | <code></code> | The collection name we wish to filter by |
| [callback] | <code>function</code> | <code></code> | Callback function to be called at the end with the results |

<a name="MongoPortable+collectionNames"></a>

### mongoPortable.collectionNames([options], [callback]) ⇒ <code>Array</code>
Get the list of all collection names for the specified db, 
 by calling MongoPortable#collections with [options.namesOnly = true]

**Kind**: instance method of <code>[MongoPortable](#MongoPortable)</code>  
**Returns**: <code>Array</code> - [collections](#MongoPortable+collections)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [options] | <code>Object</code> |  | Additional options. |
| [options.collectionName] | <code>String</code> &#124; <code>Array</code> | <code></code> | The collection name we wish to filter by. |
| [callback] | <code>function</code> | <code></code> | Callback function to be called at the end with the results |

<a name="MongoPortable+collection"></a>

### mongoPortable.collection(collectionName, [options], [callback]) ⇒ <code>Collection</code>
Creates a collection on a server pre-allocating space, need to create f.ex capped collections.

**Kind**: instance method of <code>[MongoPortable](#MongoPortable)</code>  
**Emits**: <code>{@link MongoStore#event:createCollection}</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| collectionName | <code>String</code> |  | the collection name we wish to access. |
| [options] | <code>Object</code> |  | returns option results. |
| [options.safe] | <code>Boolean</code> &#124; <code>Object</code> | <code>false</code> | Executes with a getLastError command returning the results of the command on MongoMonglo:      <ul>          <li>true</li>          <li>false</li>          <li>{ w: {Number}, wtimeout: {Number}}</li>          <li>{ fsync: true }</li>      </ul> |
| [options.serializeFunctions] | <code>Boolean</code> | <code>false</code> | Serialize functions on the document. |
| [options.raw] | <code>Boolean</code> | <code>false</code> | Perform all operations using raw bson objects. |
| [options.pkFactory] | <code>Object</code> | <code></code> | Object overriding the basic ObjectId primary key generation. |
| [options.capped] | <code>Boolean</code> | <code>false</code> | Create a capped collection. |
| [options.size] | <code>Number</code> | <code>4096</code> | The size of the capped collection in bytes. |
| [options.max] | <code>Number</code> | <code>500</code> | The maximum number of documents in the capped collection. |
| [options.autoIndexId] | <code>Boolean</code> | <code>false</code> | Create an index on the _id field of the document, not created automatically on capped collections. |
| [options.readPreference] | <code>String</code> | <code>ReadPreference.PRIMARY</code> | Te prefered read preference:      <ul>          <li>ReadPreference.PRIMARY</li>          <li>ReadPreference.PRIMARY_PREFERRED</li>          <li>ReadPreference.SECONDARY</li>          <li>ReadPreference.SECONDARY_PREFERRED</li>          <li>ReadPreference.NEAREST</li>      </ul> |
| [callback] | <code>function</code> | <code></code> | Callback function to be called at the end with the results |

<a name="MongoPortable+createCollection"></a>

### mongoPortable.createCollection()
Alias for [collection](#MongoPortable+collection)

**Kind**: instance method of <code>[MongoPortable](#MongoPortable)</code>  
<a name="MongoPortable+dropCollection"></a>

### mongoPortable.dropCollection(collectionName, [callback]) ⇒ <code>Boolean</code>
Drop a collection from the database, removing it permanently. New accesses will create a new collection.

**Kind**: instance method of <code>[MongoPortable](#MongoPortable)</code>  
**Returns**: <code>Boolean</code> - "true" if dropped successfully  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| collectionName | <code>String</code> |  | The name of the collection we wish to drop. |
| [callback] | <code>function</code> | <code></code> | Callback function to be called at the end with the results |

<a name="MongoPortable+renameCollection"></a>

### mongoPortable.renameCollection(fromCollection, toCollection, [callback]) ⇒ <code>Boolean</code> &#124; <code>Collection</code>
Rename a collection.

**Kind**: instance method of <code>[MongoPortable](#MongoPortable)</code>  
**Returns**: <code>Boolean</code> &#124; <code>Collection</code> - The collection if renamed successfully or false if not  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| fromCollection | <code>String</code> |  | The name of the current collection we wish to rename. |
| toCollection | <code>String</code> |  | The new name of the collection. |
| [callback] | <code>function</code> | <code></code> | Callback function to be called at the end with the results |

<a name="MongoPortable+createIndex"></a>

### mongoPortable.createIndex(collectionName, fieldOrSpec, [options], [callback])
Creates an index on the collection.

**Kind**: instance method of <code>[MongoPortable](#MongoPortable)</code>  
**Todo**

- [ ] Implement


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| collectionName | <code>String</code> |  | Name of the collection to create the index on. |
| fieldOrSpec | <code>Object</code> |  | FieldOrSpec that defines the index. |
| [options] | <code>Object</code> |  | Additional options during update. |
| [options.safe] | <code>Boolean</code> &#124; <code>Object</code> | <code>false</code> | Executes with a getLastError command returning the results of the command on MongoMonglo:      <ul>          <li>true</li>          <li>false</li>          <li>{ w: {Number}, wtimeout: {Number}}</li>          <li>{ fsync: true }</li>      </ul> |
| [options.unique] | <code>Boolean</code> | <code>false</code> | Creates an unique index |
| [options.sparse] | <code>Boolean</code> | <code>false</code> | Creates a sparse index |
| [options.background] | <code>Boolean</code> | <code>false</code> | Creates the index in the background, yielding whenever possible |
| [options.dropDups] | <code>Boolean</code> | <code>false</code> | A unique index cannot be created on a key that has pre-existing duplicate values. If you would like to create the index anyway, keeping the first document the database indexes and deleting all subsequent documents that have duplicate value |
| [options.min] | <code>Number</code> | <code></code> | For geospatial indexes set the lower bound for the co-ordinates |
| [options.max] | <code>Number</code> | <code></code> | For geospatial indexes set the high bound for the co-ordinates |
| [options.v] | <code>Number</code> | <code></code> | Specify the format version of the indexes |
| [options.expireAfterSeconds] | <code>Number</code> | <code></code> | Allows you to expire data on indexes applied to a data (MongoDB 2.2 or higher) |
| [options.name] | <code>String</code> | <code></code> | Override the autogenerated index name (useful if the resulting name is larger than 128 bytes) |
| [callback] | <code>function</code> | <code></code> | Callback function to be called at the end with the results |

<a name="MongoPortable+ensureIndex"></a>

### mongoPortable.ensureIndex(collectionName, fieldOrSpec, [options], [callback])
Ensures that an index exists, if it does not it creates it

**Kind**: instance method of <code>[MongoPortable](#MongoPortable)</code>  
**Todo**

- [ ] Implement


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| collectionName | <code>String</code> |  | Name of the collection to create the index on. |
| fieldOrSpec | <code>Object</code> |  | FieldOrSpec that defines the index. |
| [options] | <code>Object</code> |  | Additional options during update. |
| [options.safe] | <code>Boolean</code> &#124; <code>Object</code> | <code>false</code> | Executes with a getLastError command returning the results of the command on MongoMonglo:      <ul>          <li>true</li>          <li>false</li>          <li>{ w: {Number}, wtimeout: {Number}}</li>          <li>{ fsync: true }</li>      </ul> |
| [options.unique] | <code>Boolean</code> | <code>false</code> | Creates an unique index |
| [options.sparse] | <code>Boolean</code> | <code>false</code> | Creates a sparse index |
| [options.background] | <code>Boolean</code> | <code>false</code> | Creates the index in the background, yielding whenever possible |
| [options.dropDups] | <code>Boolean</code> | <code>false</code> | A unique index cannot be created on a key that has pre-existing duplicate values. If you would like to create the index anyway, keeping the first document the database indexes and deleting all subsequent documents that have duplicate value |
| [options.min] | <code>Number</code> |  | For geospatial indexes set the lower bound for the co-ordinates |
| [options.max] | <code>Number</code> |  | For geospatial indexes set the high bound for the co-ordinates |
| [options.v] | <code>Number</code> |  | Specify the format version of the indexes |
| [options.expireAfterSeconds] | <code>Number</code> |  | Allows you to expire data on indexes applied to a data (MongoDB 2.2 or higher) |
| [options.name] | <code>String</code> |  | Override the autogenerated index name (useful if the resulting name is larger than 128 bytes) |
| [callback] | <code>function</code> | <code></code> | Callback function to be called at the end with the results |

<a name="MongoPortable+dropIndex"></a>

### mongoPortable.dropIndex(collectionName, indexName, [callback])
Drop an index on a collection.

**Kind**: instance method of <code>[MongoPortable](#MongoPortable)</code>  
**Todo**

- [ ] Implement


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| collectionName | <code>String</code> |  | The name of the collection where the command will drop an index. |
| indexName | <code>String</code> |  | Name of the index to drop. |
| [callback] | <code>function</code> | <code></code> | Callback function to be called at the end with the results |

<a name="MongoPortable+reIndex"></a>

### mongoPortable.reIndex(collectionName, [callback])
Reindex all indexes on the collection
Warning: "reIndex" is a blocking operation (indexes are rebuilt in the foreground) and will be slow for large collections.

**Kind**: instance method of <code>[MongoPortable](#MongoPortable)</code>  
**Todo**

- [ ] Implement


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| collectionName | <code>String</code> |  | The name of the collection to reindex |
| [callback] | <code>function</code> | <code></code> | Callback function to be called at the end with the results |

<a name="MongoPortable+indexInformation"></a>

### mongoPortable.indexInformation(collectionName, [options], [full], [readPreference], [callback])
Retrieves this collections index info.

**Kind**: instance method of <code>[MongoPortable](#MongoPortable)</code>  
**Todo**

- [ ] Implement


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| collectionName | <code>String</code> |  | The name of the collection. |
| [options] | <code>Object</code> |  | Additional options during update. |
| [full] | <code>Boolean</code> | <code>false</code> | Returns the full raw index information. |
| [readPreference] | <code>String</code> |  | The preferred read preference ((Server.PRIMARY, Server.PRIMARY_PREFERRED, Server.SECONDARY, Server.SECONDARY_PREFERRED, Server.NEAREST). |
| [callback] | <code>function</code> | <code></code> | Callback function to be called at the end with the results |

<a name="MongoPortable+dropDatabase"></a>

### mongoPortable.dropDatabase([callback]) ⇒ <code>Boolean</code>
Drop the whole database.

**Kind**: instance method of <code>[MongoPortable](#MongoPortable)</code>  
**Returns**: <code>Boolean</code> - "true" if dropped successfully  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [callback] | <code>function</code> | <code></code> | Callback function to be called at the end with the results |

<a name="MongoPortable.connections"></a>

### MongoPortable.connections
Connection Pool

**Kind**: static property of <code>[MongoPortable](#MongoPortable)</code>  
<a name="MongoPortable.version"></a>

### MongoPortable.version
Version Number

**Kind**: static property of <code>[MongoPortable](#MongoPortable)</code>  
<a name="MongoPortable..event_createCollection"></a>

### "createCollection"
"createCollection" event.

**Kind**: event emitted by <code>[MongoPortable](#MongoPortable)</code>  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| connection | <code>Object</code> | Information about the current database connection |
| collection | <code>Object</code> | Information about the collection created |

<a name="MongoPortable..event_createCollection"></a>

### "createCollection"
"createCollection" event.

**Kind**: event emitted by <code>[MongoPortable](#MongoPortable)</code>  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| connection | <code>Object</code> | Information about the current database connection |
| collection | <code>Object</code> | Information about the collection created |

