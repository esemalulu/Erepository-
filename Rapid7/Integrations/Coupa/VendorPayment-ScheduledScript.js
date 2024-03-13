// noinspection JSVoidFunctionReturnValueUsed

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
    var paramvalues = new Array();
    var fromdate = context.getSetting('SCRIPT', 'custscript_frompaydate');
    var todate = context.getSetting('SCRIPT', 'custscript_topaydate');
    var vendorFilter = context.getSetting('SCRIPT', 'custscript_vendor_filter');
    var initialNbr = 0; //default 0

    if (context.getSetting('SCRIPT', 'custscript_pay_fromrecords')) {
        initialNbr = context.getSetting('SCRIPT', 'custscript_pay_fromrecords');
    }
    var maxNbr = 250; // default 250 
    if (context.getSetting('SCRIPT', 'custscript_pay_torecords')) {
        maxNbr = context.getSetting('SCRIPT', 'custscript_pay_torecords');
    }

    var Message = '';

    paramvalues[0] = context.getSetting('SCRIPT', 'custscript_frompaydate');
    paramvalues[1] = context.getSetting('SCRIPT', 'custscript_topaydate');
    paramvalues[2] = context.getSetting('SCRIPT', 'custscript_pay_fromrecords');
    paramvalues[3] = context.getSetting('SCRIPT', 'custscript_pay_torecords');

    var environment = context.getEnvironment() === 'PRODUCTION' ? 'prod' : 'sb';
    var coupaObj = {
        coupaURL: context.getSetting('SCRIPT', 'custscript_coupa_oidc_client_url_' + environment),
        coupaHeaders: getAPIHeader('text/xml')
    };

    nlapiLogExecution('DEBUG', 'coupaURL = ', coupaObj.coupaURL);

    // setting the search filters

    var filters = new Array();
    var columns = new Array();
    
    columns.push(new nlobjSearchColumn('internalid', null, 'GROUP'));
    columns.push(new nlobjSearchColumn('type', null, 'GROUP'));
    columns.push(new nlobjSearchColumn('number', 'applyingTransaction', 'GROUP'));
    columns.push(new nlobjSearchColumn('internalid', 'applyingTransaction', 'GROUP'));
    columns.push(new nlobjSearchColumn('trandate', 'applyingTransaction', 'GROUP'));

    if (fromdate && todate) {
        //nlapiLogExecution('DEBUG', 'condition if fromdate && todate', 'from = ' + fromdate + ' to = ' + todate);
        filters[0] = new nlobjSearchFilter('trandate', 'applyingTransaction', 'onOrAfter', fromdate);
        filters[1] = new nlobjSearchFilter('trandate', 'applyingTransaction', 'onorbefore', todate);
    }

    if (fromdate && !todate) {
        //nlapiLogExecution('DEBUG', 'condition if fromdate && !todate', 'from = ' + fromdate );
        filters[0] = new nlobjSearchFilter('trandate', 'applyingTransaction', 'onOrAfter', fromdate);
    }

    if (!fromdate && todate) {
        //nlapiLogExecution('DEBUG', 'condition if !fromdate && todate', ' to = ' + todate);
        filters[0] = new nlobjSearchFilter('trandate', 'applyingTransaction', 'onOrAfter', todate);
    }

    if (!fromdate && !todate) {
        //nlapiLogExecution('DEBUG', 'condition if !fromdate && !todate');
        filters[0] = new nlobjSearchFilter('trandate', 'applyingTransaction', 'onOrAfter', 'daysAgo1');
    }

    filters.push(new nlobjSearchFilter('status', null, 'is', 'VendBill:B')); //Bill:Paid In Full   
    filters.push(new nlobjSearchFilter('custbodyr7_processed_to_coupa', 'applyingTransaction', 'noneof', [1, 4])); //not success, retry (removed) or void synced
    filters.push(new nlobjSearchFilter('entity', null, 'noneof', vendorFilter.split(','))); // filter for 168670738 151929 292926
    filters.push(new nlobjSearchFilter('mainline', null, 'is', true)); //mainline
    filters.push(new nlobjSearchFilter('number', 'applyingTransaction', 'isnotempty'));
    filters.push(new nlobjSearchFilter('status', 'applyingtransaction', 'noneof', ['VendPymt:V']));
    filters.push(new nlobjSearchFilter('type', 'applyingtransaction',   'anyof', ['VendPymt']));
    filters.push(new nlobjSearchFilter('externalidstring',null, 'contains','Coupa-VendorBill'));
    filters.push(new nlobjSearchFilter('trandate','applyingTransaction', 'notwithin','3/1/2021','5/31/2021'));

    // perform search

    var billSearch          = nlapiCreateSearch('vendorbill',filters,columns);
    var searchresults       = billSearch.runSearch();
    var resultSlice         = searchresults.getResults(0, 1000);
    if (resultSlice.length >0) {
        var IsCallOnUsageExceed = false;
        var IsCallAnotherScript = false;
        var InvpayMaxRecords = parseInt(resultSlice.length);
        if (InvpayMaxRecords > parseInt(maxNbr)) {
            IsCallAnotherScript = true;
        };
        nlapiLogExecution('AUDIT', 'Processing ' + resultSlice.length + ' Vendor Bills');
        nlapiLogExecution('DEBUG', 'Initial Record No', initialNbr);
        nlapiLogExecution('DEBUG', 'Max Records #', maxNbr);

        for (var i = initialNbr; i < Math.min(maxNbr, InvpayMaxRecords); i++) {
            //try start
            try {
                nlapiLogExecution('DEBUG','test1');
                var record     = nlapiLoadRecord('vendorbill', resultSlice[i].getValue('internalid', null, 'GROUP'));
                var recordType = record.getRecordType();
                var recordId   = record.getId();
                nlapiLogExecution('DEBUG','test1 Record Type: '+recordType+', recordId: '+recordId);
                nlapiLogExecution('DEBUG','test2');
                var vendorPaymentId = resultSlice[i].getValue('internalid', 'applyingTransaction', 'GROUP');
                nlapiLogExecution('DEBUG', 'test2 VP ID result from search', vendorPaymentId);
                var paymentRec = nlapiLoadRecord('vendorpayment', resultSlice[i].getValue('internalid', 'applyingTransaction', 'GROUP'));
                var paymentType = paymentRec.getRecordType();
                var paymentId   = paymentRec.getId();
                nlapiLogExecution('DEBUG','test2 Record Type: '+paymentType+', recordId: '+paymentId);
                nlapiLogExecution('DEBUG','test3')
                var paymentNum = resultSlice[i].getValue('number', 'applyingTransaction', 'GROUP');
                var applyDate  = resultSlice[i].getValue('trandate', 'applyingTransaction', 'GROUP');
                var usageRemaining = context.getRemainingUsage();
                if (usageRemaining > 1000) {
                    nlapiLogExecution('DEBUG', 'Processing Vendor Bill id', record.getId());
                    nlapiLogExecution('DEBUG', 'Processing Vendor Bill Apply Date ',applyDate);
                    var ErrorMessage = PostPaymenttoCoupa(record, applyDate, paymentNum, coupaObj);
                    nlapiLogExecution('DEBUG', 'ErrorMessage', JSON.stringify(ErrorMessage));
                } else {
                    nlapiLogExecution('DEBUG', 'Usage Remaining =  ', usageRemaining);
                    initialNbr = i;
                    IsCallOnUsageExceed = true;
                    IsCallAnotherScript = true;
                    break;
                };
                if(ErrorMessage =='Set_Retry'){
                    nlapiSubmitField(paymentType, paymentId, 'custbodyr7_processed_to_coupa', 3);//retry
                    nlapiLogExecution('DEBUG', 'set to retry', recordId);
                } else if (ErrorMessage != '') {
                    var addMessage = Message + ErrorMessage;
                    Message = addMessage;
                    nlapiSubmitField(paymentType, paymentId, 'custbodyr7_processed_to_coupa', 2); //failed
                } else {
                    nlapiSubmitField(paymentType, paymentId, 'custbodyr7_processed_to_coupa', 1);//success
                    nlapiLogExecution('DEBUG', 'success with Vendor Bill', recordId);
                };

            } catch (error) {

                nlapiLogExecution('ERROR', 'Process Error', 'Error Code = ',error);
                if (error instanceof nlobjError) {
                    var errordetails;
                    errorcode = error.getCode();
                    switch (errorcode) {
                        case "SSS_REQUEST_TIME_EXCEEDED":
                            errordetails = "Connection closed because it has exceed the time out period (NetSuite has not received a response after 5 seconds on initial connection or after 45 seconds on the request).";
                            i = i - 1;
                            if (Message != '') {
                                sendErrorEmail(Message);
                                Message = '';
                            }
                            break;
                        case "SSS_USAGE_LIMIT_EXCEEDED":
                            if (Message != '') {
                                sendErrorEmail(Message);
                            }
                            errordetails = "NetSuite Scheduled Suitescript usage limit of 1000 units exceeded. Exiting script and Called another script to execute limited records per script.";
                            maxNbr = i - 1;
                            CallAnotherScript(paramvalues, initialNbr, maxNbr, InvpayMaxRecords);
                            exit = true;
                            break;
                        case "PMT_EDIT_DISALLWD":
                            errordetails = "This liability payment cannot be edited while it has an Automated Clearing House transmission in process.";
                            break;
                        default:
                            if (Message != '') {
                                sendErrorEmail(Message);
                            }
                            errordetails = error.getDetails() + ".";
                            exit = true;
                            break;
                    };
                    nlapiLogExecution('ERROR', 'Process Error', 'Error Code = ' + errorcode + ' Error Description = ' + errordetails);
                    nlapiSendEmail(106223954, nlapiGetContext().getSetting('SCRIPT', 'custscript_pay_emailaddr_notifications'), nlapiGetContext().getSetting('SCRIPT', 'custscript_pay_acccountname') + ' Invoice Payment Integration:Processing Error - Exception', 'Error Code = ' + errorcode + ' Error Description = ' + errordetails);
                };
            }; //catch end
        };
        if (Message != '') {
            sendErrorEmail(Message);
            Message = '';
            //nlapiLogExecution('DEBUG','Consolidate Messages',Message);
        };

        if (IsCallAnotherScript) {
            if (!IsCallOnUsageExceed) {
                initialNbr = maxNbr
            };
            CallAnotherScript(paramvalues, initialNbr, maxNbr, InvpayMaxRecords);
        };
    } else {
        nlapiLogExecution('AUDIT', 'Zero Vendor Payments to export');
    };
};

