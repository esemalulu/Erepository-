/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */
/* Json request example
 {
 "partner": {
 "internalid": "123433302",
 "custentityr7impartnermemberid": "123456",
 "companyname": "Partner T",
 "email": "partnert@gmail.com",
 "phone": "19782704965",
 "fax": "19782704965",
 "parent": "",
 "inactive": false,
 "url": "http://partner.testdomain.com",
 "custentityr7subregion": "US_FED",
 "custentityr7impartnerannualrevenuecat": "LESS_THAN_100M",
 "custentityr7othervendorssold": "TENABLE",
 "custentityr7distributor": "205994",
 "custentityr7dedicatedsecurityteam": false,
 "custentityr7partnerlevel": "CONSULTANT",
 "custentityr7partnerregion": "APAC",
 "custentityr7partnerstatus": "PROSPECTIVE",
 "custentityr7partnerdatesigned": "12/20/2016",
 "custentityr7partneraccountmanager": 3889342,
 "custentityr7partnerterritory": "US",
 "custentityr7partnerpaymentterms": "PREPAID",
 "custentityr7partnerareasofinterest": "PENETRATION_TESTING",
 "custentityr7partnernumberofemployees": "LESS_THAN_50",
 "custentityr7partnertargetcustomersize": "SMALL_BUSINESS",
 "custentityr7partnerdiscountstandard": "15",
 "custentityr7partnerdiscountapprovedregis": "10",
 "custentityr7partnerreferralcommission": "5",
 "custentityr7partnerdiscountrenewals": "5",
 "custentityr7partnerservicesdiscount": "5",
 "custentityr7partnerdiligence": false,
 "custentityr7partnertargetmarkets": "CHEMICALS",
 "comments": "Simple test comment",
 "addresses": [{
 "addr1": "test addr1",
 "addr2": "test addr2",
 "city": "Boston",
 "zip": "02201-2021",
 "country": "US",
 "state": "MA"
 }],
 "subsidiary": 1
 }
 }
 }*/
