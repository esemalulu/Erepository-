/**
 * Module Description
 * This scheduled script pulls OK to Pay invoices from Coupa into Netsuite
 *
 * Version    Date            Author           Remarks
 * 1.00       20 Nov 2012     rohitjalisatgi
 *
 */
/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
var NS_MAX_SEARCH_RESULT = 1000;
var HEADER_DEPARTMENT = 26;
var DEFAULT_LOCATION = '';
var BURNABY_LOCATION = 7;
var DELAWARE_LOCATION = 4;
var USA_LOCATION = 9;
var TAX_CODE = 16; // Tax code on itemLevel. Default to GST only
var DEFAULT_TAX_ITEM_ID = 5110;
var NS_UNITS;
var environment = '';
function scheduled(type){
    environment = nlapiGetContext().getEnvironment();
    
    var context = nlapiGetContext();
    if (environment == 'PRODUCTION') {
        var param_url = context.getSetting('SCRIPT', 'custscript_url');
        var param_APIKey = context.getSetting('SCRIPT', 'custscript_apikey');
        
    } else if (environment == 'SANDBOX' || environment == 'BETA') {
        var param_url = 'https://dwavesys-test.coupahost.com';
        var param_APIKey = 'ee30916f0c3e0baf8fce4c1eba6bfa0c2800aaf4';
        
        
    }
    var invoiceFromdate;
    var invoiceTodate = context.getSetting('SCRIPT', 'custscript_toinvdate');
    //var url = param_url;
    var url = param_url + '/api/invoices?exported=false&status=approved';
    
    if (context.getSetting('SCRIPT', 'custscript_use_updatedat_date') == 'T') {
    
        if (context.getSetting('SCRIPT', 'custscript_frominvdate')) {
            nlapiLogExecution('debug', 'date', context.getSetting('SCRIPT', 'custscript_frominvdate'))
            url = url + '&created-at[gt_or_eq]=' + netsuitedatetoCoupadate(context.getSetting('SCRIPT', 'custscript_frominvdate'));
            nlapiLogExecution('debug', 'date', netsuitedatetoCoupadate(context.getSetting('SCRIPT', 'custscript_frominvdate')))
            
        }
        
        if (context.getSetting('SCRIPT', 'custscript_toinvdate')) {
            url = url + '&created-at[lt_or_eq]=' + netsuitedatetoCoupadate(context.getSetting('SCRIPT', 'custscript_toinvdate'));
        }
    } else if (context.getSetting('SCRIPT', 'custscript_get_specific_id_from_coupa')) {
        url = param_url + '/api/invoices?id=' + context.getSetting('SCRIPT', 'custscript_get_specific_id_from_coupa');
    } else {
    
        var todayDate = new Date();
        var onWeekDate = new Date(new Date().getTime() - 24 * 60 * 60 * 7000);
        url = url + '&created-at[gt_or_eq]=' + onWeekDate.toISOString();
        url = url + '&created-at[lt_or_eq]=' + todayDate.toISOString();
        
    }
    
    if (context.getSetting('SCRIPT', 'custscript_limit')) 
        url = url + '&limit=' + context.getSetting('SCRIPT', 'custscript_limit');
    
    
    
    var headers = new Array();
    headers['Accept'] = 'text/xml';
    headers['X-COUPA-API-KEY'] = param_APIKey;
    
    var response = nlapiRequestURL(url, null, headers);
    nlapiLogExecution('debug', 'url is ', url + ' , ' + param_APIKey + ' , ' + response.getCode() + response.getBody())
    if (response.getCode() == '200') {
        nlapiLogExecution('debug', 'test', 'Inside and get sucess');
        var responseXML = nlapiStringToXML(response.getBody());
        
        var invoiceNode = nlapiSelectNode(responseXML, 'invoice-headers');
        var invoiceHeaderNodes = new Array();
        
        
        invoiceHeaderNodes = nlapiSelectNodes(invoiceNode, 'invoice-header');
        
        
        nlapiLogExecution('AUDIT', 'Processing ' + invoiceHeaderNodes.length + ' OK to Pay Invoices');
        for (var i = 0; i < invoiceHeaderNodes.length; i++) {
        
            var tranid = nlapiSelectValue(invoiceHeaderNodes[i], 'invoice-number');
            var externalid = nlapiSelectValue(invoiceHeaderNodes[i], 'id');
            var entityid = nlapiSelectValue(invoiceHeaderNodes[i], 'supplier/number');
            nlapiLogExecution('debug', 'entity id ', entityid);
            nlapiLogExecution('AUDIT', 'Processing Coupa Invoice', 'Invoice Number = ' + tranid +
            ' Vendor = ' +
            nlapiSelectValue(invoiceHeaderNodes[i], 'supplier/number') +
            ' Coupa Invoice Id = ' +
            externalid);
            
            var invoiceexists = 'false';
            
            invoiceexists = vendorBillExists(tranid, externalid, entityid);
            
            if (invoiceexists == 'false') {
                try {
                    CreateVendorBillorVendorCredit(invoiceHeaderNodes[i]);
                    
                } catch (e) {
                    nlapiLogExecution('AUDIT', 'Cannot create Vendor Bill ', 'Invoice Number = ' + tranid +
                    ' Vendor = ' +
                    nlapiSelectValue(invoiceHeaderNodes[i], 'supplier/name') +
                    ' Coupa Invoice Id = ' +
                    externalid +
                    ' Netsuite Vendor Bill id = ' +
                    invoiceexists +
                    '. Error Discription :' +
                    e.toString());
                    if (environment == 'PRODUCTION') {
                    
                        /*nlapiSendEmail(1287, 1287, ' Invoice Integration:Processing Error - Cannot create Vendor Bill Number = ' + tranid +
                         ' Vendor = ' +
                         nlapiSelectValue(invoiceHeaderNodes[i], 'supplier/name') +
                         ' Netsuite Vendor Bill id = ' +
                         invoiceexists, '');*/
                        nlapiSendEmail(1287, 1287, ' Invoice Integration:Processing Error - Unable to create vendor bill', 'Invoice Number = ' + nlapiSelectValue(invoiceHeaderNodes[i], 'invoice-number') +
                        ' Supplier Name = ' +
                        nlapiSelectValue(invoiceHeaderNodes[i], 'name') +
                        ' Error Description = ' +
                        e.message);
                    }
                    
                }
                
                
            }
            
        }
        
    } // end of approved invoices
}


