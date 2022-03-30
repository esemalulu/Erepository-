/**
 * Module Description
 * This scheduled script pulls OK to Pay invoices from Coupa into Netsuite
 *
 *
 */

/**
 * @param {String}
 *            type Context Types: scheduled, ondemand, userinterface, aborted,
 *            skipped
 * @returns {Void}
 */

//Modified: NS Enahancement: External ID Enablement: Setting up Use External ID param
var context = nlapiGetContext();
var param_useExternalID = context.getSetting('SCRIPT', 'custscript_coupa_inv_extid');

function scheduled(type) {

    var context = nlapiGetContext();
    var param_url = context.getSetting('SCRIPT', 'custscript_coupa_inv_url');
    var param_APIKey = context.getSetting('SCRIPT',
        'custscript_coupa_inv_apikey');
    // var invoiceFromdate;
    // var invoiceTodate = context.getSetting('SCRIPT',
    // 'custscript_coupa_inv_toinvdate');
    var invoice_filter = "";

    var thisEnv = context.getEnvironment();
    var url_test_contains = [ "-dev", "-demo", "-dmo", "-qa", "-sandbox",
        "-sbx", "-stage", "-staging", "-stg", "-support", "-test", "-uat",
        "coupacloud.com", "coupadev.com" ];

    // Ensure test url in a non production environment.
    try {
        if (thisEnv != 'PRODUCTION') {
            var test_url = false;
            for (var i = 0; i < url_test_contains.length; i++) {
                if (param_url.indexOf(url_test_contains[i]) > -1) {
                    test_url = true;
                }
            }
            if (!test_url) {
                var errMsg = 'Error - script is running in non prod environment and not using a '
                    + url_test_contains
                    + ' in the coupa URL. If you believe this to be incorrect, please contact Coupa Support';
                throw nlapiCreateError('BadEnv', errMsg, false);
            }
        }
    } catch (error) {
        var errordetails;
        errorcode = error.getCode();
        errordetails = error.getDetails() + ".";

        nlapiLogExecution(
            'ERROR',
            'Processing Error - Unable to do Coupa request api call to export Invoices',
            'Error Code = ' + errorcode + ' Error Description = '
            + errordetails);
        nlapiSendEmail(
            -5,
            nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_email_notifications'),
            nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_acccountname')
            + ' Invoice Integration:Processing Error - Unable to do Coupa request api call to export Invoices',
            'Error Code = ' + errorcode + ' Error Description = '
            + errordetails);
        throw error;
    }

    if (context.getSetting('SCRIPT', 'custscript_coupa_invoice_filter')) {
        invoice_filter = context.getSetting('SCRIPT',
            'custscript_coupa_invoice_filter');
    }

    var url = param_url + '/api/invoices?exported=false&status=approved'
        + invoice_filter;

    if (context.getSetting('SCRIPT', 'custscript_coupa_inv_use_updatedat_date') == 'T') {
        if (context.getSetting('SCRIPT',
                'custscript_coupa_inv_from_updatedat_date')) {
            url = url
                + '&updated-at[gt_or_eq]='
                + netsuitedatetoCoupadate(context.getSetting('SCRIPT',
                    'custscript_coupa_inv_from_updatedat_date'));
        }

        if (context.getSetting('SCRIPT',
                'custscript_coupa_inv_to_updatedat_date')) {
            url = url
                + '&updated-at[lt_or_eq]='
                + netsuitedatetoCoupadate(context.getSetting('SCRIPT',
                    'custscript_coupa_inv_to_updatedat_date'));
        }
    } else {
        if (context.getSetting('SCRIPT', 'custscript_coupa_inv_frominvdate')) {
            url = url
                + '&invoice-date[gt_or_eq]='
                + netsuitedatetoCoupadate(context.getSetting('SCRIPT',
                    'custscript_coupa_inv_frominvdate'));
        }

        if (context.getSetting('SCRIPT', 'custscript_coupa_inv_toinvdate')) {
            url = url
                + '&invoice-date[lt_or_eq]='
                + netsuitedatetoCoupadate(context.getSetting('SCRIPT',
                    'custscript_coupa_inv_toinvdate'));
        }
    }

    if (context.getSetting('SCRIPT', 'custscript_coupa_inv_limit'))
        url = url + '&limit='
            + context.getSetting('SCRIPT', 'custscript_coupa_inv_limit');

    nlapiLogExecution('DEBUG', 'URL is ', url);

    var headers = new Array();
    headers['Accept'] = 'text/xml';
    headers['X-COUPA-API-KEY'] = param_APIKey;
    var response = '';

    // try start
    try {
        response = nlapiRequestURL(url, null, headers);
    } catch (error) {
        if (error instanceof nlobjError) {
            var errordetails = '';
            errorcode = error.getCode();
            switch (errorcode) {
                case "SSS_REQUEST_TIME_EXCEEDED":
                    errordetails = "Connection closed because it has exceed the time out period (NetSuite has not received a response after 5 seconds on initial connection or after 45 seconds on the request).";
                    exit = true;
                    break;
                default:
                    errordetails = error.getDetails() + ".";
                    exit = true;
                    break;
            }
            nlapiLogExecution(
                'ERROR',
                'Processing Error - Unable to do Coupa request api call to export Invoices',
                'Error Code = ' + errorcode + ' Error Description = '
                + errordetails);
            nlapiSendEmail(
                -5,
                nlapiGetContext().getSetting('SCRIPT',
                    'custscript_coupa_inv_email_notifications'),
                nlapiGetContext().getSetting('SCRIPT',
                    'custscript_coupa_inv_acccountname')
                + ' Invoice Integration:Processing Error - Unable to do Coupa request api call to export Invoices',
                'Error Code = ' + errorcode + ' Error Description = '
                + errordetails);

        }
    } // catch end

    if (response.getCode() == '200') {

        var responseXML = nlapiStringToXML(response.getBody());

        var invoiceNode = nlapiSelectNode(responseXML, 'invoice-headers');
        var invoiceHeaderNodes = new Array();

        invoiceHeaderNodes = nlapiSelectNodes(invoiceNode, 'invoice-header');

        nlapiLogExecution('AUDIT', 'Processing ' + invoiceHeaderNodes.length
            + ' OK to Pay Invoices');

        for (var i = 0; i < invoiceHeaderNodes.length; i++) {

            var tranid = nlapiSelectValue(invoiceHeaderNodes[i],
                'invoice-number');
            var externalid = nlapiSelectValue(invoiceHeaderNodes[i], 'id');
            var entityid = nlapiSelectValue(invoiceHeaderNodes[i],
                'supplier/number');

            if (!nlapiSelectValue(invoiceHeaderNodes[i], 'supplier/number')) {
                nlapiLogExecution(
                    'AUDIT',
                    'Cannot create Vendor Bill as Supplier Number not populated in Coupa',
                    'Invoice Number = '
                    + tranid
                    + ' Vendor = '
                    + nlapiSelectValue(invoiceHeaderNodes[i],
                        'supplier/name')
                    + ' Coupa Invoice Id = ' + externalid);

                nlapiSendEmail(
                    -5,
                    nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_email_notifications'),
                    nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_acccountname')
                    + ' Invoice Integration:Processing Error - Cannot create Vendor Bill as Supplier Number not populated in Coupa',
                    'Invoice Number = '
                    + tranid
                    + ' Vendor = '
                    + nlapiSelectValue(invoiceHeaderNodes[i],
                        'supplier/name'));

                continue;
            }

            nlapiLogExecution('AUDIT', 'Processing Coupa Invoice',
                'Invoice Number = '
                + tranid
                + ' Vendor = '
                + nlapiSelectValue(invoiceHeaderNodes[i],
                    'supplier/name') + ' Coupa Invoice Id = '
                + externalid);

            var invoiceexists = 'false';

            invoiceexists = vendorBillExists(tranid, externalid, entityid);

            if (invoiceexists == 'false')
                try {
                    CreateVendorBillorVendorCredit(invoiceHeaderNodes[i]);
                } catch (e) {
                    nlapiLogExecution('AUDIT', 'Error Creating Vendor Bill!',
                        'Invoice Number = '
                        + tranid
                        + ' Vendor = '
                        + nlapiSelectValue(invoiceHeaderNodes[i],
                            'supplier/name')
                        + ' Coupa Invoice Id = ' + externalid
                        + ' Netsuite Vendor Bill id = '
                        + invoiceexists);
                    nlapiLogExecution('ERROR', 'Error Creating Vendor Bill',
                        'Invoice Number = ' + tranid + ' Error = '
                        + e.getDetails());
                    nlapiSendEmail(
                        -5,
                        nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_email_notifications'),
                        nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_acccountname')
                        + ' Invoice Integration:Processing Error - Error creating Vendor Bill',
                        'Invoice Number = '
                        + tranid
                        + ' Vendor = '
                        + nlapiSelectValue(invoiceHeaderNodes[i],
                            'supplier/name')
                        + ' Netsuite Vendor Bill id = '
                        + invoiceexists + ' Error = '
                        + e.getDetails());
                    continue;
                }
            else {
                if (nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_coupa_pay_enabled') && nlapiSelectValue(invoiceHeaderNodes[i], 'payment-channel') == 'erp') {
                  nlapiLogExecution('AUDIT', 'Checking for Payment Hold', 'Checking for Payment Hold on vendor bill ' + invoiceexists + ' for erp payment channel');
                  var existingBill = nlapiLoadRecord('vendorbill', invoiceexists);
                  if (existingBill.getFieldValue('paymenthold')){
                    nlapiLogExecution('AUDIT', 'Payment Hold', 'Vendor Bill ' + invoiceexists + ' has payment hold set to true, setting to false');
                    existingBill.setFieldValue('paymenthold', 'F');
                    if(nlapiSubmitRecord(existingBill, true)) {
                      nlapiLogExecution('AUDIT', 'Payment Hold', 'Payment Hold set to false for vendor bill ' +invoiceexists);
                      Setexportedtotrue(externalid);
                    } else {
                      nlapiLogExecution('ERROR', 'Payment Hold', 'Failed to update Payment Hold for vendor bill ' +invoiceexists);
                      nlapiSendEmail(
                        -5,
                        nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_email_notifications'),
                        nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_acccountname')
                        + ' Invoice Integration:Processing Error - Failed to update Payment Hold for vendor bill',
                        'Invoice Number = '
                        + tranid
                        + ' Vendor = '
                        + nlapiSelectValue(invoiceHeaderNodes[i],
                            'supplier/name')
                        + ' Netsuite Vendor Bill id = ' + invoiceexists);
                    }
                  }

                } else {
                  nlapiLogExecution(
                      'AUDIT',
                      'Cannot create Vendor Bill as it already exists in Netsuite',
                      'Invoice Number = '
                      + tranid
                      + ' Vendor = '
                      + nlapiSelectValue(invoiceHeaderNodes[i],
                          'supplier/name')
                      + ' Coupa Invoice Id = ' + externalid
                      + ' Netsuite Vendor Bill id = ' + invoiceexists);

                  nlapiSendEmail(
                      -5,
                      nlapiGetContext().getSetting('SCRIPT',
                          'custscript_coupa_inv_email_notifications'),
                      nlapiGetContext().getSetting('SCRIPT',
                          'custscript_coupa_inv_acccountname')
                      + ' Invoice Integration:Processing Error - Cannot create Vendor Bill as it already exists in Netsuite',
                      'Invoice Number = '
                      + tranid
                      + ' Vendor = '
                      + nlapiSelectValue(invoiceHeaderNodes[i],
                          'supplier/name')
                      + ' Netsuite Vendor Bill id = ' + invoiceexists);

                  // UpdateVendorBill(invoiceHeaderNodes[i], invoiceexists);
                }
            }

        }

    } // end of approved invoices
    else
        nlapiLogExecution('AUDIT', 'Zero Coupa Ok to Pay Invoices to export');

    // check for exported and now voided invoices
    var enable_support_void = 0; // by default not supported

    if (context.getSetting('SCRIPT', 'custscript_supportvoid')) {
        enable_support_void = context.getSetting('SCRIPT',
            'custscript_supportvoid');
    }

    if (enable_support_void == 1) {

        url = param_url + '/api/invoices?exported=false&status=voided';

        if (context.getSetting('SCRIPT', 'custscript_coupa_inv_frominvdate')) {
            url = url
                + '&invoice-date[gt_or_eq]='
                + netsuitedatetoCoupadate(context.getSetting('SCRIPT',
                    'custscript_coupa_inv_frominvdate'));
        }

        if (context.getSetting('SCRIPT', 'custscript_coupa_inv_toinvdate')) {
            url = url
                + '&invoice-date[lt_or_eq]='
                + netsuitedatetoCoupadate(context.getSetting('SCRIPT',
                    'custscript_coupa_inv_toinvdate'));
        }

        // try start
        try {
            response = nlapiRequestURL(url, null, headers);
        } catch (error) {
            if (error instanceof nlobjError) {
                var errordetailsvoid;
                errorcode = error.getCode();
                switch (errorcode) {
                    case "SSS_REQUEST_TIME_EXCEEDED":
                      errordetailsvoid = "Connection closed because it has exceed the time out period (NetSuite has not received a response after 5 seconds on initial connection or after 45 seconds on the request).";
                        exit = true;
                        break;
                    default:
                      errordetailsvoid = error.getDetails() + ".";
                        exit = true;
                        break;
                }
                nlapiLogExecution(
                    'ERROR',
                    'Processing Error - Unable to do Coupa request api call to check exported and now voided Invoices',
                    'Error Code = ' + errorcode + ' Error Description = '
                    + errordetailsvoid);
                nlapiSendEmail(
                    -5,
                    nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_email_notifications'),
                    nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_acccountname')
                    + ' Invoice Integration:Processing Error - Unable to do Coupa request api call to check exported and now voided Invoices',
                    'Error Code = ' + errorcode + ' Error Description = '
                    + errordetailsvoid);

            }
        } // catch end

        if (response.getCode() == '200') {

            var responseVoidXML = nlapiStringToXML(response.getBody());

            var invoiceNodeVoid = nlapiSelectNode(responseVoidXML, 'invoice-headers');
            var invoiceHeaderNodesVoid = new Array();

            invoiceHeaderNodesVoid = nlapiSelectNodes(invoiceNodeVoid, 'invoice-header');

            // nlapiLogExecution('DEBUG', 'Length of invoiceHeaderNodes.lenght',
            // invoiceHeaderNodes.length);

            nlapiLogExecution('AUDIT', 'Processing '
                + invoiceHeaderNodesVoid.length + ' voided invoices');

            for (var inv = 0; inv < invoiceHeaderNodesVoid.length; inv++) {

                var tranidvoid = nlapiSelectValue(invoiceHeaderNodesVoid[inv],
                    'invoice-number');
                var externalidvoid = 'Coupa-VendorBill'
                    + nlapiSelectValue(invoiceHeaderNodesVoid[inv], 'id');
                var entityidvoid = nlapiSelectValue(invoiceHeaderNodesVoid[inv],
                    'supplier/number');

                nlapiLogExecution('AUDIT',
                    'Processing Coupa Invoice - VOID in Netsuite',
                    'Invoice Number = '
                    + tranidvoid
                    + ' Vendor = '
                    + nlapiSelectValue(invoiceHeaderNodesVoid[inv],
                        'supplier/name')
                    + ' Coupa Invoice Id = ' + externalidvoid);

                // nlapiLogExecution('DEBUG', 'before calling vendorbillexists',
                // 'external id = ' + externalid + ' traind = ' + tranid);

                var invoiceexistsvoid = 'false';

                invoiceexistsvoid = vendorBillExists(tranidvoid, externalidvoid, entityidvoid);

                if (invoiceexistsvoid != 'false')
                    VoidVendorBill(invoiceHeaderNodesVoid[inv], invoiceexistsvoid);
                else
                    nlapiLogExecution('AUDIT',
                        'Invoice does not exist in Netsuite',
                        'Invoice Number = '
                        + tranidvoid
                        + ' Vendor = '
                        + nlapiSelectValue(invoiceHeaderNodesVoid[inv],
                            'supplier/name')
                        + ' Coupa Invoice Id = ' + externalidvoid);

            }

        } else
            nlapiLogExecution('AUDIT', 'Zero voided Coupa Invoices to process');

    }
}

