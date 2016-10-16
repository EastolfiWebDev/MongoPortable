<a name="ObjectId"></a>

## ObjectId
Represents the BSON ObjectId type

**Kind**: global class  
**Since**: 0.0.1  

* [ObjectId](#ObjectId)
    * [new ObjectId(id)](#new_ObjectId_new)
    * [.toHexString()](#ObjectId+toHexString) ⇒ <code>String</code>
    * [.equals(otherID)](#ObjectId+equals) ⇒ <code>Boolean</code>
    * [.getTimestamp()](#ObjectId+getTimestamp) ⇒ <code>Number</code>
    * [.createFromHexString(hexString)](#ObjectId+createFromHexString) ⇒ <code>[ObjectId](#ObjectId)</code>
    * [.createFromTime(time)](#ObjectId+createFromTime) ⇒ <code>[ObjectId](#ObjectId)</code>
    * [.createPk(time)](#ObjectId+createPk) ⇒ <code>[ObjectId](#ObjectId)</code>

<a name="new_ObjectId_new"></a>

### new ObjectId(id)
ObjectId


| Param | Type | Description |
| --- | --- | --- |
| id | <code>String</code> &#124; <code>Number</code> | Can be a 24 byte hex string, a 12 byte binary string or a Number. |

<a name="ObjectId+toHexString"></a>

### objectId.toHexString() ⇒ <code>String</code>
Return the ObjectId id as a 24 byte hex string representation

**Kind**: instance method of <code>[ObjectId](#ObjectId)</code>  
**Returns**: <code>String</code> - The 24 byte hex string representation.  
<a name="ObjectId+equals"></a>

### objectId.equals(otherID) ⇒ <code>Boolean</code>
Compares the equality of this ObjectId with [otherID].

**Kind**: instance method of <code>[ObjectId](#ObjectId)</code>  
**Returns**: <code>Boolean</code> - The result of comparing two ObjectId's  

| Param | Type | Description |
| --- | --- | --- |
| otherID | <code>Object</code> | ObjectId instance to compare against. |

<a name="ObjectId+getTimestamp"></a>

### objectId.getTimestamp() ⇒ <code>Number</code>
Returns the generation time in seconds that this ID was generated.

**Kind**: instance method of <code>[ObjectId](#ObjectId)</code>  
**Returns**: <code>Number</code> - Number of seconds in the timestamp part of the 12 byte id.  
<a name="ObjectId+createFromHexString"></a>

### objectId.createFromHexString(hexString) ⇒ <code>[ObjectId](#ObjectId)</code>
Creates an ObjectId from a hex string representation of an ObjectId.

**Kind**: instance method of <code>[ObjectId](#ObjectId)</code>  
**Returns**: <code>[ObjectId](#ObjectId)</code> - The created ObjectId  

| Param | Type | Description |
| --- | --- | --- |
| hexString | <code>String</code> | An ObjectId 24 byte hexstring representation. |

<a name="ObjectId+createFromTime"></a>

### objectId.createFromTime(time) ⇒ <code>[ObjectId](#ObjectId)</code>
Creates an ObjectId from a second based number, with the rest of the ObjectId zeroed out. 
Used for comparisons or sorting the ObjectId.

**Kind**: instance method of <code>[ObjectId](#ObjectId)</code>  
**Returns**: <code>[ObjectId](#ObjectId)</code> - The created ObjectId  

| Param | Type | Description |
| --- | --- | --- |
| time | <code>Number</code> | A number of seconds. |

<a name="ObjectId+createPk"></a>

### objectId.createPk(time) ⇒ <code>[ObjectId](#ObjectId)</code>
Creates an ObjectId from a second based number, with the rest of the ObjectId zeroed out. Used for comparisons or sorting the ObjectId.

**Kind**: instance method of <code>[ObjectId](#ObjectId)</code>  
**Returns**: <code>[ObjectId](#ObjectId)</code> - return the created ObjectId  

| Param | Type | Description |
| --- | --- | --- |
| time | <code>Number</code> | an integer number representing a number of seconds. |

