<a name="Cursor"></a>

## Cursor
Cursor class that maps a MongoDB-like cursor

**Kind**: global class  
**Since**: 0.0.1  

* [Cursor](#Cursor)
    * [new Cursor(db, documents, [selection], [fields], [options])](#new_Cursor_new)
    * _instance_
        * [.fetch_mode](#Cursor+fetch_mode)
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
        * [.sort(spec)](#Cursor+sort) ⇒ <code>[Cursor](#Cursor)</code>
        * [.skip(skip)](#Cursor+skip) ⇒ <code>[Cursor](#Cursor)</code>
        * [.limit(limit)](#Cursor+limit) ⇒ <code>[Cursor](#Cursor)</code>
    * _static_
        * [.project(doc, spec)](#Cursor.project) ⇒ <code>Array</code> &#124; <code>Object</code>

<a name="new_Cursor_new"></a>

### new Cursor(db, documents, [selection], [fields], [options])
Cursor


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| db | <code>MongoPortable</code> |  | Additional options |
| documents | <code>Array</code> |  | The list of documents |
| [selection] | <code>Object</code> &#124; <code>Array</code> &#124; <code>String</code> | <code>{}</code> | The selection for matching documents |
| [fields] | <code>Object</code> &#124; <code>Array</code> &#124; <code>String</code> | <code>{}</code> | The fields of the document to show |
| [options] | <code>Object</code> |  | Database object |
| [options.pkFactory] | <code>Object</code> | <code></code> | Object overriding the basic "ObjectId" primary key generation. |

<a name="Cursor+fetch_mode"></a>

### cursor.fetch_mode
ADD IDX

**Kind**: instance property of <code>[Cursor](#Cursor)</code>  
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
Set the sorting of the cursor

**Kind**: instance method of <code>[Cursor](#Cursor)</code>  
**Returns**: <code>[Cursor](#Cursor)</code> - This instance so it can be chained with other methods  

| Param | Type | Description |
| --- | --- | --- |
| spec | <code>Object</code> &#124; <code>Array</code> &#124; <code>String</code> | The sorting specification |

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

<a name="Cursor.project"></a>

### Cursor.project(doc, spec) ⇒ <code>Array</code> &#124; <code>Object</code>
Projects the fields of one or several documents, changing the output

**Kind**: static method of <code>[Cursor](#Cursor)</code>  
**Returns**: <code>Array</code> &#124; <code>Object</code> - The document/s after the projection  

| Param | Type | Description |
| --- | --- | --- |
| doc | <code>Array</code> &#124; <code>Object</code> | The document/s that will be projected |
| spec | <code>String</code> &#124; <code>Array</code> &#124; <code>Object</code> | Fields projection specification. Can be an space/comma separated list, an array, or an object |

