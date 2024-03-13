/**
 * Module Description
 * This scheduled script pulls OK to Pay invoices from Coupa into Netsuite
 * 
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function scheduled(type) {

	var context = nlapiGetContext();
	var param_url = context.getSetting('SCRIPT' , 'custscript_url');
	var param_APIKey = context.getSetting('SCRIPT' , 'custscript_apikey');
	var invoiceFromdate;
	var invoiceTodate = context.getSetting('SCRIPT' , 'custscript_toinvdate');
	
	
	var url = param_url + '/api/invoices?exported=false&status=approved';
	
	if (context.getSetting('SCRIPT' , 'custscript_use_updatedat_date') == 'T')
		{
		if(context.getSetting('SCRIPT' , 'custscript_from_updatedat_date'))
			{
				url = url + '&updated-at[gt_or_eq]=' + netsuitedatetoCoupadate(context.getSetting('SCRIPT' , 'custscript_from_updatedat_date'));
			}

		if(context.getSetting('SCRIPT' , 'custscript_to_updatedat_date'))
			{
				url = url +   '&updated-at[lt_or_eq]=' + netsuitedatetoCoupadate(context.getSetting('SCRIPT' , 'custscript_to_updatedat_date'));
			}
		}
	else
		{
		if(context.getSetting('SCRIPT' , 'custscript_frominvdate'))
			{
			url = url + '&invoice-date[gt_or_eq]=' + netsuitedatetoCoupadate(context.getSetting('SCRIPT' , 'custscript_frominvdate'));
			}
	
		if(context.getSetting('SCRIPT' , 'custscript_toinvdate'))
			{
			url = url +   '&invoice-date[lt_or_eq]=' + netsuitedatetoCoupadate(context.getSetting('SCRIPT' , 'custscript_toinvdate'));
			}
		}
	
	if (context.getSetting('SCRIPT' , 'custscript_limit'))
		url = url + '&limit=' + context.getSetting('SCRIPT' , 'custscript_limit');
	
	
	nlapiLogExecution('DEBUG','URL is ',url);

	
	var headers = new Array();
    headers['Accept'] = 'text/xml';
    headers['X-COUPA-API-KEY'] = param_APIKey;
    var response = ''

    //try start
    try
    {
     response = nlapiRequestURL(url, null, headers);
    }
    catch (error)
    {
              if ( error instanceof nlobjError )
	        {
                               var errordetails;
                               errorcode  = error.getCode();
                               switch(errorcode)
                               {
                                    case "SSS_REQUEST_TIME_EXCEEDED":
                                    errordetails = "Connection closed because it has exceed the time out period (NetSuite has not received a response after 5 seconds on initial connection or after 45 seconds on the request).";
                                    exit = true;
                                    break;
              	                    default:
	                  	    errordetails = error.getDetails()+ ".";
                                    exit = true;
                                    break;
                               }
nlapiLogExecution('ERROR', 'Processing Error - Unable to do Coupa request api call to export Invoices','Error Code = ' + errorcode + ' Error Description = ' + errordetails);
nlapiSendEmail(-5,nlapiGetContext().getSetting('SCRIPT', 'custscript_emailaddr_notifications'),nlapiGetContext().getSetting('SCRIPT', 'custscript_acccountname') + ' Invoice Integration:Processing Error - Unable to do Coupa request api call to export Invoices',
			'Error Code = ' + errorcode + ' Error Description = ' + errordetails);

               }
    } //catch end

    
    if(response.getCode() == '200')
    {
    
    	var responseXML = nlapiStringToXML( response.getBody() );
    	
    	var invoiceNode = nlapiSelectNode(responseXML, 'invoice-headers');
    	var invoiceHeaderNodes = new Array();
    	
    	
    	invoiceHeaderNodes = nlapiSelectNodes(invoiceNode, 'invoice-header');
    	
   
    	nlapiLogExecution('AUDIT', 'Processing '+ invoiceHeaderNodes.length + ' OK to Pay Invoices' );
    	
    	for ( var i = 0; i < invoiceHeaderNodes.length; i++)
    	{
   		
    		var tranid = nlapiSelectValue(invoiceHeaderNodes[i], 'invoice-number');
    		var externalid = nlapiSelectValue(invoiceHeaderNodes[i], 'id');
    		var entityid = nlapiSelectValue(invoiceHeaderNodes[i], 'supplier/number');

    	   if(!nlapiSelectValue(invoiceHeaderNodes[i], 'supplier/number'))
    	   {
    	   		nlapiLogExecution('AUDIT', 'Cannot create Vendor Bill as Supplier Number not populated in Coupa', 'Invoice Number = ' + tranid 
						+ ' Vendor = ' + nlapiSelectValue(invoiceHeaderNodes[i], 'supplier/name')
						+ ' Coupa Invoice Id = ' + externalid ); 
						
    			
    			nlapiSendEmail(-5, 
    					nlapiGetContext().getSetting('SCRIPT', 'custscript_emailaddr_notifications'),
    					nlapiGetContext().getSetting('SCRIPT', 'custscript_acccountname') + ' Invoice Integration:Processing Error - Cannot create Vendor Bill as Supplier Number not populated in Coupa', 
    					'Invoice Number = ' + tranid 
    					+ ' Vendor = ' + nlapiSelectValue(invoiceHeaderNodes[i], 'supplier/name'));

    			continue;		
    	   }
    		
    		nlapiLogExecution('AUDIT', 'Processing Coupa Invoice', 'Invoice Number = ' + tranid 
    															+ ' Vendor = ' + nlapiSelectValue(invoiceHeaderNodes[i], 'supplier/name')
    															+ ' Coupa Invoice Id = ' + externalid  );
    		
    		var invoiceexists = 'false';
    		
    		invoiceexists = vendorBillExists(tranid, externalid, entityid);
    		
    		if (invoiceexists == 'false')
    			CreateVendorBillorVendorCredit(invoiceHeaderNodes[i]);
    		
    		else
    			{
    			nlapiLogExecution('AUDIT', 'Cannot create Vendor Bill as it already exists in Netsuite', 'Invoice Number = ' + tranid 
						+ ' Vendor = ' + nlapiSelectValue(invoiceHeaderNodes[i], 'supplier/name')
						+ ' Coupa Invoice Id = ' + externalid 
						+ ' Netsuite Vendor Bill id = ' + invoiceexists);
    			
    			nlapiSendEmail(-5, 
    					nlapiGetContext().getSetting('SCRIPT', 'custscript_emailaddr_notifications'),
    					nlapiGetContext().getSetting('SCRIPT', 'custscript_acccountname') + ' Invoice Integration:Processing Error - Cannot create Vendor Bill as it already exists in Netsuite', 
    					'Invoice Number = ' + tranid 
    					+ ' Vendor = ' + nlapiSelectValue(invoiceHeaderNodes[i], 'supplier/name')
    					+ ' Netsuite Vendor Bill id = ' + invoiceexists);
    			
//    			UpdateVendorBill(invoiceHeaderNodes[i], invoiceexists);
    			}
     		
    		
    	}
    	
    } // end of approved invoices
    else
    	nlapiLogExecution('AUDIT', 'Zero Coupa Ok to Pay Invoices to export' );
    
 // check for exported and now voided invoices
    var enable_support_void = 0; //by default not supported

    if (context.getSetting('SCRIPT' , 'custscript_supportvoid'))
   	 {
       enable_support_void = context.getSetting('SCRIPT' , 'custscript_supportvoid');
   	 }



    if (enable_support_void == 1 )
      {
      
       url = param_url + '/api/invoices?exported=false&status=voided';
       
       if(context.getSetting('SCRIPT' , 'custscript_frominvdate'))
   		{
       	url = url + '&invoice-date[gt_or_eq]=' + netsuitedatetoCoupadate(context.getSetting('SCRIPT' , 'custscript_frominvdate'));
   		}

       if(context.getSetting('SCRIPT' , 'custscript_toinvdate'))
   		{
       	url = url +   '&invoice-date[lt_or_eq]=' + netsuitedatetoCoupadate(context.getSetting('SCRIPT' , 'custscript_toinvdate'));
   		}

       //try start
       try
       {
       	  response = nlapiRequestURL(url, null, headers);
       }
       catch (error)
       {
              if ( error instanceof nlobjError )
	        {
                               var errordetails;
                               errorcode  = error.getCode();
                               switch(errorcode)
                               {
                                    case "SSS_REQUEST_TIME_EXCEEDED":
                                    errordetails = "Connection closed because it has exceed the time out period (NetSuite has not received a response after 5 seconds on initial connection or after 45 seconds on the request).";
                                    exit = true;
                                    break;
              	                    default:
	                  	    errordetails = error.getDetails()+ ".";
                                    exit = true;
                                    break;
                               }
nlapiLogExecution('ERROR', 'Processing Error - Unable to do Coupa request api call to check exported and now voided Invoices','Error Code = ' + errorcode + ' Error Description = ' + errordetails);
nlapiSendEmail(-5,nlapiGetContext().getSetting('SCRIPT', 'custscript_emailaddr_notifications'),nlapiGetContext().getSetting('SCRIPT', 'custscript_acccountname') + ' Invoice Integration:Processing Error - Unable to do Coupa request api call to check exported and now voided Invoices',
			'Error Code = ' + errorcode + ' Error Description = ' + errordetails);

               }
       } //catch end




       
       if(response.getCode() == '200')
       	{
       
       	var responseXML = nlapiStringToXML( response.getBody() );
       	
       	var invoiceNode = nlapiSelectNode(responseXML, 'invoice-headers');
       	var invoiceHeaderNodes = new Array();
       	
       	
       	invoiceHeaderNodes = nlapiSelectNodes(invoiceNode, 'invoice-header');
       	
       	//nlapiLogExecution('DEBUG', 'Length of invoiceHeaderNodes.lenght', invoiceHeaderNodes.length);
       	
       	nlapiLogExecution('AUDIT', 'Processing '+ invoiceHeaderNodes.length + ' voided invoices' );
       	
       	for ( var i = 0; i < invoiceHeaderNodes.length; i++)
       		{
       		
       			var tranid = nlapiSelectValue(invoiceHeaderNodes[i], 'invoice-number');
       			var externalid = 'Coupa-VendorBill' + nlapiSelectValue(invoiceHeaderNodes[i], 'id');
       			var entityid = nlapiSelectValue(invoiceHeaderNodes[i], 'supplier/number');
       		
       			nlapiLogExecution('AUDIT', 'Processing Coupa Invoice - VOID in Netsuite', 'Invoice Number = ' + tranid 
   					+ ' Vendor = ' + nlapiSelectValue(invoiceHeaderNodes[i], 'supplier/name')
   					+ ' Coupa Invoice Id = ' + externalid  );
       		
       			//nlapiLogExecution('DEBUG', 'before calling vendorbillexists', 'external id = ' + externalid + ' traind = ' + tranid);
       		
       			var invoiceexists = 'false';
       		
       			invoiceexists = vendorBillExists(tranid, externalid, entityid);
       		
       			if (invoiceexists != 'false')
       				VoidVendorBill(invoiceHeaderNodes[i], invoiceexists);
       			else
       				nlapiLogExecution('AUDIT', 'Invoice does not exist in Netsuite', 'Invoice Number = ' + tranid 
       	   					+ ' Vendor = ' + nlapiSelectValue(invoiceHeaderNodes[i], 'supplier/name')
       	   					+ ' Coupa Invoice Id = ' + externalid  );
       		
       		}
       	
       }
       else
       	nlapiLogExecution('AUDIT', 'Zero voided Coupa Invoices to process' );
       
      }
}


function CreateVendorBillorVendorCredit(invoice)
{
	var bill = false;
	var credit = false;
	var invoiceLine = nlapiSelectNode(invoice, 'invoice-lines');
	var invoiceLineNodes = new Array();
	var invoicetotal = 0;
	invoiceLineNodes = nlapiSelectNodes(invoiceLine, 'invoice-line');
	var creditMemoOption = 2; //by default option is 2
	
	for ( var x = 0; x < invoiceLineNodes.length; x++)
	{
		invoicetotal = invoicetotal + parseFloat(nlapiSelectValue(invoiceLineNodes[x], 'total'));
		
		if (parseFloat(nlapiSelectValue(invoiceLineNodes[x], 'total')) < 0)
			{
			credit = true;
			}
		else
			{
			bill = true;
			}
	}
	
	if (nlapiGetContext().getSetting('SCRIPT', 'custscript_creditmemooption'))
		creditMemoOption = nlapiGetContext().getSetting('SCRIPT', 'custscript_creditmemooption');
	
	if (creditMemoOption == 1)
		{
		if (bill == true)
			CreateVendorBill(invoice);

		if (credit == true)
			CreateVendorCredit(invoice);
		}
	else if (creditMemoOption == 2)
			{
			if (invoicetotal >= 0)
				{
				//nlapiLogExecution('DEBUG', 'creating vendor bill ', 'amount = ' + invoicetotal );
				CreateVendorBill(invoice);
				}
			else
				{
				//nlapiLogExecution('DEBUG', 'creating vendor credit ', 'amount = '+ invoicetotal );
				CreateVendorCredit(invoice);
				}
			}
}

function CreateVendorCredit(invoice)
{
	var record = nlapiCreateRecord('vendorcredit');
	
	record.setFieldValue('externalid', 'Coupa-VendorCredit-' + nlapiSelectValue(invoice, 'id'));
	
	record.setFieldValue('trandate', ConvertCoupaDateToNetSuiteDate(nlapiSelectValue(invoice, 'invoice-date')));
	
	var supplierNode = nlapiSelectNode(invoice, 'supplier');

	var lineleveltaxation = 'false';
	
	lineleveltaxation = nlapiSelectValue(invoice, 'line-level-taxation');
	
	
	if (nlapiSelectValue(supplierNode, 'number'))
		record.setFieldValue('entity', nlapiSelectValue(supplierNode, 'number'));
	else
	// try setting supplier name instead on id
		record.setFieldText('entity', nlapiSelectValue(supplierNode, 'name'));
	
	//set accounts payable account if passed as parameter to the script
	if (nlapiGetContext().getSetting('SCRIPT' , 'custscript_actpayablenum'))
		{
		var apAccountId = getNetsuiteAccountId(nlapiGetContext().getSetting('SCRIPT' , 'custscript_actpayablenum'));
		
		if (apAccountId != 'INVALID_ACCOUNT')
			record.setFieldValue('account', apAccountId);
		}
	
	
	
	// set the posting period
	var today = new Date();
	var postingPeriod = getMonthShortName(today.getMonth()) + ' '  + today.getFullYear();
	var cutoffday = 5;
	if (nlapiGetContext().getSetting('SCRIPT' , 'custscript_cutoffdate'))
		cutoffday = nlapiGetContext().getSetting('SCRIPT' , 'custscript_cutoffdate');
	if (today.getDate() < cutoffday)
		{
		var nDate = nlapiSelectValue(invoice, 'invoice-date').split('T');
		var datesplit = nDate[0].split('-');
		var Nyear = datesplit[0];
		var Nday = datesplit[2];
		var Nmonth = datesplit[1]-1;
	
		if (today.getFullYear() > Nyear)
			{
			if (today.getMonth() == 0)
				postingPeriod = getMonthShortName('11') + ' '  + (today.getFullYear()-1);
			else
				postingPeriod = getMonthShortName(today.getMonth()-1) + ' '  + today.getFullYear();
			}
	
		if (Nmonth < today.getMonth() && Nyear == today.getFullYear())
			postingPeriod = getMonthShortName(today.getMonth()-1) + ' '  + today.getFullYear();
		}
	
	nlapiLogExecution('DEBUG', 'Calculated Posting Period is ', postingPeriod);
	
	var postingPeriodId = getAccoutingPeriodNetsuiteId('accountingperiod', postingPeriod);
	
	//nlapiLogExecution('DEBUG', 'Posting Period: ', 'name = ' + postingPeriod + ' Id = ' + postingPeriodId);
	
	record.setFieldValue('postingperiod', postingPeriodId);

      // set currency
        var curr = getNetsuiteCurrency('currency', nlapiSelectValue(invoice, 'currency/code'))
	record.setFieldValue('currency', curr);
	
	record.setFieldValue('tranid', nlapiSelectValue(invoice, 'invoice-number'));
	
	var invoiceLine = nlapiSelectNode(invoice, 'invoice-lines');
	var invoiceLineNodes = new Array();
	invoiceLineNodes = nlapiSelectNodes(invoiceLine, 'invoice-line');
	
	
	var shippingamount = parseFloat(nlapiSelectValue(invoice, 'shipping-amount'));
	var handlingamount = parseFloat(nlapiSelectValue(invoice, 'handling-amount'));
	var taxamount = parseFloat(nlapiSelectValue(invoice, 'tax-amount'));
	var miscamount = parseFloat(nlapiSelectValue(invoice, 'misc-amount'));
	
	/*
	nlapiLogExecution('DEBUG', 'Other Charges', 'Shipping = ' + shippingamount + ' Handling = ' + handlingamount 
												+ ' Taxamount = ' + taxamount + ' miscamount = ' + miscamount); */
	
	
	var totalheadercharges;
	if(lineleveltaxation == 'false')
		totalheadercharges = parseFloat(shippingamount) + parseFloat(handlingamount) + parseFloat(taxamount) + parseFloat (miscamount);
	else 
		totalheadercharges = parseFloat(shippingamount) + parseFloat(handlingamount) + parseFloat (miscamount);
	
	var invoiceLine = nlapiSelectNode(invoice, 'invoice-lines');
	var invoiceLineNodes = new Array();
	
	invoiceLineNodes = nlapiSelectNodes(invoiceLine, 'invoice-line');
	
	// get total amount by adding the line amounts
	var totalamount = 0;
	var taxabletotalamount = 0;
	for ( var x = 0; x < invoiceLineNodes.length; x++)
		{
		if(nlapiSelectValue(invoiceLineNodes[x], 'nontaxable') != 'true')
			taxabletotalamount = parseFloat(taxabletotalamount) + parseFloat(nlapiSelectValue(invoiceLineNodes[x], 'total'));
		
		totalamount = parseFloat(totalamount) + parseFloat(nlapiSelectValue(invoiceLineNodes[x], 'total'));
		}
	
	var totalheaderamount = parseFloat(totalamount) + parseFloat(totalheadercharges);
	totalheaderamount = totalheaderamount.toFixed(3);
	var totalcalcamount = 0;
	
	
	
	for ( var x = 0; x < invoiceLineNodes.length; x++)
		{
		
		// customization for Coupa to copy the description of first line to the memo field on the header of Netsuite Vendor Bill
		if (x == 0)
			{
			if (nlapiSelectValue(invoiceLineNodes[x], 'description'))
				record.setFieldValue('memo', nlapiSelectValue(invoiceLineNodes[x], 'description'));
			}
		
		var linetax = parseFloat(nlapiSelectValue(invoiceLineNodes[x], 'tax-amount'));
		
		if(linetax) 
			totalheaderamount = parseFloat(totalheaderamount) + parseFloat(linetax);
		
		var invoicelineamount = parseFloat(nlapiSelectValue(invoiceLineNodes[x], 'total'));
		var splitaccounting = 'FALSE';
		var actalloc = nlapiSelectNode(invoiceLineNodes[x], 'account-allocations');
		var accountallocations = new Array();
		accountallocations = nlapiSelectNodes(actalloc, 'account-allocation');
		if (accountallocations.length >= 1)
			{
			splitaccounting = 'TRUE';
			//nlapiLogExecution('DEBUG', 'Split accounting = ', splitaccounting);
			}
		
		if (splitaccounting == 'TRUE')
			{
			for (var i = 0; i < accountallocations.length; i++)
				{
				var lineamount = parseFloat (nlapiSelectValue(accountallocations[i], 'amount'));
				var linecharge =  (parseFloat(lineamount)/parseFloat(taxabletotalamount)) 
				* totalheadercharges;
				var splitlinetax;
				if (linetax)
					{
					splitlinetax = (parseFloat(lineamount)/parseFloat(invoicelineamount)) 
					* linetax;
					//nlapiLogExecution('DEBUG', 'split line tax details ', 'splitline amount = ' + lineamount + ' splitlinetax = ' + splitlinetax);
					}
				var adjlineamount;
				
				if (linetax)
					adjlineamount = parseFloat(lineamount) + parseFloat(linecharge) + parseFloat(splitlinetax);
				else
					{
					// customization for nontaxable
					if(nlapiSelectValue(invoiceLineNodes[x], 'nontaxable') == 'true')
						adjlineamount = parseFloat(lineamount);
					else
						adjlineamount = parseFloat(lineamount) + parseFloat(linecharge);
					}
				adjlineamount = adjlineamount.toFixed(2);
				var accountNode = nlapiSelectNode(accountallocations[i], 'account');
				record.selectNewLineItem('expense');
			
			if (nlapiGetContext().getSetting('SCRIPT', 'custscript_glactseg'))
				{
				var account;
				var accountnumber;
				account = nlapiSelectValue(accountNode, nlapiGetContext().getSetting('SCRIPT', 'custscript_glactseg')).split(':');
				accountnumber = account[0];
		
				var accountId = getNetsuiteAccountId(accountnumber);
				if (accountId != 'INVALID_ACCOUNT')
					record.setCurrentLineItemValue('expense', 'account', accountId);
				else
					{
					nlapiLogExecution('ERROR', 'Processing Error - Invalid GL account', 'GL Account =' + accountnumber
															+ ' Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number')
															+ ' Supplier Name = ' + nlapiSelectValue(supplierNode, 'name'));
					nlapiSendEmail(-5, 
							nlapiGetContext().getSetting('SCRIPT', 'custscript_emailaddr_notifications'), 
							nlapiGetContext().getSetting('SCRIPT', 'custscript_acccountname') + ' Invoice Integration:Processing Error - Invalid GL account', 
							'GL Account =' + accountnumber
							+ ' Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number')
							+ ' Supplier Name = ' + nlapiSelectValue(supplierNode, 'name'));
						return;
						}
					}
				
				
				
				
				if (nlapiGetContext().getSetting('SCRIPT', 'custscript_deptseg'))
					{
					var dept = nlapiSelectValue(accountNode, nlapiGetContext().getSetting('SCRIPT', 'custscript_deptseg')).split(':');
					record.setCurrentLineItemValue('expense', 'department', dept[1]);
					}
		
				if (nlapiGetContext().getSetting('SCRIPT', 'custscript_classseg'))
					{
					var clss = nlapiSelectValue(accountNode, nlapiGetContext().getSetting('SCRIPT', 'custscript_classseg')).split(':');
					record.setCurrentLineItemValue('expense', 'class', clss[1]);
					}
			
				if (nlapiGetContext().getSetting('SCRIPT', 'custscript_locseg'))
					{
					var locId = nlapiSelectValue(accountNode, nlapiGetContext().getSetting('SCRIPT', 'custscript_locseg')).split(':');
					record.setCurrentLineItemValue('expense', 'location', locId[1]);
					}
			
				else if (nlapiGetContext().getSetting('SCRIPT', 'custscript_loccust'))
					{
					var locId = getNetsuiteId('location', nlapiSelectValue(invoiceLineNodes[x], nlapiGetContext().getSetting('SCRIPT', 'custscript_loccust')));
					if (locId != 'INVALID_NAME')
						record.setCurrentLineItemValue('expense', 'location', locId);
					}
				if (x == 0)
					{
					nlapiLogExecution('DEBUG', 'Check for Subsidiary segment custom field', nlapiGetContext().getSetting('SCRIPT', 'custscript_subsseg'));
				
					if (nlapiGetContext().getSetting('SCRIPT', 'custscript_subsseg'))
						{
						var subsidiaryId = nlapiSelectValue(accountNode, nlapiGetContext().getSetting('SCRIPT', 'custscript_subsseg')).split(':');
						nlapiLogExecution('DEBUG', 'Setting subsidiary ID to', subsidiaryId[1]);
						record.setFieldValue('subsidiary', subsidiaryId[1]);	
						}
					}
				
				
				
				// check for Coupa order line 
				if (nlapiSelectValue(invoiceLineNodes[x], 'order-header-num') && nlapiSelectValue(invoiceLineNodes[x], 'order-line-num'))
					{
					var poheadernum = nlapiSelectValue(invoiceLineNodes[x], 'order-header-num');
					var polinenum = nlapiSelectValue(invoiceLineNodes[x], 'order-line-num');
					record.setCurrentLineItemValue('expense','custcol_coupaponum',poheadernum + '-' + polinenum);
					}
				
				
				record.setCurrentLineItemValue('expense', 'memo',nlapiSelectValue(invoiceLineNodes[x], 'description'));
				record.setCurrentLineItemValue('expense','isbillable','T');
				
				if ((i == 0) && (x == 0)) totalcalcamount = parseFloat(adjlineamount);
				else totalcalcamount = parseFloat(totalcalcamount) + parseFloat(adjlineamount);
				
				//nlapiLogExecution('DEBUG', 'Invoice Line details ', 'Invoice Line ' + x + ' SplitLine = ' + i + ' adjlineamount = ' + adjlineamount);
				
				if ((x == invoiceLineNodes.length-1) && (i == accountallocations.length-1))
    				{
					var roundingerror = totalheaderamount - totalcalcamount;
					/*nlapiLogExecution('DEBUG', 'Rounding Error Details ', 'RoundingError = ' + roundingerror + 
							' totalheaderamount = ' + totalheaderamount + ' totalcalcamount = ' + totalcalcamount); */
					if (roundingerror)
    					{
						roundingerror = Math.round(parseFloat(roundingerror)*100)/100;
						adjlineamount = parseFloat(adjlineamount) + roundingerror;
    					}
    				}
				record.setCurrentLineItemValue('expense', 'amount',Math.abs(parseFloat(adjlineamount)));
				
				record.commitLineItem('expense');
				
				} // end of the for loop for split lines
			} // end of if loop for split accounting to True
		
		else
		{
			
			var lineamount = parseFloat (nlapiSelectValue(invoiceLineNodes[x], 'total'));
			var linecharge =  (parseFloat(lineamount)/parseFloat(taxabletotalamount)) * totalheadercharges;
			var adjlineamount;
			
			if (linetax)
				adjlineamount = parseFloat(lineamount) + parseFloat(linecharge) + parseFloat(linetax);
			else
				{
				// customization for nontaxable
				if(nlapiSelectValue(invoiceLineNodes[x], 'nontaxable') == 'true')
					adjlineamount = parseFloat(lineamount);
				else
					adjlineamount = parseFloat(lineamount) + parseFloat(linecharge);
				}
			adjlineamount = adjlineamount.toFixed(2);
		/*	
			nlapiLogExecution('DEBUG', 'Line Details: ', 'linenum' + x +
														' lineamount = ' + lineamount +
														' linecharge = ' + linecharge +
														'taxabletotalamount = ' + taxabletotalamount +
														' totalheadercharges = ' + totalheadercharges +
														' adjlineamount = ' + adjlineamount );
		*/	
			
			var accountNode = nlapiSelectNode(invoiceLineNodes[x], 'account');
		
		
			record.selectNewLineItem('expense');
			
			
			
			if (nlapiGetContext().getSetting('SCRIPT', 'custscript_glactseg'))
				{
				var account;
				var accountnumber;
				//var act;
				account = nlapiSelectValue(accountNode, nlapiGetContext().getSetting('SCRIPT', 'custscript_glactseg')).split(':');
				//act = account[0].split(' ');
				accountnumber = account[0];
				
				var accountId = getNetsuiteAccountId(accountnumber);
				if (accountId != 'INVALID_ACCOUNT')
					record.setCurrentLineItemValue('expense', 'account', accountId);
				else
					{
					nlapiLogExecution('ERROR', 'Processing Error - Invalid GL account', 'GL Account =' + accountnumber
																	+ ' Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number')
																	+ ' Supplier Name = ' + nlapiSelectValue(supplierNode, 'name'));
					nlapiSendEmail(-5, 
							nlapiGetContext().getSetting('SCRIPT', 'custscript_emailaddr_notifications'), 
							nlapiGetContext().getSetting('SCRIPT', 'custscript_acccountname') + ' Invoice Integration:Processing Error - Invalid GL account', 
							'GL Account =' + accountnumber
							+ ' Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number')
							+ ' Supplier Name = ' + nlapiSelectValue(supplierNode, 'name'));
					return;
					}
				}
		
		
		
			if (nlapiGetContext().getSetting('SCRIPT', 'custscript_deptseg'))
				{
				var dept = nlapiSelectValue(accountNode, nlapiGetContext().getSetting('SCRIPT', 'custscript_deptseg')).split(':');
				record.setCurrentLineItemValue('expense', 'department', dept[1]);
				}

			if (nlapiGetContext().getSetting('SCRIPT', 'custscript_classseg'))
				{
				var clss = nlapiSelectValue(accountNode, nlapiGetContext().getSetting('SCRIPT', 'custscript_classseg')).split(':');
				record.setCurrentLineItemValue('expense', 'class', clss[1]);
				}
	
			if (nlapiGetContext().getSetting('SCRIPT', 'custscript_locseg'))
				{
				var locId = nlapiSelectValue(accountNode, nlapiGetContext().getSetting('SCRIPT', 'custscript_locseg')).split(':');
				record.setCurrentLineItemValue('expense', 'location', locId[1]);
				}
	
			else if (nlapiGetContext().getSetting('SCRIPT', 'custscript_loccust'))
				{
				var locId = getNetsuiteId('location', nlapiSelectValue(invoiceLineNodes[x], nlapiGetContext().getSetting('SCRIPT', 'custscript_loccust')));
				if (locId != 'INVALID_NAME')
					record.setCurrentLineItemValue('expense', 'location', locId);
				}
			if (x == 0)
				{
				//nlapiLogExecution('DEBUG', 'Check for Subsidiary segment custom field', nlapiGetContext().getSetting('SCRIPT', 'custscript_subsseg'));
		
				if (nlapiGetContext().getSetting('SCRIPT', 'custscript_subsseg'))
					{
					var subsidiaryId = nlapiSelectValue(accountNode, nlapiGetContext().getSetting('SCRIPT', 'custscript_subsseg')).split(':');
					//nlapiLogExecution('DEBUG', 'Setting subsidiary ID to', subsidiaryId[1]);
					record.setFieldValue('subsidiary', subsidiaryId[1]);	
					}
				}
			
			
			/* check for Coupa order line */
			if (nlapiSelectValue(invoiceLineNodes[x], 'order-header-num') && nlapiSelectValue(invoiceLineNodes[x], 'order-line-num'))
				{
				var poheadernum = nlapiSelectValue(invoiceLineNodes[x], 'order-header-num');
				var polinenum = nlapiSelectValue(invoiceLineNodes[x], 'order-line-num');
				record.setCurrentLineItemValue('expense','custcol_coupaponum',poheadernum + '-' + polinenum);
				}
			
			
			
			record.setCurrentLineItemValue('expense', 'memo',nlapiSelectValue(invoiceLineNodes[x], 'description'));
			record.setCurrentLineItemValue('expense','isbillable','T');
    	
			if (x == 0) totalcalcamount = parseFloat(adjlineamount);
			else totalcalcamount = parseFloat(totalcalcamount) + parseFloat(adjlineamount);
    	
    	
		//	nlapiLogExecution('DEBUG', 'Invoice Line details ', 'Line ' + x + ' adjlineamount = ' + adjlineamount);
    	
			if (x == invoiceLineNodes.length-1)
    			{
				var roundingerror = totalheaderamount - totalcalcamount;
				/*nlapiLogExecution('DEBUG', 'Rounding Error Details ', 'RoundingError = ' + roundingerror + 
						' totalheaderamount = ' + totalheaderamount + ' totalcalcamount = ' + totalcalcamount); */
				if (roundingerror)
    				{
					roundingerror = Math.round(parseFloat(roundingerror)*100)/100;
					adjlineamount = parseFloat(adjlineamount) + roundingerror;
    				}
    			}
			record.setCurrentLineItemValue('expense', 'amount', Math.abs(parseFloat(adjlineamount)));
			
			record.commitLineItem('expense');
			} // end of else --- i.e if not split accounting
		
		} // end of main for loop that goes through each invoice line
	
	try
	{
	nlapiSubmitRecord(record, true);
	}
	catch (e)
	{
		nlapiLogExecution('ERROR', 'Processing Error - Unable to create vendor Credit', ' Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number')
				+ ' Supplier Name = ' + nlapiSelectValue(supplierNode, 'name') 
				+ ' Error Description = ' + e.message);
		nlapiSendEmail(-5, 
				nlapiGetContext().getSetting('SCRIPT', 'custscript_emailaddr_notifications'),
				nlapiGetContext().getSetting('SCRIPT', 'custscript_acccountname') + ' Invoice Integration:Processing Error - Unable to create vendor credit', 
				'Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number')
				+ ' Supplier Name = ' + nlapiSelectValue(supplierNode, 'name')
				+ ' Error Description = ' + e.message);
		return;
	}

	nlapiLogExecution('AUDIT', 'Successfully created vendor Credit', ' Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number')
			+ ' Supplier Name = ' + nlapiSelectValue(supplierNode, 'name'));
	Setexportedtotrue(nlapiSelectValue(invoice, 'id')); 
}


