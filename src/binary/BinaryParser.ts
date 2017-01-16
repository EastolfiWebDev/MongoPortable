import * as _ from "lodash";
import { JSWLogger } from "jsw-logger";

import { BinaryParserBuffer } from "./BinaryParserBuffer";

// Shorcut for String.fromCharCode
var chr = String.fromCharCode;

var maxBits = [];
for (var i = 0; i < 64; i++) {
    maxBits[i] = Math.pow(2, i);
}

class BinaryParser {
    protected logger: JSWLogger;
    
    private bigEndian: string;
    private allowExceptions: boolean;
    
    constructor(bigEndian?: string, allowExceptions: boolean = true) {
        this.logger = JSWLogger.instance;
    
        this.bigEndian = bigEndian || "";
        this.allowExceptions = allowExceptions;
    }
    
    decodeFloat(data: string|number, precisionBits: number, exponentBits: number) {
        var b = new BinaryParserBuffer(this.bigEndian, data);
    
        b.checkBuffer(precisionBits + exponentBits + 1);
    
        var bias = maxBits[exponentBits - 1] - 1,
            signal = b.readBits(precisionBits + exponentBits, 1),
            exponent = b.readBits(precisionBits, exponentBits),
            significand = 0,
            divisor = 2,
            curByte = b.buffer.length + (-precisionBits >> 3) - 1;
    
        do {
            for (
                var byteValue = b.buffer[ ++curByte ], startBit = precisionBits % 8 || 8, mask = 1 << startBit;
                mask >>= 1; 
                ( byteValue & mask ) && ( significand += 1 / divisor ), divisor *= 2 
            );
        } while (precisionBits -= startBit);
        
        
    
        if ( exponent == ( bias << 1 ) + 1 ) {
        	if (significand) {
        		return NaN;
        	} else {
        		if (signal) {
        			return -Infinity;
        		} else {
        			return +Infinity;
        		}
        	}
        } else {
        	var _mod = 0;
        	
        	if (exponent || significand) {
        	    _mod = exponent ? Math.pow( 2, exponent - bias ) * ( 1 + significand ) : Math.pow( 2, -bias + 1 ) * significand;
        	}
        	
        	return ( 1 + signal * -2 ) * (_mod);
        }
    
    
        // return exponent == ( bias << 1 ) + 1 ? significand ? NaN : signal ? -Infinity : +Infinity : ( 1 + signal * -2 ) * ( exponent || significand ? !exponent ? Math.pow( 2, -bias + 1 ) * significand : Math.pow( 2, exponent - bias ) * ( 1 + significand ) : 0 );
    }
    
    decodeInt(data: string|number, bits: number, signed: boolean, forceBigEndian?: boolean) {
        var b = new BinaryParserBuffer(this.bigEndian || forceBigEndian, data),
            x = b.readBits(0, bits),
            max = maxBits[bits]; //max = Math.pow( 2, bits );
    
        return signed && x >= max / 2 ? x - max : x;
    }
    