function CreateVendorBillorVendorCredit(invoice) {
    var bill = false;
    var credit = false;
    var invoiceLine = nlapiSelectNode(invoice, 'invoice-lines');
    var invoiceLineNodes = new Array();
    var invoicetotal = 0;
    invoiceLineNodes = nlapiSelectNodes(invoiceLine, 'invoice-line');
    var creditMemoOption = 2; // by default option is 2

    for (var x = 0; x < invoiceLineNodes.length; x++) {
        invoicetotal = invoicetotal
            + parseFloat(nlapiSelectValue(invoiceLineNodes[x], 'total'));

        if (parseFloat(nlapiSelectValue(invoiceLineNodes[x], 'total')) < 0) {
            credit = true;
        } else {
            bill = true;
        }
    }

    if (nlapiGetContext().getSetting('SCRIPT', 'custscript_creditmemooption'))
        creditMemoOption = nlapiGetContext().getSetting('SCRIPT',
            'custscript_creditmemooption');

    if (nlapiGetContext().getSetting('SCRIPT',
            'custscript_coupa_inv_documenttype')) {
        if (nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_documenttype') == 'T') {
            var invoiceType = nlapiSelectValue(invoice, 'document-type');
            if (invoiceType == 'Credit Note') {
                credit = true;
                bill = false;
                creditMemoOption = 1;
            }
        }
    }

    if (creditMemoOption == 1) {
        if (bill == true)
            CreateVendorBill(invoice);

        if (credit == true)
            CreateVendorCredit(invoice);
    } else if (creditMemoOption == 2) {
        if (invoicetotal >= 0) {
            // nlapiLogExecution('DEBUG', 'creating vendor bill ', 'amount = ' +
            // invoicetotal );
            CreateVendorBill(invoice);
        } else {
            // nlapiLogExecution('DEBUG', 'creating vendor credit ', 'amount =
            // '+ invoicetotal );
            CreateVendorCredit(invoice);
        }
    }
}
//NetSuite Suggested Script Change
function CreateVendorCredit(invoice) {
    var record = nlapiCreateRecord('vendorcredit', {
        recordmode : 'dynamic',
        ignorecache : true});

    var supplierNode = nlapiSelectNode(invoice, 'supplier');
    nlapiLogExecution('DEBUG', 'SupplierName', nlapiSelectValue(supplierNode,
        'name'));

    if (nlapiSelectValue(supplierNode, 'number'))
        record
            .setFieldValue('entity', nlapiSelectValue(supplierNode,
                'number'));
    else
    // try setting supplier name instead on id
        record.setFieldText('entity', nlapiSelectValue(supplierNode, 'name'));

    var lineleveltaxation = 'false';
    var dynamicAccounting = 'F';
    if (nlapiGetContext().getSetting('SCRIPT',
            'custscript_coupa_inv_dynamicaccts'))
        dynamicAccounting = nlapiGetContext().getSetting('SCRIPT',
            'custscript_coupa_inv_dynamicaccts');

    lineleveltaxation = nlapiSelectValue(invoice, 'line-level-taxation');


    var shippingamount = parseFloat(nlapiSelectValue(invoice, 'shipping-amount'));
    var handlingamount = parseFloat(nlapiSelectValue(invoice, 'handling-amount'));
    var taxamount = parseFloat(nlapiSelectValue(invoice, 'tax-amount'));
    var miscamount = parseFloat(nlapiSelectValue(invoice, 'misc-amount'));


   // get all header level - shipping, handling, misc tax amount for further calculation


    var chargeLine = nlapiSelectNode(invoice, 'invoice-charges');
    var chargeLineNodes = new Array();

    chargeLineNodes = nlapiSelectNodes(chargeLine, 'invoice-charge');


    var shippingChargeTaxAmount = 0.0;
    var handlingChargeTaxAmount = 0.0;
    var miscChargeTaxAmount = 0.0;
    var chargesType = null;
    var shippingChargeTax = null;
    var handlingChargeTax = null;
    var miscChargeTax = null;
	var shippingChargeWithTaxCode = false;
	var handlingChargeWithTaxCode = false;
	var miscChargeWithTaxCode = false;
	var headerTaxCode = null;
    var shippingChargeTaxCode = null;
    var handlingChargeTaxCode = null;
    var miscChargeTaxCode = null;

	var totalheaderlinecharge = 0.0;
	var totalcalcheaderlinecharge = 0.0;
	var headerlinecharge = 0.0;

	// shipping charge
	var shippinglinecharge = 0.0;
	var totalcalcshippinglinecharge = 0.0;
	var totalshippingamount = 0.0;
	var totalcalcshippingamount = 0.0;

	// handling charge
	var handlinglinecharge = 0.0;
	var totalcalchandlinglinecharge = 0.0;
	var totalhandlingamount = 0.0;
	var totalcalchandlingamount = 0.0;

	// misc charge
	var misclinecharge = 0.0;
	var totalcalcmisclinecharge = 0.0;
	var totalmiscamount = 0.0;
	var totalcalcmiscamount = 0.0;


	headerTaxCode = nlapiSelectValue(invoice, 'tax-code/code');


	//start block of get all header level details

    for (var cnt = 0; cnt < chargeLineNodes.length; cnt++)
     {
        chargesType = nlapiSelectValue(chargeLineNodes[cnt], 'type')

         if(chargesType == 'InvoiceShippingCharge')
         {
             shippingChargeTaxAmount = nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/amount');

             if (nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/tax-code/code'))
             {
                 shippingChargeTax = nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/tax-code/code').split(':');
                 if (shippingChargeTax[1]) {

					 shippingChargeWithTaxCode = true;
					 shippingChargeTaxCode = shippingChargeTax[1];
                     nlapiLogExecution(
                         'DEBUG',
                         'Shipping tax and setting tax code to',
                         'TaxCode = ' + shippingChargeTax[1]
                         );
                 } else {
                     nlapiLogExecution('ERROR',
                         'Processing Error - Invalid Shipping taxcode',
                         'TaxCode ='
                         + nlapiSelectValue(
                             chargeLineNodes[cnt],
                             shippingChargeTax)
                         + ' Invoice Number = '
                         + nlapiSelectValue(invoice,
                             'invoice-number')
                         + ' Supplier Name = '
                         + nlapiSelectValue(
                             supplierNode, 'name'));
                 }


             }
 			else
 			{
				nlapiLogExecution('DEBUG', 'shippingamount else step',shippingamount);
				if (shippingamount != '' && shippingamount != null && shippingamount != 0.0)
				{
					nlapiLogExecution('DEBUG', 'shippingamount check',shippingamount);
					totalheaderlinecharge = parseFloat(totalheaderlinecharge) + parseFloat(shippingamount);

					nlapiLogExecution('DEBUG', 'shippingamount totalheaderlinecharge',totalheaderlinecharge);

					if (nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/amount') != '' && nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/amount') != null)
 					{
 						totalheaderlinecharge = parseFloat(totalheaderlinecharge) + parseFloat(nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/amount'));
 					}
				}
 			}
		 }
         if(chargesType == 'InvoiceHandlingCharge')
         {

             //linecharge = parseFloat(nlapiSelectValue(invoice, 'handling-amount'));

             handlingChargeTaxAmount = nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/amount');

             if (nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/tax-code/code')){
                 handlingChargeTax = nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/tax-code/code').split(':');

                 if (handlingChargeTax[1]) {

					 handlingChargeWithTaxCode = true;
					 handlingChargeTaxCode = handlingChargeTax[1];
                     nlapiLogExecution(
                         'DEBUG',
                         'Handling tax and setting tax code to',
                         'TaxCode = ' + handlingChargeTax[1]
                     );
                 } else {
                     nlapiLogExecution('ERROR',
                     'Processing Error - Invalid Handling taxcode',
                     'TaxCode ='
                     + nlapiSelectValue(
                         chargeLineNodes[cnt],
                         handlingChargeTax)
                     + ' Invoice Number = '
                     + nlapiSelectValue(invoice,
                         'invoice-number')
                     + ' Supplier Name = '
                     + nlapiSelectValue(
                         supplierNode, 'name'));
                 }

             }
			else
			{
				if (handlingamount != '' && handlingamount != null && handlingamount != 0.0)
				{
					totalheaderlinecharge = parseFloat(totalheaderlinecharge) + parseFloat(handlingamount);

					if (nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/amount') != '' && nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/amount') != null)
					{
						totalheaderlinecharge = parseFloat(totalheaderlinecharge) + parseFloat(nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/amount'));
					}
				}
			}

		 }
         if(chargesType == 'InvoiceMiscCharge')
         {
             miscChargeTaxAmount = nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/amount');

             if (nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/tax-code/code')){
                 miscChargeTax = nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/tax-code/code').split(':');
                 if (miscChargeTax[1]) {

					 	miscChargeWithTaxCode = true;
					 	miscChargeTaxCode = miscChargeTax[1];
                         //record.setCurrentLineItemValue('expense','taxcode', miscChargeTax[1]);
                         //record.setCurrentLineItemValue('expense', 'amount', miscamount2);
                         nlapiLogExecution(
                             'DEBUG',
                             'Misc tax and setting tax code to',
                             'TaxCode = ' + miscChargeTax[1]
                         );
                     } else {
                         nlapiLogExecution('ERROR',
                         'Processing Error - Invalid Misc taxcode',
                         'TaxCode ='
                         + nlapiSelectValue(
                             chargeLineNodes[cnt],
                             miscChargeTax)
                         + ' Invoice Number = '
                         + nlapiSelectValue(invoice,
                             'invoice-number')
                         + ' Supplier Name = '
                         + nlapiSelectValue(
                             supplierNode, 'name'));
                     }
             }
 			else
 			{
				if (miscamount != '' && miscamount != null && miscamount != 0.0)
				{
					totalheaderlinecharge = parseFloat(totalheaderlinecharge) + parseFloat(miscamount);

 					if (nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/amount') != '' && nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/amount') != null)
 					{
 						totalheaderlinecharge = parseFloat(totalheaderlinecharge) + parseFloat(nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/amount'));
 					}
				}
 			}
		 }
     }

     nlapiLogExecution('DEBUG', 'shippingChargeTaxAmt', shippingChargeTaxAmount);
     nlapiLogExecution('DEBUG', 'handlingChargeTaxAmt', handlingChargeTaxAmount);
     nlapiLogExecution('DEBUG', 'miscChargeTaxAmt', miscChargeTaxAmount);

	 if (shippingChargeTaxAmount == null || shippingChargeTaxAmount == '')
	 {
		 shippingChargeTaxAmount = 0;
	 }
	 if (handlingChargeTaxAmount == null || handlingChargeTaxAmount == '')
	 {
		 handlingChargeTaxAmount = 0;
	 }
	 if (miscChargeTaxAmount == null || miscChargeTaxAmount == '')
	 {
		 miscChargeTaxAmount = 0;
	 }

	var totalchargetypetaxcharges = parseFloat(shippingChargeTaxAmount) + parseFloat(handlingChargeTaxAmount) + parseFloat(miscChargeTaxAmount);

    var headertaxamount = parseFloat(taxamount) - parseFloat(totalchargetypetaxcharges);

	//end block of get all header level details

	if ((headerTaxCode == null || headerTaxCode == '') && lineleveltaxation == 'false')
	{
		totalheaderlinecharge = parseFloat(totalheaderlinecharge) + parseFloat(headertaxamount);
	}

	nlapiLogExecution('DEBUG', 'final headerlinecharge', totalheaderlinecharge);

   // end block for get all get all header level - shipping, handling, misc tax amount
   // end block for get all get all header level - shipping, handling, misc tax amount
    /*
     * nlapiLogExecution('DEBUG', 'Other Charges', 'Shipping = ' +
     * shippingamount + ' Handling = ' + handlingamount + ' Taxamount = ' +
     * taxamount + ' miscamount = ' + miscamount);
     */

    var headercharges = false;
	var headertaxcharges = false;
    var totalheadercharges = 0;
	var totalheadertaxcharges = 0;
	var totalpercent = 1.0;
	var linepercent = 0.0
	var totalcalcpercent = 0.0;
	var isLastLine = 'false';

    totalheadercharges = parseFloat(shippingamount)
        + parseFloat(handlingamount) + parseFloat(miscamount);

    //nib-61
     if (lineleveltaxation == 'false') {
        if (nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_send_taxcode')) {
            if (nlapiGetContext().getSetting('SCRIPT',
                    'custscript_coupa_inv_send_taxcode') == 'F')
                 totalheadercharges = parseFloat(totalheadercharges)
                     + parseFloat(taxamount);

	        else if ((nlapiGetContext().getSetting('SCRIPT',
                    'custscript_coupa_inv_send_taxcode') == 'T')
                && (nlapiSelectValue(invoice, 'tax-code/code') == null)) {
				/*
				totalheadercharges = parseFloat(totalheadercharges)
                    + parseFloat(taxamount);
				*/
					totalheadertaxcharges = parseFloat(taxamount) - parseFloat(totalchargetypetaxcharges);

					if (totalheadertaxcharges != 0 && totalheadertaxcharges != null && totalheadercharges != 0  && totalheadercharges != null)
						totalheadercharges = parseFloat(totalheadertaxcharges);

					if (totalheadertaxcharges != 0 && totalheadertaxcharges != null && (totalheadercharges == 0  || totalheadercharges == null))
						totalheadercharges = parseFloat(totalheadertaxcharges);

					if ((totalheadertaxcharges == 0 || totalheadertaxcharges == null) && totalheadercharges != 0 && totalheadercharges != null)
						totalheadercharges = parseFloat(totalheadercharges);

					if (totalheadertaxcharges != 0)
					   headertaxcharges = true;
            }

        } else
            totalheadercharges = parseFloat(totalheadercharges)
                + parseFloat(taxamount);

    }

     if (totalheadercharges != 0) /* CSOD Negative  Summary Charges fix */
        headercharges = true;

    var invoiceLine = nlapiSelectNode(invoice, 'invoice-lines');
    var invoiceLineNodes = new Array();

    invoiceLineNodes = nlapiSelectNodes(invoiceLine, 'invoice-line');

    // get total amount by adding the line amounts
    var totalamount = 0;
    var taxabletotalamount = 0;
	var linetaxtotalamount = 0;
	var linepercent = 0.0;

    for (var x = 0; x < invoiceLineNodes.length; x++) {
        if (nlapiSelectValue(invoiceLineNodes[x], 'nontaxable') != 'true')
            taxabletotalamount = parseFloat(taxabletotalamount)
                + parseFloat(nlapiSelectValue(invoiceLineNodes[x], 'total'));

		if (nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_send_taxcode') == 'F') {
            linetaxtotalamount = parseFloat(nlapiSelectValue(invoiceLineNodes[x],
                'tax-amount')) + parseFloat(linetaxtotalamount);
				}

        totalamount = parseFloat(totalamount)
            + parseFloat(nlapiSelectValue(invoiceLineNodes[x], 'total'));
    }

	if (headercharges == true && linetaxtotalamount != 0)
	{
		totalheadercharges = parseFloat(totalheadercharges) + parseFloat(taxamount) - parseFloat(linetaxtotalamount);
	    nlapiLogExecution('DEBUG', 'totalheadercharges',
	    totalheadercharges);
	}

    var totalheaderamount = parseFloat(totalamount)
        + parseFloat(totalheadercharges);
    totalheaderamount = totalheaderamount.toFixed(3);
    var totalcalcamount = 0;

    for (var x = 0; x < invoiceLineNodes.length; x++) {

        // customization for Coupa to copy the description of first line to the
        // memo field on the header of Netsuite Vendor Bill
        if (x == 0) {
            if (nlapiSelectValue(invoiceLineNodes[x], 'description'))
                record.setFieldValue('memo', nlapiSelectValue(
                    invoiceLineNodes[x], 'description'));
        }

       var linetax = 0;

        // check for the new tax feature nib-61
        if (nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_send_taxcode') == 'F') {
            linetax = parseFloat(nlapiSelectValue(invoiceLineNodes[x],
                'tax-amount'));

            if (linetax)
                totalheaderamount = parseFloat(totalheaderamount)
                    + parseFloat(linetax);
        }

        var invoicelineamount = parseFloat(nlapiSelectValue(
            invoiceLineNodes[x], 'total'));
        var splitaccounting = 'FALSE';
        var actalloc = nlapiSelectNode(invoiceLineNodes[x],
            'account-allocations');
        var accountallocations = new Array();
        accountallocations = nlapiSelectNodes(actalloc, 'account-allocation');
        if (accountallocations.length >= 1) {
            splitaccounting = 'TRUE';
            // nlapiLogExecution('DEBUG', 'Split accounting = ',
            // splitaccounting);
        }



        if (splitaccounting == 'TRUE') {
            for (var i = 0; i < accountallocations.length; i++) {
                var lineamount = parseFloat(nlapiSelectValue(
                    accountallocations[i], 'amount'));
				// remove the linecharge as we implemented new logic to handle as headerlinecharge

				var linecharge = (parseFloat(lineamount) / parseFloat(taxabletotalamount))
                    * totalheadercharges;

				//var linecharge = 0;


                var splitlinetax = 0.00;
                if (linetax) {
                    splitlinetax = (parseFloat(lineamount) / parseFloat(invoicelineamount))
                        * linetax;
                    // nlapiLogExecution('DEBUG', 'split line tax details ',
                    // 'splitline amount = ' + lineamount + ' splitlinetax = ' +
                    // splitlinetax);
                }
                var adjlineamount;

                if (linetax)
                    adjlineamount = parseFloat(lineamount)
                        + parseFloat(linecharge) + parseFloat(splitlinetax);
                else {
                    // customization for nontaxable
                    if (nlapiSelectValue(invoiceLineNodes[x], 'nontaxable') == 'true')
                        adjlineamount = parseFloat(lineamount);
                    else
                        adjlineamount = parseFloat(lineamount)
                            + parseFloat(linecharge);
                }
               adjlineamount = parseFloat(adjlineamount).toFixed(2);

                var accountNode = nlapiSelectNode(accountallocations[i],
                    'account');
                record.selectNewLineItem('expense');
                if (x == 0) {
                    nlapiLogExecution('DEBUG',
                        'Check for Subsidiary segment custom field',
                        nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_subsseg'));

                    if (nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_subsseg')) {
                        var subsidiaryId = nlapiSelectValue(
                            accountNode,
                            nlapiGetContext().getSetting('SCRIPT',
                                'custscript_coupa_inv_subsseg')).split(
                            ':');
                        if (dynamicAccounting == 'T') {
                            nlapiLogExecution('DEBUG', 'Setting subsidiary ID to', subsidiaryId);
                            //Modified:NS enhancements: External ID enablement
                            if( param_useExternalID != null  && param_useExternalID == 'T')
                            {
                                var objInternalID = getInternalIDByExternalId(subsidiaryId,'subsidiary');
                                nlapiLogExecution('DEBUG','Setting internal ID step 1 == ', objInternalID);
                                record.setFieldValue('subsidiary', objInternalID);
                            } else {
                                record.setFieldValue('subsidiary', subsidiaryId);
                            }
                        } else {
                            nlapiLogExecution('DEBUG', 'Setting subsidiary ID to', subsidiaryId[1]);
                            //Modified:NS enhancements: External ID enablement
                            if( param_useExternalID != null  && param_useExternalID == 'T')
                            {
                                var objInternalID = getInternalIDByExternalId(subsidiaryId[1],'subsidiary');
                                nlapiLogExecution('DEBUG','Setting internal ID step 1 == ', objInternalID);
                                record.setFieldValue('subsidiary', objInternalID);
                            } else{
                                record.setFieldValue('subsidiary', subsidiaryId[1]);
                            }
                        }
                    } else if (dynamicAccounting == 'T') {
                        var coaNode = nlapiSelectNode(accountNode,
                            'account-type');
                        var subsidiaryName = nlapiSelectValue(coaNode, 'name');
                        var subsidiaryID = '';
                        try {
                            subsidiaryID = getNetSuiteId('subsidiary',
                                subsidiaryName);
                        } catch (e) {
                            var error = e.getDetails();
                            if (error
                                    .indexOf("The feature 'Subsidiaries' required to access this page is not enabled in this account") > -1) {
                                nlapiLogExecution('DEBUG',
                                    "Subsidiaries not enabled",
                                    'Skipping subsidiary set');
                            } else {
                                nlapiLogExecution('ERROR',
                                    "Error on Subsidiary set", 'error');
                            }
                        }
                        if (subsidiaryID != '') {
                            nlapiLogExecution('DEBUG',
                                'Setting subsidiary ID from COA name to',
                                subsidiaryID);
                            record.setFieldValue('subsidiary', subsidiaryID);
                        }
                    }
                }

                if (nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_glactseg')) {
                    var account;
                    var accountnumber;
                    var accountId;
                    account = nlapiSelectValue(
                        accountNode,
                        nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_glactseg'))
                        .split(':');
                    accountnumber = account[0];
                    if (dynamicAccounting == 'T') {
                        accountId = getNetsuiteAccountId(account);
                    } else {
                        accountId = getNetsuiteAccountId(accountnumber);
                    }
                    if (accountId != 'INVALID_ACCOUNT')
                        record.setCurrentLineItemValue('expense', 'account',
                            accountId);
                    else {
                        nlapiLogExecution(
                            'ERROR',
                            'Processing Error - Invalid GL account',
                            'GL Account ='
                            + accountnumber
                            + ' Invoice Number = '
                            + nlapiSelectValue(invoice,
                                'invoice-number')
                            + ' Supplier Name = '
                            + nlapiSelectValue(supplierNode, 'name'));
                        nlapiSendEmail(
                            -5,
                            nlapiGetContext()
                                .getSetting('SCRIPT',
                                    'custscript_coupa_inv_email_notifications'),
                            nlapiGetContext().getSetting('SCRIPT',
                                'custscript_coupa_inv_acccountname')
                            + ' Invoice Integration:Processing Error - Invalid GL account',
                            'GL Account ='
                            + accountnumber
                            + ' Invoice Number = '
                            + nlapiSelectValue(invoice,
                                'invoice-number')
                            + ' Supplier Name = '
                            + nlapiSelectValue(supplierNode, 'name'));
                        return;
                    }
                }

                if (nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_deptseg')) {
                    var dept = nlapiSelectValue(
                        accountNode,
                        nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_deptseg')).split(':');
                    if (dynamicAccounting == 'T') {
                        //Modified:NS enhancements: External ID enablement
                        if( param_useExternalID != null  && param_useExternalID == 'T')
                        {
                            var objInternalID = getInternalIDByExternalId(dept,'department');
                            nlapiLogExecution('DEBUG','Setting internal ID step 1 == ', objInternalID);
                            record.setCurrentLineItemValue('expense', 'department', objInternalID);
                        } else {
                            record.setCurrentLineItemValue('expense', 'department', dept);
                        }
                    } else {
                        //Modified:NS enhancements: External ID enablement
                        if( param_useExternalID != null  && param_useExternalID == 'T')
                        {
                            var objInternalID = getInternalIDByExternalId(dept[1],'department');
                            nlapiLogExecution('DEBUG','Setting internal ID step 1 == ', objInternalID);
                            record.setCurrentLineItemValue('expense', 'department', objInternalID);
                        } else {
                            record.setCurrentLineItemValue('expense', 'department', dept[1]);
                        }
                    }
                }

                if (nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_classseg')) {
                    var clss = nlapiSelectValue(
                        accountNode,
                        nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_classseg'))
                        .split(':');
                    if (dynamicAccounting == 'T') {
                        //Modified:NS enhancements: External ID enablement
                        if( param_useExternalID != null  && param_useExternalID == 'T')
                        {
                            var objInternalID = getInternalIDByExternalId(clss,'classification');
                            nlapiLogExecution('DEBUG','Setting internal ID step 1 == ', objInternalID);
                            record.setCurrentLineItemValue('expense', 'class', objInternalID);
                        } else {
                            record.setCurrentLineItemValue('expense', 'class', clss);
                        }
                    } else {
                        record.setCurrentLineItemValue('expense', 'class', clss[1]);
                    }
                }

                if (nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_locseg')) {
                    var locId = nlapiSelectValue(
                        accountNode,
                        nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_locseg')).split(':');
                    if (dynamicAccounting == 'T') {
                        //Modified:NS enhancements: External ID enablement
                        if( param_useExternalID != null  && param_useExternalID == 'T')
                        {
                            var objInternalID = getInternalIDByExternalId(locId,'location');
                            nlapiLogExecution('DEBUG','Setting internal ID step 1 == ', objInternalID);
                            record.setCurrentLineItemValue('expense', 'location', objInternalID);
                        } else {
                            record.setCurrentLineItemValue('expense', 'location', locId);
                        }
                    } else {
                        //Modified:NS enhancements: External ID enablement
                        if( param_useExternalID != null  && param_useExternalID == 'T')
                        {
                            var objInternalID = getInternalIDByExternalId(locId[1],'location');
                            nlapiLogExecution('DEBUG','Setting internal ID step 1 == ', objInternalID);
                            record.setCurrentLineItemValue('expense', 'location', objInternalID);
                        } else {
                            record.setCurrentLineItemValue('expense', 'location', locId[1]);
                        }
                    }
                }

                else if (nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_loccust')) {
                    var locId = getNetSuiteId('location', nlapiSelectValue(
                        invoiceLineNodes[x], nlapiGetContext().getSetting(
                            'SCRIPT', 'custscript_coupa_inv_loccust')));
                    if (locId != 'INVALID_NAME')
                        record.setCurrentLineItemValue('expense', 'location',
                            locId);
                }
                //nib-61
                if (nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_send_taxcode') == 'T')
                {
                    nlapiLogExecution('DEBUG', 'if sendtaxcode set to true',
                        'lineamount = ' + adjlineamount);

                    // for the new tax feature

                    if (lineleveltaxation == 'false') // no line level tax
                    // scenrio - header
                    // level tax only
                    {
                        nlapiLogExecution(
                            'DEBUG',
                            'if sendtaxcode set to true and header level tax only',
                            'lineamount = ' + adjlineamount);
                        if (nlapiSelectValue(invoice, 'tax-code/code')) {
                            var taxsplit = nlapiSelectValue(invoice,
                                'tax-code/code').split(':');
                            if (taxsplit[1]) {
                                record.setCurrentLineItemValue('expense',
                                    'taxcode', taxsplit[1]);
                            } else {
                                nlapiLogExecution(
                                    'ERROR',
                                    'Processing Error - Invalid Header taxcode',
                                    'TaxCode ='
                                    + nlapiSelectValue(invoice,
                                        'tax-code/code')
                                    + ' Invoice Number = '
                                    + nlapiSelectValue(invoice,
                                        'invoice-number')
                                    + ' Supplier Name = '
                                    + nlapiSelectValue(
                                        supplierNode, 'name'));
                            }

                        }
                    } // end of no line level tax scenrio - header level tax
                    // only
                    else // line level tax scenario
                    {
                        nlapiLogExecution(
                            'DEBUG',
                            'if sendtaxcode set to true and line level tax',
                            'lineamount = ' + adjlineamount);

                        if (nlapiSelectValue(invoiceLineNodes[x],
                                'tax-code/code')) // line level tax and
                        // taxcode used
                        {
                            var taxsplit = nlapiSelectValue(
                                invoiceLineNodes[x], 'tax-code/code')
                                .split(':');
                            if (taxsplit[1]) {
                                record.setCurrentLineItemValue('expense',
                                    'taxcode', taxsplit[1]);
                                nlapiLogExecution(
                                    'DEBUG',
                                    'if sendtaxcode set to true and linelevel tax and setting tax code to',
                                    'TaxCode = ' + taxsplit[1]
                                    + ' lineamount = '
                                    + adjlineamount);
                            } else {
                                nlapiLogExecution('ERROR',
                                    'Processing Error - Invalid taxcode',
                                    'TaxCode ='
                                    + nlapiSelectValue(
                                        invoiceLineNodes[x],
                                        'tax-code/code')
                                    + ' Invoice Number = '
                                    + nlapiSelectValue(invoice,
                                        'invoice-number')
                                    + ' Supplier Name = '
                                    + nlapiSelectValue(
                                        supplierNode, 'name'));
                            }
                        } // end of line level tax and taxcode used

                        else if (nlapiSelectValue(invoiceLineNodes[x],
                                'tax-amount')) // line level tax and only
                        // taxamount no taxcode
                        {

                            linetax = parseFloat(nlapiSelectValue(
                                invoiceLineNodes[x], 'tax-amount'));

                            if (linetax) {

                                splitlinetax = (parseFloat(lineamount) / parseFloat(invoicelineamount))
                                    * linetax;
                                totalheaderamount = parseFloat(totalheaderamount)
                                    + parseFloat(splitlinetax);
                                // adjlineamount = parseFloat(lineamount) +
                                // parseFloat(linecharge) + parseFloat(linetax);
                                adjlineamount = parseFloat(lineamount)
                                    + parseFloat(splitlinetax);
                            }

                        } // end of line level tax and only taxamount no
                        // taxcode

                    } // end of line level tax scenario

                } // end of for the new tax feature
                else // Need to check for backward compatibility
                {

                    nlapiLogExecution('DEBUG', 'if sendtaxcode set to false',
                        'lineamount = ' + adjlineamount);
                    if (linetax) {
                        splitlinetax = (parseFloat(lineamount) / parseFloat(invoicelineamount))
                            * linetax;

                        adjlineamount = parseFloat(lineamount)
                            + parseFloat(linecharge)
                            + parseFloat(splitlinetax);
					    /*
                     	adjlineamount = parseFloat(lineamount)
                         	+ parseFloat(splitlinetax);
					    headertaxcharges = true;
						*/

                    } else {
                        // customization for nontaxable
                        if (nlapiSelectValue(invoiceLineNodes[x], 'nontaxable') == 'true')
						{
                            adjlineamount = parseFloat(lineamount);
						}
                        else
						{
                            adjlineamount = parseFloat(lineamount)
                                + parseFloat(linecharge);
						   /*
                           adjlineamount = parseFloat(lineamount);
						   headertaxcharges = true;
						   */

						}

                    }

                }

                adjlineamount = parseFloat(adjlineamount).toFixed(2);
                /*
                 * if (x == 0) { nlapiLogExecution('DEBUG', 'Check for
                 * Subsidiary segment custom field',
                 * nlapiGetContext().getSetting('SCRIPT',
                 * 'custscript_coupa_inv_subsseg'));
                 *
                 * if (nlapiGetContext().getSetting('SCRIPT',
                 * 'custscript_coupa_inv_subsseg')) { var subsidiaryId =
                 * nlapiSelectValue(accountNode,
                 * nlapiGetContext().getSetting('SCRIPT',
                 * 'custscript_coupa_inv_subsseg')).split(':'); if
                 * (dynamicAccounting == 'T') { nlapiLogExecution('DEBUG',
                 * 'Setting subsidiary ID to', subsidiaryId[1]);
                 * record.setFieldValue('subsidiary', subsidiaryId); }else {
                 * nlapiLogExecution('DEBUG', 'Setting subsidiary ID to',
                 * subsidiaryId[1]); record.setFieldValue('subsidiary',
                 * subsidiaryId[1]); } } }
                 */

                // check for Coupa order line
                if (nlapiSelectValue(invoiceLineNodes[x], 'order-header-num')
                    && nlapiSelectValue(invoiceLineNodes[x],
                        'order-line-num')) {
                    var poheadernum = nlapiSelectValue(invoiceLineNodes[x],
                        'order-header-num');
                    var polinenum = nlapiSelectValue(invoiceLineNodes[x],
                        'order-line-num');
                    record
                        .setCurrentLineItemValue('expense',
                            'custcol_coupaponum', poheadernum + '-'
                            + polinenum);
                }

                record.setCurrentLineItemValue('expense', 'memo',
                    nlapiSelectValue(invoiceLineNodes[x], 'description'));

                /*if ((i == 0) && (x == 0)) old code nib-61
                    totalcalcamount = parseFloat(adjlineamount);
                else
                    totalcalcamount = parseFloat(totalcalcamount)
                        + parseFloat(adjlineamount);*/

                //if (x == 0){//nib-61
                if ((i == 0) && (x == 0)){//MD
                    if (nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_send_taxcode')
                        && (nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_send_taxcode') == 'T'))
						{
                       	 	totalcalcamount = parseFloat(adjlineamount)
                            	+ parseFloat(linecharge);

								headerlinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * totalheaderlinecharge;
								totalcalcheaderlinecharge = parseFloat(headerlinecharge);

								if (shippingChargeWithTaxCode)
								{
									shippinglinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * shippingamount;
									totalcalcshippinglinecharge = parseFloat(shippinglinecharge);
								}

								if (handlingChargeWithTaxCode)
								{
									handlinglinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * handlingamount;
									totalcalchandlinglinecharge = parseFloat(handlinglinecharge);
								}

								if (miscChargeWithTaxCode)
								{
									misclinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * miscamount;
									totalcalcmisclinecharge = parseFloat(misclinecharge);
								}
						}
                    	else
						{
                        	totalcalcamount = parseFloat(adjlineamount);
						}
                } else {
                    if (nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_send_taxcode')
                        && (nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_send_taxcode') == 'T'))
					{
                        totalcalcamount = parseFloat(totalcalcamount)
                            + parseFloat(adjlineamount)
                            + parseFloat(linecharge);

							headerlinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * totalheaderlinecharge;
							totalcalcheaderlinecharge = parseFloat(totalcalcheaderlinecharge) + parseFloat(headerlinecharge);

							if (shippingChargeWithTaxCode)
							{
								shippinglinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * shippingamount;
								totalcalcshippinglinecharge = parseFloat(totalcalcshippinglinecharge) + parseFloat(shippinglinecharge);
							}

							if (handlingChargeWithTaxCode)
							{
								handlinglinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * handlingamount;
								totalcalchandlinglinecharge = parseFloat(totalcalchandlinglinecharge) + parseFloat(handlinglinecharge);
							}

							if (miscChargeWithTaxCode)
							{
								misclinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * miscamount;
								totalcalcmisclinecharge = parseFloat(totalcalcmisclinecharge) + parseFloat(misclinecharge);
							}
                    }
					else
					{
                        totalcalcamount = parseFloat(totalcalcamount)
                            + parseFloat(adjlineamount);
					}
                }

                totalcalcamount = totalcalcamount.toFixed(2);
                if (nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_send_taxcode')
                    && (nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_send_taxcode') == 'T'))
				{
					totalcalcheaderlinecharge = totalcalcheaderlinecharge.toFixed(2);

					if (shippingChargeWithTaxCode)
					{
						totalcalcshippinglinecharge = totalcalcshippinglinecharge.toFixed(2);
					}

					if (handlingChargeWithTaxCode)
					{
						totalcalchandlinglinecharge = totalcalchandlinglinecharge.toFixed(2);
					}

					if (miscChargeWithTaxCode)
					{
						totalcalcmisclinecharge = totalcalcmisclinecharge.toFixed(2);
					}
				}

                // nlapiLogExecution('DEBUG', 'Invoice Line details ', 'Invoice
                // Line ' + x + ' SplitLine = ' + i + ' adjlineamount = ' +
                // adjlineamount);
				var roundinglinechargeerror = 0;
				var roundingshippingchargeerror = 0;
				var roundinghandlingchargeerror = 0;
				var roundingmiscchargeerror = 0;

                if ((x == invoiceLineNodes.length - 1)
                    && (i == accountallocations.length - 1)) {
                    var roundingerror = totalheaderamount - totalcalcamount;

					roundinglinechargeerror = totalheaderlinecharge - totalcalcheaderlinecharge;

					if (shippingChargeWithTaxCode)
					{
						roundingshippingchargeerror = shippingamount - totalcalcshippinglinecharge;
					}

					if (handlingChargeWithTaxCode)
					{
						roundinghandlingchargeerror = handlingamount - totalcalchandlinglinecharge;
					}

					if (miscChargeWithTaxCode)
					{
						roundingmiscchargeerror = miscamount - totalcalcmisclinecharge;
					}

                    /*
                     * nlapiLogExecution('DEBUG', 'Rounding Error Details ',
                     * 'RoundingError = ' + roundingerror + ' totalheaderamount = ' +
                     * totalheaderamount + ' totalcalcamount = ' +
                     * totalcalcamount);
                     */
                    if (roundingerror) {
                        roundingerror = Math
                                .round(parseFloat(roundingerror) * 100) / 100;
                        adjlineamount = parseFloat(adjlineamount)
                            + roundingerror;
                    }
	                if (nlapiGetContext().getSetting('SCRIPT',
	                        'custscript_coupa_inv_send_taxcode')
	                    && (nlapiGetContext().getSetting('SCRIPT',
	                        'custscript_coupa_inv_send_taxcode') == 'T'))
					{
                			if (roundinglinechargeerror) {
                    			roundinglinechargeerror = (Math.round(parseFloat(roundinglinechargeerror) * 100) / 100);

                        		headerlinecharge = headerlinecharge + roundinglinechargeerror;

								nlapiLogExecution('DEBUG', 'Rounding Percent Error Details ',
	                    			'RoundingPercentError = ' + roundinglinechargeerror
	                    			+ ' headerlinecharge = ' + headerlinecharge);
                    			}
								if (shippingChargeWithTaxCode)
								{
		                			if (roundingshippingchargeerror) {
		                    			roundingshippingchargeerror = (Math.round(parseFloat(roundingshippingchargeerror) * 100) / 100);

		                        		shippinglinecharge = shippinglinecharge + roundingshippingchargeerror;

										nlapiLogExecution('DEBUG', 'Rounding Percent Error Details ',
			                    			'RoundingPercentError = ' + roundingshippingchargeerror
			                    			+ ' shippinglinecharge = ' + shippinglinecharge);
		                    			}
								}

								if (handlingChargeWithTaxCode)
								{
		                			if (roundinghandlingchargeerror) {
		                    			roundinghandlingchargeerror = (Math.round(parseFloat(roundinghandlingchargeerror) * 100) / 100);

		                        		handlinglinecharge = handlinglinecharge + roundinghandlingchargeerror;

										nlapiLogExecution('DEBUG', 'Rounding Percent Error Details ',
			                    			'RoundingPercentError = ' + roundinghandlingchargeerror
			                    			+ ' handlinglinecharge = ' + handlinglinecharge);
		                    			}
								}

								if (miscChargeWithTaxCode)
								{
		                			if (roundingmiscchargeerror) {
		                    			roundingmiscchargeerror = (Math.round(parseFloat(roundingmiscchargeerror) * 100) / 100);

		                        		misclinecharge = misclinecharge + roundingmiscchargeerror;

										nlapiLogExecution('DEBUG', 'Rounding Percent Error Details ',
			                    			'RoundingPercentError = ' + roundingmiscchargeerror
			                    			+ ' misclinecharge = ' + misclinecharge);
		                    			}
								}
					}
                }
                record.setCurrentLineItemValue('expense', 'amount', Math
                    .abs(parseFloat(adjlineamount)));
                // check for custom fields on line level
                if (nlapiGetContext().getSetting('SCRIPT',
                        'custscript_customfield_crdt_line_count')) {
                    for (var y = 1; y <= nlapiGetContext().getSetting('SCRIPT',
                        'custscript_customfield_crdt_line_count'); y++) {
                        if (nlapiGetContext().getSetting('SCRIPT',
                                'custscript_custfield_crdt_line' + y)) {
                            var custfield;
                            var valuetoinsert = null;
                            var textOrValue;
                            if (nlapiGetContext().getSetting('SCRIPT',
                                    'custscript_custfield_crdt_line' + y)
                                    .split(':')) {
                                custfield = nlapiGetContext().getSetting(
                                    'SCRIPT',
                                    'custscript_custfield_crdt_line' + y)
                                    .split(':');

                                if (custfield[4]) {
                                    valuetoinsert = custfield[4];
                                    nlapiLogExecution('DEBUG',
                                        'Valuetoinsert = ', valuetoinsert);
                                }

                                else {

                                    if (nlapiSelectValue(invoiceLineNodes[x],
                                            custfield[0]))
                                        valuetoinsert = nlapiSelectValue(
                                            invoiceLineNodes[x],
                                            custfield[0]);

                                    nlapiLogExecution('DEBUG', 'Line Custom '
                                        + y, 'Coupa field = '
                                        + nlapiSelectValue(
                                            invoiceLineNodes[x],
                                            custfield[0])
                                        + ' ValuetoInsert = '
                                        + valuetoinsert);

                                    if (custfield[2]
                                        && nlapiSelectValue(
                                            invoiceLineNodes[x],
                                            custfield[0])) {
                                        if (custfield[2] == 'Date') {
                                            valuetoinsert = ConvertCoupaDateToNetSuiteDate(nlapiSelectValue(
                                                invoiceLineNodes[x],
                                                custfield[0]));
                                            nlapiLogExecution(
                                                'DEBUG',
                                                'Line Custom Inside coupatype = date'
                                                + y,
                                                'Coupa field = '
                                                + nlapiSelectValue(
                                                    invoiceLineNodes[x],
                                                    custfield[0])
                                                + ' ValuetoInsert = '
                                                + valuetoinsert);
                                        }

                                        if (custfield[2] == 'Lookup') {

                                            valuetoinsert = nlapiSelectValue(
                                                invoiceLineNodes[x],
                                                custfield[0]
                                                + '/external-ref-num');
                                            nlapiLogExecution(
                                                'DEBUG',
                                                'Line Custom Inside coupatype = lookup'
                                                + y,
                                                'Coupa field = '
                                                + nlapiSelectValue(
                                                    invoiceLineNodes[x],
                                                    custfield[0])
                                                + ' ValuetoInsert = '
                                                + valuetoinsert);
                                        }

                                    }
                                    if (custfield[2] == 'Boolean') {
                                        valuetoinsert = nlapiSelectValue(
                                            invoiceLineNodes[x],
                                            custfield[0]);
                                        if (valuetoinsert == 't'
                                            || valuetoinsert == 'yes'
                                            || valuetoinsert == 'y'
                                            || valuetoinsert == 'true'
                                            || valuetoinsert == 'True') {
                                            valuetoinsert = 'T';
                                        } else {
                                            valuetoinsert = 'F';
                                        }
                                    }
                                    if (custfield[2] == 'Segment') {
                                        valuetoinsert = nlapiSelectValue(accountallocations[i], 'account/' + custfield[0]);
                                    }

                                }

                                textOrValue = 'Text';
                                if (custfield[3]) {
                                    textOrValue = custfield[3];
                                }

                                nlapiLogExecution('DEBUG', 'Line CustomField'
                                    + ' ' + y, " custfield0 = "
                                    + custfield[0] + " custfield1 = "
                                    + custfield[1] + " custfield2 = "
                                    + custfield[2] + " custfield3 = "
                                    + custfield[3] + " valuetoinsert = "
                                    + valuetoinsert);

                                if (valuetoinsert != null
                                    && valuetoinsert != undefined
                                    && valuetoinsert != 'None') {

                                    if (textOrValue == 'Text')
                                        record.setCurrentLineItemText(
                                            'expense', custfield[1],
                                            valuetoinsert);
                                    else
                                        record.setCurrentLineItemValue(
                                            'expense', custfield[1],
                                            valuetoinsert);
                                }

                            }
                        }
                    }
                }
                record.commitLineItem('expense');


	            if (headerlinecharge < 0) {//MD
	                headerlinecharge = headerlinecharge * -1;//MD
	            } //MD

				if (shippingChargeWithTaxCode)
				{
					if (shippinglinecharge < 0)
					{
						shippinglinecharge = shippinglinecharge * -1;//MD
					}
				}

				if (handlingChargeWithTaxCode)
				{
					if (handlinglinecharge < 0)
					{
						handlinglinecharge = handlinglinecharge * -1;//MD
					}
				}

				if (miscChargeWithTaxCode)
				{
					if (misclinecharge < 0)
					{
						misclinecharge = misclinecharge * -1;//MD
					}
				}

                if (headercharges
                      && nlapiGetContext().getSetting('SCRIPT',
                          'custscript_coupa_inv_send_taxcode')
                      && (nlapiGetContext().getSetting('SCRIPT',
                          'custscript_coupa_inv_send_taxcode') == 'T')) {
                    SetHeaderChargesasExpenseLine(record, invoice,
                        invoiceLineNodes[x], headerlinecharge.toFixed(2),
                        nlapiSelectNode(accountallocations[i], 'account'),nlapiSelectValue(accountallocations[i], 'amount'),
                        true,shippinglinecharge,handlinglinecharge,misclinecharge);
                }

            } // end of the for loop for split lines
        } // end of if loop for split accounting to True
        else {

            var lineamount = parseFloat(nlapiSelectValue(invoiceLineNodes[x],
                'total'));

			var linecharge = (parseFloat(lineamount) / parseFloat(taxabletotalamount))
                * totalheadercharges;

            var adjlineamount;

            if (linetax)
                adjlineamount = parseFloat(lineamount) + parseFloat(linecharge)
                    + parseFloat(linetax);
            else {
                // customization for nontaxable
                if (nlapiSelectValue(invoiceLineNodes[x], 'nontaxable') == 'true')
				{
                    adjlineamount = parseFloat(lineamount);
                }
				else
				{
                    adjlineamount = parseFloat(lineamount)
                        + parseFloat(linecharge);
				}
            }
            adjlineamount = parseFloat(adjlineamount).toFixed(2);



            /*
             * nlapiLogExecution('DEBUG', 'Line Details: ', 'linenum' + x + '
             * lineamount = ' + lineamount + ' linecharge = ' + linecharge +
             * 'taxabletotalamount = ' + taxabletotalamount + '
             * totalheadercharges = ' + totalheadercharges + ' adjlineamount = ' +
             * adjlineamount );
             */

            var accountNode = nlapiSelectNode(invoiceLineNodes[x], 'account');

            record.selectNewLineItem('expense');

            if (x == 0) {
                nlapiLogExecution('DEBUG',
                    'Check for Subsidiary segment custom field',
                    nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_subsseg'));

                if (nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_subsseg')) {
                    var subsidiaryId = nlapiSelectValue(
                        accountNode,
                        nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_subsseg')).split(':');

                    if (dynamicAccounting == 'T') {
                        nlapiLogExecution('DEBUG', 'Setting subsidiary ID to', subsidiaryId);
                        //Modified:NS enhancements: External ID enablement
                        if( param_useExternalID != null  && param_useExternalID == 'T')
                        {
                            var objInternalID = getInternalIDByExternalId(subsidiaryId,'subsidiary');
                            nlapiLogExecution('DEBUG','Setting internal ID step 1 == ', objInternalID);
                            record.setFieldValue('subsidiary', objInternalID);
                        } else {
                            record.setFieldValue('subsidiary', subsidiaryId);
                        }
                    } else {
                        nlapiLogExecution('DEBUG', 'Setting subsidiary ID to', subsidiaryId[1]);
                        //Modified:NS enhancements: External ID enablement
                        if( param_useExternalID != null  && param_useExternalID == 'T')
                        {
                            var objInternalID = getInternalIDByExternalId(subsidiaryId[1],'subsidiary');
                            nlapiLogExecution('DEBUG','Setting internal ID step 1 == ', objInternalID);
                            record.setFieldValue('subsidiary', objInternalID);
                        } else{
                            record.setFieldValue('subsidiary', subsidiaryId[1]);
                        }
                    }
                } else if (dynamicAccounting == 'T') {
                    var coaNode = nlapiSelectNode(accountNode, 'account-type');
                    var subsidiaryName = nlapiSelectValue(coaNode, 'name');
                    var subsidiaryID = '';
                    try {
                        subsidiaryID = getNetSuiteId('subsidiary',
                            subsidiaryName);
                    } catch (e) {
                        var error = e.getDetails();
                        if (error
                                .indexOf("The feature 'Subsidiaries' required to access this page is not enabled in this account") > -1) {
                            nlapiLogExecution('DEBUG',
                                "Subsidiaries not enabled",
                                'Skipping subsidiary set');
                        } else {
                            nlapiLogExecution('ERROR',
                                "Error on Subsidiary set", 'error');
                        }
                    }
                    if (subsidiaryID != '') {
                        nlapiLogExecution('DEBUG',
                            'Setting subsidiary ID from COA name to',
                            subsidiaryID);
                        record.setFieldValue('subsidiary', subsidiaryID);
                    }
                }
            }

            if (nlapiGetContext().getSetting('SCRIPT',
                    'custscript_coupa_inv_glactseg')) {
                var account;
                var accountnumber;
                var accountId;
                account = nlapiSelectValue(
                    accountNode,
                    nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_glactseg')).split(':');
                // act = account[0].split(' ');
                accountnumber = account[0];
                if (dynamicAccounting == 'T') {
                    accountId = getNetsuiteAccountId(account);
                } else {
                    accountId = getNetsuiteAccountId(accountnumber);
                }
                if (accountId != 'INVALID_ACCOUNT')
                    record.setCurrentLineItemValue('expense', 'account',
                        accountId);
                else {
                    nlapiLogExecution('ERROR',
                        'Processing Error - Invalid GL account',
                        'GL Account ='
                        + accountnumber
                        + ' Invoice Number = '
                        + nlapiSelectValue(invoice,
                            'invoice-number')
                        + ' Supplier Name = '
                        + nlapiSelectValue(supplierNode, 'name'));
                    nlapiSendEmail(
                        -5,
                        nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_email_notifications'),
                        nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_acccountname')
                        + ' Invoice Integration:Processing Error - Invalid GL account',
                        'GL Account ='
                        + accountnumber
                        + ' Invoice Number = '
                        + nlapiSelectValue(invoice,
                            'invoice-number')
                        + ' Supplier Name = '
                        + nlapiSelectValue(supplierNode, 'name'));
                    return;
                }
            }

            if (nlapiGetContext().getSetting('SCRIPT',
                    'custscript_coupa_inv_deptseg')) {
                var dept = nlapiSelectValue(
                    accountNode,
                    nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_deptseg')).split(':');
                if (dynamicAccounting == 'T') {
                    //Modified:NS enhancements: External ID enablement
                    if( param_useExternalID != null  && param_useExternalID == 'T')
                    {
                        var objInternalID = getInternalIDByExternalId(dept,'department');
                        nlapiLogExecution('DEBUG','Setting internal ID step 1 == ', objInternalID);
                        record.setCurrentLineItemValue('expense', 'department', objInternalID);
                    } else {
                        record.setCurrentLineItemValue('expense', 'department', dept);
                    }
                } else {
                    //Modified:NS enhancements: External ID enablement
                    if( param_useExternalID != null  && param_useExternalID == 'T')
                    {
                        var objInternalID = getInternalIDByExternalId(dept[1],'department');
                        nlapiLogExecution('DEBUG','Setting internal ID step 1 == ', objInternalID);
                        record.setCurrentLineItemValue('expense', 'department', objInternalID);
                    } else {
                        record.setCurrentLineItemValue('expense', 'department', dept[1]);
                    }
                }
            }

            if (nlapiGetContext().getSetting('SCRIPT',
                    'custscript_coupa_inv_classseg')) {
                var clss = nlapiSelectValue(
                    accountNode,
                    nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_classseg')).split(':');
                if (dynamicAccounting == 'T') {
                    //Modified:NS enhancements: External ID enablement
                    if( param_useExternalID != null  && param_useExternalID == 'T')
                    {
                        var objInternalID = getInternalIDByExternalId(clss,'classification');
                        nlapiLogExecution('DEBUG','Setting internal ID step 1 == ', objInternalID);
                        record.setCurrentLineItemValue('expense', 'class', objInternalID);
                    } else {
                        record.setCurrentLineItemValue('expense', 'class', clss);
                    }
                } else {
                    record.setCurrentLineItemValue('expense', 'class', clss[1]);
                }


            }

            if (nlapiGetContext().getSetting('SCRIPT',
                    'custscript_coupa_inv_locseg')) {
                var locId = nlapiSelectValue(
                    accountNode,
                    nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_locseg')).split(':');
                if (dynamicAccounting == 'T') {
                    //Modified:NS enhancements: External ID enablement
                    if( param_useExternalID != null  && param_useExternalID == 'T')
                    {
                        var objInternalID = getInternalIDByExternalId(locId,'location');
                        nlapiLogExecution('DEBUG','Setting internal ID step 1 == ', objInternalID);
                        record.setCurrentLineItemValue('expense', 'location', objInternalID);
                    } else {
                        record.setCurrentLineItemValue('expense', 'location', locId);
                    }
                } else {
                    //Modified:NS enhancements: External ID enablement
                    if( param_useExternalID != null  && param_useExternalID == 'T')
                    {
                        var objInternalID = getInternalIDByExternalId(locId[1],'location');
                        nlapiLogExecution('DEBUG','Setting internal ID step 1 == ', objInternalID);
                        record.setCurrentLineItemValue('expense', 'location', objInternalID);
                    } else {
                        record.setCurrentLineItemValue('expense', 'location', locId[1]);
                    }
                }
            }

            else if (nlapiGetContext().getSetting('SCRIPT',
                    'custscript_coupa_inv_loccust')) {
                var locId = getNetSuiteId('location', nlapiSelectValue(
                    invoiceLineNodes[x], nlapiGetContext().getSetting(
                        'SCRIPT', 'custscript_coupa_inv_loccust')));
                if (locId != 'INVALID_NAME')
                    record
                        .setCurrentLineItemValue('expense', 'location',
                            locId);
            }

            if (nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_send_taxcode') == 'T')
                {
                    nlapiLogExecution('DEBUG', 'if sendtaxcode set to true',
                        'lineamount = ' + adjlineamount);

                    // for the new tax feature

                    if (lineleveltaxation == 'false') // no line level tax
                    // scenrio - header
                    // level tax only
                    {
                        nlapiLogExecution(
                            'DEBUG',
                            'if sendtaxcode set to true and header level tax only',
                            'lineamount = ' + adjlineamount);
                        if (nlapiSelectValue(invoice, 'tax-code/code')) {
                            var taxsplit = nlapiSelectValue(invoice,
                                'tax-code/code').split(':');
                            if (taxsplit[1]) {
                                record.setCurrentLineItemValue('expense',
                                    'taxcode', taxsplit[1]);
                            } else {
                                nlapiLogExecution(
                                    'ERROR',
                                    'Processing Error - Invalid Header taxcode',
                                    'TaxCode ='
                                    + nlapiSelectValue(invoice,
                                        'tax-code/code')
                                    + ' Invoice Number = '
                                    + nlapiSelectValue(invoice,
                                        'invoice-number')
                                    + ' Supplier Name = '
                                    + nlapiSelectValue(
                                        supplierNode, 'name'));
                            }

                        }
                    } // end of no line level tax scenrio - header level tax
                    // only
                    else // line level tax scenario
                    {
                        nlapiLogExecution(
                            'DEBUG',
                            'if sendtaxcode set to true and line level tax',
                            'lineamount = ' + adjlineamount);

                        if (nlapiSelectValue(invoiceLineNodes[x],
                                'tax-code/code')) // line level tax and
                        // taxcode used
                        {
                            var taxsplit = nlapiSelectValue(
                                invoiceLineNodes[x], 'tax-code/code')
                                .split(':');
                            if (taxsplit[1]) {
                                record.setCurrentLineItemValue('expense',
                                    'taxcode', taxsplit[1]);
                                nlapiLogExecution(
                                    'DEBUG',
                                    'if sendtaxcode set to true and linelevel tax and setting tax code to',
                                    'TaxCode = ' + taxsplit[1]
                                    + ' lineamount = '
                                    + adjlineamount);
                            } else {
                                nlapiLogExecution('ERROR',
                                    'Processing Error - Invalid taxcode',
                                    'TaxCode ='
                                    + nlapiSelectValue(
                                        invoiceLineNodes[x],
                                        'tax-code/code')
                                    + ' Invoice Number = '
                                    + nlapiSelectValue(invoice,
                                        'invoice-number')
                                    + ' Supplier Name = '
                                    + nlapiSelectValue(
                                        supplierNode, 'name'));
                            }
                        } // end of line level tax and taxcode used

                        else if (nlapiSelectValue(invoiceLineNodes[x],
                                'tax-amount')) // line level tax and only
                        // taxamount no taxcode
                        {

                            linetax = parseFloat(nlapiSelectValue(
                                invoiceLineNodes[x], 'tax-amount'));

                            if (linetax) {

                                splitlinetax = (parseFloat(lineamount) / parseFloat(invoicelineamount))
                                    * linetax;
                                totalheaderamount = parseFloat(totalheaderamount)
                                    + parseFloat(splitlinetax);
                                // adjlineamount = parseFloat(lineamount) +
                                // parseFloat(linecharge) + parseFloat(linetax);
                                adjlineamount = parseFloat(lineamount)
                                    + parseFloat(splitlinetax);
                            }

                        } // end of line level tax and only taxamount no
                        // taxcode

                    } // end of line level tax scenario

                } // end of for the new tax feature

                else // Need to check for backward compatibility
                {

                    nlapiLogExecution('DEBUG', 'if sendtaxcode set to false',
                        'lineamount = ' + adjlineamount);
                    if (linetax) {
                        splitlinetax = (parseFloat(lineamount) / parseFloat(invoicelineamount))
                            * linetax;
                          adjlineamount = parseFloat(lineamount)
                              + parseFloat(linecharge)
                              + parseFloat(splitlinetax);
					  /*
                        adjlineamount = parseFloat(lineamount)
                            + parseFloat(splitlinetax);
							headertaxcharges = true;
					  */
                    } else {
                        // customization for nontaxable
                        if (nlapiSelectValue(invoiceLineNodes[x], 'nontaxable') == 'true')
						{
                            adjlineamount = parseFloat(lineamount);
						}
                        else
						{
                              adjlineamount = parseFloat(lineamount)
                                  + parseFloat(linecharge);
						 /*
							  adjlineamount = parseFloat(lineamount);
  							 headertaxcharges = true;
						   */
						}
                    }

                }

                adjlineamount = parseFloat(adjlineamount).toFixed(2);
            /*
             * if (x == 0) { //nlapiLogExecution('DEBUG', 'Check for Subsidiary
             * segment custom field', nlapiGetContext().getSetting('SCRIPT',
             * 'custscript_coupa_inv_subsseg'));
             *
             * if (nlapiGetContext().getSetting('SCRIPT',
             * 'custscript_coupa_inv_subsseg')) { var subsidiaryId =
             * nlapiSelectValue(accountNode,
             * nlapiGetContext().getSetting('SCRIPT',
             * 'custscript_coupa_inv_subsseg')).split(':'); if
             * (dynamicAccounting == 'T') { nlapiLogExecution('DEBUG', 'Setting
             * subsidiary ID to', subsidiaryId[1]);
             * record.setFieldValue('subsidiary', subsidiaryId); }else {
             * nlapiLogExecution('DEBUG', 'Setting subsidiary ID to',
             * subsidiaryId[1]); record.setFieldValue('subsidiary',
             * subsidiaryId[1]); } } }
             */

            nlapiLogExecution('DEBUG', 'Adjusted line amount is '
                + adjlineamount);

            /* check for Coupa order line */
            if (nlapiSelectValue(invoiceLineNodes[x], 'order-header-num')
                && nlapiSelectValue(invoiceLineNodes[x], 'order-line-num')) {
                var poheadernum = nlapiSelectValue(invoiceLineNodes[x],
                    'order-header-num');
                var polinenum = nlapiSelectValue(invoiceLineNodes[x],
                    'order-line-num');
                record.setCurrentLineItemValue('expense', 'custcol_coupaponum',
                    poheadernum + '-' + polinenum);
            }

            record.setCurrentLineItemValue('expense', 'memo', nlapiSelectValue(
                invoiceLineNodes[x], 'description'));

            /*if (x == 0) old code
                totalcalcamount = parseFloat(adjlineamount);
            else
                totalcalcamount = parseFloat(totalcalcamount)
                    + parseFloat(adjlineamount);*/

            if (x == 0){//nib-61
            //if ((i == 0) && (x == 0)){//MD
                    if (nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_send_taxcode')
                        && (nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_send_taxcode') == 'T'))
					{
                        totalcalcamount = parseFloat(adjlineamount)
                            + parseFloat(linecharge);

						headerlinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * totalheaderlinecharge;
						totalcalcheaderlinecharge = parseFloat(headerlinecharge);

						if (shippingChargeWithTaxCode)
						{
							shippinglinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * shippingamount;
							totalcalcshippinglinecharge = parseFloat(shippinglinecharge);
						}
						if (handlingChargeWithTaxCode)
						{
							handlinglinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * handlingamount;
							totalcalchandlinglinecharge = parseFloat(handlinglinecharge);
						}
						if (miscChargeWithTaxCode)
						{
							misclinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * miscamount;
							totalcalcmisclinecharge = parseFloat(misclinecharge);
						}
					}
                    else
					{
                        totalcalcamount = parseFloat(adjlineamount);
					}
                } else {
                    if (nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_send_taxcode')
                        && (nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_send_taxcode') == 'T'))
					{
                        totalcalcamount = parseFloat(totalcalcamount)
                            + parseFloat(adjlineamount)
                            + parseFloat(linecharge);

							headerlinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * totalheaderlinecharge;
							totalcalcheaderlinecharge = parseFloat(totalcalcheaderlinecharge) + parseFloat(headerlinecharge);

							if (shippingChargeWithTaxCode)
							{
								shippinglinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * shippingamount;
								totalcalcshippinglinecharge = parseFloat(totalcalcshippinglinecharge) + parseFloat(shippinglinecharge);
							}

							if (handlingChargeWithTaxCode)
							{
								handlinglinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * handlingamount;
								totalcalchandlinglinecharge = parseFloat(totalcalchandlinglinecharge) + parseFloat(handlinglinecharge);
							}

							if (miscChargeWithTaxCode)
							{
								misclinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * miscamount;
								totalcalcmisclinecharge = parseFloat(totalcalcmisclinecharge) + parseFloat(misclinecharge);
							}
					}
                    else
					{
                        totalcalcamount = parseFloat(totalcalcamount)
                            + parseFloat(adjlineamount);
					}
                }

                totalcalcamount = totalcalcamount.toFixed(2);
                if (nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_send_taxcode')
                    && (nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_send_taxcode') == 'T'))
				{
					totalcalcheaderlinecharge = totalcalcheaderlinecharge.toFixed(2);

					if (shippingChargeWithTaxCode)
					{
						totalcalcshippinglinecharge = totalcalcshippinglinecharge.toFixed(2);
					}

					if (handlingChargeWithTaxCode)
					{
						totalcalchandlinglinecharge = totalcalchandlinglinecharge.toFixed(2);
					}

					if (miscChargeWithTaxCode)
					{
						totalcalcmisclinecharge = totalcalcmisclinecharge.toFixed(2);
					}
				}

			/*
            // nlapiLogExecution('DEBUG', 'Invoice Line details ', 'Line ' + x +
            // ' adjlineamount = ' + adjlineamount);
            //if (linecharge < 0) {//MD
            //    linecharge = linecharge * -1;//MD
            //}//MD
			*/

			var roundinglinechargeerror = 0;
			var roundingshippingchargeerror = 0;
			var roundinghandlingchargeerror = 0;
			var roundingmiscchargeerror = 0;

            if (x == invoiceLineNodes.length - 1) {
                var roundingerror = totalheaderamount - totalcalcamount;

				roundinglinechargeerror = totalheaderlinecharge - totalcalcheaderlinecharge;

				if (shippingChargeWithTaxCode)
				{
					roundingshippingchargeerror = shippingamount - totalcalcshippinglinecharge;
				}

				if (handlingChargeWithTaxCode)
				{
					roundinghandlingchargeerror = handlingamount - totalcalchandlinglinecharge;
				}

				if (miscChargeWithTaxCode)
				{
					roundingmiscchargeerror = miscamount - totalcalcmisclinecharge;
				}

                /*
                 * nlapiLogExecution('DEBUG', 'Rounding Error Details ',
                 * 'RoundingError = ' + roundingerror + ' totalheaderamount = ' +
                 * totalheaderamount + ' totalcalcamount = ' + totalcalcamount);
                 */
                if (roundingerror) {
                    roundingerror = Math.round(parseFloat(roundingerror) * 100) / 100;
                    adjlineamount = parseFloat(adjlineamount) + roundingerror;
                }
                if (nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_send_taxcode')
                    && (nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_send_taxcode') == 'T')) {
                				if (roundinglinechargeerror) {
                    				roundinglinechargeerror = (Math.round(parseFloat(roundinglinechargeerror) * 100) / 100);

                        			headerlinecharge = headerlinecharge + roundinglinechargeerror;

									nlapiLogExecution('DEBUG', 'Rounding Percent Error Details ',
	                    				'RoundingPercentError = ' + roundinglinechargeerror
	                    				 + ' headerlinecharge = ' + headerlinecharge);
                    			}
								if (shippingChargeWithTaxCode)
								{
		                			if (roundingshippingchargeerror) {
		                    			roundingshippingchargeerror = (Math.round(parseFloat(roundingshippingchargeerror) * 100) / 100);

		                        		shippinglinecharge = shippinglinecharge + roundingshippingchargeerror;

										nlapiLogExecution('DEBUG', 'Rounding Percent Error Details ',
			                    			'RoundingPercentError = ' + roundingshippingchargeerror
			                    			+ ' shippinglinecharge = ' + shippinglinecharge);
		                    			}
								}

								if (handlingChargeWithTaxCode)
								{
		                			if (roundinghandlingchargeerror) {
		                    			roundinghandlingchargeerror = (Math.round(parseFloat(roundinghandlingchargeerror) * 100) / 100);

		                        		handlinglinecharge = handlinglinecharge + roundinghandlingchargeerror;

										nlapiLogExecution('DEBUG', 'Rounding Percent Error Details ',
			                    			'RoundingPercentError = ' + roundinghandlingchargeerror
			                    			+ ' handlinglinecharge = ' + handlinglinecharge);
		                    			}
								}

								if (miscChargeWithTaxCode)
								{
		                			if (roundingmiscchargeerror) {
		                    			roundingmiscchargeerror = (Math.round(parseFloat(roundingmiscchargeerror) * 100) / 100);

		                        		misclinecharge = misclinecharge + roundingmiscchargeerror;

										nlapiLogExecution('DEBUG', 'Rounding Percent Error Details ',
			                    			'RoundingPercentError = ' + roundingmiscchargeerror
			                    			+ ' misclinecharge = ' + misclinecharge);
		                    			}
								}
				}

            }

            record.setCurrentLineItemValue('expense', 'amount', Math
                .abs(parseFloat(adjlineamount)));
            // check for custom fields on line level
            if (nlapiGetContext().getSetting('SCRIPT',
                    'custscript_customfield_crdt_line_count')) {
                for (var y = 1; y <= nlapiGetContext().getSetting('SCRIPT',
                    'custscript_customfield_crdt_line_count'); y++) {
                    if (nlapiGetContext().getSetting('SCRIPT',
                            'custscript_custfield_crdt_line' + y)) {
                        var custfield;
                        var valuetoinsert = null;
                        var textOrValue;
                        if (nlapiGetContext().getSetting('SCRIPT',
                                'custscript_custfield_crdt_line' + y)
                                .split(':')) {
                            custfield = nlapiGetContext().getSetting('SCRIPT',
                                'custscript_custfield_crdt_line' + y)
                                .split(':');

                            if (custfield[4]) {
                                valuetoinsert = custfield[4];
                                nlapiLogExecution('DEBUG', 'Valuetoinsert = ',
                                    valuetoinsert);
                            }

                            else {

                                if (nlapiSelectValue(invoiceLineNodes[x],
                                        custfield[0]))
                                    valuetoinsert = nlapiSelectValue(
                                        invoiceLineNodes[x], custfield[0]);

                                nlapiLogExecution('DEBUG', 'Line Custom ' + y,
                                    'Coupa field = '
                                    + nlapiSelectValue(
                                        invoiceLineNodes[x],
                                        custfield[0])
                                    + ' ValuetoInsert = '
                                    + valuetoinsert);

                                if (custfield[2]
                                    && nlapiSelectValue(
                                        invoiceLineNodes[x],
                                        custfield[0])) {
                                    if (custfield[2] == 'Date') {
                                        valuetoinsert = ConvertCoupaDateToNetSuiteDate(nlapiSelectValue(
                                            invoiceLineNodes[x],
                                            custfield[0]));
                                        nlapiLogExecution(
                                            'DEBUG',
                                            'Line Custom Inside coupatype = date'
                                            + y,
                                            'Coupa field = '
                                            + nlapiSelectValue(
                                                invoiceLineNodes[x],
                                                custfield[0])
                                            + ' ValuetoInsert = '
                                            + valuetoinsert);
                                    }

                                    if (custfield[2] == 'Lookup') {

                                        valuetoinsert = nlapiSelectValue(
                                            invoiceLineNodes[x],
                                            custfield[0]
                                            + '/external-ref-num');
                                        nlapiLogExecution(
                                            'DEBUG',
                                            'Line Custom Inside coupatype = lookup'
                                            + y,
                                            'Coupa field = '
                                            + nlapiSelectValue(
                                                invoiceLineNodes[x],
                                                custfield[0])
                                            + ' ValuetoInsert = '
                                            + valuetoinsert);
                                    }

                                }
                                if (custfield[2] == 'Segment') {
                                    valuetoinsert = nlapiSelectValue(invoiceLineNodes[x], 'account/' + custfield[0]);
                                }
                                if (custfield[2] == 'Boolean') {
                                    valuetoinsert = nlapiSelectValue(
                                        invoiceLineNodes[x], custfield[0]);
                                    if (valuetoinsert == 't'
                                        || valuetoinsert == 'yes'
                                        || valuetoinsert == 'y'
                                        || valuetoinsert == 'true'
                                        || valuetoinsert == 'True') {
                                        valuetoinsert = 'T';
                                    } else {
                                        valuetoinsert = 'F';
                                    }
                                }

                            }

                            textOrValue = 'Text';
                            if (custfield[3]) {
                                textOrValue = custfield[3];
                            }

                            nlapiLogExecution('DEBUG', 'Line CustomField' + ' '
                                + y, " custfield0 = " + custfield[0]
                                + " custfield1 = " + custfield[1]
                                + " custfield2 = " + custfield[2]
                                + " custfield3 = " + custfield[3]
                                + " valuetoinsert = " + valuetoinsert);

                            if (valuetoinsert != null
                                && valuetoinsert != undefined
                                && valuetoinsert != 'None') {

                                if (textOrValue == 'Text')
                                    record.setCurrentLineItemText('expense',
                                        custfield[1], valuetoinsert);
                                else
                                    record.setCurrentLineItemValue('expense',
                                        custfield[1], valuetoinsert);
                            }

                        }
                    }
                }
            }
            record.commitLineItem('expense');

            if (headerlinecharge < 0) {//MD
                headerlinecharge = headerlinecharge * -1;//MD
            } //MD

			if (shippingChargeWithTaxCode)
			{
				if (shippinglinecharge < 0)
				{
					shippinglinecharge = shippinglinecharge * -1;//MD
				}
			}

			if (handlingChargeWithTaxCode)
			{
				if (handlinglinecharge < 0)
				{
					handlinglinecharge = handlinglinecharge * -1;//MD
				}
			}

			if (miscChargeWithTaxCode)
			{
				if (misclinecharge < 0)
				{
					misclinecharge = misclinecharge * -1;//MD
				}
			}

            //nib-61
            if (headercharges
                  && nlapiGetContext().getSetting('SCRIPT',
                      'custscript_coupa_inv_send_taxcode')
                  && (nlapiGetContext().getSetting('SCRIPT',
                      'custscript_coupa_inv_send_taxcode') == 'T')) {
                SetHeaderChargesasExpenseLine(record, invoice,
                    invoiceLineNodes[x], headerlinecharge.toFixed(2), null, null, false,shippinglinecharge,handlinglinecharge,misclinecharge);
            }

        } // end of else --- i.e if not split accounting

    } // end of main for loop that goes through each invoice line

    try {
        record.setFieldValue('externalid', 'Coupa-VendorCredit-'
            + nlapiSelectValue(invoice, 'id'));

        record.setFieldValue('trandate',
            ConvertCoupaDateToNetSuiteDate(nlapiSelectValue(invoice,
                'invoice-date')));

        // set accounts payable account if passed as parameter to the script
        if (nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_actpayablenum')) {
            var apAccountId = getNetsuiteAccountId(nlapiGetContext()
                .getSetting('SCRIPT', 'custscript_coupa_inv_actpayablenum'));

            if (apAccountId != 'INVALID_ACCOUNT')
                record.setFieldValue('account', apAccountId);
        }

        // set the posting period
        var today = new Date();
        var postingPeriod = getMonthShortName(today.getMonth()) + ' '
            + today.getFullYear();
        var cutoffday = 5;
        if (nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_cutoffdate'))
            cutoffday = nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_cutoffdate');
        if (today.getDate() < cutoffday) {
            var nDate = nlapiSelectValue(invoice, 'invoice-date').split('T');
            var datesplit = nDate[0].split('-');
            var Nyear = datesplit[0];
            // var Nday = datesplit[2];
            var Nmonth = datesplit[1] - 1;

            if (today.getFullYear() > Nyear) {
                if (today.getMonth() == 0)
                    postingPeriod = getMonthShortName('11') + ' '
                        + (today.getFullYear() - 1);
                else
                    postingPeriod = getMonthShortName(today.getMonth() - 1)
                        + ' ' + today.getFullYear();
            }

            if (Nmonth < today.getMonth() && Nyear == today.getFullYear())
                postingPeriod = getMonthShortName(today.getMonth() - 1) + ' '
                    + today.getFullYear();
        }

        nlapiLogExecution('DEBUG', 'Calculated Posting Period is ',
            postingPeriod);

        //var postingPeriodId = getAccoutingPeriodNetsuiteId('accountingperiod', postingPeriod);
        var postingPeriodId = getAccoutingPeriodNetsuiteId('accountingperiod', getLIVNetSuitePeriodName(postingPeriod));


        // nlapiLogExecution('DEBUG', 'Posting Period: ', 'name = ' +
        // postingPeriod + ' Id = ' + postingPeriodId);

        record.setFieldValue('postingperiod', postingPeriodId);

        // set currency
        var curr = getNetsuiteCurrency('currency', nlapiSelectValue(invoice,
            'currency/code'));
        record.setFieldValue('currency', curr);

        record.setFieldValue('tranid', nlapiSelectValue(invoice,
            'invoice-number'));
        // add link back to invoice in Coupa
        if (nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_link_field')) {
            record.setFieldValue(nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_link_field'), nlapiGetContext()
                    .getSetting('SCRIPT', 'custscript_coupa_inv_url')
                + '/invoices/' + nlapiSelectValue(invoice, 'id'));
        }

        // add link back to invoiceimagescan in Coupa
        if (nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_image_link_field')
            && nlapiSelectValue(invoice, 'image-scan')) {
            // first get the correct url
            var imagescan = nlapiSelectValue(invoice, 'image-scan').split('/');
            var imagescanurl = nlapiGetContext().getSetting('SCRIPT',
                    'custscript_coupa_inv_url')
                + '/invoice/'
                + nlapiSelectValue(invoice, 'id')
                + '/image_scan/' + imagescan[5];
            record.setFieldValue(nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_image_link_field'), imagescanurl);
        }
        // Header custom fields
        if (nlapiGetContext().getSetting('SCRIPT',
                'custscript_customfield_crdt_header_count')) {
            for (var y = 1; y <= nlapiGetContext().getSetting('SCRIPT',
                'custscript_customfield_crdt_header_count'); y++) {

                // nlapiLogExecution('DEBUG','checking for header custom field'
                // + y, 'Customer header Field' + y + " = " +
                // nlapiGetContext().getSetting('SCRIPT',
                // 'custscript_custfieldheader' + y));

                if (nlapiGetContext().getSetting('SCRIPT',
                        'custscript_custfield_crdt_header' + y)) {
                    var custfield;
                    var valuetoinsert = 'None';
                    var textOrValue;
                    if (nlapiGetContext().getSetting('SCRIPT',
                            'custscript_custfield_crdt_header' + y).split(':')) {
                        custfield = nlapiGetContext().getSetting('SCRIPT',
                            'custscript_custfield_crdt_header' + y).split(
                            ':');

                        if (custfield[4])
                            valuetoinsert = custfield[4];
                        else {

                            if (nlapiSelectValue(invoice, custfield[0]))
                                valuetoinsert = nlapiSelectValue(invoice,
                                    custfield[0]);

                            if (custfield[2]
                                && nlapiSelectValue(invoice, custfield[0])) {
                                if (custfield[2] == 'Date')
                                    valuetoinsert = ConvertCoupaDateToNetSuiteDate(nlapiSelectValue(
                                        invoice, custfield[0]));

                                if (custfield[2] == 'Lookup') {
                                    valuetoinsert = nlapiSelectValue(invoice,
                                        custfield[0] + '/external-ref-num');
                                }

                            }
                            if (custfield[2] == 'Boolean') {
                                valuetoinsert = nlapiSelectValue(invoice,
                                    custfield[0]);
                                if (valuetoinsert == 't'
                                    || valuetoinsert == 'yes'
                                    || valuetoinsert == 'y'
                                    || valuetoinsert == 'true'
                                    || valuetoinsert == 'True') {
                                    valuetoinsert = 'T';
                                } else {
                                    valuetoinsert = 'F';
                                }
                            }
                        }

                        textOrValue = 'Text';
                        if (custfield[3]) {
                            textOrValue = custfield[3];
                        }

                        nlapiLogExecution('DEBUG', 'Credit Header CustomField'
                            + ' ' + y, " custfield0 = " + custfield[0]
                            + " custfield1 = " + custfield[1]
                            + " custfield2 = " + custfield[2]
                            + " custfield3 = " + custfield[3]
                            + " valuetoinsert = " + valuetoinsert);

                        if (valuetoinsert && valuetoinsert != 'None') {

                            if (textOrValue == 'Text')
                                record
                                    .setFieldText(custfield[1],
                                        valuetoinsert);
                            else
                                record.setFieldValue(custfield[1],
                                    valuetoinsert);
                        }

                    }
                }
            }
        }
        record.setFieldText('approvalstatus', 'Approved');
        nlapiSubmitRecord(record, true);
    } catch (e) {
        nlapiLogExecution('ERROR',
            'Processing Error - Unable to create vendor Credit',
            ' Invoice Number = '
            + nlapiSelectValue(invoice, 'invoice-number')
            + ' Supplier Name = '
            + nlapiSelectValue(supplierNode, 'name')
            + ' Error Description = ' + e.message);
        nlapiSendEmail(
            -5,
            nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_email_notifications'),
            nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_acccountname')
            + ' Invoice Integration:Processing Error - Unable to create vendor credit',
            'Invoice Number = '
            + nlapiSelectValue(invoice, 'invoice-number')
            + ' Supplier Name = '
            + nlapiSelectValue(supplierNode, 'name')
            + ' Error Description = ' + e.message);
        return;
    }

    nlapiLogExecution('AUDIT', 'Successfully created vendor Credit',
        ' Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number')
        + ' Supplier Name = '
        + nlapiSelectValue(supplierNode, 'name'));
    Setexportedtotrue(nlapiSelectValue(invoice, 'id'));
}

function CreateVendorBill(invoice) {
    var record;
    // vendorbill form config
    // syntax: coa_name1-form1:coa_name2-form2
    if (nlapiGetContext().getSetting('SCRIPT',
            'custscript_coupa_inv_vendorbillFormcnfg')) {
        var list = nlapiGetContext().getSetting('SCRIPT',
            'custscript_coupa_inv_vendorbillFormcnfg').split(':');
        var vendorbillformhash = new Object();

        for (var i = 0; i < list.length; i++) {
            var keyvaluelist = list[i].split('-');
            vendorbillformhash[keyvaluelist[0]] = keyvaluelist[1];
        }
        nlapiLogExecution('DEBUG', 'Form id for'
            + nlapiSelectValue(invoice, 'account-type/name'),
            vendorbillformhash[nlapiSelectValue(invoice,
                'account-type/name')]);
//Added NetSuite Suggested create key value
        if (vendorbillformhash[nlapiSelectValue(invoice, 'account-type/name')])
            record = nlapiCreateRecord('vendorbill', {
                customform : vendorbillformhash[nlapiSelectValue(invoice,
                    'account-type/name')],
                recordmode : 'dynamic',
                ignorecache : true
            });
        else
            record = nlapiCreateRecord('vendorbill', {
                recordmode : 'dynamic',
                ignorecache : true
            });
    }

    else
        record = nlapiCreateRecord('vendorbill', {
            recordmode : 'dynamic',
            ignorecache : true
        });

    var lineleveltaxation = 'false';

    lineleveltaxation = nlapiSelectValue(invoice, 'line-level-taxation');
    record.setFieldText('approvalstatus', 'Approved');
    var dynamicAccounting = 'F';
    if (nlapiGetContext().getSetting('SCRIPT',
            'custscript_coupa_inv_dynamicaccts'))
        dynamicAccounting = nlapiGetContext().getSetting('SCRIPT',
            'custscript_coupa_inv_dynamicaccts');

    var shippingamount = parseFloat(nlapiSelectValue(invoice, 'shipping-amount'));
    var handlingamount = parseFloat(nlapiSelectValue(invoice, 'handling-amount'));
    var taxamount = parseFloat(nlapiSelectValue(invoice, 'tax-amount'));
    var miscamount = parseFloat(nlapiSelectValue(invoice, 'misc-amount'));

   // get all header level - shipping, handling, misc tax amount for further calculation


    var chargeLine = nlapiSelectNode(invoice, 'invoice-charges');
    var chargeLineNodes = new Array();

    chargeLineNodes = nlapiSelectNodes(chargeLine, 'invoice-charge');


    var shippingChargeTaxAmount = 0.0;
    var handlingChargeTaxAmount = 0.0;
    var miscChargeTaxAmount = 0.0;
    var chargesType = null;
    var shippingChargeTax = null;
    var handlingChargeTax = null;
    var miscChargeTax = null;
	var shippingChargeWithTaxCode = false;
	var handlingChargeWithTaxCode = false;
	var miscChargeWithTaxCode = false;
	var headerTaxCode = null;
    var shippingChargeTaxCode = null;
    var handlingChargeTaxCode = null;
    var miscChargeTaxCode = null;

	var totalheaderlinecharge = 0.0;
	var totalcalcheaderlinecharge = 0.0;
	var headerlinecharge = 0.0;

	// shipping charge
	var shippinglinecharge = 0.0;
	var totalcalcshippinglinecharge = 0.0;
	var totalshippingamount = 0.0;
	var totalcalcshippingamount = 0.0;

	// handling charge
	var handlinglinecharge = 0.0;
	var totalcalchandlinglinecharge = 0.0;
	var totalhandlingamount = 0.0;
	var totalcalchandlingamount = 0.0;

	// misc charge
	var misclinecharge = 0.0;
	var totalcalcmisclinecharge = 0.0;
	var totalmiscamount = 0.0;
	var totalcalcmiscamount = 0.0;


	headerTaxCode = nlapiSelectValue(invoice, 'tax-code/code');


	//start block of get all header level details

    for (var cnt = 0; cnt < chargeLineNodes.length; cnt++)
     {
        chargesType = nlapiSelectValue(chargeLineNodes[cnt], 'type')

         if(chargesType == 'InvoiceShippingCharge')
         {
             shippingChargeTaxAmount = nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/amount');

             if (nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/tax-code/code'))
             {
                 shippingChargeTax = nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/tax-code/code').split(':');
                 if (shippingChargeTax[1]) {

					 shippingChargeWithTaxCode = true;
					 shippingChargeTaxCode = shippingChargeTax[1];
                     nlapiLogExecution(
                         'DEBUG',
                         'Shipping tax and setting tax code to',
                         'TaxCode = ' + shippingChargeTax[1]
                         );
                 } else {
                     nlapiLogExecution('ERROR',
                         'Processing Error - Invalid Shipping taxcode',
                         'TaxCode ='
                         + nlapiSelectValue(
                             chargeLineNodes[cnt],
                             shippingChargeTax)
                         + ' Invoice Number = '
                         + nlapiSelectValue(invoice,
                             'invoice-number')
                         + ' Supplier Name = '
                         + nlapiSelectValue(
                             supplierNode, 'name'));
                 }


             }
 			else
 			{
				nlapiLogExecution('DEBUG', 'shippingamount else step',shippingamount);
				if (shippingamount != '' && shippingamount != null && shippingamount != 0.0)
				{
					nlapiLogExecution('DEBUG', 'shippingamount check',shippingamount);
					totalheaderlinecharge = parseFloat(totalheaderlinecharge) + parseFloat(shippingamount);

					nlapiLogExecution('DEBUG', 'shippingamount totalheaderlinecharge',totalheaderlinecharge);

					if (nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/amount') != '' && nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/amount') != null)
 					{
 						totalheaderlinecharge = parseFloat(totalheaderlinecharge) + parseFloat(nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/amount'));
 					}
				}
 			}
		 }
         if(chargesType == 'InvoiceHandlingCharge')
         {

             //linecharge = parseFloat(nlapiSelectValue(invoice, 'handling-amount'));

             handlingChargeTaxAmount = nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/amount');

             if (nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/tax-code/code')){
                 handlingChargeTax = nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/tax-code/code').split(':');

                 if (handlingChargeTax[1]) {

					 handlingChargeWithTaxCode = true;
					 handlingChargeTaxCode = handlingChargeTax[1];
                     nlapiLogExecution(
                         'DEBUG',
                         'Handling tax and setting tax code to',
                         'TaxCode = ' + handlingChargeTax[1]
                     );
                 } else {
                     nlapiLogExecution('ERROR',
                     'Processing Error - Invalid Handling taxcode',
                     'TaxCode ='
                     + nlapiSelectValue(
                         chargeLineNodes[cnt],
                         handlingChargeTax)
                     + ' Invoice Number = '
                     + nlapiSelectValue(invoice,
                         'invoice-number')
                     + ' Supplier Name = '
                     + nlapiSelectValue(
                         supplierNode, 'name'));
                 }

             }
			else
			{
				if (handlingamount != '' && handlingamount != null && handlingamount != 0.0)
				{
					totalheaderlinecharge = parseFloat(totalheaderlinecharge) + parseFloat(handlingamount);

					if (nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/amount') != '' && nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/amount') != null)
					{
						totalheaderlinecharge = parseFloat(totalheaderlinecharge) + parseFloat(nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/amount'));
					}
				}
			}

		 }
         if(chargesType == 'InvoiceMiscCharge')
         {
             miscChargeTaxAmount = nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/amount');

             if (nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/tax-code/code')){
                 miscChargeTax = nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/tax-code/code').split(':');
                 if (miscChargeTax[1]) {

					 	miscChargeWithTaxCode = true;
					 	miscChargeTaxCode = miscChargeTax[1];
                         //record.setCurrentLineItemValue('expense','taxcode', miscChargeTax[1]);
                         //record.setCurrentLineItemValue('expense', 'amount', miscamount2);
                         nlapiLogExecution(
                             'DEBUG',
                             'Misc tax and setting tax code to',
                             'TaxCode = ' + miscChargeTax[1]
                         );
                     } else {
                         nlapiLogExecution('ERROR',
                         'Processing Error - Invalid Misc taxcode',
                         'TaxCode ='
                         + nlapiSelectValue(
                             chargeLineNodes[cnt],
                             miscChargeTax)
                         + ' Invoice Number = '
                         + nlapiSelectValue(invoice,
                             'invoice-number')
                         + ' Supplier Name = '
                         + nlapiSelectValue(
                             supplierNode, 'name'));
                     }
             }
 			else
 			{
				if (miscamount != '' && miscamount != null && miscamount != 0.0)
				{
					totalheaderlinecharge = parseFloat(totalheaderlinecharge) + parseFloat(miscamount);

 					if (nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/amount') != '' && nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/amount') != null)
 					{
 						totalheaderlinecharge = parseFloat(totalheaderlinecharge) + parseFloat(nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/amount'));
 					}
				}
 			}
		 }
     }

     nlapiLogExecution('DEBUG', 'shippingChargeTaxAmt', shippingChargeTaxAmount);
     nlapiLogExecution('DEBUG', 'handlingChargeTaxAmt', handlingChargeTaxAmount);
     nlapiLogExecution('DEBUG', 'miscChargeTaxAmt', miscChargeTaxAmount);

	 if (shippingChargeTaxAmount == null || shippingChargeTaxAmount == '')
	 {
		 shippingChargeTaxAmount = 0;
	 }
	 if (handlingChargeTaxAmount == null || handlingChargeTaxAmount == '')
	 {
		 handlingChargeTaxAmount = 0;
	 }
	 if (miscChargeTaxAmount == null || miscChargeTaxAmount == '')
	 {
		 miscChargeTaxAmount = 0;
	 }

	var totalchargetypetaxcharges = parseFloat(shippingChargeTaxAmount) + parseFloat(handlingChargeTaxAmount) + parseFloat(miscChargeTaxAmount);

    var headertaxamount = parseFloat(taxamount) - parseFloat(totalchargetypetaxcharges);

	//end block of get all header level details

	if ((headerTaxCode == null || headerTaxCode == '') && lineleveltaxation == 'false')
	{
		totalheaderlinecharge = parseFloat(totalheaderlinecharge) + parseFloat(headertaxamount);
	}

	nlapiLogExecution('DEBUG', 'final headerlinecharge', totalheaderlinecharge);

   // end block for get all get all header level - shipping, handling, misc tax amount

    var supplierNode = nlapiSelectNode(invoice, 'supplier');
    nlapiLogExecution('DEBUG', 'SupplierName', nlapiSelectValue(supplierNode,
        'name'));

    if (nlapiSelectValue(supplierNode, 'number'))
        record
            .setFieldValue('entity', nlapiSelectValue(supplierNode,
                'number'));
    else
    // try setting supplier name instead on id
        record.setFieldText('entity', nlapiSelectValue(supplierNode, 'name'));

    var headercharges = false;
	var headertaxcharges = false;
    var totalheadercharges = 0;
	var totalheadertaxcharges = 0;
	var totalpercent = 1.0;
	var linepercent = 0.0
	var totalcalcpercent = 0.0;
	var isLastLine = 'false';

    totalheadercharges = parseFloat(shippingamount)
        + parseFloat(handlingamount) + parseFloat(miscamount);

    if (lineleveltaxation == 'false') {
        if (nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_send_taxcode')) {
            if (nlapiGetContext().getSetting('SCRIPT',
                    'custscript_coupa_inv_send_taxcode') == 'F')
                  totalheadercharges = parseFloat(totalheadercharges)
                      + parseFloat(taxamount);

	        else if ((nlapiGetContext().getSetting('SCRIPT',
                    'custscript_coupa_inv_send_taxcode') == 'T')
                && (nlapiSelectValue(invoice, 'tax-code/code') == null)) {

				/*
				totalheadercharges = parseFloat(totalheadercharges)
                    + parseFloat(taxamount);
				*/
					totalheadertaxcharges = parseFloat(taxamount) - parseFloat(totalchargetypetaxcharges);

					if (totalheadertaxcharges != 0 && totalheadertaxcharges != null && totalheadercharges != 0  && totalheadercharges != null)
						totalheadercharges = parseFloat(totalheadertaxcharges);

					if (totalheadertaxcharges != 0 && totalheadertaxcharges != null && (totalheadercharges == 0  || totalheadercharges == null))
						totalheadercharges = parseFloat(totalheadertaxcharges);

					if ((totalheadertaxcharges == 0 || totalheadertaxcharges == null) && totalheadercharges != 0 && totalheadercharges != null)
						totalheadercharges = parseFloat(totalheadercharges);

					if (totalheadertaxcharges != 0)
					   headertaxcharges = true;
            }

        } else
            totalheadercharges = parseFloat(totalheadercharges)
                + parseFloat(taxamount);

    }



    if (totalheadercharges != 0) /* CSOD Negative  Summary Charges fix */
        headercharges = true;

     nlapiLogExecution('DEBUG', 'headercharges = ',
     headercharges);

    var invoiceLine = nlapiSelectNode(invoice, 'invoice-lines');
    var invoiceLineNodes = new Array();

    invoiceLineNodes = nlapiSelectNodes(invoiceLine, 'invoice-line');

    // get total amount by adding the line amounts
    var totalamount = 0;
    var taxabletotalamount = 0;
	var linetaxtotalamount = 0;
	var linetotalamount = 0;

	for (var x = 0; x < invoiceLineNodes.length; x++) {
        if (nlapiSelectValue(invoiceLineNodes[x], 'nontaxable') != 'true')
            taxabletotalamount = parseFloat(taxabletotalamount)
                + parseFloat(nlapiSelectValue(invoiceLineNodes[x], 'total'));

        totalamount = parseFloat(totalamount)
            + parseFloat(nlapiSelectValue(invoiceLineNodes[x], 'total'));

		if (nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_send_taxcode') == 'F') {
            linetaxtotalamount = parseFloat(nlapiSelectValue(invoiceLineNodes[x],
                'tax-amount')) + parseFloat(linetaxtotalamount);
				}

		if (nlapiGetContext().getSetting('SCRIPT',
		                'custscript_coupa_inv_send_taxcode') == 'T') {
			linetotalamount = parseFloat(nlapiSelectValue(invoiceLineNodes[x],
				'total')) + parseFloat(linetotalamount);
						}
    }

    nlapiLogExecution('DEBUG', 'linetotalamount',
    linetotalamount);


    if (headercharges == true && linetaxtotalamount != 0)
	{
		totalheadercharges = parseFloat(totalheadercharges) + parseFloat(taxamount) - parseFloat(linetaxtotalamount);

	    nlapiLogExecution('DEBUG', 'totalheadercharges',
	    totalheadercharges);
	}

    var totalheaderamount = parseFloat(totalamount)
        + parseFloat(totalheadercharges);
    totalheaderamount = totalheaderamount.toFixed(3);
    var totalcalcamount = 0;

    nlapiLogExecution('DEBUG', 'Other Charges', 'Shipping = ' + shippingamount
        + ' Handling = ' + handlingamount + ' Taxamount = ' + taxamount
        + ' miscamount = ' + miscamount + ' totalheadercharges = '
        + totalheadercharges + ' totalheaderamount = ' + totalheaderamount);

    for (var x = 0; x < invoiceLineNodes.length; x++) {

        var linetax = 0;

        // check for the new tax feature
        if (nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_send_taxcode') == 'F') {
            linetax = parseFloat(nlapiSelectValue(invoiceLineNodes[x],
                'tax-amount'));

            if (linetax)
                totalheaderamount = parseFloat(totalheaderamount)
                    + parseFloat(linetax);
        }

        var invoicelineamount = parseFloat(nlapiSelectValue(
            invoiceLineNodes[x], 'total'));
        var splitaccounting = 'FALSE';
        var actalloc = nlapiSelectNode(invoiceLineNodes[x],
            'account-allocations');
        var accountallocations = new Array();
        accountallocations = nlapiSelectNodes(actalloc, 'account-allocation');
        if (accountallocations.length >= 1) {
            splitaccounting = 'TRUE';
            // nlapiLogExecution('DEBUG', 'Split accounting = ',
            // splitaccounting);
        }

        if (splitaccounting == 'TRUE') {
            for (var i = 0; i < accountallocations.length; i++) {
                var accountNode = nlapiSelectNode(accountallocations[i],
                    'account');
                // for each split line create a new expense line
                record.selectNewLineItem('expense');
                if (x == 0 && i == 0) {
                    nlapiLogExecution('DEBUG',
                        'Check for Subsidiary segment custom field',
                        nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_subsseg'));

                    if (nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_subsseg')) {
                        var subsidiaryId = nlapiSelectValue(
                            accountNode,
                            nlapiGetContext().getSetting('SCRIPT',
                                'custscript_coupa_inv_subsseg')).split(
                            ':');
                        if (dynamicAccounting == 'T') {
                            nlapiLogExecution('DEBUG', 'Setting subsidiary ID to', subsidiaryId);
                            //Modified:NS enhancements: External ID enablement
                            if( param_useExternalID != null  && param_useExternalID == 'T')
                            {
                                var objInternalID = getInternalIDByExternalId(subsidiaryId,'subsidiary');
                                nlapiLogExecution('DEBUG','Setting internal ID step 1 == ', objInternalID);
                                record.setFieldValue('subsidiary', objInternalID);
                            } else {
                                record.setFieldValue('subsidiary', subsidiaryId);
                            }
                        } else {
                            nlapiLogExecution('DEBUG', 'Setting subsidiary ID to', subsidiaryId[1]);
                            //Modified:NS enhancements: External ID enablement
                            if( param_useExternalID != null  && param_useExternalID == 'T')
                            {
                                var objInternalID = getInternalIDByExternalId(subsidiaryId[1],'subsidiary');
                                nlapiLogExecution('DEBUG','Setting internal ID step 1 == ', objInternalID);
                                record.setFieldValue('subsidiary', objInternalID);
                            } else{
                                record.setFieldValue('subsidiary', subsidiaryId[1]);
                            }
                        }
                    } else if (dynamicAccounting == 'T') {
                        var coaNode = nlapiSelectNode(accountNode,
                            'account-type');
                        var subsidiaryName = nlapiSelectValue(coaNode, 'name');
                        var subsidiaryID = '';
                        try {
                            subsidiaryID = getNetSuiteId('subsidiary',
                                subsidiaryName);
                        } catch (e) {
                            var error = e.getDetails();
                            if (error
                                    .indexOf("The feature 'Subsidiaries' required to access this page is not enabled in this account") > -1) {
                                nlapiLogExecution('DEBUG',
                                    "Subsidiaries not enabled",
                                    'Skipping subsidiary set');
                            } else {
                                nlapiLogExecution('ERROR',
                                    "Error on Subsidiary set", e);
                            }
                        }
                        if (subsidiaryID != '') {
                            nlapiLogExecution('DEBUG',
                                'Setting subsidiary ID from COA name to',
                                subsidiaryID);
                            record.setFieldValue('subsidiary', subsidiaryID);
                        }
                    }
                    if (nlapiSelectValue(invoiceLineNodes[x], 'description'))
                        record.setFieldValue('memo', nlapiSelectValue(
                            invoiceLineNodes[x], 'description'));
                }
                var lineamount = parseFloat(nlapiSelectValue(
                    accountallocations[i], 'amount'));
                
                //Fix Start
                if(taxabletotalamount == 0){
                	var linecharge = (parseFloat(lineamount) / 1)
                    * totalheadercharges;
                }else{
                	var linecharge = (parseFloat(lineamount) / parseFloat(taxabletotalamount))
                    * totalheadercharges;
                }
                //Fix End
                /*var linecharge = (parseFloat(lineamount) / parseFloat(taxabletotalamount))
                    * totalheadercharges;*/

                
				//var linecharge = 0;

                var splitlinetax;

                var adjlineamount = parseFloat(lineamount);
                var accountNode = nlapiSelectNode(accountallocations[i],
                    'account');

                if (nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_glactseg')) {
                    var account;
                    var accountId;
                    var accountnumber;
                    // var act;
                    account = nlapiSelectValue(
                        accountNode,
                        nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_glactseg'))
                        .split(':');
                    // act = account[0].split(' ');
                    accountnumber = account[0];
                    if (dynamicAccounting == 'T') {
                        accountId = getNetsuiteAccountId(account);
                    } else {
                        accountId = getNetsuiteAccountId(accountnumber);
                    }
                    if (accountId != 'INVALID_ACCOUNT')
                        record.setCurrentLineItemValue('expense', 'account',
                            accountId);
                    else {
                        nlapiLogExecution(
                            'ERROR',
                            'Processing Error - Invalid GL account',
                            'GL Account ='
                            + accountnumber
                            + ' Invoice Number = '
                            + nlapiSelectValue(invoice,
                                'invoice-number')
                            + ' Supplier Name = '
                            + nlapiSelectValue(supplierNode, 'name'));
                        nlapiSendEmail(
                            -5,
                            nlapiGetContext()
                                .getSetting('SCRIPT',
                                    'custscript_coupa_inv_email_notifications'),
                            nlapiGetContext().getSetting('SCRIPT',
                                'custscript_coupa_inv_acccountname')
                            + ' Invoice Integration:Processing Error - Invalid GL account',
                            'GL Account ='
                            + accountnumber
                            + ' Invoice Number = '
                            + nlapiSelectValue(invoice,
                                'invoice-number')
                            + ' Supplier Name = '
                            + nlapiSelectValue(supplierNode, 'name'));
                        return;
                    }
                }

                if (nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_deptseg')) {
                    var dept = nlapiSelectValue(
                        accountNode,
                        nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_deptseg')).split(':');
                    if (dynamicAccounting == 'T') {
                        //Modified:NS enhancements: External ID enablement
                        if( param_useExternalID != null  && param_useExternalID == 'T')
                        {
                            var objInternalID = getInternalIDByExternalId(dept,'department');
                            nlapiLogExecution('DEBUG','Setting internal ID step 1 == ', objInternalID);
                            record.setCurrentLineItemValue('expense', 'department', objInternalID);
                        } else {
                            record.setCurrentLineItemValue('expense', 'department', dept);
                        }
                    } else {
                        //Modified:NS enhancements: External ID enablement
                        if( param_useExternalID != null  && param_useExternalID == 'T')
                        {
                            var objInternalID = getInternalIDByExternalId(dept[1],'department');
                            nlapiLogExecution('DEBUG','Setting internal ID step 1 == ', objInternalID);
                            record.setCurrentLineItemValue('expense', 'department', objInternalID);
                        } else {
                            record.setCurrentLineItemValue('expense', 'department', dept[1]);
                        }
                    }
                }

                if (nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_classseg')) {
                    var clss = nlapiSelectValue(
                        accountNode,
                        nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_classseg'))
                        .split(':');
                    if (dynamicAccounting == 'T') {
                        //Modified:NS enhancements: External ID enablement
                        if( param_useExternalID != null  && param_useExternalID == 'T')
                        {
                            var objInternalID = getInternalIDByExternalId(clss,'classification');
                            nlapiLogExecution('DEBUG','Setting internal ID step 1 == ', objInternalID);
                            record.setCurrentLineItemValue('expense', 'class', objInternalID);
                        } else {
                            record.setCurrentLineItemValue('expense', 'class', clss);
                        }
                    } else {
                        record.setCurrentLineItemValue('expense', 'class', clss[1]);
                    }
                }

                if (nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_locseg')) {
                    var locId = nlapiSelectValue(
                        accountNode,
                        nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_locseg')).split(':');
                    if (dynamicAccounting == 'T') {
                        //Modified:NS enhancements: External ID enablement
                        if( param_useExternalID != null  && param_useExternalID == 'T')
                        {
                            var objInternalID = getInternalIDByExternalId(locId,'location');
                            nlapiLogExecution('DEBUG','Setting internal ID step 1 == ', objInternalID);
                            record.setCurrentLineItemValue('expense', 'location', objInternalID);
                        } else {
                            record.setCurrentLineItemValue('expense', 'location', locId);
                        }
                    } else {
                        //Modified:NS enhancements: External ID enablement
                        if( param_useExternalID != null  && param_useExternalID == 'T')
                        {
                            var objInternalID = getInternalIDByExternalId(locId[1],'location');
                            nlapiLogExecution('DEBUG','Setting internal ID step 1 == ', objInternalID);
                            record.setCurrentLineItemValue('expense', 'location', objInternalID);
                        } else {
                            record.setCurrentLineItemValue('expense', 'location', locId[1]);
                        }
                    }
                }

                else if (nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_loccust')) {
                    var locId = getNetSuiteId('location', nlapiSelectValue(
                        invoiceLineNodes[x], nlapiGetContext().getSetting(
                            'SCRIPT', 'custscript_coupa_inv_loccust')));
                    if (locId != 'INVALID_NAME')
                        record.setCurrentLineItemValue('expense', 'location',
                            locId);
                }

                if (nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_send_taxcode') == 'T') {
                    nlapiLogExecution('DEBUG', 'if sendtaxcode set to true',
                        'lineamount = ' + adjlineamount);

                    // for the new tax feature

                    if (lineleveltaxation == 'false') // no line level tax
                    // scenrio - header
                    // level tax only
                    {
                        nlapiLogExecution(
                            'DEBUG',
                            'if sendtaxcode set to true and header level tax only',
                            'lineamount = ' + adjlineamount);
                        if (nlapiSelectValue(invoice, 'tax-code/code')) {
                            var taxsplit = nlapiSelectValue(invoice,
                                'tax-code/code').split(':');
                            if (taxsplit[1]) {
                                record.setCurrentLineItemValue('expense',
                                    'taxcode', taxsplit[1]);
                            } else {
                                nlapiLogExecution(
                                    'ERROR',
                                    'Processing Error - Invalid Header taxcode',
                                    'TaxCode ='
                                    + nlapiSelectValue(invoice,
                                        'tax-code/code')
                                    + ' Invoice Number = '
                                    + nlapiSelectValue(invoice,
                                        'invoice-number')
                                    + ' Supplier Name = '
                                    + nlapiSelectValue(
                                        supplierNode, 'name'));
                            }

                        }
                    } // end of no line level tax scenrio - header level tax
                    // only
                    else // line level tax scenario
                    {
                        nlapiLogExecution(
                            'DEBUG',
                            'if sendtaxcode set to true and line level tax',
                            'lineamount = ' + adjlineamount);

                        if (nlapiSelectValue(invoiceLineNodes[x],
                                'tax-code/code')) // line level tax and
                        // taxcode used
                        {
                            var taxsplit = nlapiSelectValue(
                                invoiceLineNodes[x], 'tax-code/code')
                                .split(':');
                            if (taxsplit[1]) {
                                record.setCurrentLineItemValue('expense',
                                    'taxcode', taxsplit[1]);
                                nlapiLogExecution(
                                    'DEBUG',
                                    'if sendtaxcode set to true and linelevel tax and setting tax code to',
                                    'TaxCode = ' + taxsplit[1]
                                    + ' lineamount = '
                                    + adjlineamount);
                            } else {
                                nlapiLogExecution('ERROR',
                                    'Processing Error - Invalid taxcode',
                                    'TaxCode ='
                                    + nlapiSelectValue(
                                        invoiceLineNodes[x],
                                        'tax-code/code')
                                    + ' Invoice Number = '
                                    + nlapiSelectValue(invoice,
                                        'invoice-number')
                                    + ' Supplier Name = '
                                    + nlapiSelectValue(
                                        supplierNode, 'name'));
                            }
                        } // end of line level tax and taxcode used

                        else if (nlapiSelectValue(invoiceLineNodes[x],
                                'tax-amount')) // line level tax and only
                        // taxamount no taxcode
                        {

                            linetax = parseFloat(nlapiSelectValue(
                                invoiceLineNodes[x], 'tax-amount'));

                            if (invoicelineamount) {
                            	//Fix Start
                            	if(invoicelineamount == 0){
                            		splitlinetax = (parseFloat(lineamount) / 1)
                                    * linetax;
                            	}else{
                            		splitlinetax = (parseFloat(lineamount) / parseFloat(invoicelineamount))
                                    * linetax;
                            	}
                                //Fix End
                            	/*splitlinetax = (parseFloat(lineamount) / parseFloat(invoicelineamount))
                                * linetax;*/
                                totalheaderamount = parseFloat(totalheaderamount)
                                    + parseFloat(splitlinetax);
                                // adjlineamount = parseFloat(lineamount) +
                                // parseFloat(linecharge) + parseFloat(linetax);
                                adjlineamount = parseFloat(lineamount)
                                    + parseFloat(splitlinetax);
                            }

                        } // end of line level tax and only taxamount no
                        // taxcode

                    } // end of line level tax scenario

                } // end of for the new tax feature

                else // Need to check for backward compatibility
                {

                    nlapiLogExecution('DEBUG', 'if sendtaxcode set to false',
                        'lineamount = ' + adjlineamount);
                    if (linetax) {
                    	// Fix Start
                    	if(invoicelineamount == 0){
                    		splitlinetax = (parseFloat(lineamount) / 1)
                            * linetax;
                    	}else{
                    		splitlinetax = (parseFloat(lineamount) / parseFloat(invoicelineamount))
                            * linetax;
                    	}
                    	//Fix End
                        /*splitlinetax = (parseFloat(lineamount) / parseFloat(invoicelineamount))
                            * linetax;*/
                          adjlineamount = parseFloat(lineamount)
                              + parseFloat(linecharge)
                              + parseFloat(splitlinetax);
                        /*adjlineamount = parseFloat(lineamount)
						+ parseFloat(splitlinetax);
  					     headertaxcharges = true;
						*/

                    } else {
                        // customization for nontaxable
                        if (nlapiSelectValue(invoiceLineNodes[x], 'nontaxable') == 'true')
						{
                            adjlineamount = parseFloat(lineamount);
						}
                        else
                        {
						      adjlineamount = parseFloat(lineamount)
                                  + parseFloat(linecharge);

						 /*
						 	adjlineamount = parseFloat(lineamount);
 					        	headertaxcharges = true;
						 */
						}
                    }

                }

                adjlineamount = adjlineamount.toFixed(2);

                /*
                 * if (x == 0) { nlapiLogExecution('DEBUG', 'Check for
                 * Subsidiary segment custom field',
                 * nlapiGetContext().getSetting('SCRIPT',
                 * 'custscript_coupa_inv_subsseg'));
                 *
                 * if (nlapiGetContext().getSetting('SCRIPT',
                 * 'custscript_coupa_inv_subsseg')) { var subsidiaryId =
                 * nlapiSelectValue(accountNode,
                 * nlapiGetContext().getSetting('SCRIPT',
                 * 'custscript_coupa_inv_subsseg')).split(':'); if
                 * (dynamicAccounting == 'T') { nlapiLogExecution('DEBUG',
                 * 'Setting subsidiary ID to', subsidiaryId[1]);
                 * record.setFieldValue('subsidiary', subsidiaryId); }else {
                 * nlapiLogExecution('DEBUG', 'Setting subsidiary ID to',
                 * subsidiaryId[1]); record.setFieldValue('subsidiary',
                 * subsidiaryId[1]); } } }
                 */

                // check for Coupa order line
                if (nlapiSelectValue(invoiceLineNodes[x], 'order-header-num')
                    && nlapiSelectValue(invoiceLineNodes[x],
                        'order-line-num')) {
                    var poheadernum = nlapiSelectValue(invoiceLineNodes[x],
                        'order-header-num');
                    var polinenum = nlapiSelectValue(invoiceLineNodes[x],
                        'order-line-num');
                    record
                        .setCurrentLineItemValue('expense',
                            'custcol_coupaponum', poheadernum + '-'
                            + polinenum);
                }

                record.setCurrentLineItemValue('expense', 'memo',
                    nlapiSelectValue(invoiceLineNodes[x], 'description'));

                /***************************************************************
                 * * old code
                 *
                 * if ((i == 0) && (x == 0)) { totalcalcamount =
                 * parseFloat(adjlineamount); } else { totalcalcamount =
                 * parseFloat(totalcalcamount) + parseFloat(adjlineamount); }
                 * end of old code **
                 **************************************************************/

                if ((i == 0) && (x == 0)) {
                    if (nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_send_taxcode')
                        && (nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_send_taxcode') == 'T'))
					{
                        totalcalcamount = parseFloat(adjlineamount)
                            + parseFloat(linecharge);

                        //Fix Start
                        if(totalamount == 0){
                        	headerlinecharge = (parseFloat(adjlineamount)/1) * totalheaderlinecharge;
                        }else{
                        	headerlinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * totalheaderlinecharge;
                        }
                        //Fix End
						/*headerlinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * totalheaderlinecharge;*/
						totalcalcheaderlinecharge = parseFloat(headerlinecharge);

						if (shippingChargeWithTaxCode)
						{
							//Fix Start
	                        if(totalamount == 0){
	                        	shippinglinecharge = (parseFloat(adjlineamount)/1) * shippingamount;
	                        }else{
	                        	shippinglinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * shippingamount;
	                        }
	                        //Fix End
							/*shippinglinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * shippingamount;*/
							totalcalcshippinglinecharge = parseFloat(shippinglinecharge);
						}

						if (handlingChargeWithTaxCode)
						{
							//Fix Start
	                        if(totalamount == 0){
	                        	handlinglinecharge = (parseFloat(adjlineamount)/1) * handlingamount;
	                        }else{
	                        	handlinglinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * handlingamount;
	                        }
	                        //Fix End
							/*handlinglinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * handlingamount;*/
							totalcalchandlinglinecharge = parseFloat(handlinglinecharge);
						}

						if (miscChargeWithTaxCode)
						{
							//Fix Start
	                        if(totalamount == 0){
	                        	misclinecharge = (parseFloat(adjlineamount)/1) * miscamount;
	                        }else{
	                        	misclinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * miscamount;
	                        }
	                        //Fix End
							/*misclinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * miscamount;*/
							totalcalcmisclinecharge = parseFloat(misclinecharge);
						}
					}
                    else
					{
                        totalcalcamount = parseFloat(adjlineamount);
					}
                } else {
                    if (nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_send_taxcode')
                        && (nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_send_taxcode') == 'T'))
					{
                        totalcalcamount = parseFloat(totalcalcamount)
                            + parseFloat(adjlineamount)
                            + parseFloat(linecharge);

                        //Fix Start
                        if(totalamount == 0){
                        	headerlinecharge = (parseFloat(adjlineamount)/1) * totalheaderlinecharge;
                        }else{
                        	headerlinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * totalheaderlinecharge;
                        }
                        //Fix End
						/*headerlinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * totalheaderlinecharge;*/
						totalcalcheaderlinecharge = parseFloat(totalcalcheaderlinecharge) + parseFloat(headerlinecharge);

						if (shippingChargeWithTaxCode)
						{
							//Fix Start
	                        if(totalamount == 0){
	                        	shippinglinecharge = (parseFloat(adjlineamount)/1) * shippingamount;
	                        }else{
	                        	shippinglinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * shippingamount;
	                        }
	                        //Fix End
							/*shippinglinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * shippingamount;*/
							totalcalcshippinglinecharge = parseFloat(totalcalcshippinglinecharge) + parseFloat(shippinglinecharge);
						}

						if (handlingChargeWithTaxCode)
						{
							//Fix Start
	                        if(totalamount == 0){
	                        	handlinglinecharge = (parseFloat(adjlineamount)/1) * handlingamount;
	                        }else{
	                        	handlinglinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * handlingamount;
	                        }
	                        //Fix End
							/*handlinglinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * handlingamount;*/
							totalcalchandlinglinecharge = parseFloat(totalcalchandlinglinecharge) + parseFloat(handlinglinecharge);
						}

						if (miscChargeWithTaxCode)
						{
							//Fix Start
	                        if(totalamount == 0){
	                        	misclinecharge = (parseFloat(adjlineamount)/1) * miscamount;
	                        }else{
	                        	misclinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * miscamount;
	                        }
	                        //Fix End
							/*misclinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * miscamount;*/
							totalcalcmisclinecharge = parseFloat(totalcalcmisclinecharge) + parseFloat(misclinecharge);
						}
					}
                    else
					{
                        totalcalcamount = parseFloat(totalcalcamount)
                            + parseFloat(adjlineamount);
					}
                }

                totalcalcamount = totalcalcamount.toFixed(2);
                if (nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_send_taxcode')
                    && (nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_send_taxcode') == 'T'))
				{
					totalcalcheaderlinecharge = totalcalcheaderlinecharge.toFixed(2);

					if (shippingChargeWithTaxCode)
					{
						totalcalcshippinglinecharge = totalcalcshippinglinecharge.toFixed(2);
					}

					if (handlingChargeWithTaxCode)
					{
						totalcalchandlinglinecharge = totalcalchandlinglinecharge.toFixed(2);
					}

					if (miscChargeWithTaxCode)
					{
						totalcalcmisclinecharge = totalcalcmisclinecharge.toFixed(2);
					}
				}

                // nlapiLogExecution('DEBUG', 'Invoice Line details ', 'Invoice
                // Line ' + x + ' SplitLine = ' + i + ' adjlineamount = ' +
                // adjlineamount);

                /***************************************************************
                 * old code *
                 *
                 * if ((x == invoiceLineNodes.length-1) && (i ==
                 * accountallocations.length-1)) { var roundingerror =
                 * totalheaderamount - totalcalcamount;
                 * //nlapiLogExecution('DEBUG', 'Rounding Error Details ',
                 * 'RoundingError = ' + roundingerror + // ' totalheaderamount = ' +
                 * totalheaderamount + ' totalcalcamount = ' + totalcalcamount);
                 * if (roundingerror) { roundingerror =
                 * Math.round(parseFloat(roundingerror)*100)/100; adjlineamount =
                 * parseFloat(adjlineamount) + roundingerror; } } old code **
                 **************************************************************/

                var roundingerror = 0;
				var roundinglinechargeerror = 0;
				var roundingshippingchargeerror = 0;
				var roundinghandlingchargeerror = 0;
				var roundingmiscchargeerror = 0;

                if ((x == invoiceLineNodes.length - 1)
                    && (i == accountallocations.length - 1)) {

                    nlapiLogExecution('DEBUG', 'Total Header Amount = '
                        + totalheaderamount + ' Calculated Amount = '
                        + totalcalcamount);
                    roundingerror = totalheaderamount - totalcalcamount;

					roundinglinechargeerror = totalheaderlinecharge - totalcalcheaderlinecharge;
					if (shippingChargeWithTaxCode)
					{
						roundingshippingchargeerror = shippingamount - totalcalcshippinglinecharge;
					}

					if (handlingChargeWithTaxCode)
					{
						roundinghandlingchargeerror = handlingamount - totalcalchandlinglinecharge;
					}

					if (miscChargeWithTaxCode)
					{
						roundingmiscchargeerror = miscamount - totalcalcmisclinecharge;
					}

                    if (roundingerror) {
                        roundingerror = Math
                                .round(parseFloat(roundingerror) * 100) / 100;

                        if (nlapiGetContext().getSetting('SCRIPT',
                                'custscript_coupa_inv_send_taxcode')
                            && (nlapiGetContext().getSetting('SCRIPT',
                                'custscript_coupa_inv_send_taxcode') == 'T')) {
                            linecharge = linecharge + roundingerror;
                        } else
                            adjlineamount = parseFloat(adjlineamount)
                                + roundingerror;
                    }

                    nlapiLogExecution('DEBUG', 'Rounding Error Details ',
                        'RoundingError = ' + roundingerror
                        + ' totalheaderamount = '
                        + totalheaderamount + ' totalcalcamount = '
                        + totalcalcamount
                        + ' Adjusted line amount = '
                        + adjlineamount);
                     if (nlapiGetContext().getSetting('SCRIPT',
                             'custscript_coupa_inv_send_taxcode')
                         && (nlapiGetContext().getSetting('SCRIPT',
                             'custscript_coupa_inv_send_taxcode') == 'T')) {
                 			if (roundinglinechargeerror) {
                     			roundinglinechargeerror = (Math.round(parseFloat(roundinglinechargeerror) * 100) / 100);

                         		headerlinecharge = headerlinecharge + roundinglinechargeerror;

 								nlapiLogExecution('DEBUG', 'Rounding Percent Error Details ',
 	                    			'RoundingPercentError = ' + roundinglinechargeerror
 	                    			+ ' headerlinecharge = ' + headerlinecharge);
                     			}
 								if (shippingChargeWithTaxCode)
 								{
 		                			if (roundingshippingchargeerror) {
 		                    			roundingshippingchargeerror = (Math.round(parseFloat(roundingshippingchargeerror) * 100) / 100);

 		                        		shippinglinecharge = shippinglinecharge + roundingshippingchargeerror;

 										nlapiLogExecution('DEBUG', 'Rounding Percent Error Details ',
 			                    			'RoundingPercentError = ' + roundingshippingchargeerror
 			                    			+ ' shippinglinecharge = ' + shippinglinecharge);
 		                    			}
 								}

 								if (handlingChargeWithTaxCode)
 								{
 		                			if (roundinghandlingchargeerror) {
 		                    			roundinghandlingchargeerror = (Math.round(parseFloat(roundinghandlingchargeerror) * 100) / 100);

 		                        		handlinglinecharge = handlinglinecharge + roundinghandlingchargeerror;

 										nlapiLogExecution('DEBUG', 'Rounding Percent Error Details ',
 			                    			'RoundingPercentError = ' + roundinghandlingchargeerror
 			                    			+ ' handlinglinecharge = ' + handlinglinecharge);
 		                    			}
 								}

 								if (miscChargeWithTaxCode)
 								{
 		                			if (roundingmiscchargeerror) {
 		                    			roundingmiscchargeerror = (Math.round(parseFloat(roundingmiscchargeerror) * 100) / 100);

 		                        		misclinecharge = misclinecharge + roundingmiscchargeerror;

 										nlapiLogExecution('DEBUG', 'Rounding Percent Error Details ',
 			                    			'RoundingPercentError = ' + roundingmiscchargeerror
 			                    			+ ' misclinecharge = ' + misclinecharge);
 		                    			}
 								}


		                 }

		                 nlapiLogExecution('DEBUG', 'Rounding Error Details ',
		                     'RoundingError = ' + roundingerror
		                     + ' totalheaderamount = ' + totalheaderamount
		                     + ' totalcalcamount = ' + totalcalcamount
		                     + ' Adjusted line amount = ' + adjlineamount);

                }

                nlapiLogExecution('DEBUG', 'before setting amount', 'amount = '
                    + parseFloat(adjlineamount));

                record.setCurrentLineItemValue('expense', 'amount',
                    parseFloat(adjlineamount));

                // check for custom fields on line level
                if (nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_custfield_line_cnt')) {
                    for (var y = 1; y <= nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_custfield_line_cnt'); y++) {
                        if (nlapiGetContext().getSetting('SCRIPT',
                                'custscript_coupa_inv_custfieldline' + y)) {
                            var custfield;
                            var valuetoinsert = null;
                            var textOrValue;
                            if (nlapiGetContext().getSetting('SCRIPT',
                                    'custscript_coupa_inv_custfieldline' + y)
                                    .split(':')) {
                                custfield = nlapiGetContext().getSetting(
                                    'SCRIPT',
                                    'custscript_coupa_inv_custfieldline'
                                    + y).split(':');

                                if (custfield[4])
                                    valuetoinsert = custfield[4];

                                else {

                                    if (nlapiSelectValue(invoiceLineNodes[x],
                                            custfield[0]))
                                        valuetoinsert = nlapiSelectValue(
                                            invoiceLineNodes[x],
                                            custfield[0]);

                                    if (custfield[2]
                                        && nlapiSelectValue(
                                            invoiceLineNodes[x],
                                            custfield[0])) {
                                        if (custfield[2] == 'Date')
                                            valuetoinsert = ConvertCoupaDateToNetSuiteDate(nlapiSelectValue(
                                                invoiceLineNodes[x],
                                                custfield[0]));

                                        if (custfield[2] == 'Lookup') {
                                            valuetoinsert = nlapiSelectValue(
                                                invoiceLineNodes[x],
                                                custfield[0]
                                                + '/external-ref-num');
                                        }

                                    }
                                    if (custfield[2] == 'Boolean') {
                                        valuetoinsert = nlapiSelectValue(
                                            invoiceLineNodes[x],
                                            custfield[0]);
                                        if (valuetoinsert == 't'
                                            || valuetoinsert == 'yes'
                                            || valuetoinsert == 'y'
                                            || valuetoinsert == 'true'
                                            || valuetoinsert == 'True') {
                                            valuetoinsert = 'T';
                                        } else {
                                            valuetoinsert = 'F';
                                        }
                                    }
                                    if (custfield[2] == 'Segment') {
                                        valuetoinsert = nlapiSelectValue(accountallocations[i], 'account/' + custfield[0]);
                                    }
                                }

                                textOrValue = 'Text';
                                if (custfield[3]) {
                                    textOrValue = custfield[3];
                                }

                                nlapiLogExecution('DEBUG', 'Line CustomField'
                                    + ' ' + y, " custfield0 = "
                                    + custfield[0] + " custfield1 = "
                                    + custfield[1] + " custfield2 = "
                                    + custfield[2] + " custfield3 = "
                                    + custfield[3] + " valuetoinsert = "
                                    + valuetoinsert);

                                if (valuetoinsert) {

                                    if (textOrValue == 'Text')
                                        record.setCurrentLineItemText(
                                            'expense', custfield[1],
                                            valuetoinsert);
                                    else
                                        record.setCurrentLineItemValue(
                                            'expense', custfield[1],
                                            valuetoinsert);
                                }

                            }
                        }
                    }
                }

                record.commitLineItem('expense');

                if (headercharges
                      && nlapiGetContext().getSetting('SCRIPT',
                          'custscript_coupa_inv_send_taxcode')
                      && (nlapiGetContext().getSetting('SCRIPT',
                          'custscript_coupa_inv_send_taxcode') == 'T')) {
                    SetHeaderChargesasExpenseLine(record, invoice,
                        invoiceLineNodes[x], headerlinecharge.toFixed(2),
                        nlapiSelectNode(accountallocations[i], 'account'),nlapiSelectValue(accountallocations[i], 'amount'),
                        true,shippinglinecharge,handlinglinecharge,misclinecharge);
                }
            } // end of the for loop for split lines
        } // end of if loop for split accounting to True
        else {
			// non split accounting
         nlapiLogExecution('DEBUG', 'headercharges before calling non split accounting to False',
          headercharges);

            var taxcodeexists = false;
            if (nlapiSelectValue(invoice, 'tax-code/code')
                || nlapiSelectValue(invoiceLineNodes[x], 'tax-code/code'))
                taxcodeexists = true;
            var accountNode = nlapiSelectNode(invoiceLineNodes[x], 'account');
            if (x == 0) {
                nlapiLogExecution('DEBUG',
                    'Check for Subsidiary segment custom field',
                    nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_subsseg'));

                if (nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_subsseg')) {
                    var subsidiaryId = nlapiSelectValue(
                        accountNode,
                        nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_subsseg')).split(':');
                    if (dynamicAccounting == 'T') {
                        nlapiLogExecution('DEBUG', 'Setting subsidiary ID to', subsidiaryId);
                        //Modified:NS enhancements: External ID enablement
                        if( param_useExternalID != null  && param_useExternalID == 'T')
                        {
                            var objInternalID = getInternalIDByExternalId(subsidiaryId,'subsidiary');
                            nlapiLogExecution('DEBUG','Setting internal ID step 1 == ', objInternalID);
                            record.setFieldValue('subsidiary', objInternalID);
                        } else {
                            record.setFieldValue('subsidiary', subsidiaryId);
                        }
                    } else {
                        nlapiLogExecution('DEBUG', 'Setting subsidiary ID to', subsidiaryId[1]);
                        //Modified:NS enhancements: External ID enablement
                        if( param_useExternalID != null  && param_useExternalID == 'T')
                        {
                            var objInternalID = getInternalIDByExternalId(subsidiaryId[1],'subsidiary');
                            nlapiLogExecution('DEBUG','Setting internal ID step 1 == ', objInternalID);
                            record.setFieldValue('subsidiary', objInternalID);
                        } else{
                            record.setFieldValue('subsidiary', subsidiaryId[1]);
                        }
                    }
                } else if (dynamicAccounting == 'T') {
                    var coaNode = nlapiSelectNode(accountNode, 'account-type');
                    var subsidiaryName = nlapiSelectValue(coaNode, 'name');
                    var subsidiaryID = '';
                    try {
                        subsidiaryID = getNetSuiteId('subsidiary',
                            subsidiaryName);
                    } catch (e) {
                        var error = e.getDetails();
                        if (error
                                .indexOf("The feature 'Subsidiaries' required to access this page is not enabled in this account") > -1) {
                            nlapiLogExecution('DEBUG',
                                "Subsidiaries not enabled",
                                'Skipping subsidiary set');
                        } else {
                            nlapiLogExecution('ERROR',
                                "Error on Subsidiary set", 'error');
                        }
                    }
                    if (subsidiaryID != '') {
                        nlapiLogExecution('DEBUG',
                            'Setting subsidiary ID from COA name to',
                            subsidiaryID);
                        record.setFieldValue('subsidiary', subsidiaryID);
                    }
                }
                if (nlapiSelectValue(invoiceLineNodes[x], 'description'))
                    record.setFieldValue('memo', nlapiSelectValue(
                        invoiceLineNodes[x], 'description'));
            }
            record.selectNewLineItem('expense');

            var lineamount = parseFloat(nlapiSelectValue(invoiceLineNodes[x],
                'total'));
            //Fix Start
            if(taxabletotalamount == 0){
            	var linecharge = (parseFloat(lineamount) / 1)
                * totalheadercharges;
            }else{
            	var linecharge = (parseFloat(lineamount) / parseFloat(taxabletotalamount))
                * totalheadercharges;
            }
            //Fix End
            /*var linecharge = (parseFloat(lineamount) / parseFloat(taxabletotalamount))
                * totalheadercharges;*/

			//var linecharge = 0;

            nlapiLogExecution('DEBUG', 'linecharge =',
                linecharge + ' lineamount = ' + lineamount + ' taxabletotalamount = ' + taxabletotalamount + ' totalheadercharges = ' + totalheadercharges);
            // var adjlineamount = parseFloat(lineamount) +

            if (nlapiGetContext().getSetting('SCRIPT',
                    'custscript_coupa_inv_glactseg')) {
                var account;
                var accountnumber;
                var accountId;
                // var act;
                account = nlapiSelectValue(
                    accountNode,
                    nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_glactseg')).split(':');
                // act = account[0].split(' ');
                accountnumber = account[0];
                if (dynamicAccounting == 'T') {
                    accountId = getNetsuiteAccountId(account);
                } else {
                    accountId = getNetsuiteAccountId(accountnumber);
                }
                if (accountId != 'INVALID_ACCOUNT')
                    record.setCurrentLineItemValue('expense', 'account',
                        accountId);
                else {
                    nlapiLogExecution('ERROR',
                        'Processing Error - Invalid GL account',
                        'GL Account ='
                        + accountnumber
                        + ' Invoice Number = '
                        + nlapiSelectValue(invoice,
                            'invoice-number')
                        + ' Supplier Name = '
                        + nlapiSelectValue(supplierNode, 'name'));
                    nlapiSendEmail(
                        -5,
                        nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_email_notifications'),
                        nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_acccountname')
                        + ' Invoice Integration:Processing Error - Invalid GL account',
                        'GL Account ='
                        + accountnumber
                        + ' Invoice Number = '
                        + nlapiSelectValue(invoice,
                            'invoice-number')
                        + ' Supplier Name = '
                        + nlapiSelectValue(supplierNode, 'name'));
                    return;
                }
            }

            if (nlapiGetContext().getSetting('SCRIPT',
                    'custscript_coupa_inv_deptseg')) {
                var dept = nlapiSelectValue(
                    accountNode,
                    nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_deptseg')).split(':');
                if (dynamicAccounting == 'T') {
                    //Modified:NS enhancements: External ID enablement
                    if( param_useExternalID != null  && param_useExternalID == 'T')
                    {
                        var objInternalID = getInternalIDByExternalId(dept,'department');
                        nlapiLogExecution('DEBUG','Setting internal ID step 1 == ', objInternalID);
                        record.setCurrentLineItemValue('expense', 'department', objInternalID);
                    } else {
                        record.setCurrentLineItemValue('expense', 'department', dept);
                    }
                } else {
                    //Modified:NS enhancements: External ID enablement
                    if( param_useExternalID != null  && param_useExternalID == 'T')
                    {
                        var objInternalID = getInternalIDByExternalId(dept[1],'department');
                        nlapiLogExecution('DEBUG','Setting internal ID step 1 == ', objInternalID);
                        record.setCurrentLineItemValue('expense', 'department', objInternalID);
                    } else {
                        record.setCurrentLineItemValue('expense', 'department', dept[1]);
                    }
                }
            }

            if (nlapiGetContext().getSetting('SCRIPT',
                    'custscript_coupa_inv_classseg')) {
                var clss = nlapiSelectValue(
                    accountNode,
                    nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_classseg')).split(':');
                if (dynamicAccounting == 'T') {
                    //Modified:NS enhancements: External ID enablement
                    if( param_useExternalID != null  && param_useExternalID == 'T')
                    {
                        var objInternalID = getInternalIDByExternalId(clss,'classification');
                        nlapiLogExecution('DEBUG','Setting internal ID step 1 == ', objInternalID);
                        record.setCurrentLineItemValue('expense', 'class', objInternalID);
                    } else {
                        record.setCurrentLineItemValue('expense', 'class', clss);
                    }
                } else {
                    //Modified:NS enhancements: External ID enablement
                    if( param_useExternalID != null  && param_useExternalID == 'T')
                    {
                        var objInternalID = getInternalIDByExternalId(clss[1],'classification');
                        nlapiLogExecution('DEBUG','Setting internal ID step 1 == ', objInternalID);
                        record.setCurrentLineItemValue('expense', 'class', objInternalID);
                    } else {
                        record.setCurrentLineItemValue('expense', 'class', clss[1]);
                    }
                }
            }

            if (nlapiGetContext().getSetting('SCRIPT',
                    'custscript_coupa_inv_locseg')) {
                var locId = nlapiSelectValue(
                    accountNode,
                    nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_locseg')).split(':');
                if (dynamicAccounting == 'T') {
                    //Modified:NS enhancements: External ID enablement
                    if( param_useExternalID != null  && param_useExternalID == 'T')
                    {
                        var objInternalID = getInternalIDByExternalId(locId,'location');
                        nlapiLogExecution('DEBUG','Setting internal ID step 1 == ', objInternalID);
                        record.setCurrentLineItemValue('expense', 'location', objInternalID);
                    } else {
                        record.setCurrentLineItemValue('expense', 'location', locId);
                    }
                } else {
                    //Modified:NS enhancements: External ID enablement
                    if( param_useExternalID != null  && param_useExternalID == 'T')
                    {
                        var objInternalID = getInternalIDByExternalId(locId[1],'location');
                        nlapiLogExecution('DEBUG','Setting internal ID step 1 == ', objInternalID);
                        record.setCurrentLineItemValue('expense', 'location', objInternalID);
                    } else {
                        record.setCurrentLineItemValue('expense', 'location', locId[1]);
                    }
                }
            }

            else if (nlapiGetContext().getSetting('SCRIPT',
                    'custscript_coupa_inv_loccust')) {
                var locId = getNetSuiteId('location', nlapiSelectValue(
                    invoiceLineNodes[x], nlapiGetContext().getSetting(
                        'SCRIPT', 'custscript_coupa_inv_loccust')));
                if (locId != 'INVALID_NAME')
                    record
                        .setCurrentLineItemValue('expense', 'location',
                            locId);
            }

            // parseFloat(linecharge);
            var adjlineamount = parseFloat(lineamount);

            if (nlapiGetContext().getSetting('SCRIPT',
                    'custscript_coupa_inv_send_taxcode') == 'T') {
                nlapiLogExecution('DEBUG', 'if sendtaxcode set to true',
                    'lineamount = ' + adjlineamount);

                // for the new tax feature

                if (lineleveltaxation == 'false') // no line level tax scenrio
                // - header level tax only
                {
                    nlapiLogExecution(
                        'DEBUG',
                        'if sendtaxcode set to true and header level tax only',
                        'lineamount = ' + adjlineamount);
                    if (nlapiSelectValue(invoice, 'tax-code/code')) {
                        var taxsplit = nlapiSelectValue(invoice,
                            'tax-code/code').split(':');
                        if (taxsplit[1]) {
                            record.setCurrentLineItemValue('expense',
                                'taxcode', taxsplit[1]);
                        } else {
                            nlapiLogExecution(
                                'ERROR',
                                'Processing Error - Invalid Header taxcode',
                                'TaxCode ='
                                + nlapiSelectValue(invoice,
                                    'tax-code/code')
                                + ' Invoice Number = '
                                + nlapiSelectValue(invoice,
                                    'invoice-number')
                                + ' Supplier Name = '
                                + nlapiSelectValue(supplierNode,
                                    'name'));
                        }

                    }
                } // end of no line level tax scenrio - header level tax only
                else // line level tax scenario
                {
                    nlapiLogExecution('DEBUG',
                        'if sendtaxcode set to true and line level tax',
                        'lineamount = ' + adjlineamount);

                    if (nlapiSelectValue(invoiceLineNodes[x], 'tax-code/code')) // line
                    // level
                    // tax
                    // and
                    // taxcode
                    // used
                    {
                        var taxsplit = nlapiSelectValue(invoiceLineNodes[x],
                            'tax-code/code').split(':');
                        if (taxsplit[1]) {
                            record.setCurrentLineItemValue('expense',
                                'taxcode', taxsplit[1]);
                            nlapiLogExecution(
                                'DEBUG',
                                'if sendtaxcode set to true and linelevel tax and setting tax code to',
                                'TaxCode = ' + taxsplit[1]
                                + ' lineamount = ' + adjlineamount);
                        } else {
                            nlapiLogExecution('ERROR',
                                'Processing Error - Invalid taxcode',
                                'TaxCode ='
                                + nlapiSelectValue(
                                    invoiceLineNodes[x],
                                    'tax-code/code')
                                + ' Invoice Number = '
                                + nlapiSelectValue(invoice,
                                    'invoice-number')
                                + ' Supplier Name = '
                                + nlapiSelectValue(supplierNode,
                                    'name'));
                        }
                    } // end of line level tax and taxcode used

                    else if (nlapiSelectValue(invoiceLineNodes[x], 'tax-amount')) // line
                    // level
                    // tax
                    // and
                    // only
                    // taxamount
                    // no
                    // taxcode
                    {

                        linetax = parseFloat(nlapiSelectValue(
                            invoiceLineNodes[x], 'tax-amount'));

                        if (linetax) {
                            totalheaderamount = parseFloat(totalheaderamount)
                                + parseFloat(linetax);
                            // adjlineamount = parseFloat(lineamount) +
                            // parseFloat(linecharge) + parseFloat(linetax);
                            adjlineamount = parseFloat(lineamount)
                                + parseFloat(linetax);
                        }

                    } // end of line level tax and only taxamount no taxcode

                } // end of line level tax scenario

            } // end of for the new tax feature

            else // check for the new tax feature - ????? Need to check for
            // backward compatibility
            {
                nlapiLogExecution('DEBUG', 'if sendtaxcode set to false',
                    'lineamount = ' + adjlineamount);
                if (linetax)
				{
                       adjlineamount = parseFloat(lineamount)
                         + parseFloat(linecharge) + parseFloat(linetax);

	          /*        adjlineamount = parseFloat(lineamount)
	                     + parseFloat(linetax);
					  headertaxcharges = true;
			  */
					}
                else {
                    // customization for nontaxable
                    if (nlapiSelectValue(invoiceLineNodes[x], 'nontaxable') == 'true') {
                        adjlineamount = parseFloat(lineamount);
						}
                    else
					{
                         adjlineamount = parseFloat(lineamount)
                             + parseFloat(linecharge);

				/*
						adjlineamount = parseFloat(lineamount);
 					    headertaxcharges = true;
				*/
                        nlapiLogExecution('DEBUG',
                        'After adjusting lineamount for linecharges',
                        'lineamount = ' + adjlineamount + ' linecharge = '
                        + linecharge);
					  }
                }

            }

            adjlineamount = adjlineamount.toFixed(2);

            nlapiLogExecution('DEBUG', 'Adjusted line amount is '
                + adjlineamount);
            /*
             * if (x == 0) { //nlapiLogExecution('DEBUG', 'Check for Subsidiary
             * segment custom field', nlapiGetContext().getSetting('SCRIPT',
             * 'custscript_coupa_inv_subsseg'));
             *
             * if (nlapiGetContext().getSetting('SCRIPT',
             * 'custscript_coupa_inv_subsseg')) {
             *
             * var subsidiaryId = nlapiSelectValue(accountNode,
             * nlapiGetContext().getSetting('SCRIPT',
             * 'custscript_coupa_inv_subsseg')).split(':');
             * //nlapiLogExecution('DEBUG', 'Setting subsidiary ID to',
             * subsidiaryId[1]); if (dynamicAccounting == 'T') {
             * nlapiLogExecution('DEBUG', 'Setting subsidiary ID to',
             * subsidiaryId[1]); record.setFieldValue('subsidiary',
             * subsidiaryId); }else { nlapiLogExecution('DEBUG', 'Setting
             * subsidiary ID to', subsidiaryId[1]);
             * record.setFieldValue('subsidiary', subsidiaryId[1]); } } }
             */

            /* check for Coupa order line */
            if (nlapiSelectValue(invoiceLineNodes[x], 'order-header-num')
                && nlapiSelectValue(invoiceLineNodes[x], 'order-line-num')) {
                var poheadernum = nlapiSelectValue(invoiceLineNodes[x],
                    'order-header-num');
                var polinenum = nlapiSelectValue(invoiceLineNodes[x],
                    'order-line-num');
                record.setCurrentLineItemValue('expense', 'custcol_coupaponum',
                    poheadernum + '-' + polinenum);
            }

            record.setCurrentLineItemValue('expense', 'memo', nlapiSelectValue(
                invoiceLineNodes[x], 'description'));

            // linecharge = linecharge.toFixed(2);

            if (x == 0) {
            //if ((i == 0) && (x == 0)) {//MD
                if (nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_send_taxcode')
                    && (nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_send_taxcode') == 'T'))
				{
                    totalcalcamount = parseFloat(adjlineamount)
                        + parseFloat(linecharge);

                    //Fix Start
                    if(totalamount == 0){
                    	headerlinecharge = (parseFloat(adjlineamount)/1) * totalheaderlinecharge;
                    }else{
                    	headerlinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * totalheaderlinecharge;
                    }
                    //Fix End
					/*headerlinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * totalheaderlinecharge;*/
					totalcalcheaderlinecharge = parseFloat(headerlinecharge);

					if (shippingChargeWithTaxCode)
					{
						//Fix Start
	                    if(totalamount == 0){
	                    	shippinglinecharge = (parseFloat(adjlineamount)/1) * shippingamount;
	                    }else{
	                    	shippinglinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * shippingamount;
	                    }
	                    //Fix End
						/*shippinglinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * shippingamount;*/
						totalcalcshippinglinecharge = parseFloat(shippinglinecharge);
					}

					if (handlingChargeWithTaxCode)
					{
						//Fix Start
	                    if(totalamount == 0){
	                    	handlinglinecharge = (parseFloat(adjlineamount)/1) * handlingamount;
	                    }else{
	                    	handlinglinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * handlingamount;
	                    }
	                    //Fix End
						/*handlinglinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * handlingamount;*/
						totalcalchandlinglinecharge = parseFloat(handlinglinecharge);
					}

					if (miscChargeWithTaxCode)
					{
						//Fix Start
	                    if(totalamount == 0){
	                    	misclinecharge = (parseFloat(adjlineamount)/1) * miscamount;
	                    }else{
	                    	misclinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * miscamount;
	                    }
	                    //Fix End
						/*misclinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * miscamount;*/
						totalcalcmisclinecharge = parseFloat(misclinecharge);
					}

                }
				else
				{
					//totalcalcamount = parseFloat(adjlineamount) + parseFloat(linecharge); //for headtaxcharges
                      totalcalcamount = parseFloat(adjlineamount);
				}

            } else {
                if (nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_send_taxcode')
                    && (nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_send_taxcode') == 'T'))
				{
                    totalcalcamount = parseFloat(totalcalcamount)
                        + parseFloat(adjlineamount)
						+ parseFloat(linecharge);

                    //Fix Start
                    if(totalamount == 0){
                    	headerlinecharge = (parseFloat(adjlineamount)/1) * totalheaderlinecharge;
                    }else{
                    	headerlinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * totalheaderlinecharge;
                    }
                    //Fix End
					/*headerlinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * totalheaderlinecharge;*/
					totalcalcheaderlinecharge = parseFloat(totalcalcheaderlinecharge) + parseFloat(headerlinecharge);

					if (shippingChargeWithTaxCode)
					{
						//Fix Start
	                    if(totalamount == 0){
	                    	shippinglinecharge = (parseFloat(adjlineamount)/1) * shippingamount;
	                    }else{
	                    	shippinglinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * shippingamount;
	                    }
	                    //Fix End
						/*shippinglinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * shippingamount;*/
						totalcalcshippinglinecharge = parseFloat(totalcalcshippinglinecharge) + parseFloat(shippinglinecharge);
					}

					if (handlingChargeWithTaxCode)
					{
						//Fix Start
	                    if(totalamount == 0){
	                    	handlinglinecharge = (parseFloat(adjlineamount)/1) * handlingamount;
	                    }else{
	                    	handlinglinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * handlingamount;
	                    }
	                    //Fix End
						/*handlinglinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * handlingamount;*/
						totalcalchandlinglinecharge = parseFloat(totalcalchandlinglinecharge) + parseFloat(handlinglinecharge);
					}

					if (miscChargeWithTaxCode)
					{
						//Fix Start
	                    if(totalamount == 0){
	                    	misclinecharge = (parseFloat(adjlineamount)/1) * miscamount;
	                    }else{
	                    	misclinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * miscamount;
	                    }
	                    //Fix End
						/*misclinecharge = (parseFloat(adjlineamount)/parseFloat(totalamount)) * miscamount;*/
						totalcalcmisclinecharge = parseFloat(totalcalcmisclinecharge) + parseFloat(misclinecharge);
					}
				}
                else
                {
				    //totalcalcamount = parseFloat(totalcalcamount)
                    //    + parseFloat(adjlineamount) + parseFloat(linecharge); //for headtaxcharges
                    totalcalcamount = parseFloat(totalcalcamount)
                        + parseFloat(adjlineamount);
				}
            }

            totalcalcamount = totalcalcamount.toFixed(2);
            if (nlapiGetContext().getSetting('SCRIPT',
                    'custscript_coupa_inv_send_taxcode')
                && (nlapiGetContext().getSetting('SCRIPT',
                    'custscript_coupa_inv_send_taxcode') == 'T'))
			{
				totalcalcheaderlinecharge = totalcalcheaderlinecharge.toFixed(2);

				if (shippingChargeWithTaxCode)
				{
					totalcalcshippinglinecharge = totalcalcshippinglinecharge.toFixed(2);
				}

				if (handlingChargeWithTaxCode)
				{
					totalcalchandlinglinecharge = totalcalchandlinglinecharge.toFixed(2);
				}

				if (miscChargeWithTaxCode)
				{
					totalcalcmisclinecharge = totalcalcmisclinecharge.toFixed(2);
				}
			}


            // nlapiLogExecution('DEBUG', 'Invoice Line details ', 'Line ' + x +
            // ' adjlineamount = ' + adjlineamount);

            var roundingerror = 0;
			var roundinglinechargeerror = 0;
			var roundingshippingchargeerror = 0;
			var roundinghandlingchargeerror = 0;
			var roundingmiscchargeerror = 0;


            if (x == invoiceLineNodes.length - 1) {

				isLastLine = 'true';
                nlapiLogExecution('DEBUG', 'Total Header Amount = '
                    + totalheaderamount + ' Calculated Amount = '
                    + totalcalcamount);
                roundingerror = totalheaderamount - totalcalcamount;
				roundinglinechargeerror = totalheaderlinecharge - totalcalcheaderlinecharge;

				if (shippingChargeWithTaxCode)
				{
					roundingshippingchargeerror = shippingamount - totalcalcshippinglinecharge;
				}

				if (handlingChargeWithTaxCode)
				{
					roundinghandlingchargeerror = handlingamount - totalcalchandlinglinecharge;
				}

				if (miscChargeWithTaxCode)
				{
					roundingmiscchargeerror = miscamount - totalcalcmisclinecharge;
				}

                /*
                 * nlapiLogExecution('DEBUG', 'Rounding Error Details ',
                 * 'RoundingError = ' + roundingerror + ' totalheaderamount = ' +
                 * totalheaderamount + ' totalcalcamount = ' + totalcalcamount);
                 */
                if (roundingerror) {
                    roundingerror = Math.round(parseFloat(roundingerror) * 100) / 100;

                    if (nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_send_taxcode')
                        && (nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_send_taxcode') == 'T')) {
                        linecharge = linecharge + roundingerror;
                    } else
                        adjlineamount = parseFloat(adjlineamount)
                            + roundingerror;
                }
           	 	nlapiLogExecution('DEBUG', 'Total Percent = '
                + totalpercent + ' Calculated Percent = '
                + totalcalcpercent);


				nlapiLogExecution('DEBUG', 'Rounding Error Details ',
                'RoundingError = ' + roundingerror
                + ' totalheaderamount = ' + totalheaderamount
                + ' totalcalcamount = ' + totalcalcamount
                + ' Adjusted line amount = ' + adjlineamount);

                if (nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_send_taxcode')
                    && (nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_send_taxcode') == 'T')) {
                			if (roundinglinechargeerror) {
                    			roundinglinechargeerror = (Math.round(parseFloat(roundinglinechargeerror) * 100) / 100);

                        		headerlinecharge = headerlinecharge + roundinglinechargeerror;

								nlapiLogExecution('DEBUG', 'Rounding Percent Error Details ',
	                    			'RoundingPercentError = ' + roundinglinechargeerror
	                    			+ ' headerlinecharge = ' + headerlinecharge);
                    			}
								if (shippingChargeWithTaxCode)
								{
		                			if (roundingshippingchargeerror) {
		                    			roundingshippingchargeerror = (Math.round(parseFloat(roundingshippingchargeerror) * 100) / 100);

		                        		shippinglinecharge = shippinglinecharge + roundingshippingchargeerror;

										nlapiLogExecution('DEBUG', 'Rounding Percent Error Details ',
			                    			'RoundingPercentError = ' + roundingshippingchargeerror
			                    			+ ' shippinglinecharge = ' + shippinglinecharge);
		                    			}
								}

								if (handlingChargeWithTaxCode)
								{
		                			if (roundinghandlingchargeerror) {
		                    			roundinghandlingchargeerror = (Math.round(parseFloat(roundinghandlingchargeerror) * 100) / 100);

		                        		handlinglinecharge = handlinglinecharge + roundinghandlingchargeerror;

										nlapiLogExecution('DEBUG', 'Rounding Percent Error Details ',
			                    			'RoundingPercentError = ' + roundinghandlingchargeerror
			                    			+ ' handlinglinecharge = ' + handlinglinecharge);
		                    			}
								}

								if (miscChargeWithTaxCode)
								{
		                			if (roundingmiscchargeerror) {
		                    			roundingmiscchargeerror = (Math.round(parseFloat(roundingmiscchargeerror) * 100) / 100);

		                        		misclinecharge = misclinecharge + roundingmiscchargeerror;

										nlapiLogExecution('DEBUG', 'Rounding Percent Error Details ',
			                    			'RoundingPercentError = ' + roundingmiscchargeerror
			                    			+ ' misclinecharge = ' + misclinecharge);
		                    			}
								}
                }
            }

            nlapiLogExecution('DEBUG', 'before setting amount', 'adjlineamount = '
                + parseFloat(adjlineamount));
            nlapiLogExecution('DEBUG', 'before setting amount', 'totalamount = '
                + parseFloat(totalamount));
            nlapiLogExecution('DEBUG', 'before setting amount', 'linepercent = '
                + parseFloat(linepercent));

            record.setCurrentLineItemValue('expense', 'amount',
                parseFloat(adjlineamount));

            // check for custom fields on line level
            if (nlapiGetContext().getSetting('SCRIPT',
                    'custscript_coupa_inv_custfield_line_cnt')) {
                for (var y = 1; y <= nlapiGetContext().getSetting('SCRIPT',
                    'custscript_coupa_inv_custfield_line_cnt'); y++) {
                    if (nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_custfieldline' + y)) {
                        var custfield;
                        var valuetoinsert = null;
                        var textOrValue;
                        if (nlapiGetContext().getSetting('SCRIPT',
                                'custscript_coupa_inv_custfieldline' + y)
                                .split(':')) {
                            custfield = nlapiGetContext().getSetting('SCRIPT',
                                'custscript_coupa_inv_custfieldline' + y)
                                .split(':');

                            if (custfield[4]) {
                                valuetoinsert = custfield[4];
                                nlapiLogExecution('DEBUG', 'Valuetoinsert = ',
                                    valuetoinsert);
                            }

                            else {

                                if (nlapiSelectValue(invoiceLineNodes[x],
                                        custfield[0]))
                                    valuetoinsert = nlapiSelectValue(
                                        invoiceLineNodes[x], custfield[0]);

                                nlapiLogExecution('DEBUG', 'Line Custom ' + y,
                                    'Coupa field = '
                                    + nlapiSelectValue(
                                        invoiceLineNodes[x],
                                        custfield[0])
                                    + ' ValuetoInsert = '
                                    + valuetoinsert);

                                if (custfield[2]
                                    && nlapiSelectValue(
                                        invoiceLineNodes[x],
                                        custfield[0])) {
                                    if (custfield[2] == 'Date') {
                                        valuetoinsert = ConvertCoupaDateToNetSuiteDate(nlapiSelectValue(
                                            invoiceLineNodes[x],
                                            custfield[0]));
                                        nlapiLogExecution(
                                            'DEBUG',
                                            'Line Custom Inside coupatype = date'
                                            + y,
                                            'Coupa field = '
                                            + nlapiSelectValue(
                                                invoiceLineNodes[x],
                                                custfield[0])
                                            + ' ValuetoInsert = '
                                            + valuetoinsert);
                                    }

                                    if (custfield[2] == 'Lookup') {

                                        valuetoinsert = nlapiSelectValue(
                                            invoiceLineNodes[x],
                                            custfield[0]
                                            + '/external-ref-num');
                                        nlapiLogExecution(
                                            'DEBUG',
                                            'Line Custom Inside coupatype = lookup'
                                            + y,
                                            'Coupa field = '
                                            + nlapiSelectValue(
                                                invoiceLineNodes[x],
                                                custfield[0])
                                            + ' ValuetoInsert = '
                                            + valuetoinsert);
                                    }

                                }
                                if (custfield[2] == 'Boolean') {
                                    valuetoinsert = nlapiSelectValue(
                                        invoiceLineNodes[x], custfield[0]);
                                    if (valuetoinsert == 't'
                                        || valuetoinsert == 'yes'
                                        || valuetoinsert == 'y'
                                        || valuetoinsert == 'true'
                                        || valuetoinsert == 'True') {
                                        valuetoinsert = 'T';
                                    } else {
                                        valuetoinsert = 'F';
                                    }
                                }

                                if (custfield[2] == 'Segment') {
                                    valuetoinsert = nlapiSelectValue(invoiceLineNodes[x], 'account/' + custfield[0]);
                                }


                            }

                            textOrValue = 'Text';
                            if (custfield[3]) {
                                textOrValue = custfield[3];
                            }

                            nlapiLogExecution('DEBUG', 'Line CustomField' + ' '
                                + y, " custfield0 = " + custfield[0]
                                + " custfield1 = " + custfield[1]
                                + " custfield2 = " + custfield[2]
                                + " custfield3 = " + custfield[3]
                                + " valuetoinsert = " + valuetoinsert);

                            if (valuetoinsert != null
                                && valuetoinsert != undefined
                                && valuetoinsert != 'None') {

                                if (textOrValue == 'Text')
                                    record.setCurrentLineItemText('expense',
                                        custfield[1], valuetoinsert);
                                else
                                    record.setCurrentLineItemValue('expense',
                                        custfield[1], valuetoinsert);
                            }

                        }
                    }
                }
            }

            record.commitLineItem('expense');

            /**
             *
             * if (headercharges && nlapiGetContext().getSetting('SCRIPT',
             * 'custscript_coupa_inv_send_taxcode') &&
             * (nlapiGetContext().getSetting('SCRIPT',
             * 'custscript_coupa_inv_send_taxcode') == 'T') && taxcodeexists) {
             * SetHeaderChargesasExpenseLine(record, invoice,
             * invoiceLineNodes[x], linecharge.toFixed(2)); }
             *
             */
	         nlapiLogExecution('DEBUG', 'headercharges before calling SetHeaderCharges function',
	          headercharges);
		      nlapiLogExecution('DEBUG', 'linetotalamount before call',
		      linetotalamount);


  	        nlapiLogExecution('DEBUG', 'linecharge before call headercharges',
  	        linecharge);

  	        nlapiLogExecution('DEBUG', 'headerlinecharge',
  	        headerlinecharge);

  	        nlapiLogExecution('DEBUG', 'shippinglinecharge',
  	        shippinglinecharge);

  	        nlapiLogExecution('DEBUG', 'handlinglinecharge',
  	        handlinglinecharge);

  	        nlapiLogExecution('DEBUG', 'misclinecharge',
  	        misclinecharge);

            if (headercharges
                  && nlapiGetContext().getSetting('SCRIPT',
                      'custscript_coupa_inv_send_taxcode')
                  && (nlapiGetContext().getSetting('SCRIPT',
                    'custscript_coupa_inv_send_taxcode') == 'T')) {
                SetHeaderChargesasExpenseLine(record, invoice,
                    invoiceLineNodes[x], headerlinecharge.toFixed(2), null, null, false,shippinglinecharge,handlinglinecharge,misclinecharge);
            }



        } // end of else --- i.e if not split accounting
    } // end of main for loop that goes through each invoice line

    try {
        record.setFieldValue('externalid', 'Coupa-VendorBill'
            + nlapiSelectValue(invoice, 'id'));

        record.setFieldValue('trandate',
            ConvertCoupaDateToNetSuiteDate(nlapiSelectValue(invoice,
                'invoice-date')));
        // set currency
        var curr = getNetsuiteCurrency('currency', nlapiSelectValue(invoice,
            'currency/code'));
        record.setFieldValue('currency', curr);

        var paymentChannel = nlapiSelectValue(invoice, 'payment-channel');
        if (paymentChannel == 'coupapay_invoice_payment'){
          record.setFieldValue('paymenthold', 'T');
        }

        var paymentTermNode = nlapiSelectNode(invoice, 'payment-term');
        // nlapiLogExecution('DEBUG', 'Payment Term',
        // nlapiSelectValue(paymentTermNode, 'code'));

        var terms;

        if (paymentTermNode) {
            terms = getNetsuitetermid(nlapiSelectValue(paymentTermNode, 'code'));
        } else
            terms = getNetsuitetermid('Net 30');

        record.setFieldValue('terms', terms);

        // set accounts payable account if passed as parameter to the script
        if (nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_actpayablenum')) {
            var apAccountId = getNetsuiteAccountId(nlapiGetContext()
                .getSetting('SCRIPT', 'custscript_coupa_inv_actpayablenum'));

            if (apAccountId != 'INVALID_ACCOUNT')
                record.setFieldValue('account', apAccountId);
        }

        // set the posting period
        var today = new Date();
        var postingPeriod = getMonthShortName(today.getMonth()) + ' '
            + today.getFullYear();
        var cutoffday = 5;
        cutoffday = nlapiGetContext().getSetting('SCRIPT',
            'custscript_coupa_inv_cutoffdate');
        if (today.getDate() < cutoffday) {
            var nDate = nlapiSelectValue(invoice, 'invoice-date').split('T');
            var datesplit = nDate[0].split('-');
            var Nyear = datesplit[0];
            // var Nday = datesplit[2];
            var Nmonth = datesplit[1] - 1;

            if (today.getFullYear() > Nyear) {
                if (today.getMonth() == 0)
                    postingPeriod = getMonthShortName('11') + ' '
                        + (today.getFullYear() - 1);
                else
                    postingPeriod = getMonthShortName(today.getMonth() - 1)
                        + ' ' + today.getFullYear();
            }

            if (Nmonth < today.getMonth() && Nyear == today.getFullYear())
                postingPeriod = getMonthShortName(today.getMonth() - 1) + ' '
                    + today.getFullYear();
        }

        nlapiLogExecution('DEBUG', 'Calculated Posting Period is ',
            postingPeriod);

        //var postingPeriodId = getAccoutingPeriodNetsuiteId('accountingperiod',postingPeriod);
        var postingPeriodId = getAccoutingPeriodNetsuiteId('accountingperiod',getLIVNetSuitePeriodName(postingPeriod));


        // nlapiLogExecution('DEBUG', 'Posting Period: ', 'name = ' +
        // postingPeriod + ' Id = ' + postingPeriodId);

        record.setFieldValue('postingperiod', postingPeriodId);
        record.setFieldText('approvalstatus', 'Approved');
        record.setFieldValue('custbody_liv_email_approval_received', 'T');
        record.setFieldValue('tranid', nlapiSelectValue(invoice,
            'invoice-number'));
        record.setFieldText('approvalstatus', 'Approved');
        // add link back to invoice in Coupa
        if (nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_link_field')) {
            record.setFieldValue(nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_link_field'), nlapiGetContext()
                    .getSetting('SCRIPT', 'custscript_coupa_inv_url')
                + '/invoices/' + nlapiSelectValue(invoice, 'id'));
        }

        // add link back to invoiceimagescan in Coupa
        if (nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_image_link_field')
            && nlapiSelectValue(invoice, 'image-scan')) {
            // first get the correct url
            var imagescan = nlapiSelectValue(invoice, 'image-scan').split('/');
            var imagescanurl = nlapiGetContext().getSetting('SCRIPT',
                    'custscript_coupa_inv_url')
                + '/invoice/'
                + nlapiSelectValue(invoice, 'id')
                + '/image_scan/' + imagescan[5];
            record.setFieldValue(nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_image_link_field'), imagescanurl);
        }
        // nlapiLogExecution('DEBUG','checking for header custom field count',
        // 'count = ' + nlapiGetContext().getSetting('SCRIPT',
        // 'custscript_coupa_inv_custfield_header_ct'));
        // check for custom fields on header level
        if (nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_custfield_header_ct')) {
            for (var y = 1; y <= nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_custfield_header_ct'); y++) {

                // nlapiLogExecution('DEBUG','checking for header custom field'
                // + y, 'Customer header Field' + y + " = " +
                // nlapiGetContext().getSetting('SCRIPT',
                // 'custscript_coupa_inv_custfieldheader' + y));

                if (nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_custfieldheader' + y)) {
                    var custfield;
                    var valuetoinsert = 'None';
                    var textOrValue;
                    if (nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_custfieldheader' + y).split(
                            ':')) {
                        custfield = nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_custfieldheader' + y)
                            .split(':');

                        if (custfield[4])
                            valuetoinsert = custfield[4];
                        else {

                            if (nlapiSelectValue(invoice, custfield[0]))
                                valuetoinsert = nlapiSelectValue(invoice,
                                    custfield[0]);

                            if (custfield[2]
                                && nlapiSelectValue(invoice, custfield[0])) {
                                if (custfield[2] == 'Date')
                                    valuetoinsert = ConvertCoupaDateToNetSuiteDate(nlapiSelectValue(
                                        invoice, custfield[0]));

                                if (custfield[2] == 'Lookup') {
                                    valuetoinsert = nlapiSelectValue(invoice,
                                        custfield[0] + '/external-ref-num');
                                }

                            }
                            if (custfield[2] == 'Boolean') {
                                valuetoinsert = nlapiSelectValue(invoice,
                                    custfield[0]);
                                if (valuetoinsert == 't'
                                    || valuetoinsert == 'yes'
                                    || valuetoinsert == 'y'
                                    || valuetoinsert == 'true'
                                    || valuetoinsert == 'True') {
                                    valuetoinsert = 'T';
                                } else {
                                    valuetoinsert = 'F';
                                }
                            }
                        }

                        textOrValue = 'Text';
                        if (custfield[3]) {
                            textOrValue = custfield[3];
                        }

                        nlapiLogExecution('DEBUG', 'Header CustomField' + ' '
                            + y, " custfield0 = " + custfield[0]
                            + " custfield1 = " + custfield[1]
                            + " custfield2 = " + custfield[2]
                            + " custfield3 = " + custfield[3]
                            + " valuetoinsert = " + valuetoinsert);

                        if (valuetoinsert && valuetoinsert != 'None') {

                            if (textOrValue == 'Text')
                                record
                                    .setFieldText(custfield[1],
                                        valuetoinsert);
                            else
                                record.setFieldValue(custfield[1],
                                    valuetoinsert);
                        }

                    }
                }
            }
        }
        record.setFieldText('approvalstatus', 'Approved');
        nlapiSubmitRecord(record, true);

        if (paymentChannel == 'coupapay_virtual_card_po'){
          createCoupaPayPayment(record);
        }
    } catch (e) {
        nlapiLogExecution('ERROR',
            'Processing Error - Unable to create vendor bill',
            ' Invoice Number = '
            + nlapiSelectValue(invoice, 'invoice-number')
            + ' Supplier Name = '
            + nlapiSelectValue(supplierNode, 'name')
            + ' Error Description = ' + e.message);
        nlapiSendEmail(
            -5,
            nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_email_notifications'),
            nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_acccountname')
            + ' Invoice Integration:Processing Error - Unable to create vendor bill',
            'Invoice Number = '
            + nlapiSelectValue(invoice, 'invoice-number')
            + ' Supplier Name = '
            + nlapiSelectValue(supplierNode, 'name')
            + ' Error Description = ' + e.message);
        return;
    }

    nlapiLogExecution('AUDIT', 'Successfully created vendor bill',
        ' Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number')
        + ' Supplier Name = '
        + nlapiSelectValue(supplierNode, 'name'));
    Setexportedtotrue(nlapiSelectValue(invoice, 'id'));
}

function createCoupaPayPayment(vendorBill){
    var vendorBillId = vendorBill.getFieldValue('id');
    nlapiLogExecution('AUDIT', 'Marking VendorBill ID ' + vendorBillId + ' as paid as it is backed by a VirtualCard PO');
    var vendorPayment = nlapiTransformRecord('vendorbill', vendorBillId, 'vendorpayment');
    vendorPayment.setFieldText('externalid', 'Processed-CoupaPayVirtualCard');

    var lineNum = vendorPayment.findLineItemValue('apply','doc', vendorBillId);
    vendorPayment.selectLineItem('apply', lineNum);
    vendorPayment.setCurrentLineItemValue('apply', 'apply', 'T');
    vendorPayment.setCurrentLineItemValue('apply', 'amount', vendorBill.getFieldValue('total'));
    vendorPayment.commitLineItem('apply');

    nlapiSubmitRecord(vendorPayment);
    nlapiLogExecution('AUDIT', 'Successfully marked VendorBill ID ' + vendorBillId + ' as paid');
}

function VoidVendorBill(invoice, id) {
    // nlapiLogExecution('DEBUG', 'VOID Vendor Bill ', 'Netsuite Id = ' + id + '
    // Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number'));
    try {
        var record = nlapiLoadRecord('vendorbill', id);
        record.setFieldText('approvalstatus', 'Rejected');
        nlapiSubmitRecord(record);
    } catch (e) {
        nlapiLogExecution('ERROR',
            'Processing Error - Unable to void vendor bill',
            ' Invoice Number = '
            + nlapiSelectValue(invoice, 'invoice-number')
            + ' Supplier Name = '
            + nlapiSelectValue(invoice, 'supplier/name')
            + ' Error Description = ' + e.message);
        nlapiSendEmail(
            -5,
            nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_email_notifications'),
            nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_acccountname')
            + ' Invoice Integration:Processing Error - Unable to void vendor bill',
            'Invoice Number = '
            + nlapiSelectValue(invoice, 'invoice-number')
            + ' Supplier Name = '
            + nlapiSelectValue(invoice, 'supplier/name')
            + ' Error Description = ' + e.message);
    }

    nlapiLogExecution('AUDIT', 'Successfully voided vendor bill',
        ' Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number')
        + ' Supplier Name = '
        + nlapiSelectValue(invoice, 'supplier/name'));

    Setexportedtotrue(nlapiSelectValue(invoice, 'id'));

}

function SetHeaderChargesasExpenseLine(record, invoice, invoiceline,
                                       headerlinecharge, splitaccountNode,splitaccountAmount,isSplit,shippinglinecharge,handlinglinecharge,misclinecharge) {
    try
    {
	var lineamount = 0.0;
    var shippingamount = 0.0;
    var handlingamount = 0.0;
    var miscamount = 0.0;
	var taxamount = 0.0;
	var linecharge = 0.0;
    var shippingChargeTaxAmount = 0;
    var handlingChargeTaxAmount = 0;
    var miscChargeTaxAmount = 0;

    var shippingChargeTax = null;
    var handlingChargeTax = null;
    var miscChargeTax = null;
    var shippingChargeTaxCode = null;
    var handlingChargeTaxCode = null;
    var miscChargeTaxCode = null;
    var chargesType = null;

	var shippingCharge = false;
	var handlingCharge = false;
	var miscCharge = false;
	var otherCharges = true;

    shippingamount = parseFloat(nlapiSelectValue(invoice, 'shipping-amount'));
    handlingamount = parseFloat(nlapiSelectValue(invoice, 'handling-amount'));
    miscamount = parseFloat(nlapiSelectValue(invoice, 'misc-amount'));
	taxamount =  parseFloat(nlapiSelectValue(invoice, 'tax-amount'));
	var lineleveltaxation = nlapiSelectValue(invoice, 'line-level-taxation');

	//nlapiLogExecution('DEBUG', 'lineleveltaxation',lineleveltaxation);

   // nlapiLogExecution('DEBUG', 'isSplit',isSplit);

    if (isSplit)
		lineamount = parseFloat(splitaccountAmount);
    else
   	    lineamount = parseFloat(nlapiSelectValue(invoiceline,'total'));

    //nlapiLogExecution('DEBUG', 'allocation lineamount',lineamount);

    var chargeLine = nlapiSelectNode(invoice, 'invoice-charges');
    var chargeLineNodes = new Array();

    chargeLineNodes = nlapiSelectNodes(chargeLine, 'invoice-charge');

	var headerTaxCode = null;

	headerTaxCode = nlapiSelectValue(invoice, 'tax-code/code');

    var chargesType = null;

    for (var cnt = 0; cnt < chargeLineNodes.length; cnt++)
     {
        chargesType = nlapiSelectValue(chargeLineNodes[cnt], 'type')

         if(chargesType == 'InvoiceShippingCharge')
         {
             if (nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/tax-code/code'))
             {
                 shippingChargeTax = nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/tax-code/code').split(':');
                 if (shippingChargeTax[1]) {

					 shippingCharge = true;
					 shippingChargeTaxCode = shippingChargeTax[1];

                     nlapiLogExecution(
                         'DEBUG',
                         'Shipping tax and setting tax code to',
                         'TaxCode = ' + shippingChargeTax[1]
                         );
                 } else {
                     nlapiLogExecution('ERROR',
                         'Processing Error - Invalid Shipping taxcode',
                         'TaxCode ='
                         + nlapiSelectValue(
                             chargeLineNodes[cnt],
                             shippingChargeTax)
                         + ' Invoice Number = '
                         + nlapiSelectValue(invoice,
                             'invoice-number')
                         + ' Supplier Name = '
                         + nlapiSelectValue(
                             supplierNode, 'name'));
                 }


             }
		 }
         if(chargesType == 'InvoiceHandlingCharge')
         {

             handlingChargeTaxAmount = nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/amount');

             if (nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/tax-code/code')){
                 handlingChargeTax = nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/tax-code/code').split(':');

                 if (handlingChargeTax[1]) {

					 handlingCharge = true;
					 handlingChargeTaxCode = handlingChargeTax[1];

                     nlapiLogExecution(
                         'DEBUG',
                         'Handling tax and setting tax code to',
                         'TaxCode = ' + handlingChargeTax[1]
                     );
                 } else {
                     nlapiLogExecution('ERROR',
                     'Processing Error - Invalid Handling taxcode',
                     'TaxCode ='
                     + nlapiSelectValue(
                         chargeLineNodes[cnt],
                         handlingChargeTax)
                     + ' Invoice Number = '
                     + nlapiSelectValue(invoice,
                         'invoice-number')
                     + ' Supplier Name = '
                     + nlapiSelectValue(
                         supplierNode, 'name'));
                 }

             }

		 }
         if(chargesType == 'InvoiceMiscCharge')
         {
             if (nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/tax-code/code')){
                 miscChargeTax = nlapiSelectValue(chargeLineNodes[cnt], 'tax-lines/tax-line/tax-code/code').split(':');
                 if (miscChargeTax[1]) {

					 	miscCharge = true;
					 	miscChargeTaxCode = miscChargeTax[1];
                         nlapiLogExecution(
                             'DEBUG',
                             'Misc tax and setting tax code to',
                             'TaxCode = ' + miscChargeTax[1]
                         );
                     } else {
                         nlapiLogExecution('ERROR',
                         'Processing Error - Invalid Misc taxcode',
                         'TaxCode ='
                         + nlapiSelectValue(
                             chargeLineNodes[cnt],
                             miscChargeTax)
                         + ' Invoice Number = '
                         + nlapiSelectValue(invoice,
                             'invoice-number')
                         + ' Supplier Name = '
                         + nlapiSelectValue(
                             supplierNode, 'name'));
                     }
             }

		 }
     }

	 if (shippingCharge == false && shippingamount != '' && shippingamount != null && shippingamount != 0.0)
	 {
		 otherCharges = true;
	 }
	 if (handlingCharge == false && handlingamount != '' && handlingamount != null && handlingamount != 0.0)
	 {
		 otherCharges = true;
	 }
	 if (miscCharge == false && miscamount != '' && miscamount != null && miscamount != 0.0)
	 {
		 otherCharges = true;
	 }

	// all header charges without taxcode into one line item
	if ((((headerTaxCode == null || headerTaxCode == '') && lineleveltaxation == 'false') || otherCharges == true ) && headerlinecharge != null && headerlinecharge != 0.0 && headerlinecharge != '')
	{

	    var accountNode;
	    var dynamicAccounting = 'F';
	    if (nlapiGetContext().getSetting('SCRIPT',
	            'custscript_coupa_inv_dynamicaccts'))
	        dynamicAccounting = nlapiGetContext().getSetting('SCRIPT',
	            'custscript_coupa_inv_dynamicaccts');

	    if (isSplit)
	        accountNode = splitaccountNode;
	    else
	        accountNode = nlapiSelectNode(invoiceline, 'account');

	    record.selectNewLineItem('expense');

	    if (nlapiGetContext().getSetting('SCRIPT', 'custscript_coupa_inv_glactseg')) {
	        var account;
	        var accountnumber;
	        var accountId;
	        // var act;
	        account = nlapiSelectValue(
	            accountNode,
	            nlapiGetContext().getSetting('SCRIPT',
	                'custscript_coupa_inv_glactseg')).split(':');
	        // act = account[0].split(' ');
	        accountnumber = account[0];
	        if (dynamicAccounting == 'T') {
	            accountId = getNetsuiteAccountId(accountnumber);
	        } else {
	            accountId = getNetsuiteAccountId(accountnumber);
	        }
	        if (accountId != 'INVALID_ACCOUNT')
	            record.setCurrentLineItemValue('expense', 'account', accountId);
	        else {
	            nlapiLogExecution('ERROR', 'Processing Error - Invalid GL account',
	                'GL Account =' + accountnumber + ' Invoice Number = '
	                + nlapiSelectValue(invoice, 'invoice-number')
	                + ' Supplier Name = '
	                + nlapiSelectValue(invoice, 'supplier/name'));
	            nlapiSendEmail(
	                -5,
	                nlapiGetContext().getSetting('SCRIPT',
	                    'custscript_coupa_inv_email_notifications'),
	                nlapiGetContext().getSetting('SCRIPT',
	                    'custscript_coupa_inv_acccountname')
	                + ' Invoice Integration:Processing Error - Invalid GL account',
	                'GL Account =' + accountnumber + ' Invoice Number = '
	                + nlapiSelectValue(invoice, 'invoice-number')
	                + ' Supplier Name = '
	                + nlapiSelectValue(invoice, 'supplier/name'));
	            return;
	        }
	    }

	    if (nlapiGetContext().getSetting('SCRIPT', 'custscript_coupa_inv_deptseg')) {
	        var dept = nlapiSelectValue(
	            accountNode,
	            nlapiGetContext().getSetting('SCRIPT',
	                'custscript_coupa_inv_deptseg')).split(':');
	        if (dynamicAccounting == 'T') {
	            record.setCurrentLineItemValue('expense', 'department', dept);
	        } else {
	            record.setCurrentLineItemValue('expense', 'department', dept[1]);
	        }
	    }

	    if (nlapiGetContext().getSetting('SCRIPT', 'custscript_coupa_inv_classseg')) {
	        var clss = nlapiSelectValue(
	            accountNode,
	            nlapiGetContext().getSetting('SCRIPT',
	                'custscript_coupa_inv_classseg')).split(':');
	        if (dynamicAccounting == 'T') {
	            record.setCurrentLineItemValue('expense', 'class', clss);
	        } else {
	            record.setCurrentLineItemValue('expense', 'class', clss[1]);
	        }
	    }

	    if (nlapiGetContext().getSetting('SCRIPT', 'custscript_coupa_inv_locseg')) {
	        var locId = nlapiSelectValue(
	            accountNode,
	            nlapiGetContext().getSetting('SCRIPT',
	                'custscript_coupa_inv_locseg')).split(':');
	        if (dynamicAccounting == 'T') {
	            record.setCurrentLineItemValue('expense', 'location', locId);
	        } else {
	            record.setCurrentLineItemValue('expense', 'location', locId[1]);
	        }
	    }

	    else if (nlapiGetContext().getSetting('SCRIPT',
	            'custscript_coupa_inv_loccust')) {
	        var locId = getNetSuiteId('location', nlapiSelectValue(invoiceline,
	            nlapiGetContext().getSetting('SCRIPT',
	                'custscript_coupa_inv_loccust')));
	        if (locId != 'INVALID_NAME')
	            record.setCurrentLineItemValue('expense', 'location', locId);
	    }

	    /* check for Coupa order line */
	    if (nlapiSelectValue(invoiceline, 'order-header-num')
	        && nlapiSelectValue(invoiceline, 'order-line-num')) {
	        var poheadernum = nlapiSelectValue(invoiceline, 'order-header-num');
	        var polinenum = nlapiSelectValue(invoiceline, 'order-line-num');
	        record.setCurrentLineItemValue('expense', 'custcol_coupaponum',
	            poheadernum + '-' + polinenum);
	    }

		nlapiLogExecution('DEBUG', 'headerlinecharge rounding',headerlinecharge);

		record.setCurrentLineItemValue('expense', 'amount', parseFloat(headerlinecharge));


	    if (isSplit)
	        record.setCurrentLineItemValue('expense', 'memo',
	            'Header Charges for Split line: '
	            + nlapiSelectValue(invoiceline, 'description'));
	    else
	        record.setCurrentLineItemValue('expense', 'memo',
	            'Header Charges for line: '
	            + nlapiSelectValue(invoiceline, 'description'));


	    // check for custom fields on line level
	    if (nlapiGetContext().getSetting('SCRIPT',
	            'custscript_coupa_inv_custfield_line_cnt'))
	            {
	        for (var y = 1; y <= nlapiGetContext().getSetting('SCRIPT',
	            'custscript_coupa_inv_custfield_line_cnt'); y++) {
	            if (nlapiGetContext().getSetting('SCRIPT',
	                    'custscript_coupa_inv_custfieldline' + y)) {
	                var custfield;
	                var valuetoinsert = null;
	                var textOrValue;
	                if (nlapiGetContext().getSetting('SCRIPT',
	                        'custscript_coupa_inv_custfieldline' + y).split(':')) {
	                    custfield = nlapiGetContext().getSetting('SCRIPT',
	                        'custscript_coupa_inv_custfieldline' + y)
	                        .split(':');

	                    if (custfield[4]) {
	                        valuetoinsert = custfield[4];
	                        nlapiLogExecution('DEBUG', 'Valuetoinsert = ',
	                            valuetoinsert);
	                    }

	                    else {

	                        if (nlapiSelectValue(invoiceline, custfield[0]))
	                            valuetoinsert = nlapiSelectValue(invoiceline,
	                                custfield[0]);

	                        nlapiLogExecution('DEBUG', 'Line Custom ' + y,
	                            'Coupa field = '
	                            + nlapiSelectValue(invoiceline,
	                                custfield[0])
	                            + ' ValuetoInsert = ' + valuetoinsert);

	                        if (custfield[2]
	                            && nlapiSelectValue(invoiceline, custfield[0]))
	                             {
	                            if (custfield[2] == 'Date')
	                            {
	                                valuetoinsert = ConvertCoupaDateToNetSuiteDate(nlapiSelectValue(
	                                    invoiceline, custfield[0]));
	                                nlapiLogExecution('DEBUG',
	                                    'Line Custom Inside coupatype = date'
	                                    + y, 'Coupa field = '
	                                    + nlapiSelectValue(invoiceline,
	                                        custfield[0])
	                                    + ' ValuetoInsert = '
	                                    + valuetoinsert);
	                            }

	                            if (custfield[2] == 'Lookup') {

	                                valuetoinsert = nlapiSelectValue(invoiceline,
	                                    custfield[0] + '/external-ref-num');
	                                nlapiLogExecution('DEBUG',
	                                    'Line Custom Inside coupatype = lookup'
	                                    + y, 'Coupa field = '
	                                    + nlapiSelectValue(invoiceline,
	                                        custfield[0])
	                                    + ' ValuetoInsert = '
	                                    + valuetoinsert);
	                            }

	                        }
	                        if (custfield[2] == 'Boolean') {
	                            valuetoinsert = nlapiSelectValue(invoice,
	                                custfield[0]);
	                            if (valuetoinsert == 't' || valuetoinsert == 'yes'
	                                || valuetoinsert == 'y'
	                                || valuetoinsert == 'true'
	                                || valuetoinsert == 'True') {
	                                valuetoinsert = 'T';
	                            } else {
	                                valuetoinsert = 'F';
	                            }
	                        }

	                    }

	                    textOrValue = 'Text';
	                    if (custfield[3]) {
	                        textOrValue = custfield[3];
	                    }

	                    nlapiLogExecution('DEBUG', 'Line CustomField' + ' ' + y,
	                        " custfield0 = " + custfield[0] + " custfield1 = "
	                        + custfield[1] + " custfield2 = "
	                        + custfield[2] + " custfield3 = "
	                        + custfield[3] + " valuetoinsert = "
	                        + valuetoinsert);

	                    if (valuetoinsert != null && valuetoinsert != undefined
	                        && valuetoinsert != 'None')
	                         {

	                        if (textOrValue == 'Text')
	                            record.setCurrentLineItemText('expense',
	                                custfield[1], valuetoinsert);
	                        else
	                            record.setCurrentLineItemValue('expense',
	                                custfield[1], valuetoinsert);
	                    }

	                }
	            }
	        }
	    }

	     record.commitLineItem('expense');
	}
	// end block all header charges without taxcode into one line item

    if (shippingCharge == true && shippinglinecharge != null &&  shippinglinecharge != '' && shippinglinecharge != 0.0)
    {

    var accountNode;
    var dynamicAccounting = 'F';
    if (nlapiGetContext().getSetting('SCRIPT',
            'custscript_coupa_inv_dynamicaccts'))
        dynamicAccounting = nlapiGetContext().getSetting('SCRIPT',
            'custscript_coupa_inv_dynamicaccts');

    if (isSplit)
        accountNode = splitaccountNode;
    else
        accountNode = nlapiSelectNode(invoiceline, 'account');

    record.selectNewLineItem('expense');

    if (nlapiGetContext().getSetting('SCRIPT', 'custscript_coupa_inv_glactseg')) {
        var account;
        var accountnumber;
        var accountId;
        // var act;
        account = nlapiSelectValue(
            accountNode,
            nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_glactseg')).split(':');
        // act = account[0].split(' ');
        accountnumber = account[0];
        if (dynamicAccounting == 'T') {
            accountId = getNetsuiteAccountId(accountnumber);
        } else {
            accountId = getNetsuiteAccountId(accountnumber);
        }
        if (accountId != 'INVALID_ACCOUNT')
            record.setCurrentLineItemValue('expense', 'account', accountId);
        else {
            nlapiLogExecution('ERROR', 'Processing Error - Invalid GL account',
                'GL Account =' + accountnumber + ' Invoice Number = '
                + nlapiSelectValue(invoice, 'invoice-number')
                + ' Supplier Name = '
                + nlapiSelectValue(invoice, 'supplier/name'));
            nlapiSendEmail(
                -5,
                nlapiGetContext().getSetting('SCRIPT',
                    'custscript_coupa_inv_email_notifications'),
                nlapiGetContext().getSetting('SCRIPT',
                    'custscript_coupa_inv_acccountname')
                + ' Invoice Integration:Processing Error - Invalid GL account',
                'GL Account =' + accountnumber + ' Invoice Number = '
                + nlapiSelectValue(invoice, 'invoice-number')
                + ' Supplier Name = '
                + nlapiSelectValue(invoice, 'supplier/name'));
            return;
        }
    }

    if (nlapiGetContext().getSetting('SCRIPT', 'custscript_coupa_inv_deptseg')) {
        var dept = nlapiSelectValue(
            accountNode,
            nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_deptseg')).split(':');
        if (dynamicAccounting == 'T') {
            record.setCurrentLineItemValue('expense', 'department', dept);
        } else {
            record.setCurrentLineItemValue('expense', 'department', dept[1]);
        }
    }

    if (nlapiGetContext().getSetting('SCRIPT', 'custscript_coupa_inv_classseg')) {
        var clss = nlapiSelectValue(
            accountNode,
            nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_classseg')).split(':');
        if (dynamicAccounting == 'T') {
            record.setCurrentLineItemValue('expense', 'class', clss);
        } else {
            record.setCurrentLineItemValue('expense', 'class', clss[1]);
        }
    }

    if (nlapiGetContext().getSetting('SCRIPT', 'custscript_coupa_inv_locseg')) {
        var locId = nlapiSelectValue(
            accountNode,
            nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_locseg')).split(':');
        if (dynamicAccounting == 'T') {
            record.setCurrentLineItemValue('expense', 'location', locId);
        } else {
            record.setCurrentLineItemValue('expense', 'location', locId[1]);
        }
    }

    else if (nlapiGetContext().getSetting('SCRIPT',
            'custscript_coupa_inv_loccust')) {
        var locId = getNetSuiteId('location', nlapiSelectValue(invoiceline,
            nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_loccust')));
        if (locId != 'INVALID_NAME')
            record.setCurrentLineItemValue('expense', 'location', locId);
    }

    /* check for Coupa order line */
    if (nlapiSelectValue(invoiceline, 'order-header-num')
        && nlapiSelectValue(invoiceline, 'order-line-num')) {
        var poheadernum = nlapiSelectValue(invoiceline, 'order-header-num');
        var polinenum = nlapiSelectValue(invoiceline, 'order-line-num');
        record.setCurrentLineItemValue('expense', 'custcol_coupaponum',
            poheadernum + '-' + polinenum);
    }

	record.setCurrentLineItemValue('expense','taxcode', shippingChargeTaxCode);

	nlapiLogExecution('DEBUG', 'shippinglinecharge',shippinglinecharge);

	record.setCurrentLineItemValue('expense', 'amount', parseFloat(shippinglinecharge.toFixed(2)));

    if (isSplit)
        record.setCurrentLineItemValue('expense', 'memo',
            'Header Charges for Split line: '
            + nlapiSelectValue(invoiceline, 'description'));
    else
        record.setCurrentLineItemValue('expense', 'memo',
            'Header Charges for line: '
            + nlapiSelectValue(invoiceline, 'description'));


    // check for custom fields on line level
    if (nlapiGetContext().getSetting('SCRIPT',
            'custscript_coupa_inv_custfield_line_cnt'))
            {
        for (var y = 1; y <= nlapiGetContext().getSetting('SCRIPT',
            'custscript_coupa_inv_custfield_line_cnt'); y++) {
            if (nlapiGetContext().getSetting('SCRIPT',
                    'custscript_coupa_inv_custfieldline' + y)) {
                var custfield;
                var valuetoinsert = null;
                var textOrValue;
                if (nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_custfieldline' + y).split(':')) {
                    custfield = nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_custfieldline' + y)
                        .split(':');

                    if (custfield[4]) {
                        valuetoinsert = custfield[4];
                        nlapiLogExecution('DEBUG', 'Valuetoinsert = ',
                            valuetoinsert);
                    }

                    else {

                        if (nlapiSelectValue(invoiceline, custfield[0]))
                            valuetoinsert = nlapiSelectValue(invoiceline,
                                custfield[0]);

                        nlapiLogExecution('DEBUG', 'Line Custom ' + y,
                            'Coupa field = '
                            + nlapiSelectValue(invoiceline,
                                custfield[0])
                            + ' ValuetoInsert = ' + valuetoinsert);

                        if (custfield[2]
                            && nlapiSelectValue(invoiceline, custfield[0]))
                             {
                            if (custfield[2] == 'Date')
                            {
                                valuetoinsert = ConvertCoupaDateToNetSuiteDate(nlapiSelectValue(
                                    invoiceline, custfield[0]));
                                nlapiLogExecution('DEBUG',
                                    'Line Custom Inside coupatype = date'
                                    + y, 'Coupa field = '
                                    + nlapiSelectValue(invoiceline,
                                        custfield[0])
                                    + ' ValuetoInsert = '
                                    + valuetoinsert);
                            }

                            if (custfield[2] == 'Lookup') {

                                valuetoinsert = nlapiSelectValue(invoiceline,
                                    custfield[0] + '/external-ref-num');
                                nlapiLogExecution('DEBUG',
                                    'Line Custom Inside coupatype = lookup'
                                    + y, 'Coupa field = '
                                    + nlapiSelectValue(invoiceline,
                                        custfield[0])
                                    + ' ValuetoInsert = '
                                    + valuetoinsert);
                            }

                        }
                        if (custfield[2] == 'Boolean') {
                            valuetoinsert = nlapiSelectValue(invoiceline,
                                custfield[0]);
                            if (valuetoinsert == 't' || valuetoinsert == 'yes'
                                || valuetoinsert == 'y'
                                || valuetoinsert == 'true'
                                || valuetoinsert == 'True') {
                                valuetoinsert = 'T';
                            } else {
                                valuetoinsert = 'F';
                            }
                        }

                    }

                    textOrValue = 'Text';
                    if (custfield[3]) {
                        textOrValue = custfield[3];
                    }

                    nlapiLogExecution('DEBUG', 'Line CustomField' + ' ' + y,
                        " custfield0 = " + custfield[0] + " custfield1 = "
                        + custfield[1] + " custfield2 = "
                        + custfield[2] + " custfield3 = "
                        + custfield[3] + " valuetoinsert = "
                        + valuetoinsert);

                    if (valuetoinsert != null && valuetoinsert != undefined
                        && valuetoinsert != 'None')
                         {

                        if (textOrValue == 'Text')
                            record.setCurrentLineItemText('expense',
                                custfield[1], valuetoinsert);
                        else
                            record.setCurrentLineItemValue('expense',
                                custfield[1], valuetoinsert);
                    }

                }
            }
        }
    }


            record.commitLineItem('expense');
    } // shipping charge == true

	// handling charge == true
    if (handlingCharge == true && handlinglinecharge != null &&  handlinglinecharge != '' && handlinglinecharge != 0.0)
    {

    var accountNode;
    var dynamicAccounting = 'F';
    if (nlapiGetContext().getSetting('SCRIPT',
            'custscript_coupa_inv_dynamicaccts'))
        dynamicAccounting = nlapiGetContext().getSetting('SCRIPT',
            'custscript_coupa_inv_dynamicaccts');

    if (isSplit)
        accountNode = splitaccountNode;
    else
        accountNode = nlapiSelectNode(invoiceline, 'account');

    record.selectNewLineItem('expense');

    if (nlapiGetContext().getSetting('SCRIPT', 'custscript_coupa_inv_glactseg')) {
        var account;
        var accountnumber;
        var accountId;
        // var act;
        account = nlapiSelectValue(
            accountNode,
            nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_glactseg')).split(':');
        // act = account[0].split(' ');
        accountnumber = account[0];
        if (dynamicAccounting == 'T') {
            accountId = getNetsuiteAccountId(accountnumber);
        } else {
            accountId = getNetsuiteAccountId(accountnumber);
        }
        if (accountId != 'INVALID_ACCOUNT')
            record.setCurrentLineItemValue('expense', 'account', accountId);
        else {
            nlapiLogExecution('ERROR', 'Processing Error - Invalid GL account',
                'GL Account =' + accountnumber + ' Invoice Number = '
                + nlapiSelectValue(invoice, 'invoice-number')
                + ' Supplier Name = '
                + nlapiSelectValue(invoice, 'supplier/name'));
            nlapiSendEmail(
                -5,
                nlapiGetContext().getSetting('SCRIPT',
                    'custscript_coupa_inv_email_notifications'),
                nlapiGetContext().getSetting('SCRIPT',
                    'custscript_coupa_inv_acccountname')
                + ' Invoice Integration:Processing Error - Invalid GL account',
                'GL Account =' + accountnumber + ' Invoice Number = '
                + nlapiSelectValue(invoice, 'invoice-number')
                + ' Supplier Name = '
                + nlapiSelectValue(invoice, 'supplier/name'));
            return;
        }
    }



    if (nlapiGetContext().getSetting('SCRIPT', 'custscript_coupa_inv_deptseg')) {
        var dept = nlapiSelectValue(
            accountNode,
            nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_deptseg')).split(':');
        if (dynamicAccounting == 'T') {
            record.setCurrentLineItemValue('expense', 'department', dept);
        } else {
            record.setCurrentLineItemValue('expense', 'department', dept[1]);
        }
    }

    if (nlapiGetContext().getSetting('SCRIPT', 'custscript_coupa_inv_classseg')) {
        var clss = nlapiSelectValue(
            accountNode,
            nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_classseg')).split(':');
        if (dynamicAccounting == 'T') {
            record.setCurrentLineItemValue('expense', 'class', clss);
        } else {
            record.setCurrentLineItemValue('expense', 'class', clss[1]);
        }
    }

    if (nlapiGetContext().getSetting('SCRIPT', 'custscript_coupa_inv_locseg')) {
        var locId = nlapiSelectValue(
            accountNode,
            nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_locseg')).split(':');
        if (dynamicAccounting == 'T') {
            record.setCurrentLineItemValue('expense', 'location', locId);
        } else {
            record.setCurrentLineItemValue('expense', 'location', locId[1]);
        }
    }

    else if (nlapiGetContext().getSetting('SCRIPT',
            'custscript_coupa_inv_loccust')) {
        var locId = getNetSuiteId('location', nlapiSelectValue(invoiceline,
            nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_loccust')));
        if (locId != 'INVALID_NAME')
            record.setCurrentLineItemValue('expense', 'location', locId);
    }

    /* check for Coupa order line */
    if (nlapiSelectValue(invoiceline, 'order-header-num')
        && nlapiSelectValue(invoiceline, 'order-line-num')) {
        var poheadernum = nlapiSelectValue(invoiceline, 'order-header-num');
        var polinenum = nlapiSelectValue(invoiceline, 'order-line-num');
        record.setCurrentLineItemValue('expense', 'custcol_coupaponum',
            poheadernum + '-' + polinenum);
    }

	record.setCurrentLineItemValue('expense','taxcode', handlingChargeTaxCode);

	nlapiLogExecution('DEBUG', 'handlinglinecharge',handlinglinecharge);

	record.setCurrentLineItemValue('expense', 'amount', parseFloat(handlinglinecharge.toFixed(2)));

    if (isSplit)
        record.setCurrentLineItemValue('expense', 'memo',
            'Header Charges for Split line: '
            + nlapiSelectValue(invoiceline, 'description'));
    else
        record.setCurrentLineItemValue('expense', 'memo',
            'Header Charges for line: '
            + nlapiSelectValue(invoiceline, 'description'));


    // check for custom fields on line level
    if (nlapiGetContext().getSetting('SCRIPT',
            'custscript_coupa_inv_custfield_line_cnt'))
            {
        for (var y = 1; y <= nlapiGetContext().getSetting('SCRIPT',
            'custscript_coupa_inv_custfield_line_cnt'); y++) {
            if (nlapiGetContext().getSetting('SCRIPT',
                    'custscript_coupa_inv_custfieldline' + y)) {
                var custfield;
                var valuetoinsert = null;
                var textOrValue;
                if (nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_custfieldline' + y).split(':')) {
                    custfield = nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_custfieldline' + y)
                        .split(':');

                    if (custfield[4]) {
                        valuetoinsert = custfield[4];
                        nlapiLogExecution('DEBUG', 'Valuetoinsert = ',
                            valuetoinsert);
                    }

                    else {

                        if (nlapiSelectValue(invoiceline, custfield[0]))
                            valuetoinsert = nlapiSelectValue(invoiceline,
                                custfield[0]);

                        nlapiLogExecution('DEBUG', 'Line Custom ' + y,
                            'Coupa field = '
                            + nlapiSelectValue(invoiceline,
                                custfield[0])
                            + ' ValuetoInsert = ' + valuetoinsert);

                        if (custfield[2]
                            && nlapiSelectValue(invoiceline, custfield[0]))
                             {
                            if (custfield[2] == 'Date')
                            {
                                valuetoinsert = ConvertCoupaDateToNetSuiteDate(nlapiSelectValue(
                                    invoiceline, custfield[0]));
                                nlapiLogExecution('DEBUG',
                                    'Line Custom Inside coupatype = date'
                                    + y, 'Coupa field = '
                                    + nlapiSelectValue(invoiceline,
                                        custfield[0])
                                    + ' ValuetoInsert = '
                                    + valuetoinsert);
                            }

                            if (custfield[2] == 'Lookup') {

                                valuetoinsert = nlapiSelectValue(invoiceline,
                                    custfield[0] + '/external-ref-num');
                                nlapiLogExecution('DEBUG',
                                    'Line Custom Inside coupatype = lookup'
                                    + y, 'Coupa field = '
                                    + nlapiSelectValue(invoiceline,
                                        custfield[0])
                                    + ' ValuetoInsert = '
                                    + valuetoinsert);
                            }

                        }
                        if (custfield[2] == 'Boolean') {
                            valuetoinsert = nlapiSelectValue(invoice,
                                custfield[0]);
                            if (valuetoinsert == 't' || valuetoinsert == 'yes'
                                || valuetoinsert == 'y'
                                || valuetoinsert == 'true'
                                || valuetoinsert == 'True') {
                                valuetoinsert = 'T';
                            } else {
                                valuetoinsert = 'F';
                            }
                        }

                    }

                    textOrValue = 'Text';
                    if (custfield[3]) {
                        textOrValue = custfield[3];
                    }

                    nlapiLogExecution('DEBUG', 'Line CustomField' + ' ' + y,
                        " custfield0 = " + custfield[0] + " custfield1 = "
                        + custfield[1] + " custfield2 = "
                        + custfield[2] + " custfield3 = "
                        + custfield[3] + " valuetoinsert = "
                        + valuetoinsert);

                    if (valuetoinsert != null && valuetoinsert != undefined
                        && valuetoinsert != 'None')
                         {

                        if (textOrValue == 'Text')
                            record.setCurrentLineItemText('expense',
                                custfield[1], valuetoinsert);
                        else
                            record.setCurrentLineItemValue('expense',
                                custfield[1], valuetoinsert);
                    }

                }
            }
        }
    }

            record.commitLineItem('expense');
    } // handling charge == true
	// misc charge == true
    if (miscCharge == true && miscamount != null &&  miscamount != '')
    {

    var accountNode;
    var dynamicAccounting = 'F';
    if (nlapiGetContext().getSetting('SCRIPT',
            'custscript_coupa_inv_dynamicaccts'))
        dynamicAccounting = nlapiGetContext().getSetting('SCRIPT',
            'custscript_coupa_inv_dynamicaccts');

    if (isSplit)
        accountNode = splitaccountNode;
    else
        accountNode = nlapiSelectNode(invoiceline, 'account');

    record.selectNewLineItem('expense');

    if (nlapiGetContext().getSetting('SCRIPT', 'custscript_coupa_inv_glactseg')) {
        var account;
        var accountnumber;
        var accountId;
        // var act;
        account = nlapiSelectValue(
            accountNode,
            nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_glactseg')).split(':');
        // act = account[0].split(' ');
        accountnumber = account[0];
        if (dynamicAccounting == 'T') {
            accountId = getNetsuiteAccountId(accountnumber);
        } else {
            accountId = getNetsuiteAccountId(accountnumber);
        }
        if (accountId != 'INVALID_ACCOUNT')
            record.setCurrentLineItemValue('expense', 'account', accountId);
        else {
            nlapiLogExecution('ERROR', 'Processing Error - Invalid GL account',
                'GL Account =' + accountnumber + ' Invoice Number = '
                + nlapiSelectValue(invoice, 'invoice-number')
                + ' Supplier Name = '
                + nlapiSelectValue(invoice, 'supplier/name'));
            nlapiSendEmail(
                -5,
                nlapiGetContext().getSetting('SCRIPT',
                    'custscript_coupa_inv_email_notifications'),
                nlapiGetContext().getSetting('SCRIPT',
                    'custscript_coupa_inv_acccountname')
                + ' Invoice Integration:Processing Error - Invalid GL account',
                'GL Account =' + accountnumber + ' Invoice Number = '
                + nlapiSelectValue(invoice, 'invoice-number')
                + ' Supplier Name = '
                + nlapiSelectValue(invoice, 'supplier/name'));
            return;
        }
    }




    if (nlapiGetContext().getSetting('SCRIPT', 'custscript_coupa_inv_deptseg')) {
        var dept = nlapiSelectValue(
            accountNode,
            nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_deptseg')).split(':');
        if (dynamicAccounting == 'T') {
            record.setCurrentLineItemValue('expense', 'department', dept);
        } else {
            record.setCurrentLineItemValue('expense', 'department', dept[1]);
        }
    }

    if (nlapiGetContext().getSetting('SCRIPT', 'custscript_coupa_inv_classseg')) {
        var clss = nlapiSelectValue(
            accountNode,
            nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_classseg')).split(':');
        if (dynamicAccounting == 'T') {
            record.setCurrentLineItemValue('expense', 'class', clss);
        } else {
            record.setCurrentLineItemValue('expense', 'class', clss[1]);
        }
    }

    if (nlapiGetContext().getSetting('SCRIPT', 'custscript_coupa_inv_locseg')) {
        var locId = nlapiSelectValue(
            accountNode,
            nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_locseg')).split(':');
        if (dynamicAccounting == 'T') {
            record.setCurrentLineItemValue('expense', 'location', locId);
        } else {
            record.setCurrentLineItemValue('expense', 'location', locId[1]);
        }
    }

    else if (nlapiGetContext().getSetting('SCRIPT',
            'custscript_coupa_inv_loccust')) {
        var locId = getNetSuiteId('location', nlapiSelectValue(invoiceline,
            nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_loccust')));
        if (locId != 'INVALID_NAME')
            record.setCurrentLineItemValue('expense', 'location', locId);
    }

    /* check for Coupa order line */
    if (nlapiSelectValue(invoiceline, 'order-header-num')
        && nlapiSelectValue(invoiceline, 'order-line-num')) {
        var poheadernum = nlapiSelectValue(invoiceline, 'order-header-num');
        var polinenum = nlapiSelectValue(invoiceline, 'order-line-num');
        record.setCurrentLineItemValue('expense', 'custcol_coupaponum',
            poheadernum + '-' + polinenum);
    }

	record.setCurrentLineItemValue('expense','taxcode', miscChargeTaxCode);
	nlapiLogExecution('DEBUG', 'misclinecharge',misclinecharge);
	record.setCurrentLineItemValue('expense', 'amount', parseFloat(misclinecharge.toFixed(2)));

    if (isSplit)
        record.setCurrentLineItemValue('expense', 'memo',
            'Header Charges for Split line: '
            + nlapiSelectValue(invoiceline, 'description'));
    else
        record.setCurrentLineItemValue('expense', 'memo',
            'Header Charges for line: '
            + nlapiSelectValue(invoiceline, 'description'));


    // check for custom fields on line level
    if (nlapiGetContext().getSetting('SCRIPT',
            'custscript_coupa_inv_custfield_line_cnt'))
            {
        for (var y = 1; y <= nlapiGetContext().getSetting('SCRIPT',
            'custscript_coupa_inv_custfield_line_cnt'); y++) {
            if (nlapiGetContext().getSetting('SCRIPT',
                    'custscript_coupa_inv_custfieldline' + y)) {
                var custfield;
                var valuetoinsert = null;
                var textOrValue;
                if (nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_custfieldline' + y).split(':')) {
                    custfield = nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_custfieldline' + y)
                        .split(':');

                    if (custfield[4]) {
                        valuetoinsert = custfield[4];
                        nlapiLogExecution('DEBUG', 'Valuetoinsert = ',
                            valuetoinsert);
                    }

                    else {

                        if (nlapiSelectValue(invoiceline, custfield[0]))
                            valuetoinsert = nlapiSelectValue(invoiceline,
                                custfield[0]);

                        nlapiLogExecution('DEBUG', 'Line Custom ' + y,
                            'Coupa field = '
                            + nlapiSelectValue(invoiceline,
                                custfield[0])
                            + ' ValuetoInsert = ' + valuetoinsert);

                        if (custfield[2]
                            && nlapiSelectValue(invoiceline, custfield[0]))
                             {
                            if (custfield[2] == 'Date')
                            {
                                valuetoinsert = ConvertCoupaDateToNetSuiteDate(nlapiSelectValue(
                                    invoiceline, custfield[0]));
                                nlapiLogExecution('DEBUG',
                                    'Line Custom Inside coupatype = date'
                                    + y, 'Coupa field = '
                                    + nlapiSelectValue(invoiceline,
                                        custfield[0])
                                    + ' ValuetoInsert = '
                                    + valuetoinsert);
                            }

                            if (custfield[2] == 'Lookup') {

                                valuetoinsert = nlapiSelectValue(invoiceline,
                                    custfield[0] + '/external-ref-num');
                                nlapiLogExecution('DEBUG',
                                    'Line Custom Inside coupatype = lookup'
                                    + y, 'Coupa field = '
                                    + nlapiSelectValue(invoiceline,
                                        custfield[0])
                                    + ' ValuetoInsert = '
                                    + valuetoinsert);
                            }

                        }
                        if (custfield[2] == 'Boolean') {
                            valuetoinsert = nlapiSelectValue(invoice,
                                custfield[0]);
                            if (valuetoinsert == 't' || valuetoinsert == 'yes'
                                || valuetoinsert == 'y'
                                || valuetoinsert == 'true'
                                || valuetoinsert == 'True') {
                                valuetoinsert = 'T';
                            } else {
                                valuetoinsert = 'F';
                            }
                        }

                    }

                    textOrValue = 'Text';
                    if (custfield[3]) {
                        textOrValue = custfield[3];
                    }

                    nlapiLogExecution('DEBUG', 'Line CustomField' + ' ' + y,
                        " custfield0 = " + custfield[0] + " custfield1 = "
                        + custfield[1] + " custfield2 = "
                        + custfield[2] + " custfield3 = "
                        + custfield[3] + " valuetoinsert = "
                        + valuetoinsert);

                    if (valuetoinsert != null && valuetoinsert != undefined
                        && valuetoinsert != 'None')
                         {

                        if (textOrValue == 'Text')
                            record.setCurrentLineItemText('expense',
                                custfield[1], valuetoinsert);
                        else
                            record.setCurrentLineItemValue('expense',
                                custfield[1], valuetoinsert);
                    }

                }
            }
        }
    }

            record.commitLineItem('expense');
    } // misc charge == true

  }catch (e)
  {
  nlapiLogExecution('ERROR',
            'Processing Error - Unable to set the header charges',
            ' Error Description = ' + e.message);

  }
}

function UpdateVendorBill(invoice, id) {
    // nlapiLogExecution('DEBUG', 'Update Vendor Bill ', 'Netsuite Id = ' + id +
    // ' Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number'));

    var lineleveltaxation = 'false';

    lineleveltaxation = nlapiSelectValue(invoice, 'line-level-taxation');

    var record = nlapiLoadRecord('vendorbill', id);

    lineleveltaxation = nlapiSelectValue(invoice, 'line-level-taxation');

    record.setFieldValue('externalid', nlapiSelectValue(invoice, 'id'));
    record.setFieldValue('trandate',
        ConvertCoupaDateToNetSuiteDate(nlapiSelectValue(invoice,
            'invoice-date')));
    var supplierNode = nlapiSelectNode(invoice, 'supplier');
    // nlapiLogExecution('DEBUG', 'SupplierName', nlapiSelectValue(supplierNode,
    // 'name'));

    if (nlapiSelectValue(supplierNode, 'number'))
        record
            .setFieldValue('entity', nlapiSelectValue(supplierNode,
                'number'));
    else
    // try setting supplier name instead on id
        record.setFieldText('entity', nlapiSelectValue(supplierNode, 'name'));

    var paymentTermNode = nlapiSelectNode(invoice, 'payment-term');
    // nlapiLogExecution('DEBUG', 'Payment Term',
    // nlapiSelectValue(paymentTermNode, 'code'));

    var terms = 'Net 30';
    if (paymentTermNode) {
        terms = getNetsuitetermid(nlapiSelectValue(paymentTermNode, 'code'));
    }
    record.setFieldValue('terms', terms);

    // set the posting period - see customization for coupa
    var today = new Date();
    var postingPeriod = getMonthShortName(today.getMonth()) + ' '
        + today.getFullYear();

    // nlapiLogExecution('DEBUG', 'Today date day = ', today.getDate());

    if (today.getDate() < 7) {
        var nDate = nlapiSelectValue(invoice, 'invoice-date').split('T');
        var datesplit = nDate[0].split('-');
        var Nyear = datesplit[0];
        // var Nday = datesplit[2];
        var Nmonth = datesplit[1] - 1;
        /*
         * nlapiLogExecution('DEBUG', 'Posting period details', 'invoicemonth = ' +
         * Nmonth + ' today month = ' + today.getMonth() + ' invoice year = ' +
         * Nyear + ' today year = ' + today.getFullYear());
         */
        if (today.getFullYear() > Nyear) {
            if (today.getMonth() == 0)
                postingPeriod = getMonthShortName('11') + ' '
                    + (today.getFullYear() - 1);
            else
                postingPeriod = getMonthShortName(today.getMonth() - 1) + ' '
                    + today.getFullYear();
        }

        if (Nmonth < today.getMonth() && Nyear == today.getFullYear())
            postingPeriod = getMonthShortName(today.getMonth() - 1) + ' '
                + today.getFullYear();
    }
    record.setFieldText('postingperiod', postingPeriod);

    // set accounts payable account if passed as parameter to the script
    if (nlapiGetContext().getSetting('SCRIPT',
            'custscript_coupa_inv_actpayablenum')) {
        var apAccountId = getNetsuiteAccountId(nlapiGetContext().getSetting(
            'SCRIPT', 'custscript_coupa_inv_actpayablenum'));

        if (apAccountId != 'INVALID_ACCOUNT')
            record.setFieldValue('account', apAccountId);
    }

    record.setFieldValue('tranid', nlapiSelectValue(invoice, 'invoice-number'));

    // customization for Coupa to handle old COA
    var oldCOA = 'false';
    if (nlapiSelectValue(invoice, 'account-type/name') == 'Coupa Chart of Accounts - old') {
        oldCOA = 'true';
    }

    var shippingamount = parseFloat(nlapiSelectValue(invoice, 'shipping-amount'));
    var handlingamount = parseFloat(nlapiSelectValue(invoice, 'handling-amount'));
    var taxamount = parseFloat(nlapiSelectValue(invoice, 'tax-amount'));
    var miscamount = parseFloat(nlapiSelectValue(invoice, 'misc-amount'));

    /*
     * nlapiLogExecution('DEBUG', 'Other Charges', 'Shipping = ' +
     * shippingamount + ' Handling = ' + handlingamount + ' Taxamount = ' +
     * taxamount + ' miscamount = ' + miscamount);
     */

    var totalheadercharges;
    if (lineleveltaxation == 'false')
        totalheadercharges = parseFloat(shippingamount)
            + parseFloat(handlingamount) + parseFloat(taxamount)
            + parseFloat(miscamount);
    else
        totalheadercharges = parseFloat(shippingamount)
            + parseFloat(handlingamount) + parseFloat(miscamount);

    var invoiceLine = nlapiSelectNode(invoice, 'invoice-lines');
    var invoiceLineNodes = new Array();

    invoiceLineNodes = nlapiSelectNodes(invoiceLine, 'invoice-line');

    // get total amount by adding the line amounts
    var totalamount = 0;

    for (var x = 0; x < invoiceLineNodes.length; x++) {
        totalamount = parseFloat(totalamount)
            + parseFloat(nlapiSelectValue(invoiceLineNodes[x], 'total'));
    }

    var totalheaderamount = parseFloat(totalamount)
        + parseFloat(totalheadercharges);
    totalheaderamount = totalheaderamount.toFixed(3);
    var totalcalcamount = 0;

    var expenselinetotal = record.getLineItemCount('expense');

    /*
     * void the existing expense lines
     *
     */
    if (expenselinetotal >= 1) {
        for (var j = 1; j <= expenselinetotal; j++) {
            record.selectLineItem('expense', j);
            record.setCurrentLineItemValue('expense', 'memo',
                'Voiding line because of vendor bill update');
            record.setCurrentLineItemValue('expense', 'isbillable', 'F');
            record.setCurrentLineItemValue('expense', 'amount', '0');
            record.commitLineItem('expense');
        }
    }

    for (var x = 0; x < invoiceLineNodes.length; x++) {

        var linetax = parseFloat(nlapiSelectValue(invoiceLineNodes[x],
            'tax-amount'));

        if (linetax)
            totalheaderamount = parseFloat(totalheaderamount)
                + parseFloat(linetax);

        var invoicelineamount = parseFloat(nlapiSelectValue(
            invoiceLineNodes[x], 'total'));
        var splitaccounting = 'FALSE';
        var actalloc = nlapiSelectNode(invoiceLineNodes[x],
            'account-allocations');
        var accountallocations = new Array();
        accountallocations = nlapiSelectNodes(actalloc, 'account-allocation');
        if (accountallocations.length >= 1) {
            splitaccounting = 'TRUE';
            // nlapiLogExecution('DEBUG', 'Split accounting = ',
            // splitaccounting);
        }

        if (splitaccounting == 'TRUE') {
            for (var i = 0; i < accountallocations.length; i++) {
                var lineamount = parseFloat(nlapiSelectValue(
                    accountallocations[i], 'amount'));

                var linecharge = (parseFloat(lineamount) / parseFloat(totalamount))
                    * totalheadercharges;

				//var linecharge = 0;
                var splitlinetax = 0.00;
                if (linetax) {
                    splitlinetax = (parseFloat(lineamount) / parseFloat(invoicelineamount))
                        * linetax;
                    // nlapiLogExecution('DEBUG', 'split line tax details ',
                    // 'splitline amount = ' + lineamount + ' splitlinetax = ' +
                    // splitlinetax);
                }
                var adjlineamount;

                if (linetax)
                    adjlineamount = parseFloat(lineamount)
                        + parseFloat(linecharge) + parseFloat(splitlinetax);
                else
                    adjlineamount = parseFloat(lineamount)
                        + parseFloat(linecharge);

                adjlineamount = adjlineamount.toFixed(2);
                var accountNode = nlapiSelectNode(accountallocations[i],
                    'account');

                record.selectNewLineItem('expense');

                if (nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_glactseg')) {
                    var accountnumber;

                    if (oldCOA == 'true')
                        accountnumber = '69999';
                    else
                        accountnumber = nlapiSelectValue(accountNode,
                            nlapiGetContext().getSetting('SCRIPT',
                                'custscript_coupa_inv_glactseg'));

                    var accountId = getNetsuiteAccountId(accountnumber);

                    if (accountId != 'INVALID_ACCOUNT')
                        record.setCurrentLineItemValue('expense', 'account',
                            accountId);
                    else {
                        nlapiLogExecution(
                            'ERROR',
                            'Processing Error - Invalid GL account',
                            'GL Account ='
                            + accountnumber
                            + ' Invoice Number = '
                            + nlapiSelectValue(invoice,
                                'invoice-number')
                            + ' Supplier Name = '
                            + nlapiSelectValue(supplierNode, 'name'));
                        nlapiSendEmail(
                            -5,
                            nlapiGetContext()
                                .getSetting('SCRIPT',
                                    'custscript_coupa_inv_email_notifications'),
                            nlapiGetContext().getSetting('SCRIPT',
                                'custscript_coupa_inv_acccountname')
                            + ' Invoice Integration:Processing Error - Invalid GL account',
                            'GL Account ='
                            + accountnumber
                            + ' Invoice Number = '
                            + nlapiSelectValue(invoice,
                                'invoice-number')
                            + ' Supplier Name = '
                            + nlapiSelectValue(supplierNode, 'name'));
                        return;
                    }
                }

                if (nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_deptseg')) {
                    var deptId;
                    if (oldCOA == 'true')
                        deptId = getNetSuiteId('department', 'GNA');
                    else
                        deptId = getNetSuiteId('department', nlapiSelectValue(
                            accountNode, nlapiGetContext().getSetting(
                                'SCRIPT',
                                'custscript_coupa_inv_deptseg')));

                    if (deptId != 'INVALID_NAME')
                        record.setCurrentLineItemValue('expense', 'department',
                            deptId);
                }

                if (nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_classseg')) {
                    var classId = getNetSuiteId('classification',
                        nlapiSelectValue(accountNode, nlapiGetContext()
                            .getSetting('SCRIPT',
                                'custscript_coupa_inv_classseg')));
                    if (classId != 'INVALID_NAME')
                        record.setCurrentLineItemValue('expense', 'class',
                            classId);
                }

                // check for Coupa order line
                if (nlapiSelectValue(invoiceLineNodes[x], 'order-header-num')
                    && nlapiSelectValue(invoiceLineNodes[x],
                        'order-line-num')) {
                    var poheadernum = nlapiSelectValue(invoiceLineNodes[x],
                        'order-header-num');
                    var polinenum = nlapiSelectValue(invoiceLineNodes[x],
                        'order-line-num');
                    record
                        .setCurrentLineItemValue('expense',
                            'custcol_coupaponum', poheadernum + '-'
                            + polinenum);
                }

                record.setCurrentLineItemValue('expense', 'memo',
                    nlapiSelectValue(invoiceLineNodes[x], 'description'));

                if ((i == 0) && (x == 0))
				{
                    totalcalcamount = parseFloat(adjlineamount);
	                if (nlapiGetContext().getSetting('SCRIPT',
	                        'custscript_coupa_inv_send_taxcode')
	                    && (nlapiGetContext().getSetting('SCRIPT',
	                        'custscript_coupa_inv_send_taxcode') == 'T'))
					{
					linepercent = (Math.round((parseFloat(adjlineamount)/parseFloat(totalamount)) * 1000) / 1000).toFixed(3);
					totalcalcpercent = parseFloat(linepercent);
					}
				}
                else
				{
                    totalcalcamount = parseFloat(totalcalcamount)
                        + parseFloat(adjlineamount);
		            if (nlapiGetContext().getSetting('SCRIPT',
		                        'custscript_coupa_inv_send_taxcode')
		                 && (nlapiGetContext().getSetting('SCRIPT',
		                        'custscript_coupa_inv_send_taxcode') == 'T'))
					{
						linepercent = (Math.round((parseFloat(adjlineamount)/parseFloat(totalamount)) * 1000) / 1000).toFixed(3);
						totalcalcpercent = parseFloat(linepercent) + parseFloat(totalcalcpercent);
					}
				}

                // nlapiLogExecution('DEBUG', 'Invoice Line details ', 'Invoice
                // Line ' + x + ' SplitLine = ' + i + ' adjlineamount = ' +
                // adjlineamount);
	            if (nlapiGetContext().getSetting('SCRIPT',
	                        'custscript_coupa_inv_send_taxcode')
	                 && (nlapiGetContext().getSetting('SCRIPT',
	                        'custscript_coupa_inv_send_taxcode') == 'T'))
				{
					totalcalcpercent = totalcalcpercent.toFixed(3);
				}

                if ((x == invoiceLineNodes.length - 1)
                    && (i == accountallocations.length - 1)) {
                    var roundingerror = totalheaderamount - totalcalcamount;

                    /*
                     * nlapiLogExecution('DEBUG', 'Rounding Error Details ',
                     * 'RoundingError = ' + roundingerror + ' totalheaderamount = ' +
                     * totalheaderamount + ' totalcalcamount = ' +
                     * totalcalcamount);
                     */
                    if (roundingerror) {
                        roundingerror = Math
                                .round(parseFloat(roundingerror) * 100) / 100;
                        adjlineamount = parseFloat(adjlineamount)
                            + roundingerror;
                    }
                }
                record.setCurrentLineItemValue('expense', 'amount',
                    parseFloat(adjlineamount));
                record.commitLineItem('expense');

            } // end of the for loop for split lines
        } // end of if loop for split accounting to True

        else {

            var lineamount = parseFloat(nlapiSelectValue(invoiceLineNodes[x],
                'total'));
            var linecharge = (parseFloat(lineamount) / parseFloat(totalamount))
                * totalheadercharges;
			//var linecharge = 0;
            var adjlineamount;

            if (linetax)
                adjlineamount = parseFloat(lineamount) + parseFloat(linecharge)
                    + parseFloat(linetax);
            else
                adjlineamount = parseFloat(lineamount) + parseFloat(linecharge);
            adjlineamount = adjlineamount.toFixed(2);
            var accountNode = nlapiSelectNode(invoiceLineNodes[x], 'account');

            record.selectNewLineItem('expense');

            if (nlapiGetContext().getSetting('SCRIPT',
                    'custscript_coupa_inv_glactseg')) {
                var accountnumber;

                if (oldCOA == 'true')
                    accountnumber = '69999';
                else
                    accountnumber = nlapiSelectValue(accountNode,
                        nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_glactseg'));
                var accountId = getNetsuiteAccountId(accountnumber);
                record.setCurrentLineItemValue('expense', 'account', accountId);
            }

            if (nlapiGetContext().getSetting('SCRIPT',
                    'custscript_coupa_inv_deptseg')) {
                var deptId;

                if (oldCOA == 'true')
                    deptId = getNetSuiteId('department', 'GNA');
                else
                    deptId = getNetSuiteId('department', nlapiSelectValue(
                        accountNode, nlapiGetContext().getSetting('SCRIPT',
                            'custscript_coupa_inv_deptseg')));

                if (deptId != 'INVALID_NAME')
                    record.setCurrentLineItemValue('expense', 'department',
                        deptId);
            }

            if (nlapiGetContext().getSetting('SCRIPT',
                    'custscript_coupa_inv_classseg')) {
                var classId = getNetSuiteId('classification', nlapiSelectValue(
                    accountNode, nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_classseg')));
                if (classId != 'INVALID_NAME')
                    record.setCurrentLineItemValue('expense', 'class', classId);
            }

            // check for Coupa order line
            if (nlapiSelectValue(invoiceLineNodes[x], 'order-header-num')
                && nlapiSelectValue(invoiceLineNodes[x], 'order-line-num')) {
                var poheadernum = nlapiSelectValue(invoiceLineNodes[x],
                    'order-header-num');
                var polinenum = nlapiSelectValue(invoiceLineNodes[x],
                    'order-line-num');
                record.setCurrentLineItemValue('expense', 'custcol_coupaponum',
                    poheadernum + '-' + polinenum);
            }

            record.setCurrentLineItemValue('expense', 'memo', nlapiSelectValue(
                invoiceLineNodes[x], 'description'));

            if (x == 0)
                totalcalcamount = parseFloat(adjlineamount);
            else
                totalcalcamount = parseFloat(totalcalcamount)
                    + parseFloat(adjlineamount);


            if (x == invoiceLineNodes.length - 1) {
                var roundingerror = totalheaderamount - totalcalcamount;

                /*
                 * nlapiLogExecution('DEBUG', 'Rounding Error Details ',
                 * 'RoundingError = ' + roundingerror + ' totalheaderamount = ' +
                 * totalheaderamount + ' totalcalcamount = ' + totalcalcamount);
                 */
                if (roundingerror) {
                    roundingerror = Math.round(parseFloat(roundingerror) * 100) / 100;
                    adjlineamount = parseFloat(adjlineamount) + roundingerror;
                }
            }

            nlapiLogExecution('DEBUG', 'Invoice Line details ', 'Line ' + x +
            ' adjlineamount = ' + adjlineamount);

            nlapiLogExecution('DEBUG', 'Invoice Line details ', 'Line ' + x +
            ' totalcalcamount = ' + totalcalcamount);

            record.setCurrentLineItemValue('expense', 'amount',
                parseFloat(adjlineamount));
            record.commitLineItem('expense');
        } // end of else --- i.e if not split accounting

    } // end of main for loop that goes through each invoice line

    /*
     * delete the remaining expense lines if (expenselinetotal >
     * invoiceLineNodes.length) { for (var a = invoiceLineNodes.length+1; a <=
     * expenselinetotal; a++ ) { nlapiLogExecution('DEBUG', 'before deleting
     * expense line '+ a, 'Expenselinetotoal = ' + expenselinetotal);
     * record.removeLineItem('expense', a); nlapiLogExecution('DEBUG', 'after
     * deleting expense line '+ a, 'Expenselinetotoal = ' + expenselinetotal); } }
     * delete the remaining expense lines
     */

    try {
        nlapiSubmitRecord(record, true);
    } catch (e) {
        nlapiLogExecution('ERROR',
            'Processing Error - Unable to create vendor bill',
            ' Invoice Number = '
            + nlapiSelectValue(invoice, 'invoice-number')
            + ' Supplier Name = '
            + nlapiSelectValue(supplierNode, 'name')
            + ' Error Description = ' + e.message);
        nlapiSendEmail(
            -5,
            nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_email_notifications'),
            nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_acccountname')
            + ' Invoice Integration:Processing Error - Unable to create vendor bill',
            'Invoice Number = '
            + nlapiSelectValue(invoice, 'invoice-number')
            + ' Supplier Name = '
            + nlapiSelectValue(supplierNode, 'name')
            + ' Error description = ' + e.message);
        return;
    }
    Setexportedtotrue(nlapiSelectValue(invoice, 'id'));

}

function vendorBillExists(tranid, externalid, entity) {
    // nlapiLogExecution('DEBUG','in vendorBillExists', 'tranid = ' + tranid + '
    // externalid = ' + externalid);
    var filters = new Array();

    filters[0] = new nlobjSearchFilter('tranid', null, 'is', tranid);
    filters[1] = new nlobjSearchFilter('entity', null, 'is', entity);

    // filters[1] = new nlobjSearchFilter( 'externalid', null, 'is', externalid
    // );
    // filters[2] = new nlobjSearchFilter( 'entity', null, 'is', entity );
    // filters[2] = new nlobjSearchFilter( 'accounttype', null, 'anyof',
    // 'Accounts Payable' );

    // var columns = new Array();
    // columns[0] = new nlobjSearchColumn( 'accounttype' );

    var searchresults = nlapiSearchRecord('vendorbill', null, filters);
    // nlapiLogExecution('DEBUG','in vendorBillExists', 'tranid = ' + tranid + '
    // externalid = ' + externalid + ' searchresults = ' + searchresults);

    if (searchresults && searchresults.length > 0) {
        nlapiLogExecution('DEBUG',
            'in vendorBillExists found Vendorbill in Netsuite', 'tranid = '
            + tranid + ' externalid = ' + externalid
            + ' searchresults = ' + searchresults[0].getId());
        return searchresults[0].getId();
    } else
        return 'false';

}

function getNetsuitetermid(coupaTerm) {
    var searchresults = nlapiSearchRecord('term', null, nlobjSearchFilter(
        'name', null, 'is', coupaTerm));

    // nlapiLogExecution('DEBUG', 'in getNetsuitetermid after calling Search
    // record', coupaTerm);

    // if (searchresults.length !=1)
    if (!searchresults) {
        nlapiLogExecution('Error', 'Error getting payment terms id', coupaTerm);
        return 'INVALID_PAYMENT_TERM';
    }
    // nlapiLogExecution('DEBUG', 'in getNetsuitetermid after calling Search
    // record', searchresults[0].getId());

    return searchresults[0].getId();
}

function getNetsuiteAccountId(accountnumber) {
    var filters = new Array();
    filters[0] = new nlobjSearchFilter('number', null, 'is', accountnumber);
    // filters[1] = new nlobjSearchFilter( 'name', null, 'is', accountname );

    var searchresults = nlapiSearchRecord('account', null, filters);

    // nlapiLogExecution('DEBUG', 'in getNetsuitetermid after calling Search
    // record', coupaTerm);

    // if (searchresults.length !=1)
    if (!searchresults) {
        nlapiLogExecution('Error', 'Error getting Account ID',
            'Accountnumber = ' + accountnumber);
        return 'INVALID_ACCOUNT';
    }
    // nlapiLogExecution('DEBUG', 'in getNetsuitetermid after calling Search
    // record', searchresults[0].getId());

    return searchresults[0].getId();
}

function getNetSuiteId(objectinternalid, objectname) {
    // nlapiLogExecution('DEBUG', 'Before getting id via search',
    // 'internalobjectid = ' + objectinternalid + ' objectname = ' +
    // objectname);

    var searchresults = nlapiSearchRecord(objectinternalid, null,
        nlobjSearchFilter('namenohierarchy', null, 'is', objectname));

    // nlapiLogExecution('DEBUG', 'in getNetsuitetermid after calling Search
    // record', coupaTerm);

    // if (searchresults.length !=1)
    if (!searchresults) {
        nlapiLogExecution('Error', 'Error getting ID for',
            'internalobjectid = ' + objectinternalid + ' objectname =  '
            + objectname);
        return 'INVALID_NAME';
    }
    // nlapiLogExecution('DEBUG', 'in getNetsuitetermid after calling Search
    // record', searchresults[0].getId());

    return searchresults[0].getId();
}

function getAccoutingPeriodNetsuiteId(objectinternalid, objectname) {

	if (objectinternalid == 'accountingperiod')
	{

		//var periodName = TO_CHAR(TO_DATE(objectname, 'MON YYYY'), 'YYYY-MM');
		//var searchresults = nlapiSearchRecord(objectinternalid, null,
		//	nlobjSearchFilter('periodname', null, 'is', objectname));

		var searchresults = nlapiSearchRecord(objectinternalid, null,
			nlobjSearchFilter('periodname', null, 'is', objectname));

		if (!searchresults) {
			/*nlapiLogExecution('DEBUG', 'Error getting ID for',
				'internalobjectid = ' + objectinternalid + ' objectname =  '
				+ objectname + '(' + periodName + ')');*/
			nlapiLogExecution('DEBUG', 'Error getting ID for',
		            'internalobjectid = ' + objectinternalid + ' objectname =  '
		            + objectname);
			return 'INVALID_PERIOD_NAME';
		}
	}

    return searchresults[0].getId();
}

function Setexportedtotrue(id) {
    var headers = new Array();
    headers['Accept'] = 'text/xml';
    headers['X-COUPA-API-KEY'] = nlapiGetContext().getSetting('SCRIPT',
        'custscript_coupa_inv_apikey');

    var url = nlapiGetContext()
            .getSetting('SCRIPT', 'custscript_coupa_inv_url')
        + '/api/invoices/' + id + '?return_object=none';
    var postData = "<?xml version='1.0' encoding='UTF-8'?><invoice-header><exported type='boolean'>true</exported></invoice-header>";
    var response = '';
    var iTimeOutCnt = 0;

    // loop start
    for (var k = 0; k < 1; k++) {
        // try start
        try {
            response = nlapiRequestURL(url, postData, headers, 'PUT');
        } catch (error) {
            if (error instanceof nlobjError) {
                var errordetails;
                errorcode = error.getCode();
                switch (errorcode) {
                    case "SSS_REQUEST_TIME_EXCEEDED":
                        if (iTimeOutCnt > 2) {
                            errordetails = "Connection closed because it has exceed the time out period (NetSuite has not received a response after 5 seconds on initial connection or after 45 seconds on the request). tried to establish connection 3 times and still failed. Please contact Technical Support.";
                            exit = true;
                            break;
                        } else {
                            errordetails = "Connection closed because it has exceed the time out period (NetSuite has not received a response after 5 seconds on initial connection or after 45 seconds on the request). retrying to establish a connection.";
                            iTimeOutCnt = iTimeOutCnt + 1;
                            k = 0;
                            break;
                        }
                    default:
                        errordetails = error.getDetails() + ".";
                        exit = true;
                        break;
                }
                nlapiLogExecution('ERROR',
                    'Processing Error - Unable to set export flag',
                    ' Coupa Invoice Id = ' + id + ' Error code:'
                    + errorcode + 'Error description:'
                    + errordetails);
                nlapiSendEmail(
                    -5,
                    nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_email_notifications'),
                    nlapiGetContext().getSetting('SCRIPT',
                        'custscript_coupa_inv_acccountname')
                    + ' Invoice Integration:Processing Error - Unable to set export flag',
                    'Unable to set export flag - Coupa Invoice Id = ' + id
                    + ' Error code:' + errorcode
                    + 'Error description:' + errordetails);

            }
        } // catch end

    }// loop end

    if (response.getCode() != '200') {
        nlapiLogExecution('ERROR',
            'Processing Error - Unable to set export flag',
            ' Coupa Invoice Id = ' + id);
        nlapiSendEmail(
            -5,
            nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_email_notifications'),
            nlapiGetContext().getSetting('SCRIPT',
                'custscript_coupa_inv_acccountname')
            + ' Invoice Integration:Processing Error - Unable to set export flag',
            'Unable to set export flag - Coupa Invoice Id = ' + id);
    }

}

function ConvertCoupaDateToNetSuiteDate(CoupaDate) {
    var dateformat = nlapiLoadConfiguration('companypreferences')
        .getFieldValue('dateformat');
    var nDate = CoupaDate.split('T');

    var datesplit = nDate[0].split('-');

    var Nyear = datesplit[0];

    var Nday = datesplit[2];

    var Nmonth = datesplit[1];

    var netDate = Nmonth + '/' + Nday + '/' + Nyear;
    if (dateformat == 'DD/MM/YYYY') {
        netDate = Nday + '/' + Nmonth + '/' + Nyear;
    }
    return netDate;
}

function netsuitedatetoCoupadate(netsuitedate) {
    var dateformat = nlapiLoadConfiguration('companypreferences')
        .getFieldValue('dateformat');
    var datesplit = netsuitedate.split("/");
    var Nyear = datesplit[2];
    var Nday = datesplit[1];
    var Nmonth = datesplit[0];

    if (dateformat == 'DD/MM/YYYY') {
        Nyear = datesplit[2];
        Nday = datesplit[0];
        Nmonth = datesplit[1];
    }

    return Nyear + "-" + Nmonth + "-" + Nday + "T00:00:00-08:00";
}

function getTodaysDate() {
    var today = new Date();
    return today.getDate();
}

function getMonthShortName(monthdate) {
    var monthNames = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug",
        "Sep", "Oct", "Nov", "Dec" ];
    return monthNames[monthdate];
}

function getNetsuiteCurrency(objectinternalid, objectname) {
    // nlapiLogExecution('DEBUG', 'Before getting id via search',
    // 'internalobjectid = ' + objectinternalid + ' objectname = ' +
    // objectname);
    var searchresults;
    try {
        searchresults = nlapiSearchRecord(objectinternalid, null,
            nlobjSearchFilter('symbol', null, 'is', objectname));
    } catch (e) {
        var error = e.getDetails();
        if (error
                .indexOf("The feature 'Multiple Currencies' required to access this page is not enabled in this account") > -1) {
            nlapiLogExecution('DEBUG', "multiple currencys not enabled",
                'Defaulting currency ID to 1');
            return 1;
        }
    }
    // nlapiLogExecution('DEBUG', 'in getNetsuitetermid after calling Search
    // record', coupaTerm);

    // if (searchresults.length !=1)
    if (!searchresults) {
        nlapiLogExecution('Error', 'Error getting ID for',
            'internalobjectid = ' + objectinternalid + ' objectname =  '
            + objectname);
        return 'INVALID_NAME';
    }
    // nlapiLogExecution('DEBUG', 'in getNetsuitetermid after calling Search
    // record', searchresults[0].getId());

    return searchresults[0].getId();
}

function getTaxId(taxcode) {
    var searchresults = nlapiSearchRecord(null, 'customsearch_taxitemidsearch',
        nlobjSearchFilter('name', null, 'anyof', taxcode), null);

    nlapiLogExecution('DEBUG', 'After calling nlapiSearchrecord');

    if (!searchresults) {
        nlapiLogExecution('Error', 'Error getting ID for taxcode', taxcode);
        return 'INVALID_TAXCODE';
    }

    else {
        nlapiLogExecution('DEBUG', 'After searching to tax ids ',
            'TAX ID results = ', searchresults[0]);
        nlapiLogExecution('DEBUG', 'After searching to tax ids ', 'TAX ID = ',
            searchresults[0].getId());
    }

    return searchresults[0].getId();
}

function getNetsuiteSubsidiary(coupaSubsidiary) {
    var subshash = {
        Japan : "6",
        Singapore : "7",
        US : "1"
    };
    return subshash[coupaSubsidiary];
}

function readFormConfig() {
    var list = nlapiGetContext().getSetting('SCRIPT',
        'custscript_coupa_inv_vendorbillFormcnfg').split(':');

    var vendorbillformhash = new Object();

    for (var i = 0; i < list.length; i++) {
        var keyvaluelist = list[i].split('-');
        vendorbillformhash[keyvaluelist[0]] = keyvaluelist[1];
    }

}

/*
 Function to get the internal based on externnalID for Subsidiaries, location, class, department
 */
function getInternalIDByExternalId(externalId,recordType)
{
    idFilter = new nlobjSearchFilter('externalid', null, 'is', externalId);
    var columns = new Array();
    columns[0] = new nlobjSearchColumn('internalid');
    var savedSearch = '';
    if (recordType == 'subsidiary')
        savedSearch ='customsearch_coupa_accs_subsearch';
    else if (recordType == 'department')
        savedSearch ='customsearch_coupa_accs_deptsearch';
    else if (recordType == 'location')
        savedSearch = 'customsearch_coupa_accs_locsearch';
    else if (recordType == 'classification')
        savedSearch = 'customsearch_coupa_accs_classsearch';

    var searchResults = nlapiSearchRecord(recordType,savedSearch, idFilter, columns);
    var internalId = searchResults[0].getValue('internalid');
    return internalId;
}

/*
	Function to get LIV NetSuite Period Name for Coupa Derived Peiord Name
*/
function getLIVNetSuitePeriodName(periodName) {
	/* ***
		Take Coupa Period : May 2020
		Return LIV NS Period: 2020-05
	*** */

	var monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	var monthID = ['01','02','03','04','05','06','07','08','09','10','11','12'];
	nlapiLogExecution('DEBUG', 'Input Period for LIV function',periodName);
	var inputPeriod = periodName.split(' ');
	for (var i=0; i<12; i++)
	{
		if (monthName[i] == inputPeriod[0])
		{
			monthDigit = monthID[i];
		}
	}
	nlapiLogExecution('DEBUG', 'Derived LIV Period', inputPeriod[1] + '-' + monthDigit);
	return inputPeriod[1] + '-' + monthDigit;
}
