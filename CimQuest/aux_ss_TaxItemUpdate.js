function updateTaxItems()
{		   
		   
	try 
	{
		//Parameter values are potentially dynamic variables that may change.		
		var paramLastProcId = nlapiGetContext().getSetting('SCRIPT','custscript_sct208_lastprocid');

		var flt = null;	
		if (paramLastProcId)
		{
			flt = [];
			//IF the search is sorted in ASC
			flt.push(new nlobjSearchFilter('internalidnumber', null, 'greaterthan', paramLastProcId));
		}

		var searchResults = nlapiSearchRecord(null, 'customsearch1817', flt, null);

		for (var i=0; searchResults && i < searchResults.length; i++)
		{			   
							
			var recType = searchResults[i].getRecordType();
			var recId = searchResults[i].getId();
			var custRec = nlapiLoadRecord(recType ,recId);
			var custTaxItem = custRec.getFieldValue('taxitem');
			
			if(!custTaxItem || (custTaxItem && custTaxItem == '1930'))
			{
				var soRec = nlapiCreateRecord('salesorder', {recordmode:'dynamic'});
				var client = soRec .setFieldValue('entity', recId );
				var taxItem = soRec .getFieldValue('taxitem');
				custRec.setFieldValue('taxitem', taxItem);
				
				try 
				{
					nlapiSubmitRecord(custRec, true, true);	
				}
				catch(submiterr)
				{			
					log('ERROR','Error Updating Tax Item for Record: ' +recId+'//',  getErrText(submiterr));	
				}
			}
								   
			//Set % completed of script processing			
			var pctCompleted = Math.round(((i+1) / searchResults.length) * 100);
			nlapiGetContext().setPercentComplete(pctCompleted);
										   
			if ((i+1)==1000|| ((i+1) < searchResults.length && nlapiGetContext().getRemainingUsage() < 100)) 
			{
				//reschedule
				log('ERROR','Getting Rescheduled at', searchResults[i].getValue('internalid'));
				var rparam = new Object();
				
				rparam['custscript_sct208_lastprocid'] = searchResults[i].getValue('internalid');				
				nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
				break;				
			}
						   						   
		}			   
			   				   							   
	}
	catch(procerr)
	{			
		log('ERROR','Error Processing Script',  getErrText(procerr));	
	}			   
			   			   		  			   
}	