function CreateVendorBillorVendorCredit(invoice){
    nlapiLogExecution('debug', 'creating', '')
    var bill = false;
    var credit = false;
    var invoiceLine = nlapiSelectNode(invoice, 'invoice-lines');
    var invoiceLineNodes = new Array();
    var invoicetotal = 0;
    invoiceLineNodes = nlapiSelectNodes(invoiceLine, 'invoice-line');
    var creditMemoOption = 1;
    
    for (var x = 0; x < invoiceLineNodes.length; x++) {
        invoicetotal = invoicetotal + parseFloat(nlapiSelectValue(invoiceLineNodes[x], 'total'));
        
        if (parseFloat(nlapiSelectValue(invoiceLineNodes[x], 'total')) < 0) {
            credit = true;
        } else {
            bill = true;
        }
    }
    NS_UNITS = getNSUnits();
    creditMemoOption = nlapiGetContext().getSetting('SCRIPT', 'custscript_creditmemooption');
    nlapiLogExecution('debug', 'creditMemoOption , credit, bill', creditMemoOption + ' ,' + credit + ' , ' + bill)
    if (creditMemoOption == 1) {
        if (bill == true) 
            CreateVendorBill(invoice);
        
        if (credit == true) 
            CreateVendorCredit(invoice);
    } else if (creditMemoOption == 2) {
        if (invoicetotal >= 0) {
            //nlapiLogExecution('DEBUG', 'creating vendor bill ', 'amount = ' + invoicetotal );
            CreateVendorBill(invoice);
        } else {
            //nlapiLogExecution('DEBUG', 'creating vendor credit ', 'amount = '+ invoicetotal );
            CreateVendorCredit(invoice);
        }
    }
}

function CreateVendorCredit(invoice){
    var record = nlapiCreateRecord('vendorcredit');
    
    record.setFieldValue('externalid', 'Coupa-VendorCredit-' + nlapiSelectValue(invoice, 'id'));
    
    record.setFieldValue('trandate', ConvertCoupaDateToNetSuiteDate(nlapiSelectValue(invoice, 'invoice-date')));
    
    var supplierNode = nlapiSelectNode(invoice, 'supplier');
    
    
    // if (nlapiSelectValue(supplierNode, 'number')) 
    //  record.setFieldValue('entity', nlapiSelectValue(supplierNode, 'number'));
    //else 
    // try setting supplier name instead on id
    record.setFieldText('entity', nlapiSelectValue(supplierNode, 'name'));
    
    
    
    record.setFieldValue('tranid', nlapiSelectValue(invoice, 'invoice-number'));
    
    var invoiceLine = nlapiSelectNode(invoice, 'invoice-lines');
    var invoiceLineNodes = new Array();
    invoiceLineNodes = nlapiSelectNodes(invoiceLine, 'invoice-line');
    
    
    for (var x = 0; x < invoiceLineNodes.length; x++) {
    
        var accountNode = nlapiSelectNode(invoiceLineNodes[x], 'account');
        if (parseFloat(nlapiSelectValue(invoiceLineNodes[x], 'total')) < 0) {
            record.selectNewLineItem('expense');
            
            record.setCurrentLineItemValue('expense', 'memo', nlapiSelectValue(invoiceLineNodes[x], 'description'));
            record.setCurrentLineItemValue('expense', 'amount', Math.abs(nlapiSelectValue(invoiceLineNodes[x], 'total')));
            record.commitLineItem('expense');
            
        } // end of If loop for negative amounts
    }// end of for loop for looping through invoice lines
    try {
        nlapiSubmitRecord(record, true);
    } catch (e) {
        nlapiLogExecution('ERROR', 'Processing Error - Unable to create vendor Credit', ' Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number') +
        ' Supplier Name = ' +
        nlapiSelectValue(supplierNode, 'name') +
        ' Error Description = ' +
        e.message);
        nlapiSendEmail(1349, nlapiGetContext().getSetting('SCRIPT', 'custscript_emailaddr_notifications'), nlapiGetContext().getSetting('SCRIPT', 'custscript_acccountname') + ' Invoice Integration:Processing Error - Unable to create vendor credit', 'Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number') +
        ' Supplier Name = ' +
        nlapiSelectValue(supplierNode, 'name') +
        ' Error Description = ' +
        e.message);
        return;
    }
    
    nlapiLogExecution('AUDIT', 'Successfully created vendor Credit', ' Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number') +
    ' Supplier Name = ' +
    nlapiSelectValue(supplierNode, 'name'));
    //Setexportedtotrue(nlapiSelectValue(invoice, 'id'));
}