function CreateVendorBill(invoice)
{
	var record;
	// vendorbill form config
	if (nlapiGetContext().getSetting('SCRIPT', 'custscript_vendorbillFormconfig'))
	{
      	var list = nlapiGetContext().getSetting('SCRIPT', 'custscript_vendorbillFormconfig').split(':');
		var vendorbillformhash = new Object();

		for(i = 0; i < list.length; i++)
			{
			var keyvaluelist = list[i].split('-');
			vendorbillformhash[keyvaluelist[0]] = keyvaluelist[1];
			}
		nlapiLogExecution('DEBUG', 'Form id for' + 	nlapiSelectValue(invoice, 'account-type/name'), vendorbillformhash[nlapiSelectValue(invoice, 'account-type/name')]);
        
        if (vendorbillformhash[nlapiSelectValue(invoice, 'account-type/name')])
        	record = nlapiCreateRecord('vendorbill', {customform: vendorbillformhash[nlapiSelectValue(invoice, 'account-type/name')]});
        else
        	record = nlapiCreateRecord('vendorbill');
	}

	else
		record = nlapiCreateRecord('vendorbill');
	
	var lineleveltaxation = 'false';
	
	lineleveltaxation = nlapiSelectValue(invoice, 'line-level-taxation');
	
	record.setFieldText('approvalstatus', 'Approved');
	
	record.setFieldValue('externalid', 'Coupa-VendorBill' + nlapiSelectValue(invoice, 'id'));
	
	record.setFieldValue('trandate', ConvertCoupaDateToNetSuiteDate(nlapiSelectValue(invoice, 'invoice-date')));
	
	   // set currency
        var curr = getNetsuiteCurrency('currency', nlapiSelectValue(invoice, 'currency/code'))
	record.setFieldValue('currency', curr);
	
	var supplierNode = nlapiSelectNode(invoice, 'supplier');
	//nlapiLogExecution('DEBUG', 'SupplierName', nlapiSelectValue(supplierNode, 'name'));
	
	if (nlapiSelectValue(supplierNode, 'number'))
		record.setFieldValue('entity', nlapiSelectValue(supplierNode, 'number'));
	else
	// try setting supplier name instead on id
		record.setFieldText('entity', nlapiSelectValue(supplierNode, 'name'));
	
	var paymentTermNode = nlapiSelectNode(invoice, 'payment-term');
	//nlapiLogExecution('DEBUG', 'Payment Term', nlapiSelectValue(paymentTermNode, 'code'));
	
	var terms;
	
	if (paymentTermNode)
		{
		terms = getNetsuitetermid(nlapiSelectValue(paymentTermNode, 'code'));
		}
	else
		terms = getNetsuitetermid('Net 30');
		
	record.setFieldValue('terms', terms);
	
	//set accounts payable account if passed as parameter to the script
	if (nlapiGetContext().getSetting('SCRIPT' , 'custscript_actpayablenum'))
		{
		var apAccountId = getNetsuiteAccountId(nlapiGetContext().getSetting('SCRIPT' , 'custscript_actpayablenum'));
		
		if (apAccountId != 'INVALID_ACCOUNT')
			record.setFieldValue('account', apAccountId);
		}
	
	
	// set the posting period
	var today = new Date();
	var postingPeriod = getMonthShortName(today.getMonth()) + ' '  + today.getFullYear();
	var cutoffday = 5;
	cutoffday = nlapiGetContext().getSetting('SCRIPT' , 'custscript_cutoffdate');
	if (today.getDate() < cutoffday)
		{
		var nDate = nlapiSelectValue(invoice, 'invoice-date').split('T');
		var datesplit = nDate[0].split('-');
		var Nyear = datesplit[0];
		var Nday = datesplit[2];
		var Nmonth = datesplit[1]-1;
	
		if (today.getFullYear() > Nyear)
			{
			if (today.getMonth() == 0)
				postingPeriod = getMonthShortName('11') + ' '  + (today.getFullYear()-1);
			else
				postingPeriod = getMonthShortName(today.getMonth()-1) + ' '  + today.getFullYear();
			}
	
		if (Nmonth < today.getMonth() && Nyear == today.getFullYear())
			postingPeriod = getMonthShortName(today.getMonth()-1) + ' '  + today.getFullYear();
		}
	
	nlapiLogExecution('DEBUG', 'Calculated Posting Period is ', postingPeriod);
	
	var postingPeriodId = getAccoutingPeriodNetsuiteId('accountingperiod', postingPeriod);
	
	//nlapiLogExecution('DEBUG', 'Posting Period: ', 'name = ' + postingPeriod + ' Id = ' + postingPeriodId);
	
	record.setFieldValue('postingperiod', postingPeriodId);
	
	record.setFieldValue('tranid', nlapiSelectValue(invoice, 'invoice-number'));
	
	
	//nlapiLogExecution('DEBUG','checking for header custom field count', 'count = ' + nlapiGetContext().getSetting('SCRIPT', 'custscript_customfield_header_count'));
	// check for custom fields on header level
	if (nlapiGetContext().getSetting('SCRIPT', 'custscript_customfield_header_count'))
		{
		for (var y = 1; y <= nlapiGetContext().getSetting('SCRIPT', 'custscript_customfield_header_count') ; y++)
			{
			
			//nlapiLogExecution('DEBUG','checking for header custom field' + y, 'Customer header Field' + y + " = " + nlapiGetContext().getSetting('SCRIPT', 'custscript_custfieldheader' + y));
			
			if (nlapiGetContext().getSetting('SCRIPT', 'custscript_custfieldheader' + y))
				{
					var custfield;
					var valuetoinsert = 'None';
					var textOrValue;
					if (nlapiGetContext().getSetting('SCRIPT', 'custscript_custfieldheader' + y).split(':'))
							{
							custfield = nlapiGetContext().getSetting('SCRIPT', 'custscript_custfieldheader' + y).split(':');
							
				
							if (custfield[4])
								valuetoinsert = custfield[4];
							else
								{
							
									if (nlapiSelectValue(invoice,custfield[0]))
											valuetoinsert = nlapiSelectValue(invoice,custfield[0]);
							
									if (custfield[2] && nlapiSelectValue(invoice,custfield[0]))
										{
											if (custfield[2] == 'Date')
												valuetoinsert = ConvertCoupaDateToNetSuiteDate(nlapiSelectValue(invoice,custfield[0]));
								
											if (custfield[2] == 'Lookup')
												{
													valuetoinsert = nlapiSelectValue(invoice,custfield[0] + '/external-ref-num');
												}
									
										}
								}
								
							textOrValue = 'Text';
							if (custfield[3])
								{
								textOrValue = custfield[3];
								}
							
							
							nlapiLogExecution('DEBUG', 'Header CustomField' + ' ' + y, " custfield0 = " + custfield[0] 
									+ " custfield1 = " + custfield[1]
									+ " custfield2 = " + custfield[2]
									+ " custfield3 = " + custfield[3]
									+ " valuetoinsert = " + valuetoinsert );
							
							if (valuetoinsert && valuetoinsert != 'None')
								{
							
									if (textOrValue == 'Text')
										record.setFieldText(custfield[1],valuetoinsert);
									else
										record.setFieldValue(custfield[1],valuetoinsert);
								}
								
							}
				}
			}
		}
	
	
	
	var shippingamount = parseFloat(nlapiSelectValue(invoice, 'shipping-amount'));
	var handlingamount = parseFloat(nlapiSelectValue(invoice, 'handling-amount'));
	var taxamount = parseFloat(nlapiSelectValue(invoice, 'tax-amount'));
	var miscamount = parseFloat(nlapiSelectValue(invoice, 'misc-amount'));
	
	
	 
	
	var headercharges = false;
	var totalheadercharges;
	totalheadercharges = parseFloat(shippingamount) + parseFloat(handlingamount) + parseFloat (miscamount);

	if (totalheadercharges > 0)
		headercharges = true;

	if(lineleveltaxation == 'false')
	{
		if (nlapiGetContext().getSetting('SCRIPT', 'custscript_send_taxcode'))
		{ 
			if (nlapiGetContext().getSetting('SCRIPT', 'custscript_send_taxcode') == 'F')
				totalheadercharges = parseFloat(totalheadercharges)  + parseFloat(taxamount);
			
	    }
	    else
	    	totalheadercharges = parseFloat(totalheadercharges)  + parseFloat(taxamount);

	}
	

	
	var invoiceLine = nlapiSelectNode(invoice, 'invoice-lines');
	var invoiceLineNodes = new Array();
	
	invoiceLineNodes = nlapiSelectNodes(invoiceLine, 'invoice-line');
	
	// get total amount by adding the line amounts
	var totalamount = 0;
	var taxabletotalamount = 0;
	for ( var x = 0; x < invoiceLineNodes.length; x++)
		{
		if(nlapiSelectValue(invoiceLineNodes[x], 'nontaxable') != 'true')
			taxabletotalamount = parseFloat(taxabletotalamount) + parseFloat(nlapiSelectValue(invoiceLineNodes[x], 'total'));
		
		totalamount = parseFloat(totalamount) + parseFloat(nlapiSelectValue(invoiceLineNodes[x], 'total'));
		}
	
	var totalheaderamount = parseFloat(totalamount) + parseFloat(totalheadercharges);
	totalheaderamount = totalheaderamount.toFixed(3);
	var totalcalcamount = 0;
	
	 nlapiLogExecution('DEBUG', 'Other Charges', 'Shipping = ' + shippingamount + ' Handling = ' + handlingamount 
												+ ' Taxamount = ' + taxamount + ' miscamount = ' + miscamount
												+ ' totalheadercharges = ' + totalheadercharges
												+  ' totalheaderamount = ' + totalheaderamount);
	
	
	for ( var x = 0; x < invoiceLineNodes.length; x++)
		{
		
		// customization for Coupa to copy the description of first line to the memo field on the header of Netsuite Vendor Bill
		if (x == 0)
			{
			if (nlapiSelectValue(invoiceLineNodes[x], 'description'))
				record.setFieldValue('memo', nlapiSelectValue(invoiceLineNodes[x], 'description'));
			}
		
		var linetax = 0;
		
        // check for the new tax feature
		if (nlapiGetContext().getSetting('SCRIPT', 'custscript_send_taxcode') == 'F')
		{
         	linetax = parseFloat(nlapiSelectValue(invoiceLineNodes[x], 'tax-amount'));
		
			if(linetax) 
				totalheaderamount = parseFloat(totalheaderamount) + parseFloat(linetax);
		}
		
		
		var invoicelineamount = parseFloat(nlapiSelectValue(invoiceLineNodes[x], 'total'));
		var splitaccounting = 'FALSE';
		var actalloc = nlapiSelectNode(invoiceLineNodes[x], 'account-allocations');
		var accountallocations = new Array();
		accountallocations = nlapiSelectNodes(actalloc, 'account-allocation');
		if (accountallocations.length >= 1)
			{
			splitaccounting = 'TRUE';
			//nlapiLogExecution('DEBUG', 'Split accounting = ', splitaccounting);
			}
		
		if (splitaccounting == 'TRUE')
			{
			for (var i = 0; i < accountallocations.length; i++)
				{
				
                // for each split line create a new expense line
				record.selectNewLineItem('expense');

				var lineamount = parseFloat (nlapiSelectValue(accountallocations[i], 'amount'));
				

				var linecharge =  (parseFloat(lineamount)/parseFloat(taxabletotalamount)) * totalheadercharges;
				var splitlinetax;

			    var adjlineamount = parseFloat(lineamount);
                

              
				
				if (nlapiGetContext().getSetting('SCRIPT', 'custscript_send_taxcode') == 'T')
				{
					nlapiLogExecution('DEBUG', 'if sendtaxcode set to true', 'lineamount = ' + adjlineamount);

					// for the new tax feature

					if(lineleveltaxation == 'false') // no line level tax scenrio - header level tax only
						{
							nlapiLogExecution('DEBUG', 'if sendtaxcode set to true and header level tax only', 'lineamount = ' + adjlineamount);
                 			if (nlapiSelectValue(invoice, 'tax-code/code'))
                 				{
                 				var taxsplit = nlapiSelectValue(invoice, 'tax-code/code').split(':');
                 				if (taxsplit[1])
									{
									record.setCurrentLineItemValue('expense', 'taxcode', taxsplit[1]);
									}
								else
									{
									nlapiLogExecution('ERROR', 'Processing Error - Invalid Header taxcode', 'TaxCode =' + nlapiSelectValue(invoice, 'tax-code/code')
																	+ ' Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number')
																	+ ' Supplier Name = ' + nlapiSelectValue(supplierNode, 'name'));
									}

                 				}
						} // end of no line level tax scenrio - header level tax only
					else // line level tax scenario
						{	
						nlapiLogExecution('DEBUG', 'if sendtaxcode set to true and line level tax', 'lineamount = ' + adjlineamount);

						if (nlapiSelectValue(invoiceLineNodes[x], 'tax-code/code')) // line level tax and taxcode used
							{
							var taxsplit = nlapiSelectValue(invoiceLineNodes[x], 'tax-code/code').split(':');
							if (taxsplit[1])
								{
								record.setCurrentLineItemValue('expense', 'taxcode', taxsplit[1]);
								nlapiLogExecution('DEBUG', 'if sendtaxcode set to true and linelevel tax and setting tax code to', 'TaxCode = ' + taxsplit[1] + ' lineamount = ' + adjlineamount);
								}
							else
								{
								nlapiLogExecution('ERROR', 'Processing Error - Invalid taxcode', 'TaxCode =' + nlapiSelectValue(invoiceLineNodes[x], 'tax-code/code')
																	+ ' Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number')
																	+ ' Supplier Name = ' + nlapiSelectValue(supplierNode, 'name'));
								}
							} // end of  line level tax and taxcode used

                		else if (nlapiSelectValue(invoiceLineNodes[x], 'tax-amount')) // line level tax and only taxamount no taxcode
							{

         					linetax = parseFloat(nlapiSelectValue(invoiceLineNodes[x], 'tax-amount'));
		
							if(linetax) 
								{
							
                            	splitlinetax = (parseFloat(lineamount)/parseFloat(invoicelineamount)) * linetax;
								totalheaderamount = parseFloat(totalheaderamount) + parseFloat(splitlinetax);
								//adjlineamount = parseFloat(lineamount) + parseFloat(linecharge) + parseFloat(linetax);
								adjlineamount = parseFloat(lineamount)  + parseFloat(splitlinetax);
								}

			  			
							} // end of line level tax and only taxamount no taxcode


						} // end of line level tax scenario

				
				} // end of for the new tax feature

				else  // Need to check for backward compatibility
					{

			  		nlapiLogExecution('DEBUG', 'if sendtaxcode set to false', 'lineamount = ' + adjlineamount);	
              		if (linetax)
              			{
              				splitlinetax = (parseFloat(lineamount)/parseFloat(invoicelineamount)) * linetax;
							adjlineamount = parseFloat(lineamount) + parseFloat(linecharge) + parseFloat(splitlinetax);
			    		}
			  		else
						{
							// customization for nontaxable
							if(nlapiSelectValue(invoiceLineNodes[x], 'nontaxable') == 'true')
								adjlineamount = parseFloat(lineamount);
							else
								adjlineamount = parseFloat(lineamount) + parseFloat(linecharge);
						}
			  
				    }

				

                 adjlineamount = adjlineamount.toFixed(2);

				 var accountNode = nlapiSelectNode(accountallocations[i], 'account');
			
				
				if (nlapiGetContext().getSetting('SCRIPT', 'custscript_glactseg'))
					{
					var account;
					var accountnumber;
					//var act;
					account = nlapiSelectValue(accountNode, nlapiGetContext().getSetting('SCRIPT', 'custscript_glactseg')).split(':');
					//act = account[0].split(' ');
					accountnumber = account[0];
				
					var accountId = getNetsuiteAccountId(accountnumber);
					if (accountId != 'INVALID_ACCOUNT')
						record.setCurrentLineItemValue('expense', 'account', accountId);
					else
						{
						nlapiLogExecution('ERROR', 'Processing Error - Invalid GL account', 'GL Account =' + accountnumber
																	+ ' Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number')
																	+ ' Supplier Name = ' + nlapiSelectValue(supplierNode, 'name'));
						nlapiSendEmail(-5, 
							nlapiGetContext().getSetting('SCRIPT', 'custscript_emailaddr_notifications'), 
							nlapiGetContext().getSetting('SCRIPT', 'custscript_acccountname') + ' Invoice Integration:Processing Error - Invalid GL account', 
							'GL Account =' + accountnumber
							+ ' Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number')
							+ ' Supplier Name = ' + nlapiSelectValue(supplierNode, 'name'));
						return;
						}
					}
				
				
				
				
				if (nlapiGetContext().getSetting('SCRIPT', 'custscript_deptseg'))
					{
					var dept = nlapiSelectValue(accountNode, nlapiGetContext().getSetting('SCRIPT', 'custscript_deptseg')).split(':');
					record.setCurrentLineItemValue('expense', 'department', dept[1]);
					}
		
				if (nlapiGetContext().getSetting('SCRIPT', 'custscript_classseg'))
					{
					var clss = nlapiSelectValue(accountNode, nlapiGetContext().getSetting('SCRIPT', 'custscript_classseg')).split(':');
					record.setCurrentLineItemValue('expense', 'class', clss[1]);
					}
			
				if (nlapiGetContext().getSetting('SCRIPT', 'custscript_locseg'))
					{
					var locId = nlapiSelectValue(accountNode, nlapiGetContext().getSetting('SCRIPT', 'custscript_locseg')).split(':');
					record.setCurrentLineItemValue('expense', 'location', locId[1]);
					}
			
				else if (nlapiGetContext().getSetting('SCRIPT', 'custscript_loccust'))
					{
					var locId = getNetsuiteId('location', nlapiSelectValue(invoiceLineNodes[x], nlapiGetContext().getSetting('SCRIPT', 'custscript_loccust')));
					if (locId != 'INVALID_NAME')
						record.setCurrentLineItemValue('expense', 'location', locId);
					}
				if (x == 0)
					{
					nlapiLogExecution('DEBUG', 'Check for Subsidiary segment custom field', nlapiGetContext().getSetting('SCRIPT', 'custscript_subsseg'));
				
					if (nlapiGetContext().getSetting('SCRIPT', 'custscript_subsseg'))
						{
						var subsidiaryId = nlapiSelectValue(accountNode, nlapiGetContext().getSetting('SCRIPT', 'custscript_subsseg')).split(':');
						nlapiLogExecution('DEBUG', 'Setting subsidiary ID to', subsidiaryId[1]);
						record.setFieldValue('subsidiary', subsidiaryId[1]);	
						}
					}
				
				
				
				// check for Coupa order line 
				if (nlapiSelectValue(invoiceLineNodes[x], 'order-header-num') && nlapiSelectValue(invoiceLineNodes[x], 'order-line-num'))
					{
					var poheadernum = nlapiSelectValue(invoiceLineNodes[x], 'order-header-num');
					var polinenum = nlapiSelectValue(invoiceLineNodes[x], 'order-line-num');
					record.setCurrentLineItemValue('expense','custcol_coupaponum',poheadernum + '-' + polinenum);
					}
				
				
				record.setCurrentLineItemValue('expense', 'memo',nlapiSelectValue(invoiceLineNodes[x], 'description'));
				record.setCurrentLineItemValue('expense','isbillable','T');

				
				/*** old code 

				if ((i == 0) && (x == 0)) 
					{
						totalcalcamount = parseFloat(adjlineamount);
					}
				else 
					{
						totalcalcamount = parseFloat(totalcalcamount) + parseFloat(adjlineamount);
					}
				*** end of old code ***/
				

                if ((i == 0) && (x == 0))
					{
						if (nlapiGetContext().getSetting('SCRIPT', 'custscript_send_taxcode')  && (nlapiGetContext().getSetting('SCRIPT', 'custscript_send_taxcode') == 'T'))
							totalcalcamount = parseFloat(adjlineamount) + parseFloat(linecharge);
						else
							totalcalcamount = parseFloat(adjlineamount);
					}
				else 
					{
						if (nlapiGetContext().getSetting('SCRIPT', 'custscript_send_taxcode')  && (nlapiGetContext().getSetting('SCRIPT', 'custscript_send_taxcode') == 'T'))
							totalcalcamount = parseFloat(totalcalcamount) + parseFloat(adjlineamount) + parseFloat(linecharge);
						else
							totalcalcamount = parseFloat(totalcalcamount) + parseFloat(adjlineamount);
					}

				totalcalcamount = totalcalcamount.toFixed(2);






				//nlapiLogExecution('DEBUG', 'Invoice Line details ', 'Invoice Line ' + x + ' SplitLine = ' + i + ' adjlineamount = ' + adjlineamount);
				
				
                /*** old code **

				if ((x == invoiceLineNodes.length-1) && (i == accountallocations.length-1))
    				{
					var roundingerror = totalheaderamount - totalcalcamount;
					//nlapiLogExecution('DEBUG', 'Rounding Error Details ', 'RoundingError = ' + roundingerror + 
					//		' totalheaderamount = ' + totalheaderamount + ' totalcalcamount = ' + totalcalcamount); 
					if (roundingerror)
    					{
						roundingerror = Math.round(parseFloat(roundingerror)*100)/100;
						adjlineamount = parseFloat(adjlineamount) + roundingerror;
    					}
    				}
				*** old code ******/

                var roundingerror = 0;
			
				if ((x == invoiceLineNodes.length-1) && (i == accountallocations.length-1))
    				{

    					nlapiLogExecution('DEBUG', 'Total Header Amount = ' + totalheaderamount	+ ' Calculated Amount = ' + totalcalcamount);
						roundingerror = totalheaderamount - totalcalcamount;
			
						if (roundingerror)
    						{
							roundingerror = Math.round(parseFloat(roundingerror)*100)/100;

							if (nlapiGetContext().getSetting('SCRIPT', 'custscript_send_taxcode')  && (nlapiGetContext().getSetting('SCRIPT', 'custscript_send_taxcode') == 'T'))
								{
                          		linecharge = linecharge + roundingerror;
								}
							else	
								adjlineamount = parseFloat(adjlineamount) + roundingerror;
    						}

    					nlapiLogExecution('DEBUG', 'Rounding Error Details ', 'RoundingError = ' + roundingerror + 
						' totalheaderamount = ' + totalheaderamount + ' totalcalcamount = ' + totalcalcamount + ' Adjusted line amount = ' + adjlineamount);	
    				}

    			nlapiLogExecution('DEBUG','before setting amount', 'amount = ' + parseFloat(adjlineamount));

				record.setCurrentLineItemValue('expense', 'amount',parseFloat(adjlineamount));
				
			
				
		        // check for custom fields on line level
				if (nlapiGetContext().getSetting('SCRIPT', 'custscript_customfield_line_count'))
					{
						for (var y = 1; y <= nlapiGetContext().getSetting('SCRIPT', 'custscript_customfield_line_count') ; y++)
							{
								if (nlapiGetContext().getSetting('SCRIPT', 'custscript_custfieldline' + y))
									{
										var custfield;
										var valuetoinsert = null;
										var textOrValue;
										if (nlapiGetContext().getSetting('SCRIPT', 'custscript_custfieldline' + y).split(':'))
											{
												custfield = nlapiGetContext().getSetting('SCRIPT', 'custscript_custfieldline' + y).split(':');
				
												if (custfield[4])
													valuetoinsert = custfield[4];
												
												else
													{
												
												
														if (nlapiSelectValue(invoiceLineNodes[x],custfield[0]))
															valuetoinsert = nlapiSelectValue(invoiceLineNodes[x],custfield[0]);
							
														if (custfield[2] && nlapiSelectValue(invoiceLineNodes[x],custfield[0]))
															{
																if (custfield[2] == 'Date')
																	valuetoinsert = ConvertCoupaDateToNetSuiteDate(nlapiSelectValue(invoiceLineNodes[x],custfield[0]));
								
																if (custfield[2] == 'Lookup')
																{
																	valuetoinsert = nlapiSelectValue(invoiceLineNodes[x],custfield[0]+ '/external-ref-num');
																}
									
															}
													}
								
												textOrValue = 'Text';
												if (custfield[3])
													{
														textOrValue = custfield[3];
													}
												
												
												nlapiLogExecution('DEBUG', 'Line CustomField' + ' ' + y, " custfield0 = " + custfield[0] 
												+ " custfield1 = " + custfield[1]
												+ " custfield2 = " + custfield[2]
												+ " custfield3 = " + custfield[3]
												+ " valuetoinsert = " + valuetoinsert );
												
												
												if (valuetoinsert)
													{
							
														if (textOrValue == 'Text')
															record.setCurrentLineItemText('expense',custfield[1],valuetoinsert);
														else
															record.setCurrentLineItemValue('expense',custfield[1],valuetoinsert);
													}
								
											}
									}
							}
					}
		
		
				
				record.commitLineItem('expense');

				if (headercharges && 
            	nlapiGetContext().getSetting('SCRIPT', 'custscript_send_taxcode') && 
            	(nlapiGetContext().getSetting('SCRIPT', 'custscript_send_taxcode') == 'T'))
            	{
                 SetHeaderChargesasExpenseLine(record, invoice, invoiceLineNodes[x], linecharge.toFixed(2), nlapiSelectNode(accountallocations[i], 'account'), true);
            	}
				
				} // end of the for loop for split lines
			} // end of if loop for split accounting to True
		
		else
		{
			var taxcodeexists = false;
			if (nlapiSelectValue(invoice, 'tax-code/code') || nlapiSelectValue(invoiceLineNodes[x], 'tax-code/code'))
				taxcodeexists = true;
			var accountNode = nlapiSelectNode(invoiceLineNodes[x], 'account');
		
			record.selectNewLineItem('expense');

			var lineamount = parseFloat (nlapiSelectValue(invoiceLineNodes[x], 'total'));
			var linecharge =  (parseFloat(lineamount)/parseFloat(taxabletotalamount)) * totalheadercharges;
			//var adjlineamount = parseFloat(lineamount) + parseFloat(linecharge);
			var adjlineamount = parseFloat(lineamount);

			
			if (nlapiGetContext().getSetting('SCRIPT', 'custscript_send_taxcode') == 'T')
			{
				nlapiLogExecution('DEBUG', 'if sendtaxcode set to true', 'lineamount = ' + adjlineamount);

				// for the new tax feature

				if(lineleveltaxation == 'false') // no line level tax scenrio - header level tax only
				{
					nlapiLogExecution('DEBUG', 'if sendtaxcode set to true and header level tax only', 'lineamount = ' + adjlineamount);
                 	if (nlapiSelectValue(invoice, 'tax-code/code'))
                 	{
                 		var taxsplit = nlapiSelectValue(invoice, 'tax-code/code').split(':');
                 		if (taxsplit[1])
							{
								record.setCurrentLineItemValue('expense', 'taxcode', taxsplit[1]);
							}
						else
							{
							nlapiLogExecution('ERROR', 'Processing Error - Invalid Header taxcode', 'TaxCode =' + nlapiSelectValue(invoice, 'tax-code/code')
																	+ ' Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number')
																	+ ' Supplier Name = ' + nlapiSelectValue(supplierNode, 'name'));
							}

                 	}
				} // end of no line level tax scenrio - header level tax only
				else // line level tax scenario
				{	
					nlapiLogExecution('DEBUG', 'if sendtaxcode set to true and line level tax', 'lineamount = ' + adjlineamount);

					if (nlapiSelectValue(invoiceLineNodes[x], 'tax-code/code')) // line level tax and taxcode used
					{
						var taxsplit = nlapiSelectValue(invoiceLineNodes[x], 'tax-code/code').split(':');
						if (taxsplit[1])
						{
							record.setCurrentLineItemValue('expense', 'taxcode', taxsplit[1]);
							nlapiLogExecution('DEBUG', 'if sendtaxcode set to true and linelevel tax and setting tax code to', 'TaxCode = ' + taxsplit[1] + ' lineamount = ' + adjlineamount);
						}
						else
						{
							nlapiLogExecution('ERROR', 'Processing Error - Invalid taxcode', 'TaxCode =' + nlapiSelectValue(invoiceLineNodes[x], 'tax-code/code')
																	+ ' Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number')
																	+ ' Supplier Name = ' + nlapiSelectValue(supplierNode, 'name'));
						}
					} // end of  line level tax and taxcode used

                	else if (nlapiSelectValue(invoiceLineNodes[x], 'tax-amount')) // line level tax and only taxamount no taxcode
					{

         				linetax = parseFloat(nlapiSelectValue(invoiceLineNodes[x], 'tax-amount'));
		
						if(linetax) 
						{
							totalheaderamount = parseFloat(totalheaderamount) + parseFloat(linetax);
							//adjlineamount = parseFloat(lineamount) + parseFloat(linecharge) + parseFloat(linetax);
							adjlineamount = parseFloat(lineamount)  + parseFloat(linetax);
						}

			  			
					} // end of line level tax and only taxamount no taxcode


				} // end of line level tax scenario

				
			} // end of for the new tax feature

			else  // check for the new tax feature - ????? Need to check for backward compatibility
			{

			  nlapiLogExecution('DEBUG', 'if sendtaxcode set to false', 'lineamount = ' + adjlineamount);	
              if (linetax)
				adjlineamount = parseFloat(lineamount) + parseFloat(linecharge) + parseFloat(linetax);
			  else
				{
					// customization for nontaxable
					if(nlapiSelectValue(invoiceLineNodes[x], 'nontaxable') == 'true')
						adjlineamount = parseFloat(lineamount);
					else
						adjlineamount = parseFloat(lineamount) + parseFloat(linecharge);
					nlapiLogExecution('DEBUG', 'After adjusting lineamount for linecharges', 'lineamount = ' + adjlineamount
																							+ ' linecharge = ' + linecharge );
				}
			  
			}
			
			adjlineamount = adjlineamount.toFixed(2);

			nlapiLogExecution('DEBUG', 'Adjusted line amount is ' + adjlineamount);

			if (nlapiGetContext().getSetting('SCRIPT', 'custscript_glactseg'))
				{
				var account;
				var accountnumber;
				//var act;
				account = nlapiSelectValue(accountNode, nlapiGetContext().getSetting('SCRIPT', 'custscript_glactseg')).split(':');
				//act = account[0].split(' ');
				accountnumber = account[0];
				
				var accountId = getNetsuiteAccountId(accountnumber);
				if (accountId != 'INVALID_ACCOUNT')
					record.setCurrentLineItemValue('expense', 'account', accountId);
				else
					{
					nlapiLogExecution('ERROR', 'Processing Error - Invalid GL account', 'GL Account =' + accountnumber
																	+ ' Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number')
																	+ ' Supplier Name = ' + nlapiSelectValue(supplierNode, 'name'));
					nlapiSendEmail(-5, 
							nlapiGetContext().getSetting('SCRIPT', 'custscript_emailaddr_notifications'), 
							nlapiGetContext().getSetting('SCRIPT', 'custscript_acccountname') + ' Invoice Integration:Processing Error - Invalid GL account', 
							'GL Account =' + accountnumber
							+ ' Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number')
							+ ' Supplier Name = ' + nlapiSelectValue(supplierNode, 'name'));
					return;
					}
				}
		
		
		
			if (nlapiGetContext().getSetting('SCRIPT', 'custscript_deptseg'))
				{
				var dept = nlapiSelectValue(accountNode, nlapiGetContext().getSetting('SCRIPT', 'custscript_deptseg')).split(':');
				record.setCurrentLineItemValue('expense', 'department', dept[1]);
				}
		
			if (nlapiGetContext().getSetting('SCRIPT', 'custscript_classseg'))
				{
				var clss = nlapiSelectValue(accountNode, nlapiGetContext().getSetting('SCRIPT', 'custscript_classseg')).split(':');
				record.setCurrentLineItemValue('expense', 'class', clss[1]);
				}
			
			if (nlapiGetContext().getSetting('SCRIPT', 'custscript_locseg'))
				{
				var locId = nlapiSelectValue(accountNode, nlapiGetContext().getSetting('SCRIPT', 'custscript_locseg')).split(':');
				record.setCurrentLineItemValue('expense', 'location', locId[1]);
				}
			
			else if (nlapiGetContext().getSetting('SCRIPT', 'custscript_loccust'))
				{
				var locId = getNetsuiteId('location', nlapiSelectValue(invoiceLineNodes[x], nlapiGetContext().getSetting('SCRIPT', 'custscript_loccust')));
				if (locId != 'INVALID_NAME')
					record.setCurrentLineItemValue('expense', 'location', locId);
				}
			if (x == 0)
				{
				//nlapiLogExecution('DEBUG', 'Check for Subsidiary segment custom field', nlapiGetContext().getSetting('SCRIPT', 'custscript_subsseg'));
				
				if (nlapiGetContext().getSetting('SCRIPT', 'custscript_subsseg'))
					{
					
					var subsidiaryId = nlapiSelectValue(accountNode, nlapiGetContext().getSetting('SCRIPT', 'custscript_subsseg')).split(':');
					//nlapiLogExecution('DEBUG', 'Setting subsidiary ID to', subsidiaryId[1]);
					record.setFieldValue('subsidiary', subsidiaryId[1]);	
					}
				}
			
			
			/* check for Coupa order line */
			if (nlapiSelectValue(invoiceLineNodes[x], 'order-header-num') && nlapiSelectValue(invoiceLineNodes[x], 'order-line-num'))
				{
				var poheadernum = nlapiSelectValue(invoiceLineNodes[x], 'order-header-num');
				var polinenum = nlapiSelectValue(invoiceLineNodes[x], 'order-line-num');
				record.setCurrentLineItemValue('expense','custcol_coupaponum',poheadernum + '-' + polinenum);
				}
			
			
			
			record.setCurrentLineItemValue('expense', 'memo',nlapiSelectValue(invoiceLineNodes[x], 'description'));
			record.setCurrentLineItemValue('expense','isbillable','T');

    	
			//linecharge = linecharge.toFixed(2);

			if (x == 0) 
				{
					if (nlapiGetContext().getSetting('SCRIPT', 'custscript_send_taxcode')  && (nlapiGetContext().getSetting('SCRIPT', 'custscript_send_taxcode') == 'T'))
						totalcalcamount = parseFloat(adjlineamount) + parseFloat(linecharge);
					else
						totalcalcamount = parseFloat(adjlineamount);
				}
			else 
				{
					if (nlapiGetContext().getSetting('SCRIPT', 'custscript_send_taxcode')  && (nlapiGetContext().getSetting('SCRIPT', 'custscript_send_taxcode') == 'T'))
						totalcalcamount = parseFloat(totalcalcamount) + parseFloat(adjlineamount) + parseFloat(linecharge);
					else
						totalcalcamount = parseFloat(totalcalcamount) + parseFloat(adjlineamount);
				}

			totalcalcamount = totalcalcamount.toFixed(2);
    	
    	
		//	nlapiLogExecution('DEBUG', 'Invoice Line details ', 'Line ' + x + ' adjlineamount = ' + adjlineamount);
    	    
    	    var roundingerror = 0;
			
			if (x == invoiceLineNodes.length-1)
    			{

    			nlapiLogExecution('DEBUG', 'Total Header Amount = ' + totalheaderamount	+ ' Calculated Amount = ' + totalcalcamount);
				roundingerror = totalheaderamount - totalcalcamount;
				/*nlapiLogExecution('DEBUG', 'Rounding Error Details ', 'RoundingError = ' + roundingerror + 
						' totalheaderamount = ' + totalheaderamount + ' totalcalcamount = ' + totalcalcamount); */
				if (roundingerror)
    				{
					roundingerror = Math.round(parseFloat(roundingerror)*100)/100;

					if (nlapiGetContext().getSetting('SCRIPT', 'custscript_send_taxcode')  && (nlapiGetContext().getSetting('SCRIPT', 'custscript_send_taxcode') == 'T'))
						{
                          linecharge = linecharge + roundingerror;
						}
					else	
						adjlineamount = parseFloat(adjlineamount) + roundingerror;
    				}

    			nlapiLogExecution('DEBUG', 'Rounding Error Details ', 'RoundingError = ' + roundingerror + 
						' totalheaderamount = ' + totalheaderamount + ' totalcalcamount = ' + totalcalcamount + ' Adjusted line amount = ' + adjlineamount);	
    			}

    		nlapiLogExecution('DEBUG','before setting amount', 'amount = ' + parseFloat(adjlineamount));	
			record.setCurrentLineItemValue('expense', 'amount',parseFloat(adjlineamount));
			
			// check for custom fields on line level
			if (nlapiGetContext().getSetting('SCRIPT', 'custscript_customfield_line_count'))
				{
					for (var y = 1; y <= nlapiGetContext().getSetting('SCRIPT', 'custscript_customfield_line_count') ; y++)
						{
							if (nlapiGetContext().getSetting('SCRIPT', 'custscript_custfieldline' + y))
								{
									var custfield;
									var valuetoinsert = null;
									var textOrValue;
									if (nlapiGetContext().getSetting('SCRIPT', 'custscript_custfieldline' + y).split(':'))
										{
											custfield = nlapiGetContext().getSetting('SCRIPT', 'custscript_custfieldline' + y).split(':');
											
											if (custfield[4])
												{
												valuetoinsert = custfield[4];
												nlapiLogExecution('DEBUG','Valuetoinsert = ', valuetoinsert);
												}
											
											else
												{
												
											
													if (nlapiSelectValue(invoiceLineNodes[x],custfield[0]))
														valuetoinsert = nlapiSelectValue(invoiceLineNodes[x],custfield[0]);
													
													nlapiLogExecution('DEBUG', 'Line Custom ' + y, 'Coupa field = ' + nlapiSelectValue(invoiceLineNodes[x],custfield[0]) 
															+ ' ValuetoInsert = ' + valuetoinsert);
						
													if (custfield[2] && nlapiSelectValue(invoiceLineNodes[x],custfield[0]))
														{
															if (custfield[2] == 'Date')
																{
																valuetoinsert = ConvertCoupaDateToNetSuiteDate(nlapiSelectValue(invoiceLineNodes[x],custfield[0]));
																nlapiLogExecution('DEBUG', 'Line Custom Inside coupatype = date' + y, 'Coupa field = ' + nlapiSelectValue(invoiceLineNodes[x],custfield[0]) 
																		+ ' ValuetoInsert = ' + valuetoinsert);
																}
							
															if (custfield[2] == 'Lookup')
																{
																
																	valuetoinsert = nlapiSelectValue(invoiceLineNodes[x],custfield[0]+ '/external-ref-num');
																	nlapiLogExecution('DEBUG', 'Line Custom Inside coupatype = lookup' + y, 'Coupa field = ' + nlapiSelectValue(invoiceLineNodes[x],custfield[0]) 
																			+ ' ValuetoInsert = ' + valuetoinsert);
																}
								
														}
											
												}
							
											textOrValue = 'Text';
											if (custfield[3])
												{
													textOrValue = custfield[3];
												}
											
											
											nlapiLogExecution('DEBUG', 'Line CustomField' + ' ' + y, " custfield0 = " + custfield[0] 
											+ " custfield1 = " + custfield[1]
											+ " custfield2 = " + custfield[2]
											+ " custfield3 = " + custfield[3]
											+ " valuetoinsert = " + valuetoinsert );
											
											
											if (valuetoinsert != null && valuetoinsert != undefined && valuetoinsert != 'None')
												{
						
													if (textOrValue == 'Text')
														record.setCurrentLineItemText('expense',custfield[1],valuetoinsert);
													else
														record.setCurrentLineItemValue('expense',custfield[1],valuetoinsert);
												}
							
										}
								}
						}
				}
			
			
			record.commitLineItem('expense');
            
            /**

            if (headercharges && 
            	nlapiGetContext().getSetting('SCRIPT', 'custscript_send_taxcode') && 
            	(nlapiGetContext().getSetting('SCRIPT', 'custscript_send_taxcode') == 'T') &&
            	taxcodeexists)
            	{
                 SetHeaderChargesasExpenseLine(record, invoice, invoiceLineNodes[x], linecharge.toFixed(2));
            	}

            **/	

            if (headercharges && 
            	nlapiGetContext().getSetting('SCRIPT', 'custscript_send_taxcode') && 
            	(nlapiGetContext().getSetting('SCRIPT', 'custscript_send_taxcode') == 'T'))
            	{
                 SetHeaderChargesasExpenseLine(record, invoice, invoiceLineNodes[x], linecharge.toFixed(2), null, false);
            	}

			} // end of else --- i.e if not split accounting
		
		} // end of main for loop that goes through each invoice line
	
	try
		{
		nlapiSubmitRecord(record, true);
		}
		catch (e)
		{
			nlapiLogExecution('ERROR', 'Processing Error - Unable to create vendor bill', ' Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number')
					+ ' Supplier Name = ' + nlapiSelectValue(supplierNode, 'name') 
					+ ' Error Description = ' + e.message);
			nlapiSendEmail(-5, 
					nlapiGetContext().getSetting('SCRIPT', 'custscript_emailaddr_notifications'),  
					nlapiGetContext().getSetting('SCRIPT', 'custscript_acccountname') + ' Invoice Integration:Processing Error - Unable to create vendor bill', 
					'Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number')
					+ ' Supplier Name = ' + nlapiSelectValue(supplierNode, 'name')
					+ ' Error Description = ' + e.message);
			return;
		}
		
	
	nlapiLogExecution('AUDIT', 'Successfully created vendor bill', ' Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number')
				+ ' Supplier Name = ' + nlapiSelectValue(supplierNode, 'name'));	
	Setexportedtotrue(nlapiSelectValue(invoice, 'id'));
}