function PostPaymenttoCoupa(recd, applyDate, paymentNum, coupaObj) {
    var Message = "";
    var supplier = recd.getFieldValue('entity');
    var supplierName = getCoupaSupplierName(recd.getFieldValue('entity'));
    var headerPaymentdate = applyDate;
    var tranid = recd.getId();
    var SetToProcessed = false;
    var applyAmount = recd.getFieldValue('total');
    var refnum = recd.getFieldValue('tranid');


    // set up headers
    var headers = coupaObj.coupaHeaders;
    // set up URL
    var baseurl = coupaObj.coupaURL + "/api/";


    nlapiLogExecution(
        'AUDIT', 'Processing vendor payment', 'Vendor = ' + supplierName +
        ' Vendor Payment ID = ' + tranid +
        ' Check # = ' + paymentNum +
        ' Coupa Invoice num = ' + refnum +
        ' Payment Amount = ' + applyAmount +
        ' Payment Date = ' + headerPaymentdate);
    //CALLING COUPA
    var coupaInvoiceId = getCoupaInvoiceId(
        refnum,
        supplier,
        tranid,
        applyAmount,
        headerPaymentdate,
        paymentNum,
        coupaObj);

    nlapiLogExecution('DEBUG', 'coupaInvoiceId response', coupaInvoiceId);
    if (coupaInvoiceId == 'INVOICE_PAID') {
        nlapiLogExecution('AUDIT', 'Invoice already paid',
            'Invoice Number = ' + refnum +
            ' supplierName = ' + supplierName +
            ' supplierNumber = ' + supplier);
    }else if (coupaInvoiceId == 'INVALID_COUPAID') {
        nlapiLogExecution('ERROR', 'Processing Error with posting payment - could find not Invoice in Coupa', 'Invoice Number = ' + refnum + ' supplierName = ' + supplierName +
            ' supplierNumber = ' + supplier +
            ' check# = ' + tranid +
            ' amount paid = ' + applyAmount);

        /*nlapiSendEmail(106223954, 
                nlapiGetContext().getSetting('SCRIPT', 'custscript_pay_emailaddr_notifications'),
                nlapiGetContext().getSetting('SCRIPT', 'custscript_pay_acccountname') + ' Invoice Payment Integration:Processing Error with posting payment - could find not Invoice in Coupa', 
                'Invoice Number = ' + recd.getLineItemValue('apply','refnum',i) + 
                ' supplierName = ' + supplierName + 
                ' supplierNumber = ' + supplier +
                ' check# = ' + tranid + 
                ' amount paid = '+ recd.getLineItemValue('apply','total',i));*/

        Message = 'Invoice Payment Integration:Processing Error with posting payment - could find not Invoice in Coupa' + '\n' +
            'Invoice Number = ' + refnum + '\n' +
            ' supplierName = ' + supplierName + '\n' +
            ' supplierNumber = ' + supplier + '\n' +
            ' check# = ' + tranid + '\n' +
            ' amount paid = ' + applyAmount + '\n\n';
    } else if (coupaInvoiceId == 'INVOICE_VOIDED_PAYMENT') {
       Message = 'Set_Retry'
    } else {
        nlapiLogExecution('DEBUG', 'Check', 'Check 3');

        var url = baseurl + 'invoices/' + coupaInvoiceId;
        var paymentDate = netsuitedatetoCoupadate(headerPaymentdate);

        var postData = "<?xml version='1.0' encoding='UTF-8'?>" +
            "<invoice-header>" +
            //  "<payment-date type='datetime'>" + headerPaymentdate + "</payment-date>" +
            "<payments type='array'>" +
            "<payment>" +
            "<amount-paid type='decimal' nil='true'>" + applyAmount + "</amount-paid>" +
            "<payment-date type='datetime' nil='true'>" + paymentDate + "</payment-date>" +
            "<notes>" + paymentNum + "</notes>" +
            "</payment>" +
            "</payments>" +
            "</invoice-header>";

        nlapiLogExecution('DEBUG', 'POST DATA', postData);

        var response = nlapiRequestURL(url, postData, headers, 'PUT');
        if (response.getCode() != '200') {

            nlapiLogExecution('ERROR', 'Processing Error with posting payment ', 'Invoice Number = ' + refnum +
                ' supplierName = ' + supplierName +
                ' check# = ' + tranid +
                ' amount paid = ' + applyAmount +
                ' HTTP Response Code = ' + response.getCode());

            Message = 'Invoice Payment Integration:Processing Error with posting payment' + '\n' +
                'Invoice Number = ' + refnum + '\n' +
                ' supplierName = ' + supplierName + '\n' +
                ' supplierNumber = ' + supplier + '\n' +
                ' check# = ' + tranid + '\n' +
                ' amount paid = ' + applyAmount + '\n' +
                ' HTTP Response Code = ' + response.getCode() + '\n\n';
        } else {
            nlapiLogExecution('AUDIT', 'Payment successful', 'Supplier = ' + supplierName +
                ' Check# = ' + tranid +
                ' Amount paid = ' + applyAmount +
                ' Invoice number = ' + refnum +
                ' Payment date = ' + paymentDate);

            var responseXML = nlapiStringToXML(response.getBody());
            checkPaidFlag(responseXML, coupaInvoiceId, paymentDate, coupaObj);
            SetToProcessed = true;
        } //response if else
    } //if statement end
    return Message;
}


