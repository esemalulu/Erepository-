/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       07 Dec 2012     rohitjalisatgi
 * 1.10       10 Jan 2014     mohanboopalan    Add Try/Catch, 
 *              set external id as processed for post and     
 *              invoice not found, consolidate email types into   
 *              one email
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function scheduled(type) {
	
	//nlapiLogExecution('DEBUG', 'In script vendor Payment -scheduled');
	
	var context = nlapiGetContext();
        var paramvalues = new Array();
	var fromdate = context.getSetting('SCRIPT' , 'custscript_frompaydate');
	var todate = context.getSetting('SCRIPT' , 'custscript_topaydate');
        var initialNbr = context.getSetting('SCRIPT' , 'custscript_pay_fromrecords');
        var maxNbr = context.getSetting('SCRIPT' , 'custscript_pay_torecords');

        var Message = '';
       
        paramvalues[0] = context.getSetting('SCRIPT' , 'custscript_frompaydate');
        paramvalues[1] = context.getSetting('SCRIPT' , 'custscript_topaydate');
        paramvalues[2] = context.getSetting('SCRIPT' , 'custscript_pay_fromrecords');
        paramvalues[3] = context.getSetting('SCRIPT' , 'custscript_pay_torecords');
	
	// setting the search filters
	
	var filters = new Array();
	filters[0] = new nlobjSearchFilter( 'accounttype', null, 'anyof', 'Bank' );
                  filters[1] = new nlobjSearchFilter('externalidstring',null,'isnot','Processed');
	
	if(fromdate && todate)
		{
		//nlapiLogExecution('DEBUG', 'condition if fromdate && todate', 'from = ' + fromdate + ' to = ' + todate);
		filters[2] = new nlobjSearchFilter( 'trandate', null, 'onOrAfter', fromdate );
		filters[3] = new nlobjSearchFilter( 'trandate', null, 'onorbefore', todate);
		}
	
	if (fromdate && !todate)
		{
		//nlapiLogExecution('DEBUG', 'condition if fromdate && !todate', 'from = ' + fromdate );
		filters[2] = new nlobjSearchFilter( 'trandate', null, 'onOrAfter', fromdate );
		}
	
	if (!fromdate && todate)
		{
		//nlapiLogExecution('DEBUG', 'condition if !fromdate && todate', ' to = ' + todate);
		filters[2] = new nlobjSearchFilter( 'trandate', null, 'onOrAfter', todate );
		}
	
	if (!fromdate && !todate)
		{
		//nlapiLogExecution('DEBUG', 'condition if !fromdate && !todate');
		filters[2] = new nlobjSearchFilter( 'trandate', null, 'onOrAfter', 'daysAgo1' );
		}
	
	 
	// Define search columns
	//var columns = new Array();
	//columns[0] = new nlobjSearchColumn( 'entity' );
	//columns[1] = new nlobjSearchColumn( 'total' );

	// perform search
	var searchresults = nlapiSearchRecord( 'vendorpayment', null, filters);
	if (searchresults)
		{
                 var IsCallOnUsageExceed = false;
                  var IsCallAnotherScript = false;
                 var InvpayMaxRecords = parseInt(searchresults.length);

                  if (InvpayMaxRecords > parseInt(maxNbr)) { IsCallAnotherScript = true;}

	nlapiLogExecution('AUDIT', 'Processing '+ searchresults.length + ' Vendor Payments' );
                   nlapiLogExecution('DEBUG', 'Initial Record No',initialNbr);
                   nlapiLogExecution('DEBUG', 'Max Records #',maxNbr);

	for ( var i = initialNbr; i < Math.min( maxNbr, InvpayMaxRecords); i++)
	{

//try start
    try
    {
  	var record = nlapiLoadRecord(searchresults[i].getRecordType(),
	searchresults[i].getId() );
	//nlapiLogExecution('DEBUG', 'FROM MAIN SEARCH Payment ID =  ', record.getId());
                    // nlapiLogExecution('DEBUG', 'External ID =  ',record.getFieldValue('externalid'));

                   var usageRemaining = context.getRemainingUsage();

                    if ( usageRemaining  > 1000 ) 
                    {
	    var ErrorMessage = PostPaymenttoCoupa(record.getId());
                    }
                    else
                    {
                            nlapiLogExecution('DEBUG', 'Usage Remaining =  ',usageRemaining);
                            initialNbr = i;  
                            IsCallOnUsageExceed = true;
                            IsCallAnotherScript = true;
                            break;
                    }

        if ( ErrorMessage != '' ) { 
                  var addMessage = Message + ErrorMessage;
                  Message = addMessage;
             }

    }
    catch (error)
    {
              if ( error instanceof nlobjError )
	        {
                               var errordetails;
                               errorcode  = error.getCode();
                               switch(errorcode)
                               {
                                    case  "SSS_REQUEST_TIME_EXCEEDED":
                                    errordetails = "Connection closed because it has exceed the time out period (NetSuite has not received a response after 5 seconds on initial connection or after 45 seconds on the request).";
                                    i = i - 1;
                                    if (Message != '') { sendErrorEmail(Message); Message = '';}
                                    break;
 	                 case "SSS_USAGE_LIMIT_EXCEEDED":
                                     if (Message != '') { sendErrorEmail(Message);}
	                  errordetails = "NetSuite Scheduled Suitescript usage limit of 1000 units exceeded. Exiting script and Called another script to execute limited records per script.";
                                    maxNbr= i - 1;  
                                    CallAnotherScript(paramvalues,initialNbr,maxNbr,InvpayMaxRecords);
	                 exit = true;
	                 break;
              	                 default:
                                    if (Message != '') { sendErrorEmail(Message);}
	                 errordetails = error.getDetails()+ ".";
                                    exit = true;
                                    break;
                               }
                      nlapiLogExecution('ERROR', 'Process Error','Error Code = ' + errorcode + ' Error Description = ' + errordetails);
                      nlapiSendEmail(-5,nlapiGetContext().getSetting('SCRIPT', 'custscript_pay_emailaddr_notifications'),nlapiGetContext().getSetting('SCRIPT', 'custscript_pay_acccountname') + ' Invoice Payment Integration:Processing Error - Exception',
				     'Error Code = ' + errorcode + ' Error Description = ' + errordetails);
                }
     } 
//catch end
		         }

                                      if (Message != '') { 
                                         sendErrorEmail(Message);
                                         Message = '';
                                         //nlapiLogExecution('DEBUG','Consolidate Messages',Message);

                                       }

                                      if (IsCallAnotherScript)
                                       {
                                             if (!IsCallOnUsageExceed) {initialNbr = maxNbr};  
                                              CallAnotherScript(paramvalues,initialNbr,maxNbr,InvpayMaxRecords);
                                        }


                     	}
	else
		nlapiLogExecution('AUDIT', 'Zero Vendor Payments to export' );
	
}

