var map = {
    "donor": {
        "externalid": "entityid",
        "first_name": "firstname",
        "last_name": "lastname",
        "company_name": "companyname",
        "status": "entitystatus",
        "isperson": "isperson",
        "email": "email",
        "currency": "currency"

    }
}
//Below is being used to put a breakpoint in the debugger
var i = 0;

//**************RESTLET Code****************

// Create a standard NetSuite record
function postRESTlet(datain) {

    //logExecution('DEBUG', 'getRESTlet', 'test2');

    var err = new Object();

    // Validate if mandatory record type is set in the request
    if (!datain.recordtype) {
        err.status = "failed";
        err.message = "missing recordtype";
        return err;
    }

    var record = nlapiCreateRecord(datain.recordtype);

    for (var fieldname in datain) {
        if (datain.hasOwnProperty(fieldname)) {
            if (fieldname != 'recordtype' && fieldname != 'id') {
                var value = datain[fieldname];
                if (fieldname != 'custentity_country' && value && typeof value != 'object') // ignore other type of parameters
                {
                    record.setFieldValue(fieldname, value);
                }

                if (fieldname == 'custentity_country' && value && typeof value != 'object') // ignore other type of parameters
                {
                    record.setFieldText(fieldname, value);
                }
            }
        }
    }
    var recordId = nlapiSubmitRecord(record);
    //nlapiLogExecution('DEBUG','id='+recordId);

    var nlobj = nlapiLoadRecord(datain.recordtype, recordId);
    return nlobj;
}