function checkPaidFlag(responseBody, coupaInvoiceId, headerPaymentdate, coupaObj) {
    var totalpaid = 0;
    var totalinvoiceamount = 0;
    var isPaid = 'false';
    isPaid = nlapiSelectValue(responseBody, 'invoice-headers/invoice-header/paid');
    nlapiLogExecution('DEBUG','check paid Flag. Check current state',isPaid);
    var PaymentsNode = nlapiSelectNode(responseBody, 'invoice-header/payments');
    var paymentnode = new Array();
    paymentnode = nlapiSelectNodes(PaymentsNode, 'payment');


    for (var i = 0; i < paymentnode.length; i++) {
        if (nlapiSelectValue(paymentnode[i], 'amount-paid'))
            totalpaid = totalpaid + parseFloat(nlapiSelectValue(paymentnode[i], 'amount-paid'));

    }
    //nlapiLogExecution('DEBUG', 'From payment put response Total Paid =', totalpaid);

    // Get header chargers
    var headerCharge = parseFloat(nlapiSelectValue(responseBody, 'invoice-header/shipping-amount')) +
        parseFloat(nlapiSelectValue(responseBody, 'invoice-header/handling-amount')) +
        parseFloat(nlapiSelectValue(responseBody, 'invoice-header/misc-amount'));

    if (nlapiSelectValue(responseBody, 'invoice-header/line-level-taxation') == 'false')
        headerCharge = headerCharge + parseFloat(nlapiSelectValue(responseBody, 'invoice-header/tax-amount'));

    var InvoiceNode = nlapiSelectNode(responseBody, 'invoice-header/invoice-lines');
    var InvoiceLinenode = new Array();
    InvoiceLinenode = nlapiSelectNodes(InvoiceNode, 'invoice-line');
    for (var i = 0; i < InvoiceLinenode.length; i++) {
        totalinvoiceamount = totalinvoiceamount + parseFloat(nlapiSelectValue(InvoiceLinenode[i], 'total'));
        if ((nlapiSelectValue(InvoiceLinenode[i], 'tax-amount')) &&
            (nlapiSelectValue(responseBody, 'invoice-header/line-level-taxation') == 'true'))
            totalinvoiceamount = totalinvoiceamount + parseFloat(nlapiSelectValue(InvoiceLinenode[i], 'tax-amount'));
    }

    totalinvoiceamount = totalinvoiceamount + headerCharge;
    //nlapiLogExecution('DEBUG', 'From payment put response Total Coupa Invoice Amount =', totalinvoiceamount);

    if (totalinvoiceamount && totalpaid) {
        if (totalinvoiceamount <= totalpaid) {
            nlapiLogExecution('DEBUG', 'Setting PAID Flag', 'Invoice Amount = ' + totalinvoiceamount + ' Paid Amount = ' + totalpaid + ' CoupaInvoiceId = ' + coupaInvoiceId);
            setCoupaPaymentFlag(coupaInvoiceId, headerPaymentdate, true);
        } else if(totalinvoiceamount > totalpaid&&isPaid===true){
            nlapiLogExecution('DEBUG', 'Setting PAID Flag to false', 'Invoice Amount = ' + totalinvoiceamount + ' Paid Amount = ' + totalpaid + ' CoupaInvoiceId = ' + coupaInvoiceId);
            setCoupaPaymentFlag(coupaInvoiceId, headerPaymentdate, false, coupaObj);
        }
    } else
        nlapiLogExecution('DEBUG', 'Not Setting PAID Flag', 'Invoice Amount = ' + totalinvoiceamount + ' Paid Amount = ' + totalpaid + ' CoupaInvoiceId = ' + coupaInvoiceId);
}


