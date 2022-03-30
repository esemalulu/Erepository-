function getShippingDetailsfromFTP() {

    var logTitle = "Read FTP";

    log(logTitle,"****START**** Executed");
	var clientId  = nlapiGetContext().getSetting('SCRIPT','custscript_apigee_username_readftp_sche');
	var clientSecret = nlapiGetContext().getSetting('SCRIPT','custscript_apigee_password_readftp_sche');
	var urlFromScript = nlapiGetContext().getSetting('SCRIPT','custscript_apigee_url_readftp_sche');
	var lastFile = nlapiGetContext().getSetting('SCRIPT','custscript_last_read_file_name');
	log(logTitle, "--URL- " + urlFromScript);
	log(logTitle, "--Username & password of apigee -- " + clientId + " -- " + clientSecret);

    var authorizationBasic = nlapiEncrypt(clientId + ':' + clientSecret,'base64');
	var headers = new Array();
	headers['Authorization'] = 'Basic ' + authorizationBasic ;
    var storeReturnsLog = nlapiCreateRecord('customrecord_store_returns_log');
    var failed = false;
    try  {

    var response = nlapiRequestURL(urlFromScript, null, headers, 'POST');

    var result = JSON.parse(response.getBody());
    log(logTitle,"---result from server" + JSON.stringify(result));
    if(result['status'] === 'FAIL'){
    	var data = result["messages"][0];

        var date = new Date();
        storeReturnsLog.setFieldValue('custrecord_end_time',date.toString());
        storeReturnsLog.setFieldValue('custrecord_file_status', 'FAILURE FROM APIGEE');
        var storeReturnsLogId = nlapiSubmitRecord(storeReturnsLog);
        log(logTitle, "LOG ID:"+storeReturnsLogId);

    	log(logTitle,"---Error- " + data);
    	return false;
    }
	var fileName = result['filename'];

    storeReturnsLog.setFieldValue('custrecord_file_name',fileName);
    var date = new Date();
    storeReturnsLog.setFieldValue('custrecord_start_time', date.toString());
    //date.getFullYear() + "-" + (date.getMonth()+1) + "-" + date.getDate() + ":" + date.get);

	log(logTitle,"---last file name- " + lastFile);
	log(logTitle,"---file name- " + fileName);
	if(fileName === lastFile){
		errorLog(logTitle,"---Error- No latest files found");

        var date = new Date();
        storeReturnsLog.setFieldValue('custrecord_end_time',date.toString());
        storeReturnsLog.setFieldValue('custrecord_file_status', 'NO NEW FILE');
        var storeReturnsLogId = nlapiSubmitRecord(storeReturnsLog);
        log(logTitle, "LOG ID:"+storeReturnsLogId);
		return false;
	}
    var xml = result["messages"][0];
    log(logTitle,"---XML data from FTP - " + xml);
	var asDoc = nlapiStringToXML(xml);
    var scanNodes = nlapiSelectNodes(asDoc, '//Scan');
    var data_list = [];
    
    log(logTitle,"---Total input count - " + scanNodes.length);

    var salesOrder=new Object();
    // var salesOrder_final=new Array();

    for (var i = 0; i < scanNodes.length; i++) {
    	var data = new Object();
		data['TrackingNumber'] = nlapiSelectValue(scanNodes[i], "@TrackingNumber");
		data['Status'] = nlapiSelectValue(scanNodes[i], "@Status");
		var shipmentNode = nlapiSelectNode(scanNodes[i], "//Shipment");
		data['Servicetype'] = nlapiSelectValue(scanNodes[i],"Shipment/@Service");
		data['SalesOrderNo'] = nlapiSelectValue(scanNodes[i],"Shipment/@SalesOrderNo");
		var ItemIds = nlapiSelectValues(scanNodes[i],"Shipment/Item");
		data['Status'] = nlapiSelectValue(scanNodes[i], "@Status");

		//Grouping Sales Order and item by Ids.
        if(data['Servicetype'] === "RETURN" && data['Status'] === "1" && typeof data['SalesOrderNo'] != "undefined" && data['SalesOrderNo'] != ""){
        	if(typeof salesOrder[data['SalesOrderNo']] != "undefined"){
        		var items=new Object();        		
        		for(ItemId in ItemIds){        			
        			if(typeof salesOrder[data['SalesOrderNo']][ItemIds[ItemId]] != "undefined"){
        				salesOrder[data['SalesOrderNo']][ItemIds[ItemId]]= parseInt(salesOrder[data['SalesOrderNo']][ItemIds[ItemId]])+1;
        			}else{
        				salesOrder[data['SalesOrderNo']][ItemIds[ItemId]]=1;
        			}        		       			
        		}
        	}else{
        		var items=new Object();        		
        		for(ItemId in ItemIds){        			 
        			if(typeof items[ItemIds[ItemId]] != "undefined"){
        				items[ItemIds[ItemId]]= items[ItemIds[ItemId]]+1;
        			}else{
        				items[ItemIds[ItemId]]=1;
        			}
        		}
        		salesOrder[data['SalesOrderNo']]=items; 
        	}        	
        }        
    }
    log(logTitle,"-- salesOrder --" + JSON.stringify(salesOrder));
         /*salesOrder = {
         "E0051212": {
             "10321000_I": 2
           }
       };*/

    //Processing Sales Order.
    for (sales in salesOrder) {		
		var itemLists=salesOrder[sales];

		log("sales order no.",sales);
        log(logTitle,"Item List." +JSON.stringify(itemLists));

		var filtersProd = new Array();
		

		var removeLineItemIDs=new Array();
		var submittedItems = new Array();

        var is_itemAvailable = false;
        var cashSaleId = null;
        var returnRecord = null;
		for(item in itemLists){

            var filters = new Array();		
            filters[0] = new nlobjSearchFilter('custbody_sears_sales_ordernum', null, 'is', sales.replace("-S","").replace("-s","").replace("-B","").replace("-b","").replace("~",""));
            log(logTitle, "ITEM:"+item);
            filters[1] = new nlobjSearchFilter('custcol_externalid', null, 'is', item);

            var salesOrderList = nlapiSearchRecord("cashsale", null, filters,null);

            log(logTitle,"SO List." +JSON.stringify(salesOrderList));
            if(salesOrderList == null){
                errorLog(logTitle,"Sales order Not found in NS,SO num:  " + sales);
                failed = true;
                continue;
            }
            var newCashSaleId = salesOrderList[0]['id'];
            if (cashSaleId == null) {
                cashSaleId = salesOrderList[0]['id'];

                returnRecord = nlapiTransformRecord('cashsale', salesOrderList[0]['id'], 'returnauthorization');
                var lineItemCount = returnRecord.getLineItemCount('item');
                log(logTitle,"lineItemCount: " +lineItemCount);
            }
            else if (newCashSaleId != cashSaleId) {

                // remove non inventory line items from RA
                var lineItemCountNonInv= returnRecord.getLineItemCount('item');
                for (var removeCountNonInv = 1; removeCountNonInv <= lineItemCountNonInv; removeCountNonInv++) {

                    if (returnRecord.getLineItemValue('item', 'itemtype', removeCountNonInv) != 'InvtPart') {
                        returnRecord.removeLineItem('item',removeCountNonInv);	
                        removeCountNonInv--;
                        lineItemCountNonInv--;
                    }
                }
                        
                var recId = null;
                if(is_itemAvailable){
                        var returnItemCount = returnRecord.getLineItemCount('item');
                        var badItems = [];
                        log(logTitle, "Trying to submit return...");
                                log(logTitle, "item Lists...:"+returnItemCount);
                        try {
                        for (var i = 1; i <= returnItemCount; i++) {
                                log(logTitle, "Looping...:"+i);
                            var itemId = returnRecord.getLineItemValue('item', 'custcol_externalid', i);
                                log(logTitle, "checking item:"+itemId);
                            if (!itemLists.hasOwnProperty(itemId)) {
                                        log(logTitle, "bad item:"+itemId);
                                        badItems.push(itemId);
                            }
                            else {
                                        log(logTitle, "good item:"+itemId);
                            }
                        }
                        for (var i=0; i < badItems.length; i++) {
                            var newCount = returnRecord.getLineItemCount('item');
                            for (var j = 1; j <= newCount; j++) {
                                var newId = returnRecord.getLineItemValue('item', 'custcol_externalid', j);
                                if (newId == badItems[i]) {
                                        log(logTitle, "bad item remove:"+newId);
                                        returnRecord.removeLineItem('item', j);
                                }
                            }
                        }
                        }
                        catch (e) {
                            log(logTitle, e);
                        }
                    log(logTitle,"Start submit count" + returnRecord.getLineItemCount('item'));
                    recId = nlapiSubmitRecord(returnRecord);
                    log(logTitle,"Record submitted");
                }
                else{
                                if(itemFound) {   
                        errorLog(logTitle,"None of the item is available for refund: "+ salesOrderList[0]['id'] +", itemid :"+ itemList[0]['id']);
                                } else {
                        errorLog(logTitle,"None of the item is available for refund: "+ salesOrderList[0]['id'] );
                                }
                    continue;
                }

                var companyInfo = nlapiLoadConfiguration('companypreferences');
                companyInfo.setFieldValue('custscript_last_read_file_name', fileName );
                nlapiSubmitConfiguration(companyInfo);

                log(logTitle,"Updated file is:  " + companyInfo.getFieldValue('custscript_last_read_file_name')); 
                log(logTitle,"success, RMA ID is: " + recId); 
                 
                // itemreceipt
                var receiveRecord = nlapiTransformRecord('returnauthorization', recId, 'itemreceipt');
                var receiveItemCount = receiveRecord.getLineItemCount('item');
                for (var i = 1; i <= receiveItemCount; i++) {
                    receiveRecord.setLineItemValue("item", "location", i, 75);
                }
                nlapiSubmitRecord(receiveRecord);

                // // cashrefund
                var cashRefundRecord = nlapiTransformRecord('returnauthorization', recId, 'cashrefund');
                cashRefundRecord.setFieldValue("account",119); //3344//1200//A_102162	RETURNS CAT/COP -1735 //A_006805 SEARS CREDIT CLEARING ACC RE
                var cashId = nlapiSubmitRecord(cashRefundRecord);
                log(logTitle, "CASH REFUND ID:"+cashId);

                cashSaleId = salesOrderList[0]['id'];
                returnRecord = nlapiTransformRecord('cashsale', salesOrderList[0]['id'], 'returnauthorization');
                var lineItemCount = returnRecord.getLineItemCount('item');
                log(logTitle,"lineItemCount: " +lineItemCount);

            }

			filtersProd[0] = new nlobjSearchFilter('custitem_external_id', null, 'is', item);
			var itemList = nlapiSearchRecord("inventoryItem", null, filtersProd,null);
			var itemFound = true;			
			if(itemList == null){
				errorLog(logTitle,"Item Not found in NS, Item external id:  " + item);
                                itemFound = false;
                failed = true;
				continue;
			}

			var ItemCount=0;
			var lineID=0;
			for (var removeCount = 1; removeCount <= lineItemCount; removeCount++) {
				if(returnRecord.getLineItemValue("item", "item", removeCount) === itemList[0]['id']){
					ItemCount++;	
					lineID = removeCount;
					break;							
				}	
			}
			if(ItemCount==0){
				// returnRecord.removeLineItem('item',1);
				removeLineItemIDs.push(itemList[0]['id']);
				continue;
			}

			if(salesOrderList != null && typeof salesOrderList[0] != "undefined" && itemList != null && typeof itemList[0] != "undefined"){
				var itemName = nlapiLookupField('inventoryitem', itemList[0]['id'], 'itemid');    				
				//Checking availability of return
				var returnFlag = checkReturnAvailability(cashSaleId,itemList[0]['id'],itemLists[item]);
				log(logTitle,"return from checkReturnAvailability" + returnFlag);
				if(!returnFlag){
					log(logTitle, "BAD:"+itemLists[item]);
					removeLineItemIDs.push(itemList[0]['id']);
					errorLog(logTitle,"The item already returned SOId: " + salesOrderList[0]['id'] +", itemid :"+ itemList[0]['id']+", qty : "+itemLists[item]);    					
				}else{
					log(logTitle, "GOOD:"+itemLists[item]);
					returnRecord.selectLineItem('item',lineID);
					returnRecord.setCurrentLineItemValue('item', 'quantity', itemLists[item]);
					returnRecord.commitLineItem('item');
                    var price = returnRecord.getLineItemValue('item','rate',itemLists[item]);
                  	returnRecord.setCurrentLineItemValue('item', 'rate', price);
                  log(logTitle, "PRICE:"+price);
					is_itemAvailable = true;
					submittedItems.push(itemList[0]['id']);
				}
			}
		}

                // remove non inventory line items from RA
                var lineItemCountNonInv= returnRecord.getLineItemCount('item');
                for (var removeCountNonInv = 1; removeCountNonInv <= lineItemCountNonInv; removeCountNonInv++) {

                    if (returnRecord.getLineItemValue('item', 'itemtype', removeCountNonInv) != 'InvtPart') {
                        returnRecord.removeLineItem('item',removeCountNonInv);	
                        removeCountNonInv--;
                        lineItemCountNonInv--;
                    }
                }
                        
                var recId = null;
                if(is_itemAvailable){
                        var returnItemCount = returnRecord.getLineItemCount('item');
                        var badItems = [];
                        log(logTitle, "Trying to submit return...");
                                log(logTitle, "item Lists...:"+returnItemCount);
                        try {
                        for (var i = 1; i <= returnItemCount; i++) {
                                log(logTitle, "Looping...:"+i);
                            var itemId = returnRecord.getLineItemValue('item', 'custcol_externalid', i);
                                log(logTitle, "checking item:"+itemId);
                            if (!itemLists.hasOwnProperty(itemId)) {
                                        log(logTitle, "bad item:"+itemId);
                                        badItems.push(itemId);
                            }
                            else {
                                        log(logTitle, "good item:"+itemId);
                            }
                        }
                        for (var i=0; i < badItems.length; i++) {
                            var newCount = returnRecord.getLineItemCount('item');
                            for (var j = 1; j <= newCount; j++) {
                                var newId = returnRecord.getLineItemValue('item', 'custcol_externalid', j);
                                if (newId == badItems[i]) {
                                        log(logTitle, "bad item remove:"+newId);
                                        returnRecord.removeLineItem('item', j);
                                }
                            }
                        }
                        }
                        catch (e) {
                            log(logTitle, e);
                        }
                    log(logTitle,"Start submit count" + returnRecord.getLineItemCount('item'));
                    recId = nlapiSubmitRecord(returnRecord);
                    log(logTitle,"Record submitted");
                }
                else{
                                if(itemFound) {   
                        errorLog(logTitle,"None of the item is available for refund: "+ salesOrderList[0]['id'] +", itemid :"+ itemList[0]['id']);
                                } else {
                        errorLog(logTitle,"None of the item is available for refund: "+ salesOrderList[0]['id'] );
                                }
                    continue;
                }

                var companyInfo = nlapiLoadConfiguration('companypreferences');
                companyInfo.setFieldValue('custscript_last_read_file_name', fileName );
                nlapiSubmitConfiguration(companyInfo);

                log(logTitle,"Updated file is:  " + companyInfo.getFieldValue('custscript_last_read_file_name')); 
                log(logTitle,"success, RMA ID is: " + recId); 
                 
                // itemreceipt
                var receiveRecord = nlapiTransformRecord('returnauthorization', recId, 'itemreceipt');
                var receiveItemCount = receiveRecord.getLineItemCount('item');
                for (var i = 1; i <= receiveItemCount; i++) {
                    receiveRecord.setLineItemValue("item", "location", i, 75);
                }
                nlapiSubmitRecord(receiveRecord);

                // // cashrefund
                var cashRefundRecord = nlapiTransformRecord('returnauthorization', recId, 'cashrefund');
                cashRefundRecord.setFieldValue("account",119); //3344//1200//A_102162	RETURNS CAT/COP -1735 //A_006805 SEARS CREDIT CLEARING ACC RE
                var cashId = nlapiSubmitRecord(cashRefundRecord);
                log(logTitle, "CASH REFUND ID:"+cashId);

	}

	// return JSON.stringify(data_list);
    var date = new Date();
    storeReturnsLog.setFieldValue('custrecord_end_time', date.toString());
    if (failed) {
        storeReturnsLog.setFieldValue('custrecord_file_status', 'FAILED');
    }
    else {
        storeReturnsLog.setFieldValue('custrecord_file_status', 'SUCCESS');
    }
    var storeReturnsLogId = nlapiSubmitRecord(storeReturnsLog);
    log(logTitle, "LOG ID:"+storeReturnsLogId);

	log(logTitle,"success, Finished"); 
	return "success";
    }
    catch (e) {
        storeReturnsLog.setFieldValue('custrecord_file_status', 'FAILED');
        var storeReturnsLogId = nlapiSubmitRecord(storeReturnsLog);
        log(logTitle, "LOG ID:"+storeReturnsLogId);
        log(logTitle, e);
        return "fail"
    }
}

