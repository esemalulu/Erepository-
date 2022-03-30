/**
 * Module Description
 * 
 * Version    Date                   Author           Remarks
 * 1.00       25 Oct 2012     rohitjalisatgi
 * 1.10       26 Dec 2013    mohanboopalan  Add Try/Catch
 * 1.20       03 Jan 2014    mohanboopalan  Include Only Coupa Vendor Logic
 * 1.30       14 Jan 2014    mohanboopalan  Custom Field Logic to include text type mapping
 * 1.40       22 Jan 2014    mohanboopalan  phone fax format (123) 456-7890 added with logic to read
 * 1.50       29 Jan 2014    mohanboopalan  Custom Field Logic to include select type mapping
 * 1.60       29 Jan 2014    mohanboopalan  Custom Field Logic for shipping terms
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function scheduled(type) {
	//nlapiLogExecution('DEBUG', 'In script vendor-scheduled Called' );
	var context = nlapiGetContext();
	var currentid = context.getSetting('SCRIPT' , 'custscript_recordid');

	CreateUpdateCoupaSupplierRecord(currentid);
}

function CreateUpdateCoupaSupplierRecord (recordid){

    var context = nlapiGetContext();
    var formatno = context.getSetting('SCRIPT' , 'custscript_vendor_phonefaxformat');
    var invoicematchlevel = context.getSetting('SCRIPT' , 'custscript_vendor_invoicematchlevel');
    var shippingterms = context.getSetting('SCRIPT' , 'custscript_vendor_shippingterms');
    var paymentmethod  = context.getSetting('SCRIPT' , 'custscript_vendor_paymentmethod');
    var invoiceemails      = context.getSetting('SCRIPT' , 'custscript_vendor_invoice_emails');
    var sendinvoicestoapprov = context.getSetting('SCRIPT' , 'custscript_vendor_sendinvoices_to_approv');
    var allowinvocingfromcsn = context.getSetting('SCRIPT' , 'custscript_vendor_allowinvoicing_frm_csn');
    var setisinactive = context.getSetting('SCRIPT' , 'custscript_vendor_isinactive');

    var splitvalue = '-';

    var record = nlapiLoadRecord('vendor', recordid);

    //Setting up Headers 
    
    var headers = new Array();
    headers['Accept'] = 'text/xml';
    headers['X-COUPA-API-KEY'] = nlapiGetContext().getSetting('SCRIPT' , 'custscript_vendor_apikey');

    var externalid = '';
    var response_status = '';
    var iTimeOutCnt = 0;

    //loop start
    for (var k=0; k<1; k++)
    {

     try {

    var url = nlapiGetContext().getSetting('SCRIPT' , 'custscript_vendor_url') + '/api/suppliers?bulk=1';

    var postData = "<?xml version='1.0' encoding='UTF-8'?>" +
    "<suppliers><supplier>";
    postData = postData + "<name>" + convertCDATA(record.getFieldValue('entityid')) + "</name>";
    var out_status; 


    if (record.getFieldValue('isinactive') == 'T')
    	{ 
    	out_status="inactive"; 
    	}
    else 
    	{ 
    	out_status="active"; 
    	}

     // based on include only logic from user event
    if (setisinactive != null && setisinactive == 'true' && out_status == 'active' )
      {
            out_status="inactive"; 
      }	

    postData = postData + "<status>" + out_status+ "</status>";
    
    if (record.getFieldText('terms'))
    	{
    	postData = postData + "<payment-term>" + "<code>" + record.getFieldText('terms') + "</code>" +"</payment-term>";
    	}
    
    
    var filters = new Array();
    filters.push(new nlobjSearchFilter('company', null, 'anyof', recordid));
     
    var columns = new Array();
    columns.push(new nlobjSearchColumn('firstname'));
    columns.push(new nlobjSearchColumn('lastname'));
    columns.push(new nlobjSearchColumn('phone'));
     
    var res = nlapiSearchRecord('contact', 'customsearch_primary_contact', filters, columns);
    var firstname, lastname;
   
    for (var i = 0; res != null && i < res.length; i++)
    {
    	var searchresult = res[i];
    	firstname = searchresult.getValue('firstname');
    	lastname = searchresult.getValue('lastname');
    }

    if (formatno == 1) { splitvalue = ' ';}
    if (formatno == 3) { splitvalue = '.';}

    var out_fax, out_fax_area_code, out_fax_number = "";
    if (record.getFieldValue('fax')!= null)
 	   	{
                                                      if (formatno != 4)
                                                      {
 	   		 out_fax = record.getFieldValue('fax').split(splitvalue);
 	   		 out_fax_area_code = out_fax[0];
 	   		 out_fax_number = out_fax[1];
 	   		 if (out_fax[2]!=null)
 	   		 {out_fax_number= out_fax_number.concat(out_fax[2]);}
                                                       }
                                                       else
                                                      {
                                                         out_fax = new Array();
                                                         out_fax[0] =  record.getFieldValue('fax').substring(1,3);
                                                         out_fax[1] = record.getFieldValue('fax').substring(5,3);
                                                         out_fax[2] = record.getFieldValue('fax').substring(9,4);
  	   		 out_fax_area_code = out_fax[0];
 	   		 out_fax_number = out_fax[1];
 	   		 if (out_fax[2]!=null)
 	   		 {out_fax_number= out_fax_number.concat(out_fax[2]);}
                                                      }
 	   	}
     
     var out_mobile, out_mobilephone_area_code, out_mobilephone_number  = ""; 
     if (record.getFieldValue('mobilephone')!= null)
     	{
                                  if (formatno != 4)
                                   {
                     	out_mobile = record.getFieldValue('mobilephone').split(splitvalue);
       	                  out_mobilephone_area_code = out_mobile[0];
      	                  out_mobilephone_number = out_mobile[1];
                 	                  if(out_mobile[2] !=null)
                        	{out_mobilephone_number.concat(out_mobile[2]);}
                                    }
                                    else
                                    {
                                      var out_mobile = new Array();
                                    out_mobile[0] = record.getFieldValue('mobilephone').substring(1,3);
                                    out_mobile[1] = record.getFieldValue('mobilephone').substring(5,3);
                                    out_mobile[2] = record.getFieldValue('mobilephone').substring(9,4);
       	                  out_mobilephone_area_code = out_mobile[0];
      	                  out_mobilephone_number = out_mobile[1];
                 	                  if(out_mobile[2] !=null)
                        	{out_mobilephone_number.concat(out_mobile[2]);}
                                    }
     	}
     
     var out_phone, out_phone_area_code, out_phone_number = "";
     if (record.getFieldValue('phone')!= null)
 		{

                                          if (formatno != 4)
                                            {
     		out_phone = record.getFieldValue('phone').split(splitvalue);
     		out_phone_area_code = out_phone[0];
     		out_phone_number = out_phone[1];
     		if(out_phone[2]!=null)
     		{out_phone_number= out_phone_number.concat(out_phone[2]);}
                                            }
                                            else
                                            {
                                      var out_phone = new Array();
     		out_phone[0] = record.getFieldValue('phone').substring(1,3);
     		out_phone[1] = record.getFieldValue('phone').substring(5,3);
     		out_phone[2] = record.getFieldValue('phone').substring(9,4);
     		out_phone_area_code = out_phone[0];
     		out_phone_number = out_phone[1];
     		if(out_phone[2]!=null)
     		{out_phone_number= out_phone_number.concat(out_phone[2]);}

                                            }
 		}
    
    if (firstname && lastname)
    	{
    	postData = postData + "<primary-contact>" +
                  "<email>" + record.getFieldValue('email') + "</email>" + 
    	"<name-family>" + lastname + "</name-family>" +
     	"<name-given>" + firstname  + "</name-given>" +
     	"<phone-fax>" + 
     		"<country-code>1</country-code>" +
     		"<area-code>" + out_fax_area_code + "</area-code>" +
     		"<number>" + out_fax_number + "</number>" +
     	"</phone-fax>" +
     	"<phone-mobile>" + 
 			"<country-code>1</country-code>" +
 			"<area-code>" + out_mobilephone_area_code + "</area-code>" +
 			"<number>" + out_mobilephone_number + "</number>" +
 		"</phone-mobile>" +
 		"<phone-work>" + 
 			"<country-code>1</country-code>" +
 			"<area-code>" + out_phone_area_code + "</area-code>" +
 			"<number>" + out_phone_number + "</number>" +
 		"</phone-work>" +
     "</primary-contact>";
    	}
    
   
    
    
    
    var out_pomethod = "prompt";
    if(record.getFieldValue('faxtransactions')!=null && record.getFieldValue('faxtransactions')=='true')
    	out_pomethod = "prompt";

    if(record.getFieldValue('printtransactions')!=null && record.getFieldValue('printtransactions')=='true')
    	out_pomethod = "prompt";

    if(record.getFieldValue('email')!=null && record.getFieldValue('email').length>0)
    	{
    	if(record.getFieldValue('emailtransactions')!=null && record.getFieldValue('emailtransactions')=='true')
    	   out_pomethod = "email";
    	}
    
 
    postData = postData + "<po-method>" + out_pomethod + "</po-method>";
    
    if (record.getFieldValue('taxidnum'))
    	postData = postData + "<tax-id>" + record.getFieldValue('taxidnum') + "</tax-id>";
    
    if (record.getFieldValue('accountnumber'))
    	postData = postData + "<account-number>" + record.getFieldValue('accountnumber') + "</account-number>";
    
    postData = postData + "<number>" + recordid + "</number>";
    
    if (record.getFieldValue('email'))
    	postData = postData + "<po-email>" + record.getFieldValue('email') + "</po-email>";
    
    
    var out_billaddr1 = record.getFieldValue('billaddr1');
    var out_billaddr2 = record.getFieldValue('billaddr2');
    if (record.getFieldValue('billaddr3')!=null)
    	{
    	out_billaddr2 = out_billaddr2.concat(record.getFieldValue('billaddr3') );
    	}
    if (out_billaddr1 || out_billaddr2)
    	{
                    if (out_billaddr1 == null) { out_billaddr1 = ''};
                    if (out_billaddr2 == null) { out_billaddr2 = ''};
    	postData = postData + "<primary-address>" +
    	"<street1>" + convertCDATA(out_billaddr1) + "</street1>" +
    	"<street2>" + convertCDATA(out_billaddr2) + "</street2>";
    	if (record.getFieldValue('billcity'))
    		postData = postData + "<city>" + record.getFieldValue('billcity') + "</city>";
    	if (record.getFieldValue('billstate'))
    		postData = postData + "<state>" + record.getFieldValue('billstate') + "</state>";
    	if (record.getFieldValue('billzip'))
    		postData = postData + "<postal-code>" + record.getFieldValue('billzip') + "</postal-code>";
    	if (record.getFieldValue('billcountry'))
    		postData = postData + "<country>" + "<code>" + record.getFieldValue('billcountry') + "</code>" + "</country>";
    	postData = postData + "</primary-address>";
    	}

        // Invoice Matching Level
       if (invoicematchlevel != null)
       {
         var out_invoicematchlevel = new Array();
          out_invoicematchlevel = invoicematchlevel.split(':');

        if ( out_invoicematchlevel[1] != '' && out_invoicematchlevel[1] != null) { 
              var recvalue = nlapiLookupField('vendor',recordid, out_invoicematchlevel[1],true);
            // var recvalue = record.getFieldValue(out_invoicematchlevel[1]);
              if ( recvalue != '' && recvalue != null) 
              {
                postData = postData + "<invoice-matching-level>" + recvalue + "</invoice-matching-level>";
              }
              else
              {
                postData = postData + "<invoice-matching-level>" + out_invoicematchlevel[0] + "</invoice-matching-level>";

              }
        }
        else
        {
           postData = postData + "<invoice-matching-level>" + out_invoicematchlevel[0]  + "</invoice-matching-level>";
           nlapiLogExecution('DEBUG','Invoice Match Level', out_invoicematchlevel[0]);
        }
       }

        // Shipping Term
       if (shippingterms != null)
       {
         var out_shippingterms = new Array();
          out_shippingterms = shippingterms .split(':');

        if ( out_shippingterms[1] != '' && out_shippingterms[1] != null) { 

              var recvalue = nlapiLookupField('vendor',recordid, out_shippingterms[1],true);

              if ( recvalue != '' && recvalue != null) 
              {
                postData = postData + "<shipping-term><code>" + recvalue + "</code></shipping-term>";
              }
              else if ( out_shippingterms[0] != '' && out_shippingterms[0] != null )
              {
                postData = postData + "<shipping-term><code>" + out_shippingterms[0] + "</code></shipping-term>";
              }
        }
        else
        {
           postData = postData + "<shipping-terms>" + out_shippingterms[0]  + "</shipping-terms>";
           nlapiLogExecution('DEBUG','Shipping Terms', out_shippingterms[0]);
        }
       }

    // Payment Method
    if (paymentmethod != null)
    {
       var out_paymentmethod=  new Array();
            out_paymentmethod=  paymentmethod.split(':');

       if ( out_paymentmethod != '')
       {
        if ( out_paymentmethod[1] != ''  &&  out_paymentmethod[1] != null) { 
          postData = postData + "<payment-method>" + record.getFieldValue(out_paymentmethod[1]) + "</payment-method>";
        }
        else
        {
           postData = postData + "<payment-method>" + out_paymentmethod[0] + "</payment-method>";
           nlapiLogExecution('DEBUG','Payment Method', out_paymentmethod[0]);
        }
     }

    // Invoice Emails
       if ( invoiceemails != null) { 
        var recvalue = record.getFieldValue(invoiceemails);
           if ( recvalue != '' && recvalue != null) 
              {
                  var recvalues = recvalue.split(',');
                   postData = postData + "<invoice-emails>";
                   for (i=0;i<recvalues.length;i++)
                   {
                        postData = postData + "<invoice-email><email>" + recvalues[i] + "</email></invoice-email>";
                   }
                   postData = postData + "</invoice-emails>";
              }
        }
   
    // Send Invoices to Approval
     if ( sendinvoicestoapprov != null )
     {
        var out_sendinvoicestoapprov= new Array();
        out_sendinvoicestoapprov= sendinvoicestoapprov.split(':');

        if ( out_sendinvoicestoapprov[1] != '' && out_sendinvoicestoapprov[1] != null) { 

          if (record.getFieldValue(out_sendinvoicestoapprov[1]) == 'T' || record.getFieldValue(out_sendinvoicestoapprov[1]) == 'Y' || record.getFieldValue(out_sendinvoicestoapprov[1]) == 'Yes' || record.getFieldValue(out_sendinvoicestoapprov[1]) == 'true' )
            {
                  postData = postData + "<send-invoices-to-approvals>true</send-invoices-to-approvals>";
             }
            else
            {
                  postData = postData + "<send-invoices-to-approvals>false</send-invoices-to-approvals>";
            }
        }
        else
        {
           if ( out_sendinvoicestoapprov[0] == 'T' || out_sendinvoicestoapprov[0] == 'Y' || out_sendinvoicestoapprov[0] == 'Yes' || out_sendinvoicestoapprov[0] == 'true' )
             {
           postData = postData + "<send-invoices-to-approvals>true</send-invoices-to-approvals>";
             }
             else
             {
           postData = postData + "<send-invoices-to-approvals>false</send-invoices-to-approvals>";
             }
           nlapiLogExecution('DEBUG','Send Invoices to Approval',out_sendinvoicestoapprov[0]);
        }
     }



    // Allow Invoicing from CSN
    if (allowinvocingfromcsn != null)
    {
       var out_allowinvocingfromcsn= new Array();
         out_allowinvocingfromcsn = allowinvocingfromcsn.split(':');
        
           if ( out_allowinvocingfromcsn[1] != '' && out_allowinvocingfromcsn[1] != null) { 
     if (record.getFieldValue(out_allowinvocingfromcsn[1]) == 'T' || record.getFieldValue(out_allowinvocingfromcsn[1]) == 'Y' || record.getFieldValue(out_allowinvocingfromcsn[1]) == 'Yes' || record.getFieldValue(out_allowinvocingfromcsn[1]) == 'true' )
            {
          postData = postData + "<allow-inv-from-connect>true</allow-inv-from-connect>";
             }
            else
             {
          postData = postData + "<allow-inv-from-connect>false</allow-inv-from-connect>";
             }
        }
        else
        {
          if ( out_allowinvocingfromcsn[0] == 'T' || out_allowinvocingfromcsn[0] == 'Y' || out_allowinvocingfromcsn[0] == 'Yes' || out_allowinvocingfromcsn[0] == 'true' )
            {
            postData = postData + "<allow-inv-from-connect>true</allow-inv-from-connect>";
            }
            else
            {
            postData = postData + "<allow-inv-from-connect>false</allow-inv-from-connect>";
            }
           nlapiLogExecution('DEBUG','Allow Invoicing from CSN', out_allowinvocingfromcsn[0]);
        }
      }
     }

       for ( var i = 1; i <= context.getSetting('SCRIPT' , 'custscript_vendor_customfieldscount'); i++)
       {
                var customfield = new Array();
                var retValue = '';
                customfield = context.getSetting('SCRIPT' , 'custscript_vendor_customfield' + i).split(':');

                 if (customfield[3] == 'Boolean' && customfield[2] == 'Boolean'  )
                  {
                      if (record.getFieldValue(customfield[1]) == 'T') { retValue = 'true';}
                      if (record.getFieldValue(customfield[1]) == 'F') { retValue = 'false';} 
                   }
                   if (customfield[3] != 'Boolean' && customfield[2] != 'Boolean')
                  {
                      if (customfield[3] == 'select')
                       {
                           retValue = record.getFieldValue(customfield[1]);
                           if (customfield[1] == 'subsidiary')
                            {                   
                                     var rec_subsdy = nlapiLoadRecord('subsidiary', retValue);
                                     retValue = rec_subsdy.getFieldValue('name');
                            }
                        }
                       else
                       {
                           retValue = record.getFieldValue(customfield[1]);
                       }
                   }
                    if ( (retValue == null || retValue == '') && customfield[4] != null && customfield[4] != '' )
                   {
                       retValue  = customfield[4];
                   }

                 postData = postData + "<" +  customfield[0] + " type='" + customfield[2] + "'>" + retValue + "</" + customfield[0] + ">";
          
           }
    
    postData = postData + "</supplier></suppliers>";

   //nlapiLogExecution('DEBUG','postData = ', postData);
 

    var response;   
    	response = nlapiRequestURL(url, postData, headers);
   

/* objFile = nlapiCreateFile('Request_' + nlapiDateToString(new Date(),'date')  + nlapiDateToString(new Date(),'timeofday') + '.csv', 'CSV',postData);
                      objFile.setFolder(15);
                      id = nlapiSubmitFile(objFile);  */

    	if (response.getCode() == '201' || response.getCode() == '200' )
    		{
		var responseXML = nlapiStringToXML(response.getBody());
                                     response_status = nlapiSelectValue(responseXML,'results/result/status');
                                     
                                               if ( response_status == 'SUCCESS') 
                                               {

                                  nlapiLogExecution('AUDIT', 'Successfully created/Updated Supplier in Coupa ', 'Id = ' + recordid + ' Name = ' + record.getFieldValue('companyname'));

    		externalid = nlapiSelectValue(responseXML,'results/result/unique-keys/id');

    	      	             nlapiLogExecution('AUDIT','External Id',externalid);

             		             record.setFieldValue('externalid', "CoupaSupplier-"+ externalid);
     		             nlapiSubmitRecord(record);
                                               }
                                               else
                                               {

    		nlapiLogExecution('ERROR', 'Error creating/Updating Supplier in Coupa ', 'NetsuiteId = ' + recordid + ' Vendor Name = ' + record.getFieldValue('companyname')  + response.getBody());
    		
    		nlapiSendEmail(-5,context.getSetting('SCRIPT' , 'custscript_vendor_erroremailnotify'), 
			context.getSetting('SCRIPT' , 'custscript_vendor_accountname') + ' - Error creating/Updating Supplier in Coupa','Netsuite Vendor ID =' + recordid	+ ' Vendor Name = ' + record.getFieldValue('companyname') + '\n\n' + 'Response Error Below:' + '\n' + response.getBody()) ;

                                                }
 
    		}
    	else
    		{

    		nlapiLogExecution('ERROR', 'Error creating/Updating Supplier in Coupa ', 'NetsuiteId = ' + recordid + ' Vendor Name = ' + record.getFieldValue('companyname')  + ' Response Error Code:' + response.getCode());


                                     nlapiSendEmail(-5,context.getSetting('SCRIPT' , 'custscript_vendor_erroremailnotify'), 
			context.getSetting('SCRIPT' , 'custscript_vendor_accountname') + ' - Error creating/Updating Supplier in Coupa','Netsuite Vendor ID =' + recordid	+ ' Vendor Name = ' + record.getFieldValue('companyname') +  ' Response Error Code:' + response.getCode());
					
    		//record.setFieldValue('externalid', 'NULL');
    		//nlapiSubmitRecord(record);
    		}