    encodeFloat(data: string|number, precisionBits: number, exponentBits: number) {
        var bias = maxBits[exponentBits - 1] - 1,
            minExp = -bias + 1,
            maxExp = bias,
            minUnnormExp = minExp - precisionBits,
            n = parseFloat(`${data}`),
            status = isNaN(n) || n == -Infinity || n == +Infinity ? n : 0,
            exp = 0,
            len = 2 * bias + 1 + precisionBits + 3,
            bin: Array<number> = new Array(len),
            signal: boolean = (n = status !== 0 ? 0 : n) < 0,
            intPart = Math.floor(n = Math.abs(n)),
            floatPart: number = n - intPart,
            lastBit,
            rounded,
            result,
            i,
            j;
    
    
        // for (i = len; i; bin[--i] = 0);
        i = len;
        while (i) {
            bin[--i] = 0;
        }
        
        // for (i = bias + 2; intPart && i; bin[--i] = intPart % 2, intPart = Math.floor(intPart / 2));
        i = bias + 2;
        while (intPart && i) {
            bin[--i] = intPart % 2;
            intPart = Math.floor(intPart / 2);
        }
        
        // for (i = bias + 1; floatPart > 0 && i; (bin[++i] = ((floatPart *= 2) >= 1) - 0 ) && --floatPart);
        i = bias + 1;
        while (floatPart > 0 && i) {
            floatPart *= 2;
            bin[++i] = floatPart >= 1 ? 1 : 0;
            
            --floatPart;
        }
        
        // for (i = -1; ++i < len && !bin[i];);
        i = 0;
        while (i < len && !bin[i]) {
            i++;
        }
      
        if (bin[(lastBit = precisionBits - 1 + (i = (exp = bias + 1 - i) >= minExp && exp <= maxExp ? i + 1 : bias + 1 - (exp = minExp - 1))) + 1]) {
            if (!(rounded = bin[lastBit])) {
                for (j = lastBit + 2; !rounded && j < len; rounded = bin[j++]);
            }
            
            // for (j = lastBit + 1; rounded && --j >= 0; (bin[j] = !bin[j] - 0) && (rounded = 0));
            j = lastBit;
            while (rounded && j >= 0) {
                j--;
                bin[j] = bin[j] ? 0 : 1;
                rounded = 0;
            }
        }
      
        for (i = i - 2 < 0 ? -1 : i - 3; ++i < len && !bin[i];);
        
        if ((exp = bias + 1 - i) >= minExp && exp <= maxExp) {
            ++i;
        } else if (exp < minExp) {
            exp != bias + 1 - len && exp < minUnnormExp && this.logger.warn("encodeFloat::float underflow");
            i = bias + 1 - (exp = minExp - 1);
        }
        
        if (intPart || status !== 0) {
            this.logger.warn(intPart ? "encodeFloat::float overflow" : "encodeFloat::" + status);
            exp = maxExp + 1;
            i = bias + 2;
        
            if (status == -Infinity) {
                signal = true; // 1
            } else if (isNaN(status)) {
                bin[i] = 1;
            }
        }
      
        for (n = Math.abs(exp + bias), j = exponentBits + 1, result = ""; --j; result = (n % 2) + result, n = n >>= 1);
        
        let r = [];
        
        for (n = 0, j = 0, i = (result = (signal ? "1" : "0") + result + bin.slice(i, i + precisionBits).join("")).length, r = []; i; j = (j + 1) % 8) {
            n += (1 << j) * result.charAt(--i);
            
            if (j == 7) {
                r[r.length] = String.fromCharCode(n);
                n = 0;
            }
        }
      
        r[r.length] = n ? String.fromCharCode(n) : "";
      
        return (this.bigEndian ? r.reverse() : r).join("");
    }
    
    encodeInt(data: number, bits: number, signed: boolean, forceBigEndian?: boolean) {
        var max = maxBits[bits];
        data = data - 0;    // Ensure a number
        
        if (data >= max || data < -(max / 2)) {
            this.logger.warn("encodeInt::overflow");
            data = 0;
        }
        
        if (data < 0) {
            data += max;
        }
        
        for (var r = []; data; r[r.length] = String.fromCharCode(data % 256), data = Math.floor(data / 256));
        
        for (bits = -(-bits >> 3) - r.length; bits--; r[r.length] = "\0");
        
        return ((this.bigEndian || forceBigEndian) ? r.reverse() : r).join("");
    }
    
    toSmall    ( data: number ){ return this.decodeInt( data,  8, true  ); }
    fromSmall  ( data: number ){ return this.encodeInt( data,  8, true  ); }
    toByte     ( data: number ){ return this.decodeInt( data,  8, false ); }
    fromByte   ( data: number ){ return this.encodeInt( data,  8, false ); }
    toShort    ( data: number ){ return this.decodeInt( data, 16, true  ); }
    fromShort  ( data: number ){ return this.encodeInt( data, 16, true  ); }
    toWord     ( data: number ){ return this.decodeInt( data, 16, false ); }
    fromWord   ( data: number ){ return this.encodeInt( data, 16, false ); }
    toInt      ( data: number ){ return this.decodeInt( data, 32, true  ); }
    fromInt    ( data: number ){ return this.encodeInt( data, 32, true  ); }
    toLong     ( data: number ){ return this.decodeInt( data, 64, true  ); }
    fromLong   ( data: number ){ return this.encodeInt( data, 64, true  ); }
    toDWord    ( data: number ){ return this.decodeInt( data, 32, false ); }
    fromDWord  ( data: number ){ return this.encodeInt( data, 32, false ); }
    toQWord    ( data: number ){ return this.decodeInt( data, 64, true ); }
    fromQWord  ( data: number ){ return this.encodeInt( data, 64, true ); }
    toFloat    ( data: number ){ return this.decodeFloat( data, 23, 8   ); }
    fromFloat  ( data: number ){ return this.encodeFloat( data, 23, 8   ); }
    toDouble   ( data: number ){ return this.decodeFloat( data, 52, 11  ); }
    fromDouble ( data: number ){ return this.encodeFloat( data, 52, 11  ); }
    
    // Factor out the encode so it can be shared by add_header and push_int32
    encode_int32(number, asArray) {
        var a, b, c, d, unsigned;
        
        unsigned = (number < 0) ? (number + 0x100000000) : number;
        a = Math.floor(unsigned / 0xffffff);
        
        unsigned &= 0xffffff;
        b = Math.floor(unsigned / 0xffff);
        
        unsigned &= 0xffff;
        c = Math.floor(unsigned / 0xff);
        
        unsigned &= 0xff;
        d = Math.floor(unsigned);
        
        return asArray ? [chr(a), chr(b), chr(c), chr(d)] : chr(a) + chr(b) + chr(c) + chr(d);
    }
    
