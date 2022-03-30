/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       13 May 2016     WORK-rehanlakhani
 *
 */

/**
 * On BeforeRecordLoad then displayButtons function gets executed.
 * The buttons only show up on view of the record. If the user edits the records the buttons will not show up.
 * This function does the following checks:
 * ----------------------------------------
 * 1. Is the field for Existing NS Company field not empty - Disables the create company and contact button.
 * 2. Is the field for Existing NS Contact field not empty - Disables the create contact button.
 * 3. Searches NS for an existing company with the company name, if it has results populates the Existing NS Company field
 * 4. Searches NS for an existing contact with the email address, if it has results populated the Existing NS Contact field
 * 
 * This function does all these checks so that the user doesn't have to an it populates on load of the record.
 * form.addButton - Has a specific function pass in so when the user clicks the button the function will get executed. See below for function logic.
 */

function displayButtons(type, form, request)
{
	if(type == 'view')
	{
		var location;
		var company = nlapiGetFieldText('custrecord40');
		var con = nlapiGetFieldText('custrecord41');
		var leadID = nlapiGetFieldValue('custrecord40');
		var cust    = form.addButton('custpage_createCustomer', 'Create Company and Contact', 'processCustomer()');
		var contact = form.addButton('custpage_createContact', 'Create Contact', 'processContact(' + leadID + ')');
		var opp     = form.addButton('custpage_createOpp', 'Create Opportunity', 'processOpportunity()');
					  form.setScript('customscript_aux_suspect_automation');
		if(company != '') {cust.setDisabled(true);}
		if(con != '') {contact.setDisabled(true);}
		
		try
		{
			
			var record = nlapiLoadRecord('customrecord_lsc_leads', nlapiGetRecordId());
			var companyMap = {};
				companyMap['companyname'] = record.getFieldValue('custrecord9');
			var dupCompany = nlapiSearchDuplicate('customer', companyMap);
				
			if(dupCompany != null)
			{
				nlapiSubmitField('customrecord_lsc_leads', nlapiGetRecordId(), 'custrecord40', dupCompany[0].getId());
			}
			
			if(company != '')
			{
				var contactMap = {};
					contactMap['email'] = record.getFieldValue('custrecord17');
				var dupContact = nlapiSearchDuplicate('contact', contactMap);
				if(dupContact != null)
				{
					nlapiSubmitField('customrecord_lsc_leads', nlapiGetRecordId(), 'custrecord41', dupContact[0].getId());
				}
			}
			
			if(company != '' && contact != '')
			{
				nlapiSubmitField('customrecord_lsc_leads', nlapiGetRecordId(), 'custrecord_aux_suspect_notes', '');
			}
			document.location.reload();
		}
		catch (err)
		{
			var errMsg = handleErrors(err);
			nlapiSubmitField('customrecord_lsc_leads', nlapiGetRecordId(), 'custrecord_aux_suspect_notes', 'ERROR: ' + errMsg);
			nlapiLogExecution('DEBUG','ERROR', errMsg);
		}

	}
}


/**
 * Under the assumption that the company doesn't already exist within NS this function gets triggered on click of the Create Company and Contact button.
 * Before creating the company and contact it checks to make sure that the Location, Sales Rep and Product abbreviation are populated. If they are not populate it will prompt the user to populate it.
 * 
 * Execution Sequence
 * ------------------
 * 1. If conditions are satisfied
 * a. Create a lead record.
 * b. Populate the fields with the values that are returns from the (LEADS) - Custom Record)
 * c. Save the lead record
 * d. Get the record Id of the lead created.
 * e. Calls the function to create the Contact.
 */
