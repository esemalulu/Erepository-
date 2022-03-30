var CONTEXT = nlapiGetContext();
var CACHE = {};
var MAXLIMIT_USAGE = 500;

function sciCreator(objRequest)
{
    try {
		var execType = CONTEXT.getExecutionContext();
		var logTitle = ['SCI_Creator', execType].join(':');

		var NOWTIME = new Date();
		var START_TIME = NOWTIME.getTime();

        var custTable = nlapiGetContext().getSetting('SCRIPT', 'custscript_table_create_id')
			
		var strDateReceived = nlapiDateToString(NOWTIME,'datetimetz');
		nlapiLogExecution('DEBUG', logTitle, '*** START *** ' + strDateReceived);

		//var ssearchId = nlapiGetContext().getSetting('SCRIPT', 'custscriptcustscript_sci_ssearch');
        var searchColumns = [new nlobjSearchColumn('custrecordcustrecord_sci_content'), new nlobjSearchColumn('custrecordcustrecord_sci_type'), new nlobjSearchColumn('custrecordcustrecord_sci_status')];
        var searchFilters = [new nlobjSearchFilter ('custrecordcustrecord_sci_status', null, 'anyof', '1')];
		var count = 1000, min = 0, max = 1000;
		//var resultsSCIRequests = Helper.searchAllRecord('customrecord241', null, searchFilters, searchColumn);

		var resultsSCIRequests = [];
	    var searchObj = nlapiCreateSearch(custTable, searchFilters, searchColumns);
		var rs = searchObj.runSearch();
		while (count == 1000)
		{
			var resultSet = rs.getResults(min, max);
			resultsSCIRequests = resultsSCIRequests.concat(resultSet);
			min = max;
			max += 1000;
			count = resultSet.length;
		}
		nlapiLogExecution ('DEBUG', logTitle, "COUNT:"+resultsSCIRequests.length);
        for (var i in resultsSCIRequests) {
            try {
            nlapiLogExecution ('DEBUG', logTitle, JSON.stringify(resultsSCIRequests[i]));
            var request = JSON.parse(JSON.stringify(resultsSCIRequests[i]));
            if (request.columns.custrecordcustrecord_sci_status != undefined) {
                if (request.columns.custrecordcustrecord_sci_status.name == 'Pending') {
                                 var context = nlapiGetContext();
                                 nlapiLogExecution ('DEBUG', logTitle, context.getRemainingUsage());
                               nlapiLogExecution ('DEBUG', logTitle, "Trying to check governance...");
                                checkGovernance();
                    if (request.columns.custrecordcustrecord_sci_type == 'InventoryAdjustment') {
                        var ia = JSON.parse(request.columns.custrecordcustrecord_sci_content);
                        var record = nlapiCreateRecord('inventoryadjustment');
                        record.setFieldText('account', 'A_109130 CYCLE COUNT & KNOWN THEFT ADJUSTMENTS : INVENTORY ADJUSTMENT (SIA 130)');
                        //6000 Expenses
						if (ia.items != undefined) {
                        for (var j=0; j < ia.items.length; j++) {
                            try {
                            nlapiLogExecution ('DEBUG', logTitle, "Item ID:"+ia.items[j].itemid);
                            record.selectNewLineItem('inventory');
							var internalid =  searchItemByExternalId(ia.items[j].itemid);
							nlapiLogExecution ('DEBUG', logTitle, "ADDING ITEM:"+internalid);
                            record.setCurrentLineItemValue('inventory','item', internalid);
                            try {
                                record.setCurrentLineItemText('inventory','location',ia.items[j].storelocation);
                            }
                            catch (e) {
                                nlapiLogExecution ('DEBUG', logTitle, "Store Location:"+ia.items[j].storelocation);
                            }
                            try {
                            record.setCurrentLineItemValue('inventory','adjustqtyby',ia.items[j].adjqty);
                            }
                            catch (e) {
                                nlapiLogExecution('DEBUG',logTitle,"NO QUANTITY");
                                request.columns.custrecordcustrecord_sci_status.name = "Failed";
                                request.columns.custrecordcustrecord_sci_status.internalid = '4';
                            }
                            nlapiLogExecution ('DEBUG', logTitle, "Adjustment Quantity:"+ia.items[j].adjqty);
                            try {
                                record.commitLineItem('inventory');
                                nlapiLogExecution ('DEBUG', logTitle, "Line item submitted");
                            }
                            catch (e) {
                                nlapiLogExecution ('DEBUG', logTitle, e);
                                request.columns.custrecordcustrecord_sci_status.name = "Failed";
                                request.columns.custrecordcustrecord_sci_status.internalid = '4';
                            }
                            }
                            catch (e) {
                                nlapiLogExecution ('DEBUG', logTitle, "BAD RECORD");
                                nlapiLogExecution ('DEBUG', logTitle, e);
                                request.columns.custrecordcustrecord_sci_status.name = "Failed";
                                request.columns.custrecordcustrecord_sci_status.internalid = '4';
                            }
                            }
						}
                        try {
                            var recordId = nlapiSubmitRecord (record);
                            request.columns.custrecordcustrecord_sci_status.name = "Success";
                            request.columns.custrecordcustrecord_sci_status.internalid = '3';
                        }
                        catch (e) {
                            nlapiLogExecution ('DEBUG', logTitle, "Failed to add IA:"+e);
                            request.columns.custrecordcustrecord_sci_status.name = "Failed";
                            request.columns.custrecordcustrecord_sci_status.internalid = '4';
                        }
                        nlapiLogExecution ('DEBUG', logTitle, "IA ID:"+recordId);

                    }
                    else if (request.columns.custrecordcustrecord_sci_type == 'ItemReceipt') {
                        request.columns.custrecordcustrecord_sci_status.name = "Processing";
                        request.columns.custrecordcustrecord_sci_status.internalid = '2';
                        var returned = nlapiSubmitField('customrecord241', request.id, "custrecordcustrecord_sci_status", request.columns.custrecordcustrecord_sci_status.internalid);

                        try {
                        var gr = JSON.parse(request.columns.custrecordcustrecord_sci_content);
                        var orderRecordId = searchPurchaseOrderByExternalId(gr.ponum);
						nlapiLogExecution ('DEBUG', logTitle, "PO External ID:"+orderRecordId); 
                        var recordDataNlapi = nlapiLoadRecord ("purchaseorder", orderRecordId);
						//nlapiLogExecution ('DEBUG', logTitle, "PO RECORD:"+ JSON.stringify(recordDataNlapi)); 
                        var status = recordDataNlapi.getFieldValue('orderstatus');
						nlapiLogExecution ('DEBUG', logTitle, "STATUS:"+status); 
                        if (status != 'H') {
                        var recordData = JSON.parse(JSON.stringify(recordDataNlapi));
						nlapiLogExecution ('DEBUG', logTitle, "PO Record:"+JSON.stringify(recordData)); 
			            var record = nlapiTransformRecord('purchaseorder', orderRecordId, 'itemreceipt', {recordmode:'dynamic'});
                        var lineCount = record.getLineItemCount ('item');
                        /*for (var i=1; i < lineCount+1; i++) {
                            record.selectLineItem('item',i);
                            record.setCurrentLineItemValue ('item', 'quantity', 0);
                        }*/
                        nlapiLogExecution ('DEBUG', logTitle, "Item Receipt:"+JSON.stringify(record));
                        var listItems = recordData.item;
                        for (var i = 0,count = listItems.length; i < count; i ++)
                        {
                            var itemData = listItems[i];

                            for (var j=1; j < lineCount+1; j++) {
                                //if (itemData.custcol_line_id == gr.items[j].linenum) {
                                    record.selectLineItem('item',j);
                                    recordDataNlapi.selectLineItem('item',j);
                                    record.setCurrentLineItemValue ('item', 'quantity', 0);
                                    nlapiLogExecution ('DEBUG', logTitle, "FOUND LINE NUMBER");

                                    //nlapiLogExecution ('DEBUG', "", "LINENUM:"+lineCount);
                                    nlapiLogExecution ('DEBUG', "", "NUM COUNT:"+record.getLineItemCount('item'));
                                    //record.selectLineItem('item', gr.items[j].linenum);
                                    for (var a=0; a < gr.items.length; a++) {
                                        var externalid =  recordDataNlapi.getCurrentLineItemValue("item",'custcol_externalid');
                                        nlapiLogExecution ('DEBUG', "", "EXTERNAL ID:"+externalid);
                                        if (externalid == gr.items[a].itemid) {
                                            nlapiLogExecution ('DEBUG', logTitle, "FOUND ITEM ID");
                                            //itemData.quantityreceived = itemData.quantityreceived + parseInt(gr.items[j].adjqty);
                                           //itemData.quantitybilled = itemData.quantitybilled + parseInt(gr.items[j].adjqty);
                                            //record.setCurrentLineItemValue('item', 'itemreceive', 'T');
                                            record.setCurrentLineItemValue('item', 'quantity', gr.items[a].adjqty);
                                            //record.setCurrentLineItemValue('item', 'itemquantity', lineData.quantity);
                                            record.commitLineItem('item');
                                        }
                                    }
                                //}
                            }                           
                        }
                        nlapiSubmitRecord (record);
                        request.columns.custrecordcustrecord_sci_status.name = "Success";
                        request.columns.custrecordcustrecord_sci_status.internalid = '3';
                    }
                    else {
                        request.columns.custrecordcustrecord_sci_status.name = "Closed";
                        request.columns.custrecordcustrecord_sci_status.internalid = '5';
                    }
                    }
                    
                    catch (e) {
                        nlapiLogExecution ('DEBUG', logTitle, e);
                        request.columns.custrecordcustrecord_sci_status.name = "Failed";
                        request.columns.custrecordcustrecord_sci_status.internalid = '4';
                    }
                    }
                    else if (request.columns.custrecordcustrecord_sci_type == 'InventoryTransfer') {
                        var ia = JSON.parse(request.columns.custrecordcustrecord_sci_content);
                        //record.setFieldValue('account', '6012');
						if (ia.items != undefined) {
                        for (var j=0; j < ia.items.length; j++) {
                            var record = nlapiCreateRecord('inventorytransfer');
                            record.setFieldText ('location', ia.items[j].locfrom);
                            record.setFieldText ('transferlocation', ia.items[j].locto);
                            nlapiLogExecution ('DEBUG', logTitle, "Item ID:"+ia.items[j].itemid);
                            record.selectNewLineItem('inventory');
							var internalid =  searchItemByExternalId(ia.items[j].itemid);
							nlapiLogExecution ('DEBUG', logTitle, "ADDING ITEM:"+internalid);
                            record.setCurrentLineItemValue('inventory','item', internalid);
                            nlapiLogExecution('DEBUG',logTitle,"quantity:"+ia.items[j].adjqty);
                            try {
                                record.setCurrentLineItemValue('inventory','adjustqtyby',ia.items[j].adjqty);
                            }
                            catch (e) {
                                nlapiLogExecution('DEBUG',logTitle,"NO QUANTITY");
                                request.columns.custrecordcustrecord_sci_status.name = "Failed";
                                request.columns.custrecordcustrecord_sci_status.internalid = '4';
                            }
                            try {
                                record.commitLineItem('inventory');
                                nlapiLogExecution ('DEBUG', logTitle, "Line item submitted");
                            }
                            catch (e) {
                                nlapiLogExecution ('DEBUG', logTitle, e);
                                request.columns.custrecordcustrecord_sci_status.name = "Failed";
                                request.columns.custrecordcustrecord_sci_status.internalid = '4';
                            }
                            try {
                                nlapiLogExecution ('DEBUG', logTitle, "Item check:"+record.getLineItemValue ('inventory','item',1));
                                var recordId = nlapiSubmitRecord (record);
                                request.columns.custrecordcustrecord_sci_status.name = "Success";
                                request.columns.custrecordcustrecord_sci_status.internalid = '3';
                            }
                            catch (e) {
                                nlapiLogExecution ('DEBUG', logTitle, "Failed to add transfer:"+e);
                                request.columns.custrecordcustrecord_sci_status.name = "Failed";
                                request.columns.custrecordcustrecord_sci_status.internalid = '4';
                            }
                            nlapiLogExecution ('DEBUG', logTitle, "TRANSFER ID:"+recordId);
                            }
						}
                        else {
                            nlapiLogExecution ('DEBUG', logTitle, "Failed to add transfer:"+e);
                            request.columns.custrecordcustrecord_sci_status.name = "Failed";
                            request.columns.custrecordcustrecord_sci_status.internalid = '4';
                        }
                    }
                    else if (request.columns.custrecordcustrecord_sci_type == 'CancelOrder') {
                        try {
                            var totalqty = 0;
                            var co = JSON.parse(request.columns.custrecordcustrecord_sci_content);
                            var orderRecordId = searchSalesOrderByExternalId(co.orderid);
                            nlapiLogExecution ('DEBUG', logTitle, "CO External ID:"+orderRecordId); 
                            //var recordData = JSON.parse(JSON.stringify(nlapiLoadRecord ("salesorder", orderRecordId)));
                            var record = nlapiLoadRecord ('salesorder', orderRecordId);
                            nlapiLogExecution ('DEBUG', logTitle, "CO Record:"+JSON.stringify(record)); 
                            var lineCount = record.getLineItemCount ('item');
                            nlapiLogExecution ('DEBUG', logTitle, "LINE NUMBER COUNT"+lineCount);
                            request.columns.custrecordcustrecord_sci_status.name = "Failed";
                            request.columns.custrecordcustrecord_sci_status.internalid = '4';
                            for (var i=1; i < lineCount+1; i++) {
                                record.selectLineItem('item',i);
                                var externalid = getItemExternalID(getInternalId(record.getCurrentLineItemValue ('item', 'item')));
                                if (externalid != null && externalid != '') {
                                    totalqty = totalqty + parseInt(record.getCurrentLineItemValue ('item', 'quantity'));
                                }
                                for (var j=0; j < co.items.length; j++) { 
                                    var linenum = co.items[j].linenum;
                                    //nlapiLogExecution ('DEBUG', logTitle, record.getCurrentLineItemValue ('item', 'line')+" vs "+linenum);
                                    //if (linenum == (record.getCurrentLineItemValue ('item', 'line').toString())) {
                                        nlapiLogExecution ('DEBUG', logTitle, "ENTERING LINE ITEM"+linenum);
                                        nlapiLogExecution ('DEBUG', logTitle, getInternalId(record.getCurrentLineItemValue ('item', 'item')) + " vs " + searchItemByExternalId(co.items[j].itemid));
                                        if (searchItemByExternalId(co.items[j].itemid) == getInternalId(record.getCurrentLineItemValue ('item', 'item'))){
                                            nlapiLogExecution ('DEBUG', logTitle, "CANCELING ITEM");
                                            var original_qty = record.getCurrentLineItemValue ('item', 'quantity');
                                            var newqty = parseInt(original_qty)+parseInt(co.items[j].qty);
                                            record.setCurrentLineItemValue ('item', 'quantity', (newqty).toString());
                                            totalqty = totalqty + parseInt(co.items[j].qty);
                                            if (newqty == 0) {
                                                record.setCurrentLineItemValue ('item','isclosed','T');
                                            }
                                            record.commitLineItem('item');
                                            request.columns.custrecordcustrecord_sci_status.name = "Success";
                                            request.columns.custrecordcustrecord_sci_status.internalid = '3';
                                        }
                                   // }
                                }
                            }
                            nlapiLogExecution ('DEBUG', logTitle, "TOTAL QTY:"+totalqty);
                            if (totalqty == 0) {
                                nlapiLogExecution ('DEBUG', logTitle, "CLOSING ORDER");
                                try {
                                    for (var i=1; i < lineCount+1; i++) {
                                        record.selectLineItem('item',i);
                                        record.setCurrentLineItemValue ('item','isclosed','T');
                                        record.commitLineItem('item');
                                    }
                                }
                                catch (e) {
                                    nlapiLogExecution ('DEBUG', logTitle, "FAILED TO CLOSE THE ORDER");
                                }
                            }
                            nlapiSubmitRecord (record);
                        }
                        catch (e) {
                            nlapiLogExecution ('DEBUG', logTitle, e);
                            nlapiLogExecution ('DEBUG', logTitle, e);
                            request.columns.custrecordcustrecord_sci_status.name = "Failed";
                            request.columns.custrecordcustrecord_sci_status.internalid = '4';
                        }
                    }
                    else {
                            request.columns.custrecordcustrecord_sci_status.name = "Failed";
                            request.columns.custrecordcustrecord_sci_status.internalid = '4';
                    }
            }
            else {
                 nlapiLogExecution ("DEBUG", logTitle, "no status");
            }
            /*var arrFlds = [], arrVals =[];
            for (var fld in request)
            {
                arrFlds.push(fld);
                arrVals.push(request[fld]);
            }*/

        }

}
catch (e) {
    nlapiLogExecution ('DEBUG', logTitle, "BAD RECORD");
    request.columns.custrecordcustrecord_sci_status.name = "Failed";
    request.columns.custrecordcustrecord_sci_status.internalid = '4';

}
    var returned = nlapiSubmitField('customrecord241', request.id, "custrecordcustrecord_sci_status", request.columns.custrecordcustrecord_sci_status.internalid);
    //nlapiLogExecution ("DEBUG", logTitle, "STATUS:"+request.columns.custrecordcustrecord_sci_status.name);
    //nlapiLogExecution ("DEBUG", logTitle, "VALUES:"+JSON.stringify(arrVals));
    nlapiLogExecution ("DEBUG", logTitle, "*******FINISHED RECORD:"+returned+" with:"+JSON.stringify(request.columns.custrecordcustrecord_sci_status)+"*********");
    }
    }
    catch (e) {
        nlapiLogExecution ('DEBUG', logTitle, "CRITICAL ERROR");
    }
    nlapiLogExecution ('DEBUG', logTitle, "********FINISHED********");
}

