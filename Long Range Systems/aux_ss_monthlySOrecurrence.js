 /**
 * Monthly Billing Script designed to replace NS Recurring Billing Feature
 * since NS version uses initial large Amount that is billed on Monthly statements
 * 
 * Version    Date            	Author           			Remarks
 * 1.00       10 Sept 2015     elijah@audaxium.com
 *
 */

function CopyMonthlyServicesSalesOrder() 
{		

	try 
	{
			
		//Parameter values are potentially dynamic variables that may change.
		var paramLastProcId = nlapiGetContext().getSetting('SCRIPT','custscript_sct51_lastprocid'),
			paramErrorEmailEmpId = nlapiGetContext().getSetting('SCRIPT','custscript_sct51_errempid');
		
		var flt = null;	
		if (paramLastProcId)
		{
			flt = [];
			//IF the search is sorted in ASC
			flt.push(new nlobjSearchFilter('internalidnumber', null, 'greaterthan', paramLastProcId));
		}
					
		//Search result will be ordered either in ASC or DESC of internal ID
		var searchResults = nlapiSearchRecord(null, 'customsearch891', flt, null);
		
		for (var i=0; searchResults && i < searchResults.length; i++)
		{		     
			
			var oldType = searchResults[i].getRecordType(),    			
				oldId = searchResults[i].getId(),
				canProcess = true;
			
			var oldRecord = nlapiLoadRecord(oldType, oldId);
		
			//Search to see if Stop Billing workflow was checked. 
			//IF any results return, continue OR DO not process.
			//Workflow join is NOT accessible via record object. Need to execute search
			var wfflt = [new nlobjSearchFilter('internalid', null, 'anyof', oldId),
			             new nlobjSearchFilter('custwfstate_wf_stopbilling','workflow','is','T')];
			var wfcol = [new nlobjSearchColumn('internalid')];
			var wfrs = nlapiSearchRecord('salesorder', null,wfflt, wfcol);
			
			//If there IS a result for this sales order, skip it.
			if (wfrs && wfrs.length > 0)
			{
				oldRecord.setFieldValue('custbody_aux_billingstopped','T');
				log('audit','Skip Sales Order Internal ID '+oldId,'Skip because Stop Billing Workflow Flag is set');
				canProcess = false;
			}
			
			if (canProcess)
			{
				// Reads the value of billingschedule and assigns it to a variable called renewalValue	
				var lineNumberToKeep = oldRecord.findLineItemValue('item','class', '120');
					
				var d = new Date();
				var todayDate = parseInt(d.getDate());
				var month = parseInt(d.getMonth());
				
				var TrxDateOb = nlapiStringToDate(oldRecord.getFieldValue('trandate'));
				var TrxDate = parseInt(TrxDateOb.getDate());				      
												
				// If the "Billing Schedule" at the Main Level doesn't exist move to the Line Item level
				//Find the Line Item with Recurring Revenue as a Class Value and with a Transaction Day(DD out of MM/DD/YYYY) is equal to today 
				if (lineNumberToKeep && lineNumberToKeep >= 1 &&				
					(todayDate == TrxDate || 
					(todayDate == '30' && TrxDate == '31') ||
					(month == '1' && todayDate >= '28' && TrxDate >= '29' )	) )
				{
					
					//oldRecord.setFieldValue('shipcarrier','ups');
					//oldRecord.setFieldValue('shipmethod','');
					oldRecord.setFieldValue('custbody_aux_scriptprocessed','T');
					
					var oldEmailChckbx = oldRecord.getFieldValue('tobeemailed');
					 
					
					//JS: 12/7/2015 
					//Part of request to generate error email for failed copy.
					//	- Since this old record is saved with new value, it is wrapped in try/catch block to let 
					//	  admins know.
					
					try
					{
						//JS: 12/7/2015 - Modified to add ignore mandetory field check
						oldId = nlapiSubmitRecord(oldRecord, true, true);
						
						// Declares a new OBJECT variable and assigns a copy of the old sales order to it
						var newRecord = nlapiCopyRecord(oldType,oldId,{recordmode:'dynamic',customform: '153'}); 
						
			
/*			
						if(todayDate == '30' && TrxDate == '31')
						{
						var oldDate = nlapiLookupField('salesorder', oldId, 'trandate', false);							
						newRecord.setFieldValue('trandate',oldDate);	 	
														
						}
*/						
						
						newRecord.setFieldValue('orderstatus','B');	                     
						newRecord.setFieldValue('custbody23','');
						newRecord.setFieldValue('custbody_aux_scriptprocessed','F');					
						
						if 	(oldEmailChckbx == 'F')
						{
							newRecord.setFieldValue('tobeemailed','F');	
							//Updated April 2016 to Uncheck "To Be Emailed" checkbox now that system wont allow
							//form submission submitted even though nlapiSubmitRecord overlooks mandatory fields
						}
																				

						for ( var k = 1; k <= newRecord.getLineItemCount('item'); k++)
						{
								
							var cls = newRecord.getLineItemValue('item', 'class', k);
							var mnthlyBill = newRecord.getLineItemValue('item', 'billingschedule', k);
							var itemType = newRecord.getLineItemValue('item', 'itemtype', k);
							
							
							//If the Line Item Class value doesn't equal "Recurring Revenue" then remove the line item
							if(cls != '120' && mnthlyBill != '16' )
							{				
								newRecord.removeLineItem('item', k);
								k=1;
							}
							else
							{														
								var unitPrice = newRecord.getLineItemValue('item', 'rate', k);	
								var qty = newRecord.getLineItemValue('item', 'quantity', k);
								
								if(itemType == 'NonInvtPart')
								{
									newRecord.setFieldValue('shippingcost','0.00');
								}

								newRecord.selectLineItem('item', k);  
								newRecord.setCurrentLineItemValue('item', 'quantity','1');
								newRecord.setCurrentLineItemValue('item','billingschedule', '16');								
								newRecord.setCurrentLineItemValue('item', 'amount', qty*unitPrice);
								newRecord.commitLineItem('item');					
							}								
						}
						
						//JS: Dec 7th 2015
						//Change requested by Karen to have error email generate when copy fails
						try 
						{
							nlapiSubmitRecord(newRecord, true, true);
						}
						catch (copyerr)
						{
							var csbj = 'Error Processing Monthly SO Recurrence: Copy SO Failed';
							var cmsg = 'Failed to clone Sales Order Internal ID '+oldId+
										'<br/>'+
										getErrText(copyerr);
							nlapiSendEmail(-5, paramErrorEmailEmpId, csbj, cmsg);
							
							log(
								'error',
								'Error Copying Sales Order Record',
								'Failed to COPY original Sales Order Internal ID '+oldId+' // '+getErrText(copyerr)
							);
						}
					}
					catch (oldrecsaveerr)
					{
						var orsbj = 'Error Processing Monthly SO Recurrence: Save Original Record Failed';
						var ormsg = 'Failed to save original record Internal ID '+oldId+
									' with script processed flag due to below error. Sales Order WAS NOT COPIED!!'+
									'<br/>'+
									getErrText(oldrecsaveerr);
						nlapiSendEmail(-5, paramErrorEmailEmpId, orsbj, ormsg);
						
						log(
							'error',
							'Error Saving Original Record',
							'Failed to save original record Internal ID '+oldId+' // '+getErrText(oldrecsaveerr)
						);
					}
				}
			} //Can Process check
			
			//Set % completed of script processing			
			var pctCompleted = Math.round(((i+1) / searchResults.length) * 100);
			nlapiGetContext().setPercentComplete(pctCompleted);
					
			//AFter each record is processed, you check to see if you need to reschedule
			if ((i+1)==750 || ((i+1) < searchResults.length && nlapiGetContext().getRemainingUsage() < 100)) 
			{
				//reschedule
				log('ERROR','Getting Rescheduled at', searchResults[i].getValue('internalid'));
				var rparam = new Object();
				
				rparam['custscript_sct51_lastprocid'] = searchResults[i].getValue('internalid');				
				nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
				break;
			}
				
		}
		
		
		
	}
	catch(procerr)
	{			
		log('ERROR','Error Copying Sales Order', getErrText(procerr));	
	}
	
		
}

