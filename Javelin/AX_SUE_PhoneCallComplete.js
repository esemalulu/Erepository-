/*
 ***********************************************************************
 *
 * The following javascript code is created by IT-Ration Consulting Inc.,
 * a NetSuite Partner. It is a SuiteFlex component containing custom code
 * intented for NetSuite (www.netsuite.com) and use the SuiteScript API.
 * The code is provided "as is": IT-Ration Consulting shall not be liable
 * for any damages arising out the intended use or if the code is modified
 * after delivery.
 *
 * Company:		ERP Guru inc., www.erpguru.com
 * Author:		ianic.brisson@erpguru.com
 * File:		AX_SUE_PhoneCallComplete.js
 * Date:		April 06th, 2011
 * Description:	WR3579, when a phone call is complete fill the "Last Call Date" custom field of attached customers.
 *
 * Requirements
 * 
 * Custom Field: 	"Last Call Date" custom field on Customer Record (Entitiy Field):
 * 					Label:			Last call date
 * 					ID:				_lastcalldate
 * 					Desc:			Used to synchronise the completed Phone call dates in order to register the last time a customer was called.
 * 					Type:			Date
 * 					Store value:	yes
 * 					Applies to:		Customer
 * 					Display/Subtab:	Main
 * 					Display type:	Normal
 * 					Help:			The last time a completed Phone Call activity was completed for this customer.
 * 
 * Custom Field: 	"Last Call Date" custom field on Opportunity Record (Transaction body Field):
 * 					Label:			Last call date
 * 					ID:				_lastcalldate
 * 					Desc:			Used to synchronise the completed Phone call dates in order to register the last time a call was placed for an opportunity.
 * 					Type:			Date
 * 					Store value:	yes
 * 					Applies to:		Opportunity
 * 					Display/Subtab:	Main
 * 					Display type:	Normal
 * 					Help:			The last time a completed Phone Call activity was completed for this opportunity.
 * 
 * Script:			Type:	UserEvent	
 * 					Event:	AfterSubmit
 * 
 * Deployment:	Record:		Phone Call
 * 				Audience:	All Roles
 * 
 * Test:		- Find an existing customer and take note of its name
 * 				- Activities/Scheduling/Phone Calls/New
 * 				- Create the phone call activity
 * 				- In Related Info subtab (or tab where company to 
 * 				  contact is listed), add the customer noted above and select a contact
 * 				- Save
 * 				- Edit the created Phone Call and change the status to complete
 * 				- Note the value of the Completed Date field
 * 				- Save
 * 				- Lookup the customer noted above and view it
 * 				- Verify that the Last call date field is valued to the
 * 				  Completed Data field noted above
 * 				- Repeat the above procedure under the following conditions:
 * 					- If possible, attach several customers
 * 					- Change the status of the Phone Call to scheduled and try again
 * 					- Once the status is changed to completed and before saving, 
 * 					  erase the Completed Date fiels
 * 					- Try with customers with different status values
 * 					- Try attaching a customer but no contact to the Phone Call
 * 					- Use your imagination!
 * 				- Try with the Customer "Last Call Date" missing
 * 				- Test with the "Completed" link in the list view
 * 				- Test by creating Phone Call activity directly on customer
 * 				- Test by Log Phone Call activity directly on customer
 * 					
 *
 * Reviewed by:
 * Review Date:
 *
 *
 ***********************************************************************/

/*
Added a more functionality to this script.  


*/
var RECORD_CUSTOMER = 'customer';
var RECORD_OPPORTUNITY = 'opportunity';
var FIELD_PHONECALL_COMPLETEDDATE = 'completeddate';
var FIELD_PHONECALL_STATUS = 'status';
var FIELD_PHONECALL_STATUS_VALUE_COMPLETED = 'COMPLETE';
var FIELD_CUSTO_CUSTOMER_COMPLETEDDATE = 'custentity_lastcalldate';
var FIELD_CUSTO_OPPORTUNITY_COMPLETEDDATE = 'custbody_lastcalldate';
var SUBLIST_PHONECALL_CONTACT = 'contact';
var SUBLISTFIELD_PHONECALL_CONTACT_COMPANY = 'company';
var FIELD_PHONECALL_COMPANY = 'company';
var FIELD_PHONECALL_OPPORTUNITY = 'transaction';
var FIELD_CONTACT_PARDOT_DONOTEMAIL = 'custentitypi_do_not_email';
var FIELD_CONTACT_PARDOT_OPTEDOUT = 'custentitypi_opt_out';