function processCustomer()
{
	var record = nlapiLoadRecord('customrecord_lsc_leads', nlapiGetRecordId());
	var locations = record.getFieldValue('custrecord78');
	var salesRep = record.getFieldValue('custrecord62');
	var prodAbbr = record.getFieldValue('custrecord_aux_prod_abbrv');

	if(locations == null || salesRep == null || prodAbbr == null)
	{
		alert('Please enter values for Suspect Location, Assigned To and Product Abbreviation.');
	}
	else
	{	
		try 
		{
			var record = nlapiLoadRecord('customrecord_lsc_leads', nlapiGetRecordId())
			var leadRec = nlapiCreateRecord('lead');
				leadRec.setFieldValue('companyname', record.getFieldValue('custrecord9'));
				leadRec.setFieldValue('phone', record.getFieldValue('custrecord74'));
				leadRec.setFieldValue('custentity4', record.getFieldValue('custrecord34'));
				leadRec.setFieldValue('url', record.getFieldValue('custrecord26'));
				leadRec.setFieldValue('email', record.getFieldValue('custrecord17'));
				leadRec.setFieldValue('custentityswx_acct_id', record.getFieldValue('custrecord32'));
				leadRec.setFieldValue('salesrep', record.getFieldValue('custrecord62'));
				leadRec.setFieldValue('leadsource', record.getFieldValue('custrecord_leads_source_type'));
				leadRec.setFieldValue('custentity_siccodeprimary', record.getFieldValue('custrecord65'));
				leadRec.setFieldValue('entitystatus', '7');
				leadRec.selectNewLineItem('addressbook');
				leadRec.setCurrentLineItemValue('addressbook', 'addr1', record.getFieldValue('custrecord10'));
				leadRec.setCurrentLineItemValue('addressbook', 'city', record.getFieldValue('custrecord12'));
				leadRec.setCurrentLineItemValue('addressbook', 'state', record.getFieldValue('custrecord13'));
				leadRec.setCurrentLineItemValue('addressbook', 'zip', record.getFieldValue('custrecord14'));
				leadRec.setCurrentLineItemValue('addressbook', 'country', 'US');
				leadRec.setCurrentLineItemValue('addressbook', 'defaultshipping', 'T');
				leadRec.setCurrentLineItemValue('addressbook', 'defaultbilling', 'T');
				leadRec.commitLineItem('addressbook');
				leadRec.selectNewLineItem('salesteam');
				leadRec.setCurrentLineItemValue('salesteam', 'employee', record.getFieldValue('custrecord62'));
				leadRec.setCurrentLineItemValue('salesteam', 'salesrole', '-2');
				leadRec.setCurrentLineItemValue('salesteam', 'contribution', '100%');
				leadRec.setCurrentLineItemValue('salesteam', 'isprimary', 'T');
				leadRec.commitLineItem('salesteam');
			var leadID = nlapiSubmitRecord(leadRec, false, true);
				record.setFieldValue('custrecord40', leadID);
			var contactID = processContact(leadID);
			record.setFieldValue('custrecord41', contactID);
			nlapiSubmitRecord(record, false, true);
			location.reload();
			alert('The new company with contact has been successfully created');
		}
		catch (err)
		{
			var errMsg = handleErrors(err);
			alert(errMsg);
		}
	}
	
}

/**
 * This function gets executed twice. Once well called from the processCustomer function and second when the user clicks the create contact button.
 * Checks to see if the Location, Sales Rep and Product abbreviation are populated.
 * Grabs the lead ID from the Existing NS Company field on the (Leads Record - Custom Record).
 * Creates a contact record and associates it to the company that was created.
 * @param leadID
 * @returns
 */
