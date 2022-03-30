/**
 * Contract Management & Renewal Automation
 * User Event deployed against Sales Order and Quote.
 * {
 * 		[itemid]:{
 * 			'name':'',
 * 			'recordtype':'',
 * 			'itemtype':'',
 * 			'baseprice':'',
 * 			'tier':{
 * 				'pricelevelid':{
 * 					'pricelevelname':'',
 * 					'rate':''
 * 				},
 * 				...
 * 			}
 * 		}
 * }
*/

//Company Level Preference
var paramCraErrorNotifier = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb131_primaryerr'),
	paramCraCcNotifier = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_ccerr'),
	paramAcctNotifier = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_acctnotifier'),
	paramDefaultQuoteForm = nlapiGetContext().getSetting('SCRIPT', 'custscript_sb131_defquoteform'),
	paramNewOppFormId = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_newoppform'),
	paramRenewOppFormId = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_renewoppform'),
	paramRecurringItemTypes = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_recuritemtypeids');
	
	paramActiveStatusId = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_ctractiveid'),
	paramPendingRenewalStatusId = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_ctrpendrenewid'),
	paramRenewedStatusId = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_ctrrenewedid'),
	paramDelayedStatusId = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_ctrexpiredid'),
	paramTerminatedStatusId = nlapiGetContext().getSetting('SCRIPT','custscript_sb131_ctrterminatedid');

if (paramCraCcNotifier)
{
	paramCraCcNotifier = paramCraCcNotifier.split(',');
}

if (paramRecurringItemTypes)
{
	paramRecurringItemTypes = paramRecurringItemTypes.split(',');
}


/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType 
 * 
 * @param {String} type Access mode: create, copy, edit
 * @returns {Void}
 */