function searchItemByExternalId (externalid) {
		var cacheKey = ['searchItemByExternalId', externalid].join(':');
        try {
            if (this.CACHE[cacheKey] == null)
            {
                this.CACHE[cacheKey] = false;
                if (externalid != null) {
                    try {
                        var arrItemSearch = nlapiSearchRecord('item', null, [(new nlobjSearchFilter('externalid',null,'is',externalid))]);
                        if (arrItemSearch && arrItemSearch.length)
                        {
                            this.CACHE[cacheKey]= arrItemSearch[0].getId();
                        }
                    }
                    catch (e) {
                        nlapiLogExecution ('DEBUG', "TITLE", "Cannot find externalid");
                    }
                }
            }
        }
        catch (e) {
            nlapiLogExecution ('DEBUG', "SEARCH ITEM BY EXTERNAL ID", e);
        }

		return this.CACHE[cacheKey];
}

function getItemNumber (externalid) {
		var cacheKey = ['searchItemByExternalId', externalid].join(':');
        try {
            if (this.CACHE[cacheKey] == null)
            {
                this.CACHE[cacheKey] = false;
                if (externalid != null) {
                    try {
                        var arrItemSearch = nlapiSearchRecord('itemnumber', null, [(new nlobjSearchFilter('externalid',null,'is',externalid))]);
                        if (arrItemSearch && arrItemSearch.length)
                        {
                            this.CACHE[cacheKey]= arrItemSearch[0].getId();
                        }
                    }
                    catch (e) {
                        nlapiLogExecution ('DEBUG', "TITLE", "Cannot find externalid");
                    }
                }
            }
        }
        catch (e) {
            nlapiLogExecution ('DEBUG', "SEARCH ITEM BY EXTERNAL ID", e);
        }

		return this.CACHE[cacheKey];
}