function CreateVendorBill(invoice){
    var invoiceLine = nlapiSelectNode(invoice, 'invoice-lines');
    var invoiceLineNodes = new Array();
    var invoicetotal = 0;
    invoiceLineNodes = nlapiSelectNodes(invoiceLine, 'invoice-line');
    var supplierNode = nlapiSelectNode(invoice, 'supplier');
    var record = '';
    nlapiLogExecution('debug', 'creating Vendor Bill', 'creating vendor bill');
    nlapiLogExecution('debug', 'Supplier ID ' + nlapiSelectValue(supplierNode, 'number'), 'Supplier Name ' + nlapiSelectValue(supplierNode, 'name'));
    if (nlapiSelectValue(supplierNode, 'number')) {
        record = nlapiCreateRecord('vendorbill', {
            entity: nlapiSelectValue(supplierNode, 'number')
        });
    } else {
        record = nlapiCreateRecord('vendorbill');
        record.setFieldText('entity', nlapiSelectValue(supplierNode, 'name'));
    }
    
    var lineleveltaxation = 'false';
    
    lineleveltaxation = nlapiSelectValue(invoice, 'line-level-taxation');
    
    record.setFieldText('approvalstatus', 'Approved');
    if (environment == 'PRODUCTION') 
        record.setFieldValue('externalid', 'Coupa-VendorBill' + nlapiSelectValue(invoice, 'id'));
    
    record.setFieldValue('trandate', ConvertCoupaDateToNetSuiteDate(nlapiSelectValue(invoice, 'invoice-date')));
    
    
    var primiarySupplierSubsidary = nlapiSelectValue(supplierNode, 'primary-subsidiary');
    //nlapiLogExecution('DEBUG', 'SupplierName', nlapiSelectValue(supplierNode, 'name'));
    
    
    // try setting supplier name instead on id
    nlapiLogExecution('debug', 'Vendor Internal ID', record.getFieldValue('entity'));
    var vendorInternalID = record.getFieldValue('entity');
    //By default subsidary = Canada
    var nsVendorSubsidiaryInternalId = 2;
    if (vendorInternalID) 
        nsVendorSubsidiaryInternalId = nlapiLookupField('vendor', vendorInternalID, 'subsidiary');
    else 
        throw 'Error Incorrect Vednor, Please check if the vendor exist in NS'
    
    // VB On create Subsidary field = nlsub
    record.setFieldValue('nlsub', nsVendorSubsidiaryInternalId);
    record.setFieldValue('subsidiary', nsVendorSubsidiaryInternalId);
    nlapiLogExecution('debug', 'Supplier Sub' + record.getFieldValue('nlsub'), record.getFieldValue('subsidiary') + ' Primiary from Coupa ' + primiarySupplierSubsidary)
    
    //This object will be used to populate spefic fields on expense or item sublist.
    var populateObject = {};
    populateObject.populateLineItemProject = true; // This flag if True: Populate the project on the line item/expense
    populateObject.populateLineExpeneTax = true; // This flag if True: Populate the tax on line level.
    // If false : Dont populate the project on the line item/expense
    /** 
     * If Sub = D-Wave Systems (Delaware)=2
     - 	Location = D-Wave Systems (Delaware)
     - 	Dont populate project ( Customer column on the VB).
     -  No tax code
     - If Sub = D-Wave Systems (USA)= 4
     - 	Location = D-Wave Systems (USA)
     - 	Dont populate project ( Customer column on the VB).
     -  No tax code
     - Else
     - BURNABY_LOCATION
     */
    if (nsVendorSubsidiaryInternalId == 2) {
        DEFAULT_LOCATION = DELAWARE_LOCATION;
        populateObject.populateLineItemProject = false;
        populateObject.populateLineExpeneTax = false;
    } else if (nsVendorSubsidiaryInternalId == 4) {
        DEFAULT_LOCATION = USA_LOCATION;
        populateObject.populateLineItemProject = false;
        populateObject.populateLineExpeneTax = false;
        
    } else {
        DEFAULT_LOCATION = BURNABY_LOCATION;
    }
    // set currency
    var curr = getNetsuiteCurrency(nlapiSelectValue(invoice, 'currency/code'));
    nlapiLogExecution('DEBUG', 'Currency is ', curr + ',' + nlapiSelectValue(invoice, 'currency/code'));
    
    record.setFieldValue('currency', curr);
    nlapiLogExecution('DEBUG', 'Currency SET is ', record.getFieldValue('currency'));
    
    
    var paymentTermNode = nlapiSelectNode(invoice, 'payment-term');
    //nlapiLogExecution('DEBUG', 'Payment Term', nlapiSelectValue(paymentTermNode, 'code'));
    
    var terms;
    
    if (paymentTermNode) {
        terms = getNetsuitetermid(nlapiSelectValue(paymentTermNode, 'code'));
    } else 
        terms = getNetsuitetermid('Net 30');
    
    record.setFieldValue('terms', terms);
    
    //set accounts payable account if passed as parameter to the script
    if (nlapiGetContext().getSetting('SCRIPT', 'custscript_actpayablenum')) {
        var apAccountId = getNetsuiteAccountId(nlapiGetContext().getSetting('SCRIPT', 'custscript_actpayablenum'));
        
        if (apAccountId != 'INVALID_ACCOUNT') 
            record.setFieldValue('account', apAccountId);
    }
    
    
    
    record.setFieldValue('tranid', nlapiSelectValue(invoice, 'invoice-number'));
    
    var shippingamount = parseFloat(nlapiSelectValue(invoice, 'shipping-amount'));
    var handlingamount = parseFloat(nlapiSelectValue(invoice, 'handling-amount'));
    var taxamount = parseFloat(nlapiSelectValue(invoice, 'tax-amount'));
    var miscamount = parseFloat(nlapiSelectValue(invoice, 'misc-amount'));
    
    /// Set Tax
    nlapiLogExecution('debug', 'TAXESS', taxamount);
    
    /*
     nlapiLogExecution('DEBUG', 'Other Charges', 'Shipping = ' + shippingamount + ' Handling = ' + handlingamount
     + ' Taxamount = ' + taxamount + ' miscamount = ' + miscamount); */
    var totalheadercharges;
    if (lineleveltaxation == 'false') 
        totalheadercharges = parseFloat(shippingamount) + parseFloat(handlingamount) + parseFloat(taxamount) + parseFloat(miscamount);
    else 
        totalheadercharges = parseFloat(shippingamount) + parseFloat(handlingamount) + parseFloat(miscamount);
    
    var invoiceLine = nlapiSelectNode(invoice, 'invoice-lines');
    var invoiceLineNodes = new Array();
    
    invoiceLineNodes = nlapiSelectNodes(invoiceLine, 'invoice-line');
    
    // get total amount by adding the line amounts
    var totalamount = 0;
    var taxabletotalamount = 0;
    nlapiLogExecution('debug', 'TAXESS', taxamount);
    
    for (var x = 0; x < invoiceLineNodes.length; x++) {
        if (nlapiSelectValue(invoiceLineNodes[x], 'nontaxable') != 'true') 
            taxabletotalamount = parseFloat(taxabletotalamount) + parseFloat(nlapiSelectValue(invoiceLineNodes[x], 'total'));
        
        totalamount = parseFloat(totalamount) + parseFloat(nlapiSelectValue(invoiceLineNodes[x], 'total'));
    }
    
    var totalheaderamount = parseFloat(totalamount) + parseFloat(totalheadercharges);
    totalheaderamount = totalheaderamount.toFixed(3);
    var totalcalcamount = 0;
    nlapiLogExecution('debug', 'TAXESS', taxamount);
    
    //Set Image URL Field:
    var invoiceImageURL = nlapiSelectValue(invoice, 'image-scan-url');
    
    nlapiLogExecution('debug', 'URL', validateURL(invoiceImageURL.toString()));
    
    record.setFieldValue('custbody_dwave_invoice_url', validateURL(invoiceImageURL.toString()));
    nlapiLogExecution('debug', 'URL', validateURL(invoiceImageURL.toString()));
    
    //// ENd ///
    nlapiLogExecution('debug', 'Checking for period', 'start searching');
    
    
    /// Mark VB which are processed from Coupa ///
    record.setFieldValue('custbody_imported_from_coupa', 'T');
    ///// End     
    nlapiLogExecution('debug', 'Checking for period', 'start searching');
    
    ///Set Posting Period ////////////
    if (isPeriodOpen(record.getFieldValue('trandate')) == false) {
        var nextOpenPeriod = getLatestOpenedPeriod();
        nlapiLogExecution('debug', 'Next open Period', nextOpenPeriod);
        if (!isEmpty(nextOpenPeriod)) {
            record.setFieldValue('postingperiod', nextOpenPeriod);
        }
    }
    //////End of posting Period //////
    
    
    
    for (var x = 0; x < invoiceLineNodes.length; x++) {
        nlapiLogExecution('debug', 'TAXESS', x);
        
        
        
        var linetax = parseFloat(nlapiSelectValue(invoiceLineNodes[x], 'tax-amount'));
        
        if (linetax) 
            totalheaderamount = parseFloat(totalheaderamount) + parseFloat(linetax);
        
        var invoicelineamount = parseFloat(nlapiSelectValue(invoiceLineNodes[x], 'total'));
        
        var lineamount = parseFloat(nlapiSelectValue(invoiceLineNodes[x], 'total'));
        var linecharge = (parseFloat(lineamount) / parseFloat(taxabletotalamount)) * totalheadercharges;
        var adjlineamount;
        
        if (linetax) 
            adjlineamount = parseFloat(lineamount) + parseFloat(linecharge) + parseFloat(linetax);
        else {
            // customization for nontaxable
            if (nlapiSelectValue(invoiceLineNodes[x], 'nontaxable') == 'true') 
                adjlineamount = parseFloat(lineamount);
            else 
                adjlineamount = parseFloat(lineamount) + parseFloat(linecharge);
        }
        adjlineamount = adjlineamount.toFixed(2);
        
        var boolCreateItemSublist = false;
        var accountNode = nlapiSelectNode(invoiceLineNodes[x], 'account');
        if (nlapiSelectNode(invoiceLineNodes[x], 'item')) {
            var lineItemNode = nlapiSelectNode(invoiceLineNodes[x], 'item');
            var isNetSuiteItem = nlapiSelectValue(lineItemNode, 'netsuite-item');
            nlapiLogExecution('debug', 'is NS Item isNetSuiteItem', isNetSuiteItem);
            nlapiLogExecution('debug', 'is NS Item isNetSuiteItem', isNetSuiteItem.toString());
            nlapiLogExecution('debug', 'is NS Item isNetSuiteItem', lineItemNode);
            
            if (isNetSuiteItem == true || isNetSuiteItem == 'true') {
                boolCreateItemSublist = true;
            }
        }
        
        var accountSubsidiaryNumber;
        if (nlapiSelectNode(invoiceLineNodes[x], 'account')) {
            var accountNode = nlapiSelectNode(invoiceLineNodes[x], 'account')
            var departmentSeg = nlapiSelectValue(accountNode, 'segment-2');
            var departmentNumeber = departmentSeg.split(':');
            departmentNumeber = parseInt(departmentNumeber[departmentNumeber.length - 1]);
            nlapiLogExecution('debug', 'Department Number ', 'found one ' + departmentNumeber);
            var accountSubsidiary = nlapiSelectValue(accountNode, 'segment-1');
            accountSubsidiaryNumber = accountSubsidiary.split(':');
            accountSubsidiaryNumber = parseInt(accountSubsidiaryNumber[accountSubsidiaryNumber.length - 1]);
            nlapiLogExecution('debug', 'accountSubsidiaryNumber Number ', 'found one ' + accountSubsidiaryNumber);
            var glAccount = nlapiSelectValue(accountNode, 'segment-3');
            glAccountNumber = glAccount.split(':');
            glAccountNumber = parseInt(glAccountNumber[glAccountNumber.length - 1]);
            
            
        }
        if (nlapiSelectNode(invoiceLineNodes[x], 'project-code')) {
            var projectNode = nlapiSelectNode(invoiceLineNodes[x], 'project-code');
            var projectID = nlapiSelectValue(projectNode, 'external-ref-num');
            
            nlapiLogExecution('debug', 'project id', projectID);
            
        }
        
        if (!boolCreateItemSublist) {
            record.selectNewLineItem('expense');
            
            nlapiLogExecution('debug', 'is NS Item', isNetSuiteItem);
            
            nlapiLogExecution('debug', 'account # ' + glAccountNumber, '');
            var nsAccountNumber = getNetsuiteAccountId(glAccountNumber.toString());
            ///////     Should Remove - Only For Testing - aelkhashab@netsuite.com  //// 
            record.setCurrentLineItemValue('expense', 'account', nsAccountNumber);
            nlapiLogExecution('debug', 'NS account # ' + nsAccountNumber, '');
            
            record.setCurrentLineItemValue('expense', 'department', departmentNumeber);
            record.setCurrentLineItemValue('expense', 'location', DEFAULT_LOCATION);
            if (populateObject.populateLineExpeneTax) {
                record.setCurrentLineItemValue('expense', 'taxcode', TAX_CODE);
            }
            if (!isEmpty(projectID) && populateObject.populateLineItemProject) {
                record.setCurrentLineItemValue('expense', 'customer', projectID);
            }
            
            
            ///////////////////////////////           
            
            
            /* check for Coupa order line */
            if (nlapiSelectValue(invoiceLineNodes[x], 'order-header-num') && nlapiSelectValue(invoiceLineNodes[x], 'order-line-num')) {
                var poheadernum = nlapiSelectValue(invoiceLineNodes[x], 'order-header-num');
                var polinenum = nlapiSelectValue(invoiceLineNodes[x], 'order-line-num');
                record.setCurrentLineItemValue('expense', 'custcol_coupaponum', poheadernum + '-' + polinenum);
            }
            
            
            
            record.setCurrentLineItemValue('expense', 'memo', nlapiSelectValue(invoiceLineNodes[x], 'description'));
            record.setCurrentLineItemValue('expense', 'isbillable', 'T');
            nlapiLogExecution('debug', 'is NS Item', isNetSuiteItem);
            
            if (x == 0) 
                totalcalcamount = parseFloat(adjlineamount);
            else 
                totalcalcamount = parseFloat(totalcalcamount) + parseFloat(adjlineamount);
            
            
            //	nlapiLogExecution('DEBUG', 'Invoice Line details ', 'Line ' + x + ' adjlineamount = ' + adjlineamount);
            
            if (x == invoiceLineNodes.length - 1) {
                var roundingerror = totalheaderamount - totalcalcamount;
                /*nlapiLogExecution('DEBUG', 'Rounding Error Details ', 'RoundingError = ' + roundingerror + 
                 ' totalheaderamount = ' + totalheaderamount + ' totalcalcamount = ' + totalcalcamount); */
                if (roundingerror) {
                    roundingerror = Math.round(parseFloat(roundingerror) * 100) / 100;
                    adjlineamount = parseFloat(adjlineamount) + roundingerror;
                }
            }
            nlapiLogExecution('debug', 'is NS Item', isNetSuiteItem);
            var expenseAmount = nlapiSelectValue(invoiceLineNodes[x], 'total');
            record.setCurrentLineItemValue('expense', 'amount', parseFloat(expenseAmount));
            record.commitLineItem('expense');
        } else if (invoiceLineNodes != '' && invoiceLineNodes != null && boolCreateItemSublist == true) {
            nlapiLogExecution('debug', 'creating item in items sublist', '');
            ///////     Added Ayman Elkhashab - aelkhashab@netsuite.com  - The function will create item sublist based on D-wave Requirments//// 
            if (nlapiSelectNode(invoiceLineNodes[x], 'uom')) {
                var uomNode = nlapiSelectNode(invoiceLineNodes[x], 'uom');
                nlapiLogExecution('debug', 'Found Uom', uomNode);
                
            }
            if (nlapiSelectNode(invoiceLineNodes[x], 'item')) {
                var lineItemNode = nlapiSelectNode(invoiceLineNodes[x], 'item');
                var itemNumber = nlapiSelectValue(lineItemNode, 'item-number');
                var itemUnit = nlapiSelectValue(uomNode, 'name');
                nlapiLogExecution('debug', 'search for UOM in NS', itemUnit);
                var NSUnit = getNSUnit(itemUnit);
                nlapiLogExecution('debug', '# of lines ', 'found one ' + lineItemNode + ' , ' + itemNumber + ',' + itemUnit + ',' + NSUnit);
                //invoiceHeaderNodes = nlapiSelectNodes(invoiceLineNodes[i], 'invoice-header');            
                //  Where  invoiceLineNodes = nlapiSelectNodes(invoiceLine, 'invoice-line');
                record = createItemsSublist(record, itemNumber, nlapiSelectValue(invoiceLineNodes[x], 'quantity'), nlapiSelectValue(invoiceLineNodes[x], 'price'), departmentNumeber, projectID, NSUnit, populateObject);
                
            }
            
            
            
        }
    } // end of main for loop that goes through each invoice line -554
    nlapiLogExecution('debug', '# of lines ', invoiceLineNodes.length);
    
    
    ////// Combination Check
    if (!isEmpty(accountSubsidiaryNumber) && !isEmpty(record.getFieldValue('entity'))) {
        //var nsVendorSubsidiaryInternalId = nlapiLookupField('vendor', record.getFieldValue('entity'), 'subsidiary');
        if (nsVendorSubsidiaryInternalId != accountSubsidiaryNumber) {
            record.setFieldValue('custbody_vendor_sub_incorrect', 'T');
        }
        nlapiLogExecution('debug', 'NS Vendor Sub Found', nsVendorSubsidiaryInternalId);
    }
    nlapiLogExecution('debug', 'PCCARD', nlapiSelectValue(invoice, 'pcard'));
    if (nlapiSelectValue(invoice, 'pcard') == true || nlapiSelectValue(invoice, 'pcard') == 'true') {
        nlapiLogExecution('debug', 'PCCARD is true', nlapiSelectValue(invoice, 'pcard'));
        record.setFieldValue('custbody_dwave_pcard_invoice_cb', 'T');
    }
    record.setFieldValue('department', HEADER_DEPARTMENT);
    nlapiLogExecution('debug', '123', 'Done');
    if (!isEmpty(taxamount)) {
        nlapiLogExecution('debug', 'Adding GST Tax of ', taxamount);
        record.selectNewLineItem('item');
        record.setCurrentLineItemValue('item', 'item', DEFAULT_TAX_ITEM_ID);
        record.setCurrentLineItemValue('item', 'rate', taxamount);
        record.setCurrentLineItemValue('item', 'amount', taxamount);
        record.setCurrentLineItemValue('item', 'taxcode', TAX_CODE)
        record.commitLineItem('item');
    }
    try {
        nlapiLogExecution('debug', 'Final record to submit', JSON.stringify(record));
        var recordId = nlapiSubmitRecord(record, null, true);
    } catch (e) {
        nlapiLogExecution('ERROR', 'Processing Error - Unable to create vendor bill', ' Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number') +
        ' Supplier Name = ' +
        nlapiSelectValue(supplierNode, 'name') +
        ' Error Description = ' +
        e.message);
        if (environment == 'PRODUCTION') {
            try {
                nlapiSendEmail(1287, 1287, ' Invoice Integration:Processing Error - Unable to create vendor bill', 'Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number') +
                ' Supplier Name = ' +
                nlapiSelectValue(supplierNode, 'name') +
                ' Error Description = ' +
                e.message);
            } catch (eMail) {
                nlapiLogExecution('debug', 'ERROR', 'Cant send email' + eMail.toString());
            }
            nlapiLogExecution('debug', 'Done', 'Done');
        }
        return;
        
    }
    
    nlapiLogExecution('AUDIT', 'Successfully created vendor bill', ' Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number') +
    ' Supplier Name = ' +
    nlapiSelectValue(supplierNode, 'name'));
    Setexportedtotrue(nlapiSelectValue(invoice, 'id'));
}

