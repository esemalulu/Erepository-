/**
 * @NModuleScope Public 
 * @NApiVersion 2.x
 */
define([], function (){

	/** Script: hmac-shal.js **/
	//////////////////////////////////////////
	/*
	CryptoJS v3.1.2
	code.google.com/p/crypto-js
	(c) 2009-2013 by Jeff Mott. All rights reserved.
	code.google.com/p/crypto-js/wiki/License
	*/
	var CryptoJS=CryptoJS||function(g,l){var e={},d=e.lib={},m=function(){},k=d.Base={extend:function(a){m.prototype=this;var c=new m;a&&c.mixIn(a);c.hasOwnProperty("init")||(c.init=function(){c.$super.init.apply(this,arguments)});c.init.prototype=c;c.$super=this;return c},create:function(){var a=this.extend();a.init.apply(a,arguments);return a},init:function(){},mixIn:function(a){for(var c in a)a.hasOwnProperty(c)&&(this[c]=a[c]);a.hasOwnProperty("toString")&&(this.toString=a.toString)},clone:function(){return this.init.prototype.extend(this)}},
	p=d.WordArray=k.extend({init:function(a,c){a=this.words=a||[];this.sigBytes=c!=l?c:4*a.length},toString:function(a){return(a||n).stringify(this)},concat:function(a){var c=this.words,q=a.words,f=this.sigBytes;a=a.sigBytes;this.clamp();if(f%4)
	{
		for(var b=0;b<a;b++) {c[f+b>>>2]|=(q[b>>>2]>>>24-8*(b%4)&255)<<24-8*((f+b)%4);}
	}
	else if(65535<q.length)
	{
		for(b=0;b<a;b+=4) {c[f+b>>>2]=q[b>>>2];}
	} else {c.push.apply(c,q);}this.sigBytes+=a;return this},clamp:function(){var a=this.words,c=this.sigBytes;a[c>>>2]&=4294967295<<
	32-8*(c%4);a.length=g.ceil(c/4)},clone:function(){var a=k.clone.call(this);a.words=this.words.slice(0);return a},random:function(a){for(var c=[],b=0;b<a;b+=4) {c.push(4294967296*g.random()|0);}return new p.init(c,a)}}),b=e.enc={},n=b.Hex={stringify:function(a){var c=a.words;a=a.sigBytes;for(var b=[],f=0;f<a;f++){var d=c[f>>>2]>>>24-8*(f%4)&255;b.push((d>>>4).toString(16));b.push((d&15).toString(16))}return b.join("")},parse:function(a){for(var c=a.length,b=[],f=0;f<c;f+=2) {b[f>>>3]|=parseInt(a.substr(f,
	2),16)<<24-4*(f%8);}return new p.init(b,c/2)}},j=b.Latin1={stringify:function(a){var c=a.words;a=a.sigBytes;for(var b=[],f=0;f<a;f++) {b.push(String.fromCharCode(c[f>>>2]>>>24-8*(f%4)&255));}return b.join("")},parse:function(a){for(var c=a.length,b=[],f=0;f<c;f++) {b[f>>>2]|=(a.charCodeAt(f)&255)<<24-8*(f%4);}return new p.init(b,c)}},h=b.Utf8={stringify:function(a){try{return decodeURIComponent(escape(j.stringify(a)))}catch(c){throw Error("Malformed UTF-8 data");}},parse:function(a){return j.parse(unescape(encodeURIComponent(a)))}},
	r=d.BufferedBlockAlgorithm=k.extend({reset:function(){this._data=new p.init;this._nDataBytes=0},_append:function(a){"string"==typeof a&&(a=h.parse(a));this._data.concat(a);this._nDataBytes+=a.sigBytes},_process:function(a){var c=this._data,b=c.words,f=c.sigBytes,d=this.blockSize,e=f/(4*d),e=a?g.ceil(e):g.max((e|0)-this._minBufferSize,0);a=e*d;f=g.min(4*a,f);if(a){for(var k=0;k<a;k+=d) {this._doProcessBlock(b,k);}k=b.splice(0,a);c.sigBytes-=f}return new p.init(k,f)},clone:function(){var a=k.clone.call(this);
	a._data=this._data.clone();return a},_minBufferSize:0});d.Hasher=r.extend({cfg:k.extend(),init:function(a){this.cfg=this.cfg.extend(a);this.reset()},reset:function(){r.reset.call(this);this._doReset()},update:function(a){this._append(a);this._process();return this},finalize:function(a){a&&this._append(a);return this._doFinalize()},blockSize:16,_createHelper:function(a){return function(b,d){return(new a.init(d)).finalize(b)}},_createHmacHelper:function(a){return function(b,d){return(new s.HMAC.init(a,
	d)).finalize(b)}}});var s=e.algo={};return e}(Math);
	(function(){var g=CryptoJS,l=g.lib,e=l.WordArray,d=l.Hasher,m=[],l=g.algo.SHA1=d.extend({_doReset:function(){this._hash=new e.init([1732584193,4023233417,2562383102,271733878,3285377520])},_doProcessBlock:function(d,e){for(var b=this._hash.words,n=b[0],j=b[1],h=b[2],g=b[3],l=b[4],a=0;80>a;a++){if(16>a){m[a]=d[e+a]|0;}else{var c=m[a-3]^m[a-8]^m[a-14]^m[a-16];m[a]=c<<1|c>>>31}c=(n<<5|n>>>27)+l+m[a];c=20>a?c+((j&h|~j&g)+1518500249):40>a?c+((j^h^g)+1859775393):60>a?c+((j&h|j&g|h&g)-1894007588):c+((j^h^
	g)-899497514);l=g;g=h;h=j<<30|j>>>2;j=n;n=c}b[0]=b[0]+n|0;b[1]=b[1]+j|0;b[2]=b[2]+h|0;b[3]=b[3]+g|0;b[4]=b[4]+l|0},_doFinalize:function(){var d=this._data,e=d.words,b=8*this._nDataBytes,g=8*d.sigBytes;e[g>>>5]|=128<<24-g%32;e[(g+64>>>9<<4)+14]=Math.floor(b/4294967296);e[(g+64>>>9<<4)+15]=b;d.sigBytes=4*e.length;this._process();return this._hash},clone:function(){var e=d.clone.call(this);e._hash=this._hash.clone();return e}});g.SHA1=d._createHelper(l);g.HmacSHA1=d._createHmacHelper(l)})();
	(function(){var g=CryptoJS,l=g.enc.Utf8;g.algo.HMAC=g.lib.Base.extend({init:function(e,d){e=this._hasher=new e.init;"string"==typeof d&&(d=l.parse(d));var g=e.blockSize,k=4*g;d.sigBytes>k&&(d=e.finalize(d));d.clamp();for(var p=this._oKey=d.clone(),b=this._iKey=d.clone(),n=p.words,j=b.words,h=0;h<g;h++) {n[h]^=1549556828,j[h]^=909522486;}p.sigBytes=b.sigBytes=k;this.reset()},reset:function(){var e=this._hasher;e.reset();e.update(this._iKey)},update:function(e){this._hasher.update(e);return this},finalize:function(e){var d=
	this._hasher;e=d.finalize(e);d.reset();return d.finalize(this._oKey.clone().concat(e))}})})();
	//////////////////////////////////////////

	/** Script: enc-base64-min.js **/
	//////////////////////////////////////////
	/*
	CryptoJS v3.1.2
	code.google.com/p/crypto-js
	(c) 2009-2013 by Jeff Mott. All rights reserved.
	code.google.com/p/crypto-js/wiki/License
	*/
	(function(){var h=CryptoJS,j=h.lib.WordArray;h.enc.Base64={stringify:function(b){var e=b.words,f=b.sigBytes,c=this._map;b.clamp();b=[];for(var a=0;a<f;a+=3)
	{
		for(var d=(e[a>>>2]>>>24-8*(a%4)&255)<<16|(e[a+1>>>2]>>>24-8*((a+1)%4)&255)<<8|e[a+2>>>2]>>>24-8*((a+2)%4)&255,g=0;4>g&&a+0.75*g<f;g++) {b.push(c.charAt(d>>>6*(3-g)&63));}
	}if(e=c.charAt(64))
	{
		for(;b.length%4;) {b.push(e);}
	}return b.join("")},parse:function(b){var e=b.length,f=this._map,c=f.charAt(64);c&&(c=b.indexOf(c),-1!=c&&(e=c));for(var c=[],a=0,d=0;d<
	e;d++)
	{
		if(d%4){var g=f.indexOf(b.charAt(d-1))<<2*(d%4),h=f.indexOf(b.charAt(d))>>>6-2*(d%4);c[a>>>2]|=(g|h)<<24-8*(a%4);a++}
	}return j.create(c,a)},_map:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="}})();
	//////////////////////////////////////////


	var OAuth; if (OAuth == null){OAuth = {};}

	OAuth.setProperties = function setProperties(into, from) {
	    if (into != null && from != null) {
	        for (var key in from) {
	            into[key] = from[key];
	        }
	    }
	    return into;
	}

	OAuth.setProperties(OAuth, // utility functions
	{
	    percentEncode: function percentEncode(s) {
	        if (s == null) {
	            return "";
	        }
	        if (s instanceof Array) {
	            var e = "";
	            for (var i = 0; i < s.length; ++s) {
	                if (e != ""){e += '&';}
	                e += OAuth.percentEncode(s[i]);
	            }
	            return e;
	        }
	        s = encodeURIComponent(s);
	        // Now replace the values which encodeURIComponent doesn't do
	        // encodeURIComponent ignores: - _ . ! ~ * ' ( )
	        // OAuth dictates the only ones you can ignore are: - _ . ~
	        // Source: http://developer.mozilla.org/en/docs/Core_JavaScript_1.5_Reference:Global_Functions:encodeURIComponent
	        s = s.replace(/\!/g, "%21");
	        s = s.replace(/\*/g, "%2A");
	        s = s.replace(/\'/g, "%27");
	        s = s.replace(/\(/g, "%28");
	        s = s.replace(/\)/g, "%29");
	        return s;
	    }
	,
	    decodePercent: function decodePercent(s) {
	        if (s != null) {
	            // Handle application/x-www-form-urlencoded, which is defined by
	            // http://www.w3.org/TR/html4/interact/forms.html#h-17.13.4.1
	            s = s.replace(/\+/g, " ");
	        }
	        return decodeURIComponent(s);
	    }
	,
	    /** Convert the given parameters to an Array of name-value pairs. */
	    getParameterList: function getParameterList(parameters) {
	        if (parameters == null) {
	            return [];
	        }
	        if (typeof parameters != "object") {
	            return OAuth.decodeForm(parameters + "");
	        }
	        if (parameters instanceof Array) {
	            return parameters;
	        }
	        var list = [];
	        for (var p in parameters) {
	            list.push([p, parameters[p]]);
	        }
	        return list;
	    }
	,
	    /** Convert the given parameters to a map from name to value. */
	    getParameterMap: function getParameterMap(parameters) {
	        if (parameters == null) {
	            return {};
	        }
	        if (typeof parameters != "object") {
	            return OAuth.getParameterMap(OAuth.decodeForm(parameters + ""));
	        }
	        if (parameters instanceof Array) {
	            var map = {};
	            for (var p = 0; p < parameters.length; ++p) {
	                var key = parameters[p][0];
	                if (map[key] === undefined) { // first value wins
	                    map[key] = parameters[p][1];
	                }
	            }
	            return map;
	        }
	        return parameters;
	    }
	,
	    getParameter: function getParameter(parameters, name) {
	        if (parameters instanceof Array) {
	            for (var p = 0; p < parameters.length; ++p) {
	                if (parameters[p][0] == name) {
	                    return parameters[p][1]; // first value wins
	                }
	            }
	        } else {
	            return OAuth.getParameterMap(parameters)[name];
	        }
	        return null;
	    }
	,
	    formEncode: function formEncode(parameters) {
	        var form = "";
	        var list = OAuth.getParameterList(parameters);
	        for (var p = 0; p < list.length; ++p) {
	            var value = list[p][1];
	            if (value == null){value = "";}
	            if (form != ""){form += '&';}
	            form += OAuth.percentEncode(list[p][0])
	              +'='+ OAuth.percentEncode(value);
	        }
	        return form;
	    }
	,
	    decodeForm: function decodeForm(form) {
	        var list = [];
	        var nvps = form.split('&');
	        for (var n = 0; n < nvps.length; ++n) {
	            var nvp = nvps[n];
	            if (nvp == "") {
	                continue;
	            }
	            var equals = nvp.indexOf('=');
	            var name;
	            var value;
	            if (equals < 0) {
	                name = OAuth.decodePercent(nvp);
	                value = null;
	            } else {
	                name = OAuth.decodePercent(nvp.substring(0, equals));
	                value = OAuth.decodePercent(nvp.substring(equals + 1));
	            }
	            list.push([name, value]);
	        }
	        return list;
	    }
	,
	    setParameter: function setParameter(message, name, value) {
	        var parameters = message.parameters;
	        if (parameters instanceof Array) {
	            for (var p = 0; p < parameters.length; ++p) {
	                if (parameters[p][0] == name) {
	                    if (value === undefined) {
	                        parameters.splice(p, 1);
	                    } else {
	                        parameters[p][1] = value;
	                        value = undefined;
	                    }
	                }
	            }
	            if (value !== undefined) {
	                parameters.push([name, value]);
	            }
	        } else {
	            parameters = OAuth.getParameterMap(parameters);
	            parameters[name] = value;
	            message.parameters = parameters;
	        }
	    }
	,
	    setParameters: function setParameters(message, parameters) {
	        var list = OAuth.getParameterList(parameters);
	        for (var i = 0; i < list.length; ++i) {
	            OAuth.setParameter(message, list[i][0], list[i][1]);
	        }
	    }
	,
	    /** Fill in parameters to help construct a request message.
	        This function doesn't fill in every parameter.
	        The accessor object should be like:
	        {consumerKey:'foo', consumerSecret:'bar', accessorSecret:'nurn', token:'krelm', tokenSecret:'blah'}
	        The accessorSecret property is optional.
	     */
	    completeRequest: function completeRequest(message, accessor) {
	        if (message.method == null) {
	            message.method = "GET";
	        }
	        var map = OAuth.getParameterMap(message.parameters);
	        if (map.oauth_consumer_key == null) {
	            OAuth.setParameter(message, "oauth_consumer_key", accessor.consumerKey || "");
	        }
	        if (map.oauth_token == null && accessor.token != null) {
	            OAuth.setParameter(message, "oauth_token", accessor.token);
	        }
	        if (map.oauth_version == null) {
	            OAuth.setParameter(message, "oauth_version", "1.0");
	        }
	        if (map.oauth_timestamp == null) {
	            OAuth.setParameter(message, "oauth_timestamp", OAuth.timestamp());
	        }
	        if (map.oauth_nonce == null) {
	            OAuth.setParameter(message, "oauth_nonce", OAuth.nonce(6));
	        }
	        OAuth.SignatureMethod.sign(message, accessor);
	    }
	,
	    setTimestampAndNonce: function setTimestampAndNonce(message) {
	        OAuth.setParameter(message, "oauth_timestamp", OAuth.timestamp());
	        OAuth.setParameter(message, "oauth_nonce", OAuth.nonce(6));
	    }
	,
	    addToURL: function addToURL(url, parameters) {
	        newURL = url;
	        if (parameters != null) {
	            var toAdd = OAuth.formEncode(parameters);
	            if (toAdd.length > 0) {
	                var q = url.indexOf('?');
	                if (q < 0){newURL += '?';} else {newURL += '&';}
	                newURL += toAdd;
	            }
	        }
	        return newURL;
	    }
	,
	    /** Construct the value of the Authorization header for an HTTP request. */
	    getAuthorizationHeader: function getAuthorizationHeader(realm, parameters) {
	        var header = 'OAuth realm="' + OAuth.percentEncode(realm) + '"';
	        var list = OAuth.getParameterList(parameters);
	        for (var p = 0; p < list.length; ++p) {
	            var parameter = list[p];
	            var name = parameter[0];
	            if (name.indexOf("oauth_") == 0) {
	                header += ',' + OAuth.percentEncode(name) + '="' + OAuth.percentEncode(parameter[1]) + '"';
	            }
	        }
	        return header;
	    }
	,
	    /** Correct the time using a parameter from the URL from which the last script was loaded. */
	    correctTimestampFromSrc: function correctTimestampFromSrc(parameterName) {
	        parameterName = parameterName || "oauth_timestamp";
	        var scripts = document.getElementsByTagName('script');
	        if (scripts == null || !scripts.length)
			{
				return;
			}
	        var src = scripts[scripts.length-1].src;
	        if (!src)
			{
				return;
			}
	        var q = src.indexOf("?");
	        if (q < 0)
			{
				return;
			}
	        parameters = OAuth.getParameterMap(OAuth.decodeForm(src.substring(q+1)));
	        var t = parameters[parameterName];
	        if (t == null)
			{
				return;
			}
	        OAuth.correctTimestamp(t);
	    }
	,
	    /** Generate timestamps starting with the given value. */
	    correctTimestamp: function correctTimestamp(timestamp) {
	        OAuth.timeCorrectionMsec = (timestamp * 1000) - (new Date()).getTime();
	    }
	,
	    /** The difference between the correct time and my clock. */
	    timeCorrectionMsec: 0
	,
	    timestamp: function timestamp() {
	        var t = (new Date()).getTime() + OAuth.timeCorrectionMsec;
	        return Math.floor(t / 1000);
	    }
	,
	    nonce: function nonce(length) {
	        var chars = OAuth.nonce.CHARS;
	        var result = "";
	        for (var i = 0; i < length; ++i) {
	            var rnum = Math.floor(Math.random() * chars.length);
	            result += chars.substring(rnum, rnum+1);
	        }
	        return result;
	    }
	});

	OAuth.nonce.CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";

	/** Define a constructor function,
	    without causing trouble to anyone who was using it as a namespace.
	    That is, if parent[name] already existed and had properties,
	    copy those properties into the new constructor.
	 */
	OAuth.declareClass = function declareClass(parent, name, newConstructor) {
	    var previous = parent[name];
	    parent[name] = newConstructor;
	    if (newConstructor != null && previous != null) {
	        for (var key in previous) {
	            if (key != "prototype") {
	                newConstructor[key] = previous[key];
	            }
	        }
	    }
	    return newConstructor;
	}

	/** An abstract algorithm for signing messages. */
	OAuth.declareClass(OAuth, "SignatureMethod", function OAuthSignatureMethod(){});

	OAuth.setProperties(OAuth.SignatureMethod.prototype, // instance members
	{
	    /** Add a signature to the message. */
	    sign: function sign(message) {
	        var baseString = OAuth.SignatureMethod.getBaseString(message);
	        var signature = this.getSignature(baseString);
	        OAuth.setParameter(message, "oauth_signature", signature);
	        return signature; // just in case someone's interested
	    }
	,
	    /** Set the key string for signing. */
	    initialize: function initialize(name, accessor) {
	        var consumerSecret;
	        if (accessor.accessorSecret != null
	            && name.length > 9
	            && name.substring(name.length-9) == "-Accessor")
	        {
	            consumerSecret = accessor.accessorSecret;
	        } else {
	            consumerSecret = accessor.consumerSecret;
	        }
	        this.key = OAuth.percentEncode(consumerSecret)
	             +"&"+ OAuth.percentEncode(accessor.tokenSecret);
	    }
	});

	/* SignatureMethod expects an accessor object to be like this:
	   {tokenSecret: "lakjsdflkj...", consumerSecret: "QOUEWRI..", accessorSecret: "xcmvzc..."}
	   The accessorSecret property is optional.
	 */
	// Class members:
	OAuth.setProperties(OAuth.SignatureMethod, // class members
	{
	    sign: function sign(message, accessor) {
	        var name = OAuth.getParameterMap(message.parameters).oauth_signature_method;
	        if (name == null || name == "") {
	            name = "HMAC-SHA1";
	            OAuth.setParameter(message, "oauth_signature_method", name);
	        }
	        OAuth.SignatureMethod.newMethod(name, accessor).sign(message);
	    }
	,
	    /** Instantiate a SignatureMethod for the given method name. */
	    newMethod: function newMethod(name, accessor) {
	        var impl = OAuth.SignatureMethod.REGISTERED[name];
	        if (impl != null) {
	            var method = new impl();
	            method.initialize(name, accessor);
	            return method;
	        }
	        var err = new Error("signature_method_rejected");
	        var acceptable = "";
	        for (var r in OAuth.SignatureMethod.REGISTERED) {
	            if (acceptable != ""){acceptable += '&';}
	            acceptable += OAuth.percentEncode(r);
	        }
	        err.oauth_acceptable_signature_methods = acceptable;
	        throw err;
	    }
	,
	    /** A map from signature method name to constructor. */
	    REGISTERED : {}
	,
	    /** Subsequently, the given constructor will be used for the named methods.
	        The constructor will be called with no parameters.
	        The resulting object should usually implement getSignature(baseString).
	        You can easily define such a constructor by calling makeSubclass, below.
	     */
	    registerMethodClass: function registerMethodClass(names, classConstructor) {
	        for (var n = 0; n < names.length; ++n) {
	            OAuth.SignatureMethod.REGISTERED[names[n]] = classConstructor;
	        }
	    }
	,
	    /** Create a subclass of OAuth.SignatureMethod, with the given getSignature function. */
	    makeSubclass: function makeSubclass(getSignatureFunction) {
	        var superClass = OAuth.SignatureMethod;
	        var subClass = function() {
	            superClass.call(this);
	        };
	        subClass.prototype = new superClass();
	        // Delete instance variables from prototype:
	        // delete subclass.prototype... There aren't any.
	        subClass.prototype.getSignature = getSignatureFunction;
	        subClass.prototype.constructor = subClass;
	        return subClass;
	    }
	,
	    getBaseString: function getBaseString(message) {
	        var URL = message.action;
	        var q = URL.indexOf('?');
	        var parameters;
	        if (q < 0) {
	            parameters = message.parameters;
	        } else {
	            // Combine the URL query string with the other parameters:
	            parameters = OAuth.decodeForm(URL.substring(q + 1));
	            var toAdd = OAuth.getParameterList(message.parameters);
	            for (var a = 0; a < toAdd.length; ++a) {
	                parameters.push(toAdd[a]);
	            }
	        }
	        return OAuth.percentEncode(message.method.toUpperCase())
	         +'&'+ OAuth.percentEncode(OAuth.SignatureMethod.normalizeUrl(URL))
	         +'&'+ OAuth.percentEncode(OAuth.SignatureMethod.normalizeParameters(parameters));
	    }
	,
	    normalizeUrl: function normalizeUrl(url) {
	        var uri = OAuth.SignatureMethod.parseUri(url);
	        var scheme = uri.protocol.toLowerCase();
	        var authority = uri.authority.toLowerCase();
	        var dropPort = (scheme == "http" && uri.port == 80)
	                    || (scheme == "https" && uri.port == 443);
	        if (dropPort) {
	            // find the last : in the authority
	            var index = authority.lastIndexOf(":");
	            if (index >= 0) {
	                authority = authority.substring(0, index);
	            }
	        }
	        var path = uri.path;
	        if (!path) {
	            path = "/"; // conforms to RFC 2616 section 3.2.2
	        }
	        // we know that there is no query and no fragment here.
	        return scheme + "://" + authority + path;
	    }
	,
	    parseUri: function parseUri (str) {
	        /* This function was adapted from parseUri 1.2.1
	           http://stevenlevithan.com/demo/parseuri/js/assets/parseuri.js
	         */
	        var o = {key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
	                 parser: {strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@\/]*):?([^:@\/]*))?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/ }};
	        var m = o.parser.strict.exec(str);
	        var uri = {};
	        var i = 14;
	        while (i--){uri[o.key[i]] = m[i] || "";}
	        return uri;
	    }
	,
	    normalizeParameters: function normalizeParameters(parameters) {
	        if (parameters == null) {
	            return "";
	        }
	        var list = OAuth.getParameterList(parameters);
	        var sortable = [];
	        for (var p = 0; p < list.length; ++p) {
	            var nvp = list[p];
	            if (nvp[0] != "oauth_signature") {
	                sortable.push([ OAuth.percentEncode(nvp[0])
	                              + " " // because it comes before any character that can appear in a percentEncoded string.
	                              + OAuth.percentEncode(nvp[1])
	                              , nvp]);
	            }
	        }
	        sortable.sort(function(a,b) {
	                          if (a[0] < b[0])
							{
								return  -1;
							}
	                          if (a[0] > b[0])
							{
								return 1;
							}
	                          return 0;
	                      });
	        var sorted = [];
	        for (var s = 0; s < sortable.length; ++s) {
	            sorted.push(sortable[s][1]);
	        }
	        return OAuth.formEncode(sorted);
	    }
	});

	OAuth.SignatureMethod.registerMethodClass(["PLAINTEXT", "PLAINTEXT-Accessor"],
	    OAuth.SignatureMethod.makeSubclass(
	        function getSignature(baseString) {
	            return this.key;
	        }
	    ));

	OAuth.SignatureMethod.registerMethodClass(["HMAC-SHA1", "HMAC-SHA1-Accessor"],
	    OAuth.SignatureMethod.makeSubclass(
	        function getSignature(baseString) {
	            b64pad = '=';
	            var signature = b64_hmac_sha1(this.key, baseString);
	            return signature;
	        }
	    ));

	try {
	    OAuth.correctTimestampFromSrc();
	} catch(e) {
	}



	/**Module Description
	 *
	 * Version    Date            Author           Remarks
	 * 1.00       25 Apr 2016     jtarko
	 *
	 */
	if (typeof(module) !== 'undefined' && typeof(exports) !== 'undefined') {
	    module.exports = OAuth;
	    var CryptoJS = require("crypto-js");
	}

	/**
	 * Constructor
	 * @param {Object} opts consumer key and secret
	 */
	function OAuth(opts) {
	    if(!(this instanceof OAuth)) {
	        return new OAuth(opts);
	    }

	    if(!opts) {
	        opts = {};
	    }

	    if(!opts.consumer) {
	        throw new Error('consumer option is required');
	    }

	    this.consumer            = opts.consumer;
	    this.signature_method    = opts.signature_method || 'HMAC-SHA1';
	    this.nonce_length        = opts.nonce_length || 32;
	    this.version             = opts.version || '1.0';
	    this.parameter_seperator = opts.parameter_seperator || ', ';

	    if(typeof opts.last_ampersand === 'undefined') {
	        this.last_ampersand = true;
	    } else {
	        this.last_ampersand = opts.last_ampersand;
	    }

	    switch (this.signature_method) {
	        case 'HMAC-SHA1':
	            this.hash = function(base_string, key) {
	                return CryptoJS.HmacSHA1(base_string, key).toString(CryptoJS.enc.Base64);
	            };
	            break;

	        case 'HMAC-SHA256':
	            this.hash = function(base_string, key) {
	                return CryptoJS.HmacSHA256(base_string, key).toString(CryptoJS.enc.Base64);
	            };
	            break;

	        case 'PLAINTEXT':
	            this.hash = function(base_string, key) {
	                return key;
	            };
	            break;

	        case 'RSA-SHA1':
	            throw new Error('oauth-1.0a does not support this signature method right now. Coming Soon...');
	        default:
	            throw new Error('The OAuth 1.0a protocol defines three signature methods: HMAC-SHA1, RSA-SHA1, and PLAINTEXT only');
	    }
	}

	/**
	 * OAuth request authorize
	 * @param  {Object} request data
	 * {
	 *     method,
	 *     url,
	 *     data
	 * }
	 * @param  {Object} public and secret token
	 * @return {Object} OAuth Authorized data
	 */
	OAuth.prototype.authorize = function(request, token) {
	    var oauth_data = {
	        oauth_consumer_key: this.consumer.public,
	        oauth_nonce: this.getNonce(),
	        oauth_signature_method: this.signature_method,
	        oauth_timestamp: this.getTimeStamp(),
	        oauth_version: this.version
	    };

	    if(!token) {
	        token = {};
	    }

	    if(token.public) {
	        oauth_data.oauth_token = token.public;
	    }

	    if(!request.data) {
	        request.data = {};
	    }

	    //oauth_data.oauth_signature = this.getSignature(request, token.secret, oauth_data);
	    //var baseString = this.signature_method.getBaseString(request);
	    //var baseString;
	    oauth_data.oauth_signature = this.getSignature(request, token.secret, oauth_data);

	    return oauth_data;
	};

	/**
	 * Create a OAuth Signature
	 * @param  {Object} request data
	 * @param  {Object} token_secret public and secret token
	 * @param  {Object} oauth_data   OAuth data
	 * @return {String} Signature
	 */
	OAuth.prototype.getSignature = function(request, token_secret, oauth_data) {
	    return this.hash(this.getBaseString(request, oauth_data), this.getSigningKey(token_secret));
	};

	/**
	 * Base String = Method + Base Url + ParameterString
	 * @param  {Object} request data
	 * @param  {Object} OAuth data
	 * @return {String} Base String
	 */
	OAuth.prototype.getBaseString = function(request, oauth_data) {
	    return request.method.toUpperCase() + '&' + this.percentEncode(this.getBaseUrl(request.url)) + '&' + this.percentEncode(this.getParameterString(request, oauth_data));
	};

	/**
	 * Get data from url
	 * -> merge with oauth data
	 * -> percent encode key & value
	 * -> sort
	 *
	 * @param  {Object} request data
	 * @param  {Object} OAuth data
	 * @return {Object} Parameter string data
	 */
	OAuth.prototype.getParameterString = function(request, oauth_data) {
	    var base_string_data = this.sortObject(this.percentEncodeData(this.mergeObject(oauth_data, this.mergeObject(request.data, this.deParamUrl(request.url)))));

	    var data_str = '';

	    //base_string_data to string
	    for(var key in base_string_data) {
	        var value = base_string_data[key];
	        // check if the value is an array
	        // this means that this key has multiple values
	        if (value && Array.isArray(value)){
	          // sort the array first
	          value.sort();

	          var valString = "";
	          // serialize all values for this key: e.g. formkey=formvalue1&formkey=formvalue2
	          value.forEach((function(item, i){
	            valString += key + '=' + item;
	            if (i < value.length){
	              valString += "&";
	            }
	          }).bind(this));
	          data_str += valString;
	        } else {
	          data_str += key + '=' + value + '&';
	        }
	    }

	    //remove the last character
	    data_str = data_str.substr(0, data_str.length - 1);
	    return data_str;
	};

	/**
	 * Create a Signing Key
	 * @param  {String} token_secret Secret Token
	 * @return {String} Signing Key
	 */
	OAuth.prototype.getSigningKey = function(token_secret) {
	    token_secret = token_secret || '';

	    if(!this.last_ampersand && !token_secret) {
	        return this.percentEncode(this.consumer.secret);
	    }

	    return this.percentEncode(this.consumer.secret) + '&' + this.percentEncode(token_secret);
	};

	/**
	 * Get base url
	 * @param  {String} url
	 * @return {String}
	 */
	OAuth.prototype.getBaseUrl = function(url) {
	    return url.split('?')[0];
	};

	/**
	 * Get data from String
	 * @param  {String} string
	 * @return {Object}
	 */
	OAuth.prototype.deParam = function(string) {
	    var arr = string.split('&');
	    var data = {};

	    for(var i = 0; i < arr.length; i++) {
	        var item = arr[i].split('=');
	        data[item[0]] = decodeURIComponent(item[1]);
	    }
	    return data;
	};

	/**
	 * Get data from url
	 * @param  {String} url
	 * @return {Object}
	 */
	OAuth.prototype.deParamUrl = function(url) {
	    var tmp = url.split('?');

	    if (tmp.length === 1)
		{
			return {};
		}

	    return this.deParam(tmp[1]);
	};

	/**
	 * Percent Encode
	 * @param  {String} str
	 * @return {String} percent encoded string
	 */
	OAuth.prototype.percentEncode = function(str) {
	    return encodeURIComponent(str)
	        .replace(/\!/g, "%21")
	        .replace(/\*/g, "%2A")
	        .replace(/\'/g, "%27")
	        .replace(/\(/g, "%28")
	        .replace(/\)/g, "%29");
	};

	/**
	 * Percent Encode Object
	 * @param  {Object} data
	 * @return {Object} percent encoded data
	 */
	OAuth.prototype.percentEncodeData = function(data) {
	    var result = {};

	    for(var key in data) {
	        var value = data[key];
	        // check if the value is an array
	        if (value && Array.isArray(value)){
	          var newValue = [];
	          // percentEncode every value
	          value.forEach((function(val){
	            newValue.push(this.percentEncode(val));
	          }).bind(this));
	          value = newValue;
	        } else {
	          value = this.percentEncode(value);
	        }
	        result[this.percentEncode(key)] = value;
	    }

	    return result;
	};

	/**
	 * Get OAuth data as Header
	 * @param  {Object} oauth_data
	 * @return {String} Header data key - value
	 */
	OAuth.prototype.toHeader = function(oauth_data) {
	    oauth_data = this.sortObject(oauth_data);

	    var header_value = 'OAuth ';

	    for(var key in oauth_data) {
	        if (key.indexOf('oauth_') === -1)
			{
				continue;
			}
	        header_value += this.percentEncode(key) + '="' + this.percentEncode(oauth_data[key]) + '"' + this.parameter_seperator;
	    }

	    return {
	        Authorization: header_value.substr(0, header_value.length - this.parameter_seperator.length) //cut the last chars
	    };
	};

	/**
	 * Create a random word characters string with input length
	 * @return {String} a random word characters string
	 */
	OAuth.prototype.getNonce = function() {
	    var word_characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	    var result = '';

	    for(var i = 0; i < this.nonce_length; i++) {
	        result += word_characters[parseInt(Math.random() * word_characters.length, 10)];
	    }

	    return result;
	};

	/**
	 * Get Current Unix TimeStamp
	 * @return {Int} current unix timestamp
	 */
	OAuth.prototype.getTimeStamp = function() {
	    return parseInt(new Date().getTime()/1000, 10);
	};

	////////////////////// HELPER FUNCTIONS //////////////////////

	/**
	 * Merge object
	 * @param  {Object} obj1
	 * @param  {Object} obj2
	 * @return {Object}
	 */
	OAuth.prototype.mergeObject = function(obj1, obj2) {
	    var merged_obj = obj1;
	    for(var key in obj2) {
	        merged_obj[key] = obj2[key];
	    }
	    return merged_obj;
	};

	/**
	 * Sort object by key
	 * @param  {Object} data
	 * @return {Object} sorted object
	 */
	OAuth.prototype.sortObject = function(data) {
	    var keys = Object.keys(data);
	    var result = {};

	    keys.sort();

	    for(var i = 0; i < keys.length; i++) {
	        var key = keys[i];
	        result[key] = data[key];
	    }

	    return result;
	};

	return {
		authenticate: function (objRequest)
		{
			return OAuth(objRequest);

		}
	};
});