function PostPaymenttoCoupa(id)
{

	//nlapiLogExecution('DEBUG', 'vendor Payment ID ', id);
                  var Message = "";
	var recd = nlapiLoadRecord('vendorpayment', id);
	var supplier = nlapiLoadRecord('vendor',recd.getFieldValue('entity'));
	var supplierName = getCoupaSupplierName(recd.getFieldValue('entity'));
	var headerPaymentdate = netsuitedatetoCoupadate(recd.getFieldValue('trandate'));
	var tranid = recd.getFieldValue('tranid');
                   var SetToProcessed = false;
	
	
	// set up headers
	var headers = new Array();
	headers['Accept'] = 'text/xml';
	headers['X-COUPA-API-KEY'] = nlapiGetContext().getSetting('SCRIPT' , 'custscript_payment_apikey'); 
	
	 
	// set up URL
	var baseurl = nlapiGetContext().getSetting('SCRIPT' , 'custscript_payment_url') + "/api/"; 
	var numofapply = recd.getLineItemCount('apply');
	
	//nlapiLogExecution('DEBUG', 'In PostPayment - details', 'ID = ' + id + ' numofapply = ' + numofapply);
	
	for (var i=1; i <= numofapply; i++) 
	{
		
		if(recd.getLineItemValue('apply','apply',i) == 'F')
			continue;
		
		nlapiLogExecution('AUDIT', 'Processing vendor payment', 'Vendor = ' + supplierName 
				+ ' Vendor Payment ID = ' + id
				+ ' Check # = ' + tranid
				+ ' Coupa Invoice num = ' + recd.getLineItemValue('apply','refnum',i) 
				+ ' Payment Amount = ' + recd.getLineItemValue('apply','amount',i)
				+ ' Payment Date = ' + recd.getFieldValue('trandate'));
		
		/*
		var coupaInvoiceId = getCoupaInvoiceId(recd.getLineItemValue('apply','refnum',i), 
				recd.getFieldValue('entity'), 
				tranid, 
				recd.getLineItemValue('apply','amount',i), 
				ConvertCoupaDateToNetSuiteDate(headerPaymentdate) ); */

		var coupaInvoiceId = getCoupaInvoiceId(recd.getLineItemValue('apply','refnum',i), 
				recd.getFieldValue('entity'), 
				tranid, 
				recd.getLineItemValue('apply','amount',i), 
				recd.getFieldValue('trandate'));

                                     // nlapiLogExecution('DEBUG','coupaInvoiceId',coupaInvoiceId);
		
		if (coupaInvoiceId == 'INVALID_COUPAID')
			{
			nlapiLogExecution('ERROR', 'Processing Error with posting payment - could find not Invoice in Coupa', 'Invoice Number = '  + recd.getLineItemValue('apply','refnum',i) + ' supplierName = ' + supplierName + 
					' supplierNumber = ' + recd.getFieldValue('entity') +
					' check# = ' + tranid + 
					' amount paid = '+ recd.getLineItemValue('apply','total',i));

                                
			 /*nlapiSendEmail(-5, 
					nlapiGetContext().getSetting('SCRIPT', 'custscript_pay_emailaddr_notifications'),
					nlapiGetContext().getSetting('SCRIPT', 'custscript_pay_acccountname') + ' Invoice Payment Integration:Processing Error with posting payment - could find not Invoice in Coupa', 
					'Invoice Number = ' + recd.getLineItemValue('apply','refnum',i) + 
					' supplierName = ' + supplierName + 
					' supplierNumber = ' + recd.getFieldValue('entity') +
					' check# = ' + tranid + 
					' amount paid = '+ recd.getLineItemValue('apply','total',i));*/
                       
                              Message = 'Invoice Payment Integration:Processing Error with posting payment - could find not Invoice in Coupa' + '\n' +
				        'Invoice Number = ' + recd.getLineItemValue('apply','refnum',i) + '\n' +  
 	      				' supplierName = ' + supplierName + '\n' +                                              
					' supplierNumber = ' + recd.getFieldValue('entity') + '\n' +  
					' check# = ' + tranid + '\n' +  
					' amount paid = '+ recd.getLineItemValue('apply','total',i) + '\n\n';
                                                              SetToProcessed = false;
			  continue;
                                                        //nlapiLogExecution('DEBUG','Check','Check 1');
			}
		else if (coupaInvoiceId == 'DUPLICATE_PAYMENT')
			{
			//nlapiLogExecution('DEBUG', 'DUPLICATE PAYMENT', ' supplierName = ' + supplierName + ' check# = ' + tranid + ' amount paid = '+ recd.getLineItemValue('apply','total',i) );
			nlapiLogExecution('ERROR', 'Processing Error with posting payment - Duplicate Payment', 'Invoice Number = ' + recd.getLineItemValue('apply','refnum',i) + ' supplierName = ' + supplierName +  ' supplierNumber = ' + recd.getFieldValue('entity') +  ' check# = ' + tranid + ' amount paid = '+ recd.getLineItemValue('apply','total',i));

                        

			/*
			nlapiSendEmail(-5, 
					nlapiGetContext().getSetting('SCRIPT', 'custscript_pay_emailaddr_notifications'), 
					nlapiGetContext().getSetting('SCRIPT', 'custscript_pay_acccountname') + ' Invoice Payment Integration:Processing Error with posting payment - Duplicate payment', 
					'Invoice Number = ' + recd.getLineItemValue('apply','refnum',i) + 
					' supplierName = ' + supplierName + 
					' supplierNumber = ' + recd.getFieldValue('entity') +
					' check# = ' + tranid + 
					' amount paid = '+ recd.getLineItemValue('apply','total',i));*/

                              Message = 'Invoice Payment Integration:Processing Error with posting payment - Duplicate payment' + '\n' +
				        'Invoice Number = ' + recd.getLineItemValue('apply','refnum',i) + '\n' +  
 	      				' supplierName = ' + supplierName + '\n' +                                              
					' supplierNumber = ' + recd.getFieldValue('entity') + '\n' +  
					' check# = ' + tranid + '\n' +  
					' amount paid = '+ recd.getLineItemValue('apply','total',i) + '\n\n';
                                                         //nlapiLogExecution('DEBUG','Check','Check 2');
                                                              SetToProcessed = false;
                                                         continue;
			}
                    else 
                        {
		
                                     //nlapiLogExecution('DEBUG','Check','Check 3');

		var url = baseurl + 'invoices/' + coupaInvoiceId;
		
		var paymentDate = netsuitedatetoCoupadate(recd.getLineItemValue('apply','applydate',i));
		
		var postData = "<?xml version='1.0' encoding='UTF-8'?>" +
	    "<invoice-header>" + 
	  //  "<payment-date type='datetime'>" + headerPaymentdate + "</payment-date>" +
	    "<payments type='array'>" +
	      "<payment>" +
	        "<amount-paid type='decimal' nil='true'>" + recd.getLineItemValue('apply','amount',i) +"</amount-paid>" +
	        "<payment-date type='datetime' nil='true'>" + headerPaymentdate + "</payment-date>" +
	        "<notes>"+tranid+"</notes>" +
	      "</payment>" +
	    "</payments>" +
	    "</invoice-header>";
	    
		//nlapiLogExecution('DEBUG', 'POST DATA', postData);
		
		var response = nlapiRequestURL(url, postData, headers,'PUT');
    	if (response.getCode() != '200')
			{
    		//nlapiLogExecution('DEBUG', 'Error with posting payment', ' response code = ' + response.getCode() + ' supplierName = ' + supplierName + ' Invoice Number = ' + recd.getLineItemValue('apply','refnum',i) + ' check# = ' + tranid);
    		//nlapiLogExecution('DEBUG', 'postData', xmlEncode(postData));
    		nlapiLogExecution('ERROR', 'Processing Error with posting payment ', 'Invoice Number = ' + recd.getLineItemValue('apply','refnum',i)
					+ ' supplierName = ' + supplierName + 
					' check# = ' + tranid + 
					' amount paid = '+ recd.getLineItemValue('apply','total',i) +
					' HTTP Response Code = ' + response.getCode());
			/*nlapiSendEmail(-5, 
					 nlapiGetContext().getSetting('SCRIPT', 'custscript_pay_emailaddr_notifications'), 
					 nlapiGetContext().getSetting('SCRIPT', 'custscript_pay_acccountname') + ' Invoice Payment Integration:Processing Error with posting payment', 
					'Invoice Number = ' + recd.getLineItemValue('apply','refnum',i) + 
					' supplierName = ' + supplierName + 
					' check# = ' + tranid + 
					' amount paid = '+ recd.getLineItemValue('apply','total',i) +
					' HTTP Response Code = ' + response.getCode());*/

                              Message = 'Invoice Payment Integration:Processing Error with posting payment' + '\n' +
				        'Invoice Number = ' + recd.getLineItemValue('apply','refnum',i) + '\n' +  
 	      				' supplierName = ' + supplierName + '\n' +                                              
					' supplierNumber = ' + recd.getFieldValue('entity') + '\n' +  
					' check# = ' + tranid + '\n' +  
					' amount paid = '+ recd.getLineItemValue('apply','total',i) + '\n' +
					' HTTP Response Code = ' + response.getCode() + '\n\n';
    		
    		continue;
			}
    	                           else
                                                  {
    		nlapiLogExecution('AUDIT', 'Payment successful', 'Supplier = ' + supplierName 
    				+ ' Check# = ' + tranid 
    				+ ' Amount paid = '+ recd.getLineItemValue('apply','total',i)
    				+ ' Invoice number = ' + recd.getLineItemValue('apply','refnum',i)
    				+ ' Payment date = ' + headerPaymentdate );
    	                        
    	                    var responseXML = nlapiStringToXML( response.getBody() );
    	                     checkPaidFlag(responseXML, coupaInvoiceId, headerPaymentdate);
                                                              SetToProcessed = false;
                                                }  //response if else
                               //nlapiLogExecution('DEBUG','Check','Check 4');
                 } //if statement end

                                                        
                               //nlapiLogExecution('DEBUG','Check','Check 5');
             } //loop statement end

                     if (SetToProcessed)
                       {
                	          //recd.setFieldValue('externalid',"Processed");
                              //nlapiSubmitRecord(recd, { disabletriggers : true, enablesourcing : true } );
                             // nlapiSubmitRecord(recd);
                       }

                              // nlapiLogExecution('DEBUG','Check','Check 6');

   return Message;
}