function getNSUnit(coupaUOM){
    var unitTypeId;
    for (var i in NS_UNITS) {
        if (NS_UNITS[i].getValue('pluralname') == coupaUOM) {
            unitTypeId = NS_UNITS[i].getValue('internalid');
        }
    }
    nlapiLogExecution('debug', 'unitTypeId', unitTypeId)
    if (!isEmpty(unitTypeId)) {
        var unityRecord = nlapiLoadRecord('unitstype', unitTypeId);
        var unitsCount = unityRecord.getLineItemCount('uom')
        for (k = 1; k <= unitsCount; k++) {
            var unitUnitType = unityRecord.getLineItemValue('uom', 'pluralname', k);
            if (unitUnitType == coupaUOM) {
                return unityRecord.getLineItemValue('uom', 'internalid', k);
            }
        }
    }
}

//        createItemsSublist(record, nlapiSelectValue(invoiceHeaderNodes[i], 'item'));
function createItemsSublist(recordObj, itemName, itemQuantity, itemRate, departmentNumeber, projectID, NSUnit, populateObject){

    nlapiLogExecution('debug', '123', itemName + ',' + itemQuantity + ',' + itemRate);
    //var itemLocation = nlapiSelectValue(itemNode, 'item-number');
    var itemID = findItemID(itemName);
    nlapiLogExecution('debug', '123', itemID + ',' + itemQuantity + ',' + itemRate);
    
    recordObj.selectNewLineItem('item');
    recordObj.setCurrentLineItemValue('item', 'item', itemID);
    recordObj.setCurrentLineItemValue('item', 'location', DEFAULT_LOCATION);
    recordObj.setCurrentLineItemValue('item', 'department', departmentNumeber);
    if (populateObject.populateLineExpeneTax) {
        recordObj.setCurrentLineItemValue('item', 'taxcode', TAX_CODE);
        
    }
    recordObj.setCurrentLineItemValue('item', 'units', NSUnit);
    if (!isEmpty(projectID) && populateObject.populateLineItemProject) {
        recordObj.setCurrentLineItemValue('item', 'customer', projectID);
    }
    recordObj.setCurrentLineItemValue('item', 'quantity', itemQuantity);
    recordObj.setCurrentLineItemValue('item', 'rate', itemRate);
    recordObj.commitLineItem('item');
    
    return recordObj;
    
}

