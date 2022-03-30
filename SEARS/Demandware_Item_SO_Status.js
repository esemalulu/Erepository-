//**************RESTLET Code****************

// Create a standard NetSuite record
function postRESTlet(datain) {

}

function getRESTlet(datain) {



    switch (datain.call) {
        case "get_item_quantity":

            return getItemQuantity(datain.id);
            break;
        case "get_sales_order_status":

            return getSalesOrderStatus(datain.id);
            break;
     
        default:
            return {
                "error": {
                    "code": "err001",
                    "message": "Invalid method name"
                }
            };
    }
}


function getItemExternalID(internalID) {
    var arrSearchFilter = [];
    var arrSearchColumn = [];
    arrSearchFilter[0] = new nlobjSearchFilter('internalID', null, 'is', internalID);

    arrSearchColumn[0] = new nlobjSearchColumn('externalid');
    var arrSearchResult = nlapiSearchRecord('inventoryitem', null, arrSearchFilter, arrSearchColumn);

    return arrSearchResult;

}

function getItemQuantity(externalID) {
     var externalIDs = externalID.split(",");

    var internalIDs = getItemInternalID(externalID);

    var responseObject = {};
    var responseObjectArray = [];

    var tempTotalQuantity = 0;
    var currentID = "";
   
    var totalQuantity = 0;
    for (j = 0; j < internalIDs.length; j++) {

        totalQuantity = {};

        currentID = internalIDs[j];

        try {
            var record = nlapiLoadRecord("inventoryitem", currentID);

            var recordString = JSON.stringify(record);
            var recordObj = JSON.parse(recordString);
  
		    //nlapiLogExecution('DEBUG', "LOGS", 'ITEM: ' + recordString.substring(8000,12000));

			totalQuantity["vendor"] = parseInt(checkIfUndefined(recordObj.custitem_vendor_inventory_on_hand));
            /*try {
                var itemVendor = record.editSubrecord('custpage_dic_vendor_item_qty_onhand');
                nlapiLogExecution('DEBUG', "LOGS", 'ITEM VENDOR: ' + JSON.stringify(itemVendor));
            }
            catch (e) {
                nlapiLogExecution('DEBUG', "LOGS", 'EXCEPTION: ' + e);
            }*/
            //totalQuantity["dic"] = parseInt(checkIfUndefined(recordObj.custitem_vendor_inventory_on_hand));

            for (k = 0; k < recordObj.locations.length; k++) {
            var qty = 0;
            var backOrderQty = 0;
            var tempLocName=recordObj.locations[k].location_display;
                if (recordObj.locations[k].quantitybackordered == null) {
                    backOrderQty = 0;
                }
                else {
                    backOrderQty = recordObj.locations[k].quantitybackordered;
                }

                if (recordObj.locations[k].quantityavailable == null) {
                    qty = 0;
                }
                else {
                    qty = recordObj.locations[k].quantityavailable;
                }

                if (tempLocName == "Calgary SCI : Available to Sell") {
                    totalQuantity["SCI"] = qty - backOrderQty;
                }
                if (tempLocName =="Calgary NLC : Available to Sell") {
                    totalQuantity["NLC"] = qty - backOrderQty;
                }
                if (tempLocName =="Belleville : Available to Sell") {
                    totalQuantity["Belleville"] = qty - backOrderQty;
                }
                if (tempLocName =="Montreal : Montreal NLC : Available to Sell") {
                    totalQuantity["Montreal"] = qty - backOrderQty;
                }
                if (tempLocName =="Vaughan NLC : Available to Sell") {
                    totalQuantity["Vaughan"] = qty - backOrderQty;
                }
                //nlapiLogExecution('DEBUG', "LOGS", 'BACK QTY: ' + backOrderQty);
            }
        } catch (exception) {

            totalQuantity = -1;
        }
        var item = {};
        totalQuantity.code = recordObj.custitem_ship_to_dc;
        item[externalIDs[j]] = totalQuantity;
        responseObjectArray.push(item);
        responseObject["items"] = responseObjectArray;
    }

    return responseObject;
}


function checkIfUndefined(ValueIn) {

    var valueOut;

    if (ValueIn === null || ValueIn === undefined) {
        valueOut = 0;
    }
    else {
        valueOut = ValueIn;
    }
    return valueOut;

}

function getItemInternalID(id) {
    var res = id.split(",");
    var arrSearchResults = [];

    for (j = 0; j < res.length; j++) {
        var arrSearchFilter = [];
        var arrSearchColumn = [];
        arrSearchFilter[0] = new nlobjSearchFilter('externalid', null, 'is', res[j]);

        arrSearchColumn[0] = new nlobjSearchColumn('internalid');
        var arrSearchResult = nlapiSearchRecord('inventoryitem', null, arrSearchFilter, arrSearchColumn);
        if (arrSearchResult == null) {
            arrSearchResults.push(res[j]);
        } else {
            arrSearchResults.push(arrSearchResult[0].id);
        }

    }
    return arrSearchResults;

}


