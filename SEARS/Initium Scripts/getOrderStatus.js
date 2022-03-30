function callDmdwreApi (payload) {
    var restletUrl = nlapiGetContext().getSetting('SCRIPT', 'custscript_target_url_order')
    //var restletUrl = 'http://initium-commerce-qa.apigee.net/v1/ecomplatformapi/pricebooks/full';
    var headers = new Array();
    headers['Content-Type'] = 'applicaton/xml';
    var method = 'POST';

	var restResponse = nlapiRequestURL(restletUrl, payload, headers, null, method);
}


function getOrderStatus () {
    nlapiLogExecution ('DEBUG', 'RUN', '******STARTED******');
    var totalCount = 0;
    var fileNumber = 1;
    var searchId = nlapiGetContext().getSetting('SCRIPT', 'custscript_order_search_id')
    var folderId = nlapiGetContext().getSetting('SCRIPT', 'custscript_target_folder_id_order')
    var search = nlapiLoadSearch('salesorder',searchId);
	var START_TIME = new Date().getTime();
	var context = nlapiGetContext();

    var allResults = search.runSearch ();
    var searchResults = JSON.parse(JSON.stringify(allResults.getResults(0,1000)));
    nlapiLogExecution ('DEBUG', 'RUN', 'GOT PARAMETERS');

    xml = '<?xml version="1.0" encoding="UTF-8"?><orders><filenumber>'+fileNumber+'</filenumber>';

 for(var i=0; i < searchResults.length; i++)
 {
     try {
        searchResult = searchResults[i];
		yieldScript(context, START_TIME);
        nlapiLogExecution ('DEBUG', "ORDER: ", JSON.stringify(searchResult));
        var internalid = searchResult.columns.internalid;
        if (internalid != undefined && internalid != null && internalid != '') {
            internalid = internalid.name;
            nlapiLogExecution ('DEBUG', "DMDWRE", "ORDER ID:"+internalid);
            try {
                var orderrecord = nlapiLoadRecord ('salesorder', internalid);
            }
            catch (e) {
                nlapiLogExecution ('DEBUG', "UNABLE TO UPDATE SENT TO DMDWRE FLAG", e);
            }
            var orderid = orderrecord.getFieldValue ('externalid');
            var status = orderrecord.getFieldText('orderstatus');
            var customerid = orderrecord.getFieldValue('custbody_customer_id');
            if (customerid != undefined && customerid != null && customerid != '' && status != undefined && status != null && status != '') {
             xml += '<order SO_ID="'+orderid+'">';
             xml += '<status>'+status+'</status>';
             xml += '<customerid>'+customerid+'</customerid>';
             xml += '<items>';
            var linenumcount = orderrecord.getLineItemCount('item');
            for (var j=1; j <= linenumcount; j++) {
                nlapiLogExecution ('DEBUG', "ADDED ITEM", "ADDED ITEM");
                var itemid = getItemExternalID(orderrecord.getLineItemValue ('item','item',j));
                var trackingnum = orderrecord.getLineItemValue ('item', 'custcol_sears_tracking_number', j);
                if (itemid != undefined && itemid != null && itemid != '') {
                     xml += '<item itemID="'+itemid+'">';
                     xml += '<trackingNo>'+trackingnum+'</trackingNo>';
                     xml += '<carrierName>UPS</carrierName>';
                     xml += '<carrierURI>www.ups.com/content/ca/en/</carrierURI>';
                     xml += '</item>';
                }
            }
            xml += '</items>';
            xml += '</order>';
            nlapiLogExecution ('DEBUG', "Count: ", totalCount);

            }
            orderrecord.setFieldValue ('custbody_sent_to_dmdwre', 'T');
            nlapiSubmitRecord (orderrecord);
            nlapiLogExecution ('DEBUG', "DMDWRE", "UPDATED DMDWRE FLAG"+internalid);
        }
        totalCount += 1;
       if (i == 999) {
            searchResults = JSON.parse(JSON.stringify(allResults.getResults(totalCount+1,totalCount+1001)));
            i = -1;
        }
        if (totalCount%1000 == 0 && totalCount!=0) {
            xml += '</orders>';
            nlapiLogExecution ('DEBUG', "SENT", "SENT");
            callDmdwreApi (xml);
            var file = nlapiCreateFile('orderstatus_'+fileNumber+'.xml', 'XMLDOC', xml);
            file.setFolder (folderId);
            nlapiSubmitFile (file);
            fileNumber += 1;
            xml = '<?xml version="1.0" encoding="UTF-8"?><orders><filenumber>'+fileNumber+'</filenumber>';
            //return false;
            //break;
       } 
 }
 catch (e) {
	nlapiLogExecution ('DEBUG', 'RUN', e);
 }
 }
xml += '</orders>';
callDmdwreApi (xml);

var file = nlapiCreateFile('orderstatus_'+fileNumber+'.xml', 'XMLDOC', xml);
file.setFolder (folderId);
nlapiSubmitFile (file);

nlapiLogExecution ('DEBUG', 'RUN', '******FINISHED******');
}

function yieldScript(context, startTime) {
    var reschedule = false;

    //yield the script if the remaining usage is less than 500
    var intRemainingUsage = context.getRemainingUsage();
    if (intRemainingUsage < 500) {
        reschedule = true;
    }

    //yield the script if the execution time is greater than 45 minutes
    var currentTime = new Date().getTime();
    var timeDifference = currentTime - startTime;
    //2,700,00 is 45 minutes
    if (timeDifference > 2700000) {
        reschedule = true;
    }

    if (reschedule) {
        nlapiYieldScript();
        START_TIME = new Date().getTime();
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

function searchSalesOrderByExternalId (externalId) {
    var internalid;
    try {
        var arrSalesOrder = nlapiSearchRecord('salesorder', null, [(new nlobjSearchFilter('externalid',null,'is',externalId))]);
        if (arrSalesOrder && arrSalesOrder.length)
        {
            internalid = arrSalesOrder[0].getId();
        }
    }
    catch (e) {
        nlapiLogExecution ('DEBUG', "SEARHC SALES ORDER BY EXTERNAL ID", e);
        return null;
    }
    return internalid;
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

