function updateTrxClsDept()
{		   
			   
try 
{
			
	//Parameter values are potentially dynamic variables that may change.
	var paramLastProcId = nlapiGetContext().getSetting('SCRIPT','custscript_sct32_lastprocid');

	var flt = null;	
	if (paramLastProcId)
	{
		flt = [];
		//IF the search is sorted in ASC
		flt.push(new nlobjSearchFilter('internalidnumber', null, 'greaterthan', paramLastProcId));
	}
	
    var searchResults = nlapiSearchRecord(null, 'customsearch3168', flt, null);

	for (i=0; searchResults && i < searchResults.length; i++)
	{	

		var recType = searchResults[i].getRecordType();	 
		var recId = searchResults[i].getId();
		var rec = nlapiLoadRecord(recType ,recId);
		
		if(rec.getFieldValue('custbody_aux_ss_clsdept_update') == 'T' )
		{
				continue;
		}
		
		for ( var k = 1; k <= rec.getLineItemCount('item'); k++)
		{
			
			rec.selectLineItem('item', k);  
			rec.setCurrentLineItemValue('item', 'class', rec.getFieldValue('class'));
			rec.commitLineItem('item');																						
			
			/*				
			if(!rec.getLineItemValue('item', 'department', k))
			{
			rec.selectLineItem('item', k);  
			rec.setCurrentLineItemValue('item', 'department', jobDept);
			rec.commitLineItem('item');								
			}
			*/

		}
			

		/*			
		for ( var l = 1; l <= rec.getLineItemCount('time'); l++)
		{
			
			if(!rec.getLineItemValue('time', 'department',  l))
			{
			rec.selectLineItem('time', l);  
			rec.setCurrentLineItemValue('time', 'department', jobDept);
			rec.commitLineItem('time');								
			}

			if(!rec.getLineItemValue('time', 'class', l))
			{
			rec.selectLineItem('time', l);  
			rec.setCurrentLineItemValue('time', 'class', jobCls);
			rec.commitLineItem('time');								
			}

		}
		*/
		
		try 
		{
			rec.setFieldValue('custbody_aux_ss_clsdept_update', 'T'); 			
			nlapiSubmitRecord(rec, true, true);	
		}
		catch(submiterr)
		{			
		log('ERROR','Error Updating Departments and Class for Record: ' +recId+'//',  getErrText(submiterr));	
		}

							   
		//Set % completed of script processing			
		var pctCompleted = Math.round(((i+1) / searchResults.length) * 100);
		nlapiGetContext().setPercentComplete(pctCompleted);
				   					   
		if ((i+1)== 1000 || ((i+1) < searchResults.length && nlapiGetContext().getRemainingUsage() < 100)) 
		{
			//reschedule
			log('ERROR','Getting Rescheduled at', searchResults[i].getValue('internalid'));
			var rparam = new Object();
			
			rparam['custscript_sct32_lastprocid'] = searchResults[i].getValue('internalid');				
			nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
			break;				
		}
				   
	}			   
		   
			   
}
catch(procerr)
{			
log('ERROR','Error Updating Departments and Class',  getErrText(procerr));	
}			   
			   
			   
		   
			   
}	