function checkPaidFlag(responseBody, coupaInvoiceId, headerPaymentdate)
{
	var totalpaid = 0;
	var totalinvoiceamount = 0;
	
	var PaymentsNode = nlapiSelectNode(responseBody, 'invoice-header/payments');
	var paymentnode = new Array();
	paymentnode = nlapiSelectNodes(PaymentsNode, 'payment');
	
	
	for ( var i = 0; i < paymentnode.length; i++)
		{
		if (nlapiSelectValue(paymentnode[i], 'amount-paid'))
		  totalpaid = totalpaid + parseFloat(nlapiSelectValue(paymentnode[i], 'amount-paid'));
		
		}
	//nlapiLogExecution('DEBUG', 'From payment put response Total Paid =', totalpaid);
	
	// Get header chargers
	var headerCharge  = parseFloat(nlapiSelectValue(responseBody, 'invoice-header/shipping-amount')) +
						parseFloat(nlapiSelectValue(responseBody, 'invoice-header/handling-amount')) +
						parseFloat(nlapiSelectValue(responseBody, 'invoice-header/misc-amount'));
	
	if(nlapiSelectValue(responseBody, 'invoice-header/line-level-taxation') == 'false')
		headerCharge = headerCharge + parseFloat(nlapiSelectValue(responseBody, 'invoice-header/tax-amount'));
	
	var InvoiceNode = nlapiSelectNode(responseBody, 'invoice-header/invoice-lines');
	var InvoiceLinenode = new Array();
	InvoiceLinenode = nlapiSelectNodes(InvoiceNode, 'invoice-line');
	for ( var i = 0; i < InvoiceLinenode.length; i++)
		{
		totalinvoiceamount = totalinvoiceamount + parseFloat(nlapiSelectValue(InvoiceLinenode[i], 'total'));
		if ((nlapiSelectValue(InvoiceLinenode[i], 'tax-amount')) && 
			(nlapiSelectValue(responseBody, 'invoice-header/line-level-taxation') == 'true'))
			 totalinvoiceamount = totalinvoiceamount + parseFloat(nlapiSelectValue(InvoiceLinenode[i], 'tax-amount'));
		}
	
	totalinvoiceamount = totalinvoiceamount + headerCharge;
	//nlapiLogExecution('DEBUG', 'From payment put response Total Coupa Invoice Amount =', totalinvoiceamount);
	
	if (totalinvoiceamount && totalpaid) {
		//nlapiLogExecution('DEBUG','In Check Paid Flag ', 'Invoice Amount = ' + totalinvoiceamount + ' Paid amount = ' + totalpaid);
		
		
		if (totalinvoiceamount == totalpaid)
			{
			nlapiLogExecution('DEBUG', 'Setting PAID Flag', 'Invoice Amount = ' + totalinvoiceamount + ' Paid Amount = ' + totalpaid + ' CoupaInvoiceId = ' + coupaInvoiceId );
			setCoupaPaymentFlag(coupaInvoiceId, headerPaymentdate);
			}
	}
	else 
		nlapiLogExecution('DEBUG', 'Not Setting PAID Flag', 'Invoice Amount = ' + totalinvoiceamount + ' Paid Amount = ' + totalpaid + ' CoupaInvoiceId = ' + coupaInvoiceId );
}


