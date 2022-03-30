/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.10       28 Apr 2016     Hjammu		   Added comments and email response. Removed redundant lines.
 * 1.00 	  22 Apr 2016     Json
 *
 * Purpose: This script receives a payload in the format below and posts to a Netsuite record. The payload expected is from a customer survey website.   
 */

/**
 * JS - added fieldname element added to expecte payload example.
 * 		always format it for easy reading
 * @param {Object} dataIn Parameter object
 * Expected Payload Example: 
 * {
 *		"recordtype":"customrecord_website_survey",
 *		"fieldname":{
 *			"custrecord_webform_first_name":"John",
 *			"custrecord_webform_last_name":"Doe",
 *			"custrecord_webform_company": "ABC Company",
 *			"custrecord_webform_email":"test@test.com", 
 *			"custrecord_webform_phone":"123-456-7890", 
 *			"custrecord_webform_how_hear":"Hello World!"
 		}
 * }
 * @returns {Object} Output object
 */

//JS - name change to createWebSurveyRecord from createRecord
function createWebSurveyRecord(datain) 
{
    // Return Object	
	var nlobj = {
		'status':true,
		'message':''
	};
	// String of payload object
	var dataReceived = JSON.stringify(datain), 
		// External user to notify via email. Possibly change this to variable going forward if not generic inbox
		// JS - change this to script parameter
		emailSentTo = nlapiGetContext().getSetting('SCRIPT', 'custscript_35_notifsendto'),
		
		// Internal user to send email. User integration account or generic account?
		// For this type of notification, use -5 user
    	emailSentby = '-5'; 
		// Body of email messages
		body = '';
	
	try
	{
		//JS - Add in validation for record type
		if (!datain.recordtype)
		{
			throw nlapiCreateError('WEBSURVEY_ERR','Request missing record type value',true);
		}
		
		//Creating Custom Record
		var record = nlapiCreateRecord(datain.recordtype); 
		
		for (var f in datain.fieldname) 
		{
			var value = datain.fieldname[f];
			//Setting values passed in payload. Expecting record type, first name, last name, company, email, phone number, and text field	 
		    record.setFieldValue(f, value); 
			log('DEBUG', 'Payload Fields',' Fieldname= ' + f + ', value= '+ value );
		}
		
		//Submitting record
		var recordId = nlapiSubmitRecord(record); 
		log('DEBUG','id='+recordId,'Survey Created');
		
		// Success Response
		nlobj.message = 'Success. We will contact you shortly';
		
		// Success Email
		var body = 'Hello,\n\nThe information below has been pass to Netsuite\n ' + dataReceived + '\n This information has been successfully processed.';
		
		nlapiSendEmail(emailSentby, emailSentTo , 'Successful Web Survey', body, null, null, null, null, true);
	}
	catch(createerr)
	{
		// Error Response
		log('error','Error creating',getErrText(createerr));
		nlobj.status = false;
		nlobj.message = 'Unable to complete your request. Please try again later';
		
		// Error Email
		var body = 'Hello,\n\nThe information below has been pass to Netsuite\n ' + dataReceived + '\n This information has caused an error. Please contact your Netsuite Administrator.';
		nlapiSendEmail(emailSentby, emailSentTo , 'Error in Upload', body, null, null, null, null, true);
	}
	
    return nlobj;
}