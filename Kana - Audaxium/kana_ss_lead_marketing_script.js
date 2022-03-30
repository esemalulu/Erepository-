/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

==================================================================================
Change ID		:CH#ASSIGN_LEAD_BACK_TO_MKTG
Programmer	:Sagar Shah
Description		: Assign Lead back to Marketing when the flag is checked.
Date					: 04/13/2011
==================================================================================
**/

var sNetsuiteEmailId = 19442;//Lead Management dummy Employee record
function afterSubmit(type)
{

   var record;
   var n=1;
   var leadId = nlapiGetRecordId();
	try	{
	   record = nlapiLoadRecord('customer', leadId);		
	} catch (exception)	{
		return false;
	}

   var assignToMarketing;
   assignToMarketing = record.getFieldValue('custentity_assign_lead_to_marketing');
	
	if (assignToMarketing == 'T')
	{		
		var salesteamcount = record.getLineItemCount('salesteam');
		
		for ( var i = 1; i <= salesteamcount; i++) {
			record.removeLineItem('salesteam',1);
		}
				
		var count=1;
		record.insertLineItem('salesteam', count);
		record.setLineItemValue('salesteam', 'employee', count,'26319' );//Changed to Alex
		record.setLineItemValue('salesteam', 'salesrole', count,'11' );//Marketing Rep
		record.setLineItemValue('salesteam', 'isprimary', count,'T' );
		record.setLineItemValue('salesteam', 'contribution', count,'100%' );
		
		/*
		count++;
		record.insertLineItem('salesteam', count);
		record.setLineItemValue('salesteam', 'employee', count,'24579' );//Chester Co
		record.setLineItemValue('salesteam', 'salesrole', count,'11' );//Marketing Rep
		record.setLineItemValue('salesteam', 'isprimary', count,'F' );
		record.setLineItemValue('salesteam', 'contribution', count,'0%' );
*/
		record.setFieldValue('custentity_assign_lead_to_marketing','F');

		//CH#MORE_SALESSTATUS_CHANGES - start		

		sendLeadAssignmentEmail(record,26319); //Alex
		//sendLeadAssignmentEmail(record,7395); //Dinesh for testing only
		
		//sendLeadAssignmentEmail(record,1286); //Sagar S.
		/*
		sendOppAssignmentEmail(record,135); //kate L.			
		sendOppAssignmentEmail(record,1286); //Sagar S.
		*/

		//CH#MORE_SALESSTATUS_CHANGES - end		

		nlapiSubmitRecord(record,true);

		//return true;
	}
	
}


function sendLeadAssignmentEmail(leadRecord,repId)
{
	var emailBody = 'Lead Assignment\n==========================================\n';
	emailBody += 'Lead : '+leadRecord.getFieldValue('entitynumber')+' '+leadRecord.getFieldValue('companyname')+'\n';
	//send email to Sales Rep
	nlapiSendEmail(sNetsuiteEmailId,repId, 'Lead: '+leadRecord.getFieldValue('entitynumber')+' '+leadRecord.getFieldValue('companyname')+' is assigned to back to marketing.', emailBody, null, null);
}