function soQuoteOppPageInit(type)
{
   
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @returns {Boolean} True to continue save, false to abort save
 */
function soQuoteOppSaveRecord()
{
	
	//ONLY for custbody_axcr_iscratrx == checked (CRA related transactions)
	//For all deployed trx record, if End Company field is NOT set, warn the user
	
	if (nlapiGetFieldValue('custbody_axcr_iscratrx') == 'T' || nlapiGetFieldValue('custpage_linechanged') == 'T')
	{
		//TODO: Need to find out WHY workflow is hiding this
		//For the time being, default end company to match billing entity
		if (!nlapiGetFieldValue('custbody_end_customer'))
		{
			nlapiSetFieldValue('custbody_end_customer', nlapiGetFieldValue('entity'));
		}

		//2/19/2016 - Validate the provide confirmation 
		if (nlapiGetFieldValue('custbody_axcr_contractanivdate') && nlapiGetFieldValue('custbody_axcr_contracttermenddt') && 
			nlapiGetFieldValue('custbody_axcr_contractanivdate') >= nlapiGetFieldValue('custbody_axcr_contracttermenddt'))
		{
			var confirmSave = confirm('This renewal opportunity is at the end of contract term. Please verify new contract term is provided');
			if (!confirmSave)
			{
				return false;
			}
		}
				
		//Need to go through and make sure Billing Start and End Dates are ALL the Same
		//AND
		//Check for Billing Start/End Date ONLY if item type is recurring.
		//	- One time elements do not utilize Billing Start and End Dates
		var lBillStart = '', 
			lBillEnd = '',
			isPotentialAddon = false;
		
		//If contract anniversary date is set, calculate lBillStart and lBillEnd
		if (nlapiGetFieldValue('custbody_axcr_contractanivdate'))
		{
			lBillStart = nlapiDateToString(
							nlapiAddDays(
									nlapiStringToDate(nlapiGetFieldValue('custbody_axcr_contractanivdate')),
									1
							)
						 );
			
			lBillEnd = nlapiDateToString(
							nlapiAddMonths(
									nlapiStringToDate(nlapiGetFieldValue('custbody_axcr_contractanivdate')),
									12
							)
					   );
		}
		
		for (var b=1; b <= nlapiGetLineItemCount('item'); b+=1)
		{
			//ONLY Check if it is part of CRA eligible Item line
			if (itemjson[nlapiGetLineItemValue('item','item',b)])
			{
				var lineStart = nlapiGetLineItemValue('item','custcol_contract_start_date',b),
					lineEnd = nlapiGetLineItemValue('item','custcol_contract_end_date',b),
					isItemRecurring = false;
				
				if (paramRecurringItemTypes.contains(itemjson[nlapiGetLineItemValue('item','item',b)].itemtype))
				{
					isItemRecurring = true;
				}
				
				//3/8/2016 - Logic added to provide Sales Team better insight on the setting contract reference
				//isPotentialAddon
				if (!isPotentialAddon && nlapiGetLineItemValue('item','custcoladd_on_installed_base',b) == 'T')
				{
					isPotentialAddon = true;
				}
				
				//If any of the line is missing start/end dates, throw an error
				if ( (!lineStart || !lineEnd) && isItemRecurring)
				{
					alert('Billing Start and/or End Dates are missing for line '+b);
					return false;
					
				}

				//Check to make sure for renewing items, original amount is filled in
				if (isItemRecurring && 
					   (
						   (
								   nlapiGetLineItemValue('item','custcol_axcr_origfullamount',b) && 
								   parseInt(nlapiGetLineItemValue('item','custcol_axcr_origfullamount',b)) == 0
						   ) 
						   || 
						   !nlapiGetLineItemValue('item','custcol_axcr_origfullamount',b)
					   ) 
				   )
				{
					alert('Missing Original Full Amount for line '+b);
					return false;
				}
				
				//Compare with previous to see if the line dates match
				//Throw error at first sign of difference
				//We ONLY allow different dates IF it's Addon or concession
				if (lBillStart && lBillEnd && isItemRecurring)
				{
					/**
					 * 6/28/2016 - Removed to allow Nina Test.
					//lBillStart != lineStart || 
					if (lBillEnd != lineEnd)
					{
						alert('All Billing Start and End Dates MUST match for all CRA module items for line '+b);
						return false;
					}
					
					//4/15/2016 - Add in validation where if start dates doesn't match up
					//			  either add on to install base or concession MUST be checked
					if (lBillStart != lineStart)
					{
						var isAddToInstall = nlapiGetLineItemValue('item','custcoladd_on_installed_base', b),
							isConcession = nlapiGetLineItemValue('item','custcolconcession', b);
						
						if (isAddToInstall != 'T' && isConcession != 'T')
						{
							alert('Billing start date can ONLY be different for Add On or Concession for line '+b);
							return false;
						}
					}
					*/
				}
				
				//Check to make sure Original Full amount is provided
				//	As long as it's not Group or EndGroup type
				if (nlapiGetLineItemValue('item', 'itemtype',b) != 'Group' &&
					nlapiGetLineItemValue('item', 'itemtype',b) != 'EndGroup' &&
					!nlapiGetLineItemValue('item', 'custcol_axcr_origfullamount',b))
				{
					alert('You MUST provide Original Full Amount on line '+b);
					return false;
				}
				
			}
		}
		
		//Check to make sure contract reference is set.
		if (isPotentialAddon && !nlapiGetFieldValue('custbody_axcr_contractreference'))
		{
			alert('You MUST provide Contract Reference to Add On to');
			return false;
		}
	}
	
	
    return true;
}


/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}
 */
