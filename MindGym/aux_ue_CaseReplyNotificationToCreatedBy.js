/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */

function msgAfterSubmit(type)
{
		log('ERROR','Logging Activity:'+nlapiGetFieldValue('activity'));
			
		if (nlapiGetFieldValue('activity') && nlapiGetFieldValue('incoming')== 'T')
		{					
			try 
			{
			
				var caseFilters = [new nlobjSearchFilter('internalid', null, 'is', nlapiGetFieldValue('activity'))];
				var caseColumns = [new nlobjSearchColumn('internalid')];			
				var casescr = nlapiSearchRecord ('supportcase',null , caseFilters, caseColumns);
				
				if(casescr)
				{					
					var rec = nlapiLoadRecord('supportcase', casescr[0].getValue('internalid'));
					
					var content = nlapiGetFieldValue('message');					
					
					var emailBody = '<html><body >';
						emailBody += '<table width="700px" height="50px" style="background-color: #D3D3D3">'					
						emailBody += '<tr><td> Below is the the most recent message added to Case:'+rec.getFieldValue('casenumber')+' on '+rec.getFieldValue('lastmessagedate');	
						emailBody += '<tr><td> PLEASE DO NOT REPLY TO THIS EMAIL - <a href="https://system.netsuite.com/app/crm/support/supportcase.nl?id='+rec.getFieldValue('id')+'">Click Here </a> to view  Case:'+rec.getFieldValue('casenumber');						
						emailBody += '</table>'
						emailBody += '<table width="700px">'										
						emailBody += '<tr><td>'+content  ;						
						emailBody += '</table>'					
						emailBody += '</body></html>';
																							
					if(rec.getFieldValue('assigned'))
					{
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
				
				}					
					
			} 
			catch (e) 
			{
				log('ERROR','Error Sending Update Notification' +getErrText(e));	
			}
			   		
		}	
		
}