//Sales Order Status Start



function getSalesOrderStatus(externalID) {

    var internalID = getSalesOrderInternalID(externalID);
    var status = "-1";
    var ItemFullfilmentInternalIDs = [];
    var itemsObj = {};
    var responseObject = {};


    var itemsLineIDobj = {};



    if (internalID != "-1") {

        try {
            var record = nlapiLoadRecord("salesorder", internalID);
            var recordObj = parseRecord(record);

            for (g = 0; g < recordObj.item.length; g++) {

                itemsLineIDobj[recordObj.item[g].item.name] = recordObj.item[g].custcol_line_id;
            }

            // nlapiLogExecution('DEBUG', 'status bofr ');
            if (externalID == "SO217") {
                status = "Billed";
            } else {
                status = "Pending Fullfillment";
            }
            
            status = recordObj.orderstatus.name;

            if (recordObj.hasOwnProperty("links")) {

                for (k = 0; k < recordObj.links.length; k++) {
                    if (recordObj.links[k].type == "Item Fulfillment") {

                        ItemFullfilmentInternalIDs.push(getItemFullfilmentInternalID(recordObj.links[k].tranid));
                    }

                }
                for (l = 0; l < ItemFullfilmentInternalIDs.length; l++) {

                    var FullfillmentRecord = nlapiLoadRecord("itemfulfillment", ItemFullfilmentInternalIDs[l]);
                    var FullfillmentRecordObj = parseRecord(FullfillmentRecord);

                    try {
                        for (i = 0; i < FullfillmentRecordObj.item.length; i++) {
                            var currentItemName = FullfillmentRecordObj.item[i].itemname;

                            var currentItemLineID = itemsLineIDobj[currentItemName];

                            var currentItemID = getItemExternalIDFromItemID(currentItemName);
                            var currentItemtrackingNum = FullfillmentRecordObj.item[i].custcol_sears_tracking_number;
                            var currentItemQty = FullfillmentRecordObj.item[i].quantity;

                            lengthtest = currentItemtrackingNum;
                            var trackingArray = [];
                            var trackingObj = {
                                "trackingID": currentItemtrackingNum,
                                "carrier": "UPS",
                                "carrierURI": "https://www.ups.com/content/ca/en/index.jsx",
                                "qty": currentItemQty
                            }

                            trackingArray.push(trackingObj);
                            var itemDetails = {
                                "itemID": currentItemID,
                                "tracking": trackingArray

                            };
                            if (itemsObj.hasOwnProperty(currentItemLineID)) {
                                // itemsObj[currentItemLineID].tracking.push("test");
                                itemsObj[currentItemLineID].tracking.push(trackingObj);

                            } else {
                                itemsObj[currentItemLineID] = itemDetails;
                            }
                            // itemsObj[currentItemLineID] = itemDetails;

                        }
                    } catch (exception) {

                    }


                }

            }

        }
        catch (exception) {
            status = "-1";
        }

        responseObject[externalID] = {
            "status": status,
            "items": itemsObj
        };
    } else {
        status = "-1";
        responseObject[externalID] = {
            "status": status
        };
    }


    return responseObject;


}


function getSalesOrderInternalID(externalID) {

    var internalID;

    var arrSearchFilter = new nlobjSearchFilter('externalid', null, 'is', externalID);
    var arrSearchColumn = new nlobjSearchColumn('internalid');
    var arrSearchResult = nlapiSearchRecord('salesorder', null, arrSearchFilter, arrSearchColumn);
    if (arrSearchResult == null) {
        internalID = "-1";
    } else {
        internalID = arrSearchResult[0].id;
    }

    return internalID;

}


function parseRecord(record) {

    var recordString = JSON.stringify(record);
    var recordObj = JSON.parse(recordString);

    return recordObj;
}
function getItemFullfilmentInternalID(transID) {


    var arrSearchFilter = new nlobjSearchFilter('tranid', null, 'is', transID);
    var arrSearchColumn = new nlobjSearchColumn('internalid');
    var arrSearchResult = nlapiSearchRecord('itemfulfillment', null, arrSearchFilter, arrSearchColumn);
    var InternalID = arrSearchResult[0].id;
    return InternalID;
}




function getItemExternalIDFromItemID(itemID) {

    var arrSearchFilter = new nlobjSearchFilter('itemid', null, 'is', itemID);

    var arrSearchColumn = new nlobjSearchColumn('externalid');
    var arrSearchResult = nlapiSearchRecord('inventoryitem', null, arrSearchFilter, arrSearchColumn);
    var arrSearchResultObj = parseRecord(arrSearchResult);

    //return arrSearchResultObj[0];
    return arrSearchResultObj[0].columns.externalid.internalid;

}

//Sales Order Status END