function setCoupaPaymentFlag(coupaInvoiceId, headerPaymentdate)
{
	var url = nlapiGetContext().getSetting('SCRIPT' , 'custscript_payment_url') + '/api/invoices/' + coupaInvoiceId;
	var headers = new Array();
	headers['Accept'] = 'text/xml';
	headers['X-COUPA-API-KEY'] = nlapiGetContext().getSetting('SCRIPT' , 'custscript_payment_apikey'); 
	
	var postData = "<?xml version='1.0' encoding='UTF-8'?>" +
    "<invoice-header>" + 
    "<payment-date type='datetime'>" + headerPaymentdate + "</payment-date>" +
    "<paid type='boolean'>true</paid>" +
    "</invoice-header>";
	
	var response = nlapiRequestURL(url, postData, headers,'PUT');
	if (response.getCode() != '200')
		{
		nlapiLogExecution('ERROR', 'Error setting the Paid Flag ', 'Coupa Invoice Id = ' + coupaInvoiceId);
		}
	else 
		nlapiLogExecution('AUDIT', 'Successfully set the Paid Flag ', 'Coupa Invoice Id = ' + coupaInvoiceId);
}

function getCoupaInvoiceId(invoicenum, suppliernumber, tranid, topayamount, topaydate)
{
	var coupaInvoiceId;
	var encoded_invoicenum = encodeURIComponent(invoicenum);
	
	var url = nlapiGetContext().getSetting('SCRIPT' , 'custscript_payment_url') + '/api/invoices?invoice-number=' + encoded_invoicenum + '&&supplier[number]=' + suppliernumber;
	
	var headers = new Array();
	headers['Accept'] = 'text/xml';
	headers['X-COUPA-API-KEY'] = nlapiGetContext().getSetting('SCRIPT' , 'custscript_payment_apikey'); 
	
	var response = nlapiRequestURL(url, null, headers);
	if (response.getCode() != '200')
		{
		nlapiLogExecution('DEBUG', 'Error getting CoupaId', 'response code = ' + response.getCode() + ' url = ' + url + ' APIKey = ' + headers['X-COUPA-API-KEY']);
		return 'INVALID_COUPAID';
		}

	var responseXML = nlapiStringToXML( response.getBody() );
	coupaInvoiceId = nlapiSelectValue(responseXML,'invoice-headers/invoice-header/id');
	
	var PaymentsNode = nlapiSelectNode(responseXML, 'invoice-headers/invoice-header/payments');
	var paymentnode = new Array();
	paymentnode = nlapiSelectNodes(PaymentsNode, 'payment');

	for ( var i = 0; i < paymentnode.length; i++)
		{
		
		if (nlapiSelectValue(paymentnode[i], 'amount-paid') && nlapiSelectValue(paymentnode[i], 'payment-date'))
			{

			var paidamount = parseFloat(nlapiSelectValue(paymentnode[i], 'amount-paid'));
			var checknumber = nlapiSelectValue(paymentnode[i], 'notes');
		/*
			nlapiLogExecution('DEBUG', ' in getCoupaInvoiceID before calling ConvertCoupadatetonetsuite ', 'Invoiceid = ' + coupaInvoiceId + ' paymentnodelength = ' + paymentnode.length + ' i = ' + i + ' date = ' + nlapiSelectValue(paymentnode[i], 'payment-date')); */
	
var paiddate = ConvertCoupaDateToNetSuiteDate(nlapiSelectValue(paymentnode[i], 'payment-date'));
		
 /*nlapiLogExecution('DEBUG', 'Check for duplicate', 'Invoice Check = ' + checknumber + ' Netsuite Tranid = ' + tranid + 	InvoicePaymentamount = ' + paidamount + ' ToPayAmount = ' + parseFloat(topayamount) +
				  ' Invoicedate = ' + paiddate + ' ToPayDate = ' + topaydate); */

       if ((paidamount == parseFloat(topayamount)) && (tranid == checknumber) && (paiddate == topaydate) )                                       
                                                       { return 'DUPLICATE_PAYMENT'; }
		        }
		}
	nlapiLogExecution('DEBUG', 'Coupa Invoice Id', coupaInvoiceId);
	return coupaInvoiceId;
}


