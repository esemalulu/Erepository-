//1. User Event Before Load Trigger.
function beforeLoadAction(type, form, request) {
	//Display ONLY on VIEW
	if (type == 'view') {
		//Grab URL to your Suitelet
		var popupSlUrl = nlapiResolveURL('SUITELET','[Suitelet Script ID]','[[Suitelet Script Deployment ID]]', null);
		
		//Add the button WITH client side script to trigger popup window when user clicks it
		form.addButton('custpage_btn_slopen',
					   'Open Suitelet as Popup',
					   'window.open(\''+popupSlUrl+'\', \'\', \'width=800,height=600,resizable=yes,scrollbars=yes\');return true;');
		
	}
}


//2. Create Client Script file to be used by your Suitelet.  This client script is NOT deployed. It's Referenced by your NS Form base Suitlet.
//	If you already have this file, add this file as one. It is NOT defined as one of NS trigger function.
function closePopupAndRefreshParentWindow() {
	//This Refreshes Parent Window
	window.opener.location.reload();
	
	//This Closes THIS popup Window.
	window.close();
}

//Page init function will check to see if one of hidden field value is checked. If so, script will call above closePopupAndRefreshParentWindow() function.
function pageInitOnSl() {
	
	if (nlapiGetFieldValue('custpage_closewindow')=='T') {
		closePopupAndRefreshParentWindow();
	}	
}


//3. Suitelet Function.
function contactSuitelet(request, response) {
    var nsform = nlapiCreateForm( 'Log Multiple Calls', false);
    
    //-----------------------------------------------------------------------------------------------
    //JS: Create a Script file with Step 2 function included.
    nsform.setScript('[Client Script Record ID]');
    
    
    //------------------------------------------------------------------------------------------------
    
    if (request.getMethod() === 'GET') {

    	
            var callSubject = nsform.addField('custpage_callsubject', 'text', 'Call Subject');
            callSubject.setDefaultValue('Business Development Call');

            var callNotes = nsform.addField('custpage_callnotes', 'text', 'Call Notes');
            callNotes.setDefaultValue('Did not connect - left voicemail (LVM)');

            var callType = nsform.addField('custpage_calltype', 'select','Call Type','30');
            var d = new Date();
            var dayOfWeek = d.getDay();  // Sunday = 0, Monday = 1, ..., etc.
            // If Tuesday set the default call type to 'Tuesday Blitz Call' - 7, otherwise set default to 'Business Development' - 14
            dayOfWeek === 2 ? callType.setDefaultValue('7') : callType.setDefaultValue('14');

            var callOutcome = nsform.addField('custpage_calloutcome', 'select', 'Call Outcome', '31');
            callOutcome.setDefaultValue('5');

            var customerID = request.getParameter('custom_customerid');
            var customerHiddenID = nsform.addField('custpage_customer', 'text', 'Customer ID');
            customerHiddenID.setDefaultValue(customerID);
            customerHiddenID.setDisplayType('hidden');

            var filters = [];
            var columns = [];
            filters[0] = new nlobjSearchFilter('company', null, 'anyof', customerID);
            columns[0] = new nlobjSearchColumn('entityid', null, null);
            columns[1] = new nlobjSearchColumn('email', null, null);
            columns[2] = new nlobjSearchColumn('phone', null, null);
            columns[3] = new nlobjSearchColumn('title', null, null);
            columns[4] = new nlobjSearchColumn('internalid', null, null);

            var customerContacts = nlapiSearchRecord('contact', null, filters, columns);
            if (customerContacts !== null && customerContacts.length > 0) {
                    var contactList = nsform.addSubList('custpage_customercontacts', 'list', 'Contact List');
                    contactList.addMarkAllButtons();
                    contactList.addRefreshButton();
                    contactList.addField('custpage_select', 'checkbox', 'Select');
                    contactList.addField('custpage_entityid', 'text', 'Name');
                    contactList.addField('custpage_email', 'email', 'Email');
                    contactList.addField('custpage_phone', 'text', 'Contact Phone');
                    contactList.addField('custpage_jobtitle', 'text', 'Title');
                    contactList.addField('custpage_internalid', 'text', 'Internal ID');

                    var newLine = 1;
                    for (var r = 0; r < customerContacts.length; r++) {
                            contactList.setLineItemValue('custpage_entityid', newLine, customerContacts[r].getValue('entityid'));
                            contactList.setLineItemValue('custpage_email', newLine, customerContacts[r].getValue('email'));
                            contactList.setLineItemValue('custpage_phone', newLine, customerContacts[r].getValue('phone'));
                            contactList.setLineItemValue('custpage_jobtitle', newLine, customerContacts[r].getValue('title'));
                            contactList.setLineItemValue('custpage_internalid', newLine, customerContacts[r].getValue('internalid'));
                            newLine++;
                    }

            }
            nsform.addSubmitButton('Submit');
            //nsform.addButton( 'custpage_submit', 'Log Calls', 'getContactsToCall();');
            var cancelScript = "window.ischanged = false; window.close()";
            nsform.addButton( 'custpage_cancel', 'Cancel', cancelScript);  //'CancelClose();');

            response.writePage(nsform);
    } else {
            var lineCount = request.getLineItemCount('custpage_customercontacts');
            var customerID = request.getParameter('custpage_customer');
            var callSubject = request.getParameter('custpage_callsubject');
            var callNotes = request.getParameter('custpage_callnotes');
            var callType = request.getParameter('custpage_calltype');
            var callOutcome = request.getParameter('custpage_calloutcome');

            for (var i = 1; i <= lineCount; i++) {
                    if (request.getLineItemValue('custpage_customercontacts', 'custpage_select', i) == 'T') {
                            var phoneCallRecord = nlapiCreateRecord('phonecall');
                            var contactID = request.getLineItemValue('custpage_customercontacts', 'custpage_internalid', i);
                            phoneCallRecord.setFieldValue('status', 'COMPLETE');
                            phoneCallRecord.setFieldValue('custeventcalloutcome', callOutcome);
                            phoneCallRecord.setFieldValue('custeventcalltype', callType);
                            phoneCallRecord.setFieldValue('title', callSubject);
                            phoneCallRecord.setFieldValue('message', callNotes);
                            phoneCallRecord.setFieldValue('company', customerID);
                            phoneCallRecord.setFieldValue('contact', contactID);
                            id = nlapiSubmitRecord(phoneCallRecord, true);
                    }
            }
            
            
            //JS--------------------------------------------------------------------------
            //Write out the nsfoorm with hidden field value checked
            //Your page init function will trigger refresh and close.
            var closeFld = nsform.addField('custpage_closewindow','checkbox','');
        	closeFld.setDisplayType('hidden');
        	closeFld.setDefaultValue('T');
        	response.writePage(nsform);
        	
            ///response.writeLine("<html><head><script>window.close();<\/script><\/head><\/html>");
            //var doneForm = nlapiCreateForm( 'Call Logging Complete', false);
            //doneForm.addButton( 'custpage_done', 'Done', 'CancelClose();');
            
    }
}