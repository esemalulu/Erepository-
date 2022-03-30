function callDmdwreApi (payload) {
    var restletUrl = nlapiGetContext().getSetting('SCRIPT', 'custscript_target_url')
    //var restletUrl = 'http://initium-commerce-qa.apigee.net/v1/ecomplatformapi/inventory/full';
    var headers = new Array();
    headers['Content-Type'] = 'applicaton/xml';
    var method = 'POST';

	var restResponse = nlapiRequestURL(restletUrl, payload, headers, null, method);
}


function getInventory () {
    var allocation;
    var backorder;
    var id;
    var totalCount = 0;
    var fileNumber = 1;
    var searchId = nlapiGetContext().getSetting('SCRIPT', 'custscript_inv_search_id')
    var folderId = nlapiGetContext().getSetting('SCRIPT', 'custscript_target_folder_id')
	var START_TIME = new Date().getTime();
	var context = nlapiGetContext();

    var search = nlapiLoadSearch('item',searchId);
    var allResults = search.runSearch ();
    var searchResults = allResults.getResults(0,1000);
    nlapiLogExecution ('DEBUG', "OUT", "****STARTED****");

    xml = '<?xml version="1.0" encoding="UTF-8"?><inventory xmlns="http://www.demandware.com/xml/impex/inventory/2007-05-31" xmlns:fo="http://www.w3.org/1999/XSL/Format"><filenumber>'+fileNumber+'</filenumber><inventory-list><header list-id="inventory"><default-instock>false</default-instock><description>Product Sku inventory</description><use-bundle-inventory-only>false</use-bundle-inventory-only><on-order>false</on-order></header><records>';

 for(var i=0; i < searchResults.length; i++)
 {
     try {
        nlapiLogExecution ('DEBUG', "Count: ", totalCount);
		yieldScript(context, START_TIME);
        //checkGovernance();
        nlapiLogExecution ('DEBUG', "Item: ", JSON.stringify(searchResults[i]));
        allocation = parseInt(JSON.parse(JSON.stringify(searchResults[i])).columns.locationquantityavailable) + parseInt(JSON.parse(JSON.stringify(searchResults[i])).columns.custitem_vendor_inventory_on_hand);  
        backorder = 0;
        id = JSON.parse(JSON.stringify(searchResults[i])).columns.externalid.name;
        if (id != undefined){
            //id =  id.name;
             xml += '<record product-id="'+id+'">';
            if (allocation == undefined) {
                allocation = 0;
            }
             xml += '<allocation>'+allocation+'</allocation>';
             /*if (backorder == undefined) {
                backorder = 0;
             }*/
			xml += '<perpetual>false</perpetual><preorder-backorder-handling>none</preorder-backorder-handling><preorder-backorder-allocation>'+backorder+'</preorder-backorder-allocation>';
             xml += '</record>';
        }
        if (i == 999) {
            searchResults = allResults.getResults(totalCount+1,totalCount+1001);
            i = 0;
        }
        if (totalCount % 1000 == 0 && totalCount != 0) {
            nlapiLogExecution ('DEBUG', "BREAK", "BREAK THE FILE AT"+totalCount);
            xml += '</records></inventory-list></inventory>';
            callDmdwreApi (xml);
            var file = nlapiCreateFile('inventory_'+fileNumber+'.xml', 'XMLDOC', xml);
            file.setFolder (folderId);
            nlapiSubmitFile (file);
            fileNumber += 1;
    xml = '<?xml version="1.0" encoding="UTF-8"?><inventory xmlns="http://www.demandware.com/xml/impex/inventory/2007-05-31" xmlns:fo="http://www.w3.org/1999/XSL/Format"><filenumber>'+fileNumber+'</filenumber><inventory-list><header list-id="inventory"><default-instock>false</default-instock><description>Product Sku inventory</description><use-bundle-inventory-only>false</use-bundle-inventory-only><on-order>false</on-order></header><records>';
            //break;
        }
        totalCount = totalCount + 1;
 }
 catch (e) {
    nlapiLogExecution ('DEBUG', "OUT", e);
 }
 }
xml += '</records></inventory-list></inventory>';
callDmdwreApi (xml);

var file = nlapiCreateFile('inventory_'+fileNumber+'.xml', 'XMLDOC', xml);
file.setFolder (folderId);
nlapiSubmitFile (file);

nlapiLogExecution ('DEBUG', "OUT", "****FINISHED****");
 return "FINISHED";
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

