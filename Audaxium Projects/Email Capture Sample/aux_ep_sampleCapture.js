/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       28 Oct 2016     json
 *
 */

function process(email)
{
	nlapiLogExecution('debug','Sent From', email.getFrom());
	
	nlapiLogExecution('debug','Subject', email.getSubject());
	
	nlapiLogExecution('debug','Body', email.getTextBody());

	
} 