function VoidVendorBill(invoice, id)
{
	//nlapiLogExecution('DEBUG', 'VOID Vendor Bill ', 'Netsuite Id = ' + id + ' Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number'));
	try {
	var record = nlapiLoadRecord('vendorbill', id);
	record.setFieldText('approvalstatus', 'Rejected'); 
	nlapiSubmitRecord(record);
	}
	catch(e)
	{
		nlapiLogExecution('ERROR', 'Processing Error - Unable to void vendor bill', ' Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number')
				+ ' Supplier Name = ' + nlapiSelectValue(invoice, 'supplier/name')
				+ ' Error Description = ' + e.message);
		nlapiSendEmail(-5, 
				nlapiGetContext().getSetting('SCRIPT', 'custscript_emailaddr_notifications'),  
				nlapiGetContext().getSetting('SCRIPT', 'custscript_acccountname') + ' Invoice Integration:Processing Error - Unable to void vendor bill', 
				'Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number')
				+ ' Supplier Name = ' + nlapiSelectValue(invoice, 'supplier/name')
				+ ' Error Description = ' + e.message);
	}
	
	nlapiLogExecution('AUDIT', 'Successfully voided vendor bill', ' Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number')
			+ ' Supplier Name = ' + nlapiSelectValue(invoice, 'supplier/name'));
	
	Setexportedtotrue(nlapiSelectValue(invoice, 'id'));
	
	
}