function afterSubmit_UpdateCustomer(type){
	var editStatus = false;
	// variable inititalization only if not performing a delete operation
	if (type != 'delete') {
		var phoneCallRecord = nlapiGetNewRecord();
		var newStatus = phoneCallRecord.getFieldValue(FIELD_PHONECALL_STATUS);

		// Getting the contact and the call type to search for incoming calls looged against contacts. Added June 4, 2014 by Robert Gama to SpamLaw Automation
		var phoneCallContact = phoneCallRecord.getFieldValue('contact');
		var phoneCallCallType = phoneCallRecord.getFieldValue('custeventcalltype');
		var phoneCallTypeText = phoneCallRecord.getFieldText('custeventcalltype');
		var phoneCallCompany = phoneCallRecord.getFieldValue('customer');
		log('afterSubmit_UpdateCustomer', 'Contact: ' + phoneCallContact + ', Contact InternalID: ' + phoneCallRecord.getFieldText('contact') + ', Call Type: ' + phoneCallTypeText + ' calltypeID: ' + phoneCallCallType);

		// If there is a contact and the call type is 'incoming'
		if (phoneCallContact != null && phoneCallContact != '' && phoneCallCallType == '5') {
			// nlapiSubmitField(type, id, fields, values, doSourcing)
			var contactPardotOptedOut = nlapiLookupField('contact', phoneCallContact, FIELD_CONTACT_PARDOT_OPTEDOUT);
			var contactPardotDoNotEmail = nlapiLookupField('contact', phoneCallContact, FIELD_CONTACT_PARDOT_DONOTEMAIL);
			// If the contact is not opted out or set to do not email in Pardot then update the can email field on the contact
			if ( contactPardotOptedOut == 'F' &&  contactPardotDoNotEmail == 'F') {
				nlapiSubmitField('contact', phoneCallContact, 'custentity_canemail', 'T', false);
			}
			// Update the last inquiry date on the contact
			nlapiSubmitField('contact', phoneCallContact, 'custentity_lastinquirydate', nlapiDateToString(new Date(), 'date'), false);
		}
		// If there is a company and the call type is incoming
		else if (phoneCallCompany != null && phoneCallCompany != '' && phoneCallCallType == '5') {
			var companyIsIndividual = nlapiLookupField('customer', phoneCallCompany, 'isperson');
			// check to see if the company is an individual, if so check the email status and update can email field
			if (companyIsIndividual == 'T') {
				var companyIndividualPardotOptedOut = nlapiLookupField('customer', phoneCallCompany, FIELD_CONTACT_PARDOT_OPTEDOUT);
				var companyIndividualPardotDoNotEmail = nlapiLookupField('customer', phoneCallCompany, FIELD_CONTACT_PARDOT_DONOTEMAIL);
			
				if ( companyIndividualPardotOptedOut == 'F' &&  companyIndividualPardotDoNotEmail == 'F') {
					nlapiSubmitField('customer', phoneCallCompany, 'custentity_canemail', 'T', false);
				}
			}
			// Update the last inquiry date on the company
			nlapiSubmitField('customer', phoneCallCompany, 'custentity_lastinquirydate', nlapiDateToString(new Date(), 'date'), false);
		}

		log('afterSubmit_UpdateCustomer', 'Entering User Event for Phone Call ID ' + phoneCallRecord.getFieldValue('id'));
	}
	// Verify that the edit operation is performed on the status field and that it's being changed to Complete
	if (type == 'edit') {
		var oldPhoneCallRecord = nlapiGetOldRecord();
		var oldStatus = oldPhoneCallRecord.getFieldValue(FIELD_PHONECALL_STATUS);
		if (newStatus != oldStatus && newStatus == FIELD_PHONECALL_STATUS_VALUE_COMPLETED) {
			// If the field is being changed to complete then we're happy 
			editStatus = true;
		}
	}
	
	// We trigger our function on edits of the status field to complete
	// OR a markcomplete operation
	// OR a creation directly to the complete status
	var completionDate = null;
	var lastCallNotes = '';
	var newCallNotes = '';
	

	if (type == 'markcomplete') {
		//for some reason, markcomplete has an empty value for completeddate, but enddate is ok to take.
		completionDate = phoneCallRecord.getFieldValue('enddate');
		
	} 
	else if (editStatus || (type == 'create' && (newStatus == FIELD_PHONECALL_STATUS_VALUE_COMPLETED))) {
		completionDate = phoneCallRecord.getFieldValue(FIELD_PHONECALL_COMPLETEDDATE);
	}

	// title assigned completeddate custeventcalloutcome contact
	if ((completionDate != null) && (completionDate != '')) {
		// Get the attached customer(s)
		var customerInternalID = phoneCallRecord.getFieldValue(FIELD_PHONECALL_COMPANY);
		
		// If on a customer, only the company field is valued, if on an opportunity, both the company and transaction field are valued
		var phoneCallOpportunityId = phoneCallRecord.getFieldValue(FIELD_PHONECALL_OPPORTUNITY);
		if ((phoneCallOpportunityId != null) && (phoneCallOpportunityId != '')) {
			try {
				lastCallNotes = nlapiLookupField('opportunity', phoneCallOpportunityId, 'custbody_lastcallnotes');
				if (typeof lastCallNotes === 'undefined') {
					lastCallNotes ='';
				}
				else {
					lastCallNotes = '  :::::  ' +  lastCallNotes;
				}

				newCallNotes = phoneCallRecord.getFieldValue('completeddate') + ':  ' + phoneCallRecord.getFieldText('assigned') + ' ['  + phoneCallRecord.getFieldText('contact') + ']';
				newCallNotes = newCallNotes + ' - ' + phoneCallRecord.getFieldValue('title')  + ' - ' + phoneCallRecord.getFieldText('custeventcalloutcome') + ':   ' 
				newCallNotes = newCallNotes + phoneCallRecord.getFieldValue('message');
				
				lastCallNotes = newCallNotes + lastCallNotes ;
				//content = content.replace(/\n|<br\s*\/?>/gi, "\r");
				lastCallNotes = lastCallNotes.replace(/\r?\n|\r/gi,' ');

				nlapiSubmitField(RECORD_OPPORTUNITY, phoneCallOpportunityId, FIELD_CUSTO_OPPORTUNITY_COMPLETEDDATE, completionDate);
				nlapiSubmitField(RECORD_OPPORTUNITY, phoneCallOpportunityId, 'custbody_lastcallnotes', lastCallNotes);
				log( 'afterSubmit_UpdateCustomer', '"Last call date" updated on opportunity record with internal ID ' + phoneCallOpportunityId);
			} catch (err) {
				//The transaction might not be an opportunity, so the above might fail. that's ok, let it fail quietly.
			}
		}
		
		if (customerInternalID != '' && customerInternalID != null) {
			// Copy the date from the Phone Call field to the customer "Last Call Date" custom field
			nlapiSubmitField(RECORD_CUSTOMER, customerInternalID, FIELD_CUSTO_CUSTOMER_COMPLETEDDATE, completionDate);
			log('afterSubmit_UpdateCustomer', '"Last call date" updated on customer record with internal ID ' + customerInternalID);
		}
	} 
	else {
		nlapiLogExecution('ERROR', 'afterSubmit_UpdateCustomer', 'The Phone Call completed date does not exist, it cannot be copied to the Customer "Last Call Date" custom field');
		return;
	}
	
}

function log(title, details) {  // added June 16, 2014
	nlapiLogExecution('DEBUG',title,details);  // added June 16, 2014
}



