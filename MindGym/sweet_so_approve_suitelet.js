/**
 * Sales Order Approve Form Suitelet
 *
 * @function jobCancellationForm
 * @param {Object} request
 * @param {Object} response
 */
function soApproveForm(request, response)
{
  try {
  
    // Validate sales order id
    var salesOrderId = request.getParameter('custparamsalesorder');
    if (!salesOrderId) {
      salesOrderId = request.getParameter('salesorder');
    }
    if (!salesOrderId) {
      throw nlapiCreateError('SWEET_SALESORDER_REQD', 'Sales order field is required.', true);
    }
    
    // Load sales order
    //var salesOrder = nlapiLoadRecord('salesorder', salesOrderId);
    
    // Build form
    var form = nlapiCreateForm('Sales Order Approval In Progress', false);
    
    //Look up Fields from SO to display 
    var soflds = ['tranid','custbody_ax_soapprerr','custbody_so_approvedby','custbody_locked'];
    var sovals = nlapiLookupField('salesorder', salesOrderId, soflds, false);
    
    // Text field
    var jobField = form.addField('custpage_text', 'text', '');
    jobField.setDefaultValue('<div style="font-size: 15px"><br/>Sales Order #'+sovals['tranid']+' is in sent for Approval Processing. <br/>'+
    						 'When the process is completed successfully, you will be notified by email and clicking on the Go To Sales Order button will take you to the approved Sales Order<br/><br/></div>');
    jobField.setDisplayType('inline');
    jobField.setLayoutType('outsideabove');
    
    // Has form been submitted?
    if (request.getMethod() == 'POST') {
    	
    	if (request.getParameter('custpage_resetso') == 'T') {
    		//2/2/2015 - If reset is checked, Reset SO fields and submit it.
        	var resetflds = ['orderstatus','custbody_so_approvedby','custbody_locked','custbody_so_approvalinprogress','custbody_show_message','custbody_ax_soapprerr'];
        	var resetvals = ['A','','F','F','F',''];
        	nlapiSubmitField('salesorder', salesOrderId, resetflds, resetvals, false);
    	}
    	
    	// Redirect to job record
    	nlapiSetRedirectURL('RECORD', 'salesorder', salesOrderId);
    }
    
    // Sales Order field
    var salesOrderField = form.addField('salesorder', 'text');
    salesOrderField.setDefaultValue(salesOrderId);
    salesOrderField.setDisplayType('hidden');
    
    //9/2/2015 - Add in Status tab
    form.addFieldGroup('custpage_grpc','Process Status',null);
    var procStatusFld = form.addField('custpage_procstatus','inlinehtml','',null,'custpage_grpc');
    procStatusFld.setDefaultValue('<div style="font-size:14px; color: green; font-weight:bold">'+
    							  '<img src="https://system.netsuite.com/core/media/media.nl?id=914251&c=720154&h=af32d0af3e5f61c51388" border="0"/>'+
    							  '&nbsp; Processing...'+
    							  '</div>'
     							 );
    
    //It's Deemed Completed IF sovals['custbody_locked'] == 'F' and soapprerror is empty
    if (!sovals['custbody_ax_soapprerr'] && sovals['custbody_locked']!='T') {
    	procStatusFld.setDefaultValue('<div style="font-size:14px; color: green; font-weight:bold">'+
				  					  'Successfully Completed SO Approval Process.'+
				  					  '</div>'
				 					  );
    }
    
    //3/2/2015 - Make errorr above the resett option
    //IF Error was logged during process, show it to user here
    var isRescheduled = false;
    if (sovals['custbody_ax_soapprerr']) {
    	
    	//Sept. 23 2015 - If Error is set but it includes "script has been rescheduled" text, let user know accordingly
    	var procStatusFldValue = 'SO Process FAILED with Errors',
    		fldGroupHeaderValue = 'Error While Processing Sales Order',
    		errMsgDisplayVal = 'Please Reset Sales Order and make adjustments and try again.';
    	
    	if (sovals['custbody_ax_soapprerr'].indexOf('script has been rescheduled') > -1)
    	{
    		//Only set isRescheduled to true if it contains rescheduled text on the error
    		isRescheduled = true;
    		procStatusFldValue = 'SO Process RESCHEDULED due to large items';
    		fldGroupHeaderValue = 'Processing Sales Order';
    		errMsgDisplayVal = 'Please WAIT for processing to complete';
    	}
    	
    	form.addFieldGroup('custpage_grpb',fldGroupHeaderValue,null);
    	var errmsgfld = form.addField('custpage_errmsg','inlinehtml','Approval Process', null, 'custpage_grpb');
    	errmsgfld.setBreakType('startcol');
    	errmsgfld.setDefaultValue('<div style="font-size: 12px; font-weight:bold">'+sovals['custbody_ax_soapprerr']+
    			   				  '<br/><br/></div>'+
    			   				  '<div style="font-size: 13px;"><b>'+errMsgDisplayVal+'</b></div>');
    	
    	//IF there is an ERROR SHOW Status as error
    	procStatusFld.setDefaultValue(
    		'<div style="font-size:14px; color: red; font-weight:bold">'+
    		procStatusFldValue+
			'</div>'
    	);
    }
    

    //2/2/2015 - Add in Reset button
    form.addFieldGroup('custpage_grpa','Reset Option', null);
    
    var resetoptfld = form.addField('custpage_resetso', 'checkbox', 'Unlock Sales Order', null, 'custpage_grpa');
    resetoptfld.setBreakType('startcol');
    resetoptfld.setDisplayType('disabled');
    resetoptfld.setMandatory(true);
    if ( (sovals['custbody_ax_soapprerr'] && !isRescheduled) || nlapiGetContext().getRole()=='3') {
    	resetoptfld.setDisplayType('normal');
    }
    
    var resethelpfld = form.addField('custpage_resethelp','inlinehtml', '',null,'custpage_grpa');
    resethelpfld.setDefaultValue('<div style="font-size: 13px">Sales Order is Locked and Will not approve when certain fields are missing or entered incorrectly. To correct this:'+
    							 '<ol>'+
    							 '<li>Review error message above</li>'+
    							 '<li>Check the box above and click Reset Sales Order Button (Blue)</li>'+
    							 '<li>You will be taken back to the Sales Order. Please ensure the owner is correct and booking items are active</li>'+
    							 '<li>Save adjusted Sales Order and Re-Approve</li>'+
    							 '</ol>'+
    							 '<br/>Few points to note:'+
    							 '<ul>'+
    							 '<li>If you do not check the Unlock Sales Order checkbox and click the Blue button, NOTHING will happen.</li>'+
    							 '<li>Checking unlock sales order and clicking the blue button resets following fields: Status, Approved By, Locked, Approval In Progress and Show Message fields.</li>'+
    							 '<li>Status will be set back to <i>"Pending Approval"</i></li>'+
    							 '<li>No Duplicate booking will be created when re-approved</li>'+
    							 '</ul>'+
    							 '<br/>If you are unable to check "Unlock Sales Order" checkbox:'+
    							 '<ul>'+
    							 '<li>Script is still running in the back ground. You must wait until script completes before you can unlock the sales order.</li>'+
    							 '<li>Page did not full load and JavaScript error may have occured. Please try Refreshing the window</li>'+
    							 '</ul></div>');
   
    
    //Hidden Client JavaScript field to send back to Sales Order
    var jsfld = form.addField('custpage_jsfld','inlinehtml','',null,'custpage_grpa');
    jsfld.setDefaultValue('<script language="JavaScript">'+
    					  'function gotoSalesOrder() {'+
    					  'window.location.href="'+nlapiResolveURL('RECORD', 'salesorder', salesOrderId, 'VIEW')+'";'+
    					  '}'+
    					  '</script>');
    
    // Buttons
    form.addSubmitButton('Reset Sales Order');
    
    form.addButton('custpage_refresh', 'Go To Sales Order', 'gotoSalesOrder');
    response.writePage(form);
  } catch (e) {
    if (e instanceof nlobjError) {
      throw nlapiCreateError('SWEET_SCRIPT_EXCEPTION', 'Error: ' + e.getCode() + '\n' + e.getDetails());
    }
    throw nlapiCreateError('SWEET_SCRIPT_EXCEPTION', 'Error: ' + e.toString());
  }
}
