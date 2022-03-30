function beforeLoad(type, form, request) 
{


      if(nlapiGetFieldValue('custentity_ach_ar_contact'))
      {
          var pdfGeneratorUrl = nlapiResolveURL('SUITELET', 'customscript_ach_sl_statement_pdf', 'customdeploy_ach_sl_statement_pdf', 'VIEW');

          form.addButton('custpage_generatePDF', 'Achievers Statement',
                         'window.open(\''+pdfGeneratorUrl+'&custparam_rectype='+nlapiGetRecordType()+'&custparam_clientid='+nlapiGetRecordId()+'\', \'\', \'width=800,height=900,resizable=yes,scrollbars=yes\');return true;');

      }


}




function afterSubmit(type) 
{

	var recordType = nlapiGetFieldValue(customerRecordTypeFieldId());
	var customerDepth = getCustomerDepth();
  
  if(type == 'create')
  {


    try
    {
          if (customerDepth == 1 && recordType == programType() || customerDepth == 2 && recordType == accountType()) 
          {
              var header = getStandardHeader();
              var post = new Array();
              post["internalId"] = nlapiGetRecordId();
              post["customerRecordTypeValueId"] = recordType;

              var parentProgram = nlapiLoadRecord('customer', post['internalId']);
              var trueParentProgram = parentProgram.getFieldValue('parent');
              post['programExternalId'] = nlapiLookupField('customer', trueParentProgram, 'externalid');

              var url = getServer()+"/netsuite/CreateCustomer";
              var response = nlapiRequestURL(url,	post, header);
              handleResponse(response,url,post);
          }
    }
    catch(createCustomer)
    {
      log('ERROR','Error Creating Customer', getErrText(createCustomer));	
    }
  }
  
  
  
  

  if(type == 'edit')
  {


        try
        {
              var recordType = nlapiGetFieldValue(customerRecordTypeFieldId());

              if (recordType == programType() || recordType == accountType()) 
              {

                  var header = getStandardHeader();
                  var post = new Array();
                  post["externalId"] = nlapiLookupField('customer', nlapiGetRecordId(),'externalid');
                  post["internalId"] = nlapiGetRecordId();

                  var parentProgram = nlapiLoadRecord('customer', post["internalId"]);
                  var trueParentProgram = parentProgram.getFieldValue('parent');
                  post['programExternalId'] = nlapiLookupField('customer', trueParentProgram, 'externalid');

                  var url = getServer()+"/netsuite/EditCustomer";
                  var response = nlapiRequestURL(url,	post, header);
                  handleResponse(response,url,post);

              }

              if(nlapiGetFieldValue('custentityrecord_type') == '5') //  5 = Parent
              {
                    var params = {
                      'custscript_126_parent_id':nlapiGetRecordId(),
                      'custscript_126_csm':nlapiGetFieldValue('custentitycs'),											//CSM
                      'custscript_126_billing_analyst':nlapiGetFieldValue('custentity_ach_billinganalyst_list')			//Billing Analyst
                       };
					//This call the scheduled scritpt "scheduledUpdateFor_BA_CSM" which is in this same file found below
                    var queueStatus = nlapiScheduleScript(
                      'customscript_ach_ss_update_customers',
                      null,
                      params
                    );

                    if (queueStatus != 'QUEUED')
                    {
                      var derrsbj = 'Error Queuing Up CSM/BA Sync for '+ nlapiGetRecordId();
                      var derrmsg = 'Failed Queuing Up CSM/BA Sync for '+ nlapiGetRecordId();

                      //nlapiSendEmail(author, recipient, subject, body, cc, bcc, records, attachments, notifySenderOnBounce, internalOnly, replyTo)
                      nlapiSendEmail(29116069, 'elijah.semalulu@achievers.com', derrsbj, derrmsg, null, null, null, null,true);
                    }
                    else
                    {
                      log('error','Queued up for Processing', JSON.stringify(params));
                    }

              }

        }
        catch(editCustomer)
        {
          log('ERROR','Error Editing Customer', getErrText(editCustomer));	
        }

  }




}




function scheduledUpdateFor_BA_CSM() 
{

  	try
	{
          var paramParentId = nlapiGetContext().getSetting('SCRIPT','custscript_126_parent_id');
          var paramCSM = nlapiGetContext().getSetting('SCRIPT','custscript_126_csm');  
          var paramBillingAnalyst = nlapiGetContext().getSetting('SCRIPT','custscript_126_billing_analyst');  

			log('ERROR','Parent', paramParentId);	
			log('ERROR','CSM', paramCSM);	
			log('ERROR','BA', paramBillingAnalyst);	

          var prntFlt = [new nlobjSearchFilter('custentityrecord_type', null, 'anyof', '4'),
                         new nlobjSearchFilter('isinactive', null, 'is', 'F'),
                         new nlobjSearchFilter('parent', null, 'anyof', paramParentId)];

          var prntCol = [new nlobjSearchColumn("internalid")];

          var prntRs = nlapiSearchRecord('customer', null, prntFlt, prntCol);


          for (var a=0; prntRs && a < prntRs.length; a++)
          {
            var custRec = nlapiLoadRecord('customer', prntRs[a].getValue('internalid'));

            custRec.setFieldValue('custentitycs', paramCSM);
            custRec.setFieldValue('custentity_ach_billinganalyst_list', paramBillingAnalyst);

            nlapiSubmitRecord(custRec);

          }

	}
	catch(procerr)
	{
		log('ERROR','Error', getErrText(procerr));	
	}

	log('ERROR','Remaining', nlapiGetContext().getRemainingUsage());

}