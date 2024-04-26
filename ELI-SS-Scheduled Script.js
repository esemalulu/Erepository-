function CopyMonthlyServicesSalesOrder() 
{		
		
	//Parameter values are potentially dynamic variables that may change.
	var paramLastProcId = nlapiGetContext().getSetting('SCRIPT','custscript_sct51_lastprocid');
	
	var flt = null;	
	if (paramLastProcId)
	{
		flt = [];
		//IF the search is sorted in ASC
		flt.push(new nlobjSearchFilter('internalidnumber', null, 'greaterthan', paramLastProcId));
	}
	

	
	//Search result will be ordered either in ASC or DESC of internal ID
	var searchResults = nlapiSearchRecord(null, 'customsearch1031', flt, null);
	
	for (var i=0; searchResults && i < searchResults.length; i++)
	{		     
 	
			var oldType = searchResults[i].getRecordType();    			
			var oldId = searchResults[i].getId(); 		
			var oldRecord = nlapiLoadRecord(oldType, oldId);
		
			// Reads the value of billingschedule and assigns it to a variable called renewalValue	
			var lineNumberToKeep = oldRecord.findLineItemValue('item','class', '120');
				
			var d = new Date();
			var todayDate = parseInt(d.getDate());				
			var TrxDateOb = nlapiStringToDate(oldRecord.getFieldValue('trandate'));
			var TrxDate = parseInt(TrxDateOb.getDate());				      
	        						
				// If the "Billing Schedule" at the Main Level doesn't exist move to the Line Item level
				//Find the Line Item with Recurring Revenue as a Class Value and with a Transaction Day(DD out of MM/DD/YYYY) is equal to today 
				if (lineNumberToKeep && lineNumberToKeep >= 1 && todayDate == TrxDate)
				{
					
					oldRecord.setFieldValue('shipcarrier','ups');
					oldRecord.setFieldValue('shipmethod','');
					oldRecord.setFieldValue('custbody_aux_scriptprocessed','T');
					
					//for(var i = 1; i<=oldRecord.getLineItemCount('item'); i++) 
					//{  
						//oldRecord.setLineItemValue('item', 'isclosed', i, 'T');  // check the 'Closed' column
					//} 
					
					oldId = nlapiSubmitRecord(oldRecord, true);
											
					// Declares a new OBJECT variable and assigns a copy of the old sales order to it
					var newRecord = nlapiCopyRecord(oldType,oldId,{recordmode:'dynamic',customform: '153'}); 
					
					//var TrxDateOb = nlapiStringToDate(newRecord.getFieldValue('trandate')); 
					//var TrxMnth = TrxDateOb.setMonth(10);	
					//var TrxDay = TrxDateOb.setDate(15);
		
					newRecord.setFieldValue('orderstatus','B');	                     
					newRecord.setFieldValue('custbody23','');
					newRecord.setFieldValue('custbody_aux_scriptprocessed','F');					
					newRecord.setFieldValue('custbody_adx_to_be_invoiced','F');
					newRecord.setFieldValue('custbody26','F');
					newRecord.setFieldValue('custbody27','F');
										
					//newRecord.setFieldValue('getauth','T');															
					//newRecord.setFieldValue('trandate',nlapiDateToString(TrxDateOb));

						for ( var k = 1; k <= newRecord.getLineItemCount('item'); k++)
						{
								
							var cls = newRecord.getLineItemValue('item', 'class', k);																				
							//If the Line Item Class value doesn't equal "Recurring Revenue" then remove the line item
							if(cls != '120' )
							{				
								newRecord.removeLineItem('item', k);
								k=1;
							}
							else
							{														
							var unitPrice = newRecord.getLineItemValue('item', 'rate', k);	
							var qty = newRecord.getLineItemValue('item', 'quantity', k);

							newRecord.selectLineItem('item', k);  
							newRecord.setCurrentLineItemValue('item', 'quantity','1');
							newRecord.setCurrentLineItemValue('item','billingschedule', '16');								
							newRecord.setCurrentLineItemValue('item', 'amount', qty*unitPrice);
							newRecord.commitLineItem('item');
							
							}						
				
						}	
							nlapiSubmitRecord(newRecord);			
				}
																

																
			//Set % completed of script processing			
			var pctCompleted = Math.round(((i+1) / searchResults.length) * 100);
			nlapiGetContext().setPercentComplete(pctCompleted);
					
			//AFter each record is processed, you check to see if you need to reschedule
			if ((i+1)==10 || ((i+1) < searchResults.length && nlapiGetContext().getRemainingUsage() < 100)) 
			{
				//reschedule
				//log('ERROR','Getting Rescheduled at', searchResults[i].getValue('internalid'));
				var rparam = new Object();
				
				rparam['custscript_sct51_lastprocid'] = searchResults[i].getValue('internalid');				
				nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
				break;
			}
		
	}
		
}
	
	