function SetHeaderChargesasExpenseLine(record, invoice, invoiceline, linecharge, splitaccountNode, isSplit)
{
	var accountNode;
    
    if (isSplit)
    	accountNode = splitaccountNode
    else
		accountNode = nlapiSelectNode(invoiceline, 'account');
		
	record.selectNewLineItem('expense');

	if (nlapiGetContext().getSetting('SCRIPT', 'custscript_glactseg'))
				{
				var account;
				var accountnumber;
				//var act;
				account = nlapiSelectValue(accountNode, nlapiGetContext().getSetting('SCRIPT', 'custscript_glactseg')).split(':');
				//act = account[0].split(' ');
				accountnumber = account[0];
				
				var accountId = getNetsuiteAccountId(accountnumber);
				if (accountId != 'INVALID_ACCOUNT')
					record.setCurrentLineItemValue('expense', 'account', accountId);
				else
					{
					nlapiLogExecution('ERROR', 'Processing Error - Invalid GL account', 'GL Account =' + accountnumber
																	+ ' Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number')
																	+ ' Supplier Name = ' + nlapiSelectValue(invoice, 'supplier/name'));
					nlapiSendEmail(-5, 
							nlapiGetContext().getSetting('SCRIPT', 'custscript_emailaddr_notifications'), 
							nlapiGetContext().getSetting('SCRIPT', 'custscript_acccountname') + ' Invoice Integration:Processing Error - Invalid GL account', 
							'GL Account =' + accountnumber
							+ ' Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number')
							+ ' Supplier Name = ' + nlapiSelectValue(invoice, 'supplier/name'));
					return;
					}
				}
		
		
		
			if (nlapiGetContext().getSetting('SCRIPT', 'custscript_deptseg'))
				{
				var dept = nlapiSelectValue(accountNode, nlapiGetContext().getSetting('SCRIPT', 'custscript_deptseg')).split(':');
				record.setCurrentLineItemValue('expense', 'department', dept[1]);
				}
		
			if (nlapiGetContext().getSetting('SCRIPT', 'custscript_classseg'))
				{
				var clss = nlapiSelectValue(accountNode, nlapiGetContext().getSetting('SCRIPT', 'custscript_classseg')).split(':');
				record.setCurrentLineItemValue('expense', 'class', clss[1]);
				}
			
			if (nlapiGetContext().getSetting('SCRIPT', 'custscript_locseg'))
				{
				var locId = nlapiSelectValue(accountNode, nlapiGetContext().getSetting('SCRIPT', 'custscript_locseg')).split(':');
				record.setCurrentLineItemValue('expense', 'location', locId[1]);
				}
			
			else if (nlapiGetContext().getSetting('SCRIPT', 'custscript_loccust'))
				{
				var locId = getNetsuiteId('location', nlapiSelectValue(invoiceline, nlapiGetContext().getSetting('SCRIPT', 'custscript_loccust')));
				if (locId != 'INVALID_NAME')
					record.setCurrentLineItemValue('expense', 'location', locId);
				}
			
			
			/* check for Coupa order line */
			if (nlapiSelectValue(invoiceline, 'order-header-num') && nlapiSelectValue(invoiceline, 'order-line-num'))
				{
				var poheadernum = nlapiSelectValue(invoiceline, 'order-header-num');
				var polinenum = nlapiSelectValue(invoiceline, 'order-line-num');
				record.setCurrentLineItemValue('expense','custcol_coupaponum',poheadernum + '-' + polinenum);
				}

			record.setCurrentLineItemValue('expense', 'amount',parseFloat(linecharge));

			
            if (isSplit)
				record.setCurrentLineItemValue('expense', 'memo','Header Charges for Split line: ' + nlapiSelectValue(invoiceline, 'description'));
			else 
				record.setCurrentLineItemValue('expense', 'memo','Header Charges for line: ' + nlapiSelectValue(invoiceline, 'description'));
			

			record.setCurrentLineItemValue('expense','isbillable','T');
			
			// check for custom fields on line level
			if (nlapiGetContext().getSetting('SCRIPT', 'custscript_customfield_line_count'))
				{
					for (var y = 1; y <= nlapiGetContext().getSetting('SCRIPT', 'custscript_customfield_line_count') ; y++)
						{
							if (nlapiGetContext().getSetting('SCRIPT', 'custscript_custfieldline' + y))
								{
									var custfield;
									var valuetoinsert = null;
									var textOrValue;
									if (nlapiGetContext().getSetting('SCRIPT', 'custscript_custfieldline' + y).split(':'))
										{
											custfield = nlapiGetContext().getSetting('SCRIPT', 'custscript_custfieldline' + y).split(':');
											
											if (custfield[4])
												{
												valuetoinsert = custfield[4];
												nlapiLogExecution('DEBUG','Valuetoinsert = ', valuetoinsert);
												}
											
											else
												{
												
											
													if (nlapiSelectValue(invoiceline,custfield[0]))
														valuetoinsert = nlapiSelectValue(invoiceline,custfield[0]);
													
													nlapiLogExecution('DEBUG', 'Line Custom ' + y, 'Coupa field = ' + nlapiSelectValue(invoiceline,custfield[0]) 
															+ ' ValuetoInsert = ' + valuetoinsert);
						
													if (custfield[2] && nlapiSelectValue(invoiceline,custfield[0]))
														{
															if (custfield[2] == 'Date')
																{
																valuetoinsert = ConvertCoupaDateToNetSuiteDate(nlapiSelectValue(invoiceline,custfield[0]));
																nlapiLogExecution('DEBUG', 'Line Custom Inside coupatype = date' + y, 'Coupa field = ' + nlapiSelectValue(invoiceline,custfield[0]) 
																		+ ' ValuetoInsert = ' + valuetoinsert);
																}
							
															if (custfield[2] == 'Lookup')
																{
																
																	valuetoinsert = nlapiSelectValue(invoiceline,custfield[0]+ '/external-ref-num');
																	nlapiLogExecution('DEBUG', 'Line Custom Inside coupatype = lookup' + y, 'Coupa field = ' + nlapiSelectValue(invoiceline,custfield[0]) 
																			+ ' ValuetoInsert = ' + valuetoinsert);
																}
								
														}
											
												}
							
											textOrValue = 'Text';
											if (custfield[3])
												{
													textOrValue = custfield[3];
												}
											
											
											nlapiLogExecution('DEBUG', 'Line CustomField' + ' ' + y, " custfield0 = " + custfield[0] 
											+ " custfield1 = " + custfield[1]
											+ " custfield2 = " + custfield[2]
											+ " custfield3 = " + custfield[3]
											+ " valuetoinsert = " + valuetoinsert );
											
											
											if (valuetoinsert != null && valuetoinsert != undefined && valuetoinsert != 'None')
												{
						
													if (textOrValue == 'Text')
														record.setCurrentLineItemText('expense',custfield[1],valuetoinsert);
													else
														record.setCurrentLineItemValue('expense',custfield[1],valuetoinsert);
												}
							
										}
								}
						}
				}
			
			
			record.commitLineItem('expense');	
}


