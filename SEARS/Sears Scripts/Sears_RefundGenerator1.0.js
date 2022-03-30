function post (objRequest) {	
    var objResponse = {};
	var logTitle = "Refund 1.0";

    nlapiLogExecution('DEBUG', logTitle,"****START****");
    try {
        var filters = new Array();		
	nlapiLogExecution('DEBUG', logTitle, objRequest.orderId);
        filters[0] = new nlobjSearchFilter('custbody_integration_so_external_id', null, 'is', objRequest.orderId);
        //filters[1] = new nlobjSearchFilter('amount', null, 'greater than', objRequest.amount);

        var cashSaleResults = nlapiSearchRecord("cashsale", null, filters, null);

        nlapiLogExecution('DEBUG', logTitle, "RESULTS:" +JSON.stringify(cashSaleResults));
        if(cashSaleResults == null){
            nlapiLogExecution('DEBUG', logTitle, "NO CASH SALES FOUND");
        }
        var cashSaleId = cashSaleResults[0]['id'];
        if (cashSaleId == null) {
            nlapiLogExecution('DEBUG', logTitle, "NO CASH SALES FOUND");
        }
        nlapiLogExecution('DEBUG', logTitle, cashSaleId);
        var refundRecord = nlapiTransformRecord('cashsale', cashSaleResults[0]['id'], 'cashrefund');

        var refundItemCount = refundRecord.getLineItemCount('item');
        for (var i = 1; i <= refundItemCount; i++) {
            /*var currentItem = refundRecord.getLineItemValue("item","custcol_externalid",i);
            nlapiLogExecution ('DEBUG', logTitle, currentItem);
            if  (currentItem == objRequest.itemId) {*/
	    refundRecord.setLineItemValue("item", "quantity", i, 0);
	    //refundRecord.setLineItemValue("item", "rate", i, objRequest.amount);
            /*}
            else {
                refundRecord.setLineItemValue("item", "quantity", i, 0);
                nlapiLogExecution ('DEBUG', logTitle, "ITEM ZEROED");
            }*/
        }   
        var serviceItemId = getItemId(objRequest.itemId);
	refundRecord.insertLineItem("item", refundItemCount+1);
	refundRecord.setLineItemValue("item", "item", refundItemCount+1, serviceItemId);
	refundRecord.setLineItemValue("item", "quantity", refundItemCount+1, 1);
	refundRecord.setLineItemValue("item", "location", refundItemCount+1, 4);
	refundRecord.setLineItemValue("item", "rate", refundItemCount+1, objRequest.amount);
	  
        var accountId = getAccountId(objRequest.account);
        nlapiLogExecution('DEBUG', logTitle, "ACCOUNT ID:"+accountId);
        refundRecord.setFieldValue("account", accountId);
	refundRecord.setFieldValue("shippingcost", 0);
        var id = nlapiSubmitRecord(refundRecord);
        objResponse["id"] = id;
        objResponse["status"] = "SUCCESS";
        objResponse["message"] = "SUCCESS";
    }
    catch (e) {
        nlapiLogExecution('DEBUG', logTitle, e);
        objResponse["id"] = null;
        objResponse["status"] = "FAILED";
        objResponse["message"] = e;
    }
        

    return objResponse;
}

function getAccountId (accountName) {
        var logTitle = "GET ACCOUNT ID";
        var filters = new Array();		
        nlapiLogExecution('DEBUG', "GET ACCOUNT ID", accountName);
        filters[0] = new nlobjSearchFilter('number', null, 'contains', accountName);

        var accountResults = nlapiSearchRecord("account", null, filters, null);

        nlapiLogExecution('DEBUG', logTitle, "RESULTS:" +JSON.stringify(accountResults));
        if(accountResults == null){
            nlapiLogExecution('DEBUG', logTitle, "NO ACCOUNTS FOUND");
        }
        var accountId = accountResults[0]['id'];
        if (accountId == null) {
            nlapiLogExecution('DEBUG', logTitle, "NO ACCOUNTS FOUND");
        }
        nlapiLogExecution('DEBUG', logTitle, accountId);
        return accountId;
}

function getItemId (itemName) {
        var logTitle = "GET ITEM ID";
        var filters = new Array();		
        nlapiLogExecution('DEBUG', logTitle, itemName);
        filters[0] = new nlobjSearchFilter('itemid', null, 'contains', itemName);

        var itemResults = nlapiSearchRecord("inventoryitem", null, filters, null);

        nlapiLogExecution('DEBUG', logTitle, "RESULTS:" +JSON.stringify(itemResults));
        if(itemResults == null){
            nlapiLogExecution('DEBUG', logTitle, "NO ITEM FOUND");
        }
        var itemId = itemResults[0]['id'];
        if (itemId == null) {
            nlapiLogExecution('DEBUG', logTitle, "NO ITEM FOUND");
        }
        nlapiLogExecution('DEBUG', logTitle, itemId);
        return itemId;
}
