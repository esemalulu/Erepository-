/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
Change ID		:CH#LATEST_USERNOTE
Programmer		:Sagar Shah
Description		: Save the latest user note to reference it in the MQL report
Date			: 09/20/2013
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
Change ID		:CH#DONOT_UPDATE_OPPTY_RECORD
Programmer		:Sagar Shah
Description		: Updating the opportunity record was causing issues while saving opportunity since this script already
			edited the opportunity while the user is doing the same. 
Date			: 02/15/2014
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

function updateNoteReference(type)
{
	var opptyID=null;
	try
	{
		if ( type == 'create')
   		{

			var userNoteInternalId = nlapiGetRecordId();
			//get current opportunity internal id 
			var searchColumns = new Array();
			searchColumns[0] = new nlobjSearchColumn('formulatext');
			
			searchColumns[0].setFormula("{opportunity.internalid}");
			
			var searchFilters = new Array();		
			searchFilters[0] = new nlobjSearchFilter('internalidnumber',null, 'equalto', userNoteInternalId);
			
			var searchresults = nlapiSearchRecord('note', null, searchFilters, searchColumns );
			if (searchresults!=null && searchresults.length>0)
			{
				var searchresult = searchresults[0];				
				opptyID = searchresult.getValue(searchColumns[0]);											
			}//end if loop					
			if(opptyID=='' || opptyID==null)
				return;

			//CH#DONOT_UPDATE_OPPTY_RECORD - start
			//nlapiSubmitField('opportunity', opptyID, 'custbody_latest_user_note_id', userNoteInternalId);
			updateLatestNoteRecord(opptyID,userNoteInternalId);
			//CH#DONOT_UPDATE_OPPTY_RECORD - end
   		}
		
	}
	catch (exception)
	{
		nlapiLogExecution( 'ERROR', ' Error occurred : ', exception.toString());
	}		
}

//CH#DONOT_UPDATE_OPPTY_RECORD - start

function updateLatestNoteRecord(opptyID,userNoteInternalId) {
	
	var opptyLatestNoteRecInternalID=null;
	//get current Oppty Latest User Note record 
	var searchColumns = new Array();
	searchColumns[0] = new nlobjSearchColumn('internalid',null,null);	
	
	var searchFilters = new Array();		
	searchFilters[0] = new nlobjSearchFilter('internalid','custrecord_oppty_ref', 'is', opptyID);
	
	var searchresults = nlapiSearchRecord('customrecord_oppty_latest_user_note', null, searchFilters, searchColumns );
	if (searchresults!=null && searchresults.length>0)
	{
		var searchresult = searchresults[0];				
		opptyLatestNoteRecInternalID = searchresult.getValue(searchColumns[0]);											
	}//end if loop		
	
	if(opptyLatestNoteRecInternalID==null) {
		//create a new Oppty Latest User Note record
		var newRec  = nlapiCreateRecord('customrecord_oppty_latest_user_note');
		newRec.setFieldValue('custrecord_oppty_ref', opptyID);
		newRec.setFieldValue('custrecord_latest_note_id', userNoteInternalId);
		nlapiSubmitRecord(newRec, true);
	} else {
		//update existing Oppty Latest User Note record
		nlapiSubmitField('customrecord_oppty_latest_user_note', opptyLatestNoteRecInternalID, 'custrecord_latest_note_id', userNoteInternalId);
	}
			
}
//CH#DONOT_UPDATE_OPPTY_RECORD - end