function processContact(leadID)
{
	var record = nlapiLoadRecord('customrecord_lsc_leads', nlapiGetRecordId());
	var locations = record.getFieldValue('custrecord78');
	var salesRep = record.getFieldValue('custrecord62');
	var prodAbbr = record.getFieldValue('custrecord_aux_prod_abbrv');

	if(locations == null || salesRep == null || prodAbbr == null)
	{
		alert('Please enter values for Suspect Location, Assigned To and Product Abbreviation.');
	}
	else
	{
		try
		{
				var contactRec = nlapiCreateRecord('contact');
					contactRec.setFieldValue('firstname', record.getFieldValue('custrecord5'));
					contactRec.setFieldValue('lastname', record.getFieldValue('custrecord6'));
					contactRec.setFieldValue('company', leadID);
					contactRec.setFieldValue('title', record.getFieldValue('custrecord7'));
					contactRec.setFieldValue('email', record.getFieldValue('custrecord17'));
					contactRec.setFieldValue('phone', record.getFieldValue('custrecord16'));
					contactRec.setFieldValue('contactsource', record.getFieldValue('custrecord_leads_source_type'));
					contactRec.setFieldValue('custentityswx_lead_id', record.getFieldValue('custrecord30'));
				var contactID = nlapiSubmitRecord(contactRec, false, true);
					record.setFieldValue('custrecord41', contactID);
					nlapiSubmitRecord(record, false, true);
				location.reload();
				alert('The new contact has been successfully created');
			
		}
		catch (err)
		{
			var errMsg = handleErrors(err);
			alert(errMsg);
		}
	}
	return contactID;
}

/**
 * 
 */
function processOpportunity()
{
		var record = nlapiLoadRecord('customrecord_lsc_leads', nlapiGetRecordId());
		var locations = record.getFieldValue('custrecord78');
		var salesRep = record.getFieldValue('custrecord62');
		var prodAbbr = record.getFieldValue('custrecord_aux_prod_abbrv');
		var company = record.getFieldValue('custrecord40');
		var contact = record.getFieldValue('custrecord41');
		
		if(locations == null || salesRep == null || prodAbbr == null)
		{
			alert('Please enter values for Suspect Location, Assigned To and Product Abbreviation.');
		}
		else
		{
			try
			{
				if(!company)
				{
					var leadID = processCustomer();
					location.reload();
				}
				
				if(!contact)
				{
					record   = nlapiLoadRecord('customrecord_lsc_leads', nlapiGetRecordId());
					var contactID = processContact(leadID);
					location.reload();
				}
				
				var opp = nlapiCreateRecord('opportunity');
				var prodabbr = nlapiLookupField('customrecord_lsc_leads', nlapiGetRecordId(), 'custrecord_aux_prod_abbrv', true);
				var source = record.getFieldValue('custrecord3');
				var title = prodabbr + ' - ' + source;
				if( prodabbr != null)
				{
					opp.setFieldValue('title', title);
				}
				opp.setFieldValue('entity', record.getFieldValue('custrecord40'));
				opp.setFieldValue('leadsource', record.getFieldValue('custrecord_leads_source_type'));
				opp.setFieldValue('location', record.getFieldValue('custrecord78'));
				opp.setFieldValue('entitystatus', '27');
				opp.setFieldValue('memo', record.getFieldValue('custrecord25'));
				opp.setFieldValue('salesrep', record.getFieldValue('custrecord62'));
				opp.setFieldValue('expectedclosedate', nlapiDateToString(new Date(), 'date'));
				opp.setFieldValue('custbody5', nlapiDateToString(new Date(), 'date'));
				opp.setFieldValue('custbody10', record.getFieldValue('custrecord30'));
				opp.setFieldValue('custbodyproduct', record.getFieldValue('custrecord2'));
			var oppID = nlapiSubmitRecord(opp, false, true);
				record.setFieldValue('custrecord_leads_opp', oppID);
				nlapiSubmitRecord(record, false, true);
				location.reload();
				alert('A new opportunity has been created for this lead.');
			}
			catch(err)
			{
				var errMsg = handleErrors(err);
				alert(errMsg);
				
			}
		
		}
}

/**
 * This function was created to generate User Friendly Errors when an error has been received from NS.
 * @param err
 * @returns {String}
 */
function handleErrors(err)
{
	if(err instanceof nlobjError)
	{
		switch(err.getCode())
		{
		case "INVALID_KEY_OR_REF":
			return "A contact with the same email address already exists. It is not associated with this company. Please modify the existing contact record.";
			break;
		case "UNIQUE_CUST_ID_REQD":
			return "A company with that name already exists. Please check your records.";
			break;
		default:
			return err.getCode() + ": " + err.getDetails();
			break;
		}
	}
}

