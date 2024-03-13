/**
 * Module Description
 * This integration posts vendor payments from netsuite into Coupa
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function scheduled(type) {

    var context = nlapiGetContext();

    var envType = context.getEnvironment() === 'PRODUCTION' ? 'prod' : 'sb';
    nlapiLogExecution('DEBUG', 'envType = ', envType);
    
    var coupaObj={
        coupaURL: context.getSetting('SCRIPT' , 'custscript_coupa_oidc_client_url_' + envType),
        coupaHeaders: getAPIHeader('text/xml')
    };

    nlapiLogExecution('DEBUG', 'coupaURL = ', coupaObj.coupaURL);

    var searchResults = performSearch();
    var searchid = 0;
        do{
            var resultSlice = searchResults.getResults(searchid,searchid+50);
            for (var i in resultSlice) {
                processResultToCoupa(resultSlice[i], coupaObj);
            }
            var unitsLeft = context.getRemainingUsage();
            nlapiLogExecution('DEBUG','Unist Left',unitsLeft);
        }while (resultSlice.length >= 50&&unitsLeft>1500);
}

function processResultToCoupa(result, coupaObj){
    var baseurl = coupaObj.coupaURL + "/api/";
    var billRecord = nlapiLoadRecord('vendorbill', result.getValue('internalid', null, 'GROUP'));

    var refnum          = billRecord.getFieldValue('tranid');
    var supplier        = billRecord.getFieldValue('entity');
    var tranid          = billRecord.getId();
    var applyDate       = result.getValue('trandate', 'applyingTransaction', 'GROUP');
    var paymentNum      = result.getValue('number', 'applyingTransaction', 'GROUP');
    var voidedPayId     = result.getValue('internalid', 'applyingTransaction', 'GROUP');

    var coupaInvoiceId = getCoupaInvoiceId(
        refnum,
        supplier,
        tranid,        
        applyDate,
        paymentNum,
        coupaObj);

    if(coupaInvoiceId=='INVALID_COUPAID'){
        nlapiLogExecution('ERROR', 'Processing Error with posting payment - could find not Invoice in Coupa', 'Invoice Number = ' + refnum + ' supplierName = ' + supplierName +
                    ' supplierNumber = ' + supplier +
                    ' check# = ' + tranid);
    }else{
        var paymentVoided = postVoidPaymentToCoupa(paymentNum, voidedPayId,coupaInvoiceId,coupaObj);
        if(paymentVoided){
            if(setCoupaPaymentFlag(coupaInvoiceId,applyDate, false, coupaObj)){
                nlapiSubmitField('vendorpayment', voidedPayId, 'custbodyr7_processed_to_coupa', 4);
            }else{
                nlapiLogExecution('ERROR','UPDATE COUPA FLAG','applied voided payment in coupa, but falg was not updated for some reason');
                nlapiSubmitField('vendorpayment', voidedPayId, 'custbodyr7_processed_to_coupa', 2);
            }
        }else{
            nlapiLogExecution('ERROR','Could not void payment for some reason');
            nlapiSubmitField('vendorpayment', voidedPayId, 'custbodyr7_processed_to_coupa', 2);
        }
    }

}

function postVoidPaymentToCoupa(paymentNum, voidedPayId, coupaInvoiceId, coupaObj){
    var headers = coupaObj.coupaHeaders;
    var baseurl = coupaObj.coupaURL + "/api/";
    var voided = false;
    var voidedAmount = nlapiLookupField('transaction',voidedPayId,'total');            
    var voidedDate = netsuitedatetoCoupadate(nlapiLookupField('transaction',voidedPayId,'trandate')); 

    nlapiLogExecution('AUDIT', 'Processing vendor payment void',paymentNum);
    var url = baseurl + 'invoices/' + coupaInvoiceId;

     var postData = "<?xml version='1.0' encoding='UTF-8'?>" +
                    "<invoice-header>" +
                    //  "<payment-date type='datetime'>" + headerPaymentdate + "</payment-date>" +
                    "<payments type='array'>" +
                    "<payment>" +
                    "<amount-paid type='decimal' nil='true'>" + voidedAmount + "</amount-paid>" +
                    "<payment-date type='datetime' nil='true'>" + voidedDate + "</payment-date>" +
                    "<notes>" + paymentNum+" Void" + "</notes>" +
                    "</payment>" +
                    "</payments>" +
                    "</invoice-header>";
                    nlapiLogExecution('DEBUG','POST DATA',postData);
    var response = nlapiRequestURL(url, postData, headers, 'PUT');
    if (response.getCode() != '200') {
            nlapiLogExecution('ERROR',
            'Processing Error with posting void payment ',
            'Invoice Number = ' + coupaInvoiceId +
            ' amount paid = ' + voidedAmount +
            ' HTTP Response Code = ' + response.getCode());
    }else{
        nlapiLogExecution('AUDIT', 'void Payment successful',
        'Invoice Number = ' + coupaInvoiceId +
        ' Amount paid = ' + voidedAmount +
        ' Payment date = ' + voidedDate);
        voided = true
    }
    return voided;
}

function netsuitedatetoCoupadate(netsuitedate) {
    var datesplit = netsuitedate.split("/");
    return datesplit[2] + "-" + datesplit[0] + "-" + datesplit[1] + "T00:00:00-08:00";
}


function getCoupaInvoiceId(invoicenum, suppliernumber, tranid,  topaydate, paymentNum, coupaObj) {
    var coupaInvoiceId;
    var encoded_invoicenum = encodeURIComponent(invoicenum);
    var url = coupaObj.coupaURL + '/api/invoices?invoice-number=' + encoded_invoicenum + '&&supplier[number]=' + suppliernumber;

    var headers = coupaObj.coupaHeaders;

    var response = nlapiRequestURL(url, null, headers);
    if (response.getCode() != '200') {
        nlapiLogExecution('DEBUG', 'Error getting CoupaId', 'response code = ' + response.getCode() + ' url = ' + url + ' APIKey = ' + headers['X-COUPA-API-KEY']);
        return 'INVALID_COUPAID';
    }

    var responseXML = nlapiStringToXML(response.getBody());
    coupaInvoiceId = nlapiSelectValue(responseXML, 'invoice-headers/invoice-header/id');
    nlapiLogExecution('DEBUG', 'FOUND INVOICE IN COUPA',coupaInvoiceId);   
    return coupaInvoiceId;
}


function setCoupaPaymentFlag(coupaInvoiceId, headerPaymentdate, value, coupaObj) {
    var headers = coupaObj.coupaHeaders;
    var url = coupaObj.coupaURL + '/api/invoices/' + coupaInvoiceId;
    var updatedFlag = false
    var paymentDate = netsuitedatetoCoupadate(headerPaymentdate);
    var postData = "<?xml version='1.0' encoding='UTF-8'?>" +
        "<invoice-header>" +
        "<payment-date type='datetime'>" + headerPaymentdate + "</payment-date>" +
        "<paid type='boolean'>"+value+"</paid>" +
        "</invoice-header>";

    var response = nlapiRequestURL(url, postData, headers, 'PUT');
    if (response.getCode() != '200') {
        nlapiLogExecution('ERROR', 'Error setting the Paid Flag ', 'Coupa Invoice Id = ' + coupaInvoiceId);
    } else{
        nlapiLogExecution('AUDIT', 'Successfully set the Paid Flag ', 'Coupa Invoice Id = ' + coupaInvoiceId);
        updatedFlag = true;
    }
    return updatedFlag;
}

function performSearch(){

    var filters = new Array();
    var columns = new Array();
    var vendorFilter = nlapiGetContext().getSetting('SCRIPT', 'custscript_vendors_filter');
    columns.push(new nlobjSearchColumn('internalid', null, 'GROUP'));
    columns.push(new nlobjSearchColumn('type', null, 'GROUP'));
    columns.push(new nlobjSearchColumn('number', 'applyingTransaction', 'GROUP'));
    columns.push(new nlobjSearchColumn('internalid', 'applyingTransaction', 'GROUP'));
    columns.push(new nlobjSearchColumn('trandate', 'applyingTransaction', 'GROUP'));

    //filters.push(new nlobjSearchFilter('status', null, 'is', 'VendBill:B')); //Bill:Paid In Full   
    filters.push(new nlobjSearchFilter('custbodyr7_processed_to_coupa', 'applyingTransaction', 'anyof', [1,3])); //not success or failed
    filters.push(new nlobjSearchFilter('entity', null, 'noneof', vendorFilter.split(','))); // filter for 168670738 151929 292926
    filters.push(new nlobjSearchFilter('mainline', null, 'is', true)); //mainline
    filters.push(new nlobjSearchFilter('number', 'applyingTransaction', 'isnotempty'));
    filters.push(new nlobjSearchFilter('status', 'applyingtransaction', 'anyof', ['VendPymt:V']));
    filters.push(new nlobjSearchFilter('type', 'applyingtransaction',   'anyof', ['VendPymt']));
    var billSearch          = nlapiCreateSearch('vendorbill',filters,columns);
    return billSearch.runSearch();

}