function soQuoteOppFieldChanged(type, name, linenum)
{
	
	if (nlapiGetRecordType() == 'opportunity')
	{
		//alert(type+' // '+nlapiGetCurrentLineItemValue('item','item'));
		//Track if line item has been changed
		if (type=='item' && itemjson[nlapiGetCurrentLineItemValue('item','item')])
		{
			
			nlapiSetFieldValue('custpage_linechanged','T',true,true);
			
			//Check the box custbody_axcr_iscratrx if this is the case
			nlapiSetFieldValue('custbody_axcr_iscratrx','T',true,true);
		}
		
	}
	
	//--- For ALL Types Execute below item line level automations
	if (type=='item')
	{
		//IF line Item Type is Group or EndGroup, Skip customization
		if (nlapiGetCurrentLineItemValue('item', 'itemtype') != 'Group' &&
			nlapiGetCurrentLineItemValue('item', 'itemtype') != 'EndGroup')
		{
			//Triggered when Billing Start date field is modified
			if (name=='custcol_contract_start_date')
			{
				var billingStartDate = nlapiGetCurrentLineItemValue('item', 'custcol_contract_start_date');
				if (billingStartDate)
				{
					//Auto calculate 1 year end date from billing start date. == 12 Monthds - 1 day
					var oneYearEndDate = nlapiAddMonths(nlapiStringToDate(billingStartDate), 12);
					oneYearEndDate = nlapiDateToString(nlapiAddDays(oneYearEndDate, -1));
					
					if (!nlapiGetFieldValue('custbody_axcr_contractreference'))
					{
						//Automatically set end date as 365 days from Start Date
						nlapiSetCurrentLineItemValue('item', 'custcol_contract_end_date', oneYearEndDate, true, true);
					}
					else
					{
						//If Contract status is pending renewal, add 12 months to current contracts' anniversary date
						//	THIS is because contract anniversary date does NOT change until new sales order is approved.
						//	
						var contractBasedBillEnd = nlapiGetFieldValue('custbody_axcr_contractanivdate');
						if (nlapiGetFieldValue('custbody_axcr_contractstatus') == paramPendingRenewalStatusId || 
							nlapiGetFieldValue('custbody_axcr_contractstatus') == paramDelayedStatusId)
						{
							contractBasedBillEnd = nlapiDateToString(
														nlapiAddMonths(
															nlapiStringToDate(contractBasedBillEnd), 
															12
														)
												   );
						}
						
						//Grab the end date from Contract Anniversary Date field
						nlapiSetCurrentLineItemValue(
							'item','custcol_contract_end_date', 
							contractBasedBillEnd, 
							true, 
							true
						);
					}
				}
			}
			
			//Trigger when Rate or Quantity Fields are modified
			if (name == 'rate' || name=='quantity')
			{
				//Calculate Original FULL Amount as Rate * Qty
				//Calculate Original FULL Amount as Rate * Qty
				var qty = nlapiGetCurrentLineItemValue('item','quantity') || 0,
					rate = nlapiGetCurrentLineItemValue('item','rate') || 0,
					originalFullAmount = parseInt(qty)
										 *
										 parseFloat(rate);
								
				nlapiSetCurrentLineItemValue('item','custcol_axcr_origfullamount', originalFullAmount, true, true);
			}
			
			//Trigger when original full amount is set
			if (name == 'custcol_axcr_origfullamount')
			{
				nlapiSetCurrentLineItemValue('item','amount', nlapiGetCurrentLineItemValue(type,name), true, true);
			}
			
			//Trigger when Billing Start or End Date Fields are Modified
			if (name=='custcol_contract_end_date' || name=='custcol_contract_start_date' || 
				name=='quantity' || name=='custcol_axcr_origfullamount')
			{
				
				var origFullAmount = nlapiGetCurrentLineItemValue('item','custcol_axcr_origfullamount')?parseFloat(nlapiGetCurrentLineItemValue('item','custcol_axcr_origfullamount')):0,
					qty = parseInt(nlapiGetCurrentLineItemValue('item','quantity'));
				//ONLY When BOTH fields are set AND the end date does NOT match oneYearEndDate
				//	- When this happens, this means this is Add-On. The amount must be Prorated
				if (nlapiGetCurrentLineItemValue('item','custcol_contract_end_date') && 
					nlapiGetCurrentLineItemValue('item','custcol_contract_start_date') && 
					nlapiGetCurrentLineItemValue('item','custcol_axcr_origfullamount') &&
					nlapiGetCurrentLineItemValue('item','quantity') &&
					nlapiGetFieldValue('custbody_axcr_contractreference'))
				{
					//Daily Value is current custcol_axcr_origfullamount / 365
					var dailyValue = parseFloat(origFullAmount) / 365,
						dateDiff = nlapiStringToDate(nlapiGetCurrentLineItemValue('item','custcol_contract_end_date')).getTime()
								   -
								   nlapiStringToDate(nlapiGetCurrentLineItemValue('item','custcol_contract_start_date')).getTime();
					dateDiff = Math.floor(dateDiff / (24 * 60 * 60 * 1000));
					
					//Set the Value of Amount
					nlapiSetCurrentLineItemValue('item','amount', (dailyValue * dateDiff * parseInt(qty)), true, true);
				}
				else
				{
					
					nlapiSetCurrentLineItemValue('item','amount', (origFullAmount), true, true);
				}
			}
			
		}
	}
}
