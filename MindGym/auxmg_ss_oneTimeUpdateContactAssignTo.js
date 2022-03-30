/**
 * One time script to go through ALL client accounts that has territory set 
 * and update contacts assigned to field
 * Script is based on contact assign to update script on auxmg_ss_syncSalesRepAndTerritory.js
 * 
 * Version    Date            Author           Remarks
 * 1.00       27 Mar 2014     AnJoe
 *
 */

//Script level parameter
var paramLastProcId = nlapiGetContext().getSetting('SCRIPT', 'custscript_490_lastprocid');

function updContactAssignToOnClient(type) 
{
	var procClientId = '';
	try {
		
		
		//search for list of ALL Client records with Territory assigned
		var tflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
		            new nlobjSearchFilter('territory', null, 'noneof',['@NONE@','-5','25']),
		            new nlobjSearchFilter('isperson',null,'is','F')];
		
		if (paramLastProcId) 
		{
			tflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcId));
		}
		
		var tcol = [new nlobjSearchColumn('internalid').setSort(true),
		            new nlobjSearchColumn('salesrep')];
		
		//Search for all customers with
		//who has territory assigned and is none of Round robin or Test
		var trs = nlapiSearchRecord('customer', null, tflt, tcol),
			errorLog = '';
		
		//Loop through each customer and update/set assigned to on contacts
		for (var t=0; trs && t < trs.length; t++) 
		{

			var salesRep = trs[t].getValue('salesrep'),
				clientId = trs[t].getValue('internalid');
			
			procClientId = clientId;
			
			log('debug','Processing Client',clientId);
			
			//TIcket 8237 - Client request to go through ALL Contacts where parent is THIS CUSTOMER
			//				Make sure sales rep being set here matches "Contact/Assigned To" field value.
			//				IF the user is already assigned and the assigned Sales Rep is BDA department, YOU SKIP IT
			//					- ONLY Change when the assigned rep is different AND department is NOT BDA
			var ctflt = [new nlobjSearchFilter('internalid','parent','anyof',clientId),
			             new nlobjSearchFilter('isinactive', null, 'is','F')],
				ctcol = [new nlobjSearchColumn('internalid'),
				         new nlobjSearchColumn('custentity_assigned_to'),
				         new nlobjSearchColumn('department','custentity_assigned_to')],
				ctrs = nlapiSearchRecord('contact', null, ctflt, ctcol);
			
			//Loop through each customers' contact 
			for (var ct=0; ctrs && ct < ctrs.length; ct+=1)
			{
				var ctAssignedTo = ctrs[ct].getValue('custentity_assigned_to'),
					ctAssignedDept = ctrs[ct].getValue('department','custentity_assigned_to');
				
				//BDA department ID is 25
				if (!ctAssignedTo || (ctAssignedTo != salesRep && (ctAssignedDept !='25')))
				{
					log('debug','--- Update Contact '+ctrs[ct].getValue('internalid'),'Update assigned to value: '+salesRep);
					try
					{
						nlapiSubmitField('contact', ctrs[ct].getValue('internalid'), 'custentity_assigned_to', salesRep, true);
					}
					catch (upderr)
					{
						errorLog += '<li>Client Account ('+clientId+') -- '+
									'Contact ID ('+ctrs[ct].getValue('internalid')+')<br/> '+
									'Failed to Update == '+getErrText(upderr)+'</li>';
						
						log('error','Error updating contact id','Client ID '+clientId+' -- Contact ID '+ctrs[ct].getValue('internalid')+' // Error '+getErrText(upderr));
						
					}
				}
			}
			
			//Set % completed of script processing
			var pctCompleted = Math.round(((t+1) / trs.length) * 100);
			nlapiGetContext().setPercentComplete(pctCompleted);
			
			if ((t+1)==1000 || (t < (t+1) && nlapiGetContext().getRemainingUsage() < 1000)) 
			{
				//reschedule
				var param = new Object();
				param['custscript_490_lastprocid'] = trs[t].getId();
			
				log('audit','Reschedule','Getting rescheduled at '+clientId);
				
				var qstatus = nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), param);
				if (qstatus == 'QUEUED') 
				{
					break;
				}
			}
		}
		
		if (errorLog)
		{
			var sbj = 'One Time Contact Assign To Update Error Log',
				msg = 'Error occured while executing One time Contact Assigned To Update:<br/>'+
					  '<ul>'+
					  errorLog+
					  '</ul>',
				cc = null;
			
			nlapiSendEmail(-5, 'joe.son@audaxium.com', sbj, msg, cc);
		}
		
	} 
	catch (caerr) 
	{
		log('error','All Client Contact Assign To Update Fail', 'Client ID '+procClientId+' // '+getErrText(caerr));
		throw nlapiCreateError('CONTACT-ASSIGNEDTO-ERR', 'Client ID '+procClientId+' // '+getErrText(caerr), false);
	}
	
}