function findItemID(name){
    var itemInNS = findAllItems();
    nlapiLogExecution('debug', 'Total Item Found', itemInNS.length);
    if (itemInNS != '' && itemInNS != null) {
        for (var i in itemInNS) {
            if (name == itemInNS[i].getValue('itemid')) {
                var itemInternalID = itemInNS[i].getValue('internalid');
                break;
            }
        }
    }
    return itemInternalID;
}

/**
 * Creates a saved search object based on provided type, filters and columns. Runs the search to obtain the master results set. Then iterates through the results set to obtain all results.
 *
 * @param {string} [required] type : The record internal ID of the record type you are searching
 * @param {nlobjSearchFilter | nlobjSearchFilter[] | Object[] } [optional] filters : A single nlobjSearchFilter object - or - an array of nlobjSearchFilter objects - or - a search filter expression.
 * @param {nlobjSearchColumn or nlobjSearchColumn[]} [optional] columns : A single nlobjSearchColumn object - or - an array of nlobjSearchColumn objects
 *
 * @return {nlobjSearchResult[]} results : concatenated array of all search results
 */
function searchMore(type, filters, columns){
    var results = [];
    
    // Type is required or else nlapiCreateSearch will break
    if (type != null && type != '' && typeof type !== 'undefined') {
        var searchObject = nlapiCreateSearch(type, filters, columns);
        var searchResultsSets = searchObject.runSearch();
        
        var allResultsFound = false;
        var resultsSetsCounter = 0;
        
        while (!allResultsFound) {
        
            // We start from 0 to 1000, increment the resultsSetsCounter as we go to move by 1000 increments. 1000 to 2000, 2000 to 3000 ...
            var resultsSet = searchResultsSets.getResults(resultsSetsCounter * NS_MAX_SEARCH_RESULT, NS_MAX_SEARCH_RESULT + NS_MAX_SEARCH_RESULT * resultsSetsCounter);
            
            // If original results set is empty, we stop
            if (resultsSet == null || resultsSet == "") {
                allResultsFound = true;
            } else {
                // If current results set is under the maximum number of results we know it is the final iteration and stop
                if (resultsSet.length < NS_MAX_SEARCH_RESULT) {
                    results = results.concat(resultsSet);
                    allResultsFound = true;
                } else {
                    // Otherwise we keep on concatenating the results
                    results = results.concat(resultsSet);
                    resultsSetsCounter++;
                }
            }
        }
    } else {
        throw nlapiCreateError("SSS_MISSING_REQD_ARGUMENT", "Missing a required argument : type");
    }
    
    return results;
}