    encode_int64(number) {
        var a, b, c, d, e, f, g, h, unsigned;
        
        unsigned = (number < 0) ? (number + 0x10000000000000000) : number;
        a = Math.floor(unsigned / 0xffffffffffffff);
        
        unsigned &= 0xffffffffffffff;
        b = Math.floor(unsigned / 0xffffffffffff);
        
        unsigned &= 0xffffffffffff;
        c = Math.floor(unsigned / 0xffffffffff);
        
        unsigned &= 0xffffffffff;
        d = Math.floor(unsigned / 0xffffffff);
        
        unsigned &= 0xffffffff;
        e = Math.floor(unsigned / 0xffffff);
        
        unsigned &= 0xffffff;
        f = Math.floor(unsigned / 0xffff);
        
        unsigned &= 0xffff;
        g = Math.floor(unsigned / 0xff);
        
        unsigned &= 0xff;
        h = Math.floor(unsigned);
        
        return chr(a) + chr(b) + chr(c) + chr(d) + chr(e) + chr(f) + chr(g) + chr(h);
    }
    
    /**
     * UTF8 methods
     */
    
    // Take a raw binary string and return a utf8 string
    decode_utf8(binaryStr) {
        var len = binaryStr.length,
            decoded = '',
            i = 0,
            c = 0,
            c1 = 0,
            c2 = 0,
            c3;
        
        while (i < len) {
            c = binaryStr.charCodeAt(i);
            
            if (c < 128) {
                decoded += String.fromCharCode(c);
                
                i++;
            } else if ((c > 191) && (c < 224)) {
                c2 = binaryStr.charCodeAt(i+1);
                decoded += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                
                i += 2;
            } else {
                c2 = binaryStr.charCodeAt(i+1);
                c3 = binaryStr.charCodeAt(i+2);
                decoded += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                
                i += 3;
            }
        }
        
        return decoded;
    }
    
    // Encode a cstring
    encode_cstring(s) {
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/escape
        return encodeURIComponent(encodeURIComponent(s)) + this.fromByte(0);
    }
    
    // Take a utf8 string and return a binary string
    encode_utf8(s) {
        var a = "",
            c;
    
        for (var n = 0, len = s.length; n < len; n++) {
            c = s.charCodeAt(n);
    
            if (c < 128) {
                a += String.fromCharCode(c);
            } else if ((c > 127) && (c < 2048)) {
                a += String.fromCharCode((c>>6) | 192) ;
                a += String.fromCharCode((c&63) | 128);
            } else {
                a += String.fromCharCode((c>>12) | 224);
                a += String.fromCharCode(((c>>6) & 63) | 128);
                a += String.fromCharCode((c&63) | 128);
            }
        }
    
        return a;
    }
    
    hprint(s) {
        var number;
    
        for (var i = 0, len = s.length; i < len; i++) {
            if (s.charCodeAt(i) < 32) {
                number = s.charCodeAt(i) <= 15 ? "0" + s.charCodeAt(i).toString(16) : s.charCodeAt(i).toString(16);
                
                this.logger.silly(number + " ");
            } else {
                number = s.charCodeAt(i) <= 15 ? "0" + s.charCodeAt(i).toString(16) : s.charCodeAt(i).toString(16);
                
                this.logger.silly(number + " ");
            }
        }
        
        this.logger.silly("\n\n");
        
        return number;
    }
    
    ilprint(s) {
        var number;
    
        for (var i = 0, len = s.length; i < len; i++) {
            if (s.charCodeAt(i) < 32) {
                number = s.charCodeAt(i) <= 15 ? "0" + s.charCodeAt(i).toString(10) : s.charCodeAt(i).toString(10);
                
                this.logger.silly(number + " ");
            } else {
                number = s.charCodeAt(i) <= 15 ? "0" + s.charCodeAt(i).toString(10) : s.charCodeAt(i).toString(10);
                
                this.logger.silly(number + " ");
            }
        }
        
        this.logger.silly("\n\n");
        
        return number;
    }
    
    hlprint(s) {
        var number;
        
        for (var i = 0, len = s.length; i < len; i++) {
            if (s.charCodeAt(i) < 32) {
                number = s.charCodeAt(i) <= 15 ? "0" + s.charCodeAt(i).toString(16) : s.charCodeAt(i).toString(16);
                
                this.logger.silly(number + " ");
            } else {
                number = s.charCodeAt(i) <= 15 ? "0" + s.charCodeAt(i).toString(16) : s.charCodeAt(i).toString(16);
                
                this.logger.silly(number + " ");
            }
        }
        
        this.logger.silly("\n\n");
        
        return number;
    }
}



export { BinaryParser };