function setCoupaPaymentFlag(coupaInvoiceId, headerPaymentdate, value, coupaObj) {
    var url = coupaObj.coupaURL + '/api/invoices/' + coupaInvoiceId;
    var headers = coupaObj.coupaHeaders;

    var postData = "<?xml version='1.0' encoding='UTF-8'?>" +
        "<invoice-header>" +
        "<payment-date type='datetime'>" + headerPaymentdate + "</payment-date>" +
        "<paid type='boolean'>"+value+"</paid>" +
        "</invoice-header>";

    var response = nlapiRequestURL(url, postData, headers, 'PUT');
    if (response.getCode() != '200') {
        nlapiLogExecution('ERROR', 'Error setting the Paid Flag ', 'Coupa Invoice Id = ' + coupaInvoiceId);
    } else
        nlapiLogExecution('AUDIT', 'Successfully set the Paid Flag ', 'Coupa Invoice Id = ' + coupaInvoiceId);
}

function getCoupaInvoiceId(invoicenum, suppliernumber, tranid, topayamount, topaydate,paymentNum, coupaObj) {
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

    var isPaid = 'false';
    isPaid = nlapiSelectValue(responseXML, 'invoice-headers/invoice-header/paid');
    nlapiLogExecution('DEBUG','coupa Invoide Header info',nlapiXMLToString(responseXML));
            if (isPaid == 'true') {
                nlapiLogExecution('DEBUG', 'Invoice already paid', ' Invoice Number = ' + invoicenum + ' supplier = ' + suppliernumber+' Check if it is voided');
                var voidedPaymentArr = checkIfPaymentIsVoidedInNS(responseXML);
                if(voidedPaymentArr){                   
                    return 'INVOICE_VOIDED_PAYMENT';

                }else{
                    nlapiLogExecution('DEBUG','Not found voided payment')
                    return 'INVOICE_PAID';
                }
            }
    nlapiLogExecution('DEBUG', 'Coupa Invoice Id', coupaInvoiceId);
    return coupaInvoiceId;
}