function findAllItems(){
    var filters = [];
    var columns = [];
    columns[0] = new nlobjSearchColumn('internalid');
    columns[1] = new nlobjSearchColumn('itemid');
    // var searchResults = nlapiSearchRecord('item', null, filters, columns);
    var searchResults = searchMore('item', filters, columns);
    return searchResults;
    
}

function VoidVendorBill(invoice, id){
    //nlapiLogExecution('DEBUG', 'VOID Vendor Bill ', 'Netsuite Id = ' + id + ' Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number'));
    try {
        var record = nlapiLoadRecord('vendorbill', id);
        record.setFieldText('approvalstatus', 'Rejected');
        nlapiSubmitRecord(record);
    } catch (e) {
        nlapiLogExecution('ERROR', 'Processing Error - Unable to void vendor bill', ' Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number') +
        ' Supplier Name = ' +
        nlapiSelectValue(invoice, 'supplier/name') +
        ' Error Description = ' +
        e.message);
        nlapiSendEmail(1287, 1287, ' Invoice Integration:Processing Error - Unable to void vendor bill', 'Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number') +
        ' Supplier Name = ' +
        nlapiSelectValue(invoice, 'supplier/name') +
        ' Error Description = ' +
        e.message);
    }
    
    nlapiLogExecution('AUDIT', 'Successfully voided vendor bill', ' Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number') +
    ' Supplier Name = ' +
    nlapiSelectValue(invoice, 'supplier/name'));
    
    Setexportedtotrue(nlapiSelectValue(invoice, 'id'));
    
    
}