function UpdateVendorBill(invoice, id)
{
	//nlapiLogExecution('DEBUG', 'Update Vendor Bill ', 'Netsuite Id = ' + id + ' Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number'));
	
	var lineleveltaxation = 'false';
	
	lineleveltaxation = nlapiSelectValue(invoice, 'line-level-taxation');
	
	var record = nlapiLoadRecord('vendorbill', id);
	
	lineleveltaxation = nlapiSelectValue(invoice, 'line-level-taxation');
	
	record.setFieldValue('externalid', nlapiSelectValue(invoice, 'id'));
	record.setFieldValue('trandate', ConvertCoupaDateToNetSuiteDate(nlapiSelectValue(invoice, 'invoice-date')));
	var supplierNode = nlapiSelectNode(invoice, 'supplier');
	//nlapiLogExecution('DEBUG', 'SupplierName', nlapiSelectValue(supplierNode, 'name'));
	
	if (nlapiSelectValue(supplierNode, 'number'))
		record.setFieldValue('entity', nlapiSelectValue(supplierNode, 'number'));
	else
	// try setting supplier name instead on id
		record.setFieldText('entity', nlapiSelectValue(supplierNode, 'name'));
	
	var paymentTermNode = nlapiSelectNode(invoice, 'payment-term');
	//nlapiLogExecution('DEBUG', 'Payment Term', nlapiSelectValue(paymentTermNode, 'code'));
	
	
	var terms =  'Net 30'; 
	if (paymentTermNode)
		{
		terms = getNetsuitetermid(nlapiSelectValue(paymentTermNode, 'code'));
		}
	record.setFieldValue('terms', terms);
	
	// set the posting period - see customization for coupa
	var today = new Date();
	var postingPeriod = getMonthShortName(today.getMonth()) + ' '  + today.getFullYear();
	
	//nlapiLogExecution('DEBUG', 'Today date day = ', today.getDate());
	
	if (today.getDate() < 7)
		{
		var nDate = nlapiSelectValue(invoice, 'invoice-date').split('T');
		var datesplit = nDate[0].split('-');
		var Nyear = datesplit[0];
		var Nday = datesplit[2];
		var Nmonth = datesplit[1]-1;
		/*
		nlapiLogExecution('DEBUG', 'Posting period details', 'invoicemonth = ' + Nmonth 
															+ ' today month = ' + today.getMonth()
															+ ' invoice year = ' + Nyear
															+ ' today year = ' + today.getFullYear()); */
		if (today.getFullYear() > Nyear)
			{
			if (today.getMonth() == 0)
				postingPeriod = getMonthShortName('11') + ' '  + (today.getFullYear()-1);
			else
				postingPeriod = getMonthShortName(today.getMonth()-1) + ' '  + today.getFullYear();
			}
		
		if (Nmonth < today.getMonth() && Nyear == today.getFullYear())
			postingPeriod = getMonthShortName(today.getMonth()-1) + ' '  + today.getFullYear();
		}
	record.setFieldText('postingperiod', postingPeriod);
	
	
	//set accounts payable account if passed as parameter to the script
	if (nlapiGetContext().getSetting('SCRIPT' , 'custscript_actpayablenum'))
		{
		var apAccountId = getNetsuiteAccountId(nlapiGetContext().getSetting('SCRIPT' , 'custscript_actpayablenum'));
		
		if (apAccountId != 'INVALID_ACCOUNT')
			record.setFieldValue('account', apAccountId);
		}
	
	
	
	
	
	record.setFieldValue('tranid', nlapiSelectValue(invoice, 'invoice-number'));
	
	// customization for Coupa to handle old COA
	var oldCOA = 'false';
	if (nlapiSelectValue(invoice, 'account-type/name') == 'Coupa Chart of Accounts - old')
		{
		oldCOA = 'true';
		}
	
	
	var shippingamount = parseFloat(nlapiSelectValue(invoice, 'shipping-amount'));
	var handlingamount = parseFloat(nlapiSelectValue(invoice, 'handling-amount'));
	var taxamount = parseFloat(nlapiSelectValue(invoice, 'tax-amount'));
	var miscamount = parseFloat(nlapiSelectValue(invoice, 'misc-amount'));
	
	/* nlapiLogExecution('DEBUG', 'Other Charges', 'Shipping = ' + shippingamount + ' Handling = ' + handlingamount 
												+ ' Taxamount = ' + taxamount + ' miscamount = ' + miscamount); */
	
	
	var totalheadercharges;
	if(lineleveltaxation == 'false')
		totalheadercharges = parseFloat(shippingamount) + parseFloat(handlingamount) + parseFloat(taxamount) + parseFloat (miscamount);
	else 
		totalheadercharges = parseFloat(shippingamount) + parseFloat(handlingamount) + parseFloat (miscamount);
	
	var invoiceLine = nlapiSelectNode(invoice, 'invoice-lines');
	var invoiceLineNodes = new Array();
	
	invoiceLineNodes = nlapiSelectNodes(invoiceLine, 'invoice-line');
	
	// get total amount by adding the line amounts
	var totalamount = 0;
	
	for ( var x = 0; x < invoiceLineNodes.length; x++)
		{
		totalamount = parseFloat(totalamount) + parseFloat(nlapiSelectValue(invoiceLineNodes[x], 'total'));
		}
	
	var totalheaderamount = parseFloat(totalamount) + parseFloat(totalheadercharges);
	totalheaderamount = totalheaderamount.toFixed(3);
	var totalcalcamount = 0;
	
	var expenselinetotal = record.getLineItemCount('expense');
	
	/* void the existing expense lines
	 * 
	 */
	if (expenselinetotal >= 1)
	{
	for (var j=1; j <= expenselinetotal; j++)
		{
		record.selectLineItem('expense', j);
		record.setCurrentLineItemValue('expense', 'memo','Voiding line because of vendor bill update');
		record.setCurrentLineItemValue('expense','isbillable','F');
		record.setCurrentLineItemValue('expense', 'amount','0');
		record.commitLineItem('expense');
		}
	}
	
	
	
	for ( var x = 0; x < invoiceLineNodes.length; x++)
		{
		
		var linetax = parseFloat(nlapiSelectValue(invoiceLineNodes[x], 'tax-amount'));
		
		if(linetax) 
			totalheaderamount = parseFloat(totalheaderamount) + parseFloat(linetax);
		
		var invoicelineamount = parseFloat(nlapiSelectValue(invoiceLineNodes[x], 'total'));
		var splitaccounting = 'FALSE';
		var actalloc = nlapiSelectNode(invoiceLineNodes[x], 'account-allocations');
		var accountallocations = new Array();
		accountallocations = nlapiSelectNodes(actalloc, 'account-allocation');
		if (accountallocations.length >= 1)
			{
			splitaccounting = 'TRUE';
			//nlapiLogExecution('DEBUG', 'Split accounting = ', splitaccounting);
			}
		
		if (splitaccounting == 'TRUE')
			{
			for (var i = 0; i < accountallocations.length; i++)
				{
				var lineamount = parseFloat (nlapiSelectValue(accountallocations[i], 'amount'));
				var linecharge =  (parseFloat(lineamount)/parseFloat(totalamount)) 
				* totalheadercharges;
				var splitlinetax;
				if (linetax)
					{
					splitlinetax = (parseFloat(lineamount)/parseFloat(invoicelineamount)) 
					* linetax;
					//nlapiLogExecution('DEBUG', 'split line tax details ', 'splitline amount = ' + lineamount + ' splitlinetax = ' + splitlinetax);
					}
				var adjlineamount;
				
				if (linetax)
					adjlineamount = parseFloat(lineamount) + parseFloat(linecharge) + parseFloat(splitlinetax);
				else
					adjlineamount = parseFloat(lineamount) + parseFloat(linecharge);
				
				adjlineamount = adjlineamount.toFixed(2);
				var accountNode = nlapiSelectNode(accountallocations[i], 'account');
				
				
					
				record.selectNewLineItem('expense');
				
				
				if (nlapiGetContext().getSetting('SCRIPT', 'custscript_glactseg'))
					{
					var accountnumber;
					
					if (oldCOA == 'true')
						accountnumber = '69999';
					else
						accountnumber = nlapiSelectValue(accountNode, nlapiGetContext().getSetting('SCRIPT', 'custscript_glactseg'));
					
					var accountId = getNetsuiteAccountId(accountnumber);
					
					if (accountId != 'INVALID_ACCOUNT')
						record.setCurrentLineItemValue('expense', 'account', accountId);
					else
						{
						nlapiLogExecution('ERROR', 'Processing Error - Invalid GL account', 'GL Account =' + accountnumber
																		+ ' Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number')
																		+ ' Supplier Name = ' + nlapiSelectValue(supplierNode, 'name'));
						nlapiSendEmail(-5, 
								nlapiGetContext().getSetting('SCRIPT', 'custscript_emailaddr_notifications'),
								nlapiGetContext().getSetting('SCRIPT', 'custscript_acccountname') + ' Invoice Integration:Processing Error - Invalid GL account', 
								'GL Account =' + accountnumber
								+ ' Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number')
								+ ' Supplier Name = ' + nlapiSelectValue(supplierNode, 'name'));
						return;
						}
					}
			
			
			
				if (nlapiGetContext().getSetting('SCRIPT', 'custscript_deptseg'))
					{
					var deptId;
					if (oldCOA == 'true')
						deptId = getNetsuiteId('department', 'GNA');
					else
						deptId = getNetsuiteId('department', nlapiSelectValue(accountNode, nlapiGetContext().getSetting('SCRIPT', 'custscript_deptseg')));
					
					if (deptId != 'INVALID_NAME')
						record.setCurrentLineItemValue('expense', 'department', deptId);
					}
			
				if (nlapiGetContext().getSetting('SCRIPT', 'custscript_classseg'))
					{
					var classId = getNetsuiteId('classification', nlapiSelectValue(accountNode, nlapiGetContext().getSetting('SCRIPT', 'custscript_classseg')));
					if (classId != 'INVALID_NAME')
						record.setCurrentLineItemValue('expense', 'class', classId);
					}
				
				// check for Coupa order line 
				if (nlapiSelectValue(invoiceLineNodes[x], 'order-header-num') && nlapiSelectValue(invoiceLineNodes[x], 'order-line-num'))
					{
					var poheadernum = nlapiSelectValue(invoiceLineNodes[x], 'order-header-num');
					var polinenum = nlapiSelectValue(invoiceLineNodes[x], 'order-line-num');
					record.setCurrentLineItemValue('expense','custcol_coupaponum',poheadernum + '-' + polinenum);
					}
				
				
				record.setCurrentLineItemValue('expense', 'memo',nlapiSelectValue(invoiceLineNodes[x], 'description'));
				record.setCurrentLineItemValue('expense','isbillable','T');
				
				if ((i == 0) && (x == 0)) totalcalcamount = parseFloat(adjlineamount);
				else totalcalcamount = parseFloat(totalcalcamount) + parseFloat(adjlineamount);
				
			//	nlapiLogExecution('DEBUG', 'Invoice Line details ', 'Invoice Line ' + x + ' SplitLine = ' + i + ' adjlineamount = ' + adjlineamount);
				
				if ((x == invoiceLineNodes.length-1) && (i == accountallocations.length-1))
    				{
					var roundingerror = totalheaderamount - totalcalcamount;
				
					/*nlapiLogExecution('DEBUG', 'Rounding Error Details ', 'RoundingError = ' + roundingerror + 
							' totalheaderamount = ' + totalheaderamount + ' totalcalcamount = ' + totalcalcamount); */
					if (roundingerror)
    					{
						roundingerror = Math.round(parseFloat(roundingerror)*100)/100;
						adjlineamount = parseFloat(adjlineamount) + roundingerror;
    					}
    				}
				record.setCurrentLineItemValue('expense', 'amount',parseFloat(adjlineamount));
				record.commitLineItem('expense');
				
				} // end of the for loop for split lines
			} // end of if loop for split accounting to True
		
		else
		{
			
			var lineamount = parseFloat (nlapiSelectValue(invoiceLineNodes[x], 'total'));
			var linecharge =  (parseFloat(lineamount)/parseFloat(totalamount)) 
			* totalheadercharges;
			var adjlineamount;
			
			if (linetax)
				adjlineamount = parseFloat(lineamount) + parseFloat(linecharge) + parseFloat(linetax);
			else
				adjlineamount = parseFloat(lineamount) + parseFloat(linecharge);
			adjlineamount = adjlineamount.toFixed(2);
			var accountNode = nlapiSelectNode(invoiceLineNodes[x], 'account');
		
			
			record.selectNewLineItem('expense');
		
			if (nlapiGetContext().getSetting('SCRIPT', 'custscript_glactseg'))
				{
				var accountnumber;
				
				if (oldCOA == 'true')
					accountnumber = '69999';
				else
					accountnumber = nlapiSelectValue(accountNode, nlapiGetContext().getSetting('SCRIPT', 'custscript_glactseg'));
				var accountId = getNetsuiteAccountId(accountnumber);
				record.setCurrentLineItemValue('expense', 'account', accountId);
				}
			
			
			
			if (nlapiGetContext().getSetting('SCRIPT', 'custscript_deptseg'))
				{
				var deptId;
				
				if (oldCOA == 'true')
					deptId = getNetsuiteId('department', 'GNA');
				else
					deptId = getNetsuiteId('department', nlapiSelectValue(accountNode, nlapiGetContext().getSetting('SCRIPT', 'custscript_deptseg')));
				
				if (deptId != 'INVALID_NAME')
					record.setCurrentLineItemValue('expense', 'department', deptId);
				}
			
			if (nlapiGetContext().getSetting('SCRIPT', 'custscript_classseg'))
				{
				var classId = getNetsuiteId('classification', nlapiSelectValue(accountNode, nlapiGetContext().getSetting('SCRIPT', 'custscript_classseg')));
				if (classId != 'INVALID_NAME')
					record.setCurrentLineItemValue('expense', 'class', classId);
				}
				
			
			// check for Coupa order line 
			if (nlapiSelectValue(invoiceLineNodes[x], 'order-header-num') && nlapiSelectValue(invoiceLineNodes[x], 'order-line-num'))
				{
				var poheadernum = nlapiSelectValue(invoiceLineNodes[x], 'order-header-num');
				var polinenum = nlapiSelectValue(invoiceLineNodes[x], 'order-line-num');
				record.setCurrentLineItemValue('expense','custcol_coupaponum',poheadernum + '-' + polinenum);
				}
			
			record.setCurrentLineItemValue('expense', 'memo',nlapiSelectValue(invoiceLineNodes[x], 'description'));
			record.setCurrentLineItemValue('expense','isbillable','T');
    	
			if (x == 0) totalcalcamount = parseFloat(adjlineamount);
			else totalcalcamount = parseFloat(totalcalcamount) + parseFloat(adjlineamount);
    	
    	
			//nlapiLogExecution('DEBUG', 'Invoice Line details ', 'Line ' + x + ' adjlineamount = ' + adjlineamount);
    	
			if (x == invoiceLineNodes.length-1)
    			{
				var roundingerror = totalheaderamount - totalcalcamount;
				
				/*nlapiLogExecution('DEBUG', 'Rounding Error Details ', 'RoundingError = ' + roundingerror + 
						' totalheaderamount = ' + totalheaderamount + ' totalcalcamount = ' + totalcalcamount); */
				if (roundingerror)
    				{
					roundingerror = Math.round(parseFloat(roundingerror)*100)/100;
					adjlineamount = parseFloat(adjlineamount) + roundingerror;
    				}
    			}
			record.setCurrentLineItemValue('expense', 'amount',parseFloat(adjlineamount));
			record.commitLineItem('expense');
			} // end of else --- i.e if not split accounting
		
		} // end of main for loop that goes through each invoice line
	
	/* delete the remaining expense lines
	if (expenselinetotal > invoiceLineNodes.length)
		{
		for (var a = invoiceLineNodes.length+1; a <= expenselinetotal; a++ )
			{
			nlapiLogExecution('DEBUG', 'before deleting expense line '+ a, 'Expenselinetotoal = ' + expenselinetotal);
			record.removeLineItem('expense', a);
			nlapiLogExecution('DEBUG', 'after deleting expense line '+ a, 'Expenselinetotoal = ' + expenselinetotal);
			}
		}
	 delete the remaining expense lines */
	
	try{
		nlapiSubmitRecord(record, true);
		}
	catch(e)
		{
		nlapiLogExecution('ERROR', 'Processing Error - Unable to create vendor bill', ' Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number')
				+ ' Supplier Name = ' + nlapiSelectValue(supplierNode, 'name')
				+ ' Error Description = ' + e.message);
		nlapiSendEmail(-5, 
				nlapiGetContext().getSetting('SCRIPT', 'custscript_emailaddr_notifications'), 
				nlapiGetContext().getSetting('SCRIPT', 'custscript_acccountname') + ' Invoice Integration:Processing Error - Unable to create vendor bill', 
				'Invoice Number = ' + nlapiSelectValue(invoice, 'invoice-number')
				+ ' Supplier Name = ' + nlapiSelectValue(supplierNode, 'name')
				+ ' Error description = ' + e.message);
		return;
		}
	Setexportedtotrue(nlapiSelectValue(invoice, 'id'));
	
}