/*objFile = nlapiCreateFile('Response_' + nlapiDateToString(new Date(),'date')  + nlapiDateToString(new Date(),'timeofday') + '.csv', 'CSV', response.getBody());
                     objFile.setFolder(15);
                      id = nlapiSubmitFile(objFile); */

             }// try end
        catch(error)
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
   		
                               nlapiLogExecution('ERROR','Process Error',  errorcode + ': ' + errordetails);
                  nlapiSendEmail(-5,context.getSetting('SCRIPT' , 'custscript_vendor_erroremailnotify'), 
			context.getSetting('SCRIPT' , 'custscript_vendor_accountname') + ' - Error creating/Updating Supplier in Coupa','Netsuite Vendor ID =' + recordid	+ ' Vendor Name = ' + record.getFieldValue('companyname') +  '\n\n' + 'Error Code:' + errorcode  + '\n' + 'Error Message:' + errordetails);

	     }
                  } //catch end
   }  //loop end 
}

function executeSearch()
{
	var rec = '';
	var searchresults = nlapiSearchRecord( 'vendor', null, null, null );
	for ( var i = 0; i < Math.min( 500, searchresults.length ); i++)
	{
		var record = nlapiLoadRecord(searchresults[i].getRecordType(),
			searchresults[i].getId() );
		rec = rec + record.getRecordType() ;
		rec = rec + '  -Record ID = '  +  record.getId() + ' Company Name = ' + record.getFieldValue('companyname');
		}
	return rec;   
}


function CoupaCallBack(response) {
	nlapiLogExecution('DEBUG', 'In fucntion CoupaCallBack' );
}

function xmlEncode(string){
    return string.replace(/\&/g, '&' + 'amp;').replace(/</g, '&' + 'lt;').replace(/>/g, '&' + 'gt;').replace(/\'/g, '&' + 'apos;').replace(/\"/g, '&' + 'quot;');
}
function convertCDATA(inputdata)
{
       return  "<![CDATA[" + inputdata +  "]]>" ;
}