function vendorBillExists(tranid, externalid, entity){
    nlapiLogExecution('DEBUG', 'in vendorBillExists', 'tranid = ' + tranid + ' entity = ' + entity);
    var filters = new Array();
    
    filters[0] = new nlobjSearchFilter('tranid', null, 'is', tranid);
    filters[1] = new nlobjSearchFilter('internalid', 'vendor', 'is', entity);
    filters[2] = new nlobjSearchFilter('mainline', null, 'is', 'T');
    
    
    var searchresults = nlapiSearchRecord('vendorbill', null, filters);
    //nlapiLogExecution('DEBUG','in vendorBillExists', 'tranid = ' + tranid + ' externalid = ' + externalid + ' searchresults = ' + searchresults);
    
    if (searchresults && searchresults.length > 0) {
        nlapiLogExecution('DEBUG', 'in vendorBillExists found Vendorbill in Netsuite', 'tranid = ' + tranid + ' externalid = ' + externalid + ' searchresults = ' + searchresults[0].getId());
        return searchresults[0].getId();
    } else 
        return 'false';
    
    
}


function getVendorId(vendorName){
    var searchresults = nlapiSearchRecord('vendor', null, nlobjSearchFilter('name', null, 'is', vendorName));
    
    //nlapiLogExecution('DEBUG', 'in getNetsuitetermid after calling Search record', coupaTerm);
    
    //if (searchresults.length !=1)
    if (!searchresults) {
        nlapiLogExecution('Error', 'Error getting payment terms id', coupaTerm);
        return 'INVALID_PAYMENT_TERM';
    }
    //nlapiLogExecution('DEBUG', 'in getNetsuitetermid after calling Search record', searchresults[0].getId());
    
    return searchresults[0].getId();
}

function getNetsuitetermid(coupaTerm){
    var searchresults = nlapiSearchRecord('term', null, nlobjSearchFilter('name', null, 'is', coupaTerm));
    
    //nlapiLogExecution('DEBUG', 'in getNetsuitetermid after calling Search record', coupaTerm);
    
    //if (searchresults.length !=1)
    if (!searchresults) {
        nlapiLogExecution('Error', 'Error getting payment terms id', coupaTerm);
        return 'INVALID_PAYMENT_TERM';
    }
    //nlapiLogExecution('DEBUG', 'in getNetsuitetermid after calling Search record', searchresults[0].getId());
    
    return searchresults[0].getId();
}

function getNetsuiteAccountId(accountnumber){
    nlapiLogExecution('debug', 'searching for account number', accountnumber);
    var filters = new Array();
    filters[0] = new nlobjSearchFilter('number', null, 'is', accountnumber);
    //filters[1] = new nlobjSearchFilter( 'name', null, 'is', accountname );
    
    var searchresults = nlapiSearchRecord('account', null, filters);
    
    //nlapiLogExecution('DEBUG', 'in getNetsuitetermid after calling Search record', searchresults[0].getId());
    
    return searchresults[0].getId();
}

function getNetsuiteId(objectinternalid, objectname){
    //nlapiLogExecution('DEBUG', 'Before getting id via search', 'internalobjectid = ' + objectinternalid + ' objectname =  ' + objectname);
    
    var searchresults = nlapiSearchRecord(objectinternalid, null, nlobjSearchFilter('namenohierarchy', null, 'is', objectname));
    
    //nlapiLogExecution('DEBUG', 'in getNetsuitetermid after calling Search record', coupaTerm);
    
    //	if (searchresults.length !=1)
    if (!searchresults) {
        nlapiLogExecution('Error', 'Error getting ID for', 'internalobjectid = ' + objectinternalid + ' objectname =  ' + objectname);
        return 'INVALID_NAME';
    }
    //nlapiLogExecution('DEBUG', 'in getNetsuitetermid after calling Search record', searchresults[0].getId());
    
    return searchresults[0].getId();
}

function getVendorId(vendorName){

    var filters = [];
    var columns = [];
    filters[0] = new nlobjSearchFilter('entity', null, 'is', vendorName);
    
    columns[0] = new nlobjSearchColumn('internalid');
    var searchResults = nlapiSearchRecord('vendorbill', null, filters, columns);
    if (!searchResults) {
        nlapiLogExecution('Error', 'Error getting ID for', 'vendor = ' + vendorName);
        return 'INVALID_NAME';
    }
    //nlapiLogExecution('DEBUG', 'in getNetsuitetermid after calling Search record', searchresults[0].getId());
    
    return searchResults[0].getId();
}

function getAccoutingPeriodNetsuiteId(objectinternalid, objectname){


    var searchresults = nlapiSearchRecord(objectinternalid, null, nlobjSearchFilter('periodname', null, 'is', objectname));
    
    
    if (!searchresults) {
        nlapiLogExecution('DEBUG', 'Error getting ID for', 'internalobjectid = ' + objectinternalid + ' objectname =  ' + objectname);
        return 'INVALID_PERIOD_NAME';
    }
    
    
    return searchresults[0].getId();
}

