/// <reference path="netsuiteAPI.js" />
/// <reference path="_nsiLibrary.js" />

/*
function itemFulfillmentBeforeLoad(type, form,request)
{
    nlapiLogExecution('DEBUG', '<Before Load Script> type: ' + type + '; recordType: ' + recordType + '; issueId: ' + issueId + ';');
}

function itemFulfillmentBeforeSubmit(type)
{
    nlapiLogExecution('AUDIT', 'itemFulfillmentCreateEvents.itemFulfillmentBeforeSubmit', 'Custom fulfillment processing beginning');
    nlapiLogExecution('DEBUG', 'itemFulfillmentCreateEvents.itemFulfillmentBeforeSubmit', getRemainingUsage() + ' execution units remaing...');

    if (type == 'create')
    {
        var record = nlapiGetNewRecord();
        var recordType = record.getRecordType();
        if (recordType != null && recordType == 'itemfulfillment')
        {
            var fulfillmentId = record.getId();
            var orderId = record.getFieldValue('orderid');
            var tranDate = record.getFieldValue('trandate');

            var order = nlapiLoadRecord('salesorder', orderId);
            var endUserId = order.getFieldValue('custbody_enduser');
            var resellerId = order.getFieldValue('custbody_treseller');
            var distributorId = order.getFieldValue('custbody_tdistributor');
            order = null;

            var licenses = new Array();

            var nbrItems = record.getLineItemCount('item');
            nlapiLogExecution('AUDIT', 'itemFulfillmentCreateEvents.itemFulfillmentBeforeSubmit', 'Order Id #' + orderId + ' - ' + nbrItems + ' line items to process');
            nlapiLogExecution('DEBUG', 'itemFulfillmentCreateEvents.itemFulfillmentBeforeSubmit', getRemainingUsage() + ' execution units remaing...');
            try
            {
                //var fieldArray = record.getAllLineItemFields('item');
                for (var i = 0; i < nbrItems; i++)
                {
                    // Must populate all product licenses
                    var qty = record.getLineItemValue('item', 'quantity', i + 1);
                    var productCode = record.getLineItemValue('item', 'custcol_prodcode', i + 1);
                    var itemId = record.getLineItemValue('item', 'item', i + 1);
                    nlapiLogExecution('DEBUG', 'itemFulfillmentCreateEvents.itemFulfillmentBeforeSubmit', i + '<br />\nquantity: ' + qty + '<br />\nProduct Code: ' + productCode + '<br />\nItem Id: ' + itemId);

                    //--------------------------------------------------------------------------------------
                    //var recordDump = '';
                    //for (var ndx = 0; ndx < fieldArray.length; ndx++) 
                    //{
                    //    recordDump += fieldArray[ndx] + ': ' + record.getLineItemValue('item', fieldArray[ndx], i + 1) + '\n';
                    //}
                    //nlapiLogExecution('DEBUG', 'itemFulfillmentCreateEvents.itemFulfillmentBeforeSubmit', '<pre>' + recordDump + '</pre>');
                    //--------------------------------------------------------------------------------------

                    if (productCode != null && productCode.length > 0)
                    {
                        var serials = getSerialNumbers(productCode, qty);
                        for (var j = 0; j < qty; j++)
                        {
                            var newLicense = nlapiCreateRecord('customrecord_licenses');
                            newLicense.setFieldValue('custrecord_serialnumber', serials[j]);
                            newLicense.setFieldValue('custrecord_prodid', productCode);
                            newLicense.setFieldValue('custrecord_licenseissuedate', tranDate);

                            newLicense.setFieldValue('custrecord_fulfillmentid', fulfillmentId);
                            newLicense.setFieldValue('custrecord_ordref', orderId);
                            newLicense.setFieldValue('custrecord_license_itemref', itemId);

                            newLicense.setFieldValue('custrecord_license_end_user', endUserId);
                            newLicense.setFieldValue('custrecord_licensereseller', resellerId);
                            newLicense.setFieldValue('custrecord_licensedistributor', distributorId);

                            var licenseRef = new Object();
                            licenseRef.Id = nlapiSubmitRecord(newLicense, true);
                            licenseRef.ProductCode = productCode;
                            licenseRef.SerialNbr = serials[j];
                            licenseRef.IsCaredFor = false;
                            licenses[licenses.length] = licenseRef;

                        }
                    }
                }
            }
            catch (err)
            {
                var errorText = "License Creation Error: There was a problem creating license records.\n[" + err + "]";
                nlapiLogExecution('ERROR', 'itemFulfillmentCreateEvents.itemFulfillmentBeforeSubmit', errorText);
                throw (errorText);
            }
            nlapiLogExecution('DEBUG', 'itemFulfillmentCreateEvents.itemFulfillmentBeforeSubmit', getRemainingUsage() + ' execution units remaing...');
            var nbrTricares = 0;
            try
            {
                for (var i = 0; i < nbrItems; i++)
                {
                    // Now we go back through and create all the triCares
                    var qty = record.getLineItemValue('item', 'quantity', i + 1);
                    var tricareFor = record.getLineItemValue('item', 'custcol_tricarefor', i + 1);
                    var itemId = record.getLineItemValue('item', 'item', i + 1);

                    if (tricareFor != null && tricareFor.length > 0)
                    {
                        for (var j = 0; j < qty; j++)
                        {
                            var newTriCare = nlapiCreateRecord('customrecord_tricare');

                            newTriCare.setFieldValue('custrecord_tricare_startdate', tranDate);
                            newTriCare.setFieldValue('custrecord_tricare_enddate', nlapiDateToString(nlapiAddMonths(nlapiStringToDate(tranDate), 12)));
                            newTriCare.setFieldValue('custrecord_tricare_enduser', endUserId);
                            newTriCare.setFieldValue('custrecord_tricare_reseller', resellerId);
                            newTriCare.setFieldValue('custrecord_tricare_distributor', distributorId);
                            newTriCare.setFieldValue('custrecord_tricare_order', orderId);
                            newTriCare.setFieldValue('custrecord_tricare_itemref', itemId);

                            for (var k = 0; k < licenses.length; k++)
                            {
                                if ((!licenses[k].IsCaredFor) && tricareFor.indexOf(licenses[k].ProductCode) > -1)
                                {
                                    licenses[k].IsCaredFor = true;
                                    newTriCare.setFieldValue('custrecord_tricare_license', licenses[k].Id);
                                    break;
                                }
                            }
                            nlapiSubmitRecord(newTriCare, true);
                            nbrTricares++;
                        }
                    }
                }
            }
            catch (err)
            {
                var errorText = "triCare Creation Error: There was a problem creating triCare records.\n[" + err + "]";
                nlapiLogExecution('ERROR', 'itemFulfillmentCreateEvents.itemFulfillmentBeforeSubmit', errorText);
                throw (errorText);
            }
            nlapiLogExecution('AUDIT', 'itemFulfillmentCreateEvents.itemFulfillmentBeforeSubmit', licenses.length + ' licenses created, ' + nbrTricares + ' triCare records created.');
            nlapiLogExecution('DEBUG', 'itemFulfillmentCreateEvents.itemFulfillmentBeforeSubmit', getRemainingUsage() + ' execution units remaing...');
        }
        else
        {
            if (recordType == null)
            {
                nlapiLogExecution('ERROR', 'itemFulfillmentCreateEvents.itemFulfillmentBeforeSubmit', 'Custom processing run on null record.');
            }
            else
            {
                nlapiLogExecution('ERROR', 'itemFulfillmentCreateEvents.itemFulfillmentBeforeSubmit', 'Custom processing run on incorrect record type.');
            }
        }
    }
    else
    {
        nlapiLogExecution('ERROR', 'itemFulfillmentCreateEvents.itemFulfillmentBeforeSubmit', 'Custom processing run on incorrect event.');
    }
    nlapiLogExecution('DEBUG', 'itemFulfillmentCreateEvents.itemFulfillmentBeforeSubmit', getRemainingUsage() + ' execution units remaing...');
    nlapiLogExecution('AUDIT', 'itemFulfillmentCreateEvents.itemFulfillmentBeforeSubmit', 'Custom fulfillment processing ending');
}
*/

