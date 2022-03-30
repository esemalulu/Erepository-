/*
 * Sweet Webservice Library 
 * 
 */

/*-----------------------------------------------------------------------------
 *
 * SWEET
 * 
 */

var SWEET = {
  HTML : { },
  XML : { },
  PHP : { },
  REST : { },
  mail : { },
  B2C : { },
  Base64 : { }
};

/*-----------------------------------------------------------------------------
 *
 * YAHOO
 * 
 */

/*
Script is executed on NetSuite server but YUI expects a web-browser.
Emulate the web browser enviroment.
*/
navigator = new Object;
navigator.userAgent = "Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.8.1.8) Gecko/20071022";

/*
 * Copyright (c) 2008, Yahoo! Inc. All rights reserved.
 * Code licensed under the BSD License:
 * http://developer.yahoo.net/yui/license.txt
 * version: 2.5.2
 */
if(typeof YAHOO=="undefined"||!YAHOO){var YAHOO={};}YAHOO.namespace=function(){var A=arguments,E=null,C,B,D;for(C=0;C<A.length;C=C+1){D=A[C].split(".");E=YAHOO;for(B=(D[0]=="YAHOO")?1:0;B<D.length;B=B+1){E[D[B]]=E[D[B]]||{};E=E[D[B]];}}return E;};YAHOO.log=function(D,A,C){var B=YAHOO.widget.Logger;if(B&&B.log){return B.log(D,A,C);}else{return false;}};YAHOO.register=function(A,E,D){var I=YAHOO.env.modules;if(!I[A]){I[A]={versions:[],builds:[]};}var B=I[A],H=D.version,G=D.build,F=YAHOO.env.listeners;B.name=A;B.version=H;B.build=G;B.versions.push(H);B.builds.push(G);B.mainClass=E;for(var C=0;C<F.length;C=C+1){F[C](B);}if(E){E.VERSION=H;E.BUILD=G;}else{YAHOO.log("mainClass is undefined for module "+A,"warn");}};YAHOO.env=YAHOO.env||{modules:[],listeners:[]};YAHOO.env.getVersion=function(A){return YAHOO.env.modules[A]||null;};YAHOO.env.ua=function(){var C={ie:0,opera:0,gecko:0,webkit:0,mobile:null,air:0};var B=navigator.userAgent,A;if((/KHTML/).test(B)){C.webkit=1;}A=B.match(/AppleWebKit\/([^\s]*)/);if(A&&A[1]){C.webkit=parseFloat(A[1]);if(/ Mobile\//.test(B)){C.mobile="Apple";}else{A=B.match(/NokiaN[^\/]*/);if(A){C.mobile=A[0];}}A=B.match(/AdobeAIR\/([^\s]*)/);if(A){C.air=A[0];}}if(!C.webkit){A=B.match(/Opera[\s\/]([^\s]*)/);if(A&&A[1]){C.opera=parseFloat(A[1]);A=B.match(/Opera Mini[^;]*/);if(A){C.mobile=A[0];}}else{A=B.match(/MSIE\s([^;]*)/);if(A&&A[1]){C.ie=parseFloat(A[1]);}else{A=B.match(/Gecko\/([^\s]*)/);if(A){C.gecko=1;A=B.match(/rv:([^\s\)]*)/);if(A&&A[1]){C.gecko=parseFloat(A[1]);}}}}}return C;}();(function(){YAHOO.namespace("util","widget","example");if("undefined"!==typeof YAHOO_config){var B=YAHOO_config.listener,A=YAHOO.env.listeners,D=true,C;if(B){for(C=0;C<A.length;C=C+1){if(A[C]==B){D=false;break;}}if(D){A.push(B);}}}})();YAHOO.lang=YAHOO.lang||{};(function(){var A=YAHOO.lang,C=["toString","valueOf"],B={isArray:function(D){if(D){return A.isNumber(D.length)&&A.isFunction(D.splice);}return false;},isBoolean:function(D){return typeof D==="boolean";},isFunction:function(D){return typeof D==="function";},isNull:function(D){return D===null;},isNumber:function(D){return typeof D==="number"&&isFinite(D);},isObject:function(D){return(D&&(typeof D==="object"||A.isFunction(D)))||false;},isString:function(D){return typeof D==="string";},isUndefined:function(D){return typeof D==="undefined";},_IEEnumFix:(YAHOO.env.ua.ie)?function(F,E){for(var D=0;D<C.length;D=D+1){var H=C[D],G=E[H];if(A.isFunction(G)&&G!=Object.prototype[H]){F[H]=G;}}}:function(){},extend:function(H,I,G){if(!I||!H){throw new Error("extend failed, please check that "+"all dependencies are included.");}var E=function(){};E.prototype=I.prototype;H.prototype=new E();H.prototype.constructor=H;H.superclass=I.prototype;if(I.prototype.constructor==Object.prototype.constructor){I.prototype.constructor=I;}if(G){for(var D in G){if(A.hasOwnProperty(G,D)){H.prototype[D]=G[D];}}A._IEEnumFix(H.prototype,G);}},augmentObject:function(H,G){if(!G||!H){throw new Error("Absorb failed, verify dependencies.");}var D=arguments,F,I,E=D[2];if(E&&E!==true){for(F=2;F<D.length;F=F+1){H[D[F]]=G[D[F]];}}else{for(I in G){if(E||!(I in H)){H[I]=G[I];}}A._IEEnumFix(H,G);}},augmentProto:function(G,F){if(!F||!G){throw new Error("Augment failed, verify dependencies.");}var D=[G.prototype,F.prototype];for(var E=2;E<arguments.length;E=E+1){D.push(arguments[E]);}A.augmentObject.apply(this,D);},dump:function(D,I){var F,H,K=[],L="{...}",E="f(){...}",J=", ",G=" => ";if(!A.isObject(D)){return D+"";}else{if(D instanceof Date||("nodeType" in D&&"tagName" in D)){return D;}else{if(A.isFunction(D)){return E;}}}I=(A.isNumber(I))?I:3;if(A.isArray(D)){K.push("[");for(F=0,H=D.length;F<H;F=F+1){if(A.isObject(D[F])){K.push((I>0)?A.dump(D[F],I-1):L);}else{K.push(D[F]);}K.push(J);}if(K.length>1){K.pop();}K.push("]");}else{K.push("{");for(F in D){if(A.hasOwnProperty(D,F)){K.push(F+G);if(A.isObject(D[F])){K.push((I>0)?A.dump(D[F],I-1):L);}else{K.push(D[F]);}K.push(J);}}if(K.length>1){K.pop();}K.push("}");}return K.join("");},substitute:function(S,E,L){var I,H,G,O,P,R,N=[],F,J="dump",M=" ",D="{",Q="}";for(;;){I=S.lastIndexOf(D);if(I<0){break;}H=S.indexOf(Q,I);if(I+1>=H){break;}F=S.substring(I+1,H);O=F;R=null;G=O.indexOf(M);if(G>-1){R=O.substring(G+1);O=O.substring(0,G);}P=E[O];if(L){P=L(O,P,R);}if(A.isObject(P)){if(A.isArray(P)){P=A.dump(P,parseInt(R,10));}else{R=R||"";var K=R.indexOf(J);if(K>-1){R=R.substring(4);}if(P.toString===Object.prototype.toString||K>-1){P=A.dump(P,parseInt(R,10));}else{P=P.toString();}}}else{if(!A.isString(P)&&!A.isNumber(P)){P="~-"+N.length+"-~";N[N.length]=F;}}S=S.substring(0,I)+P+S.substring(H+1);}for(I=N.length-1;I>=0;I=I-1){S=S.replace(new RegExp("~-"+I+"-~"),"{"+N[I]+"}","g");}return S;},trim:function(D){try{return D.replace(/^\s+|\s+$/g,"");}catch(E){return D;}},merge:function(){var G={},E=arguments;for(var F=0,D=E.length;F<D;F=F+1){A.augmentObject(G,E[F],true);}return G;},later:function(K,E,L,G,H){K=K||0;E=E||{};var F=L,J=G,I,D;if(A.isString(L)){F=E[L];}if(!F){throw new TypeError("method undefined");}if(!A.isArray(J)){J=[G];}I=function(){F.apply(E,J);};D=(H)?setInterval(I,K):setTimeout(I,K);return{interval:H,cancel:function(){if(this.interval){clearInterval(D);}else{clearTimeout(D);}}};},isValue:function(D){return(A.isObject(D)||A.isString(D)||A.isNumber(D)||A.isBoolean(D));}};A.hasOwnProperty=(Object.prototype.hasOwnProperty)?function(D,E){return D&&D.hasOwnProperty(E);}:function(D,E){return !A.isUndefined(D[E])&&D.constructor.prototype[E]!==D[E];};B.augmentObject(A,B,true);YAHOO.util.Lang=A;A.augment=A.augmentProto;YAHOO.augment=A.augmentProto;YAHOO.extend=A.extend;})();YAHOO.register("yahoo",YAHOO,{version:"2.5.2",build:"1076"});

/*
 * Copyright (c) 2008, Yahoo! Inc. All rights reserved.
 * Code licensed under the BSD License:
 * http://developer.yahoo.net/yui/license.txt
 * version: 2.5.2
 */
YAHOO.namespace("lang");YAHOO.lang.JSON={_ESCAPES:/\\["\\\/bfnrtu]/g,_VALUES:/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,_BRACKETS:/(?:^|:|,)(?:\s*\[)+/g,_INVALID:/^[\],:{}\s]*$/,_SPECIAL_CHARS:/["\\\x00-\x1f\x7f-\x9f]/g,_PARSE_DATE:/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z$/,_CHARS:{"\b":"\\b","\t":"\\t","\n":"\\n","\f":"\\f","\r":"\\r",'"':'\\"',"\\":"\\\\"},_applyFilter:function(C,B){var A=function(E,D){var F,G;if(D&&typeof D==="object"){for(F in D){if(YAHOO.lang.hasOwnProperty(D,F)){G=A(F,D[F]);if(G===undefined){delete D[F];}else{D[F]=G;}}}}return B(E,D);};if(YAHOO.lang.isFunction(B)){A("",C);}return C;},isValid:function(A){if(!YAHOO.lang.isString(A)){return false;}return this._INVALID.test(A.replace(this._ESCAPES,"@").replace(this._VALUES,"]").replace(this._BRACKETS,""));},dateToString:function(B){function A(C){return C<10?"0"+C:C;}return'"'+B.getUTCFullYear()+"-"+A(B.getUTCMonth()+1)+"-"+A(B.getUTCDate())+"T"+A(B.getUTCHours())+":"+A(B.getUTCMinutes())+":"+A(B.getUTCSeconds())+'Z"';},stringToDate:function(B){if(this._PARSE_DATE.test(B)){var A=new Date();A.setUTCFullYear(RegExp.$1,(RegExp.$2|0)-1,RegExp.$3);A.setUTCHours(RegExp.$4,RegExp.$5,RegExp.$6);return A;}},parse:function(s,filter){if(this.isValid(s)){return this._applyFilter(eval("("+s+")"),filter);}throw new SyntaxError("parseJSON");},stringify:function(C,K,F){var E=YAHOO.lang,H=E.JSON,D=H._CHARS,A=this._SPECIAL_CHARS,B=[];var I=function(N){if(!D[N]){var J=N.charCodeAt();D[N]="\\u00"+Math.floor(J/16).toString(16)+(J%16).toString(16);}return D[N];};var M=function(J){return'"'+J.replace(A,I)+'"';};var L=H.dateToString;var G=function(J,T,R){var W=typeof J,P,Q,O,N,U,V,S;if(W==="string"){return M(J);}if(W==="boolean"||J instanceof Boolean){return String(J);}if(W==="number"||J instanceof Number){return isFinite(J)?String(J):"null";}if(J instanceof Date){return L(J);}if(E.isArray(J)){for(P=B.length-1;P>=0;--P){if(B[P]===J){return"null";}}B[B.length]=J;S=[];if(R>0){for(P=J.length-1;P>=0;--P){S[P]=G(J[P],T,R-1)||"null";}}B.pop();return"["+S.join(",")+"]";}if(W==="object"){if(!J){return"null";}for(P=B.length-1;P>=0;--P){if(B[P]===J){return"null";}}B[B.length]=J;S=[];if(R>0){if(T){for(P=0,O=0,Q=T.length;P<Q;++P){if(typeof T[P]==="string"){U=G(J[T[P]],T,R-1);if(U){S[O++]=M(T[P])+":"+U;}}}}else{O=0;for(N in J){if(typeof N==="string"&&E.hasOwnProperty(J,N)){U=G(J[N],T,R-1);if(U){S[O++]=M(N)+":"+U;}}}}}B.pop();return"{"+S.join(",")+"}";}return undefined;};F=F>=0?F:1/0;return G(C,K,F);}};YAHOO.register("json",YAHOO.lang.JSON,{version:"2.5.2",build:"1076"});


/*-----------------------------------------------------------------------------
 *
 * STRING
 * 
 */

/*
 * Copyright (C) 1999 Masanao Izumo <iz@onicos.co.jp>
 * http://www.phprpc.org/
 * Code licensed under the GNU Lesser General Public License (LGPL) version 3.0
 */
String.prototype.toUTF8 = function() {
  var str = this;
  if (str.match(/^[\x00-\x7f]*$/) != null) {
    return str.toString();
  }
  var out, i, j, len, c, c2;
  out = [];
  len = str.length;
  for (i = 0, j = 0; i < len; i++, j++) {
    c = str.charCodeAt(i);
    if (c <= 0x7f) {
      out[j] = str.charAt(i);
    }
    else if (c <= 0x7ff) {
      out[j] = String.fromCharCode(0xc0 | (c >>> 6),
                     0x80 | (c & 0x3f));
    }
    else if (c < 0xd800 || c > 0xdfff) {
      out[j] = String.fromCharCode(0xe0 | (c >>> 12),
                     0x80 | ((c >>> 6) & 0x3f),
                     0x80 | (c & 0x3f));
    }
    else {
      if (++i < len) {
        c2 = str.charCodeAt(i);
        if (c <= 0xdbff && 0xdc00 <= c2 && c2 <= 0xdfff) {
          c = ((c & 0x03ff) << 10 | (c2 & 0x03ff)) + 0x010000;
          if (0x010000 <= c && c <= 0x10ffff) {
            out[j] = String.fromCharCode(0xf0 | ((c >>> 18) & 0x3f),
                           0x80 | ((c >>> 12) & 0x3f),
                           0x80 | ((c >>> 6) & 0x3f),
                           0x80 | (c & 0x3f));
          }
          else {
             out[j] = '?';
          }
        }
        else {
          i--;
          out[j] = '?';
        }
      }
      else {
        i--;
        out[j] = '?';
      }
    }
  }
  return out.join('');
}

String.prototype.toUTF16 = function() {
  var str = this;
  if ((str.match(/^[\x00-\x7f]*$/) != null) ||
    (str.match(/^[\x00-\xff]*$/) == null)) {
    return str.toString();
  }
  var out, i, j, len, c, c2, c3, c4, s;

  out = [];
  len = str.length;
  i = j = 0;
  while (i < len) {
    c = str.charCodeAt(i++);
    switch (c >> 4) { 
      case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
        // 0xxx xxxx
        out[j++] = str.charAt(i - 1);
        break;
      case 12: case 13:
        // 110x xxxx   10xx xxxx
        c2 = str.charCodeAt(i++);
        out[j++] = String.fromCharCode(((c  & 0x1f) << 6) |
                        (c2 & 0x3f));
        break;
      case 14:
        // 1110 xxxx  10xx xxxx  10xx xxxx
        c2 = str.charCodeAt(i++);
        c3 = str.charCodeAt(i++);
        out[j++] = String.fromCharCode(((c  & 0x0f) << 12) |
                         ((c2 & 0x3f) <<  6) |
                        (c3 & 0x3f));
        break;
      case 15:
        switch (c & 0xf) {
          case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
            // 1111 0xxx  10xx xxxx  10xx xxxx  10xx xxxx
            c2 = str.charCodeAt(i++);
            c3 = str.charCodeAt(i++);
            c4 = str.charCodeAt(i++);
            s = ((c  & 0x07) << 18) |
              ((c2 & 0x3f) << 12) |
              ((c3 & 0x3f) <<  6) |
               (c4 & 0x3f) - 0x10000;
            if (0 <= s && s <= 0xfffff) {
              out[j++] = String.fromCharCode(((s >>> 10) & 0x03ff) | 0xd800,
                              (s     & 0x03ff) | 0xdc00);
            }
            else {
              out[j++] = '?';
            }
            break;
          case 8: case 9: case 10: case 11:
            // 1111 10xx  10xx xxxx  10xx xxxx  10xx xxxx  10xx xxxx
            i+=4;
            out[j++] = '?';
            break;
          case 12: case 13:
            // 1111 110x  10xx xxxx  10xx xxxx  10xx xxxx  10xx xxxx  10xx xxxx
            i+=5;
            out[j++] = '?';
            break;
        }
    }
  }
  return out.join('');
}

/*
 * http://kevin.vanzonneveld.net
 */
String.prototype.strtr = function(from, to) {
  var str = this;
  var fr = '', i = 0, lgth = 0;

  if (typeof from === 'object') {
      for (fr in from) {
          str = str.replace(fr, from[fr]);
      }
      return str;
  }
  
  lgth = to.length;
  if (from.length < to.length) {
      lgth = from.length;
  }
  for (i = 0; i < lgth; i++) {
      str = str.replace(from[i], to[i]);
  }
  
  return str;
}

/*-----------------------------------------------------------------------------
 *
 * DATE
 * 
 */

/*
 * Copyright (C) 2006 Jac Wright
 * http://jacwright.com/projects/javascript/date_format
 */

/**
 * Simulate PHP's date format function
 * @method format
 * @param {String} format
 * @return {String}
 */
Date.prototype.format = function(format) {
  var returnStr = '';
  var replace = Date.replaceChars;
  for (var i = 0; i < format.length; i++) {
    var curChar = format.charAt(i);
    if (replace[curChar])
      returnStr += replace[curChar].call(this);
    else
      returnStr += curChar;
  }
  return returnStr;
};
Date.replaceChars = {
  shortMonths: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  longMonths: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  shortDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  longDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  
  // Day
  d: function() { return (this.getDate() < 10 ? '0' : '') + this.getDate(); },
  D: function() { return Date.replaceChars.shortDays[this.getDay()]; },
  j: function() { return this.getDate(); },
  l: function() { return Date.replaceChars.longDays[this.getDay()]; },
  N: function() { return this.getDay() + 1; },
  S: function() { return (this.getDate() % 10 == 1 && this.getDate() != 11 ? 'st' : (this.getDate() % 10 == 2 && this.getDate() != 12 ? 'nd' : (this.getDate() % 10 == 3 && this.getDate() != 13 ? 'rd' : 'th'))); },
  w: function() { return this.getDay(); },
  z: function() { return "Not Yet Supported"; },
  // Week
  W: function() { return "Not Yet Supported"; },
  // Month
  F: function() { return Date.replaceChars.longMonths[this.getMonth()]; },
  m: function() { return (this.getMonth() < 11 ? '0' : '') + (this.getMonth() + 1); },
  M: function() { return Date.replaceChars.shortMonths[this.getMonth()]; },
  n: function() { return this.getMonth() + 1; },
  t: function() { return "Not Yet Supported"; },
  // Year
  L: function() { return "Not Yet Supported"; },
  o: function() { return "Not Supported"; },
  Y: function() { return this.getFullYear(); },
  y: function() { return ('' + this.getFullYear()).substr(2); },
  // Time
  a: function() { return this.getHours() < 12 ? 'am' : 'pm'; },
  A: function() { return this.getHours() < 12 ? 'AM' : 'PM'; },
  B: function() { return "Not Yet Supported"; },
  g: function() { return this.getHours() == 0 ? 12 : (this.getHours() > 12 ? this.getHours() - 12 : this.getHours()); },
  G: function() { return this.getHours(); },
  h: function() { return (this.getHours() < 10 || (12 < this.getHours() < 22) ? '0' : '') + (this.getHours() < 10 ? this.getHours() + 1 : this.getHours() - 12); },
  H: function() { return (this.getHours() < 10 ? '0' : '') + this.getHours(); },
  i: function() { return (this.getMinutes() < 10 ? '0' : '') + this.getMinutes(); },
  s: function() { return (this.getSeconds() < 10 ? '0' : '') + this.getSeconds(); },
  // Timezone
  e: function() { return "Not Yet Supported"; },
  I: function() { return "Not Supported"; },
  O: function() { return (this.getTimezoneOffset() < 0 ? '-' : '+') + (this.getTimezoneOffset() / 60 < 10 ? '0' : '') + (this.getTimezoneOffset() / 60) + '00'; },
  T: function() { return "Not Yet Supported"; },
  Z: function() { return this.getTimezoneOffset() * 60; },
  // Full Date/Time
  c: function() { return "Not Yet Supported"; },
  r: function() { return this.toString(); },
  U: function() { return this.getTime() / 1000; }
}

/*-----------------------------------------------------------------------------
 *
 * BASE 64
 * 
 */
 
/*
 * Copyright (C) 2004 - 2006 Derek Buitenhuis
 * Code licensed under the GNU General Public License.
 */

/**
 * Base64 encoder/decoder
 * @namespace SWEET.Base64
 * @class Base64
 */
SWEET.Base64 = (function () {

  var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

  return {
    
    encode : function(input) {
      var output = "";
      var chr1, chr2, chr3 = "";
      var enc1, enc2, enc3, enc4 = "";
      var i = 0;
      
      do {
         chr1 = input.charCodeAt(i++);
         chr2 = input.charCodeAt(i++);
         chr3 = input.charCodeAt(i++);
         
         enc1 = chr1 >> 2;
         enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
         enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
         enc4 = chr3 & 63;
         
         if (isNaN(chr2)) {
            enc3 = enc4 = 64;
         } else if (isNaN(chr3)) {
            enc4 = 64;
         }
         
         output = output +
            keyStr.charAt(enc1) +
            keyStr.charAt(enc2) +
            keyStr.charAt(enc3) +
            keyStr.charAt(enc4);
         chr1 = chr2 = chr3 = "";
         enc1 = enc2 = enc3 = enc4 = "";
      } while (i < input.length);
      
      return output;
    },

    decode : function(input) {
      var output = "";
      var chr1, chr2, chr3 = "";
      var enc1, enc2, enc3, enc4 = "";
      var i = 0;
      
      // remove all characters that are not A-Z, a-z, 0-9, +, /, or =
      input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
      
      do {
         enc1 = keyStr.indexOf(input.charAt(i++));
         enc2 = keyStr.indexOf(input.charAt(i++));
         enc3 = keyStr.indexOf(input.charAt(i++));
         enc4 = keyStr.indexOf(input.charAt(i++));
         
         chr1 = (enc1 << 2) | (enc2 >> 4);
         chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
         chr3 = ((enc3 & 3) << 6) | enc4;
         
         output = output + String.fromCharCode(chr1);
         
         if (enc3 != 64) {
            output = output + String.fromCharCode(chr2);
         }
         if (enc4 != 64) {
            output = output + String.fromCharCode(chr3);
         }
         
         chr1 = chr2 = chr3 = "";
         enc1 = enc2 = enc3 = enc4 = "";
         
      } while (i < input.length);
      
      return output;
    }
  };
})();

/*-----------------------------------------------------------------------------
 *
 * HTML
 * 
 */
SWEET.HTML = (function () {

// Return the public API
return {

  /*
   * http://kevin.vanzonneveld.net
   */
  entity_decode : function(string, quote_style) {
      var histogram = {}, symbol = '', tmp_str = '', entity = '';
      tmp_str = string.toString();
      
      if (false === (histogram = SWEET.HTML.get_translation_table('HTML_ENTITIES', quote_style))) {
          return false;
      }
   
      // &amp; must be the last character when decoding!
      delete(histogram['&']);
      histogram['&'] = '&amp;';
   
      for (symbol in histogram) {
          entity = histogram[symbol];
          tmp_str = tmp_str.split(entity).join(symbol);
      }
      
      return tmp_str;
  },
  /*
   * http://kevin.vanzonneveld.net
   */
  get_translation_table :  function(table, quote_style) {
    var entities = {}, histogram = {}, decimal = 0, symbol = '';
    var constMappingTable = {}, constMappingQuoteStyle = {};
    var useTable = {}, useQuoteStyle = {};
    
    useTable      = (table ? table.toUpperCase() : 'HTML_SPECIALCHARS');
    useQuoteStyle = (quote_style ? quote_style.toUpperCase() : 'ENT_COMPAT');
    
    // Translate arguments
    constMappingTable[0]      = 'HTML_SPECIALCHARS';
    constMappingTable[1]      = 'HTML_ENTITIES';
    constMappingQuoteStyle[0] = 'ENT_NOQUOTES';
    constMappingQuoteStyle[2] = 'ENT_COMPAT';
    constMappingQuoteStyle[3] = 'ENT_QUOTES';
    
    // Map numbers to strings for compatibilty with PHP constants
    if (!isNaN(useTable)) {
        useTable = constMappingTable[useTable];
    }
    if (!isNaN(useQuoteStyle)) {
        useQuoteStyle = constMappingQuoteStyle[useQuoteStyle];
    }
    
    if (useQuoteStyle != 'ENT_NOQUOTES') {
        entities['34'] = '&quot;';
    }
 
    if (useQuoteStyle == 'ENT_QUOTES') {
        entities['39'] = '&#039;';
    }
 
    if (useTable == 'HTML_SPECIALCHARS') {
        // ascii decimals for better compatibility
        entities['38'] = '&amp;';
        entities['60'] = '&lt;';
        entities['62'] = '&gt;';
    } else if (useTable == 'HTML_ENTITIES') {
        // ascii decimals for better compatibility
      entities['38']  = '&amp;';
      entities['60']  = '&lt;';
      entities['62']  = '&gt;';
      entities['160'] = '&nbsp;';
      entities['161'] = '&iexcl;';
      entities['162'] = '&cent;';
      entities['163'] = '&pound;';
      entities['164'] = '&curren;';
      entities['165'] = '&yen;';
      entities['166'] = '&brvbar;';
      entities['167'] = '&sect;';
      entities['168'] = '&uml;';
      entities['169'] = '&copy;';
      entities['170'] = '&ordf;';
      entities['171'] = '&laquo;';
      entities['172'] = '&not;';
      entities['173'] = '&shy;';
      entities['174'] = '&reg;';
      entities['175'] = '&macr;';
      entities['176'] = '&deg;';
      entities['177'] = '&plusmn;';
      entities['178'] = '&sup2;';
      entities['179'] = '&sup3;';
      entities['180'] = '&acute;';
      entities['181'] = '&micro;';
      entities['182'] = '&para;';
      entities['183'] = '&middot;';
      entities['184'] = '&cedil;';
      entities['185'] = '&sup1;';
      entities['186'] = '&ordm;';
      entities['187'] = '&raquo;';
      entities['188'] = '&frac14;';
      entities['189'] = '&frac12;';
      entities['190'] = '&frac34;';
      entities['191'] = '&iquest;';
      entities['192'] = '&Agrave;';
      entities['193'] = '&Aacute;';
      entities['194'] = '&Acirc;';
      entities['195'] = '&Atilde;';
      entities['196'] = '&Auml;';
      entities['197'] = '&Aring;';
      entities['198'] = '&AElig;';
      entities['199'] = '&Ccedil;';
      entities['200'] = '&Egrave;';
      entities['201'] = '&Eacute;';
      entities['202'] = '&Ecirc;';
      entities['203'] = '&Euml;';
      entities['204'] = '&Igrave;';
      entities['205'] = '&Iacute;';
      entities['206'] = '&Icirc;';
      entities['207'] = '&Iuml;';
      entities['208'] = '&ETH;';
      entities['209'] = '&Ntilde;';
      entities['210'] = '&Ograve;';
      entities['211'] = '&Oacute;';
      entities['212'] = '&Ocirc;';
      entities['213'] = '&Otilde;';
      entities['214'] = '&Ouml;';
      entities['215'] = '&times;';
      entities['216'] = '&Oslash;';
      entities['217'] = '&Ugrave;';
      entities['218'] = '&Uacute;';
      entities['219'] = '&Ucirc;';
      entities['220'] = '&Uuml;';
      entities['221'] = '&Yacute;';
      entities['222'] = '&THORN;';
      entities['223'] = '&szlig;';
      entities['224'] = '&agrave;';
      entities['225'] = '&aacute;';
      entities['226'] = '&acirc;';
      entities['227'] = '&atilde;';
      entities['228'] = '&auml;';
      entities['229'] = '&aring;';
      entities['230'] = '&aelig;';
      entities['231'] = '&ccedil;';
      entities['232'] = '&egrave;';
      entities['233'] = '&eacute;';
      entities['234'] = '&ecirc;';
      entities['235'] = '&euml;';
      entities['236'] = '&igrave;';
      entities['237'] = '&iacute;';
      entities['238'] = '&icirc;';
      entities['239'] = '&iuml;';
      entities['240'] = '&eth;';
      entities['241'] = '&ntilde;';
      entities['242'] = '&ograve;';
      entities['243'] = '&oacute;';
      entities['244'] = '&ocirc;';
      entities['245'] = '&otilde;';
      entities['246'] = '&ouml;';
      entities['247'] = '&divide;';
      entities['248'] = '&oslash;';
      entities['249'] = '&ugrave;';
      entities['250'] = '&uacute;';
      entities['251'] = '&ucirc;';
      entities['252'] = '&uuml;';
      entities['253'] = '&yacute;';
      entities['254'] = '&thorn;';
      entities['255'] = '&yuml;';
    } else {
        throw Error("Table: "+useTable+' not supported');
        return false;
    }
    
    // ascii decimals to real symbols
    for (decimal in entities) {
        symbol = String.fromCharCode(decimal);
        histogram[symbol] = entities[decimal];
    }
    
    return histogram;
  }
};

})();


/*-----------------------------------------------------------------------------
 *
 * XML
 * 
 */

/**
 * Get node text
 * 
 * Firefox 4k XML node limit fix
 * Website: http://www.coderholic.com/firefox-4k-xml-node-limit/
 * 
 * @method getNodeText 
 * @namespace SWEET.XML
 * @param {Object} xmlNode
 * @return {String}
 */
SWEET.XML.getNodeText = function(xmlNode) {
  if (!xmlNode) {
    return '';
  }
  if (typeof(xmlNode.textContent) != "undefined") {
    return xmlNode.textContent;
  }
  return xmlNode.firstChild.nodeValue;
};

/*-----------------------------------------------------------------------------
 *
 * PHP
 * 
 */

/**
 * Provides methods to convert to/from PHP objects
 * @module php
 */

/* PHP serialize/unserialize library.
 *
 * Copyright (C) 2005-2008 Ma Bingyao <andot@ujn.edu.cn>
 * Version: 4.2
 * LastModified: Oct 20, 2008
 * This library is free.  You can redistribute it and/or modify it.
 */

/**
 * Provides methods to serialize/unserialize to/from PHP strings.
 * @module php
 * @namespace SWEET.PHP
 * @class PHP
 * @static
 */
SWEET.PHP = (function () {

var prototypePropertyOfArray = function() {
  var result = {};
  for (var p in []) {
    result[p] = true;
  }
  return result;
}();

var prototypePropertyOfObject = function() {
  var result = {};
  for (var p in {}) {
    result[p] = true;
  }
  return result;
}();


/**
 * @method freeEvel
 * @param {Object} s
 * @private
 */
function freeEval(s) {
  return eval(s);
}

// Return the public API
return {
  /**
   * @method serialize
   * @param {Object} o
   * @return {String}
   * @static
   */
  serialize : function(o) {
    var p = 0, sb = [], ht = [], hv = 1;
    function getClassName(o) {
      if (typeof(o) == 'undefined' || typeof(o.constructor) == 'undefined') return '';
      var c = o.constructor.toString();
      c = c.substr(0, c.indexOf('(')).replace(/(^\s*function\s*)|(\s*$)/ig, '').toUTF8();
      return ((c == '') ? 'Object' : c);
    }
    function isInteger(n) {
      var i, s = n.toString(), l = s.length;
      if (l > 11) return false;
      for (i = (s.charAt(0) == '-') ? 1 : 0; i < l; i++) {
        switch (s.charAt(i)) {
          case '0':
          case '1':
          case '2':
          case '3':
          case '4':
          case '5':
          case '6':
          case '7':
          case '8':
          case '9': break;
          default : return false;
        }
      }
      return !(n < -2147483648 || n > 2147483647);
    }
    function inHashTable(o) {
      for (var i = 0; i < ht.length; i++) if (ht[i] === o) return i;
      return false;
    }
    function serializeNull() {
      sb[p++] = 'N;';
    }
    function serializeBoolean(b) {
      sb[p++] = (b ? 'b:1;' : 'b:0;');
    }
    function serializeInteger(i) {
      sb[p++] = 'i:' + i + ';';
    }
    function serializeDouble(d) {
      if (isNaN(d)) d = 'NAN';
      else if (d == Number.POSITIVE_INFINITY) d = 'INF';
      else if (d == Number.NEGATIVE_INFINITY) d = '-INF';
      sb[p++] = 'd:' + d + ';';
    }
    function serializeString(s) {
      var utf8 = s.toUTF8();
      sb[p++] = 's:' + utf8.length + ':"';
      sb[p++] = utf8;
      sb[p++] = '";';
    }
    function serializeDate(dt) {
      sb[p++] = 'O:11:"PHPRPC_Date":7:{';
      sb[p++] = 's:4:"year";';
      serializeInteger(dt.getFullYear());
      sb[p++] = 's:5:"month";';
      serializeInteger(dt.getMonth() + 1);
      sb[p++] = 's:3:"day";';
      serializeInteger(dt.getDate());
      sb[p++] = 's:4:"hour";';
      serializeInteger(dt.getHours());
      sb[p++] = 's:6:"minute";';
      serializeInteger(dt.getMinutes());
      sb[p++] = 's:6:"second";';
      serializeInteger(dt.getSeconds());
      sb[p++] = 's:11:"millisecond";';
      serializeInteger(dt.getMilliseconds());
      sb[p++] = '}';
    }
    function serializeArray(a) {
      sb[p++] = 'a:';
      var k, lp = p;
      sb[p++] = 0;
      sb[p++] = ':{';
      for (k in a) {
        if ((typeof(a[k]) != 'function') && !prototypePropertyOfArray[k]) {
          isInteger(k) ? serializeInteger(k) : serializeString(k);
          serialize(a[k]);
          sb[lp]++;
        }
      }
      sb[p++] = '}';
    }
    function serializeObject(o) {
      var cn = getClassName(o);
      if (cn == '') serializeNull();
      else if (typeof(o.serialize) != 'function') {
        sb[p++] = 'O:' + cn.length + ':"' + cn + '":';
        var lp = p;
        sb[p++] = 0;
        sb[p++] = ':{';
        var k;
        if (typeof(o.__sleep) == 'function') {
          var a = o.__sleep();
          for (k in a) {
            serializeString(a[k]);
            serialize(o[a[k]]);
            sb[lp]++;
          }
        }
        else {
          for (k in o) {
            if (typeof(o[k]) != 'function' && !prototypePropertyOfObject[k]) {
              serializeString(k);
              serialize(o[k]);
              sb[lp]++;
            }
          }
        }
        sb[p++] = '}';
      }
      else {
        var cs = o.serialize();
        sb[p++] = 'C:' + cn.length + ':"' + cn + '":' + cs.length + ':{' +cs + '}';
      }
    }
    function serializePointRef(R) {
      sb[p++] = 'R:' + R + ';';
    }
    function serializeRef(r) {
      sb[p++] = 'r:' + r + ';';
    }
    function serialize(o) {
      if (typeof(o) == "undefined" || o == null ||
        o.constructor == Function) {
        hv++;
        serializeNull();
        return;
      }
      var className = getClassName(o);
      switch (o.constructor) {
        case Boolean: {
          hv++;
          serializeBoolean(o);
          break;
        }
        case Number: {
          hv++;
          isInteger(o) ? serializeInteger(o) : serializeDouble(o);
          break;
        }
        case String: {
          hv++;
          serializeString(o);
          break;
        }
        case Date: {
          hv += 8;
          serializeDate(o);
          break;
        }
        default: {
          if (className == "Object" || o.constructor == Array) {
            var r = inHashTable(o);
            if (r) {
              serializePointRef(r);
            }
            else {
              ht[hv++] = o;
              serializeArray(o);
            }
            break;
          }
          else {
            var r = inHashTable(o);
            if (r) {
              hv++;
              serializeRef(r);
            }
            else {
              ht[hv++] = o;
              serializeObject(o);
            }
          }
        }
      }
    }
    serialize(o);
    return sb.join('');
  },
  /**
   * @method unseralize
   * @param {Object} ss
   * @return {Object}
   */
  unserialize : function(ss) {
    var p = 0, ht = [], hv = 1;
    function unserializeNull() {
      p++;
      return null;
    }
    function unserializeBoolean() {
      p++;
      var b = (ss.charAt(p++) == '1');
      p++;
      return b;
    }
    function unserializeInteger() {
      p++;
      var i = parseInt(ss.substring(p, p = ss.indexOf(';', p)));
      p++;
      return i;
    }
    function unserializeDouble() {
      p++;
      var d = ss.substring(p, p = ss.indexOf(';', p));
      switch (d) {
        case 'NAN': d = NaN; break;
        case 'INF': d = Number.POSITIVE_INFINITY; break;
        case '-INF': d = Number.NEGATIVE_INFINITY; break;
        default: d = parseFloat(d);
      }
      p++;
      return d;
    }
    function unserializeString() {
      p++;
      var l = parseInt(ss.substring(p, p = ss.indexOf(':', p)));
      p += 2;
      var s = ss.substring(p, p += l).toUTF16();
      p += 2;
      return s;
    }
    function unserializeEscapedString(len) {
      p++;
      var l = parseInt(ss.substring(p, p = ss.indexOf(':', p)));
      p += 2;
      var i, sb = new Array(l);
      for (i = 0; i < l; i++) {
        if ((sb[i] = ss.charAt(p++)) == '\\') {
          sb[i] = String.fromCharCode(parseInt(ss.substring(p, p += len), 16));
        }
      }
      p += 2;
      return sb.join('');
    }
    function unserializeArray() {
      p++;
      var n = parseInt(ss.substring(p, p = ss.indexOf(':', p)));
      p += 2;
      var i, k, a = [];
      ht[hv++] = a;
      for (i = 0; i < n; i++) {
        switch (ss.charAt(p++)) {
          case 'i': k = unserializeInteger(); break;
          case 's': k = unserializeString(); break;
          case 'S': k = unserializeEscapedString(2); break;
          case 'U': k = unserializeEscapedString(4); break;
          default: return false;
        }
        a[k] = unserialize();
      }
      p++;
      return a;
    }
    function unserializeDate(n) {
      var i, k, a = {};
      for (i = 0; i < n; i++) {
        switch (ss.charAt(p++)) {
          case 's': k = unserializeString(); break;
          case 'S': k = unserializeEscapedString(2); break;
          case 'U': k = unserializeEscapedString(4); break;
          default: return false;
        }
        if (ss.charAt(p++) == 'i') {
          a[k] = unserializeInteger();
        }
        else {
          return false;
        }
      }
      p++;
      var dt = new Date(
        a.year,
        a.month - 1,
        a.day,
        a.hour,
        a.minute,
        a.second,
        a.millisecond
      );
      ht[hv++] = dt;
      ht[hv++] = a.year;
      ht[hv++] = a.month;
      ht[hv++] = a.day;
      ht[hv++] = a.hour;
      ht[hv++] = a.minute;
      ht[hv++] = a.second;
      ht[hv++] = a.millisecond;
      return dt;
    }
    function unserializeObject() {
      p++;
      var l = parseInt(ss.substring(p, p = ss.indexOf(':', p)));
      p += 2;
      var cn = ss.substring(p, p += l).toUTF16();
      p += 2;
      var n = parseInt(ss.substring(p, p = ss.indexOf(':', p)));
      p += 2;
      if (cn == "PHPRPC_Date") {
        return unserializeDate(n);
      }
      var i, k, o = createObjectOfClass(cn);
      ht[hv++] = o;
      for (i = 0; i < n; i++) {
        switch (ss.charAt(p++)) {
          case 's': k = unserializeString(); break;
          case 'S': k = unserializeEscapedString(2); break;
          case 'U': k = unserializeEscapedString(4); break;
          default: return false;
        }
        if (k.charAt(0) == '\0') {
          k = k.substring(k.indexOf('\0', 1) + 1, k.length);
        }
        o[k] = unserialize();
      }
      p++;
      if (typeof(o.__wakeup) == 'function') o.__wakeup();
      return o;
    }
    function unserializeCustomObject() {
      p++;
      var l = parseInt(ss.substring(p, p = ss.indexOf(':', p)));
      p += 2;
      var cn = ss.substring(p, p += l).toUTF16();
      p += 2;
      var n = parseInt(ss.substring(p, p = ss.indexOf(':', p)));
      p += 2;
      var o = createObjectOfClass(cn);
      ht[hv++] = o;
      if (typeof(o.unserialize) != 'function') p += n;
      else o.unserialize(ss.substring(p, p += n));
      p++;
      return o;
    }
    function unserializeRef() {
      p++;
      var r = parseInt(ss.substring(p, p = ss.indexOf(';', p)));
      p++;
      return ht[r];
    }
    function getObjectOfClass(cn, poslist, i, c) {
      if (i < poslist.length) {
        var pos = poslist[i];
        cn[pos] = c;
        var obj = getObjectOfClass(cn, poslist, i + 1, '.');
        if (i + 1 < poslist.length) {
          if (obj == null) {
            obj = getObjectOfClass(cn, poslist, i + 1, '_');
          }
        }
        return obj;
      }
      var classname = cn.join('');
      try {
        return freeEval('new ' + classname + '()');
      }
      catch (e) {
        return null;
      }
    }
    function createObjectOfClass(classname) {
      if (freeEval('typeof(' + classname + ') == "function"')) {
        return freeEval('new ' + classname + '()');
      }
      var poslist = [];
      var pos = classname.indexOf("_");
      while (pos > -1) {
        poslist[poslist.length] = pos;
        pos = classname.indexOf("_", pos + 1);
      }
      if (poslist.length > 0) {
        var cn = classname.split('');
        var obj = getObjectOfClass(cn, poslist, 0, '.');
        if (obj == null) {
          obj = getObjectOfClass(cn, poslist, 0, '_');
        }
        if (obj != null) {
          return obj;
        }
      }
      return freeEval('new function ' + classname + '(){};');
    }
    function unserialize() {
      switch (ss.charAt(p++)) {
        case 'N': return ht[hv++] = unserializeNull();
        case 'b': return ht[hv++] = unserializeBoolean();
        case 'i': return ht[hv++] = unserializeInteger();
        case 'd': return ht[hv++] = unserializeDouble();
        case 's': return ht[hv++] = unserializeString();
        case 'S': return ht[hv++] = unserializeEscapedString(2);
        case 'U': return ht[hv++] = unserializeEscapedString(4);
        case 'r': return ht[hv++] = unserializeRef();
        case 'a': return unserializeArray();
        case 'O': return unserializeObject();
        case 'C': return unserializeCustomObject();
        case 'R': return unserializeRef();
        default: return false;
      }
    }
    return unserialize();
  }
};

})();


/*------------------------------------------------------------------------------
 * 
 * MAIL
 * 
 */

/**
 * Provides methods and class to mail service
 * @module mail
 */

/**
 * Job class used for with mail service
 * @namespace SWEET.mail
 * @class Job
 */
(function () {
  
  /**
   * Constructor
   * @return {Object}
   */
  var Job = function() {
    this.subject = null; 
    this.sender = null;
    this.replyTo = null;
    this.body = null;
    this.html = null;
    this.scheduledAt = null;
    this.createdAt = null;
  }
  
  SWEET.mail.Job = Job;
})();

/**
 * Queue class used for with mail service
 * @namespace SWEET.mail
 * @class Queue
 */
(function () {
  
  /**
   * Constructor
   * @return {Object}
   */
  var Queue = function() {
    this.jobId = null; 
    this.status = 'ACTIVE';
    this.type = 'batch';
    this.priority = 1;
    this.allowDup = true;
    this.createdAt = null;
  }
  
  SWEET.mail.Queue = Queue;
})();

/**
 * Message class used for with mail service
 * @namespace SWEET.mail
 * @class Message
 */
(function () {
  
  /**
   * Constructor
   * @return {Object}
   */
  var Message = function() {
    this.queueId = null;
    this.fullName = null;
    this.email = null;
    this.customData = null;
    this.format = 'mime';
    this.dataSource = 'netsuite';
    this.createdAt = null;
  }
  
  SWEET.mail.Message = Message;
})();


/*------------------------------------------------------------------------------
 * 
 * B2C
 * 
 */

/**
 * B2C user class used with b2c service
 * @namespace SWEET.B2C
 * @class User
 * @property {String} cortexid
 * @property {String} firstname
 * @property {String} lastname
 * @property {String} emailaddress
 * @property {String} password
 * @property {String} defaultgroup
 * @property {Object} groups
 */
(function () {
  
  /**
   * Constructor
   * @return {Object}
   */
  var User = function() {
    this.cortexid = null;
    this.firstname = null;
    this.lastname = null;
    this.emailaddress = null;
    this.password = 'w0rk0ut';
    this.defaultgroup = '4'; // Workout basic
    this.groups = {
        registeredBasic   : '70',
        registeredPremium : '71'
    };
  }
  
  SWEET.B2C.User = User;
})();

/*------------------------------------------------------------------------------
 * 
 * REST
 * 
 */

/**
 * Provides methods and class to communicate with REST webservices
 * @module REST
 */

/**
 * REST Client
 * @namespace SWEET.REST
 * @class Client
 */
(function () {
  
  /**
   * Constructor
   * @return {Object}
   */
  var Client = function(baseUrl) {
    this.baseUrl = baseUrl;
    this.format = 'json'; // JSON is currently the only supported format
    this.apiKey = null;
    this.authorization = false;
    this.authType = 'Basic'; // Basic Auth is currently the only supported method
    this.username = null;
    this.password = null;
    
    /**
     * Set API key
     * @param {String} apiKey
     */
    this.setAPIKey = function(apiKey){
      this.apiKey = apiKey;
    }
    
    /**
     * Enable Authorization
     * @param {String} username
     * @param {String} password
     */
    this.enableAuthorization = function(username, password){
      this.authorization = true;
      this.username = username;
      this.password = password;
    }
    
    /**
     * Disable Authorization
     */
    this.disableAuthorization = function(){
      this.authorization = false;
      this.username = null;
      this.password = null;
    }
    
    /**
     * Show resource
     * @param {String} resourceName
     * @param {String} resourceId
     * @method show
     */
    this.show = function(resourceName, resourceId) {
      if (!resourceName) {
        throw nlapiCreateError('SWEET_INVALID_INPUT', 'Resource name is required.');
      }
      if (!resourceId) {
        throw nlapiCreateError('SWEET_INVALID_INPUT', 'Resource id is required.');
      }
      
      // GET request
      var url = this.baseUrl + '/' + resourceName + '/' + resourceId + '.json';
      var headers = new Array();
      if (this.apiKey) {
        url = url + '?apikey=' + this.apiKey;
        
      }
      if (this.authorization) {
        headers['Authorization'] = 'Basic ' + SWEET.Base64.encode(this.username + ':' + this.password);
      }
      var wsResponse = nlapiRequestURL(url, null, headers);
      
      // Error handling
      if (parseInt(wsResponse.getCode()) != 200) {
        throw nlapiCreateError('SWEET_WEBSERVICE_ERROR', 'Failed to show resource (' + wsResponse.getCode() + ')');
      }
      if (!wsResponse.getBody() || wsResponse.getBody().length < 1) {
        throw nlapiCreateError('SWEET_WEBSERVICE_ERROR', 'Empty response body found when not expecting it.');
      }
      
      // Parse and return response
      var responseObj = YAHOO.lang.JSON.parse(wsResponse.getBody());
      return responseObj;
    }

    /**
     * Create resource
     * @param {String} resourceName
     * @param {Object} obj
     * @method create
     */
    this.create = function(resourceName, obj) {
      if (!resourceName) {
        throw nlapiCreateError('SWEET_INVALID_INPUT', 'Resource name is required.');
      }
      if (!obj) {
        throw nlapiCreateError('SWEET_INVALID_INPUT', 'Resource object is required.');
      }
      
      // Convert object to request format
      // Only JSON is supported at the moment.
      var requestStr = YAHOO.lang.JSON.stringify(obj);
      
      // POST request
      var url = this.baseUrl + '/' + resourceName + '.json';
      var headers = new Array();
      if (this.apiKey) {
        url = url + '?apikey=' + this.apiKey;
        
      }
      if (this.authorization) {
        headers['Authorization'] = 'Basic ' + SWEET.Base64.encode(this.username + ':' + this.password);
      }
      var wsResponse = nlapiRequestURL(url, requestStr, headers);
      
      // Error handling
      if (parseInt(wsResponse.getCode()) != 200) {
        throw nlapiCreateError('SWEET_WEBSERVICE_ERROR', 'Failed to create resource (' + wsResponse.getCode() + ')');
      }
      if (!wsResponse.getBody() || wsResponse.getBody().length < 1) {
        throw nlapiCreateError('SWEET_WEBSERVICE_ERROR', 'Empty response body found when not expecting it.');
      }
      
      // Parse and return response
      var responseObj = YAHOO.lang.JSON.parse(wsResponse.getBody());
      return responseObj;
    }
    
    /**
     * Edit resource
     * @param {String} resourceName
     * @param {String} resourceId
     * @param {Object} obj
     * @method create
     */
    this.edit = function(resourceName, resourceId, obj) {
      if (!resourceName) {
        throw nlapiCreateError('SWEET_INVALID_INPUT', 'Resource name is required.');
      }
      if (!obj) {
        throw nlapiCreateError('SWEET_INVALID_INPUT', 'Resource object is required.');
      }
      
      // Convert object to request format
      // Only JSON is supported at the moment.
      var requestStr = YAHOO.lang.JSON.stringify(obj);
      
      // POST request
      var headers = new Array();
      headers['RESTMETHOD'] = 'PUT'; // Webservice is expecting a PUT not POST.
      var url = this.baseUrl + '/' + resourceName + '/' + resourceId + '.json';
      if (this.apiKey) {
        url = url + '?apikey=' + this.apiKey;
      }
      if (this.authorization) {
        headers['Authorization'] = 'Basic ' + SWEET.Base64.encode(this.username + ':' + this.password);
      }
      var wsResponse = nlapiRequestURL(url, requestStr, headers);
      
      // Error handling
      if (parseInt(wsResponse.getCode()) != 200) {
        throw nlapiCreateError('SWEET_WEBSERVICE_ERROR', 'Failed to edit resource (' + wsResponse.getCode() + ': ' + wsResponse.getBody() + ')');
      }
      if (!wsResponse.getBody() || wsResponse.getBody().length < 1) {
        throw nlapiCreateError('SWEET_WEBSERVICE_ERROR', 'Empty response body found when not expecting it.');
      }
      
      // Parse and return response
      var responseObj = YAHOO.lang.JSON.parse(wsResponse.getBody());
      return responseObj;
    }
  }
  
  SWEET.REST.Client = Client;
})();
