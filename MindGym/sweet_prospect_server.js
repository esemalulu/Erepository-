/**
 * BeforeLoad hook
 *
 * @param {String} type
 * @param {Object} form
 */
function userevent_beforeLoad(type, form)
{

  nlapiLogExecution('DEBUG', 'Function', 'Start::userevent_beforeLoad');
  
  try {
    var currentContext = nlapiGetContext();
    
    // If record is edited or viewed using the UI and prospect has NOT accepted T&C
    if ((currentContext.getExecutionContext() == 'userinterface') && (type == 'edit' || type == 'view')) 
    {
		
    	if (nlapiGetFieldValue('id')) //Added June 10, 2016 to allow Booking Builder to be accessed from Client Account
    	{
			var selUrl = nlapiResolveURL(
				'SUITELET',
				'customscript_ax_sl_booking_build_config',
				'customdeploy_ax_sl_booking_build_config'
			)+
			'&currency='+nlapiGetFieldValue('currency')+
			'&subsidiary='+nlapiGetFieldValue('subsidiary')+
			'&clientid='+nlapiGetFieldValue('id')+
			'&user='+nlapiGetUser();	
			var onClick0 = "nlOpenWindow('" + selUrl + "', 'custom_EDIT_popup', 'width=1024,height=700,resizable=yes,scrollbars=yes')";
			form.addButton('custpage_clt_oppconfigbtnv','Booking Builder',onClick0); 	
		}
		
				
  	
    	//Ticket 3315 - Request to change label based on Manual override checkbox
    	var subsidiary = nlapiGetFieldValue('subsidiary');
    	
    	if (nlapiGetFieldValue('custentity_clifrm_agreedterms') != 'T')
    	{
    		// Add button to send account opening form
        	var url = nlapiResolveURL('SUITELET', 49, 1, null) + 
        			  '&subsidiary='+subsidiary+
        			  '&manual=F'+
        			  '&prospect_id=' + nlapiGetRecordId();
        	var onClick1 = "nlOpenWindow('" + url + "', 'custom_EDIT_popup', 'width=500,height=400,resizable=yes,scrollbars=yes')";
        	form.addButton('custpage_clifrm_emailtcbtn', 'Email T&C', onClick1);
        	
    	}
    	
    	if (nlapiGetFieldValue('custentity_clifrm_billinginforec') != 'T')
    	{
    		var url2 = nlapiResolveURL('SUITELET', 49, 1, null) + 
			   '&subsidiary='+subsidiary+
			   '&manual=T'+
			   '&prospect_id=' + nlapiGetRecordId();
    		var onClick2 = "nlOpenWindow('" + url2 + "', 'custom_EDIT_popup', 'width=500,height=400,resizable=yes,scrollbars=yes')";
    		form.addButton('custpage_clifrm_emailtcbtn2', 'Email billing info', onClick2);
    	}
    }
    
  } catch (e) {
    if (e instanceof nlobjError) {
      nlapiLogExecution('DEBUG', 'Exception', e.getCode() + '\n' + e.getDetails());
    } else {
      nlapiLogExecution('DEBUG', 'Exception', e.toString());
    }
  }
  
  nlapiLogExecution('DEBUG', 'Function', 'End::userevent_beforeLoad');
}

/**
 * BeforeSubmit hook
 *
 * @param {String} type
 */
function userevent_beforeSubmit(type)
{
  nlapiLogExecution('DEBUG', 'Function', 'Start::userevent_beforeSubmit');
  
  try {
  
    // If T&C have been manually accepted then update the T&C accepted flag.
    var manuallyAgreedTerms = nlapiGetFieldValue('custentity_clifrm_manuallyagreedterms');
    var agreedTerms = nlapiGetFieldValue('custentity_clifrm_agreedterms');
    if ((manuallyAgreedTerms == 'T') && (agreedTerms == 'F')) {
      nlapiSetFieldValue('custentity_clifrm_agreedterms', 'T');
    }
  } catch (e) {
    if (e instanceof nlobjError) {
      nlapiLogExecution('DEBUG', 'Exception', e.getCode() + '\n' + e.getDetails());
    } else {
      nlapiLogExecution('DEBUG', 'Exception', e.toString());
    }
  }
  
  nlapiLogExecution('DEBUG', 'Function', 'End::userevent_beforeSubmit');
}

/**
 * AfterSubmit hook
 *
 * @param {String} type
 */
function userevent_afterSubmit(type)
{
  nlapiLogExecution('DEBUG', 'Function', 'Start::userevent_afterSubmit');
  
  try {

    // If T&C has been accepted, update all existing quotes and sales orders
    // that belongs to this prospect.
    var oldRecord = nlapiGetOldRecord();
    var newRecord = nlapiGetNewRecord();
    var updateTransactions = false;
    
    // Has manually accept T&C changed?
    oldManuallyAgreedTerms = oldRecord.getFieldValue('custentity_clifrm_manuallyagreedterms');
    newManuallyAgreedTerms = newRecord.getFieldValue('custentity_clifrm_manuallyagreedterms');
    if (oldManuallyAgreedTerms  == 'F' && newManuallyAgreedTerms == 'T') {
      nlapiLogExecution('DEBUG', 'Info', 'custentity_clifrm_manuallyagreedterms has changed');
      updateTransactions = true;
    }
    
    // Has terms accepted changed?
    oldAgreedTerms = oldRecord.getFieldValue('custentity_clifrm_agreedterms');
    newAgreedTerms = newRecord.getFieldValue('custentity_clifrm_agreedterms');
    if (oldAgreedTerms == 'F' && newAgreedTerms == 'T') {
      nlapiLogExecution('DEBUG', 'Info', 'custentity_clifrm_agreedterms has changed');
      updateTransactions = true;
    }
    
    if (updateTransactions) {
      var termsDoc = newRecord.getFieldValue('custentity_cli_termsdoc');
      
      // Find all quotes and salesorder that belongs to this entity where
      // terms accpected is false.
      var filters = new Array();
      filters.push(new nlobjSearchFilter('entity', null, 'is', nlapiGetRecordId()));
      filters.push(new nlobjSearchFilter('mainline', null, 'is', 'T'));
      filters.push(new nlobjSearchFilter('type', null, 'anyof', ['Estimate', 'SalesOrd']));
      filters.push(new nlobjSearchFilter('custbody_cli_termsaccepted', null, 'is', 'F'));
      
      var columns = new Array();
      columns.push(new nlobjSearchColumn('internalid'));
      
      // For each result set terms accepted and terms document.
      var searchResults = nlapiSearchRecord('transaction', null, filters, columns);
      if (searchResults) {
        var i = 0; n = searchResults.length;
        nlapiLogExecution('DEBUG', 'Var', 'n=' + n);
        for (; i < n; i++) {
          var transaction = nlapiLoadRecord(searchResults[i].getRecordType(), searchResults[i].getId());
          nlapiLogExecution('DEBUG', 'Var', 'type=' + searchResults[i].getRecordType());
          nlapiLogExecution('DEBUG', 'Var', 'id=' + searchResults[i].getId());
          transaction.setFieldValue('custbody_cli_termsaccepted', 'T');
          transaction.setFieldValue('custbody_cli_termsdoc', termsDoc);
          nlapiSubmitRecord(transaction, false, true);
        }
      }
    }
  } catch (e) {
    if (e instanceof nlobjError) {
      nlapiLogExecution('error', 'Exception', e.getCode() + '\n' + e.getDetails());
    } else {
      nlapiLogExecution('error', 'Exception', e.toString());
    }
  }
  
  nlapiLogExecution('DEBUG', 'Function', 'End::userevent_afterSubmit');
}