function unapplyVoidedPaymentInCoupa(responseXML,headers,coupaInvoiceId,encoded_invoicenum,voidedPaymentArr){
    var baseurl = nlapiGetContext().getSetting('SCRIPT', 'custscript_payment_url') + "/api/";
        nlapiLogExecution('AUDIT', 'Processing vendor payment void',JSON.stringify(voidedPaymentArr));
        var url = baseurl + 'invoices/' + coupaInvoiceId;
        if(voidedPaymentArr&&voidedPaymentArr.length>0){
            voidedPaymentArr.forEach(function(voidedPayment){
                var filters = new Array();
                var columns = new Array();
                var voidedDate;
                var url = baseurl + 'invoices/' + coupaInvoiceId;
    /*
                columns.push(new nlobjSearchColumn('trandate'));
                filters.push(new nlobjSearchFilter('createdfrom', null, 'anyof', [voidedPayment.paymentId]));

                nlapiLogExecution('DEBUG','runing search');
                var goodSearch = nlapiLoadSearch('transaction','customsearch35810');
                nlapiLogExecution('DEBUG','good search params',JSON.stringify(goodSearch.getFilterExpression()));
                var search = nlapiCreateSearch('transaction',filters, columns);
                nlapiLogExecution('DEBUG','bad search params',JSON.stringify(search.getFilterExpression()));
                var searchresults       = search.runSearch();
                var resultSlice         = searchresults.getResults(0, 1000);
                nlapiLogExecution('DEBUG','runing search2')
                if(resultSlice&&resultSlice.length>0){
                    voidedDate = resultSlice[0].getValue('trandate', null, null);
                    nlapiLogExecution('DEBUG','trandate is ',voidedDate);
                };*/
                
                var voidedAmount = nlapiLookupField('transaction',voidedPayment.paymentId,'total');            
                var voidedDate = nlapiLookupField('transaction',voidedPayment.paymentId,'trandate');            
                nlapiLogExecution('DEBUG','voidedAmount is ',voidedAmount);
                nlapiLogExecution('DEBUG','paymentDate is ',voidedDate);

                var paymentDate = netsuitedatetoCoupadate(voidedDate);
                var postData = "<?xml version='1.0' encoding='UTF-8'?>" +
                    "<invoice-header>" +
                    //  "<payment-date type='datetime'>" + headerPaymentdate + "</payment-date>" +
                    "<payments type='array'>" +
                    "<payment>" +
                    "<amount-paid type='decimal' nil='true'>" + voidedAmount + "</amount-paid>" +
                    "<payment-date type='datetime' nil='true'>" + paymentDate + "</payment-date>" +
                    "<notes>" + voidedPayment.paymentNumer+" Void" + "</notes>" +
                    "</payment>" +
                    "</payments>" +
                    "</invoice-header>";
                    nlapiLogExecution('DEBUG','POST DATA',postData);
                var response = nlapiRequestURL(url, postData, headers, 'PUT');
                if (response.getCode() != '200') {
                    nlapiLogExecution('ERROR', 'Processing Error with posting void payment ', 'Invoice Number = ' + coupaInvoiceId +
                        ' amount paid = ' + voidedAmount +
                        ' HTTP Response Code = ' + response.getCode());

                    Message = 'Invoice Payment Integration:Processing Error with posting void payment' + '\n' +
                        'Invoice Number = ' + coupaInvoiceId + '\n' +
                        ' amount paid = ' + voidedAmount + '\n' +
                        ' HTTP Response Code = ' + response.getCode() + '\n\n';
                } else {
                    nlapiSubmitField('vendorpayment', voidedPayment.paymentId, 'custbodyr7_processed_to_coupa', 4);
                    nlapiLogExecution('AUDIT', 'void Payment successful',
                        'Invoice Number = ' + coupaInvoiceId +
                        ' Amount paid = ' + voidedAmount +
                        ' Payment date = ' + paymentDate);
                } //response if else
            });
        return true;
    }else{ 
        return false;
    }
}
        

