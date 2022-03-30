/**
 * Author: joe.son@audaxium.com
 * Date: 7/27/2012
 * Record: Purchas Order
 * Desc:
 * Fired on After Submit. When type is edit and createdFrom field isn't empty, it needs to pre-process the linked Trx so that ASA can be calculated properly for
 * those line items using Cost Estimate Type of "Purchase Order Rate"
 */

/**
 * Loads/Saves linked record into memory to simulate user opening record and saving. This will trigger 
 * User Event already in place that recalculates the ASA amount
 * @param type
 */

function updLinkedTrxOnAfterSubmit(type) {
	if (type == 'edit' && nlapiGetFieldValue('createdfrom')) {
		
		//has total amount has changed on this PO?
		
		//to ensure dynamic nature of this search, we first need to "Search" for this transaction and get record Type variable out.
		var flt = [new nlobjSearchFilter('internalid', null, 'anyof', nlapiGetFieldValue('createdfrom'))];
		var col = [new nlobjSearchColumn('internalid')];
			
		var trxRslt = nlapiSearchRecord('transaction', null, flt, col);
		if (trxRslt && trxRslt.length > 0) {
			var trxType = trxRslt[0].getRecordType();
			
			nlapiLogExecution('debug','created from rec type',trxType);
			
			recalcAsaOnLinkedTrx(trxType, trxRslt[0].getId());
		}
	}

}

/**
 * Helper function replicated from AX_SUE_GPCalculation
 * @param trx
 */
function recalcAsaOnLinkedTrx(trxType, id) {
	
	//load and save to fire existing AfterSubmit User Event 
	var trx = nlapiLoadRecord(trxType, id);
	
	var ALTERNATESALES = 'altsalesamt';
	var ITEMAMOUNT = 'amount';
	var RATE = 'rate';
	var COSTESTIMATE = 'costestimate';

	var OPP = 'opportunity';
	var QUOTE = 'estimate';

	var ALTSALESTOT = 'altsalestotal';
	var GPTOT = 'custbody_gp_total';
	var PROJSALESAMT = 'projaltsalesamt';
	
	var number = trx.getLineItemCount("item");
	var totalGP = 0;
	var totalCost = 0.0;
	var grossProfit;
	var amount;
		
	for (var i = 1; i <= number; i++) {
		var itemType = trx.getLineItemValue('item', 'custcol_itemtype', i);
			
		//Check if the type isn't Subtotal or Description
		if (itemType != 'Subtotal' || itemType != 'Description') {
			
			//If the type is Discount, the Gross Profit equals the rate.
			if (itemType == 'Discount') {
				grossProfit = trx.getLineItemValue('item', RATE, i);
				totalGP += parseFloat(grossProfit);
				trx.setLineItemValue('item', ALTERNATESALES, i, grossProfit);
				amount = trx.getLineItemValue('item', ITEMAMOUNT, i);
				grossProfit = amount - totalCost;
				totalGP += parseFloat(grossProfit);
				trx.setLineItemValue('item', ALTERNATESALES, i, grossProfit);
					
			} else {
				totalCost = trx.getLineItemValue('item', COSTESTIMATE, i);
				amount = trx.getLineItemValue('item', ITEMAMOUNT, i);
				grossProfit = amount - totalCost;
				totalGP += parseFloat(grossProfit);
				trx.setLineItemValue('item', ALTERNATESALES, i, grossProfit);
			}
		}
	}
	
	trx.setFieldValue(ALTSALESTOT, totalGP);
		
	if ( trxType == OPP ) {
		//totalGP = Math.min(totalGP, MAXIMUM_GP);
		trx.setFieldValue(PROJSALESAMT, totalGP);
		nlapiLogExecution('debug', 'Opportunity', 'totalGP ' + totalGP);
	} else if ( trxType == QUOTE ) {		
		trx.setFieldValue(PROJSALESAMT, totalGP);
	} else {
		trx.setFieldValue(GPTOT, totalGP);
		trx.setFieldValue(PROJSALESAMT, totalGP);
	}
	
	//make sure when saving, TO DO sourcing and TO IGNORE Mandatory Fields
	nlapiSubmitRecord(trx, true, true);
	
}