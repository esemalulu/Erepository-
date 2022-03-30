/**
 * Module Description
 * Scheduled script that search cases and send out a notification to the User that created the case. 
 * The Notification contains the very last incominng messsage to the case
 
 * Version    Date            Author           Remarks
 * 1.00       01 Jan 2017     ELI
 *
 */

function recentCaseEmailNotification()
{		   
			   
	try 
	{
				
		//Parameter values are potentially dynamic variables that may change.
		var paramLastProcId = nlapiGetContext().getSetting('SCRIPT','custscript_sct553_lastprocid');		
					
		var flt =  null;		

		if (paramLastProcId)
		{
			
		flt = [];		
		//IF the search is sorted in DSC
		flt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcId));
		}

		var searchResults = nlapiSearchRecord(null, 'customsearch4395', flt, null);
	
		for (i=0; searchResults && i < searchResults.length; i++)
		{	
			var recType = searchResults[i].getRecordType();	
			var recId = searchResults[i].getId();
			var rec = nlapiLoadRecord(recType ,recId);
			
			if(rec.getFieldValue('lastmessagedate'))
			{
				var lstmgdate = nlapiStringToDate(rec.getFieldValue('lastmessagedate'));
				var stringLstMsgDate = nlapiDateToString(lstmgdate);

				var todayObj = new Date();			
				todayObj.setDate(todayObj.getDate() - 1);
				var yesterday = nlapiDateToString(todayObj);
		
				nlapiLogExecution('DEBUG', 'LAST MSG DATE', stringLstMsgDate);
				nlapiLogExecution('DEBUG', 'YESTERDAY', yesterday);	
				//Date format in will always be based on the Systems "General Preferences"	
				
				//if(stringLstMsgDate == '9/1/2017')  TESTING   	
				if(stringLstMsgDate == yesterday && rec.getFieldValue('incomingmessage'))		
				{					
					var message = rec.getFieldValue('incomingmessage');	
					var stringArray = message.split("\n");	

					var emailBody = '<html><body >';
					emailBody += '<table width="700px" height="50px" style="background-color: #D3D3D3">'					
					emailBody += '<tr><td> Below is the the most recent message added to Case:'+rec.getFieldValue('casenumber')+' on '+rec.getFieldValue('lastmessagedate');	
					emailBody += '<tr><td> PLEASE DO NOT REPLY TO THIS EMAIL - <a href="https://system.netsuite.com/app/crm/support/supportcase.nl?id='+recId+'">Click Here </a> to view  Case:'+rec.getFieldValue('casenumber');
					emailBody += '</table>'					
					for (c = 0; c < stringArray.length; c++) 
					{					
					emailBody += '<p>'+stringArray[c]+'</p>';	
					}
					emailBody += '</body></html>';
				
					nlapiSendEmail(
					'-5', 																									
					rec.getFieldValue('custevent_case_createdby'), 																																		
					'Recent Messages from Case '+rec.getFieldValue('casenumber')+':'+rec.getFieldValue('title'), 			
					emailBody, 																							
					'effie.simmons@themindgym.com', 																																	
					'elijah@audaxium.com',																														
					null, 																									
					null, 																									
					true, 
					null, 
					null
					);	
				
				}
				
				//Set % completed of script processing			
				var pctCompleted = Math.round(((i+1) / searchResults.length) * 100);
				nlapiGetContext().setPercentComplete(pctCompleted);
											   
				if ((i+1)==1000|| ((i+1) < searchResults.length && nlapiGetContext().getRemainingUsage() < 100)) 
				{
					//reschedule
					log('ERROR','Getting Rescheduled at', searchResults[i].getValue('internalid'));
					var rparam = new Object();
					
					rparam['custscript_sct553_lastprocid'] = searchResults[i].getValue('internalid');				
					nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
					break;				
				}
				
			}		
		}		   
				   
	}
	catch(procerr)
	{			
	log('ERROR','Error Sending Emails to Case Creator',  getErrText(procerr));	
	}			   
			   			  		   
			   
}	