function itemFulfillmentBeforeSubmit(type) {
    /*
    nlapiLogExecution('DEBUG', 'itemFulfillmentCreateEvents.itemFulfillmentBeforeSubmit', 'Custom fulfillment processing beginning');
    nlapiLogExecution('DEBUG', 'itemFulfillmentCreateEvents.itemFulfillmentBeforeSubmit', getRemainingUsage() + ' execution units remaing...');

    if (type == 'create') {
        var record = nlapiGetNewRecord();
        var recordType = record.getRecordType();
        if (recordType != null && recordType == 'itemfulfillment') {
            // Add record tracking here.
        }
        else {
            if (recordType == null) {
                nlapiLogExecution('ERROR', 'itemFulfillmentCreateEvents.itemFulfillmentBeforeSubmit', 'Custom processing run on null record.');
            }
            else {
                nlapiLogExecution('ERROR', 'itemFulfillmentCreateEvents.itemFulfillmentBeforeSubmit', 'Custom processing run on incorrect record type.');
            }
        }
    }
    else {
        nlapiLogExecution('ERROR', 'itemFulfillmentCreateEvents.itemFulfillmentBeforeSubmit', 'Custom processing run on incorrect event.');
    }
    nlapiLogExecution('DEBUG', 'itemFulfillmentCreateEvents.itemFulfillmentBeforeSubmit', getRemainingUsage() + ' execution units remaing...');
    nlapiLogExecution('DEBUG', 'itemFulfillmentCreateEvents.itemFulfillmentBeforeSubmit', 'Custom fulfillment processing ending');
    */    
}

