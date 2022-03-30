/**
 * User event is deployed against item fulfillment record.
 * It is triggered on Before Load to sync up "Shipping Instruction Memo" field value
 * on Sales order and sync it up to "reference1fedex" column field on each line of "packagefedex" sublist.
 * 
 * This should ONLY trigger if Sales Order HAS a value on the shipping instruction memo field
 * AND
 * package line DOES NOT have value for "reference1fedex" column field value
 * 
 * Version    Date            Author           Remarks
 * 1.00       17 Jun 2016     json
 *
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
function itmFulfillBeforeLoad(type, form, request)
{
	log('debug','type',type);
	//ONLY for User Interface
	if ( (type == 'create' || type == 'edit') &&
		 nlapiGetContext().getExecutionContext()=='userinterface' && 
		 nlapiGetFieldValue('createdfrom'))
	{
		//Grab value of custbody4 (Shipping Instrcution Memo) on sales order
		var shipInstrMemo = nlapiLookupField('salesorder', nlapiGetFieldValue('createdfrom'), 'custbody4', false);
		
		//Add custom hidden field for client side script to reference
		var hiddenRefFld = form.addField('custpage_shipinstr', 'text', 'Shipping Instr Memo', null, null);
		hiddenRefFld.setDefaultValue(shipInstrMemo);
		hiddenRefFld.setDisplayType('hidden');
		//ONLY execute further if we have a value
		
	}
}

//-------------------------- Client Side Scripts -------------------------
/**
 * Client side scripts will trigger to sync the values together. 
 * On page init as well as on line init
 */
function ifShipSyncPageInit(type)
{
	if ((type == 'create' || type == 'edit') &&
		nlapiGetContext().getExecutionContext()=='userinterface')
	{
		//When page initializes, check to see if we need to set the defaults to existing lines
		var pfxCount = nlapiGetLineItemCount('packagefedex');
		
		for (var p=1; p <= pfxCount; p+=1)
		{
			nlapiSelectLineItem('packagefedex', p);
			if (!nlapiGetCurrentLineItemValue('packagefedex', 'reference1fedex') && 
				nlapiGetFieldValue('custpage_shipinstr'))
			{
				nlapiSetCurrentLineItemValue(
					'packagefedex', 
					'reference1fedex', 
					(nlapiGetFieldValue('custpage_shipinstr')?nlapiGetFieldValue('custpage_shipinstr').substring(0,40):''), 
					false, 
					true
				);
				
				//nlapiCommitLineItem('packagefedex');
			}
		}
	}
	
	
}

//ONLY execute against packagefedex line init by USER
function ifShipSyncLineInit(type)
{
	if (type == 'packagefedex' && nlapiGetContext().getExecutionContext()=='userinterface')
	{
		var lineRefValue = nlapiGetCurrentLineItemValue(type, 'reference1fedex');
		if (!lineRefValue && nlapiGetFieldValue('custpage_shipinstr'))
		{
			nlapiSetCurrentLineItemValue(
				'packagefedex', 
				'reference1fedex', 
				(nlapiGetFieldValue('custpage_shipinstr')?nlapiGetFieldValue('custpage_shipinstr').substring(0,40):''), 
				false, 
				true
			);
		}
		//alert(type+' // '+lineRefValue);
	}
	
}