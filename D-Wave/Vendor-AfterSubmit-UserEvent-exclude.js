/**
 * Module Description
 * 
 * Version    Date                     Author             Remarks
 * This integration is called when a vendor record is either created or updated in Netsuite 
 * and based on that it creates/updates vendors in Coupa
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit,
 *                      approve, cancel, reject (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF only)
 *                      dropship, specialorder, orderitems (PO only) 
 *                      paybills (vendor payments)
 * @returns {Void}
 */
function userEventAfterSubmit(type){

    nlapiLogExecution('AUDIT','Vendor Integration Script Called ', 'type = ' + type + ' recordid = ' + nlapiGetRecordId() );  
    
    var context = nlapiGetContext();   
    
    var Isinactive = false;

    if (context.getSetting('SCRIPT' , 'custscript_vendor_customfieldincludeonly'))
     {
        nlapiLogExecution('DEBUG' ,'Within INCLUDE in COUPA'); 
        var custfieldincludeonly = context.getSetting('SCRIPT' , 'custscript_vendor_customfieldincludeonly');
        var newrecord = nlapiGetNewRecord();
        var oldrecord = nlapiGetOldRecord();

        if (type == 'create' )
          {
            if ( newrecord.getFieldValue(custfieldincludeonly) == 'F' || newrecord.getFieldValue(custfieldincludeonly) != 'T' )
            {
              nlapiLogExecution('AUDIT' ,'Skipping Vendor creation - - as DO NOT INCLUDE in COUPA set', 'Vendor = ' + newrecord.getFieldValue('entityid') + ' VendorId = ' + nlapiGetRecordId());
              return;
            }
          }

        if (type == 'edit' )
          {
            if ( newrecord.getFieldValue(custfieldincludeonly) == 'F' && oldrecord.getFieldValue(custfieldincludeonly) != 'F' )
               {
                   Isinactive = true;
               }
             if ( newrecord.getFieldValue(custfieldincludeonly) == 'F' && oldrecord.getFieldValue(custfieldincludeonly) == 'F' )
               {
                  nlapiLogExecution('AUDIT' ,'Skipping Vendor update - as DO NOT INCLUDE in COUPA set', 'Vendor = ' + newrecord.getFieldValue('entityid') + ' VendorId = ' + nlapiGetRecordId());
                  return;
               }
          }  
     }

     else if (context.getSetting('SCRIPT' , 'custscript_vendor_customfieldexcludeonly'))
      {
        nlapiLogExecution('DEBUG' ,'Within EXCLUDE FROM COUPA'); 
        var custfieldexcludeonly = context.getSetting('SCRIPT' , 'custscript_vendor_customfieldexcludeonly');
        var newrecord = nlapiGetNewRecord();
        var oldrecord = nlapiGetOldRecord();

        //nlapiLogExecution('DEBUG', 'NewRecord exclude = ' + newrecord.getFieldValue(custfieldexcludeonly) + ' OLDrecord exclude = ' 
                                                         // + oldrecord.getFieldValue(custfieldexcludeonly));

        if (type == 'create' )
          {
            if ( newrecord.getFieldValue(custfieldexcludeonly) == 'T' || newrecord.getFieldValue(custfieldexcludeonly) != 'F' )
            {
              nlapiLogExecution('AUDIT' ,'Skipping Vendor creation - - as EXCLUDE FROM COUPA set', 'Vendor = ' + newrecord.getFieldValue('entityid') + ' VendorId = ' + nlapiGetRecordId());
              return;
            }
          }

        if (type == 'edit' )
          {
            if ( newrecord.getFieldValue(custfieldexcludeonly) == 'T' && oldrecord.getFieldValue(custfieldexcludeonly) == 'F' )
               {
                   Isinactive = true;
               }
             if ( newrecord.getFieldValue(custfieldexcludeonly) == 'T' && oldrecord.getFieldValue(custfieldexcludeonly) == 'T') 
               {
                  nlapiLogExecution('AUDIT' ,'Skipping Vendor update - as EXCLUDE FROM COUPA set', 'Vendor = ' + newrecord.getFieldValue('entityid') + ' VendorId = ' + nlapiGetRecordId());
                  return;
               }
          }  
     }

    var recordid = nlapiGetRecordId();
    var formatno = context.getSetting('SCRIPT' , 'custscript_vendor_phonefaxformat');
    var invoicematchlevel = context.getSetting('SCRIPT' , 'custscript_vendor_invoicematchlevel');
    var shippingterms = context.getSetting('SCRIPT' , 'custscript_vendor_shippingterms');
    var paymentmethod  = context.getSetting('SCRIPT' , 'custscript_vendor_paymentmethod');
    var invoiceemails      = context.getSetting('SCRIPT' , 'custscript_vendor_invoice_emails');
    nlapiLogExecution('DEBUG','Invoiceemail = ', invoiceemails);
    var sendinvoicestoapprov = context.getSetting('SCRIPT' , 'custscript_vendor_sendinvoices_to_approv');
    var allowinvocingfromcsn = context.getSetting('SCRIPT' , 'custscript_vendor_allowinvoicing_frm_csn');

   

    var splitvalue = '-';

    var record = nlapiLoadRecord('vendor', recordid);


    //Setting up Headers 
    
    var headers = new Array();
    headers['Accept'] = 'text/xml';
    headers['X-COUPA-API-KEY'] = nlapiGetContext().getSetting('SCRIPT' , 'custscript_vendor_apikey');

   // nlapiLogExecution('DEBUG','after getting api key');

    var externalid = '';
    var response_status = '';
    var iTimeOutCnt = 0;

    //loop start
    for (var k=0; k<1; k++)
    {

     try {

    var url = nlapiGetContext().getSetting('SCRIPT' , 'custscript_vendor_url') + '/api/suppliers?bulk=1';

   nlapiLogExecution('DEBUG','after getting URL');

    var postData = "<?xml version='1.0' encoding='UTF-8'?>" +
    "<suppliers><supplier>";
    postData = postData + "<name>" + convertCDATA(record.getFieldValue('entityid')) + "</name>";
    var out_status; 


    if (record.getFieldValue('isinactive') == 'T' || Isinactive == true)
      { 
      out_status="inactive"; 
      }
    else 
      { 
      out_status="active"; 
      }

    nlapiLogExecution('DEBUG','after validating active inactive');

    postData = postData + "<status>" + out_status+ "</status>";

    if (record.getFieldText('terms'))
      {
      postData = postData + "<payment-term>" + "<code>" + record.getFieldText('terms') + "</code>" +"</payment-term>";
      }
    
    nlapiLogExecution('DEBUG','after payment terms');
    
    var filters = new Array();
    filters.push(new nlobjSearchFilter('company', null, 'anyof', recordid));
     
    var columns = new Array();
    columns.push(new nlobjSearchColumn('firstname'));
    columns.push(new nlobjSearchColumn('lastname'));
    columns.push(new nlobjSearchColumn('phone'));

    nlapiLogExecution('DEBUG','before primary contact search');
     
    var res = nlapiSearchRecord('contact', 'customsearch_primary_contact', filters, columns);

   nlapiLogExecution('DEBUG','after primary contact search');

    var firstname, lastname;
   
    for (var i = 0; res != null && i < res.length; i++)
    {
      var searchresult = res[i];
      firstname = searchresult.getValue('firstname');
      lastname = searchresult.getValue('lastname');
    }

      
 //nlapiLogExecution('DEBUG','before companyprefereces');
/** once we find out how to enable nonadmin user role to do this
    var phoneformat = nlapiLoadConfiguration('companypreferences').getFieldValue('phoneformat');
    if (phoneformat == '123.456.7890')
      splitvalue = '.';
    if (phoneformat == '123 456 7890')
      splitvalue = ' ';
    if (phoneformat == '123-456-7890')
      splitvalue = '-';

    **/

  //nlapiLogExecution('DEBUG','after companyprefereces');
  //  nlapiLogExecution('DEBUG','phoneformat & splitvalue ', 'phoneformat = ' + phoneformat + ' splitvalue = ' + splitvalue);

    if (formatno == 1) { splitvalue = ' ';}
    if (formatno == 3) { splitvalue = '.';}

    nlapiLogExecution('DEBUG' ,'phoneformat & splitvalue ', 'phoneformat = ' + formatno + ' splitvalue = ' + splitvalue);

    var out_fax, out_fax_area_code, out_fax_number = "";
    if (record.getFieldValue('fax')!= null)
      {
        

        if ( formatno == 1 || formatno ==2 || formatno == 3)
           {
              out_fax = record.getFieldValue('fax').split(splitvalue);
              out_fax_area_code = out_fax[0];
              out_fax_number = out_fax[1];
              if (out_fax[2]!=null)
                 {
                    out_fax_number= out_fax_number.concat(out_fax[2]);
                  }
            }
         else if (formatno == 4)
            {   
              var s2 = (""+record.getFieldValue('fax')).replace(/\D/g, '');
              var m = s2.match(/^(\d{3})(\d{3})(\d{4})$/);
              out_fax_area_code = m[1];
              out_fax_number = m[2] + m[3];
            }    
      }
     
     var out_mobile, out_mobilephone_area_code, out_mobilephone_number  = ""; 
     if (record.getFieldValue('mobilephone')!= null)
      {
          if ( formatno == 1 || formatno ==2 || formatno == 3)
            {
              out_mobile = record.getFieldValue('mobilephone').split(splitvalue);
              out_mobilephone_area_code = out_mobile[0];
              out_mobilephone_number = out_mobile[1];
              if(out_mobile[2] !=null)
                  {out_mobilephone_number.concat(out_mobile[2]);}
            }
          else if (formatno == 4)
            {   
              var s2 = (""+record.getFieldValue('mobilephone')).replace(/\D/g, '');
              var m = s2.match(/^(\d{3})(\d{3})(\d{4})$/);
              out_mobilephone_area_code = m[1];
              out_mobilephone_number = m[2] + m[3];
            }     
      }
     
     var out_phone, out_phone_area_code, out_phone_number = "";
     if (record.getFieldValue('phone')!= null)
        {
            if ( formatno == 1 || formatno ==2 || formatno == 3)
              {

                out_phone = record.getFieldValue('phone').split(splitvalue);
                out_phone_area_code = out_phone[0];
                out_phone_number = out_phone[1];
                if(out_phone[2]!=null)
                {out_phone_number= out_phone_number.concat(out_phone[2]);}
              }

            else if (formatno == 4)
              {   
                var s2 = (""+record.getFieldValue('phone')).replace(/\D/g, '');
                var m = s2.match(/^(\d{3})(\d{3})(\d{4})$/);
                out_phone_area_code = m[1];
                out_phone_number = m[2] + m[3];
              }      
        }

    postData = postData + "<primary-contact>";

    

    if (record.getFieldValue('email'))
    {
       postData = postData + 
                  "<email>" + record.getFieldValue('email') + "</email>";
      // nlapiLogExecution('DEBUG','withn PO email ', 'email = ' +  record.getFieldValue('email'));         
    }
    
    if (firstname && lastname)
      {
      postData = postData +  
      "<name-family>" + lastname + "</name-family>" +
      "<name-given>" + firstname  + "</name-given>" ;
      }

     if (out_fax_area_code && out_fax_number) 
      {
        postData = postData + "<phone-fax>" + 
        "<country-code>1</country-code>" +
        "<area-code>" + out_fax_area_code + "</area-code>" +
        "<number>" + out_fax_number + "</number>" +
      "</phone-fax>";
      }
     
     if (out_mobilephone_area_code &&  out_mobilephone_number)
     {
       postData = postData +  "<phone-mobile>" + 
      "<country-code>1</country-code>" +
      "<area-code>" + out_mobilephone_area_code + "</area-code>" +
      "<number>" + out_mobilephone_number + "</number>" +
    "</phone-mobile>";
     }
      
      if (out_phone_area_code && out_phone_number)
      {
         postData = postData + 
    "<phone-work>" + 
      "<country-code>1</country-code>" +
      "<area-code>" + out_phone_area_code + "</area-code>" +
      "<number>" + out_phone_number + "</number>" +
    "</phone-work>" ;
      }
      postData = postData + "</primary-contact>";

    //nlapiLogExecution('DEBUG','Email and EmailTransactions', 'email = ' +  record.getFieldValue('email') + ' EmailTransactions = ' +  record.getFieldValue('emailtransactions')); 
    var out_pomethod = "prompt";
    if(record.getFieldValue('faxtransactions')!=null && record.getFieldValue('faxtransactions')=='T')
      out_pomethod = "prompt";

    if(record.getFieldValue('printtransactions')!=null && record.getFieldValue('printtransactions')=='T')
      out_pomethod = "prompt";

    if(record.getFieldValue('email')!=null && record.getFieldValue('email').length>0)
      {
      if(record.getFieldValue('emailtransactions')!=null && record.getFieldValue('emailtransactions')=='T')
         out_pomethod = "email";
      }
    
 
    postData = postData + "<po-method>" + out_pomethod + "</po-method>";
    
    if (record.getFieldValue('taxidnum'))
      postData = postData + "<tax-id>" + record.getFieldValue('taxidnum') + "</tax-id>";
    
    if (record.getFieldValue('accountnumber'))
      postData = postData + "<account-number>" + record.getFieldValue('accountnumber') + "</account-number>";
    
    postData = postData + "<number>" + recordid + "</number>";
    
    
    if (context.getSetting('SCRIPT' , 'custscript_vendor_poemailoverride')) 
    {
      if (record.getFieldValue(context.getSetting('SCRIPT' , 'custscript_vendor_poemailoverride')))
      {
        postData = postData + 
                  "<po-email>" + record.getFieldValue(context.getSetting('SCRIPT' , 'custscript_vendor_poemailoverride')) + "</po-email>";
        nlapiLogExecution('DEBUG','withn PO email override', 'email = ' + record.getFieldValue(context.getSetting('SCRIPT' , 'custscript_vendor_poemailoverride')) );          
      }
    }


    else if (record.getFieldValue('email'))
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

      

    // Content Group Mapping
    if (context.getSetting('SCRIPT' , 'custscript_vendor_contentgroup_field'))
      {
       var contentgrpvalue = record.getFieldValue(context.getSetting('SCRIPT' , 'custscript_vendor_contentgroup_field'));
       nlapiLogExecution('DEBUG','content group field values are ', contentgrpvalue);
       if (contentgrpvalue)
        {
         postData = postData + "<content-groups>"; 
         var contentgrplist = null;
         contentgrplist = contentgrpvalue.split(',');
         if (contentgrplist)
            {
            for (i = 0; i < contentgrplist.length; i++)
              {
                nlapiLogExecution('DEBUG','content group list is ', contentgrplist[i]);
                postData = postData + "<content-group>";
                postData = postData + "<name>" + contentgrplist[i] + "</name>";
                postData = postData + "</content-group>";
              }
            }
          else
            {
                nlapiLogExecution('DEBUG','content group list is ', contentgrpvalue);              
                postData = postData + "<content-group>";
                postData = postData + "<name>" + contentgrpvalue + "</name>";
                postData = postData + "</content-group>";
            }
           postData = postData + "</content-groups>"; 
        }
      } 



        // Invoice Matching Level
       
       nlapiLogExecution('DEBUG','Invoice Match Level = ', invoicematchlevel);

       if (invoicematchlevel != null)
          {
            var out_invoicematchlevel = new Array();
            out_invoicematchlevel = invoicematchlevel.split(':');

           // nlapiLogExecution('DEBUG','Invoice Match Level [1] = ', ' invoicematchlevel[1] = ' + out_invoicematchlevel[1]);
           // nlapiLogExecution('DEBUG','Invoice Match Level Value = ', record.getFieldValue(out_invoicematchlevel[1]));

            if ( out_invoicematchlevel[1] != '' && out_invoicematchlevel[1] != null) 
              { 
                postData = postData + "<invoice-matching-level>" + record.getFieldText(out_invoicematchlevel[1]) + "</invoice-matching-level>";
              }
            else
              {
                postData = postData + "<invoice-matching-level>" + out_invoicematchlevel[0]  + "</invoice-matching-level>";
             //   nlapiLogExecution('DEBUG','Invoice Match Level', out_invoicematchlevel[0]);
              }
          }
       else
            postData = postData + "<invoice-matching-level>" + "2-way"  + "</invoice-matching-level>";




    // Shipping Term
       if (shippingterms != null)
       {
            var out_shippingterms = new Array();
            out_shippingterms = shippingterms .split(':');

            if ( out_shippingterms[1] != '' && out_shippingterms[1] != null) 
              { 

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
          if ( out_paymentmethod[1] != ''  &&  out_paymentmethod[1] != null) 
              { 
              postData = postData + "<payment-method>" + record.getFieldText(out_paymentmethod[1]) + "</payment-method>";
               nlapiLogExecution('DEBUG','Payment Method', record.getFieldText(out_paymentmethod[1]));
              }
          else
              {
              postData = postData + "<payment-method>" + out_paymentmethod[0] + "</payment-method>";
              nlapiLogExecution('DEBUG','Payment Method', out_paymentmethod[0]);
              }
        }
      }

    // Invoice Emails
       if ( invoiceemails != null) 
       { 
        var recvalue = record.getFieldValue(invoiceemails);
        nlapiLogExecution('DEBUG','if Invoiceemails not NULL', recvalue);
           if ( recvalue != '' && recvalue != null) 
              {
                  var recvalues = recvalue.split(',');
                   postData = postData + "<invoice-emails>";
                   for (i=0;i<recvalues.length;i++)
                   {
                        postData = postData + "<invoice-email><email>" + recvalues[i] + "</email></invoice-email>";
                        nlapiLogExecution('DEBUG','Invoice email ' + i, ' email = ' + recvalues[i]);
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
                 

                 else if (customfield[3] == 'select')
                       {
                           retValue = record.getFieldValue(customfield[1]);
                           if (customfield[1] == 'subsidiary')
                            {                   
                                     var rec_subsdy = nlapiLoadRecord('subsidiary', retValue);
                                     retValue = rec_subsdy.getFieldValue('name');
                                     nlapiLogExecution('DEBUG','Custofieldtype = Select', 'value = ' + retValue);
                            }

                        }



                 else if (customfield[3] == 'Text' || customfield[3] != 'text'  )
                   {
                      
                      retValue = record.getFieldText(customfield[1]);
                      nlapiLogExecution('DEBUG','Custofieldtype = Text', 'value = ' + retValue);
                   }

                  else if (customfield[3] == 'Value' || customfield[3] != 'value'  )
                   {
                      retValue = record.getFieldValue(customfield[1]);
                      nlapiLogExecution('DEBUG','Custofieldtype = Value', 'value = ' + retValue);
                   } 
                  

                  if ( (retValue == null || retValue == '') && customfield[4] != null && customfield[4] != '' )
                   {
                       retValue  = customfield[4];
                   }

            //     postData = postData + "<" +  customfield[0] + " type='" + customfield[2] + "'>" + retValue + "</" + customfield[0] + ">";
                 postData = postData + "<" +  customfield[0] + ">" + retValue + "</" + customfield[0] + ">";
          
           }
    
    postData = postData + "</supplier></suppliers>";

   //nlapiLogExecution('DEBUG','postData = ', postData);
 

    var response;   
      response = nlapiRequestURL(url, postData, headers);
   

/* objFile = nlapiCreateFile('Request_' + nlapiDateToString(new Date(),'date')  + nlapiDateToString(new Date(),'timeofday') + '.csv', 'CSV',postData);
                      objFile.setFolder(578923);
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

                             record.setFieldValue('externalid', "CoupaSupplier-" + record.getFieldValue('entityid') + "-" + externalid);
                     nlapiSubmitRecord(record);
                                               }
                                               else
                                               {

        nlapiLogExecution('ERROR', 'Error creating/Updating Supplier in Coupa ', 'NetsuiteId = ' + recordid + ' Vendor Name = ' + record.getFieldValue('companyname')  + response.getBody());
        
        nlapiSendEmail(-5,context.getSetting('SCRIPT' , 'custscript_vendor_erroremailnotify'), 
      context.getSetting('SCRIPT' , 'custscript_vendor_accountname') + ' - Error creating/Updating Supplier in Coupa','Netsuite Vendor ID =' + recordid + ' Vendor Name = ' + record.getFieldValue('companyname') + '\n\n' + 'Response Error Below:' + '\n' + response.getBody()) ;

                                                }
 
        }
      else
        {

        nlapiLogExecution('ERROR', 'Error creating/Updating Supplier in Coupa ', 'NetsuiteId = ' + recordid + ' Vendor Name = ' + record.getFieldValue('companyname')  + ' Response Error Code:' + response.getCode());


                                     nlapiSendEmail(-5,context.getSetting('SCRIPT' , 'custscript_vendor_erroremailnotify'), 
      context.getSetting('SCRIPT' , 'custscript_vendor_accountname') + ' - Error creating/Updating Supplier in Coupa','Netsuite Vendor ID =' + recordid + ' Vendor Name = ' + record.getFieldValue('companyname') +  ' Response Error Code:' + response.getCode());
          
        //record.setFieldValue('externalid', 'NULL');
        //nlapiSubmitRecord(record);
        }


/*objFile = nlapiCreateFile('Response_' + nlapiDateToString(new Date(),'date')  + nlapiDateToString(new Date(),'timeofday') + '.csv', 'CSV', response.getBody());
                     objFile.setFolder(578923);
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
      context.getSetting('SCRIPT' , 'custscript_vendor_accountname') + ' - Error creating/Updating Supplier in Coupa','Netsuite Vendor ID =' + recordid + ' Vendor Name = ' + record.getFieldValue('companyname') +  '\n\n' + 'Error Code:' + errorcode  + '\n' + 'Error Message:' + errordetails);

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