function getCoupaSupplierName(netsuiteid)
{
	var supplier = nlapiLoadRecord('vendor',netsuiteid);
	return supplier.getFieldValue('companyname');
}

function isValidCoupaSupplierid(netsuiteid)
{
	var supplier = nlapiLoadRecord('vendor',netsuiteid);
	externalid = supplier.getFieldValue('externalid');
	if (externalid && externalid.split("-"))
	 {
		var coupaid = externalid.split("-");
		if (coupaid[0] == "Coupa" && coupaid[1])
			{
			return coupaid[1];
			}
		else return 0;
	 }
	else return 0;
}

function netsuitedatetoCoupadate(netsuitedate)
{
	var datesplit = netsuitedate.split("/");
	return datesplit[2]+"-"+datesplit[0]+"-"+datesplit[1]+"T00:00:00-08:00";
}

function ConvertCoupaDateToNetSuiteDate(CoupaDate)
{
	var nDate = CoupaDate.split('T');
	//nlapiLogExecution('DEBUG', 'date', nDate);
	
	var datesplit = nDate[0].split('-');
	
	var Nyear = datesplit[0];
	//nlapiLogExecution('DEBUG', 'year', Nyear);
	
	var Nday;
	//remove leading zero
	if(datesplit[2].charAt(0) == '0')
		Nday = datesplit[2].slice(1);
	else
		Nday = datesplit[2];
	
	
	//nlapiLogExecution('DEBUG', 'day', Nday);
	//remove leading zero
	var Nmonth;
	if(datesplit[1].charAt(0) == '0')
		Nmonth = datesplit[1].slice(1);
	else
		Nmonth = datesplit[1];
	//nlapiLogExecution('DEBUG', 'month', Nmonth);
	
	var netDate = Nmonth + '/' + Nday + '/' + Nyear;
	//nlapiLogExecution('DEBUG', 'netDate', netDate);
	return netDate;
}


