/*
 * This script is deployed to ALL Customer, Lead, Prospect records.
 * 
 * 
 * MB: 5/7/15 - Added automation of Onboarding In Progress Check box - Change #339 - #5208 - Onboarding check box
 * 		Set Onboarding In Progress to true if Onboarding Specialist is set (from blank)
 * 
 * MB: 9/12/16 - Added Amber Road Denied Party Status button.
 * 		Updated role/user checks to use Check Custom Permissions library.
 * 		Removed superfluous code Errol used to change field display type for debugging.
 * 		Removed Errol's hardcoded ID and changed to netsuite admin
 */

function beforeLoad(type, form){

	var userId = nlapiGetUser();
	var roleId = nlapiGetRole();
	
	if (type == 'view') {
		var customerId = nlapiGetRecordId();
		//var suiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7createlicensefromtemplate', 'customdeployr7createlicensefromtemplate', false);
		//var url = suiteletURL + '&custparam_customer=' + customerId;
		//form.addButton('custpage_create_evallicense', 'Create License', 'popUpWindow(\'' + url + '\', \'500\',\'500\');');
		form.setScript('customscript_r7_createlicensevalidation');
		form.addButton('custpage_screenparty', 'Create License', 'checkWatchdogResult(\''+ customerId + '\', \''+nlapiGetRecordType()+'\');');
                
        form.setScript('customscript_windowopen_cs');
		var contractSuiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7contractautomation_suitele', 'customdeployr7contractautomation_suitele', false);
		contractSuiteletURL = contractSuiteletURL + '&custparam_customer=' + nlapiGetRecordId();
		form.addButton('custpage_createcontracts', 'Contracts', 'popUpWindow(\'' + contractSuiteletURL + '\', \'800\',\'800\');');
                
		// MB: 9/12/16 - Updated role/user checks to use Check Custom Permissions library.
		if(userHasPermission('create_event_button_customer')){
			var eventSuiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7livemeetinglanding_suitele', 'customdeployr7livemeetinglanding_suitele', false);
			eventSuiteletURL = eventSuiteletURL + '&custparam_customer=' + customerId;
			form.addButton('custpage_createevent', 'Create Event', 'replaceWindow(\'' + eventSuiteletURL + '\');');
		}
		var legalFormUrl = nlapiResolveURL('RECORD', 'customrecordr7legalcontracts', null, 'VIEW');
		form.addButton('custpage_createLegalContract', 'Create Legal Contract', 'popUpWindow(\''+ legalFormUrl+'\', \'800\',\'800\');');

         // add migrate files button
        // 2 - Administrator
        // 3 - Rapid7 LLC - Administrator
        // 18 - Rapid7 LLC - Full Access
        // 1070 - R7 Adm Super Awesome Power User
        // 1030 - R7 Administrator -Michael/Caitlin
        // 1118 - R7 Administrator -Michael/Caitlin - read only
        if (roleId == 2 || roleId == 1070 || roleId == 1030 || roleId == 1118 || roleId == 3 || roleId == 18)
        {
            var migrateFilesSuiteletUrl = nlapiResolveURL('SUITELET', 'customscript_r7migratefilessuitelet', 'customdeploy_r7migratefilessuitelet', false);
            migrateFilesSuiteletUrl = migrateFilesSuiteletUrl + '&custparam_customer=' + customerId + '&custparam_subsidiary=' + nlapiGetFieldValue('subsidiary');
            form.addButton('custpage_createcontracts', 'Migrate files', 'popUpWindow(\'' + migrateFilesSuiteletUrl + '\', \'800\',\'800\');');
        
        var migrateMessagesSuiteletUrl = nlapiResolveURL('SUITELET', 'customscript_r7customermigratemessages', 'customdeploy_r7deploymigratemessages', false);
            migrateMessagesSuiteletUrl = migrateMessagesSuiteletUrl + '&custparam_customer=' + customerId + '&custparam_subsidiary=' + nlapiGetFieldValue('subsidiary');
            var params = 'scrollbars=yes,resizable=yes,width=1000,height=500';
            var name = 'name';
            form.addButton('custpage_migratemessages', 'Migrate messages', "window.open('" + migrateMessagesSuiteletUrl + "','"+name+"','"+params+"')");
        //customscript_r7automigratefilescs - R7 Auto migrate files and messages  
        form.setScript('customscript_r7automigratefilescs');
        //Call funtion from client script to migrate all files from current customer to linked customer
        form.addButton('custpage_automatemigratefiles', 'Migrate all files', 'r7_migrate_files();');
        //Call funtion from client script to migrate all messages from current customer to linked customer
        form.addButton('custpage_automatemigratemessages', 'Migrate all messages', 'r7_migrate_all_messages();');
         }
    }

    if (type == 'edit' && userId == 55011) {

        var fldLeadSourceOrig = nlapiGetField('custentityr7leadsourceoriginal');
        fldLeadSourceOrig.setDisplayType('normal');

        var fldLeadSourceOrigDate = nlapiGetField('custentityr7leadsourceoriginaldate');
        fldLeadSourceOrigDate.setDisplayType('normal');

        var fldLeadSourcePrim = nlapiGetField('custentityr7leadsourceprim');
        fldLeadSourcePrim.setDisplayType('normal');

    }
}