function itemFulfillmentAfterSubmit(type) {
    nlapiLogExecution('DEBUG', 'itemFulfillmentCreateEvents.itemFulfillmentAfterSubmit', 'Custom fulfillment processing beginning');
    nlapiLogExecution('DEBUG', 'itemFulfillmentCreateEvents.itemFulfillmentAfterSubmit', getRemainingUsage() + ' execution units remaing...');

    if (type == 'create') {
        var record = nlapiGetNewRecord();
        var recordType = record.getRecordType();
        if (recordType != null && recordType == 'itemfulfillment') {
            var orderId = record.getFieldValue('orderid');
            var order = nlapiLoadRecord('salesorder', orderId);
            var orderSkipFulfill = order.getFieldValue('custbody_tricerat_skipfulfill');
            var recordSkipFulfill = record.getFieldValue('custbody_tricerat_skipfulfill');
            nlapiLogExecution('DEBUG', 'itemFulfillmentCreateEvents.itemFulfillmentAfterSubmit', 'orderSkipFulfill = "' + orderSkipFulfill + '"');
            nlapiLogExecution('DEBUG', 'itemFulfillmentCreateEvents.itemFulfillmentAfterSubmit', 'recordSkipFulfill = "' + recordSkipFulfill + '"');

            if (orderSkipFulfill == 'F') {
                if (recordSkipFulfill == 'F') {
                    processFulfillment(record.getId());
                    // Remove tracking here...
                    nlapiLogExecution('AUDIT', 'itemFulfillmentCreateEvents.itemFulfillmentAfterSubmit', 'Fulfillment processing scheduled...');
                }
                else {
                    nlapiLogExecution('AUDIT', 'itemFulfillmentCreateEvents.itemFulfillmentAfterSubmit', 'Skipping fulfillment processing...  (Requested by fulfillment skip fulfill field)');
                }
            }
            else {
                nlapiLogExecution('AUDIT', 'itemFulfillmentCreateEvents.itemFulfillmentAfterSubmit', 'Skipping fulfillment processing...  (Requested by sales order skip fulfill field)');
            }
        }
        else {
            if (recordType == null) {
                nlapiLogExecution('ERROR', 'itemFulfillmentCreateEvents.itemFulfillmentAfterSubmit', 'Custom processing run on null record.');
            }
            else {
                nlapiLogExecution('ERROR', 'itemFulfillmentCreateEvents.itemFulfillmentAfterSubmit', 'Custom processing run on incorrect record type.');
            }
        }
    }
    else {
        nlapiLogExecution('ERROR', 'itemFulfillmentCreateEvents.itemFulfillmentAfterSubmit', 'Custom processing run on incorrect event.');
    }
    nlapiLogExecution('DEBUG', 'itemFulfillmentCreateEvents.itemFulfillmentAfterSubmit', getRemainingUsage() + ' execution units remaing...');
    nlapiLogExecution('DEBUG', 'itemFulfillmentCreateEvents.itemFulfillmentAfterSubmit', 'Custom fulfillment processing ending');
}