function vendorBillExists(tranid, externalid, entity)
{
	//nlapiLogExecution('DEBUG','in vendorBillExists', 'tranid = ' + tranid + ' externalid = ' + externalid);
	var filters = new Array();
	
	filters[0] = new nlobjSearchFilter( 'tranid', null, 'is', tranid );
	filters[1] = new nlobjSearchFilter( 'entity', null, 'is', entity );
	
	//filters[1] = new nlobjSearchFilter( 'externalid', null, 'is', externalid );
	//filters[2] = new nlobjSearchFilter( 'entity', null, 'is', entity );
	//filters[2] = new nlobjSearchFilter( 'accounttype', null, 'anyof', 'Accounts Payable' );
	
	//var columns = new Array();
	//columns[0] = new nlobjSearchColumn( 'accounttype' );
	
	
	var searchresults = nlapiSearchRecord( 'vendorbill', null, filters);
	//nlapiLogExecution('DEBUG','in vendorBillExists', 'tranid = ' + tranid + ' externalid = ' + externalid + ' searchresults = ' + searchresults);
	
	if (searchresults && searchresults.length > 0)
		{
		nlapiLogExecution('DEBUG','in vendorBillExists found Vendorbill in Netsuite', 'tranid = ' + tranid + ' externalid = ' + externalid + ' searchresults = ' + searchresults[0].getId());
		return searchresults[0].getId();
		}
	else return 'false';	
	

}


