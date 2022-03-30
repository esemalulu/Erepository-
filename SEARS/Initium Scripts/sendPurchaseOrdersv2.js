	function sendObjToURL(stRequest, restletUrl)
	{
		var method = "POST";
		//user token
		/*var token = {
			public: 'LmpW80OwXawD16lGAOaVo9Mvpdjm',
			secret: 'tlzEEyYHGuWAL2JS9KGZaPY3HPEZ'
		};*/

		//app credentials
		/*var oauth = OAuth(
					{
						consumer :
						{
							public : 'N6cWeY9dXisHvuL3LpJUGYAVB34s1Huf',
							secret : 'txMhxaUZu8ByGBP9'
						},
						signature_method : 'HMAC-SHA1'
					});*/

		/*var request_data = {
			url: restletUrl,
			method: method,
			data: {}
		};*/

		/*var oauth_data = {
			oauth_consumer_key: oauth.consumer.public,
			oauth_nonce: oauth.getNonce(),
			oauth_signature_method: oauth.signature_method,
			oauth_timestamp: oauth.getTimeStamp(),
			oauth_version: '1.0',
			oauth_token: token.public
		};*/

		//var headerWithRealm = oauth.toHeader(oauth.authorize(request_data, token));
		//headerWithRealm.Authorization += ',realm= " " ';

		//HTTP headers
        var headers = new Array();
        headers['Content-Type'] = 'application/json';
        //headers['Authorization'] = headerWithRealm.Authorization;

/*		var objResponse = http.request({
			method: method,
			url: restletUrl,
			body: stRequest,
			headers: headers
		});*/
       nlapiLogExecution ('DEBUG', "SENDING...", "SENT TO APIGEE:"+stRequest);
        var resttResponse = nlapiRequestURL(restletUrl, stRequest, headers, null, method);

		return true;


	}
    function execute () {
        var sciUrl = nlapiGetContext().getSetting('SCRIPT', 'custscript_sci_url')
        var logfireUrl = nlapiGetContext().getSetting('SCRIPT', 'custscript_logfire_url')
		//var sciUrl = 'http://initium-commerce-dev.apigee.net/v1/orderfulfillmentapi/calgarysci/purchaseorders';
		//var logfireUrl = 'http://initium-commerce-dev.apigee.net/v1/orderfulfillmentapi/logfire/purchaseorders';

        nlapiLogExecution ('DEBUG', 'START', "***********START:********");
        nlapiLogExecution ('DEBUG', 'START', "***********SENDING TO SCI*********");
        nlapiLogExecution ('DEBUG', "OUTPUT", findPurchaseOrders ("sci", sciUrl));
        nlapiLogExecution ('DEBUG', 'START', "***********SENDING TO LOGFIRE*********");
        nlapiLogExecution ('DEBUG', "OUTPUT", findPurchaseOrders ("logfire", logfireUrl));
        nlapiLogExecution ('DEBUG', 'FINISHED', "***********FINISHED********");
    }

    function findPurchaseOrders (type, url) {
        if (type == "sci") {
            var regticketSearch = nlapiGetContext().getSetting('SCRIPT', 'custscript_reg_search')
            var searchResults = JSON.parse(JSON.stringify(nlapiSearchRecord(null, regticketSearch, null, null)));
        }
        else if (type == "logfire") {
            var bigticketSearch = nlapiGetContext().getSetting('SCRIPT', 'custscript_big_search')
            var searchResults = JSON.parse(JSON.stringify(nlapiSearchRecord(null,bigticketSearch, null, null)));
        }
        var obj = {purchaseOrders:[]};
        var order = {};
        var item_count = 0;
        var order_count = 0;
		try {
			order.tranid = searchResults[0].columns.tranid;
			order.duedate = searchResults[0].columns.trandate;
            order.vendorid = searchResults[0].columns.entityid;
            try {
                order.location = searchResults[0].columns.location.name;
                //warehouse codes
                if (order.location.indexOf("Calgary NLC") > -1) {
                    order.facility = '5402';
                }
                if (order.location.indexOf("Calgary SCI") > -1) {
                    order.facility = '5401';
                }
                if (order.location.indexOf("Belleville") > -1) {
                    order.facility = '5002';
                }
                if (order.location.indexOf("Montreal NLC") > -1) {
                    order.facility = '5056';
                }
                if (order.location.indexOf("Vaughan NLC") > -1) {
                    order.facility = '5303';
                }
            }
            catch (e) {nlapiLogExecution ('DEBUG', "NO LOCATION", "NO LOCATION");}
        for (var i=0; i < searchResults.length; i++) 
        {
            checkGovernance();
            if (searchResults[i].columns.tranid == order.tranid) {
                nlapiLogExecution ('DEBUG', "RECORD:",JSON.stringify(searchResults[i]));
                try {
                    var externalid = getItemExternalID(searchResults[i].columns.item.internalid);
                    if (externalid != null && externalid != '') {
                        externalid = externalid.toString();
                        nlapiLogExecution ('DEBUG', "EXTERNAL ID:", "Item External ID:"+externalid); 
                        if (item_count == 0) { order.items = []; }
                        order.items[item_count] = {};
                        order.items[item_count].itemid = externalid;
                        order.items[item_count].quantity = searchResults[i].columns.quantity;
                        order.items[item_count].custcol_line_id = item_count+1;
                        item_count = item_count + 1;
                    }
                    else {
                        nlapiLogExecution ('DEBUG', "ERROR NO ID", "Error no item external id");
                    }
                }
                catch (e) {
                    nlapiLogExecution ('DEBUG', "ERROR NO ID", "Error no item external id:"+e);
                }
            }
            else {
                nlapiLogExecution ('DEBUG', "", "FINISHED SEARCH");
                if (order.items != undefined) {
                    if (order.items.length != 0) {
						var record = nlapiLoadRecord ('purchaseorder', searchResults[i].id);
                        nlapiLogExecution ('DEBUG', "", "ADDED ORDER");
                        obj.purchaseOrders.push(order);
                        order_count = order_count + 1;
						var record = nlapiLoadRecord ('purchaseorder', searchResults[i].id);
						nlapiLogExecution ('DEBUG', 'SENT TO WMS', record.getFieldValue ('custbody_sent_to_apigee'));
						record.setFieldValue ('custbody_sent_to_apigee', 'T');
                        var id = nlapiSubmitRecord (record, true);
                        nlapiLogExecution ('DEBUG', "ORDER:", JSON.stringify(record));
                    }
                }
                //if (obj.purchaseOrders.length >= 10) {
                sendObjToURL(JSON.stringify(obj), url);
                obj = {purchaseOrders:[]};
                //}
                order = {};
                item_count = 0;
                order.tranid = searchResults[i].columns.tranid;
                order.duedate = searchResults[i].columns.trandate;
                order.vendorid = searchResults[i].columns.entityid;
                try {
                    order.location = searchResults[i].columns.location.name;
                    //warehouse codes
                    if (order.location.indexOf("Calgary NLC") > -1) {
                        order.facility = '5402';
                    }
                    if (order.location.indexOf("Calgary SCI") > -1) {
                        order.facility = '5401';
                    }
                    if (order.location.indexOf("Belleville") > -1) {
                        order.facility = '5002';
                    }
                    if (order.location.indexOf("Montreal NLC") > -1) {
                        order.facility = '5056';
                    }
                    if (order.location.indexOf("Vaughan NLC") > -1) {
                        order.facility = '5303';
                    }
                }

                catch (e) {nlapiLogExecution ('DEBUG', "NO LOCATION", "NO LOCATION");}
                i = i - 1;
            }
        }
		}
		catch (e) {
			nlapiLogExecution ('DEBUG', "SEARCH RESULTS", "SAVED SEARCH RETURN NO RESULTS");
		}
        //search is completed, check if valid payload. If it is, send it out.
        if (order.items != undefined) {
            if (order.items.length != 0) {
                var record = nlapiLoadRecord ('purchaseorder', searchResults[searchResults.length-1].id);
                nlapiLogExecution ('DEBUG', "", "ADDED ORDER");
                obj.purchaseOrders.push(order);
                order_count = order_count + 1;
                nlapiLogExecution ('DEBUG', 'SENT TO WMS', record.getFieldValue ('custbody_sent_to_apigee'));
                record.setFieldValue ('custbody_sent_to_apigee', 'T');
                var id = nlapiSubmitRecord (record, true);
                //nlapiLogExecution ('DEBUG', "ORDER:", JSON.stringify(record));
            }
        }
        if (obj.purchaseOrders.length != 0) {
            sendObjToURL(JSON.stringify(obj), url);
        }
        else {
            nlapiLogExecution ('DEBUG', "Invalid PO", JSON.stringify(obj));
        }
    }
    
   function getItemExternalID (internalID) {
		var arrSearchFilter = [];
		var arrSearchColumn = [];
		arrSearchFilter[0] = new nlobjSearchFilter('internalID', null, 'is', internalID);
        nlapiLogExecution ('DEBUG', "ID:", "Finding external id");

		arrSearchColumn[0] = new nlobjSearchColumn('externalid');
		var arrSearchResult = nlapiSearchRecord('inventoryitem', null, arrSearchFilter, arrSearchColumn);
        nlapiLogExecution ('DEBUG', "ID:", "Finding external id again");
        if (arrSearchResult == undefined) {
            return '';
        }
        else {
            nlapiLogExecution ('DEBUG', "ID:", JSON.stringify(arrSearchResult));
            return JSON.parse(JSON.stringify(arrSearchResult))[0].columns.externalid.name;
        }
	} 

function checkGovernance() {
	var context = nlapiGetContext();
	if (context.getRemainingUsage() < 150) {
		var status = nlapiScheduleScript(context.getScriptId(), 
				context.getDeploymentId());
		nlapiLogExecution("DEBUG", "Reschedule status", status);
	}
}