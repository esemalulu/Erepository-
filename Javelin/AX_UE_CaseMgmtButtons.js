function myBeforeLoadFunc(type, form)
{
	if (type == 'edit' || type == 'view') {
		
		var sourceCase = nlapiGetRecordId();
		
		form.setScript('customscript_cs_case_mgmt_helper');
		form.addButton('custpage_mymergebutton','Merge Case','openCaseMgmt(\''+sourceCase+'\',\'MERGE\');');
		
	}
}


/**
 * Created May 10, 2016 
 * Deployed for Cases that are processed by the schedule script 'customscript_aux_updated_casefollowup'
 */

function myAfterSubmitFunc(type)
{
	
	try
	{
		var toReplyStatus = '1';   //Customer to Reply	
		
		if(type == 'edit' || type == 'create')		
		{
			var recType = nlapiGetRecordType();   			
			var	recId =nlapiGetRecordId();			
			var	rec = nlapiLoadRecord(recType, recId);				
		}
		
		if(type == 'edit' || type == 'create' &&  nlapiGetContext().getExecutionContext()=='userinterface')
		{

			if(rec.getFieldValue('contact'))
			{
				//Perorm lookup of the contacts first name for outgoing emails
				var frstname = nlapiLookupField('contact', rec.getFieldValue('contact'), 'firstname', false); 
				
				//rec.setFieldValue('custevent_aux_contact_firstname', frstname );	
				try
				{
					nlapiSubmitField(recType, recId , 'custevent_aux_contact_firstname', frstname ); 						
					//nlapiSubmitRecord(rec,true,true);
				}
				catch (submiterr) 
				{
					log('Error','Error Submitting Case Record Internal ID:'+recId, getErrText(submiterr));
				}					
									
			}
			
		}
				
				
		if(type == 'edit' &&  nlapiGetContext().getExecutionContext()=='userinterface' || nlapiGetContext().getExecutionContext()=='suitelet'  )
		{						
			log('Error','Record ID:', rec );	
			
			var oldRec = nlapiGetOldRecord();
			var oldStatus = oldRec.getFieldValue('status');
		
			//Change the "Processed" checkbox to false only if the previous Status doesnt equal toReplyStatus and new status is toReplyStatus 
			if(oldStatus != toReplyStatus && rec.getFieldValue('status') =='1' )
			{
				//rec.setFieldValue('custevent_processed', 'F');	
				//rec.setFieldValue('custevent_aux_old_status', oldStatus );					
				try
				{
					nlapiSubmitField(recType, recId , 'custevent_processed', 'F' ); 
					nlapiSubmitField(recType, recId , 'custevent_aux_old_status', oldStatus ); 						
					//nlapiSubmitRecord(rec,true,true);
				}
				catch (submiterr) 
				{
					log('Error','Error Submitting Case Record Internal ID:'+recId, getErrText(submiterr));
				}
			
			}
											
		}
		
	}
	catch (processerr) 
	{
		log('Error','Error Running myAfterSubmitFunc', getErrText(processerr));
	}	
	
}