function beforeSubmit(type){
	
	if (type != 'delete') {
		try {
			this.type = type;
			this.oldRecord = nlapiGetOldRecord();
			this.updatedFields = nlapiGetNewRecord().getAllFields();
			// MB: 5/7/15 - Added automation of Onboarding In Progress Check box - Change #339 - #5208 - Onboarding check box
			var oldOnboardingSpecialist = '';
			if (oldRecord != null){ // On create oldRecord is null so leave blank.
				oldOnboardingSpecialist = oldRecord.getFieldValue('custentityr7onboardingspecialist');
			}
			var newOnboardingSpecialist = getNewFieldValue('custentityr7onboardingspecialist');
			var newOnboardingInProgress = getNewFieldValue('custentityr7onboardinginprogress');
			
			// Set Onboarding In Progress to true if Onboarding Specialist is set (from blank)
			if (newOnboardingInProgress != 'T'){	
				
				if( (oldOnboardingSpecialist == null || oldOnboardingSpecialist == '') && (newOnboardingSpecialist != null && newOnboardingSpecialist != '')){
					nlapiSetFieldValue('custentityr7onboardinginprogress','T');
				}
			}
			else{
				// Set Onboarding In Progress to false if Onboaridng Specialist set to blank
				if (newOnboardingSpecialist == null || newOnboardingSpecialist == '') {
					nlapiSetFieldValue('custentityr7onboardinginprogress','F');
				}
			}

			//updateSegmentInfo();
			runAutoScrubEmailCopyLogic();
		} 
		catch (err) {
			// MB: 5/15/15 - Changed to email errors to netsuite_admin@rapid7.com
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'Error on Customer_SS_Misc.js', 'User: ' + nlapiGetUser() + '\nError: ' + err + '\nId: ' + nlapiGetRecordId());
		}
		try{
			//set subsidiary if it is empty
			setSubsidiary();
		}
		catch (error)
		{
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'Error durring setting subsidiary in Customer_SS_Misc.js', 'User: ' + nlapiGetUser() + '\nError: ' + error + '\nId: ' + nlapiGetRecordId());
		}
		
	}
}
function setSubsidiary()
{
    if (nlapiGetRecordType() == 'lead' && (type != 'xedit' && type != 'delete'))
    {
        var context = nlapiGetContext();
        var avaTaxLLC = context.getSetting('SCRIPT', 'custscript_r7avataxllc');
        var avaTaxUK = context.getSetting('SCRIPT', 'custscript_r7avataxuk');
        var lineNum = nlapiGetLineItemCount('addressbook');
        var defBillNum = false;
        var curCurrency = nlapiGetFieldValue('currency');
        for (var i = 1; lineNum !== null && i <= lineNum; i++)
        {
            var defBill = nlapiGetLineItemValue('addressbook', 'defaultbilling', i);
            if (defBill !== 'T')
                continue;
            var address = nlapiViewLineItemSubrecord('addressbook', 'addressbookaddress', i);
            if (address.getFieldValue('country') === 'US' || address.getFieldValue('country') == null ||  address.getFieldValue('country') == '')
            {
                nlapiSetFieldValue('subsidiary', 1); //Rapid7 LLC 
                nlapiSetFieldValue('taxitem', avaTaxLLC); // AvaTax
                defBillNum = true;
            }
            else
            {
                nlapiSetFieldValue('subsidiary', 10); // Rapid7 International
                nlapiSetFieldValue('taxitem', avaTaxUK); // UK Avatax
                defBillNum = true;
            }
        }
        if (!defBillNum)
        {
            nlapiSetFieldValue('subsidiary', 1); //Rapid7 LLC
            nlapiSetFieldValue('taxitem', avaTaxLLC);
        }
	if(curCurrency){
        	nlapiSetFieldValue('currency',curCurrency);
	}
    }
}

function afterSubmit(type) {
    if (type != 'delete' && type != 'xedit') {
        updateContactsSubsidiary(nlapiGetRecordId(), nlapiGetFieldValue('subsidiary'));
    }
}

function runAutoScrubEmailCopyLogic(){

	var email = getNewFieldValue('email');
	var emailCopy = getNewFieldValue('custentityr7autoscrubemailcopy');
	
	if (email != null && email != '' && email != emailCopy) {
		nlapiSetFieldValue('custentityr7autoscrubemailcopy', email);
		nlapiSetFieldValue('custentityr7autoscrubcheckfreemail', 'T');
		nlapiLogExecution('DEBUG', 'Set Field custentityr7autoscrubemailcopy to ', email);
	}
}

function getNewFieldValue(fieldId){
	// if the record is direct list edited or mass updated, run the script
	if (type == 'xedit') {
		// loop through the returned fields
		for (var i = 0; i < updatedFields.length; i++) {
			//nlapiLogExecution('DEBUG', 'field', updatedFields[i]);
			if (updatedFields[i] == fieldId) {
				return nlapiGetFieldValue(fieldId);
			}
		}
		return oldRecord.getFieldValue(fieldId);
	}
	else {
		return nlapiGetFieldValue(fieldId);
	}
}
/*
 * This function synchronize lead's subsidiary with contacts' subsidiary
 * Params:
 *  leadId - internal id of lead record
 *  subsidiary - subsidiary id of lead record
 */
function updateContactsSubsidiary(leadId, subsidiary){
    var contacts = getConcats(leadId);
    if(!contacts || contacts.length <= 0){
        return;
    }
    for(var i = 0; i < contacts.length; i++){
        if(contacts[i].subsidiary !== subsidiary){
            nlapiSubmitField('contact', contacts[i].internalid, 'subsidiary', subsidiary);
        }
    }
}
/*
 * Returns array with contacts' internal ids of lead record
 */
function getConcats(leadId) {
    var arrContacts = [];
    var arrSearchResults = nlapiSearchRecord('contact', null, new nlobjSearchFilter('company', null, 'is', leadId), new nlobjSearchColumn('subsidiary'));
    for(var i = 0; arrSearchResults && i < arrSearchResults.length; i++){
        arrContacts.push({
            internalid: arrSearchResults[i].getId(),
            subsidiary: arrSearchResults[i].getValue('subsidiary')
        })
    }
    return arrContacts;
}