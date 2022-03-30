/**
 * Author: elijah@audaxium.com
 * Date: 04/17/2016
 * Scheduled Script
 * Desc: Updated Scheduled Script that processes cases marked as 'Customer to reply'
 */

function autoResponseToCase() 
{
	var today = nlapiDateToString(new Date());

	try 
	{	
		//Parameter values are potentially dynamic variables that may change.
		var paramLastProcId = nlapiGetContext().getSetting('SCRIPT','custscript_last_case_processed_id'),
		
			//Notification Days paremeters 
			firstNoticeDays = nlapiGetContext().getSetting('SCRIPT','custscript_aux_1st_notification_days'),
			secondNoticeDays = nlapiGetContext().getSetting('SCRIPT','custscript_aux_2nd_notification_days'),
			finalNoticeDays = nlapiGetContext().getSetting('SCRIPT','custscript_aux_3rd_notification_days'),
			
			//Email Templates
			firstEmailTempl = nlapiGetContext().getSetting('SCRIPT','custscript_aux_1st_email_notice_template'),
			secondEmailTempl = nlapiGetContext().getSetting('SCRIPT','custscript_aux_2nd_email_notice_template'),
			finalEmailTempl = nlapiGetContext().getSetting('SCRIPT','custscript_aux_3rd_email_notice_template'),
			
			//The Saved Search Parameter that the script runs against
			searchRecordResults = nlapiGetContext().getSetting('SCRIPT','custscript_aux_search_record'),
			
			contactToBcc = nlapiGetContext().getSetting('SCRIPT','custscript_aux_contact_to_bcc'),				
			finalCaseStatus = nlapiGetContext().getSetting('SCRIPT','custscript_aux_final_case_status');
		
		var flt = null;	
		if (paramLastProcId)
		{
			flt = [];
			//IF the search is sorted in ASC
			flt.push(new nlobjSearchFilter('internalidnumber', null, 'greaterthan', paramLastProcId));
		}	
				
		var rslt = nlapiSearchRecord(null, searchRecordResults, flt, null);
		
		if (rslt && rslt.length > 0) 
		{
						
			for (var i=0; i < rslt.length; i++) 
			{
				var recType = rslt[i].getRecordType(),    			
				recId = rslt[i].getId();
				
				var rec = nlapiLoadRecord(recType, recId),
				emailadd =  rec.getFieldValue('email');		
				
				//Merge Templetes with the 	Email
				var emailMerger = nlapiCreateEmailMerger(firstEmailTempl);	//Only using 1 templateId for the moment		
				emailMerger.setSupportCase(recId); 
				var mergeResult = emailMerger.merge();			
				var emailSubject = mergeResult.getSubject(); 
				var emailBody = mergeResult.getBody(); 								
				var records = {'activity': recId}; //attach message to Case record								
				
//---------------------------------------------------------------------------------------------------------------------------------												
				var statusChangeDate = nlapiStringToDate(rec.getFieldValue('custevent_status_set_date') ); 

				var endDate1 = "",
					endDate2 = "",
					endDate3 = "",					
					count = 0;					
						
				//Increment days by paremeters set for Notification Days while excluding Sat (0) and Sun(6)
				//Submit Field ONLY so that support notifications are not affected by SubmitRecord
				while(count < firstNoticeDays){ 

					endDate1 = new Date(statusChangeDate.setDate(statusChangeDate.getDate() + 1));
					
					if(endDate1.getDay() != 0 && endDate1.getDay() != 6){					   
					   count++;
					}
				}				
				//nlapiSubmitField(recType, recId , 'custevent_aux_day_for_action1', nlapiDateToString(endDate1) );				
				if (today == nlapiDateToString(endDate1)){								
					try 
					{						
						nlapiSendEmail(2450557 , emailadd, emailSubject, emailBody, null, contactToBcc, records, null, true, null, null);													
					}
					catch (action1error)
					{
						var sbj = 'Error Processing Day '+firstNoticeDays+' Notification Email';
						var msg = 'Failed to send Email Notification for Case Internal Id of: '+recId+'<br/>'+getErrText(action1error);				  
						nlapiSendEmail(-5, 'javelin@audaxium.com', sbj, msg);							
						log('error','Error Sending Email','Failed to send Day '+firstNoticeDays+' Notification '+getErrText(action1error));
					}																																								
				}				
				//---------------------------------------												
				while(count < secondNoticeDays ){ 
					endDate2 = new Date(statusChangeDate.setDate(statusChangeDate.getDate() + 1));
					if(endDate2.getDay() != 0 && endDate2.getDay() != 6){
					   
					   count++;
					}
				}
				//nlapiSubmitField(recType, recId , 'custevent_aux_day_for_action2', nlapiDateToString(endDate2) );				
				if (today == nlapiDateToString(endDate2)) 
				{									
					try 
					{
						nlapiSendEmail(2450557, emailadd, emailSubject, emailBody, null, contactToBcc, records, null, true, null, null);													
					}
					catch (action2error)
					{
						var sbj = 'Error Processing Day '+secondNoticeDays+' Notification Email';
						var msg = 'Failed to send Email Notification for Case Internal Id of: '+recId+'<br/>'+getErrText(action2error);				  
						nlapiSendEmail(-5, 'javelin@audaxium.com', sbj, msg);
						log('error','Error Sending Email','Failed to send Day '+secondNoticeDays+' Notification '+getErrText(action2error));
					}																																					
				}							
				//---------------------------------------												
				while(count < finalNoticeDays){ 

					endDate3 = new Date(statusChangeDate.setDate(statusChangeDate.getDate() + 1));
					if(endDate3.getDay() != 0 && endDate3.getDay() != 6){
					  
					   count++;
					}
				}	
				//nlapiSubmitField(recType, recId , 'custevent_aux_day_for_action3', nlapiDateToString(endDate3) );				
				if (today == nlapiDateToString(endDate3)){												

					try 
					{
						nlapiSubmitField(recType, recId , 'status', finalCaseStatus);									

					}
					catch(action3error)
					{
						var sbj = 'Error Processing Day '+finalNoticeDays+' Final Case Status';
						var msg = 'Failed to set the Status to '+finalCaseStatus+' for Case Internal Id of: '+recId+'<br/>'+getErrText(action3error);				  
						nlapiSendEmail(-5, 'javelin@audaxium.com', sbj, msg);												
						log('error','Error Setting Final Status','Failed to set Status to '+finalCaseStatus+' : '+getErrText(action3error));
					}
					
/*	THIS IS BLOCKED OUT BUT IS READY IN CASE THE CLIENT WANTS TO SEND AND A FINAL EMAIL INSTEAD OF SETTING THE FINAL CASE STATUS ABOVE 				
					try 
					{	
						nlapiSendEmail(2450557, emailadd, emailSubject, emailBody, null, contactToBcc, records, null, true, null, null);							
					}
					catch (finalerror)
					{
						var sbj = 'Error Processing Day '+finalNoticeDays+' Notification Email';
						var msg = 'Failed to send Final Email Notification for Case Internal Id of: '+recId+'<br/>'+getErrText(action3error);				  
						nlapiSendEmail(-5, 'javelin@audaxium.com', sbj, msg);
						log('error','Error Sending Email','Failed to send Final Notification '+getErrText(finalerror));
					}
*/																																							
				}
															
//---------------------------------------------------------------------------------------------------------------------------------		

				
				//Set % completed of script processing			
				var pctCompleted = Math.round(((i+1) / rslt.length) * 100);
				nlapiGetContext().setPercentComplete(pctCompleted);
						
				//AFter each record is processed, you check to see if you need to reschedule
				if ((i+1)==1000 || ((i+1) < rslt.length && nlapiGetContext().getRemainingUsage() < 100)) 
				{
					//reschedule
					log('ERROR','Getting Rescheduled at', rslt[i].getValue('internalid'));
					var rparam = new Object();					
					rparam['custscript_last_case_processed_id'] = rslt[i].getValue('internalid');				
					nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
					break;
				}
				
			}
		}

	}	
	catch(procerr)
	{
	
		log('ERROR','Error Sending Notification Emails', getErrText(procerr));	
	}
	
	
}