define(['/SuiteScripts/RESTlets/Common Library/r7_common_restlet_library.js',
        'N/error'],
        function(common_library, error) {

            var libraries = [];
            libraries.push({vendorId:'IMP',library:'/SuiteScripts/RESTlets/Partner/r7_partner_impartner_library.js'});

            /**
             * Function called upon sending a GET request to the RESTlet.
             * 
             * @param {Object}
             *                requestBody - Parameters from HTTP request URL;
             *                parameters will be passed into function as an
             *                Object (for all supported content types)
             * @returns {string | Object} HTTP response body; return string when
             *          request Content-Type is 'text/plain'; return Object when
             *          request Content-Type is 'application/json'
             * @since 2015.1
             */
            function doGet(requestBody) {
                var response = null;
                try {
                    var library = getLibrary(requestBody);
                    if(!common_library.isNullOrEmpty(library)){
                        response = library.get(requestBody);
                    }
                }
                catch (e) {
                    log.error({
                        title: 'Error in doGet function',
                        details: e
                    });
                    throw e;
                }
                return response;
            }

            /**
             * Function called upon sending a DELETE request to the RESTlet.
             * 
             * @param {Object}
             *                requestBody - Parameters from HTTP request URL;
             *                parameters will be passed into function as an
             *                Object (for all supported content types)
             * @returns {string | Object} HTTP response body; return string when
             *          request Content-Type is 'text/plain'; return Object when
             *          request Content-Type is 'application/json'
             * @since 2015.2
             */
            function doDelete(requestBody) {
                var response = null;
                try {
                    var library = getLibrary(requestBody);
                    if(!common_library.isNullOrEmpty(library)){
                        response = library.delete(requestBody);
                    }
                }
                catch (e) {
                    log.error({
                        title: 'Error in doDelete function',
                        details: e
                    });
                    throw e;
                }
                return response;
            }
            /**
             * Function called upon sending a PUT request to the RESTlet.
             * 
             * @param {string |
             *                Object} requestBody - The HTTP request body;
             *                request body will be passed into function as a
             *                string when request Content-Type is 'text/plain'
             *                or parsed into an Object when request Content-Type
             *                is 'application/json' (in which case the body must
             *                be a valid JSON)
             * @returns {string | Object} HTTP response body; return string when
             *          request Content-Type is 'text/plain'; return Object when
             *          request Content-Type is 'application/json'
             * @since 2015.2
             */
            function doPut(requestBody) {
                var response = null;
                try {
                    var library = getLibrary(requestBody);
                    if(!common_library.isNullOrEmpty(library)){
                        response = library.put(requestBody);
                    }
                }
                catch (e) {
                    log.error({
                        title: 'Error in doPut function',
                        details: e
                    });
                    throw e;
                }
                return response;
            }

            /**
             * Function called upon sending a POST request to the RESTlet.
             * 
             * @param {string |
             *                Object} requestBody - The HTTP request body;
             *                request body will be passed into function as a
             *                string when request Content-Type is 'text/plain'
             *                or parsed into an Object when request Content-Type
             *                is 'application/json' (in which case the body must
             *                be a valid JSON)
             * @returns {string | Object} HTTP response body; return string when
             *          request Content-Type is 'text/plain'; return Object when
             *          request Content-Type is 'application/json'
             * @since 2015.2
             */
            function doPost(requestBody) {
                var response = null;
                try {
                    var library = getLibrary(requestBody);
                    if(!common_library.isNullOrEmpty(library)){
                        response = library.post(requestBody);
                    }
                }
                catch (e) {
                    log.error({
                        title: 'Error in doPost function',
                        details: e
                    });
                    throw e;
                }
                return response;
            }
            
            
            /*******************************************************************
             * Supplementary functions
             ******************************************************************/
            
            /**
             * Returns library for the vendor from request. The vendor is
             * identified via 'vid' request parameter
             * 
             * @param request
             * @returns (Object) library if found, otherwise null
             */
            function getLibrary(request){
                validateRequest(request);
                var vendorId = getVendorId(request);
                var library = null;
                for(var i = 0; i<libraries.length; i++){
                    if(libraries[i].vendorId.localeCompare(vendorId)===0){
                        require([libraries[i].library], function (lib) 
                                {
                                    library = lib;
                                });
                        break;
                    }
                }
                return library;
            }
            
            /**
             * Check's if request body is not empty, if it is then the exception
             * is thrown
             * 
             * @param request
             * @returns
             */
            function validateRequest(request) {
                log.debug({
                    title: 'requestBody',
                    details: JSON.stringify(request)
                });
        
                if (common_library.isNullOrEmpty(request)) {
                    throw error.create({
                        name: 'INVALID_REQUEST',
                        message: 'There was an error with your request. The request body was empty.'
                    });
                }
            }

            /**
             * Tries to identify vendor id by looking for vid parameter from
             * request, if it is not found, then by looking for
             * custentityr7impartnermemberid from request payload - for
             * IMPARTNER integration only
             * 
             * @param request
             * @returns
             */
            function getVendorId(request) {
                var vendorId = common_library.isNullOrEmpty(request.vid) ? '' : request.vid.toUpperCase();
                var partnerObj = common_library.isNullOrEmpty(request.partner) ? null : request.partner;
                var impartnerMemberId = (!common_library.isNullOrEmpty(partnerObj) && !common_library.isNullOrEmpty(partnerObj.custentityr7impartnermemberid)) ? partnerObj.custentityr7impartnermemberid : null;
                if (common_library.isNullOrEmpty(vendorId) && !common_library.isNullOrEmpty(impartnerMemberId)) {
                    vendorId = 'IMP';
                }
                validateVendorId(vendorId);
                return vendorId;
            }

            /**
             * Checks if vendor identifoer not empty, if it is then the
             * exception is thrown
             * 
             * @param vendorId
             *                (string) - the vendor identifier
             * @returns
             */
            function validateVendorId(vendorId) {
                if (common_library.isNullOrEmpty(vendorId)) {
                    throw error.create({
                        name: 'INVALID_REQUEST',
                        message: 'Vendor id(vid) is required.'
                    });
                }
            }

            /*******************************************************************
             * END OF Supplementary functions
             ******************************************************************/

            
            return {
                get: doGet,
                post: doPost,
                put: doPut,
                delete: doDelete
            };

        });