function getRESTlet(datain) {

    logExecution('DEBUG', 'getRESTlet', 'test1'');

    switch (datain.call) {
        case "get_customer":
            return getCustomerDetail(datain.id);
            break;
        case "get_customer_list":
            return getCustomerList();
            break;
        case "get_purchase_order":

            return getPurchaseOrderDetail(datain.id);
            break;
        case "get_sales_orders":

            return getSalesOrdersDetail(datain.id);
            break;
        case "get_item":

            return getItemDetail(datain.id);
            break;
        case "get_item_quantity":

            return getItemQuantity(datain.id);
            break;
        case "get_item_master":
            return getItemMaster();
            break;
        case "get_purchase_orders":
            return getPurchaseOrders();
            break;
        case "get_vendor_return":
            return getVendorReturn(datain.id);
            break;
        case "get_shipping_order":

            return getshipItemDetail(datain.id);
            break;
       

        case "get_sales_order":

            return getSalesOrderDetail(datain.id);
            break;
        case "test_email":
            return getEmail();
            break;
        case "get_sales_order_status":

            return getSalesOrderStatus(datain.id);
            break;
        case "status_test":

            return getRecord(datain.id);
            break;
        case "get_item_fullfilment":

            return getitemfullfilment(datain.id);
            break;

        case "get_sales_order_email":

            return getSalesOrderEmail(datain.id);
            break;
        case "get_sales_order_Cancel_full_email":

            return getSalesOrderCancelFullEmail(datain.id);
            break;

        case "get_item_fullfilment_email":

            return getitemfullfilmentEmail(datain.id);
            break;
        case "get_item_Price":

            return getItemMasterPrice(datain.id);
            break;
        case "get_full":

            return getFF(datain.id);
            break;
        case "test":

            return getSalesOrderExternalID(datain.id);
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
function getSalesOrderStatus(internalID) {
    var status = nlapiLookupField("salesorder", internalID, "statusref");
    return status;
}
function getSalesOrderExternalID(internalID) {
    var externalid = nlapiLookupField("salesorder", internalID, "externalid");
    return externalid;
}
function getRecord(datain) {
    var rec = nlapiLoadRecord('salesorder', 62164);
    nlapiLogExecution('DEBUG', rec)
    var recstring = JSON.stringify(rec);
    var recparse = JSON.parse(recstring);
    var status = recparse.orderstatus.name;
    return recparse;
}
function getItemMasterPrice(externalID) {
    var externalIDs = externalID.split(",");

    var internalIDs = getItemInternalID(externalID);
    var responseObjectArray = [];
    var responseObject = {};

    for (j = 0; j < internalIDs.length; j++) {

        var record = nlapiLoadRecord("inventoryitem", internalIDs[j]);


        var recordString = JSON.stringify(record);
        var recordObj = JSON.parse(recordString);
        var price = recordObj.pricing[0].pricelist[0].price[0].price;


        item[externalIDs[j]] = totalQuantity;
        responseObjectArray.push(item);
        responseObject["items"] = responseObjectArray;


        responseObject["items"] = responseObjectArray;
        responseObject["item"] = {
            "itemid": externalIDs[j],
            "price": price
        };

    }
    return responseObject;
}

function getSalesOrderStatus(extrenalID) {

    var internalID = getSalesOrderInternalID(extrenalID);
    var status = "-1";
    var ItemFullfilmentInternalIDs = [];
    var itemsObj = {};
    var responseObject = {};


    var itemsLineIDobj = {};


    var test = "no";

    if (internalID != "-1") {

        try {
            var record = nlapiLoadRecord("salesorder", internalID);
            var recordObj = parseRecord(record);

            for (g = 0; g < recordObj.item.length; g++) {

                itemsLineIDobj[recordObj.item[g].item.name] = recordObj.item[g].custcol_line_id;
            }

            // nlapiLogExecution('DEBUG', 'status bofr ');
            if (extrenalID == "SO217") {
                status = "Billed";
            } else {
                status = "Pending Fullfillment";
            }
            
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
                                "carrierURI": "ups.com",
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

        responseObject[extrenalID] = {
            "status": status,
            "items": itemsObj
        };
    } else {
        status = "-1";
        responseObject[extrenalID] = {
            "status": status
        };
    }

   
    return responseObject;


}
function getstatus(ID) {

   // var arrSearchFilter = new nlobjSearchFilter('internalid', null, 'is', ID);


   // var arrSearchColumn = new nlobjSearchColumn('orderstatus');
 //   var arrSearchResult = nlapiSearchRecord('salesorder', null, arrSearchFilter, arrSearchColumn);

    var customerId = nlapiLookupField("salesorder", ID, "orderstatus");
    //var InternalID = arrSearchResult[0].id;
    return customerId;

}


function getSalesOrderStatusGood(extrenalID) {

    var internalID = getSalesOrderInternalID(extrenalID);
    var status = "-1";
    var ItemFullfilmentInternalIDs = [];
    var itemsArray = [];
    var responseObject = {};
    var customer_id = "";



    if (internalID != "-1") {

        try {
            var record = nlapiLoadRecord("salesorder", internalID);
            var testsrting = JSON.stringify(record);


            var customerId = nlapiLookupField("salesorder", internalID, "entity");
            customer_id = nlapiLookupField("customer", customerId, "externalid");


          //  var recordObj = parseRecord(record);

            var recordObj = JSON.parse(testsrting);
            nlapiLogExecution('DEBUG', 'status Before ', recordObj);
            status = recordObj.orderstatus.name;
            nlapiLogExecution('DEBUG', 'status Aftyer  ', status);


            if (recordObj.hasOwnProperty("links")) {
                for (k = 0; k < recordObj.links.length; k++) {
                    if (recordObj.links[k].type == "Item Fulfillment") {
                        ItemFullfilmentInternalIDs.push(getItemFullfilmentInternalID(recordObj.links[k].tranid));
                    }

                }
                for (l = 0; l < ItemFullfilmentInternalIDs.length; l++) {
                    var FullfillmentRecord = nlapiLoadRecord("itemfulfillment", ItemFullfilmentInternalIDs[l]);
                    var FullfillmentRecordObj = parseRecord(FullfillmentRecord);

                    for (i = 0; i < FullfillmentRecordObj.item.length; i++) {
                        try {
                            var currentItemtrackingNum = "";
                            var carrierName = "";
                            var carrierURl = "";
                            var currentItemID = getItemExternalIDFromItemID(FullfillmentRecordObj.item[i].itemname);
                            if (FullfillmentRecordObj.item[i].custcol_sears_tracking_number != "undefined" && FullfillmentRecordObj.item[i].custcol_sears_tracking_number != undefined) {

                                currentItemtrackingNum = FullfillmentRecordObj.item[i].custcol_sears_tracking_number;
                            } else {
                                carrierName = "UPS";

                                carrierURl = "ups.com";
                            }

                            var itemDetails = {
                                "itemID": currentItemID,
                                "trackingNo": currentItemtrackingNum,
                                "carrierName": carrierName,
                                "carrierURl": carrierURl
                            };
                            itemsArray.push(itemDetails);
                        }
                        catch (exception) {

                        }

                    }


                }

            }

        }
        catch (exception) {
            status = "-1";
        }

        responseObject[extrenalID] = {
            "status": status,
            "customer_id": customer_id,
            "items": itemsArray
        };
    }
    else {
        status = "-1";
        responseObject[extrenalID] = {
            "status": status
        };
    }


    return recordObj;
}


function getitemfullfilment(transID) {

    var itemFullfilmentRecord = nlapiLoadRecord("itemfulfillment", transID);
    var itemFullfilmentParsedRecord = parseRecord(itemFullfilmentRecord);

    return itemFullfilmentParsedRecord;
}





function getitemfullfilmentEmail(transID) {

    var itemFullfilmentRecord = nlapiLoadRecord("itemfulfillment", transID);
    var itemFullfilmentParsedRecord = parseRecord(itemFullfilmentRecord);

    //Sales Order Information
    var salesOrderInternalID = itemFullfilmentParsedRecord.createdfrom.internalid;
    var salesOrderRecord = nlapiLoadRecord("salesorder", salesOrderInternalID);
    var salesOrderParsedRecord = parseRecord(salesOrderRecord);

    var linesItemInfo = [];

    var EmailAddress;
    var SubscriberKey;
    var FirstName;
    var OrderNumber;

    var OrderURL; //NOT Ready YET
    var OrderSubTotal; //NOT Ready YET
    var PromoApplied;
    var SavingsPointsEarned;
    var ShippingCost;
    var GSTHST;
    var PST;
    var OrderTotal; //Same as Order Subtotal OR just Order Total without TAX and SHipp ???
    var OptIn; //Not in NS yet

    //new Fields


    var email_addr = "<email_addr>";
    var order_date = "<order_date>";
    var est_ship_date = "<est_ship_date>";
    var est_dlvr_date = "<est_dlvr_date>"; //Pending
    var ship_name = "<ship_name>"; //first_name we dont have first name

    var addr1 = "<addr1>";
    var addr2 = "<addr2>";
    var city = "<city>";
    var province = "<province>";

    var postal_code = "<postal_code>";
    var shipping_method = "<shipping_method>";
    var ship_via = "<ship_via>";//Pending NOT Comign in the SO Object

    var tracking_number = "<tracking_number>";
    var tracking_url = "<tracking_url>";

    var number_items = "<number_items>";



    //Item Line Fields
    var item_title = "<item_title>";
    var item_image_url; //Pending
    var item_link; //Pending
    var item_instock; //DO we really need this ?
    var item_attr1; //this is Dynamic - attr could be more or less
    var item_attr2; //this is Dynamic - attr could be more or less
    var item_qty = "<item_qty>";
    var item_cost_disc; //need to be in the SO level
    var item_cost_reg = "<item_cost_reg>";
    var item_total = "<item_total>";

    //Item Line item Charge Fields

    var charge_desc;
    var charge_qty;
    var charge_amount;
    var charge_total;
    //Item Line item Charge Fields END

    //Item Line Fields END

    //Payment Line Fields

    var payment_method = "<payment_method>";
    var payment_amount = "<payment_amount>";

    //Payment Line Fields END
    //recommend Line Fields

    var rec_img;
    var rec_url;

    //recommend Line Fields END


    //new Fields END
    try {

        var customerId = nlapiLookupField("salesorder", salesOrderInternalID, "entity");
       // var email = nlapiLookupField("customer", customerId, "email");
        var email = "gautam@searsinitium.com";


        email_addr = email_addr + email + "</email_addr>";

        //JSON Fields
        SubscriberKey = email;
        EmailAddress = email;
        OrderNumber = getSalesOrderExternalID(salesOrderInternalID);
        transDate = itemFullfilmentParsedRecord.createddate;
        OrderSubTotal = salesOrderParsedRecord.total;
        ShippingCost = salesOrderParsedRecord.shippingcost;
        GSTHST = salesOrderParsedRecord.taxtotal;//we dotn need SO level info
        PST = salesOrderParsedRecord.tax2total;

        FirstName = salesOrderParsedRecord.custbody_sears_cust_first_name;
        //JSON Fields ENDS

        //XML Data Fields
        order_date = order_date + transDate + "</order_date>";
        ship_name = ship_name + nlapiLookupField("salesorder", salesOrderInternalID, "shipaddressee") + "</ship_name>";


        try {
            shipping_method = shipping_method + salesOrderParsedRecord.shipmethod.name + "</shipping_method>";
            ship_via = ship_via + nlapiLookupField("salesorder", salesOrderInternalID, "shipcarrier") + "</ship_via>";
        }
        catch (e) {
            shipping_method = shipping_method + "</shipping_method>";
            ship_via = ship_via + "</ship_via>";
        }

        //shipping_method = shipping_method + salesOrderParsedRecord.shipmethod.name + "</shipping_method>";
        //ship_via = ship_via + nlapiLookupField("salesorder", salesOrderInternalID, "shipcarrier") + "</ship_via>";

        addr1 = addr1 + salesOrderParsedRecord.shipaddr1 + "</addr1>";
        addr2 = addr2 + salesOrderParsedRecord.shipaddr2 + "</addr2>";
         city = city + salesOrderParsedRecord.shipcity + "</city>";
        province = province + salesOrderParsedRecord.shippingaddress.state + "</province>";
        postal_code = postal_code + salesOrderParsedRecord.shipzip + "</postal_code>";
       // tracking_number = tracking_number + itemFullfilmentParsedRecord.package[1].packagetrackingnumber + "</tracking_number>";
       
         number_items = number_items + itemFullfilmentParsedRecord.item.length + "</number_items>";

         for (var i = 0; i < itemFullfilmentParsedRecord.item.length; i++) {

             var lineItemInfo = [];
             lineItemInfo.push("<line>");

             lineItemInfo.push(item_title + itemFullfilmentParsedRecord.item[i].custcol_searsitemname + "</item_title>");
             lineItemInfo.push(item_qty + itemFullfilmentParsedRecord.item[i].quantity + "</item_qty>");
             //  lineItemInfo.push(item_cost_reg + itemFullfilmentParsedRecord.item[i].rate + "</item_cost_reg>");
             lineItemInfo.push(item_total + itemFullfilmentParsedRecord.item[i].amount + "</item_total>");

             lineItemInfo.push("</line>");
             linesItemInfo.push(lineItemInfo.join(" "));

         }

        try {


            payment_method = payment_method + parsedRecord.paymentmethod.name + "  " + parsedRecord.ccnumber + "</payment_method>";

            payment_amount = payment_amount + parsedRecord.total + "</payment_amount>";
        }
        catch (e) {
            payment_method = payment_method + "</payment_method>";

            payment_amount = payment_amount + "</payment_amount>";
        }

    }
    catch (e) {
       
    }

    var XmlData = "<xml><packages>"
     +
         "<package>"

     + order_date
         +
         ship_name
         + addr1
         + addr2
         + city
         + province
         + postal_code
          + shipping_method
         + ship_via
         + number_items

         +
         "<lines>" +
         linesItemInfo.join(" ") +
         "</lines>" +
         "</package>" +
         "</packages>"

     +
     "<payments>" +
     "<payment>" +
     payment_method
         +
         payment_amount +
         "</payment>"

     +
     "</payments>"

     +
     "<recommends>" +
     "<recommend>"

     +
     "</recommend>"

     +
     "</recommends></xml>";


    var jsonOut = {
        "Address": EmailAddress,
        "SubscriberKey": EmailAddress,
        "ContactAttributes": {
            "SubscriberAttributes": {

                "FirstName": FirstName,

                "OrderNumber": OrderNumber,

                "OrderURL": "",

                "OrderSubTotal": OrderSubTotal,
                "OrderTotal": OrderTotal,

                "PromoApplied": "",

                "Savings": "",

                "PointsEarned": "",

                "ShippingCost": ShippingCost,

                "GSTHST": GSTHST,

                "PST": PST,
                "Language": "E",

                //"XML_Data": "<xml><packages><package><order_date>" + order_date + "</order_date><est_ship_date>" + est_ship_date + "</est_ship_date><est_dlvr_date>Not here yet</est_dlvr_date><ship_fname>" + ship_name + "</ship_fname><ship_lname>" + ship_name + "</ship_lname><addr1>" + addr1 + "</addr1><addr2>" + addr2 + "</addr2><city>" + city + "</city><province>" + province + "</province><postal_code>" + postal_code + "</postal_code><shipping_method>" + shipping_method + "</shipping_method><ship_via>" + ship_via + "</ship_via><number_items>" + number_items + "</number_items>" + "<lines>" + linesItemInfo.join(" ") + "</lines>" + "</package></packages><payments><payment><payment_method>" + payment_method + " </payment_method><payment_amount>" + payment_amount + "</payment_amount></payment></payments><recommends><recommend><rec_img></rec_img><rec_url></rec_url></recommend></recommends></xml>"
                "XML_Data": XmlData

                //    "XML_Data": "<xml><packages><package>" + order_date + est_ship_date + "<est_dlvr_date></est_dlvr_date>" + ship_fname +ship_lname + addr1 + addr2 +  city + province  + postal_code  + shipping_method  + ship_via  + number_items + "<lines>" + linesItemInfo.join(" ") + "</lines>" + "</package></packages><payments><payment>" + payment_method + payment_amount + "</payment></payments><recommends><recommend><rec_img></rec_img><rec_url></rec_url></recommend></recommends></xml>"
            }
        }
    }

  //  var response = sendExactTargetEmail(jsonOut, "07132016_shipped_trigger");
    return jsonOut;
}





function checkIfUndefined(ValueIn){

    var valueOut = "";

    if (ValueIn === null || ValueIn === undefined) {
        valueOut = "";
    }
    else {
        valueOut = ValueIn;
    }
    return valueOut;

}



function getSalesOrderCancelFullEmail(id) {

    var linesItemInfo = [];

    var record = nlapiLoadRecord("salesorder", id);
    var parsedRecord = parseRecord(record);

    var EmailAddress;
    var SubscriberKey;
    var FirstName;
    var OrderNumber;
    var OrderDate;
    var OrderURL; //NOT Ready YET
    var OrderSubTotal; //NOT Ready YET
    var PromoApplied;
    var Savings;
    var PointsEarned;
    var ShippingCost;
    var GSTHST;
    var PST;
    var OrderTotal; //Same as Order Subtotal OR just Order Total without TAX and SHipp ???
    var OptIn; //Not in NS yet

    //XML Data Fields STarts

    var order_date = "<order_date>";
    var cancellation_date = "<cancellation_date>";

    //Item Line Fields
    var cancelled_item_title = "<cancelled_item_title>";
    var cancelled_item_image_url; //Pending
    var cancelled_item_attr1; //this is Dynamic - attr could be more or less
    var cancelled_item_attr2; //this is Dynamic - attr could be more or less
    var cancelled_item_qty = "<cancelled_item_qty>";
    var cancelled_item_cost_disc; //need to be in the SO level
    var cancelled_item_cost_reg = "<cancelled_item_cost_reg>";
    var cancelled_item_total = "<cancelled_item_total>";

    //Item Line item Charge Fields

    var cancelled_item_charge_desc;
    var cancelled_item_charge_qty;
    var cancelled_item_charge_amount;
    var cancelled_item_charge_total;
    //Item Line item Charge Fields END
    var cancelled_item_category_page_name;
    var cancelled_item_category_url;
    //Item Line Fields END

    //XML Data Fields END
    var test = "fine";

    try {

        var customerId = nlapiLookupField("salesorder", id, "entity");
        //  var email = nlapiLookupField("customer", customerId, "email");
        test = "a";
        var email = "gautam@searsinitium.com";
      //  email_addr = email_addr + email + "</email_addr>";
        test = "b";
        //JSON Fields
        SubscriberKey = email;
        EmailAddress = email;
        OrderNumber = getSalesOrderExternalID(id);
        transDate = nlapiLookupField("salesorder", id, "trandate");
        OrderDate = transDate;
        test = "c";
        OrderSubTotal = parsedRecord.subtotal;
        OrderTotal = parsedRecord.total;
        FirstName = parsedRecord.custbody_sears_cust_first_name;
        ShippingCost = parsedRecord.altshippingcost;

        GSTHST = parsedRecord.taxtotal;
        PST = parsedRecord.tax2total;

        //JSON Fields ENDS
        test = "1";
     
        //XML Data Fields
        order_date = order_date + transDate + "</order_date>";
        //cancellation_date
        test = "2";

        for (var i = 0; i < parsedRecord.item.length; i++) {
            test = "3";
            var lineItemInfo = [];
            lineItemInfo.push("<line>");

            lineItemInfo.push(cancelled_item_title + parsedRecord.item[i].custcol_searsitemname + "</cancelled_item_title>");
            lineItemInfo.push(cancelled_item_qty + parsedRecord.item[i].quantity + "</cancelled_item_qty>");
            lineItemInfo.push(cancelled_item_cost_reg + parsedRecord.item[i].rate + "</cancelled_item_cost_reg>");
         

            lineItemInfo.push("</line>");
            linesItemInfo.push(lineItemInfo.join(" "));

        }
        test = "4";

    }
    catch (e) {
    

    }
    //return parsedRecord;
    var XmlData = "<xml>"
        + order_date
       + cancellation_date
       + "<lines>"
       + linesItemInfo.join(" ")
       +"</lines></xml>";


    var jsonOut = {
        "Address": EmailAddress,
        "SubscriberKey": EmailAddress,
        "ContactAttributes": {
            "SubscriberAttributes": {

                "FirstName": FirstName,

                "OrderNumber": OrderNumber,

                "OrderURL": "",

                "OrderSubTotal": OrderSubTotal,
                "OrderTotal": OrderTotal,

                "PromoApplied": "",

                "Savings": "",

                "PointsEarned": "",

                "ShippingCost": ShippingCost,

                "GSTHST": GSTHST,

                "PST": PST,
                "Language": "E",
                //"OptIn":"",
               "XML_Data": XmlData

                           }
        }
    }

    //var response = sendExactTargetEmail(jsonOut, "07082016_cancelled_trigger");
    return "";


}
function getSalesOrderEmail(id) {


    var linesItemInfo = [];

    var record = nlapiLoadRecord("salesorder", id);
    var parsedRecord = parseRecord(record);

    var EmailAddress;
    var SubscriberKey;
    var FirstName;
    var OrderNumber;
    var OrderDate;
    var OrderURL; //NOT Ready YET
    var OrderSubTotal; //NOT Ready YET
    var PromoApplied;
    var SavingsPointsEarned;
    var ShippingCost;
    var GSTHST;
    var PST;
    var OrderTotal; //Same as Order Subtotal OR just Order Total without TAX and SHipp ???
    var OptIn; //Not in NS yet

    //new Fields
    var email_addr = "<email_addr>";
    var order_date = "<order_date>";
    var est_ship_date = "<est_ship_date>";
    var est_dlvr_date; //Pending
    var ship_name = "<ship_name>"; //first_name we dont have first name

    //testign 
    var ship_fname = "<ship_fname>gautam </ship_fname>"
    var ship_lname = "<ship_lname>gautam </ship_lname>"
    //end
    var addr1 = "<addr1>";
    var addr2 = "<addr2>";
    var city = "<city>";
    var province = "<province>";

    var postal_code = "<postal_code>";
    var shipping_method = "<shipping_method>";
    var ship_via = "<ship_via>"//Pending NOT COmign in the SO Object 
    var number_items = "<number_items>";

    //Item Line Fields
    var item_title = "<item_title>";
    var item_image_url; //Pending
    var item_link; //Pending
    var item_instock; //DO we really need this ?
    var item_attr1; //this is Dynamic - attr could be more or less
    var item_attr2; //this is Dynamic - attr could be more or less
    var item_qty = "<item_qty>";
    var item_cost_disc; //need to be in the SO level
    var item_cost_reg = "<item_cost_reg>";
    var item_total = "<item_total>";

    //Item Line item Charge Fields

    var charge_desc;
    var charge_qty;
    var charge_amount;
    var charge_total;
    //Item Line item Charge Fields END

    //Item Line Fields END

    //Payment Line Fields

    var payment_method = "<payment_method>";
    var payment_amount = "<payment_amount>";

    //Payment Line Fields END
    //recommend Line Fields

    var rec_img;
    var rec_url;

    //recommend Line Fields END



    //new Fields END

    try {

        var customerId = nlapiLookupField("salesorder", id, "entity");
        //  var email = nlapiLookupField("customer", customerId, "email");

        // var email = "gautam@searsinitium.com";

        var email ="lgladst@sears.ca";
        email_addr = email_addr + email + "</email_addr>";

        //JSON Fields
        SubscriberKey = email;
        EmailAddress = email;
        OrderNumber = getSalesOrderExternalID(id);
        transDate = nlapiLookupField("salesorder", id, "trandate");
        OrderDate = transDate;

        OrderSubTotal = parsedRecord.subtotal;
        OrderTotal = parsedRecord.total;
        FirstName = parsedRecord.custbody_sears_cust_first_name;




        ShippingCost = parsedRecord.altshippingcost;

        GSTHST = parsedRecord.taxtotal;
        PST = parsedRecord.tax2total;

        //JSON Fields ENDS

        //XML Data Fields
        order_date = order_date + transDate + "</order_date>";
        est_ship_date = est_ship_date + nlapiLookupField("salesorder", id, "shipdate") + "</est_ship_date>";
        ship_name = ship_name + nlapiLookupField("salesorder", id, "shipaddressee") + "</ship_name>";

       

        try {
           shipping_method = shipping_method + parsedRecord.shipmethod.name + "</shipping_method>";
           ship_via = ship_via + nlapiLookupField("salesorder", id, "shipcarrier") + "</ship_via>";
        }
        catch (e) {
           shipping_method = shipping_method + "</shipping_method>";
           ship_via = ship_via + "</ship_via>";
        }

        

        addr1 = addr1 + parsedRecord.shipaddr1 + "</addr1>";
        addr2 = addr2 +checkIfUndefined(parsedRecord.shipaddr2) + "</addr2>";
        city = city + parsedRecord.shipcity + "</city>";
        province = province + parsedRecord.shippingaddress.state + "</province>";
        postal_code = postal_code + parsedRecord.shipzip + "</postal_code>";
        number_items = number_items + parsedRecord.item.length + "</number_items>";

        for (var i = 0; i < parsedRecord.item.length; i++) {
            var lineItemInfo = [];
            lineItemInfo.push("<line>");

            lineItemInfo.push(item_title + parsedRecord.item[i].custcol_searsitemname + "</item_title>");
            lineItemInfo.push(item_qty + parsedRecord.item[i].quantity + "</item_qty>");
            lineItemInfo.push(item_cost_reg + parsedRecord.item[i].rate + "</item_cost_reg>");
            lineItemInfo.push(item_total + parsedRecord.item[i].amount + "</item_total>");

            lineItemInfo.push("</line>");
            linesItemInfo.push(lineItemInfo.join(" "));     

        }

        try {
          

            payment_method = payment_method + parsedRecord.paymentmethod.name + "  " + parsedRecord.ccnumber + "</payment_method>";

            payment_amount = payment_amount + parsedRecord.total + "</payment_amount>";
        }
        catch (e) {
            payment_method = payment_method + "</payment_method>";

            payment_amount = payment_amount + "</payment_amount>";
        }




        //XML Data Fields END


    }
    catch (e) {


    }
    //return parsedRecord;






    var XmlData = "<xml><packages>"
     +
         "<package>"

     + order_date
         +
         est_ship_date +
         ship_name
         + addr1
         + addr2
         + city
         + province
         + postal_code
          + shipping_method
         + ship_via
         + number_items

         +
         "<lines>" +
         linesItemInfo.join(" ") +
         "</lines>" +
         "</package>" +
         "</packages>"

     +
     "<payments>" +
     "<payment>" +
     payment_method
         +
         payment_amount +
         "</payment>"

     +
     "</payments>"

     +
     "<recommends>" +
     "<recommend>"

     +
     "</recommend>"

     +
     "</recommends></xml>";


    var jsonOut = {
        "Address": EmailAddress,
        "SubscriberKey": EmailAddress,
        "ContactAttributes": {
            "SubscriberAttributes": {

                "FirstName": FirstName,

                "OrderNumber": OrderNumber,

                "OrderURL": "",

                "OrderSubTotal": OrderSubTotal,
                "OrderTotal": OrderTotal,

                "PromoApplied": "",

                "Savings": "",

                "PointsEarned": "",

                "ShippingCost": ShippingCost,

                "GSTHST": GSTHST,

                "PST": PST,
                "Language": "E",

                //"XML_Data": "<xml><packages><package><order_date>" + order_date + "</order_date><est_ship_date>" + est_ship_date + "</est_ship_date><est_dlvr_date>Not here yet</est_dlvr_date><ship_fname>" + ship_name + "</ship_fname><ship_lname>" + ship_name + "</ship_lname><addr1>" + addr1 + "</addr1><addr2>" + addr2 + "</addr2><city>" + city + "</city><province>" + province + "</province><postal_code>" + postal_code + "</postal_code><shipping_method>" + shipping_method + "</shipping_method><ship_via>" + ship_via + "</ship_via><number_items>" + number_items + "</number_items>" + "<lines>" + linesItemInfo.join(" ") + "</lines>" + "</package></packages><payments><payment><payment_method>" + payment_method + " </payment_method><payment_amount>" + payment_amount + "</payment_amount></payment></payments><recommends><recommend><rec_img></rec_img><rec_url></rec_url></recommend></recommends></xml>"
                "XML_Data": XmlData

                //    "XML_Data": "<xml><packages><package>" + order_date + est_ship_date + "<est_dlvr_date></est_dlvr_date>" + ship_fname +ship_lname + addr1 + addr2 +  city + province  + postal_code  + shipping_method  + ship_via  + number_items + "<lines>" + linesItemInfo.join(" ") + "</lines>" + "</package></packages><payments><payment>" + payment_method + payment_amount + "</payment></payments><recommends><recommend><rec_img></rec_img><rec_url></rec_url></recommend></recommends></xml>"
            }
        }
    }

    var response = sendExactTargetEmail(jsonOut, "07122016_order_confirmation_trigger");
    return response;



}


function sendExactTargetEmail(dataIn,triggerKey) {


    // HTTP headers
    var method = 'POST';
    var token = getExactTargetToken();
    var headers = new Array();
    headers['Content-Type'] = 'application/json';
    headers['Authorization'] = 'Bearer ' + token;
    var restletUrl = "https://www.exacttargetapis.com/messaging/v1/messageDefinitionSends/key:" + triggerKey + "/send";
   
   // var restletUrl =  "https://www.exacttargetapis.com/messaging/v1/messageDefinitionSends/key:Trans_Order_Conf/send";
    var JsonObj = {
        "From": {
            "Address": "gautam@searsinitium.com",
            "Name": "noreply@"
        }     
    }
    JsonObj["To"] = dataIn;
    JsonObj["OPTIONS"] = {
        "RequestType": "SYNC"
    };

    var payload = JSON.stringify(JsonObj);

    // HTTP headers
    var restResponse = nlapiRequestURL(restletUrl, payload, headers, null, method).getBody();


   // var restResponse = JSON.parse(nlapiRequestURL(restletUrl, JsonObj, headers, null, method).getBody());
    return restResponse;//+ "     " +restResponse;

}
    
    function getExactTargetToken () {
        var method = 'GET';
        var headers = new Array();
        var restletUrl = 'https://auth.exacttargetapis.com/v1/requestToken';
        headers['Content-Type'] = 'application/json';
        var payload = JSON.stringify({

            "clientId": "18r293cbd138ky7xcca32qlw",
            "clientSecret": "nCmwc3CzmdiNnylcjjohw31p"


        });
        // HTTP headers

        var restResponse = JSON.parse(nlapiRequestURL(restletUrl, payload, headers, null, method).getBody());
        //var html = 
        //		'Token:<br>' +
        //		restResponse.accessToken
        //	response.write(html); 
        return (restResponse.accessToken);
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

function getItemExternalID(internalID) {
    var arrSearchFilter = [];
    var arrSearchColumn = [];
    arrSearchFilter[0] = new nlobjSearchFilter('internalID', null, 'is', internalID);

    arrSearchColumn[0] = new nlobjSearchColumn('externalid');
    var arrSearchResult = nlapiSearchRecord('inventoryitem', null, arrSearchFilter, arrSearchColumn);

    return arrSearchResult;

}

function getItemExternalIDFromItemID(itemID) {

    var arrSearchFilter = new nlobjSearchFilter('itemid', null, 'is', itemID);

    var arrSearchColumn = new nlobjSearchColumn('externalid');
    var arrSearchResult = nlapiSearchRecord('inventoryitem', null, arrSearchFilter, arrSearchColumn);
    var arrSearchResultObj = parseRecord(arrSearchResult);

    //return arrSearchResultObj[0];
    return arrSearchResultObj[0].columns.externalid.internalid;

}




function getEmail() {
    var customerId = nlapiLookupField("salesorder", "SO284", "entity");
    //customerId = customerId['internalid'];
    //var customerAddress = nlapiLookupField("customer",customerId,"email");
    nlapiLogExecution('DEBUG', 'id=' + JSON.stringify(customerId));
    return JSON.parse(customerId);
}

function getItemQuantity(externalID) {
    var externalIDs = externalID.split(",");

    var internalIDs = getItemInternalID(externalID);

    var responseObject = {};
    var responseObjectArray = [];

    var tempTotalQuantity = 0;
    var currentID = "";
    var tem = {};
    var totalQuantity = 0;
    for (j = 0; j < internalIDs.length; j++) {

        totalQuantity = 0;

        currentID = internalIDs[j];

        try {
            var record = nlapiLoadRecord("inventoryitem", currentID);

            var recordString = JSON.stringify(record);
            var recordObj = JSON.parse(recordString);
            tem = recordObj;

            for (k = 0; k < recordObj.locations.length; k++) {
                if (recordObj.locations[k].location_display == "Calgary SCI : Available to Sell") {

                    totalQuantity = recordObj.locations[3].quantityavailable;
                }
            }
        } catch (exception) {

            totalQuantity = -1;
        }
        var item = {};

        item[externalIDs[j]] = totalQuantity;
        responseObjectArray.push(item);
        responseObject["items"] = responseObjectArray;
    }

    return responseObject;

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
        //arrSearchResults.push(arrSearchResult[0].id);
    }

    // var arrCustPaymentColumns = new nlobjSearchColumn('internalid');
    //  var arrCustPaymentRes = searchAllRecord('salesorder', null, externalidSO, arrCustPaymentColumns); 

    return arrSearchResults;

}


/**
 * This function performs Search on records.
 *
 * @param {String} recordType, searchId, searchFilter, searchColumns
 * @returns {String[]} arrSearchResults
 */
function searchAllRecord(recordType, searchId, searchFilter, searchColumns) {
    var arrSearchResults = [];

    if (searchId) {
        var savedSearch = nlapiLoadSearch(recordType, searchId);
        if (searchFilter) savedSearch.addFilters(searchFilter);
        if (searchColumns) savedSearch.addColumns(searchColumns);
    } else {
        var savedSearch = nlapiCreateSearch(recordType, searchFilter, searchColumns);
    }

    var resultset = savedSearch.runSearch();
    var searchid = 0;

    var resultslice = resultset.getResults(searchid, 1);
    if (resultslice) {
        do {
            var resultslice = resultset.getResults(searchid, searchid + 1000);

            for (var rs in resultslice) {
                arrSearchResults.push(resultslice[rs]);
                searchid++;
            }
        } while (resultslice.length >= 1000)
    }

    return arrSearchResults;
}


function getSalesOrderStatus_test(extrenalID) {


    //var resExtrenalID = extrenalID.split(",");
    //var internalIDs = getSalesOrderInternalID(extrenalID);
    //var status = "-1";
    //var ItemFullfilmentInternalIDs = [];
    //var itemsArray = [];


    //var responseObject = {};
    //var finresponseObject = {};
    //for (j = 0; j < internalIDs.length; j++) {
    //    if (internalIDs[j] != "-1") {
    //        try {
    //            var record = nlapiLoadRecord("salesorder", internalIDs[j]);

    //            var recordObj = parseRecord(record);
    //            status = recordObj.orderstatus.name;

    //            if (recordObj.hasOwnProperty("links")) {

    //                for (k = 0; k < recordObj.links.length; k++) {

    //                    if (recordObj.links[k].type == "Item Fulfillment") {


    //                        ItemFullfilmentInternalIDs.push(getItemFullfilmentInternalID(recordObj.links[k].tranid));


    //                    }
    //                }

    //                for (l = 0; l < ItemFullfilmentInternalIDs.length; l++) {
    //                    var FullfillmentRecord = nlapiLoadRecord("itemfulfillment", ItemFullfilmentInternalIDs[l]);
    //                    var FullfillmentRecordObj = parseRecord(FullfillmentRecord);

    //                    for (i = 0; i < FullfillmentRecordObj.item.length; i++) {
    //                        var currentItemID = getItemExternalIDFromItemID(FullfillmentRecordObj.item[i].itemname);
    //                        var currentItemtrackingNum = FullfillmentRecordObj.item[i].custcol_sears_tracking_number;
    //                        lengthtest = currentItemtrackingNum;
    //                        var itemDetails = {
    //                            "itemID": currentItemID,
    //                            "trackingNo": currentItemtrackingNum,
    //                            "carrierName": "UPS",
    //                            "carrierURl": "ups.com"
    //                        };
    //                        itemsArray.push(itemDetails);

    //                    }


    //                }


    //            }
    //        } catch (exception) {
    //            status = "-1";
    //        }
    //        responseObject[resExtrenalID[j]] = {
    //            "status": status,
    //            "items": itemsArray
    //        };
    //    } else {
    //        status = "-1";
    //        responseObject[resExtrenalID[j]] = {
    //            "status": status
    //        };
    //    }
    //}

    return "";
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

function getVendorReturn(id) {
    try {
        var record = nlapiLoadRecord("vendorreturnauthorization", id);
    } catch (e) {
        return e;
    }

    return record;
}

function getshipItemDetail(id) {
    try {
        var record = nlapiLoadRecord("inventoryitem", id);
    } catch (e) {
        return e;
    }
    return record;
}


function sendData(urlAPIgee, Data) {
    var method = "POST";
    var headers = new Array();
    headers['Content-Type'] = 'application/json';
    nlapiRequestURL(urlAPIgee, JSON.stringify(Data), null, method);

}

function getSalesOrderDetail(id) {



    try {
        var records = nlapiLoadRecord("salesorder", id);


    } catch (e) {
        return e;
    }
    return records;
}

function getItemMaster() {
    var records = {
        "inventory": []
    };
    var record;
    var urlAPIgee = "http://initium-commerce-dev.apigee.net/v1/orderfulfilmentapi/itemsmaster";
    for (var i = 0; i < 5; i++) {
        records['inventory'][i] = nlapiLoadRecord("inventoryitem", (i + 61));
    }
    sendData(urlAPIgee, records);

    return records;
}

function getPurchaseOrders() {
    var records = {
        "purchaseOrders": []
    };
    var record;
    var urlAPIgee = "http://initium-commerce-dev.apigee.net/v1/orderfulfilmentapi/purchaseorders";
    records['purchaseOrders'][0] = nlapiLoadRecord("purchaseorder", 10);
    records['purchaseOrders'][0] = nlapiLoadRecord("purchaseorder", 31);
    records['purchaseOrders'][0] = nlapiLoadRecord("purchaseorder", 33);
    sendData(urlAPIgee, records);

    return records;
}


function getItemDetail(id) {
    try {
        var record = nlapiLoadRecord("inventoryitem", id);
        var urlAPIgee = "http://initium-commerce-dev.apigee.net/ns-sci/ns-senditem";
       // sendData(urlAPIgee, record);
    } catch (exception) {

        record = -1;
    }
    return record;

}


function getPurchaseOrderDetail(id) {
    try {
        var record = nlapiLoadRecord("purchaseorder", id);
        var urlAPIgee = "http://initium-commerce-dev.apigee.net/ns-sci/ns-sendpo";
        sendData(urlAPIgee, record);
    } catch (e) {
        return e;
    }
    return record;
}

function getCustomerDetail(id) {
   // var record = nlapiLoadRecord("customer", id);
  return {name: "123"};
}

function getCustomerList() {
    
    return "list";
}

function cloneObject(obj) {
    return JSON.parse(JSON.stringify(obj));
}