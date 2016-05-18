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
| db | <code>MongoPortable</code> |  | Additional options |
| collection | <code>Collection</code> |  | The collection instance |
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