function getNetsuitetermid(coupaTerm)
{
var searchresults = nlapiSearchRecord( 'term', null, nlobjSearchFilter( 'name', null, 'is', coupaTerm));

//nlapiLogExecution('DEBUG', 'in getNetsuitetermid after calling Search record', coupaTerm);

//if (searchresults.length !=1)
if(!searchresults)
	{
	nlapiLogExecution('Error', 'Error getting payment terms id', coupaTerm);
	return 'INVALID_PAYMENT_TERM';
	}
//nlapiLogExecution('DEBUG', 'in getNetsuitetermid after calling Search record', searchresults[0].getId());

return searchresults[0].getId();
}

function getNetsuiteAccountId(accountnumber)
{
	var filters = new Array();
	filters[0] = new nlobjSearchFilter( 'number', null, 'is', accountnumber );
	//filters[1] = new nlobjSearchFilter( 'name', null, 'is', accountname );

	var searchresults = nlapiSearchRecord( 'account', null, filters);

	//nlapiLogExecution('DEBUG', 'in getNetsuitetermid after calling Search record', coupaTerm);

	//if (searchresults.length !=1)
	if(!searchresults)
		{
		nlapiLogExecution('Error', 'Error getting Account ID', 'Accountnumber = ' + accountnumber );
		return 'INVALID_ACCOUNT';
		}
	//nlapiLogExecution('DEBUG', 'in getNetsuitetermid after calling Search record', searchresults[0].getId());

	return searchresults[0].getId();
}

