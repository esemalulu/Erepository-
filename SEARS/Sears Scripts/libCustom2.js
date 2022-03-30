/**
 * @NModuleScope Public
 * @NApiVersion 2.x
 */
define(['N/search', 'N/runtime', 'N/format', 'N/error', 'N/http', 'N/https'],
    /**
     * @param {search} search
     * @param {runtime} runtime
     * @param {format} format
     * @param {error} error
     * @param {http} http
     */
    function(search, runtime, format, error, http, https) {
        var libCustom2 = {};

        /**
         * Writes a test log
         * @memberOf libCustom2
         */
        libCustom2.writeLog = function() {
            log.debug('TESTING', 'THIS IS A TEST MESSAGE');
        };

        /**
         * Executes all necessary functions
         * @param stRequest
         * @memberOf libCustom2
         */
        libCustom2.exe = function(stRequest) {
            var logTitle = "ClearD Integration";
            log.debug(logTitle, "********START********");
            // var searchResults = nlapiSearchRecord(null, 'customsearchcleardsearch', null, null);
            var token = getToken();
            log.debug(logTitle, "TOKEN:" + token);
            
            var returnFalse = false;
            
            var orders = JSON.parse(stRequest);
            orders.salesOrders.forEach(function(elem) {
            	
            	if (elem.items) {
            		var tasks = [];
            		
            		elem.items.forEach(function(item) {
            			tasks.push({
                            "taskType": "D",
                            "sku": item.itemid,
//                            "skuDescription": "string",
//                            "manufacturer": "string",
                            "quantity": item.quantity,
                            "volume": item.quantity,
//                            "taskNote": "string",
//                            "serialNumber": "string",
//                            "barCode": "string",
                            "serviceTime": 10
                        });
            		});
            		
	            	var name = ["string", "string"];
	            	var shipAddress = ["string", "string"];
	            	
	            	if (elem.shipaddressee) {
	            		var tempName = elem.shipaddressee.split(' ');
	            		name[0] = tempName[0];
	            		name[1] = tempName[1];
	            	}
	            	
	            	if (elem.shipaddr1) {
	            		var tempShipAddress = elem.shipaddr1.split(' ');
	            		shipAddress[0] = tempShipAddress[0];
	            		shipAddress[1] = '';
	            		for(var i = 1; i < tempShipAddress.length; i++) {
	            			shipAddress[1] += tempShipAddress[i]+' ';
	            		}
	            	}
	            	
	            	var date = new Date();
	            	var day = ("0" + date.getDate()).slice(-2);
	            	var desDay = ("0" + (date.getDate() + 10)).slice(-2);
	            	var month = ("0" + (date.getMonth() + 1)).slice(-2);
	            	var year = date.getFullYear();
	
	                var requestJSON = {
	                    "order": {
	//                        "idBusinessUnit": 0,
	                        "invoiceNumber": elem.tranid,
	//                        "retailerReferenceNumber": "string",
	//                        "salemanName": "string",
	//                        "salemanID": "string",
	//                        "stopInstruction": "string",
	//                        "saleLocationUserNumber": "string",
	//                        "paymentAtDelivery": 0,
	//                        "needToBeReceive": "string",
	//                        "distributionZone": "string",
	//                        "distributorDomainName": "string",
	//                        "company": "Sears Canada",
	//                        "carrier": "string",
	//                        "wareHouseNumber": "string",
	//                        "wareHouseIdZone": 0,
	                        "originType": 3,
	//                        "originLocationUserNumber": "string",
	//                        "originCivic": "string",
	//                        "originStreet": "string",
	//                        "originUnitType": "string",
	//                        "originUnit": "string",
	//                        "originCity": "string",
	//                        "originProvinceID": 0,
	//                        "originPostalCode": "string",
	//                        "originCustomerFirstName": "string",
	//                        "originCustomerLastName": "string",
	//                        "originCustomerNumber": "string",
	//                        "originPhoneNumber1": "string",
	//                        "originPhoneExtension1": "string",
	//                        "originPhoneNumber2": "string",
	//                        "originPhoneExtension2": "string",
//	                        "originDate": elem.trandate, //original date
	                        "originDate": year+'-'+month+'-'+day,
	//                        "originStartTime": "string",
	//                        "originEndTime": "string",
	//                        "originEmail": "string",
	//                        "orginIsCallAllowed": true,
	                        "destinationType": 1,
	//                        "destinationLocationUserNumber": "string",
	                        "destinationCivic": shipAddress[0],
	                        "destinationStreet": shipAddress[1],
	//                        "destinationUnitType": "string",
	//                        "destinationUnit": "string",
	                        "destinationCity": elem.shipcity,
	                        "destinationProvinceID": 3,
	                        "destinationPostalCode": elem.shipzip,
	                        "destinationCustomerFirstName": name[0],
	                        "destinationCustomerLastName": name[1],
	//                        "destinationCustomerNumber": "string",
	                        "destinationPhoneNumber1": elem.shipphone,
	//                        "destinationPhoneExtension1": "string",
	//                        "destinationPhoneNumber2": "string",
	//                        "destinationPhoneExtension2": "string",
//	                        "destinationDate": elem.trandate, //original destinationDate
	                        "destinationDate": year+'-'+month+'-'+desDay,
//	                        "destinationStartTime": elem.trandate, //original destinationStartTime
	                        "destinationStartTime": year+'-'+month+'-'+desDay,
//	                        "destinationEndTime": elem.trandate, //original destinationEndTime
	                        "destinationEndTime": year+'-'+month+'-'+desDay,
	//                        "destinationEmail": "string",
	//                        "destinationIsCallAllowed": true,
	                        "tasks": tasks
	                    }
	                };
	                log.debug("***REQUEST JSON***", requestJSON);
	                var response = importOrder(token, requestJSON);
	                if (response) {
	                	returnFalse = false;
	                	
		                var hubId = JSON.parse(getHubId(elem.tranid, token));
		                //added: added checking; @bfeliciano
		                if (hubId && hubId.idHub)
	                    {
		                	returnFalse = false;
		                    elem.hubid = hubId.idHub || null;
	                    } else {
	                    	elem = {};
	                    	returnFalse = true;
	                    }
	                } else {
	                	elem = {};
	                	returnFalse = true;
	                }
            	}

            });
            
//            log.debug(logTitle, response);
            log.debug(logTitle, "********FINISH********");
            
            if (returnFalse) {
            	return false;
            }
            return JSON.stringify(orders);
        };

        function getToken() {
            var method = "GET";
            var restletUrl = "http://initium-commerce-prod.apigee.net/cleardapi/login?username=preproduser@sears&password=lksa12?";
//            var restletUrl = "http://initium-commerce-dev.apigee.net/cleardapi/login?username=testuser@sears&password=lksa12?";
            
            //HTTP headers
            var headers = new Array();
            headers['Content-Type'] = 'application/json';

            // var resttResponse = nlapiRequestURL(restletUrl, null, headers, null, method);
            var resttResponse = http.request({
                method: method,
                url: restletUrl,
                headers: headers
            });
            log.debug("ClearD Integration", resttResponse.body);
            return JSON.parse(resttResponse.body).access_token;
        }

        function importOrder(token, requestObject) {
            var method = "POST";
            var restletUrl = "http://initium-commerce-prod.apigee.net/cleardapi/import/order";
//            var restletUrl = "http://initium-commerce-dev.apigee.net/cleardapi/import/order";

            //HTTP headers
            var headers = new Array();
            headers['Content-Type'] = 'application/json';
            headers['Authorization'] = "Bearer " + token;

            // var resttResponse = nlapiRequestURL(restletUrl, requestObject, headers, null, method);
            var resttResponse = http.request({
                method: method,
                url: restletUrl,
                body: JSON.stringify(requestObject),
                headers: headers
            });
            log.debug("ClearD Integration", resttResponse.body);
            log.debug("***IMPORT ORDER RESP STATUS***", resttResponse.code);
            if (resttResponse.code === 400) {
            	return false;
            }
            return resttResponse.body;
        }
        
        function getHubId(invoiceNumber, token) {
        	var method = "GET";
//            var restletUrl = "http://initium-commerce-prod.apigee.net/cleardapi/wms/finalhub?invoiceNumber="+invoiceNumber;
//            var restletUrl = "http://initium-commerce-dev.apigee.net/cleardapi/wms/finalhub?invoiceNumber="+invoiceNumber;
        	var restletUrl = "https://api.cleardmanager.com/wms/finalhub?invoiceNumber="+invoiceNumber;

            //HTTP headers
            var headers = new Array();
            headers['Content-Type'] = 'application/json';
            headers['Authorization'] = "Bearer " + token;

            // var resttResponse = nlapiRequestURL(restletUrl, requestObject, headers, null, method);
            var resttResponse = https.request({
                method: method,
                url: restletUrl,
                headers: headers
            });
            log.debug("HUB ID", resttResponse.body);
            return resttResponse.body;
		}

        return libCustom2;
    });
