/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
Change ID		:CH#USE_CUST_REFERENCE
Programmer		:Sagar Shah
Description		: Send email when somebody uses the Customer Reference data.
Date			: 05/05/2010
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
var sNetsuiteEmailId = 24316;//Kana Marketing Employee ID
var toEmail = 145;//Vikas Nehru
var ccToEmail = new Array();

function afterSubmit(type)
{
	try
	{
	   	if ( type == 'create')
   		{
			var custRefRecord = nlapiGetNewRecord();

			var customer = custRefRecord.getFieldText('custrecord_cust_referenced');
			var referenceDate = custRefRecord.getFieldValue('custrecord_reference_date');
			var salesPerson = custRefRecord.getFieldText('custrecord_reference_sales_person');
			var usedForCustomer = custRefRecord.getFieldText('custrecord_reference_for_customer');
			var usedForOpportunity = custRefRecord.getFieldText('custrecord_reference_for_opportunity');

			var notes = custRefRecord.getFieldValue('custrecord_cust_reference_notes');

			var custInternalID = custRefRecord.getFieldValue('custrecord_cust_referenced');
			var custSalesRepInternalID = nlapiLookupField('customer', custInternalID, 'salesrep');
			var custSalesRepEmail = nlapiLookupField('employee', custSalesRepInternalID, 'email');
			var custSalesRepName = nlapiLookupField('employee', custSalesRepInternalID, 'firstname')+' '+nlapiLookupField('employee', custSalesRepInternalID, 'lastname');

			var custContactInternalID = custRefRecord.getFieldValue('custrecord_cust_reference_contact');
			var custContactEmail = nlapiLookupField('contact', custContactInternalID, 'email');
			var custContactPhone = nlapiLookupField('contact', custContactInternalID, 'phone');
			//var custContactName = nlapiLookupField('contact', custContactInternalID, 'firstname')+' '+nlapiLookupField('contact', custContactInternalID, 'lastname');
			var custContactName = nlapiLookupField('contact', custContactInternalID, 'entityid');

			var salesRepInternalID = custRefRecord.getFieldValue('custrecord_reference_sales_person');
			var salesRepEmail = nlapiLookupField('employee', salesRepInternalID, 'email');

			ccToEmail[0] = custSalesRepEmail;
			ccToEmail[1] = salesRepEmail;
			ccToEmail[2] = 'nmossinger@kana.com';


			//===============================================================
			//********** Send Email *************************
			//===============================================================
			var emailBody = '<html><body>';
			emailBody += '<h3>Hi,<br>';
			emailBody += '&nbsp;&nbsp;&nbsp;&nbsp;Following customer reference was used:</h3><br>';
			emailBody += '<table width="60%" border="0">';
			emailBody += '<tr><td><b>Customer </b></td><td>: '+customer+'</td></tr>';
			emailBody += '<tr><td><b>Customer Contact </b></td><td>: '+custContactName+'</td></tr>';
			emailBody += '<tr><td><b>Customer Contact Info</b></td><td>: Email - '+checkNull(custContactEmail)+' | Phone - '+checkNull(custContactPhone)+'</td></tr>';
			emailBody += '<tr><td><b>Customer Sales Rep </b></td><td>: '+custSalesRepName+'</td></tr>';
			emailBody += '<tr><td><b>Reference Date </b></td><td>: '+referenceDate+'</td></tr>';
			emailBody += '<tr><td><b>Sales Person </b></td><td>: '+salesPerson+'</td></tr>';
			emailBody += '<tr><td><b>Reference used for Customer </b></td><td>: '+usedForCustomer+'</td></tr>';
			emailBody += '<tr><td><b>Reference used for Opportunity </b></td><td>: '+checkNull(usedForOpportunity)+'</td></tr>';
			emailBody += '<tr><td><b>Notes </b></td><td>: '+notes+'</td></tr>';
			emailBody += '</table>';

			emailBody += '<br><p><b>Please do not reply to this email.</b><p>';	
			emailBody += '</body></html>';
			//send email to Sales Rep
			
			nlapiLogExecution('debug','email body',emailBody);
			
			nlapiSendEmail(sNetsuiteEmailId,toEmail, 'Customer "'+customer+'" was referenced.', emailBody, ccToEmail, null);

			//===============================================================

		}// if type
	} // try
	catch(e)
	{
            if ( e instanceof nlobjError )
                nlapiLogExecution( 'ERROR', ' system error', e.getCode() + '\n' + e.getDetails() )
            else
                nlapiLogExecution( 'ERROR', ' unexpected error', e.toString() )

	} //catch
} //end

function checkNull(value) 
{
	if(value == null || value == '') 
		{
			return 'None';
		}
	else {
		return value;
	}
}