function getInternalId (itemnumber) {
		var cacheKey = ['getInternalId', itemnumber].join(':');
        try {
            if (this.CACHE[cacheKey] == null)
            {
                this.CACHE[cacheKey] = false;

                var arrItemSearch = nlapiSearchRecord('item', null, [(new nlobjSearchFilter('internalid',null,'is',itemnumber))]);
                if (arrItemSearch && arrItemSearch.length)
                {
                    this.CACHE[cacheKey]= arrItemSearch[0].getId();
                }
            }
        }
        catch (e) {
            nlapiLogExecution ('DEBUG', "GET INTERNAL ID", e);
        }

		return this.CACHE[cacheKey];
}

function searchPurchaseOrderByExternalId (externalId) {
	var cacheKey = ['searchPurchaseOrderByExternalId', externalId].join(':');
    try {
        if (this.CACHE[cacheKey] == null)
        {
            this.CACHE[cacheKey] = false;

            var arrSalesOrder = nlapiSearchRecord('purchaseorder', null, [(new nlobjSearchFilter('tranid',null,'is',externalId))]);
            if (arrSalesOrder && arrSalesOrder.length)
            {
                this.CACHE[cacheKey]= arrSalesOrder[0].getId();
            }
        }
    }
    catch (e) {
        nlapiLogExecution ('DEBUG', "SEAARCH PURCHASE ORDER BY EXTERNAL ID", e);
    }

	return this.CACHE[cacheKey];
    }

function searchSalesOrderByExternalId (externalId) {
	var cacheKey = ['searchSalesOrderByExternalId', externalId].join(':');
    try {
        if (this.CACHE[cacheKey] == null)
        {
            this.CACHE[cacheKey] = false;

            var arrSalesOrder = nlapiSearchRecord('salesorder', null, [(new nlobjSearchFilter('tranid',null,'is',externalId))]);
            if (arrSalesOrder && arrSalesOrder.length)
            {
                this.CACHE[cacheKey]= arrSalesOrder[0].getId();
            }
        }
    }
    catch (e) {
        nlapiLogExecution ('DEBUG', "SEARHC SALES ORDER BY EXTERNAL ID", e);
    }

	return this.CACHE[cacheKey];
    }

   function getItemExternalID (internalID) {
       try {
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
            try {
                return JSON.parse(JSON.stringify(arrSearchResult))[0].columns.externalid.name;
            }
            catch (e) {
                nlapiLogExecution ('DEBUG', "ID:", e);
            }
        }
       }
       catch (e) {
                nlapiLogExecution ('DEBUG', "NO EXTERNALID" ,e);
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