function Setexportedtotrue(id){
    var headers = new Array();
    headers['Accept'] = 'text/xml';
    headers['X-COUPA-API-KEY'] = nlapiGetContext().getSetting('SCRIPT', 'custscript_apikey');
    var environment = nlapiGetContext().getEnvironment();
    var param_url = nlapiGetContext().getSetting('SCRIPT', 'custscript_url');
    if (environment == 'SANDBOX' || environment == 'BETA') {
        param_url = 'https://dwavesys-test.coupahost.com';
        headers['X-COUPA-API-KEY'] = 'ee30916f0c3e0baf8fce4c1eba6bfa0c2800aaf4';
    }
    var url = param_url + '/api/invoices/' + id;
    var postData = "<?xml version='1.0' encoding='UTF-8'?><invoice-header><exported type='boolean'>true</exported></invoice-header>";
    var response = nlapiRequestURL(url, postData, headers, 'PUT');
    if (response.getCode() != '200') {
        nlapiLogExecution('ERROR', 'Processing Error - Unable to set export flag', ' Coupa Invoice Id = ' + id);
        nlapiSendEmail(1287, 1287, nlapiGetContext().getSetting('SCRIPT', 'custscript_acccountname') + ' Invoice Integration:Processing Error - Unable to set export flag', 'Unable to set export flag - Coupa Invoice Id = ' + id);
    }
    
}

function ConvertCoupaDateToNetSuiteDate(CoupaDate){
    var nDate = CoupaDate.split('T');
    
    var datesplit = nDate[0].split('-');
    
    var Nyear = datesplit[0];
    
    var Nday = datesplit[2];
    
    var Nmonth = datesplit[1];
    
    
    // var netDate = Nday + '-' + Nmonth + '-' + Nyear;
    var netDate = Nday + '-' + getMonthShortName(Nmonth - 1) + '-' + Nyear;
    nlapiLogExecution('debug', 'date is ', Nmonth);
    return netDate;
}


function netsuitedatetoCoupadate(netsuitedate){
    var datesplit = netsuitedate.split("-");
    nlapiLogExecution('debug', 'date ' + getMonth(datesplit[1].toString()), datesplit[1])
    return datesplit[2] + "-" + getMonth(datesplit[1]) + "-" + datesplit[0] + "T00:00:00-08:00";
}

function getTodaysDate(){
    var today = new Date();
    return today.getDate();
}

function getMonthShortName(monthdate){
    var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return monthNames[monthdate];
}

function getMonth(monthStr){
    var monthString = 'JanFebMarAprMayJunJulAugSepOctNovDec'
    return monthString.indexOf(monthStr) / 3 + 1;
}

function getNetsuiteCurrency(coupaCurrencyCode){
    var currencyhash = {
        CAD: "2",
        USD: "1",
        GBP: "3",
        EUR: "4",
        JPY: "5",
        SEK: "6"
    };
    
    //nlapiLogExecution('DEBUG', 'coupaCurrencyCode = ', coupaCurrencyCode);
    return currencyhash[coupaCurrencyCode];
}

function getNetsuiteSubsidiary(coupaSubsidiary){
    var subshash = {
        Japan: "6",
        Singapore: "7",
        US: "1"
    };
    return subshash[coupaSubsidiary];
}

/**
 * Returns true is the string is empty. False otherwise.
 *
 * @param {string} stValue : string value
 * @return {boolean}: true if empty.
 */
function isEmpty(stValue){
    if ((stValue == null) || (stValue == '') || (stValue == undefined)) {
        return true;
    } else {
        return false;
    }
}

function getNSUnits(){
    var filters = [];
    var columns = [];
    
    columns[0] = new nlobjSearchColumn('internalid');
    columns[1] = new nlobjSearchColumn('name');
    columns[2] = new nlobjSearchColumn('pluralname');
    var searchResults = nlapiSearchRecord('unitstype', null, filters, columns);
    return searchResults;
}

/**
 *
 */
function getLatestOpenedPeriod(){
    var lastPeriod = "";
    
    var filters = [];
    filters.push(new nlobjSearchFilter('isquarter', null, 'is', 'F'));
    filters.push(new nlobjSearchFilter('isyear', null, 'is', 'F'));
    filters.push(new nlobjSearchFilter('closed', null, 'is', 'F'));
    filters.push(new nlobjSearchFilter('aplocked', null, 'is', 'F'));
    var columns = [];
    columns.push(new nlobjSearchColumn('startdate').setSort());
    
    var periodResults = nlapiSearchRecord('accountingperiod', null, filters, columns);
    
    if (periodResults != null) {
        lastPeriod = periodResults[0].getId();
    }
    
    return lastPeriod;
}

/**
 * This function will check if the a given date is within a closed or open period
 * @param {Object} tranDateOnVB  : Date to check period for.
 */
function isPeriodOpen(tranDateOnVB){
    nlapiLogExecution('debug', 'Checking if the following date within open period', tranDateOnVB);
    
    var filters = [];
    filters.push(new nlobjSearchFilter('isquarter', null, 'is', 'F'));
    filters.push(new nlobjSearchFilter('isyear', null, 'is', 'F'));
    filters.push(new nlobjSearchFilter('startdate', null, 'onorbefore', tranDateOnVB));
    filters.push(new nlobjSearchFilter('enddate', null, 'onorafter', tranDateOnVB));
    var columns = [];
    columns.push(new nlobjSearchColumn('periodname'));
    columns.push(new nlobjSearchColumn('aplocked'));
    var periodResults = nlapiSearchRecord('accountingperiod', null, filters, columns);
    nlapiLogExecution('debug', 'Done Searching', 'done search');
    
    if (periodResults != null) {
        if (periodResults[0].getValue('aplocked') == 'F') {
            return true;
        }
    }
    return false;
}


function validateURL(coupaURL){
    if (coupaURL.indexOf("http://") !== 0 && coupaURL.indexOf("https://") !== 0) {
        coupaURL = "http://" + coupaURL;
    }
    return coupaURL;
}



