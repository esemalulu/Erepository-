/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       21 Sep 2015     json
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
function caseUeBeforeLoad(type, form, request)
{

	if (nlapiGetContext().getExecutionContext()=='userinterface')
	{
		log('debug','casetype',request.getParameter('casetype'));
		if (request.getParameter('casetype'))
		{
			var caseTypeFld = form.getField('category');
			caseTypeFld.setDefaultValue(request.getParameter('casetype'));
		}
	}
	
}


function caseUeAfterSubmit(type)
{

	if(type == 'create' || type == 'edit' )
	{
			
		if (nlapiGetContext().getExecutionContext()=='userinterface')
		{
			var rec = nlapiLoadRecord(nlapiGetRecordType() ,nlapiGetRecordId());	 
			var initMessage = rec.getFieldValue("incomingmessage");
			rec.setFieldValue('custevent_case_message', initMessage);
			nlapiSubmitRecord(rec);		
		}
	 
	}
	
}