function getNetsuiteId(objectinternalid, objectname)
{
	//nlapiLogExecution('DEBUG', 'Before getting id via search', 'internalobjectid = ' + objectinternalid + ' objectname =  ' + objectname);
	
	var searchresults = nlapiSearchRecord( objectinternalid, null, nlobjSearchFilter( 'namenohierarchy', null, 'is', objectname));

	//nlapiLogExecution('DEBUG', 'in getNetsuitetermid after calling Search record', coupaTerm);

//	if (searchresults.length !=1)
	if(!searchresults)
		{
		nlapiLogExecution('Error', 'Error getting ID for', 'internalobjectid = ' + objectinternalid + ' objectname =  ' + objectname);
		return 'INVALID_NAME';
		}
	//nlapiLogExecution('DEBUG', 'in getNetsuitetermid after calling Search record', searchresults[0].getId());

	return searchresults[0].getId();
}




function getAccoutingPeriodNetsuiteId(objectinternalid, objectname)
{
	
	
	var searchresults = nlapiSearchRecord( objectinternalid, null, nlobjSearchFilter( 'periodname', null, 'is', objectname));

	
	if(!searchresults)
		{
		nlapiLogExecution('DEBUG', 'Error getting ID for', 'internalobjectid = ' + objectinternalid + ' objectname =  ' + objectname);
		return 'INVALID_PERIOD_NAME';
		}
	

	return searchresults[0].getId();
}

function Setexportedtotrue(id)
{
	var headers = new Array();
    headers['Accept'] = 'text/xml'; 
    headers['X-COUPA-API-KEY'] = nlapiGetContext().getSetting('SCRIPT' , 'custscript_apikey');
    
    var url = nlapiGetContext().getSetting('SCRIPT' , 'custscript_url') + '/api/invoices/' + id;
    var postData = "<?xml version='1.0' encoding='UTF-8'?><invoice-header><exported type='boolean'>true</exported></invoice-header>";
    var response = '';
    var iTimeOutCnt = 0;

    //loop start
    for (var k=0; k<1; k++)
    {
      //try start
      try
      {
        response = nlapiRequestURL(url, postData, headers,'PUT');
      }
       catch (error)
       {
              if ( error instanceof nlobjError )
	        {
                               var errordetails;
                               errorcode  = error.getCode();
                               switch(errorcode)
                               {
                                    case "SSS_REQUEST_TIME_EXCEEDED":
                                    if (iTimeOutCnt > 2)
                                     {
                                    errordetails = "Connection closed because it has exceed the time out period (NetSuite has not received a response after 5 seconds on initial connection or after 45 seconds on the request). tried to establish connection 3 times and still failed. Please contact Technical Support.";
                                         exit = true;
                                         break;
                                     }
                                     else
                                     {
                                    errordetails = "Connection closed because it has exceed the time out period (NetSuite has not received a response after 5 seconds on initial connection or after 45 seconds on the request). retrying to establish a connection.";
                                          iTimeOutCnt = iTimeOutCnt + 1;
                                          k = 0;
                                          break;
                                     }
              	                    default:
	                  	    errordetails = error.getDetails()+ ".";
                                    exit = true;
                                    break;
                               }
    	        nlapiLogExecution('ERROR', 'Processing Error - Unable to set export flag', ' Coupa Invoice Id = ' + id + ' Error code:' + errorcode + 'Error description:' + errordetails);
		nlapiSendEmail(-5,nlapiGetContext().getSetting('SCRIPT', 'custscript_emailaddr_notifications'), 
				nlapiGetContext().getSetting('SCRIPT', 'custscript_acccountname') + ' Invoice Integration:Processing Error - Unable to set export flag', 
				'Unable to set export flag - Coupa Invoice Id = ' + id + ' Error code:' + errorcode + 'Error description:' + errordetails);

               }
       } //catch end

    }//loop end

    if(response.getCode() != '200')
    {
    	nlapiLogExecution('ERROR', 'Processing Error - Unable to set export flag', ' Coupa Invoice Id = ' + id );
		nlapiSendEmail(-5, 
				nlapiGetContext().getSetting('SCRIPT', 'custscript_emailaddr_notifications'), 
				nlapiGetContext().getSetting('SCRIPT', 'custscript_acccountname') + ' Invoice Integration:Processing Error - Unable to set export flag', 
				'Unable to set export flag - Coupa Invoice Id = ' + id);
    }
    
}

function ConvertCoupaDateToNetSuiteDate(CoupaDate)
{
	var nDate = CoupaDate.split('T');
	
	var datesplit = nDate[0].split('-');
	
	var Nyear = datesplit[0];
	
	var Nday = datesplit[2];

	var Nmonth = datesplit[1];

	
	var netDate = Nmonth + '/' + Nday + '/' + Nyear;
	
	return netDate;
}


function netsuitedatetoCoupadate(netsuitedate)
{
	var datesplit = netsuitedate.split("/");
	return datesplit[2]+"-"+datesplit[0]+"-"+datesplit[1]+"T00:00:00-08:00";
}

function getTodaysDate ()
{
	var today = new Date();
	return today.getDate();
}

function getMonthShortName(monthdate)
{
	var monthNames = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun",
	                   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ];
	return monthNames[monthdate];
}

function getNetsuiteCurrency(objectinternalid, objectname)
{
	//nlapiLogExecution('DEBUG', 'Before getting id via search', 'internalobjectid = ' + objectinternalid + ' objectname =  ' + objectname);
	
	var searchresults = nlapiSearchRecord( objectinternalid, null, nlobjSearchFilter( 'symbol', null, 'is', objectname));

	//nlapiLogExecution('DEBUG', 'in getNetsuitetermid after calling Search record', coupaTerm);

//	if (searchresults.length !=1)
	if(!searchresults)
		{
		nlapiLogExecution('Error', 'Error getting ID for', 'internalobjectid = ' + objectinternalid + ' objectname =  ' + objectname);
		return 'INVALID_NAME';
		}
	//nlapiLogExecution('DEBUG', 'in getNetsuitetermid after calling Search record', searchresults[0].getId());

	return searchresults[0].getId();
}

function getTaxId(taxcode)
{
	var searchresults = nlapiSearchRecord(null, 'customsearch_taxitemidsearch', nlobjSearchFilter( 'name', null, 'anyof', taxcode), null);

    nlapiLogExecution('DEBUG', 'After calling nlapiSearchrecord');

	if(!searchresults)
		{
		nlapiLogExecution('Error', 'Error getting ID for taxcode', taxcode);
		return 'INVALID_TAXCODE';
	    }

	else
		{
		nlapiLogExecution('DEBUG', 'After searching to tax ids ', 'TAX ID results = ', searchresults[0]);
	    nlapiLogExecution('DEBUG', 'After searching to tax ids ', 'TAX ID = ', searchresults[0].getId());
	    }

	return searchresults[0].getId();
}

function getNetsuiteSubsidiary(coupaSubsidiary)
{
	var subshash = {Japan: "6", Singapore: "7", US: "1"};
	return subshash[coupaSubsidiary];
}


function readFormConfig()
{
	var list = nlapiGetContext().getSetting('SCRIPT', 'custscript_vendorbillFormconfig').split(':');

    var vendorbillformhash = new Object();

	for(i = 0; i < list.length; i++)
	{
		var keyvaluelist = list[i].split('-');
		vendorbillformhash[keyvaluelist[0]] = keyvaluelist[1];
	}


}

