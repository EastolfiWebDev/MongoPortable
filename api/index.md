## Modules

<dl>
<dt><a href="#module_BinaryParserBuffer">BinaryParserBuffer</a></dt>
<dd><p>BinaryParserBuffer</p>
</dd>
<dt><a href="#module_Cursor">Cursor</a></dt>
<dd><p>Cursor</p>
</dd>
<dt><a href="#module_MongoPortable">MongoPortable</a></dt>
<dd><p>MongoPortable</p>
</dd>
<dt><a href="#module_ObjectId">ObjectId</a></dt>
<dd><p>ObjectId</p>
</dd>
</dl>

## Classes

<dl>
<dt><a href="#Collection">Collection</a></dt>
<dd><p>Collection class that maps a MongoDB-like collection</p>
</dd>
</dl>

<a name="module_BinaryParserBuffer"></a>

## BinaryParserBuffer
BinaryParserBuffer

**Since**: 0.0.1  
**Author:** Eduardo Astolfi <eastolfi91@gmail.com>  
**License**: MIT Licensed  
**Copyright**: 2016 Eduardo Astolfi &lt;eastolfi91@gmail.com&gt;  
<a name="module_Cursor"></a>

## Cursor
Cursor

**Since**: 0.0.1  
**Author:** Eduardo Astolfi <eduardo.astolfi91@gmail.com>  
**License**: MIT Licensed  
**Copyright**: 2016 Eduardo Astolfi &lt;eduardo.astolfi91@gmail.com&gt;  
<a name="module_MongoPortable"></a>

## MongoPortable
MongoPortable

**Since**: 0.0.1  

| Param | Type | Description |
| --- | --- | --- |
| databaseName | <code>string</code> | Name of the database. |

<a name="module_ObjectId"></a>

## ObjectId
ObjectId

**Since**: 0.0.1  
**Author:** Eduardo Astolfi <eastolfi91@gmail.com>  
**License**: MIT Licensed  
**Copyright**: 2016 Eduardo Astolfi &lt;eastolfi91@gmail.com&gt;  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> &#124; <code>number</code> | Can be a 24 byte hex string, a 12 byte binary string or a Number. |

<a name="Collection"></a>

## Collection
Collection class that maps a MongoDB-like collection

**Kind**: global class  
**Since**: 0.0.1  
**Author:** Eduardo Astolfi <eastolfi91@gmail.com>  
**License**: MIT Licensed  
**Copyright**: 2016 Eduardo Astolfi &lt;eastolfi91@gmail.com&gt;  

