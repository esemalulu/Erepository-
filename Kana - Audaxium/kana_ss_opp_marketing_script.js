/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
Change ID		:CH#SALES_STATUS
Programmer		:Sagar Shah
Description		: Assign the opportunity to marketing team
Date			: 07/21/2009
=========================================================================================
Change ID		:CH#MORE_SALESSTATUS_CHANGES
Programmer		:Sagar Shah
Description		: Changes submitted by Michelle & Christine
Date			: 02/11/2010
=========================================================================================
Change ID		:CH#ASSIGN_BASEDON_SUB
Programmer		:Sagar Shah
Description		: Select the Mktg Rep based on the Subsidiary of the opportunity
Date			: 08/05/2013
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
var sNetsuiteEmailId = 19442;//Lead Management dummy Employee record
function afterSubmit(type)
{

   var record;
   var mktgRep; //CH#ASSIGN_BASEDON_SUB
   var oppId = nlapiGetRecordId();
   nlapiLogExecution('DEBUG', 'Opportunity Fired', type +' with ID = ' + oppId);
	try	{
	   record = nlapiLoadRecord('opportunity', oppId);		
	} catch (exception)	{
		return false;
	}

   var assignToMarketing;
   assignToMarketing = record.getFieldValue('custbody_assign_opp_to_marketing');

   nlapiLogExecution('debug','assignToMarketing',assignToMarketing);
   
	if (assignToMarketing == 'T')
	{		
		var salesteamcount = record.getLineItemCount('salesteam');
		
		nlapiLogExecution('debug','Sales Team Count', salesteamcount);
		
		for ( var i = 1; i <= salesteamcount; i++) {
			record.removeLineItem('salesteam',1);
		}
		
		//CH#ASSIGN_BASEDON_SUB - start
		nlapiLogExecution('debug','Subsidiary',record.getFieldValue('subsidiary'));
		
		mktgRep = getMktgRepBasedOnSubsidiary(record.getFieldValue('subsidiary'));
		
		if(mktgRep==null || mktgRep=='')
			mktgRep = '26319';//assign the default rep as Alex Young
		
		//CH#ASSIGN_BASEDON_SUB - end
		
		var count=1;
		record.insertLineItem('salesteam', count);
		record.setLineItemValue('salesteam', 'employee', count, mktgRep);
		record.setLineItemValue('salesteam', 'salesrole', count,'11' );//Marketing Rep
		record.setLineItemValue('salesteam', 'isprimary', count,'T' );
		record.setLineItemValue('salesteam', 'contribution', count,'100%' );
		
		record.setFieldValue('custbody_assign_opp_to_marketing','F');

		//CH#MORE_SALESSTATUS_CHANGES - start		

		sendOppAssignmentEmail(record,mktgRep);

		//CH#MORE_SALESSTATUS_CHANGES - end		

		nlapiSubmitRecord(record,true);

		//return true;
	}
	
}
// end - SALES_STATUS

//CH#MORE_SALESSTATUS_CHANGES - start
function sendOppAssignmentEmail(oppRecord,repId)
{
	var emailBody = 'Opportunity Assignment\n==========================================\n';
	emailBody += 'Customer : '+oppRecord.getFieldText('entity')+'\n';
	emailBody += 'Opportunity Number : '+oppRecord.getFieldValue('tranid');
	//send email to Sales Rep
	nlapiSendEmail(sNetsuiteEmailId,repId, 'Opportunity No: '+oppRecord.getFieldValue('tranid')+' is assigned to you.', emailBody, null, null);
}
//CH#MORE_SALESSTATUS_CHANGES - end

//CH#ASSIGN_BASEDON_SUB - start
function getMktgRepBasedOnSubsidiary(sub) {
	try
	{
		var searchColumns = new Array();
		searchColumns[0] = new nlobjSearchColumn('internalid','custrecord_mktg_rep');
		
		var searchFilters = new Array();		
		searchFilters[0] = new nlobjSearchFilter('internalid','custrecord_sub', 'is', sub);
		searchFilters[1] = new nlobjSearchFilter('isinactive', null, 'is','F');	
		
		var searchresults = nlapiSearchRecord('customrecord_sub_mktg_rep_mapping', null, searchFilters, searchColumns );
		for (var i = 0; searchresults != null && i < searchresults.length; i++ )
		{
			var searchresult = searchresults[i];				
			var internalID = searchresult.getValue(searchColumns[0]);							
			if(internalID=='')
				return null;
			return internalID;
		}//end for loop		
		return null;
	}
	catch (exception)
	{
		return null;
	}	
}

//CH#ASSIGN_BASEDON_SUB - end