function xmlEncode(string){
    return string.replace(/\&/g, '&' + 'amp;').replace(/</g, '&' + 'lt;').replace(/>/g, '&' + 'gt;').replace(/\'/g, '&' + 'apos;').replace(/\"/g, '&' + 'quot;');
}
function CallAnotherScript(paramvalues,initialNbr,maxNbr,InvPayMaxRecords)
{
               var params = new Array();
               params['custscript_frompaydate'] = paramvalues[0];
               params['custscript_topaydate'] = paramvalues[1];
               params['custscript_pay_fromrecords'] = paramvalues[2];
               params['custscript_pay_torecords'] = paramvalues[3];

               params['custscript_pay_fromrecords'] = parseInt(initialNbr);

               if (parseInt(parseInt(maxNbr) + parseInt(maxNbr)) > InvPayMaxRecords)
               {
                     params['custscript_pay_torecords'] = InvPayMaxRecords;
               } 
               else
               {
                     params['custscript_pay_torecords'] = parseInt(parseInt(maxNbr) + parseInt(maxNbr));
               }

               nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), params);
              
}
function sendErrorEmail(Message)
{

 nlapiSendEmail(-5,nlapiGetContext().getSetting('SCRIPT', 'custscript_pay_emailaddr_notifications'),nlapiGetContext().getSetting('SCRIPT', 'custscript_pay_acccountname') + ' Invoice Payment Integration:Processing Error with posting payment',Message);

}