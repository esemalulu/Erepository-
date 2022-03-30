/**
 * Module Description:
 * Version    Date            Author           Remarks
 * 1.00       25 Jul 2015    ELI
 */

 
 
/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */

function auxUserEvent_BeforeLoad(type, form, request) 
{

		if(nlapiGetFieldValue('baserecordtype') == 'invoice')
		{
			var entity = nlapiGetFieldValue('createdfrom');

			if(entity )
			{
			 
				try
				{
					//ONLY Show this when it's in VIEW mode
					if (type == 'view')
					{
						//9/17/2016
						//We need to make sure the Syncing was successful before enabling this Button.
						var soId = nlapiGetFieldValue('createdfrom'),
							qflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
							        new nlobjSearchFilter('custrecord_ltsq_salesorder', null, 'anyof', soId)],
							qcol = [new nlobjSearchColumn('internalid').setSort(true), //Grab latest created one
							        new nlobjSearchColumn('custrecord_ltsq_syncstatus')],
							qrs = nlapiSearchRecord('customrecord_ax_lactlm_sync_queue', null, qflt, qcol),
							
							//ONLY disable when it's in pending/error status.
							//	we still may want to show this button even if it is not in the queue
							disableButton = false;
						
						if (qrs && qrs.length > 0)
						{
							//If the status is pending or error disable the button
							//	this means it hasn't been processed yet
							//These values are coming from License Integration Status list
							//	pending = 1
							//	error = 3
							if (qrs[0].getValue('custrecord_ltsq_syncstatus') == 1 ||
								qrs[0].getValue('custrecord_ltsq_syncstatus') == 3)
							{
								disableButton = true;
							}
						}
						
						//Add Button to the Opportunity Record labled "Send Fulfillment" and call the Suitelet "AUX-Opportunity Resource Email"
						var ResourceUrl = nlapiResolveURL('SUITELET', 'customscript_aux_fulfillmentemail', 'customdeploy_aux_fulfillmentemail', 'VIEW');
						
						var manualBtn = form.addButton(
							'custpage_requestResource', 
							'Send Fulfillment Email', 
							'window.open(\''+ResourceUrl+
								'&custparam_invoiceid='+nlapiGetFieldValue('id')+
								'&custparam_salesorderid='+nlapiGetFieldValue('createdfrom')+
								'\', \'\', \'width=400,height=200,resizable=no,scrollbars=no\');return true;'
						);
						
						if (disableButton)
						{
							manualBtn.setLabel('Send Fulfillment Email (Pending Sync...)');
							manualBtn.setDisabled(true);
						}
						
					}
				}
				catch (e) 
				{
							
					log('error','Button Error', getErrText(e));					
					throw nlapiCreateError('SEND_BUTTON_ERR', 'Button Error::'+getErrText(e), true);
				}
			}	
			
		}


	
}



/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */
function afterSubmit(type, form, request) 
{
	
	try
	{
	
		if(nlapiGetFieldValue('baserecordtype') == 'itemfulfillment')
		{
			if(type == 'create')	
			{
				
				var SOid = nlapiGetFieldValue('createdfrom');			
				var SOrec = nlapiLoadRecord('salesorder', SOid );
				
				//Below are all the Item Categories found on the SO that qualify for the Sync Queue
				var licPer = SOrec.findLineItemValue('item','custcol_item_category', '1'); 		//License - Perpetual (1) 
				var licTer = SOrec.findLineItemValue('item','custcol_item_category', '2'); 		//License - Term (2) 		
				var maintNew = SOrec.findLineItemValue('item','custcol_item_category', '3'); 	//Maintenance - New (3) 
				var maintRen = SOrec.findLineItemValue('item','custcol_item_category', '4');	//Maintenance - Renewal (4)	
				var contract = SOrec.getFieldValue('custbody_contract_name');
				
				//9/16/2016
				//Need to look up the contract if there is OG Contract 
				var ogContract = '';
				
				if (contract)
				{
					ogContract = nlapiLookupField('customrecord_contracts', contract, 'custrecord_swe_original_contract', false);
					
					//If ogContract is empty, set ogContract as THIS contract
					if (!ogContract)
					{
						ogContract = contract;
					}
				}
				
				if(licPer || licTer || maintNew || maintRen )
				{
					var synRec = nlapiCreateRecord('customrecord_ax_lactlm_sync_queue',  {recordmode: 'dynamic'});
					
					synRec.setFieldValue( 'custrecord_ltsq_syncstatus', '1');  	//Sync Status
					synRec.setFieldValue( 'custrecord_ltsq_ifrec', nlapiGetRecordId());		//Item Fulfillment
					synRec.setFieldValue( 'custrecord_ltsq_salesorder', SOid);	//Sales Order
					
					synRec.setFieldValue( 'custrecord_ltsq_origcontract', ogContract ); 
					synRec.setFieldValue( 'custrecord_ltsq_linkedrenewcontract', contract); 
					
					//7/29/2016 
					// Add in Sync System (custrecord_ltsq_syncsystem) TLM or LAC
					
					//9/16/2016
					// Changes requested so that Sync system correctly gets captured.
					// Mix bag of items can be possible. Not during creation process but during renewal or upsell
					//var syncSystem = 'TLM';
					var syncSystem = '',
						hasTlm = false,
						hasLac = false;
					for (var li=1; li <= nlapiGetLineItemCount('item'); li+=1)
					{
						//If any of the line has X-Formation (custcol_xformationitem) checked, treat it as LAC
						if (nlapiGetLineItemValue('item', 'custcol_xformationitem', li) == 'T')
						{
							//syncSystem = 'LAC';
							hasLac = true;
						}
						else
						{
							hasTlm = true;
						}
					}
					
					if (hasLac && hasTlm)
					{
						syncSystem = 'BOTH';
					}
					else if (hasLac && !hasTlm)
					{
						syncSystem = 'LAC';
					}
					else if (!hasLac && hasTlm)
					{
						syncSystem = 'TLM';
					}
					
					
					synRec.setFieldValue('custrecord_ltsq_syncsystem',syncSystem);
					
					try
					{
						var id = nlapiSubmitRecord(synRec);	
					}
					catch(submterr)
					{
					log('ERROR','Error Creating Sync Record', getErrText(submterr));
					}
											
				}
				
			}
							
		}	
	}
	catch(scripterr)
	{
	log('ERROR','Error Running After Submit', getErrText(scripterr));	
	}
		
}