function checkIfPaymentIsVoidedInNS(responseXML){
    var paymentNode  = nlapiSelectNode(responseXML, 'invoice-headers/invoice-header/payments');
    var paymentnode = new Array();
    paymentnode = nlapiSelectNodes(paymentNode, 'payment');

    if (paymentnode.length === 0) {
        nlapiLogExecution('audit', 'No Payments', 'There are no payments associated with this invoice');
        return;
    }

    var NSPaymentNum = []
    paymentnode.forEach(function(payment){
        NSPaymentNum.push(nlapiSelectValue(payment, 'notes'))
    }); 
    var NSBillNum    = nlapiSelectValue(responseXML, 'invoice-headers/invoice-header/invoice-number');
    var filters = new Array();
    var columns = new Array();
    nlapiLogExecution('DEBUG','searching for bill ',NSBillNum);
    nlapiLogExecution('DEBUG','searching for payment ',NSPaymentNum);

    columns.push(new nlobjSearchColumn('internalid', null, 'GROUP'));
    columns.push(new nlobjSearchColumn('type', null, 'GROUP'));
    columns.push(new nlobjSearchColumn('number', 'applyingTransaction', 'GROUP'));
    columns.push(new nlobjSearchColumn('internalid', 'applyingTransaction', 'GROUP'));
    columns.push(new nlobjSearchColumn('trandate', 'applyingTransaction', 'GROUP'));

    filters.push(new nlobjSearchFilter('status', null, 'is', 'VendBill:B')); //Bill:Paid In Full
    filters.push(new nlobjSearchFilter('custbodyr7_processed_to_coupa', 'applyingTransaction', 'anyof', [1])); //not success or void sync
    filters.push(new nlobjSearchFilter('mainline', null, 'is', true)); //mainline
    filters.push(new nlobjSearchFilter('tranid', null, 'is', NSBillNum));
    filters.push(new nlobjSearchFilter('tranid', 'applyingTransaction', 'is', NSPaymentNum));
    filters.push(new nlobjSearchFilter('status', 'applyingtransaction', 'anyof', ['VendPymt:V']));
    filters.push(new nlobjSearchFilter('type', 'applyingtransaction',   'anyof', ['VendPymt']));
    nlapiLogExecution('DEBUG','run voidedPaymentRes');
    var voidedPaymentRes = nlapiSearchRecord('vendorbill', null, filters, columns);
    nlapiLogExecution('DEBUG','run voidedPaymentRes');
    var voidedPaymentArr = [];
        if (voidedPaymentRes !== null && voidedPaymentRes.length > 0) {
            nlapiLogExecution('DEBUG','The payment is voided but not in sync','skip it for now, untill it is synced');
            nlapiLogExecution('DEBUG','found '+voidedPaymentRes.length+' results',voidedPaymentRes[0].getValue('internalid', 'applyingTransaction', 'GROUP'));
            voidedPaymentRes.forEach(function(result){
                voidedPaymentArr.push({
                    paymentNumer:result.getValue('number', 'applyingTransaction', 'GROUP'),
                    paymentId   :result.getValue('internalid', 'applyingTransaction', 'GROUP'),
                })
            })
            return voidedPaymentArr;
        }else {
            nlapiLogExecution('DEBUG','did not found voided bill payment ',NSPaymentNum)
            return false;
    }
}