* [Collection](#Collection)
    * [new Collection()](#new_Collection_new)
    * [.insert(doc, [options], [callback])](#Collection+insert) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.bulkInsert(docs, [options], [callback])](#Collection+bulkInsert) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
    * [.find([selection], [fields], [options], [callback])](#Collection+find) ⇒ <code>Promise.&lt;(Array.&lt;Object&gt;\|Cursor)&gt;</code>
    * [.findOne([selection], [fields], [options], [callback])](#Collection+findOne) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.update([selection], [update], [options], [callback])](#Collection+update) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.remove([selection], [options], [callback])](#Collection+remove) ⇒ <code>Promise.&lt;Array.&lt;Obejct&gt;&gt;</code>
    * [.delete()](#Collection+delete)
    * [.destroy()](#Collection+destroy)
    * [.drop([options], [callback])](#Collection+drop) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
    * [.save(doc, [callback])](#Collection+save) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.aggregate(pipeline, [options])](#Collection+aggregate) ⇒ <code>Array</code> &#124; <code>Cursor</code>

<a name="new_Collection_new"></a>

### new Collection()
Collection

<a name="Collection+insert"></a>

### collection.insert(doc, [options], [callback]) ⇒ <code>Promise.&lt;Object&gt;</code>
Inserts a document into the collection

**Kind**: instance method of <code>[Collection](#Collection)</code>  
**Returns**: <code>Promise.&lt;Object&gt;</code> - Returns a promise with the inserted document  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| doc | <code>Object</code> |  | Document to be inserted |
| [options] | <code>Object</code> |  | Additional options |
| [callback] | <code>function</code> | <code></code> | Callback function to be called at the end with the results |

<a name="Collection+bulkInsert"></a>

### collection.bulkInsert(docs, [options], [callback]) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
Inserts several documents into the collection

**Kind**: instance method of <code>[Collection](#Collection)</code>  
**Returns**: <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code> - Returns a promise with the inserted documents  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| docs | <code>Array</code> |  | Documents to be inserted |
| [options] | <code>Object</code> |  | Additional options |
| [callback] | <code>function</code> | <code></code> | Callback function to be called at the end with the results |

<a name="Collection+find"></a>

### collection.find([selection], [fields], [options], [callback]) ⇒ <code>Promise.&lt;(Array.&lt;Object&gt;\|Cursor)&gt;</code>
Finds all matching documents

**Kind**: instance method of <code>[Collection](#Collection)</code>  
**Returns**: <code>Promise.&lt;(Array.&lt;Object&gt;\|Cursor)&gt;</code> - Returns a promise with the documents (or cursor if "options.forceFetch" set to true)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [selection] | <code>Object</code> &#124; <code>Array</code> &#124; <code>String</code> | <code>{}</code> | The selection for matching documents |
| [fields] | <code>Object</code> &#124; <code>Array</code> &#124; <code>String</code> | <code>{}</code> | The fields of the document to show |
| [options] | <code>Object</code> |  | Additional options |
| [options.skip] | <code>Number</code> |  | Number of documents to be skipped |
| [options.limit] | <code>Number</code> |  | Max number of documents to display |
| [options.fields] | <code>Object</code> &#124; <code>Array</code> &#124; <code>String</code> |  | Same as "fields" parameter (if both passed, "options.fields" will be ignored) |
| [options.doNotFetch] | <code>Boolean</code> | <code>false</code> | If set to'"true" returns the cursor not fetched |
| [callback] | <code>function</code> | <code></code> | Callback function to be called at the end with the results |

<a name="Collection+findOne"></a>

### collection.findOne([selection], [fields], [options], [callback]) ⇒ <code>Promise.&lt;Object&gt;</code>
Finds the first matching document

**Kind**: instance method of <code>[Collection](#Collection)</code>  
**Returns**: <code>Promise.&lt;Object&gt;</code> - Returns a promise with the first matching document of the collection  

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

### collection.update([selection], [update], [options], [callback]) ⇒ <code>Promise.&lt;Object&gt;</code>
Updates one or many documents

**Kind**: instance method of <code>[Collection](#Collection)</code>  
**Returns**: <code>Promise.&lt;Object&gt;</code> - Returns a promise with the update/insert (if upsert=true) information  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [selection] | <code>Object</code> &#124; <code>Array</code> &#124; <code>String</code> | <code>{}</code> | The selection for matching documents |
| [update] | <code>Object</code> | <code>{}</code> | The update operation |
| [options] | <code>Object</code> |  | Additional options |
| [options.updateAsMongo] | <code>Number</code> | <code>true</code> | By default:      If the [update] object contains update operator modifiers, such as those using the "$set" modifier, then:          <ul>              <li>The [update] object must contain only update operator expressions</li>              <li>The Collection#update method updates only the corresponding fields in the document</li>          <ul>      If the [update] object contains only "field: value" expressions, then:          <ul>              <li>The Collection#update method replaces the matching document with the [update] object. The Collection#update method does not replace the "_id" value</li>              <li>Collection#update cannot update multiple documents</li>          <ul> |
| [options.override] | <code>Number</code> | <code>false</code> | Replaces the whole document (only apllies when [updateAsMongo=false]) |
| [options.upsert] | <code>Number</code> | <code>false</code> | Creates a new document when no document matches the query criteria |
| [options.multi] | <code>Number</code> | <code>false</code> | Updates multiple documents that meet the criteria |
| [options.writeConcern] | <code>Object</code> | <code></code> | An object expressing the write concern |
| [callback] | <code>function</code> | <code></code> | Callback function to be called at the end with the results |

<a name="Collection+remove"></a>

### collection.remove([selection], [options], [callback]) ⇒ <code>Promise.&lt;Array.&lt;Obejct&gt;&gt;</code>
Removes one or many documents

**Kind**: instance method of <code>[Collection](#Collection)</code>  
**Returns**: <code>Promise.&lt;Array.&lt;Obejct&gt;&gt;</code> - Promise with the deleted documents  

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

### collection.drop([options], [callback]) ⇒ <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code>
Drops a collection

**Kind**: instance method of <code>[Collection](#Collection)</code>  
**Returns**: <code>Promise.&lt;Array.&lt;Object&gt;&gt;</code> - Promise with the deleted documents  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [options] | <code>Object</code> |  | Additional options |
| [options.dropIndexes] | <code>Number</code> | <code>false</code> | True if we want to drop the indexes too |
| [options.writeConcern] | <code>Object</code> | <code></code> | An object expressing the write concern |
| [callback] | <code>function</code> | <code></code> | Callback function to be called at the end with the results |

<a name="Collection+save"></a>

### collection.save(doc, [callback]) ⇒ <code>Promise.&lt;Object&gt;</code>
Insert or update a document. If the document has an "_id" is an update (with upsert), if not is an insert.

**Kind**: instance method of <code>[Collection](#Collection)</code>  
**Returns**: <code>Promise.&lt;Object&gt;</code> - Returns a promise with the inserted document or the update information  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| doc | <code>Object</code> |  | Document to be inserted/updated |
| [options.dropIndexes] | <code>Number</code> | <code>false</code> | True if we want to drop the indexes too |
| [options.writeConcern] | <code>Object</code> | <code></code> | An object expressing the write concern |
| [callback] | <code>function</code> | <code></code> | Callback function to be called at the end with the results |

<a name="Collection+aggregate"></a>

### collection.aggregate(pipeline, [options]) ⇒ <code>Array</code> &#124; <code>Cursor</code>
Calculates aggregate values for the data in a collection

**Kind**: instance method of <code>[Collection](#Collection)</code>  
**Returns**: <code>Array</code> &#124; <code>Cursor</code> - If "options.forceFetch" set to true returns the array of documents, otherwise returns a cursor  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| pipeline | <code>Array</code> |  | A sequence of data aggregation operations or stages |
| [options] | <code>Object</code> |  | Additional options |
| [options.forceFetch] | <code>Boolean</code> | <code>false</code> | If set to'"true" returns the array of documents already fetched |

