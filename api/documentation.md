## Classes

<dl>
<dt><a href="#MongoPortable">MongoPortable</a></dt>
<dd><p>Portable database with persistence and MongoDB-like API</p>
</dd>
<dt><a href="#Collection">Collection</a></dt>
<dd><p>Collection class that maps a MongoDB-like collection</p>
</dd>
<dt><a href="#Cursor">Cursor</a></dt>
<dd><p>Cursor class that maps a MongoDB-like cursor</p>
</dd>
</dl>

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
        * [.collection(collectionName, [options], [callback])](#MongoPortable+collection) ⇒ <code>[Collection](#Collection)</code>
        * [.createCollection()](#MongoPortable+createCollection)
        * [.dropCollection(collectionName, [callback])](#MongoPortable+dropCollection) ⇒ <code>Boolean</code>
        * [.renameCollection(fromCollection, toCollection, [callback])](#MongoPortable+renameCollection) ⇒ <code>Boolean</code> &#124; <code>[Collection](#Collection)</code>
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
        * ["insert" (collection, doc)](#MongoPortable..event_insert)
        * ["find"](#MongoPortable..event_find)
        * ["findOne"](#MongoPortable..event_findOne)
        * ["update"](#MongoPortable..event_update)
        * ["remove"](#MongoPortable..event_remove)

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

### mongoPortable.collection(collectionName, [options], [callback]) ⇒ <code>[Collection](#Collection)</code>
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

### mongoPortable.renameCollection(fromCollection, toCollection, [callback]) ⇒ <code>Boolean</code> &#124; <code>[Collection](#Collection)</code>
Rename a collection.

**Kind**: instance method of <code>[MongoPortable](#MongoPortable)</code>  
**Returns**: <code>Boolean</code> &#124; <code>[Collection](#Collection)</code> - The collection if renamed successfully or false if not  

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

<a name="MongoPortable..event_insert"></a>

### "insert" (collection, doc)
"insert" event.

**Kind**: event emitted by <code>[MongoPortable](#MongoPortable)</code>  

| Param | Type | Description |
| --- | --- | --- |
| collection | <code>Object</code> | Information about the collection |
| doc | <code>Object</code> | Information about the document inserted |

<a name="MongoPortable..event_find"></a>

### "find"
"find" event.

**Kind**: event emitted by <code>[MongoPortable](#MongoPortable)</code>  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| collection | <code>Object</code> | Information about the collection |
| selector | <code>Object</code> | The selection of the query |
| fields | <code>Object</code> | The fields showed in the query |

<a name="MongoPortable..event_findOne"></a>

### "findOne"
"findOne" event.

**Kind**: event emitted by <code>[MongoPortable](#MongoPortable)</code>  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| collection | <code>Object</code> | Information about the collection |
| selector | <code>Object</code> | The selection of the query |
| fields | <code>Object</code> | The fields showed in the query |

<a name="MongoPortable..event_update"></a>

### "update"
"update" event.

**Kind**: event emitted by <code>[MongoPortable](#MongoPortable)</code>  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| collection | <code>Object</code> | Information about the collection |
| selector | <code>Object</code> | The selection of the query |
| modifier | <code>Object</code> | The modifier used in the query |
| docs | <code>Object</code> | The updated/inserted documents information |

<a name="MongoPortable..event_remove"></a>

### "remove"
"remove" event.

**Kind**: event emitted by <code>[MongoPortable](#MongoPortable)</code>  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| collection | <code>Object</code> | Information about the collection |
| selector | <code>Object</code> | The selection of the query |
| docs | <code>Object</code> | The deleted documents information |

<a name="Collection"></a>

## Collection
Collection class that maps a MongoDB-like collection

**Kind**: global class  
**Since**: 0.0.1  

* [Collection](#Collection)
    * [new Collection(db, collectionName, [options])](#new_Collection_new)
    * [.insert(doc, [options], [callback])](#Collection+insert) ⇒ <code>Object</code> &#124; <code>[Collection](#Collection)</code>
    * [.find([selection], [fields], [options], [callback])](#Collection+find) ⇒ <code>Array</code> &#124; <code>[Cursor](#Cursor)</code>
    * [.findOne([selection], [fields], [options], [callback])](#Collection+findOne) ⇒ <code>Object</code>
    * [.update([selection], [update], [options], [callback])](#Collection+update) ⇒ <code>Object</code>
    * [.remove([selection], [options], [callback])](#Collection+remove) ⇒ <code>Object</code>
    * [.delete()](#Collection+delete)
    * [.destroy()](#Collection+destroy)
    * [.drop([options], [callback])](#Collection+drop) ⇒ <code>Object</code>
    * [.save(doc, [callback])](#Collection+save) ⇒ <code>Object</code>

<a name="new_Collection_new"></a>

### new Collection(db, collectionName, [options])
Collection


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| db | <code>[MongoPortable](#MongoPortable)</code> |  | Additional options |
| collectionName | <code>String</code> |  | The name of the collection |
| [options] | <code>Object</code> |  | Database object |
| [options.pkFactory] | <code>Object</code> | <code></code> | Object overriding the basic "ObjectId" primary key generation. |

<a name="Collection+insert"></a>

### collection.insert(doc, [options], [callback]) ⇒ <code>Object</code> &#124; <code>[Collection](#Collection)</code>
Inserts a document into the collection

**Kind**: instance method of <code>[Collection](#Collection)</code>  
**Returns**: <code>Object</code> &#124; <code>[Collection](#Collection)</code> - If "options.chain" set to "true" returns this instance, otherwise returns the inserted document  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| doc | <code>Object</code> |  | Document to be inserted |
| [options] | <code>Object</code> |  | Additional options |
| [options.chain] | <code>Boolean</code> | <code>false</code> | If set to "true" returns this instance, so it can be chained with other methods |
| [callback] | <code>function</code> | <code></code> | Callback function to be called at the end with the results |

<a name="Collection+find"></a>

### collection.find([selection], [fields], [options], [callback]) ⇒ <code>Array</code> &#124; <code>[Cursor](#Cursor)</code>
Finds all matching documents

**Kind**: instance method of <code>[Collection](#Collection)</code>  
**Returns**: <code>Array</code> &#124; <code>[Cursor](#Cursor)</code> - If "options.forceFetch" set to true returns the array of documents, otherwise returns a cursor  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [selection] | <code>Object</code> &#124; <code>Array</code> &#124; <code>String</code> | <code>{}</code> | The selection for matching documents |
| [fields] | <code>Object</code> &#124; <code>Array</code> &#124; <code>String</code> | <code>{}</code> | The fields of the document to show |
| [options] | <code>Object</code> |  | Additional options |
| [options.skip] | <code>Number</code> |  | Number of documents to be skipped |
| [options.limit] | <code>Number</code> |  | Max number of documents to display |
| [options.fields] | <code>Object</code> &#124; <code>Array</code> &#124; <code>String</code> |  | Same as "fields" parameter (if both passed, "options.fields" will be ignored) |
| [options.forceFetch] | <code>Boolean</code> | <code>false</code> | If set to'"true" returns't"e;array of documents already fetched |
| [callback] | <code>function</code> | <code></code> | Callback function to be called at the end with the results |

<a name="Collection+findOne"></a>

### collection.findOne([selection], [fields], [options], [callback]) ⇒ <code>Object</code>
Finds the first matching document

**Kind**: instance method of <code>[Collection](#Collection)</code>  
**Returns**: <code>Object</code> - Returns the first matching document of the collection  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [selection] | <code>Object</code> &#124; <code>Array</code> &#124; <code>String</code> | <code>{}</code> | The selection for matching documents |
| [fields] | <code>Object</code> &#124; <code>Array</code> &#124; <code>String</code> | <code>{}</code> | The fields of the document to show |
| [options] | <code>Object</code> |  | Additional options |
| [options.skip] | <code>Number</code> |  | Number of documents to be skipped |
| [options.limit] | <code>Number</code> |  | Max number of documents to display |
| [options.fields] | <code>Object</code> &#124; <code>Array</code> &#124; <code>String</code> |  | Same as "fields" parameter (if both passed, "options.fields" will be ignored) |
| [callback] | <code>function</code> | <code></code> | Callback function to be called at the end with the results |

<a name="Collection+update"></a>

### collection.update([selection], [update], [options], [callback]) ⇒ <code>Object</code>
Updates one or many documents

**Kind**: instance method of <code>[Collection](#Collection)</code>  
**Returns**: <code>Object</code> - Object with the update/insert (if upsert=true) information  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [selection] | <code>Object</code> &#124; <code>Array</code> &#124; <code>String</code> | <code>{}</code> | The selection for matching documents |
| [update] | <code>Object</code> | <code>{}</code> | The update operation |
| [options] | <code>Object</code> |  | Additional options |
| [options.updateAsMongo] | <code>Number</code> | <code>true</code> | By default:       If the [update] object contains update operator modifiers, such as those using the "$set" modifier, then:          <ul>              <li>The [update] object must contain only update operator expressions</li>              <li>The Collection#update method updates only the corresponding fields in the document</li>          <ul>      If the [update] object contains only "field: value" expressions, then:          <ul>              <li>The Collection#update method replaces the matching document with the [update] object. The Collection#update method does not replace the "_id" value</li>              <li>Collection#update cannot update multiple documents</li>          <ul> |
| [options.override] | <code>Number</code> | <code>false</code> | Replaces the whole document (only apllies when [updateAsMongo=false]) |
| [options.upsert] | <code>Number</code> | <code>false</code> | Creates a new document when no document matches the query criteria |
| [options.multi] | <code>Number</code> | <code>false</code> | Updates multiple documents that meet the criteria |
| [options.writeConcern] | <code>Object</code> | <code></code> | An object expressing the write concern |
| [callback] | <code>function</code> | <code></code> | Callback function to be called at the end with the results |

<a name="Collection+remove"></a>

### collection.remove([selection], [options], [callback]) ⇒ <code>Object</code>
Removes one or many documents

**Kind**: instance method of <code>[Collection](#Collection)</code>  
**Returns**: <code>Object</code> - Object with the deleted documents  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [selection] | <code>Object</code> &#124; <code>Array</code> &#124; <code>String</code> | <code>{}</code> | The selection for matching documents |
| [options] | <code>Object</code> |  | Additional options |
| [options.justOne] | <code>Number</code> | <code>false</code> | Deletes the first occurrence of the selection |
| [options.writeConcern] | <code>Object</code> | <code></code> | An object expressing the write concern |
| [callback] | <code>function</code> | <code></code> | Callback function to be called at the end with the results |

<a name="Collection+delete"></a>

### collection.delete()
Alias for [remove](#Collection+remove)

**Kind**: instance method of <code>[Collection](#Collection)</code>  
<a name="Collection+destroy"></a>

### collection.destroy()
Alias for [remove](#Collection+remove)

**Kind**: instance method of <code>[Collection](#Collection)</code>  
<a name="Collection+drop"></a>

### collection.drop([options], [callback]) ⇒ <code>Object</code>
Drops a collection

**Kind**: instance method of <code>[Collection](#Collection)</code>  
**Returns**: <code>Object</code> - True when the collection is dropped  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [options] | <code>Object</code> |  | Additional options |
| [options.dropIndexes] | <code>Number</code> | <code>false</code> | True if we want to drop the indexes too |
| [options.writeConcern] | <code>Object</code> | <code></code> | An object expressing the write concern |
| [callback] | <code>function</code> | <code></code> | Callback function to be called at the end with the results |

<a name="Collection+save"></a>

### collection.save(doc, [callback]) ⇒ <code>Object</code>
Insert or update a document. If the document has an "_id" is an update (with upsert), if not is an insert.

**Kind**: instance method of <code>[Collection](#Collection)</code>  
**Returns**: <code>Object</code> - True when the collection is dropped  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| doc | <code>Object</code> |  | Document to be inserted/updated |
| [options.dropIndexes] | <code>Number</code> | <code>false</code> | True if we want to drop the indexes too |
| [options.writeConcern] | <code>Object</code> | <code></code> | An object expressing the write concern |
| [callback] | <code>function</code> | <code></code> | Callback function to be called at the end with the results |

<a name="Cursor"></a>

## Cursor
Cursor class that maps a MongoDB-like cursor

**Kind**: global class  
**Since**: 0.0.1  

* [Cursor](#Cursor)
    * [new Cursor(db, collection, [selection], [fields], [options])](#new_Cursor_new)
    * [.rewind()](#Cursor+rewind)
    * [.forEach([callback])](#Cursor+forEach)
    * [.map([callback])](#Cursor+map) ⇒ <code>Array</code>
    * [.hasNext()](#Cursor+hasNext) ⇒ <code>Boolean</code>
    * [.next()](#Cursor+next)
    * [.fetch()](#Cursor+fetch)
    * [.fetchAll()](#Cursor+fetchAll) ⇒ <code>Array</code>
    * [.fetchOne()](#Cursor+fetchOne) ⇒ <code>Object</code>
    * [.count()](#Cursor+count) ⇒ <code>Number</code>
    * [.sort(spec)](#Cursor+sort) ⇒ <code>[Cursor](#Cursor)</code>
    * [.skip(skip)](#Cursor+skip) ⇒ <code>[Cursor](#Cursor)</code>
    * [.limit(limit)](#Cursor+limit) ⇒ <code>[Cursor](#Cursor)</code>
    * [.batchSize()](#Cursor+batchSize)
    * [.close()](#Cursor+close)
    * [.comment()](#Cursor+comment)
    * [.explain()](#Cursor+explain)
    * [.hint()](#Cursor+hint)
    * [.itcount()](#Cursor+itcount)
    * [.maxScan()](#Cursor+maxScan)
    * [.maxTimeMS()](#Cursor+maxTimeMS)
    * [.max()](#Cursor+max)
    * [.min()](#Cursor+min)
    * [.noCursorTimeout()](#Cursor+noCursorTimeout)
    * [.objsLeftInBatch()](#Cursor+objsLeftInBatch)
    * [.pretty()](#Cursor+pretty)
    * [.readConcern()](#Cursor+readConcern)
    * [.readPref()](#Cursor+readPref)
    * [.returnKey()](#Cursor+returnKey)
    * [.showRecordId()](#Cursor+showRecordId)
    * [.size()](#Cursor+size)
    * [.snapshot()](#Cursor+snapshot)
    * [.tailable()](#Cursor+tailable)
    * [.toArray()](#Cursor+toArray)

<a name="new_Cursor_new"></a>

### new Cursor(db, collection, [selection], [fields], [options])
Cursor


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| db | <code>[MongoPortable](#MongoPortable)</code> |  | Additional options |
| collection | <code>[Collection](#Collection)</code> |  | The collection instance |
| [selection] | <code>Object</code> &#124; <code>Array</code> &#124; <code>String</code> | <code>{}</code> | The selection for matching documents |
| [fields] | <code>Object</code> &#124; <code>Array</code> &#124; <code>String</code> | <code>{}</code> | The fields of the document to show |
| [options] | <code>Object</code> |  | Database object |
| [options.pkFactory] | <code>Object</code> | <code></code> | Object overriding the basic "ObjectId" primary key generation. |

<a name="Cursor+rewind"></a>

### cursor.rewind()
Moves a cursor to the begining

**Kind**: instance method of <code>[Cursor](#Cursor)</code>  
<a name="Cursor+forEach"></a>

### cursor.forEach([callback])
Iterates over the cursor, calling a callback function

**Kind**: instance method of <code>[Cursor](#Cursor)</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [callback] | <code>function</code> | <code></code> | Callback function to be called for each document |

<a name="Cursor+map"></a>

### cursor.map([callback]) ⇒ <code>Array</code>
Iterates over the cursor, returning a new array with the documents affected by the callback function

**Kind**: instance method of <code>[Cursor](#Cursor)</code>  
**Returns**: <code>Array</code> - The documents after being affected with the callback function  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [callback] | <code>function</code> | <code></code> | Callback function to be called for each document |

<a name="Cursor+hasNext"></a>

### cursor.hasNext() ⇒ <code>Boolean</code>
Checks if the cursor has one document to be fetched

**Kind**: instance method of <code>[Cursor](#Cursor)</code>  
**Returns**: <code>Boolean</code> - True if we can fetch one more document  
<a name="Cursor+next"></a>

### cursor.next()
Alias for [fetchOne](#Cursor+fetchOne)

**Kind**: instance method of <code>[Cursor](#Cursor)</code>  
<a name="Cursor+fetch"></a>

### cursor.fetch()
Alias for [fetchAll](#Cursor+fetchAll)

**Kind**: instance method of <code>[Cursor](#Cursor)</code>  
<a name="Cursor+fetchAll"></a>

### cursor.fetchAll() ⇒ <code>Array</code>
Fetch all documents in the cursor

**Kind**: instance method of <code>[Cursor](#Cursor)</code>  
**Returns**: <code>Array</code> - All the documents contained in the cursor  
<a name="Cursor+fetchOne"></a>

### cursor.fetchOne() ⇒ <code>Object</code>
Retrieves the next document in the cursor

**Kind**: instance method of <code>[Cursor](#Cursor)</code>  
**Returns**: <code>Object</code> - The next document in the cursor  
<a name="Cursor+count"></a>

### cursor.count() ⇒ <code>Number</code>
Obtains the total of documents of the cursor

**Kind**: instance method of <code>[Cursor](#Cursor)</code>  
**Returns**: <code>Number</code> - The total of documents in the cursor  
<a name="Cursor+sort"></a>

### cursor.sort(spec) ⇒ <code>[Cursor](#Cursor)</code>
Applies a sorting on the cursor

**Kind**: instance method of <code>[Cursor](#Cursor)</code>  
**Returns**: <code>[Cursor](#Cursor)</code> - This instance so it can be chained with other methods  

| Param | Type | Description |
| --- | --- | --- |
| spec | <code>Object</code> &#124; <code>Array</code> &#124; <code>String</code> | The sorting specification |

<a name="Cursor+skip"></a>

### cursor.skip(skip) ⇒ <code>[Cursor](#Cursor)</code>
Set the number of document to skip when fetching the cursor

**Kind**: instance method of <code>[Cursor](#Cursor)</code>  
**Returns**: <code>[Cursor](#Cursor)</code> - This instance so it can be chained with other methods  

| Param | Type | Description |
| --- | --- | --- |
| skip | <code>Number</code> | The number of documents to skip |

<a name="Cursor+limit"></a>

### cursor.limit(limit) ⇒ <code>[Cursor](#Cursor)</code>
Set the max number of document to fetch

**Kind**: instance method of <code>[Cursor](#Cursor)</code>  
**Returns**: <code>[Cursor](#Cursor)</code> - This instance so it can be chained with other methods  

| Param | Type | Description |
| --- | --- | --- |
| limit | <code>Number</code> | The max number of documents |

<a name="Cursor+batchSize"></a>

### cursor.batchSize()
**Kind**: instance method of <code>[Cursor](#Cursor)</code>  
**Todo**

- [ ] Implement

<a name="Cursor+close"></a>

### cursor.close()
**Kind**: instance method of <code>[Cursor](#Cursor)</code>  
**Todo**

- [ ] Implement

<a name="Cursor+comment"></a>

### cursor.comment()
**Kind**: instance method of <code>[Cursor](#Cursor)</code>  
**Todo**

- [ ] Implement

<a name="Cursor+explain"></a>

### cursor.explain()
**Kind**: instance method of <code>[Cursor](#Cursor)</code>  
**Todo**

- [ ] Implement

<a name="Cursor+hint"></a>

### cursor.hint()
**Kind**: instance method of <code>[Cursor](#Cursor)</code>  
**Todo**

- [ ] Implement

<a name="Cursor+itcount"></a>

### cursor.itcount()
**Kind**: instance method of <code>[Cursor](#Cursor)</code>  
**Todo**

- [ ] Implement

<a name="Cursor+maxScan"></a>

### cursor.maxScan()
**Kind**: instance method of <code>[Cursor](#Cursor)</code>  
**Todo**

- [ ] Implement

<a name="Cursor+maxTimeMS"></a>

### cursor.maxTimeMS()
**Kind**: instance method of <code>[Cursor](#Cursor)</code>  
**Todo**

- [ ] Implement

<a name="Cursor+max"></a>

### cursor.max()
**Kind**: instance method of <code>[Cursor](#Cursor)</code>  
**Todo**

- [ ] Implement

<a name="Cursor+min"></a>

### cursor.min()
**Kind**: instance method of <code>[Cursor](#Cursor)</code>  
**Todo**

- [ ] Implement

<a name="Cursor+noCursorTimeout"></a>

### cursor.noCursorTimeout()
**Kind**: instance method of <code>[Cursor](#Cursor)</code>  
**Todo**

- [ ] Implement

<a name="Cursor+objsLeftInBatch"></a>

### cursor.objsLeftInBatch()
**Kind**: instance method of <code>[Cursor](#Cursor)</code>  
**Todo**

- [ ] Implement

<a name="Cursor+pretty"></a>

### cursor.pretty()
**Kind**: instance method of <code>[Cursor](#Cursor)</code>  
**Todo**

- [ ] Implement

<a name="Cursor+readConcern"></a>

### cursor.readConcern()
**Kind**: instance method of <code>[Cursor](#Cursor)</code>  
**Todo**

- [ ] Implement

<a name="Cursor+readPref"></a>

### cursor.readPref()
**Kind**: instance method of <code>[Cursor](#Cursor)</code>  
**Todo**

- [ ] Implement

<a name="Cursor+returnKey"></a>

### cursor.returnKey()
**Kind**: instance method of <code>[Cursor](#Cursor)</code>  
**Todo**

- [ ] Implement

<a name="Cursor+showRecordId"></a>

### cursor.showRecordId()
**Kind**: instance method of <code>[Cursor](#Cursor)</code>  
**Todo**

- [ ] Implement

<a name="Cursor+size"></a>

### cursor.size()
**Kind**: instance method of <code>[Cursor](#Cursor)</code>  
**Todo**

- [ ] Implement

<a name="Cursor+snapshot"></a>

### cursor.snapshot()
**Kind**: instance method of <code>[Cursor](#Cursor)</code>  
**Todo**

- [ ] Implement

<a name="Cursor+tailable"></a>

### cursor.tailable()
**Kind**: instance method of <code>[Cursor](#Cursor)</code>  
**Todo**

- [ ] Implement

<a name="Cursor+toArray"></a>

### cursor.toArray()
**Kind**: instance method of <code>[Cursor](#Cursor)</code>  
**Todo**

- [ ] Implement