function getCoupaSupplierName(netsuiteid) {
    var supplier = nlapiLoadRecord('vendor', netsuiteid);
    return supplier.getFieldValue('companyname');
}

function isValidCoupaSupplierid(netsuiteid) {
    var supplier = nlapiLoadRecord('vendor', netsuiteid);
    externalid = supplier.getFieldValue('externalid');
    if (externalid && externalid.split("-")) {
        var coupaid = externalid.split("-");
        if (coupaid[0] == "Coupa" && coupaid[1]) {
            return coupaid[1];
        } else return 0;
    } else return 0;
}

function netsuitedatetoCoupadate(netsuitedate) {
    var datesplit = netsuitedate.split("/");
    return datesplit[2] + "-" + datesplit[0] + "-" + datesplit[1] + "T00:00:00-08:00";
}

function ConvertCoupaDateToNetSuiteDate(CoupaDate) {
    var nDate = CoupaDate.split('T');
    //nlapiLogExecution('DEBUG', 'date', nDate);

    var datesplit = nDate[0].split('-');

    var Nyear = datesplit[0];
    //nlapiLogExecution('DEBUG', 'year', Nyear);

    var Nday;
    //remove leading zero
    if (datesplit[2].charAt(0) == '0')
        Nday = datesplit[2].slice(1);
    else
        Nday = datesplit[2];


    //nlapiLogExecution('DEBUG', 'day', Nday);
    //remove leading zero
    var Nmonth;
    if (datesplit[1].charAt(0) == '0')
        Nmonth = datesplit[1].slice(1);
    else
        Nmonth = datesplit[1];
    //nlapiLogExecution('DEBUG', 'month', Nmonth);

    var netDate = Nmonth + '/' + Nday + '/' + Nyear;
    //nlapiLogExecution('DEBUG', 'netDate', netDate);
    return netDate;
}


