/**
 * Added in response to Ticket 6857.
 * This customization will include the following:
 * 1. User Event on Event:
 * 	- Adds a button in View mode to allow user to click to create opportunity.
 * 	- After submit to handle user redirection.
 * 
 * 2. User Event on Opportunity: 
 * 	- Before load function to add dynamic fields for this specific purpose
 * 	- After submit to handle syncing created opportunity back to event.
 * 
 * 3. Client script on Opportunity:
 * - to grab and set request level parameter passed in from Event
 * 		- THIS IS NOT NEEDED UNTIL Client wants to default additional values from Event.
 * 		- Company can be defaulted using entity URL level parameter without THIS custom script
 * 
 * Version    Date            Author           Remarks
 * 1.00       04 Dec 2015     json
 *
 */

/******* Event Related Functions *************************/
/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
function eventBeforeLoad(type, form, request)
{
	if (type == 'view' && nlapiGetContext().getExecutionContext()=='userinterface')
	{
		var nsDomain = 'https://system.netsuite.com';
		if (nlapiGetContext().getEnvironment()=='SANDBOX') 
		{
			nsDomain = 'https://system.sandbox.netsuite.com';
		} 
		else if (nlapiGetContext().getEnvironment()=='BETA') 
		{
			nsDomain = 'https://system.na1.beta.netsuite.com';
		}
		
		var oppurl = nlapiResolveURL('RECORD', 'opportunity')+
					 '?eventid='+nlapiGetRecordId()+
					 '&contact='+nlapiGetFieldValue('contact')+					 
					 '&entity='+nlapiGetFieldValue('company');
					 
		var clientSideSct = 'window.location.href = \''+nsDomain+oppurl+'\'';
		
		form.addButton('custpage_oppbtn', 'Create Opportunity', clientSideSct);
	}
}



function eventAfterSubmit(type)
{
	
	if (type == 'edit' || type == 'create'  && nlapiGetContext().getExecutionContext()=='userinterface')
	{
		if(nlapiGetFieldValue('transaction'))
		{
			nlapiSubmitField('opportunity', nlapiGetFieldValue('transaction') , 'custbody_op_norelatedvisit', 'T'); 			
		}
	}
	
	if (type == 'delete'  && nlapiGetContext().getExecutionContext()=='userinterface')
	{
		if(!nlapiGetFieldValue('transaction'))
		{
			nlapiSubmitField('opportunity', nlapiGetFieldValue('transaction') , 'custbody_op_norelatedvisit', 'F'); 			
		}
	}	
		
	
}







/******* Opportunity related  Related Functions *************************/

/**
 * Before Load Option to place dynamic field to capture the Event ID
 */
function oppEventBeforeLoad(type, form, request)
{
	if (type == 'create' && nlapiGetContext().getExecutionContext()=='userinterface')
	{
		var eventIdFld = form.addField('custpage_eventid','text','Event ID');
		eventIdFld.setDisplayType('hidden');
		
		
		if (request.getParameter('eventid'))
		{
			eventIdFld.setDefaultValue(request.getParameter('eventid'));			
			form.setFieldValues({'custbody_buyer':request.getParameter('contact')});
		}
	}


	if (type == 'view' || type == 'edit' && nlapiGetContext().getExecutionContext()=='userinterface')
	{
		
		if(nlapiGetFieldValue('custbody_op_norelatedvisit') == 'T' )
		{
			var field = form.getField('custbody_op_norelatedvisit');
			field.setLabel('Visit From Event');
		}		
			
	}

}



function oppEventSyncAfterSubmit(type)
{
	//if(nlapiGetRecordType() == 'opportunity')
		
		if(type == 'create' && nlapiGetContext().getExecutionContext()=='userinterface')
		{
			if(nlapiGetFieldValue('custpage_eventid'))
			{
				nlapiSubmitField('calendarevent', nlapiGetFieldValue('custpage_eventid'), 'transaction', nlapiGetRecordId(), true);	
				nlapiSubmitField('opportunity', nlapiGetRecordId(), 'custbody_op_norelatedvisit', 'T'); 	
			}
		}		


		
		if (type == 'edit' || type == 'create'  && nlapiGetContext().getExecutionContext()=='userinterface')
		{
			if(nlapiGetFieldValue('transaction'))
			{
				nlapiSubmitField('opportunity', nlapiGetFieldValue('transaction') , 'custbody_op_norelatedvisit', 'T'); 			
			}
		}
			
}
