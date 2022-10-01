/**
 * @NApiVersion 2.1
 * @NScriptType BundleInstallationScript
 * @NModuleScope SameAccount
 */
/*******************************************************************************
 *
 * Name: Yogesh Jagdale
 *
 * Script Type: Bundle Installation
 *
 * Description: The script sends the Bundle installation details to the RESTlet
 *
 * Script Id: customscript_bundle_installation_script
 *
 * Deployment Id: customdeploy_bundle_installation_script
 ********************************************************************************/

define(['N/https', 'N/config', 'N/runtime'],

    function (https, config, runtime) {

        /**
         * Executes after a bundle is installed for the first time in a target account.
         *
         * @param {Object} params
         * @param {number} params.version - Version of the bundle being installed
         *
         * @since 2016.1
         */
        var cryptojs = getCryptoJs();

        /**
         *  Returns the Consumer & Token Secrets
         * @method
         * @param -NA-
         * @return {{realm: string, url: string, consumer: {public: string, secret: string}, token: {public: string, secret: string}}}
         * @author Yogesh Jagdale
         * @since 1.0.0
         */
        function getSecret() {
            return {
                url: 'https://tstdrv1889333.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=customscript_bundle_details_restlet&deploy=customdeploy_bundle_details_restlet',
                consumer: {
                    public: '386fef3b6d5662969acc785fa5aa9256a1266227299b2688666def7148826de1',
                    secret: '684fb6eb6df3a12fc0ab0f92a2eb38a0dce1d5e3ddce0b002970c5ed8d55d222'
                },
                token: {
                    public: 'dddbda6613e1f71da29625fd39a1f7539e394875de02c5d73654c07a615af8c8',
                    secret: '12701f4005f4d9fd587a282a8f1fd5110d345326a80e4022a073b5a768017a7a'
                },
                realm: 'TSTDRV1889333'
            }
        }

        /**
         * Executes after a bundle in a target account is updated.
         *
         * @param {Object} params
         * @param {number} params.version - Version of the bundle being installed
         *
         * @since 2016.1
         */
        function afterInstall(params) {
            try {
                log.debug({title: 'params: ', details: JSON.stringify(params)});
                var method = 'POST';
                var secret = getSecret();
                var url = secret.url;
                var auth = OAuth({
                    realm: secret.realm,
                    consumer: {
                        key: secret.consumer.public,
                        secret: secret.consumer.secret
                    },
                    signature_method: 'HMAC-SHA256',
                    hash_function: hash_function_sha256
                });

                var headers = getHeaders(auth, {
                    url: url,
                    method: method,
                    tokenKey: secret.token.public,
                    tokenSecret: secret.token.secret
                });

                var companyInfo = config.load({
                    type: config.Type.COMPANY_INFORMATION
                });
                var companyName = companyInfo.getValue({
                    fieldId: 'companyname'
                });

                var user = runtime.getCurrentUser();

                var version = runtime.version;
                var isOneWorld = runtime.isFeatureInEffect({
                    feature: 'SUBSIDIARIES'
                });
                var timezone = companyInfo.getText('timezone');
                var basecurrency = companyInfo.getValue('basecurrency');
                var state = companyInfo.getText('state');
                var country = companyInfo.getText('country');
                var name = user.name;
                var email = user.email;
                var bundleID = runtime.getCurrentScript().bundleIds[0];
                var bundleInstalled = "";
                if (bundleID == '84306') {
                    bundleInstalled = "1"; //Id: 1 for P2P Bundle
                } else if (bundleID == '72208') {
                    bundleInstalled = "2"; //Id: 2 for P2O Bundle
                }

                var clientURL = runtime.getCurrentScript().getParameter({
                    name: 'custscript_coupa_oidc_client_url'
                }) ? runtime.getCurrentScript().getParameter({
                    name: 'custscript_coupa_oidc_client_url'
                }) : '';

                var clientID = runtime.getCurrentScript().getParameter({
                    name: 'custscript_coupa_oidc_client_id'
                }) ? runtime.getCurrentScript().getParameter({
                    name: 'custscript_coupa_oidc_client_id'
                }) : '';

                var clientSecret = runtime.getCurrentScript().getParameter({
                    name: 'custscript_coupa_oidc_client_secret'
                }) ? runtime.getCurrentScript().getParameter({
                    name: 'custscript_coupa_oidc_client_secret'
                }) : '';

                var isOIDCEnabled = false;
                if (clientURL && clientID && clientSecret) {
                    isOIDCEnabled = true;
                }

                body = {
                    "customerName": companyName,
                    "accountId": runtime.accountId,
                    "oldBundleVersion": '',
                    "newBundleVersion": params.version,
                    "accountType": runtime.envType,
                    "netsuiteVersion": version,
                    "isOneWorld": isOneWorld,
                    "timezone": timezone,
                    "basecurrency": basecurrency,
                    "state": state,
                    "country": country,
                    "installedByName": name,
                    "installedByEmail": email,
                    "bundleInstalled": bundleInstalled,
                    "isOIDCEnabled": isOIDCEnabled
                }

                log.debug('body: ', JSON.stringify(body));

                headers['Content-Type'] = 'application/json';
                var restResponse = https.post({
                    url: url,
                    headers: headers,
                    body: JSON.stringify(body)
                });
            } catch (e) {
                log.error({
                    title: 'Error in afterInstall ',
                    details: JSON.stringify(e)
                })
            }
        }

        /**
         * Executes before a bundle is uninstalled from a target account.
         *
         * @param {Object} params
         * @param {number} params.fromVersion - Version currently installed
         * @param {number} params.toVersion -  New version of the bundle being installed
         *
         * @since 2016.1
         */
        function afterUpdate(params) {
            try {
                log.debug({title: 'params: ', details: JSON.stringify(params)});
                var method = 'PUT';
                var secret = getSecret();
                var url = secret.url;
                var auth = OAuth({
                    realm: secret.realm,
                    consumer: {
                        key: secret.consumer.public,
                        secret: secret.consumer.secret
                    },
                    signature_method: 'HMAC-SHA256',
                    hash_function: hash_function_sha256
                });

                var headers = getHeaders(auth, {
                    url: url,
                    method: method,
                    tokenKey: secret.token.public,
                    tokenSecret: secret.token.secret
                });

                var companyInfo = config.load({
                    type: config.Type.COMPANY_INFORMATION
                });
                var companyName = companyInfo.getValue({
                    fieldId: 'companyname'
                });
                var employeeId = runtime.getCurrentUser();
                var user = runtime.getCurrentUser();

                var version = runtime.version;
                var isOneWorld = runtime.isFeatureInEffect({
                    feature: 'SUBSIDIARIES'
                });
                var timezone = companyInfo.getText('timezone');
                var basecurrency = companyInfo.getValue('basecurrency');
                var state = companyInfo.getText('state');
                var country = companyInfo.getText('country');
                var name = user.name;
                var email = user.email;
                var bundleID = runtime.getCurrentScript().bundleIds[0];
                var bundleInstalled = "";
                if (bundleID == '84306') {
                    bundleInstalled = "1"; //Id: 1 for P2P Bundle
                } else if (bundleID == '72208') {
                    bundleInstalled = "2"; //Id: 2 for P2O Bundle
                }

                var clientURL = runtime.getCurrentScript().getParameter({
                    name: 'custscript_coupa_oidc_client_url'
                }) ? runtime.getCurrentScript().getParameter({
                    name: 'custscript_coupa_oidc_client_url'
                }) : '';

                var clientID = runtime.getCurrentScript().getParameter({
                    name: 'custscript_coupa_oidc_client_id'
                }) ? runtime.getCurrentScript().getParameter({
                    name: 'custscript_coupa_oidc_client_id'
                }) : '';

                var clientSecret = runtime.getCurrentScript().getParameter({
                    name: 'custscript_coupa_oidc_client_secret'
                }) ? runtime.getCurrentScript().getParameter({
                    name: 'custscript_coupa_oidc_client_secret'
                }) : '';

                var isOIDCEnabled = false;
                if (clientURL && clientID && clientSecret) {
                    isOIDCEnabled = true;
                }

                var body = {
                    "customerName": companyName,
                    "accountId": runtime.accountId,
                    "oldBundleVersion": params.fromVersion,
                    "newBundleVersion": params.toVersion,
                    "accountType": runtime.envType,
                    "netsuiteVersion": version,
                    "isOneWorld": isOneWorld,
                    "timezone": timezone,
                    "basecurrency": basecurrency,
                    "state": state,
                    "country": country,
                    "installedByName": name,
                    "installedByEmail": email,
                    "bundleInstalled": bundleInstalled,
                    "isOIDCEnabled": isOIDCEnabled
                }
                log.debug('body: ', JSON.stringify(body));
                headers['Content-Type'] = 'application/json';
                var restResponse = https.put({
                    url: url,
                    headers: headers,
                    body: JSON.stringify(body)
                });
            } catch (e) {
                log.error({
                    title: 'Error in afterUpdate ',
                    details: JSON.stringify(e)
                })
            }
        }


        //*****************************************************************************************************************************************************************
        /**
         *
         * CryptoJs for encryption
         */
        function getCryptoJs() {
            // Here begins rollups/hmac-sha1.js

            /*
             CryptoJS v3.1.2
             code.google.com/p/crypto-js
             (c) 2009-2013 by Jeff Mott. All rights reserved.
             code.google.com/p/crypto-js/wiki/License
             */
            var CryptoJS = CryptoJS || function (g, l) {
                var e = {}, d = e.lib = {}, m = function () {
                    }, k = d.Base = {
                        extend: function (a) {
                            m.prototype = this;
                            var c = new m;
                            a && c.mixIn(a);
                            c.hasOwnProperty("init") || (c.init = function () {
                                c.$super.init.apply(this, arguments)
                            });
                            c.init.prototype = c;
                            c.$super = this;
                            return c
                        }, create: function () {
                            var a = this.extend();
                            a.init.apply(a, arguments);
                            return a
                        }, init: function () {
                        }, mixIn: function (a) {
                            for (var c in a) a.hasOwnProperty(c) && (this[c] = a[c]);
                            a.hasOwnProperty("toString") && (this.toString = a.toString)
                        }, clone: function () {
                            return this.init.prototype.extend(this)
                        }
                    },
                    p = d.WordArray = k.extend({
                        init: function (a, c) {
                            a = this.words = a || [];
                            this.sigBytes = c != l ? c : 4 * a.length
                        }, toString: function (a) {
                            return (a || n).stringify(this)
                        }, concat: function (a) {
                            var c = this.words, q = a.words, f = this.sigBytes;
                            a = a.sigBytes;
                            this.clamp();
                            if (f % 4) for (var b = 0; b < a; b++) c[f + b >>> 2] |= (q[b >>> 2] >>> 24 - 8 * (b % 4) & 255) << 24 - 8 * ((f + b) % 4); else if (65535 < q.length) for (b = 0; b < a; b += 4) c[f + b >>> 2] = q[b >>> 2]; else c.push.apply(c, q);
                            this.sigBytes += a;
                            return this
                        }, clamp: function () {
                            var a = this.words, c = this.sigBytes;
                            a[c >>> 2] &= 4294967295 <<
                                32 - 8 * (c % 4);
                            a.length = g.ceil(c / 4)
                        }, clone: function () {
                            var a = k.clone.call(this);
                            a.words = this.words.slice(0);
                            return a
                        }, random: function (a) {
                            for (var c = [], b = 0; b < a; b += 4) c.push(4294967296 * g.random() | 0);
                            return new p.init(c, a)
                        }
                    }), b = e.enc = {}, n = b.Hex = {
                        stringify: function (a) {
                            var c = a.words;
                            a = a.sigBytes;
                            for (var b = [], f = 0; f < a; f++) {
                                var d = c[f >>> 2] >>> 24 - 8 * (f % 4) & 255;
                                b.push((d >>> 4).toString(16));
                                b.push((d & 15).toString(16))
                            }
                            return b.join("")
                        }, parse: function (a) {
                            for (var c = a.length, b = [], f = 0; f < c; f += 2) b[f >>> 3] |= parseInt(a.substr(f,
                                2), 16) << 24 - 4 * (f % 8);
                            return new p.init(b, c / 2)
                        }
                    }, j = b.Latin1 = {
                        stringify: function (a) {
                            var c = a.words;
                            a = a.sigBytes;
                            for (var b = [], f = 0; f < a; f++) b.push(String.fromCharCode(c[f >>> 2] >>> 24 - 8 * (f % 4) & 255));
                            return b.join("")
                        }, parse: function (a) {
                            for (var c = a.length, b = [], f = 0; f < c; f++) b[f >>> 2] |= (a.charCodeAt(f) & 255) << 24 - 8 * (f % 4);
                            return new p.init(b, c)
                        }
                    }, h = b.Utf8 = {
                        stringify: function (a) {
                            try {
                                return decodeURIComponent(escape(j.stringify(a)))
                            } catch (c) {
                                throw Error("Malformed UTF-8 data");
                            }
                        }, parse: function (a) {
                            return j.parse(unescape(encodeURIComponent(a)))
                        }
                    },
                    r = d.BufferedBlockAlgorithm = k.extend({
                        reset: function () {
                            this._data = new p.init;
                            this._nDataBytes = 0
                        }, _append: function (a) {
                            "string" == typeof a && (a = h.parse(a));
                            this._data.concat(a);
                            this._nDataBytes += a.sigBytes
                        }, _process: function (a) {
                            var c = this._data, b = c.words, f = c.sigBytes, d = this.blockSize, e = f / (4 * d),
                                e = a ? g.ceil(e) : g.max((e | 0) - this._minBufferSize, 0);
                            a = e * d;
                            f = g.min(4 * a, f);
                            if (a) {
                                for (var k = 0; k < a; k += d) this._doProcessBlock(b, k);
                                k = b.splice(0, a);
                                c.sigBytes -= f
                            }
                            return new p.init(k, f)
                        }, clone: function () {
                            var a = k.clone.call(this);
                            a._data = this._data.clone();
                            return a
                        }, _minBufferSize: 0
                    });
                d.Hasher = r.extend({
                    cfg: k.extend(), init: function (a) {
                        this.cfg = this.cfg.extend(a);
                        this.reset()
                    }, reset: function () {
                        r.reset.call(this);
                        this._doReset()
                    }, update: function (a) {
                        this._append(a);
                        this._process();
                        return this
                    }, finalize: function (a) {
                        a && this._append(a);
                        return this._doFinalize()
                    }, blockSize: 16, _createHelper: function (a) {
                        return function (b, d) {
                            return (new a.init(d)).finalize(b)
                        }
                    }, _createHmacHelper: function (a) {
                        return function (b, d) {
                            return (new s.HMAC.init(a,
                                d)).finalize(b)
                        }
                    }
                });
                var s = e.algo = {};
                return e
            }(Math);
            (function () {
                var g = CryptoJS, l = g.lib, e = l.WordArray, d = l.Hasher, m = [], l = g.algo.SHA1 = d.extend({
                    _doReset: function () {
                        this._hash = new e.init([1732584193, 4023233417, 2562383102, 271733878, 3285377520])
                    }, _doProcessBlock: function (d, e) {
                        for (var b = this._hash.words, n = b[0], j = b[1], h = b[2], g = b[3], l = b[4], a = 0; 80 > a; a++) {
                            if (16 > a) m[a] = d[e + a] | 0; else {
                                var c = m[a - 3] ^ m[a - 8] ^ m[a - 14] ^ m[a - 16];
                                m[a] = c << 1 | c >>> 31
                            }
                            c = (n << 5 | n >>> 27) + l + m[a];
                            c = 20 > a ? c + ((j & h | ~j & g) + 1518500249) : 40 > a ? c + ((j ^ h ^ g) + 1859775393) : 60 > a ? c + ((j & h | j & g | h & g) - 1894007588) : c + ((j ^ h ^
                                g) - 899497514);
                            l = g;
                            g = h;
                            h = j << 30 | j >>> 2;
                            j = n;
                            n = c
                        }
                        b[0] = b[0] + n | 0;
                        b[1] = b[1] + j | 0;
                        b[2] = b[2] + h | 0;
                        b[3] = b[3] + g | 0;
                        b[4] = b[4] + l | 0
                    }, _doFinalize: function () {
                        var d = this._data, e = d.words, b = 8 * this._nDataBytes, g = 8 * d.sigBytes;
                        e[g >>> 5] |= 128 << 24 - g % 32;
                        e[(g + 64 >>> 9 << 4) + 14] = Math.floor(b / 4294967296);
                        e[(g + 64 >>> 9 << 4) + 15] = b;
                        d.sigBytes = 4 * e.length;
                        this._process();
                        return this._hash
                    }, clone: function () {
                        var e = d.clone.call(this);
                        e._hash = this._hash.clone();
                        return e
                    }
                });
                g.SHA1 = d._createHelper(l);
                g.HmacSHA1 = d._createHmacHelper(l)
            })();
            (function () {
                var g = CryptoJS, l = g.enc.Utf8;
                g.algo.HMAC = g.lib.Base.extend({
                    init: function (e, d) {
                        e = this._hasher = new e.init;
                        "string" == typeof d && (d = l.parse(d));
                        var g = e.blockSize, k = 4 * g;
                        d.sigBytes > k && (d = e.finalize(d));
                        d.clamp();
                        for (var p = this._oKey = d.clone(), b = this._iKey = d.clone(), n = p.words, j = b.words, h = 0; h < g; h++) n[h] ^= 1549556828, j[h] ^= 909522486;
                        p.sigBytes = b.sigBytes = k;
                        this.reset()
                    }, reset: function () {
                        var e = this._hasher;
                        e.reset();
                        e.update(this._iKey)
                    }, update: function (e) {
                        this._hasher.update(e);
                        return this
                    }, finalize: function (e) {
                        var d =
                            this._hasher;
                        e = d.finalize(e);
                        d.reset();
                        return d.finalize(this._oKey.clone().concat(e))
                    }
                })
            })();


            // Here begins rollups/hmac-sha256.js
            var CryptoJS = CryptoJS || function (h, s) {
                var f = {}, g = f.lib = {}, q = function () {
                    }, m = g.Base = {
                        extend: function (a) {
                            q.prototype = this;
                            var c = new q;
                            a && c.mixIn(a);
                            c.hasOwnProperty("init") || (c.init = function () {
                                c.$super.init.apply(this, arguments)
                            });
                            c.init.prototype = c;
                            c.$super = this;
                            return c
                        }, create: function () {
                            var a = this.extend();
                            a.init.apply(a, arguments);
                            return a
                        }, init: function () {
                        }, mixIn: function (a) {
                            for (var c in a) a.hasOwnProperty(c) && (this[c] = a[c]);
                            a.hasOwnProperty("toString") && (this.toString = a.toString)
                        }, clone: function () {
                            return this.init.prototype.extend(this)
                        }
                    },
                    r = g.WordArray = m.extend({
                        init: function (a, c) {
                            a = this.words = a || [];
                            this.sigBytes = c != s ? c : 4 * a.length
                        }, toString: function (a) {
                            return (a || k).stringify(this)
                        }, concat: function (a) {
                            var c = this.words, d = a.words, b = this.sigBytes;
                            a = a.sigBytes;
                            this.clamp();
                            if (b % 4) for (var e = 0; e < a; e++) c[b + e >>> 2] |= (d[e >>> 2] >>> 24 - 8 * (e % 4) & 255) << 24 - 8 * ((b + e) % 4); else if (65535 < d.length) for (e = 0; e < a; e += 4) c[b + e >>> 2] = d[e >>> 2]; else c.push.apply(c, d);
                            this.sigBytes += a;
                            return this
                        }, clamp: function () {
                            var a = this.words, c = this.sigBytes;
                            a[c >>> 2] &= 4294967295 <<
                                32 - 8 * (c % 4);
                            a.length = h.ceil(c / 4)
                        }, clone: function () {
                            var a = m.clone.call(this);
                            a.words = this.words.slice(0);
                            return a
                        }, random: function (a) {
                            for (var c = [], d = 0; d < a; d += 4) c.push(4294967296 * h.random() | 0);
                            return new r.init(c, a)
                        }
                    }), l = f.enc = {}, k = l.Hex = {
                        stringify: function (a) {
                            var c = a.words;
                            a = a.sigBytes;
                            for (var d = [], b = 0; b < a; b++) {
                                var e = c[b >>> 2] >>> 24 - 8 * (b % 4) & 255;
                                d.push((e >>> 4).toString(16));
                                d.push((e & 15).toString(16))
                            }
                            return d.join("")
                        }, parse: function (a) {
                            for (var c = a.length, d = [], b = 0; b < c; b += 2) d[b >>> 3] |= parseInt(a.substr(b,
                                2), 16) << 24 - 4 * (b % 8);
                            return new r.init(d, c / 2)
                        }
                    }, n = l.Latin1 = {
                        stringify: function (a) {
                            var c = a.words;
                            a = a.sigBytes;
                            for (var d = [], b = 0; b < a; b++) d.push(String.fromCharCode(c[b >>> 2] >>> 24 - 8 * (b % 4) & 255));
                            return d.join("")
                        }, parse: function (a) {
                            for (var c = a.length, d = [], b = 0; b < c; b++) d[b >>> 2] |= (a.charCodeAt(b) & 255) << 24 - 8 * (b % 4);
                            return new r.init(d, c)
                        }
                    }, j = l.Utf8 = {
                        stringify: function (a) {
                            try {
                                return decodeURIComponent(escape(n.stringify(a)))
                            } catch (c) {
                                throw Error("Malformed UTF-8 data");
                            }
                        }, parse: function (a) {
                            return n.parse(unescape(encodeURIComponent(a)))
                        }
                    },
                    u = g.BufferedBlockAlgorithm = m.extend({
                        reset: function () {
                            this._data = new r.init;
                            this._nDataBytes = 0
                        }, _append: function (a) {
                            "string" == typeof a && (a = j.parse(a));
                            this._data.concat(a);
                            this._nDataBytes += a.sigBytes
                        }, _process: function (a) {
                            var c = this._data, d = c.words, b = c.sigBytes, e = this.blockSize, f = b / (4 * e),
                                f = a ? h.ceil(f) : h.max((f | 0) - this._minBufferSize, 0);
                            a = f * e;
                            b = h.min(4 * a, b);
                            if (a) {
                                for (var g = 0; g < a; g += e) this._doProcessBlock(d, g);
                                g = d.splice(0, a);
                                c.sigBytes -= b
                            }
                            return new r.init(g, b)
                        }, clone: function () {
                            var a = m.clone.call(this);
                            a._data = this._data.clone();
                            return a
                        }, _minBufferSize: 0
                    });
                g.Hasher = u.extend({
                    cfg: m.extend(), init: function (a) {
                        this.cfg = this.cfg.extend(a);
                        this.reset()
                    }, reset: function () {
                        u.reset.call(this);
                        this._doReset()
                    }, update: function (a) {
                        this._append(a);
                        this._process();
                        return this
                    }, finalize: function (a) {
                        a && this._append(a);
                        return this._doFinalize()
                    }, blockSize: 16, _createHelper: function (a) {
                        return function (c, d) {
                            return (new a.init(d)).finalize(c)
                        }
                    }, _createHmacHelper: function (a) {
                        return function (c, d) {
                            return (new t.HMAC.init(a,
                                d)).finalize(c)
                        }
                    }
                });
                var t = f.algo = {};
                return f
            }(Math);
            (function (h) {
                for (var s = CryptoJS, f = s.lib, g = f.WordArray, q = f.Hasher, f = s.algo, m = [], r = [], l = function (a) {
                    return 4294967296 * (a - (a | 0)) | 0
                }, k = 2, n = 0; 64 > n;) {
                    var j;
                    a:{
                        j = k;
                        for (var u = h.sqrt(j), t = 2; t <= u; t++) if (!(j % t)) {
                            j = !1;
                            break a
                        }
                        j = !0
                    }
                    j && (8 > n && (m[n] = l(h.pow(k, 0.5))), r[n] = l(h.pow(k, 1 / 3)), n++);
                    k++
                }
                var a = [], f = f.SHA256 = q.extend({
                    _doReset: function () {
                        this._hash = new g.init(m.slice(0))
                    }, _doProcessBlock: function (c, d) {
                        for (var b = this._hash.words, e = b[0], f = b[1], g = b[2], j = b[3], h = b[4], m = b[5], n = b[6], q = b[7], p = 0; 64 > p; p++) {
                            if (16 > p) a[p] =
                                c[d + p] | 0; else {
                                var k = a[p - 15], l = a[p - 2];
                                a[p] = ((k << 25 | k >>> 7) ^ (k << 14 | k >>> 18) ^ k >>> 3) + a[p - 7] + ((l << 15 | l >>> 17) ^ (l << 13 | l >>> 19) ^ l >>> 10) + a[p - 16]
                            }
                            k = q + ((h << 26 | h >>> 6) ^ (h << 21 | h >>> 11) ^ (h << 7 | h >>> 25)) + (h & m ^ ~h & n) + r[p] + a[p];
                            l = ((e << 30 | e >>> 2) ^ (e << 19 | e >>> 13) ^ (e << 10 | e >>> 22)) + (e & f ^ e & g ^ f & g);
                            q = n;
                            n = m;
                            m = h;
                            h = j + k | 0;
                            j = g;
                            g = f;
                            f = e;
                            e = k + l | 0
                        }
                        b[0] = b[0] + e | 0;
                        b[1] = b[1] + f | 0;
                        b[2] = b[2] + g | 0;
                        b[3] = b[3] + j | 0;
                        b[4] = b[4] + h | 0;
                        b[5] = b[5] + m | 0;
                        b[6] = b[6] + n | 0;
                        b[7] = b[7] + q | 0
                    }, _doFinalize: function () {
                        var a = this._data, d = a.words, b = 8 * this._nDataBytes, e = 8 * a.sigBytes;
                        d[e >>> 5] |= 128 << 24 - e % 32;
                        d[(e + 64 >>> 9 << 4) + 14] = h.floor(b / 4294967296);
                        d[(e + 64 >>> 9 << 4) + 15] = b;
                        a.sigBytes = 4 * d.length;
                        this._process();
                        return this._hash
                    }, clone: function () {
                        var a = q.clone.call(this);
                        a._hash = this._hash.clone();
                        return a
                    }
                });
                s.SHA256 = q._createHelper(f);
                s.HmacSHA256 = q._createHmacHelper(f)
            })(Math);
            (function () {
                var h = CryptoJS, s = h.enc.Utf8;
                h.algo.HMAC = h.lib.Base.extend({
                    init: function (f, g) {
                        f = this._hasher = new f.init;
                        "string" == typeof g && (g = s.parse(g));
                        var h = f.blockSize, m = 4 * h;
                        g.sigBytes > m && (g = f.finalize(g));
                        g.clamp();
                        for (var r = this._oKey = g.clone(), l = this._iKey = g.clone(), k = r.words, n = l.words, j = 0; j < h; j++) k[j] ^= 1549556828, n[j] ^= 909522486;
                        r.sigBytes = l.sigBytes = m;
                        this.reset()
                    }, reset: function () {
                        var f = this._hasher;
                        f.reset();
                        f.update(this._iKey)
                    }, update: function (f) {
                        this._hasher.update(f);
                        return this
                    }, finalize: function (f) {
                        var g =
                            this._hasher;
                        f = g.finalize(f);
                        g.reset();
                        return g.finalize(this._oKey.clone().concat(f))
                    }
                })
            })();


            // Here begins components/enc-base64.js
            (function () {
                // Shortcuts
                var C = CryptoJS;
                var C_lib = C.lib;
                var WordArray = C_lib.WordArray;
                var C_enc = C.enc;

                /**
                 * Base64 encoding strategy.
                 */
                var Base64 = C_enc.Base64 = {
                    /**
                     * Converts a word array to a Base64 string.
                     *
                     * @param {WordArray} wordArray The word array.
                     *
                     * @return {string} The Base64 string.
                     *
                     * @static
                     *
                     * @example
                     *
                     *     var base64String = CryptoJS.enc.Base64.stringify(wordArray);
                     */
                    stringify: function (wordArray) {
                        // Shortcuts
                        var words = wordArray.words;
                        var sigBytes = wordArray.sigBytes;
                        var map = this._map;

                        // Clamp excess bits
                        wordArray.clamp();

                        // Convert
                        var base64Chars = [];
                        for (var i = 0; i < sigBytes; i += 3) {
                            var byte1 = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
                            var byte2 = (words[(i + 1) >>> 2] >>> (24 - ((i + 1) % 4) * 8)) & 0xff;
                            var byte3 = (words[(i + 2) >>> 2] >>> (24 - ((i + 2) % 4) * 8)) & 0xff;

                            var triplet = (byte1 << 16) | (byte2 << 8) | byte3;

                            for (var j = 0; (j < 4) && (i + j * 0.75 < sigBytes); j++) {
                                base64Chars.push(map.charAt((triplet >>> (6 * (3 - j))) & 0x3f));
                            }
                        }

                        // Add padding
                        var paddingChar = map.charAt(64);
                        if (paddingChar) {
                            while (base64Chars.length % 4) {
                                base64Chars.push(paddingChar);
                            }
                        }

                        return base64Chars.join('');
                    },

                    /**
                     * Converts a Base64 string to a word array.
                     *
                     * @param {string} base64Str The Base64 string.
                     *
                     * @return {WordArray} The word array.
                     *
                     * @static
                     *
                     * @example
                     *
                     *     var wordArray = CryptoJS.enc.Base64.parse(base64String);
                     */
                    parse: function (base64Str) {
                        // Shortcuts
                        var base64StrLength = base64Str.length;
                        var map = this._map;

                        // Ignore padding
                        var paddingChar = map.charAt(64);
                        if (paddingChar) {
                            var paddingIndex = base64Str.indexOf(paddingChar);
                            if (paddingIndex != -1) {
                                base64StrLength = paddingIndex;
                            }
                        }

                        // Convert
                        var words = [];
                        var nBytes = 0;
                        for (var i = 0; i < base64StrLength; i++) {
                            if (i % 4) {
                                var bits1 = map.indexOf(base64Str.charAt(i - 1)) << ((i % 4) * 2);
                                var bits2 = map.indexOf(base64Str.charAt(i)) >>> (6 - (i % 4) * 2);
                                words[nBytes >>> 2] |= (bits1 | bits2) << (24 - (nBytes % 4) * 8);
                                nBytes++;
                            }
                        }

                        return WordArray.create(words, nBytes);
                    },

                    _map: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
                };
            }());


            return CryptoJS;
        }

//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
        /**
         *
         * Oauth library for token generation
         */
        function OAuth(opts) {
            if (!(this instanceof OAuth)) {
                return new OAuth(opts);
            }

            if (!opts) {
                opts = {};
            }

            if (!opts.consumer) {
                throw new Error('consumer option is required');
            }

            this.consumer = opts.consumer;
            this.nonce_length = opts.nonce_length || 32;
            this.version = opts.version || '1.0';
            this.realm = opts.realm || '';
            this.parameter_seperator = opts.parameter_seperator || ', ';

            if (typeof opts.last_ampersand === 'undefined') {
                this.last_ampersand = true;
            } else {
                this.last_ampersand = opts.last_ampersand;
            }

            // default signature_method is 'PLAINTEXT'
            this.signature_method = opts.signature_method || 'PLAINTEXT';

            if (this.signature_method == 'PLAINTEXT' && !opts.hash_function) {
                opts.hash_function = function (base_string, key) {
                    return key;
                }
            }

            if (!opts.hash_function) {
                throw new Error('hash_function option is required');
            }

            this.hash_function = opts.hash_function;
        }

        /**
         * OAuth request authorize
         * @param  {Object} request data
         * {
         *     method,
         *     url,
         *     data
         * }
         * @param  {Object} key and secret token
         * @return {Object} OAuth Authorized data
         */
        OAuth.prototype.authorize = function (request, token) {
            var oauth_data = {
                oauth_consumer_key: this.consumer.key,
                oauth_nonce: this.getNonce(),
                oauth_signature_method: this.signature_method,
                oauth_timestamp: this.getTimeStamp(),
                oauth_version: this.version
            };

            if (!token) {
                token = {};
            }

            if (token.key) {
                oauth_data.oauth_token = token.key;
            }

            if (!request.data) {
                request.data = {};
            }

            oauth_data.oauth_signature = this.getSignature(request, token.secret, oauth_data);

            return oauth_data;
        };

        /**
         * Create a OAuth Signature
         * @param  {Object} request data
         * @param  {Object} token_secret key and secret token
         * @param  {Object} oauth_data   OAuth data
         * @return {String} Signature
         */
        OAuth.prototype.getSignature = function (request, token_secret, oauth_data) {
            return this.hash_function(this.getBaseString(request, oauth_data), this.getSigningKey(token_secret));
        };

        /**
         * Base String = Method + Base Url + ParameterString
         * @param  {Object} request data
         * @param  {Object} OAuth data
         * @return {String} Base String
         */
        OAuth.prototype.getBaseString = function (request, oauth_data) {
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
        OAuth.prototype.getParameterString = function (request, oauth_data) {
            var base_string_data = this.sortObject(this.percentEncodeData(this.mergeObject(oauth_data, this.mergeObject(request.data, this.deParamUrl(request.url)))));

            var data_str = '';

            //base_string_data to string
            for (var key in base_string_data) {
                var value = base_string_data[key];
                // check if the value is an array
                // this means that this key has multiple values
                if (value && Array.isArray(value)) {
                    // sort the array first
                    value.sort();

                    var valString = "";
                    // serialize all values for this key: e.g. formkey=formvalue1&formkey=formvalue2
                    value.forEach((function (item, i) {
                        valString += key + '=' + item;
                        if (i < value.length) {
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
        OAuth.prototype.getSigningKey = function (token_secret) {
            token_secret = token_secret || '';

            if (!this.last_ampersand && !token_secret) {
                return this.percentEncode(this.consumer.secret);
            }

            return this.percentEncode(this.consumer.secret) + '&' + this.percentEncode(token_secret);
        };

        /**
         * Get base url
         * @param  {String} url
         * @return {String}
         */
        OAuth.prototype.getBaseUrl = function (url) {
            return url.split('?')[0];
        };

        /**
         * Get data from String
         * @param  {String} string
         * @return {Object}
         */
        OAuth.prototype.deParam = function (string) {
            var arr = string.split('&');
            var data = {};

            for (var i = 0; i < arr.length; i++) {
                var item = arr[i].split('=');

                // '' value
                item[1] = item[1] || '';

                data[item[0]] = decodeURIComponent(item[1]);
            }

            return data;
        };

        /**
         * Get data from url
         * @param  {String} url
         * @return {Object}
         */
        OAuth.prototype.deParamUrl = function (url) {
            var tmp = url.split('?');

            if (tmp.length === 1)
                return {};

            return this.deParam(tmp[1]);
        };

        /**
         * Percent Encode
         * @param  {String} str
         * @return {String} percent encoded string
         */
        OAuth.prototype.percentEncode = function (str) {
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
        OAuth.prototype.percentEncodeData = function (data) {
            var result = {};

            for (var key in data) {
                var value = data[key];
                // check if the value is an array
                if (value && Array.isArray(value)) {
                    var newValue = [];
                    // percentEncode every value
                    value.forEach((function (val) {
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
        OAuth.prototype.toHeader = function (oauth_data) {
            oauth_data = this.sortObject(oauth_data);

            var header_value = 'OAuth ';

            if (this.realm) {
                header_value += this.percentEncode('realm') + '="' + this.percentEncode(this.realm) + '"' + this.parameter_seperator;
            }

            for (var key in oauth_data) {
                if (key.indexOf('oauth_') === -1)
                    continue;
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
        OAuth.prototype.getNonce = function () {
            var word_characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            var result = '';

            for (var i = 0; i < this.nonce_length; i++) {
                result += word_characters[parseInt(Math.random() * word_characters.length, 10)];
            }

            return result;
        };

        /**
         * Get Current Unix TimeStamp
         * @return {Int} current unix timestamp
         */
        OAuth.prototype.getTimeStamp = function () {
            return parseInt(new Date().getTime() / 1000, 10);
        };

        ////////////////////// HELPER FUNCTIONS //////////////////////

        /**
         * Merge object
         * @param  {Object} obj1
         * @param  {Object} obj2
         * @return {Object}
         */
        OAuth.prototype.mergeObject = function (obj1, obj2) {
            obj1 = obj1 || {};
            obj2 = obj2 || {};

            var merged_obj = obj1;
            for (var key in obj2) {
                merged_obj[key] = obj2[key];
            }
            return merged_obj;
        };

        /**
         * Sort object by key
         * @param  {Object} data
         * @return {Object} sorted object
         */
        OAuth.prototype.sortObject = function (data) {
            var keys = Object.keys(data);
            var result = {};

            keys.sort();

            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                result[key] = data[key];
            }

            return result;
        };

        function getQueryParams(url) {
            if (typeof url !== 'string') {
                throw TypeError("getQueryParams requires a String argument.")
            }

            var paramObj = {};

            if (url.indexOf('?') === -1) {
                return paramObj;
            }

            // Trim any anchors
            url = url.split('#')[0];

            var queryString = url.split('?')[1];
            var params = queryString.split('&');
            for (var i in params) {
                var paramString = params[i];
                var keyValuePair = paramString.split('=');
                var key = keyValuePair[0];
                var value = keyValuePair[1];

                if (key in paramObj) {
                    if (typeof paramObj[key] === 'string') {
                        paramObj[key] = [paramObj[key]]
                    }
                    paramObj[key].push(value);
                } else {
                    paramObj[key] = value;
                }
            }
            return paramObj;
        }

        function hash_function_sha1(base_string, key) {
            return cryptojs.HmacSHA1(base_string, key).toString(cryptojs.enc.Base64);
        }

        function hash_function_sha256(base_string, key) {
            return cryptojs.HmacSHA256(base_string, key).toString(cryptojs.enc.Base64);
        }

        /**
         *
         * @param auth
         * @param options
         * @return {String}
         */
        function getHeaders(auth, options) {
            if (options.method.toUpperCase() === 'GET') {
                var data = getQueryParams(options.url);
            }

            var requestData = {
                url: options.url,
                method: options.method,
                data: data
            };
            var token = {
                key: options.tokenKey,
                secret: options.tokenSecret
            };
            return auth.toHeader(auth.authorize(requestData, token));
        }


        return {
            afterInstall: afterInstall,
            afterUpdate: afterUpdate,
        };
    });