function xmlEncode(string) {
    return string.replace(/\&/g, '&' + 'amp;').replace(/</g, '&' + 'lt;').replace(/>/g, '&' + 'gt;').replace(/\'/g, '&' + 'apos;').replace(/\"/g, '&' + 'quot;');
}

function CallAnotherScript(paramvalues, initialNbr, maxNbr, InvPayMaxRecords) {
    var params = new Array();
    params['custscript_frompaydate'] = paramvalues[0];
    params['custscript_topaydate'] = paramvalues[1];
    params['custscript_pay_fromrecords'] = paramvalues[2];
    params['custscript_pay_torecords'] = paramvalues[3];

    params['custscript_pay_fromrecords'] = parseInt(initialNbr);

    if (parseInt(parseInt(maxNbr) + parseInt(maxNbr)) > InvPayMaxRecords) {
        params['custscript_pay_torecords'] = InvPayMaxRecords;
    } else {
        params['custscript_pay_torecords'] = parseInt(parseInt(maxNbr) + parseInt(maxNbr));
    }

    nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), params);

}

function sendErrorEmail(Message) {

    nlapiSendEmail(106223954, nlapiGetContext().getSetting('SCRIPT', 'custscript_pay_emailaddr_notifications'), nlapiGetContext().getSetting('SCRIPT', 'custscript_pay_acccountname') + ' Invoice Payment Integration:Processing Error with posting payment', Message);

}
