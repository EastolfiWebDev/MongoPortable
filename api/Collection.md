<a name="Collection"></a>

## Collection
Collection class that maps a MongoDB-like collection

**Kind**: global class  
**Since**: 0.0.1  

* [Collection](#Collection)
    * [new Collection(db, collectionName, [options])](#new_Collection_new)
    * [.insert(doc, [options], [callback])](#Collection+insert) ⇒ <code>Object</code> &#124; <code>[Collection](#Collection)</code>
    * [.find([selection], [fields], [options], [callback])](#Collection+find) ⇒ <code>Array</code> &#124; <code>Cursor</code>
    * [.findOne([selection], [fields], [options], [callback])](#Collection+findOne) ⇒ <code>Object</code>
    * [.update([selection], [update], [options], [callback])](#Collection+update) ⇒ <code>Object</code>
    * [.remove([selection], [options], [callback])](#Collection+remove) ⇒ <code>Object</code>
    * [.delete()](#Collection+delete)
    * [.destroy()](#Collection+destroy)
    * [.drop([options], [callback])](#Collection+drop) ⇒ <code>Object</code>
    * [.save(doc, [callback])](#Collection+save) ⇒ <code>Object</code>
    * [.aggregate(pipeline, [options])](#Collection+aggregate) ⇒ <code>Array</code> &#124; <code>Cursor</code>

<a name="new_Collection_new"></a>

### new Collection(db, collectionName, [options])
Collection


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| db | <code>MongoPortable</code> |  | Additional options |
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

### collection.find([selection], [fields], [options], [callback]) ⇒ <code>Array</code> &#124; <code>Cursor</code>
Finds all matching documents

**Kind**: instance method of <code>[Collection](#Collection)</code>  
**Returns**: <code>Array</code> &#124; <code>Cursor</code> - If "options.forceFetch" set to true returns the array of documents, otherwise returns a cursor  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [selection] | <code>Object</code> &#124; <code>Array</code> &#124; <code>String</code> | <code>{}</code> | The selection for matching documents |
| [fields] | <code>Object</code> &#124; <code>Array</code> &#124; <code>String</code> | <code>{}</code> | The fields of the document to show |
| [options] | <code>Object</code> |  | Additional options |
| [options.skip] | <code>Number</code> |  | Number of documents to be skipped |
| [options.limit] | <code>Number</code> |  | Max number of documents to display |
| [options.fields] | <code>Object</code> &#124; <code>Array</code> &#124; <code>String</code> |  | Same as "fields" parameter (if both passed, "options.fields" will be ignored) |
| [options.forceFetch] | <code>Boolean</code> | <code>false</code> | If set to'"true" returns the array of documents already fetched |
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