//Function for checking availabilty of return.
function checkReturnAvailability(salesorderId,ItemId,Qty){

	var tempQtyReturned = 0;
	var totalItemQty = 0;
	var logTitle = "Check Return Availability";

	var salesorderRecord = nlapiLoadRecord("cashsale",salesorderId);
    var lineItemCount = salesorderRecord.getLineItemCount('item');

	for (var line = 1; line <= lineItemCount; line++) {

		var itemId_Lineitem = salesorderRecord.getLineItemValue("item", "item", line);

		log(logTitle,"itemId_Lineitem: " +itemId_Lineitem+" ItemId: "+ItemId);

		if(itemId_Lineitem === ItemId){
			totalItemQty = totalItemQty + parseInt(salesorderRecord.getLineItemValue("item", "quantity", line));
		}
	}

	var filtersRA = new Array();
	filtersRA[0] = new nlobjSearchFilter('createdfrom', null, 'is', salesorderId);
	filtersRA[1] = new nlobjSearchFilter('item', null, 'is', ItemId);
	var RAList = nlapiSearchRecord("returnauthorization", null, filtersRA,null);

	if(RAList == null){
		log(logTitle,"No existing RA found for this transaction");
		log(logTitle,"Qty : "+Qty+" totalItemQty: "+totalItemQty);
		if(Qty <= totalItemQty){
			return true;
		}else{
			return false;
		}
	}
	for (var i = 0; i < RAList.length; i++) {
		
		var RArecord = RAList[i];
		var salesReturnRecord = nlapiLoadRecord("returnauthorization",RArecord['id']);
    	var lineItemCountRA = salesReturnRecord.getLineItemCount('item');
		for (var j = 1; j <= lineItemCountRA; j++) {
			var lineItemId = salesReturnRecord.getLineItemValue("item", "item", j);
			if(lineItemId === ItemId){
				tempQtyReturned = parseInt(tempQtyReturned) + parseInt(salesReturnRecord.getLineItemValue("item", "quantity", j));
			}
		}
	}

	tempQtyReturned = parseInt(tempQtyReturned)+parseInt(Qty);

	if(tempQtyReturned < totalItemQty){
		return true;
	}else{
		return false;
	}
}
function log(name, message) {
    nlapiLogExecution('DEBUG', name, message);
}

function errorLog(name, message) {
    nlapiLogExecution('ERROR', name, message);
}
