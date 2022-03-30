/**
 * User Event deployed at the Sales Order record level to swap out 
 * Item Kit with Item Group
 * 
 * Customization detail:
 * 1. New custom item field:
 * 		- Matching Item Group (custitem_ax_macthingitemgroup)
 * 		  Field is filtered to ONLY display Item Group records and marked to be displayed ONLY on Item Kit form
 * 
 * 2. New custom transaction column field:
 * 		- Total Kit price, quantity, description and price level?
 * 
 * 3. Script to fire before submit	
 * 
 * Version    Date            Author           Remarks
 * 1.00       29 Apr 2016     json
 *
 */

var paramErrNotifier = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb37_errnotif'),
	paramCcErrNotifier = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb37_ccerrnotif'),
	paramPendApprReason = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb37_pendapprreason');

if (paramCcErrNotifier)
{
	//Turn it into an array
	paramCcErrNotifier = paramCcErrNotifier.split(',');
	//Go through and make sure there are no spaces before and after email address
	for (var p=0; p < paramCcErrNotifier.length; p+=1)
	{
		paramCcErrNotifier[p] = strTrim(paramCcErrNotifier[p]);
	}
}
else
{
	paramCcErrNotifier = null;
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
function soSwapBeforeSubmit(type)
{
	try
	{
		//1. Grab list of all items on the line that is item kit
		/**
		{
			[itemid-line]:{
				'itemid':xx,,
				'qty':xx,
				'line':xx,
				'rate':xx,
				'amount':xx,
				'lineclass':xx,
				'igid':xx
			},
			...
		}
		*/		
		var itemKitJson = {},
			//array of item kit IDs
			kitList = [];
		
		for (var i=1; i <= nlapiGetLineItemCount('item'); i+=1)
		{
			var itemType = nlapiGetLineItemValue('item','itemtype', i),
				itemId = nlapiGetLineItemValue('item','item',i);
			
			if (itemType == 'Kit' && !kitList.contains(itemId))
			{
				//Build unique list of all item kit ids
				kitList.push(itemId);
				
				//Add in unique line information 
				itemKitJson[itemId+'-'+i] = {
					'itemid':itemId,
					'qty':nlapiGetLineItemValue('item','quantity',i),
					'line':i,
					'rate':nlapiGetLineItemValue('item','rate',i),
					'amount':nlapiGetLineItemValue('item','amount',i),
					'lineclass':nlapiGetLineItemValue('item','class',i),
					'taxcode':nlapiGetLineItemValue('item','taxcode',i)
				};
			}
		}
		
		log('debug','Item Kit JSON', JSON.stringify(itemKitJson));
		log('debug','Line Kit', kitList);
		
		//2. Do a search against Item Data ONLY if there are Item Kit on the Sales Order
		if (kitList.length > 0)
		{
			var itemflt = [new nlobjSearchFilter('internalid', null, 'anyof', kitList),
			               new nlobjSearchFilter('custitem_ax_macthingitemgroup', null, 'noneof', '@NONE@'),
			               new nlobjSearchFilter('isinactive', null, 'is', 'F')],
			    itemcol = [new nlobjSearchColumn('internalid'),
			               new nlobjSearchColumn('custitem_ax_macthingitemgroup')],
			    itemrs = nlapiSearchRecord('item', null, itemflt, itemcol),
			    itemGrpMap = {};
			
			//Execute Item Kit swap with mapped Item Group ONLY if there is/are results
			//*************************** BEGIN CORE **************************************************************************/
			if (itemrs && itemrs.length > 0)
			{
				//3. Loop through each result and build item kit to item group map
				for (var g=0; g < itemrs.length; g+=1)
				{
					itemGrpMap[itemrs[g].getValue('internalid')] = itemrs[g].getValue('custitem_ax_macthingitemgroup');
				}
				
				log('debug','itemGrpMap', JSON.stringify(itemGrpMap));
				
				//4. Loop from last line of the item list and REMOVE Item Kid with Mapped Item Group
				var lineCount = nlapiGetLineItemCount('item');
				for (var w=lineCount; w >= 1; w-= 1)
				{
					//5. If this item exists in itemGrpMap, Remove form the line
					if (itemGrpMap[nlapiGetLineItemValue('item','item',w)])
					{
						//Remove the item Kit Line
						nlapiRemoveLineItem('item', w);
					}
				}
				
				//6. Now Loop through itemKitJson JSON and add in Item Group
				//	 Item groups are added as NEW line because item groups will expand once added and grouped together with Group and EndGroup lines
				//	 Adding against new line ensures that existing lines are not affected by addition.
				for (var kg in itemKitJson)
				{
					//Each element is item kit ID plus Line.
					//	- This will take care and swap out duplicate kit on different line.
					if (itemGrpMap[itemKitJson[kg].itemid])
					{
						nlapiSelectNewLineItem('item');
						nlapiSetCurrentLineItemValue('item', 'item', itemGrpMap[itemKitJson[kg].itemid], true, true);
						nlapiSetCurrentLineItemValue('item', 'quantity', itemKitJson[kg].qty, true, true);
						nlapiSetCurrentLineItemValue('item', 'class', itemKitJson[kg].lineclass, true, true);
						
						//Set hidden original item kit amount for this Group. 
						//	This value will be compared AFTER Submit to make sure the values are the same
						nlapiSetCurrentLineItemValue('item','amount', itemKitJson[kg].amount, true, true);
						nlapiSetCurrentLineItemValue('item', 'custcol_ax_origitemkitamt', itemKitJson[kg].amount, true, true);
						nlapiCommitLineItem('item');
						
						itemKitJson[kg].igid = itemGrpMap[itemKitJson[kg].itemid];
					}
				}
				
			}
			
			nlapiSetFieldValue('custbody_ax_kitconvertedtogrp','T');
			
			//*************************** END CORE **************************************************************************/
		}
	}
	catch(swaperr)
	{
		//Generate Notification email 
		//var paramErrNotifier = nlapiGetContext().getSetting('SCRIPT', 'custscript_xx_errnotif'),
		//paramCcErrNotifier = nlapiGetContext().getSetting('SCRIPT', 'custscript_xx_ccerrnotif');
		var sbj = 'Error attempting to Swap Kit with Group - '+nlapiDateToString(new Date()),
			msg = 'Error Detail: <br/>'+
				  getErrText(swaperr)+'<br/><br/>'+
				  'Sales Order Detail: <br/>'+
				  'Event Type: '+type+'<br/>'+
				  'Order #: '+nlapiGetFieldValue('tranid')+'<br/>'+
				  'Customer: '+nlapiGetFieldText('entity')+' ('+nlapiGetFieldValue('entity')+')<br/>'+
				  'Transaction Date: '+nlapiGetFieldValue('trandate')+'<br/>'+
				  'Amount: '+nlapiGetFieldValue('amount');
		
		log('error','Error Swaping',getErrText(swaperr)+' // '+msg);
		
		nlapiSendEmail(-5, paramErrNotifier, sbj, msg, paramCcErrNotifier, null, null, null, true);
	}
}

function soSwapAfterSubmit(type)
{
	try
	{
		if ( (type=='create' || type=='edit') && nlapiGetFieldValue('custbody_ax_kitconvertedtogrp') == 'T')
		{
			
			//Loop through each line and check if we need to set PEND APPR REASON
			var lineToCheck = [];
			for (var i=1; i <= nlapiGetLineItemCount('item'); i+=1)
			{
				//Build list of line to check
				if (nlapiGetLineItemValue('item', 'custcol_ax_origitemkitamt', i))
				{
					lineToCheck.push(i);
				}
			}
			
			log('debug','After Submit Line to check', lineToCheck);
			
			for (var l=0; l < lineToCheck.length; l+=1)
			{
				//Find the item group starting line
				var igStartLine = lineToCheck[l];
				log('debug','item group item and line', igStartLine);
				
				//Assume the line is found. Loop through until item Type is EndGroup
				//itemtype 
				for (var g=igStartLine; g <= nlapiGetLineItemCount('item'); g+=1)
				{
					if (nlapiGetLineItemValue('item', 'itemtype', g) == 'EndGroup')
					{
						log('debug','end group line found','Line '+g+' end line amount = '+nlapiGetLineItemValue('item', 'amount', g));
						
						log('debug','kit original amt',nlapiGetLineItemValue('item','custcol_ax_origitemkitamt', igStartLine));
						log('debug','group amt', nlapiGetLineItemValue('item', 'amount', g));
						log('debug','equal test',(nlapiGetLineItemValue('item','custcol_ax_origitemkitamt', igStartLine) != nlapiGetLineItemValue('item', 'amount', g)));
						//Check to see if original kit amount and group amount matches
						if (nlapiGetLineItemValue('item','custcol_ax_origitemkitamt', igStartLine) != nlapiGetLineItemValue('item', 'amount', g))
						{
							//Due to This being trx, record must be loaded and saved again
							var soRec = nlapiLoadRecord('salesorder',nlapiGetRecordId());
							soRec.setFieldValue('custbody24', paramPendApprReason);
							nlapiSubmitRecord(soRec, true, true);
							
							log('debug','Resubmitted',paramPendApprReason);
							break;
						}
						
					}
				}
			}
			
		}
		
	}
	catch(amtvalerr)
	{
		//Generate Notification email 
		//var paramErrNotifier = nlapiGetContext().getSetting('SCRIPT', 'custscript_xx_errnotif'),
		//paramCcErrNotifier = nlapiGetContext().getSetting('SCRIPT', 'custscript_xx_ccerrnotif');
		var sbj = 'Error checking for Kit/Group Amount - '+nlapiDateToString(new Date()),
			msg = 'Error Detail: <br/>'+
				  getErrText(amtvalerr)+'<br/><br/>'+
				  'Sales Order Detail: <br/>'+
				  'Event Type: '+type+'<br/>'+
				  'Order #: '+nlapiGetFieldValue('tranid')+'<br/>'+
				  'Customer: '+nlapiGetFieldText('entity')+' ('+nlapiGetFieldValue('entity')+')<br/>'+
				  'Transaction Date: '+nlapiGetFieldValue('trandate')+'<br/>'+
				  'Amount: '+nlapiGetFieldValue('amount');
		
		log('error','Error Kit/Group Amount Validation',getErrText(amtvalerr)+' // '+msg);
		
		nlapiSendEmail(-5, paramErrNotifier, sbj, msg, paramCcErrNotifier, null, null, null, true);
	}
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
function soSwapBeforeLoad(type, form, request)
{
	
}

