/*
*
***********************************************************************/
var ALTERNATESALES = 'altsalesamt';
var COSTESTIMATETYPE = 'costestimatetype';
var ITEMAMOUNT = 'amount';
var LASTPURCHPRICE = 'LASTPURCHPRICE';
var RATE = 'rate';
var PURCHASEPRICE = 'PURCHPRICE';
var CUST = 'CUSTOM';
var ITEMDEF = 'ITEMDEFINED';
var PORATE = 'porate';
var COSTESTIMATE = 'costestimate'

var OPP = 'opportunity';
var QUOTE = 'estimate';

var ALTSALESTOT = 'altsalestotal';
var GPTOT = 'custbody_gp_total';
var PROJSALESAMT = 'projaltsalesamt';
var ESTGROSSPROFIT = 'estgrossprofit';
var REVENUETOTAL = 'projectedtotal';  // added June 16, 2014

var MAXIMUM_GP = 20000;

function beforeSubmit(type) {

	log('beforeSubmit', 'Runing the GP calculation script for event type = ' + type);  // DEBUG  // added June 16, 2014
 	if (type != 'delete' && type != 'xedit') {
		//cf = nlapiGetFieldValue('customform');
 		
		var number = nlapiGetLineItemCount('item');
		var totalGP = 0;
		var totalCost;
		var grossProfit;
		var amount;
		var totalAmount = (number > 0 ? 0.0 : nlapiGetFieldValue( REVENUETOTAL ));  // added June 16, 2014 - If there are no items keep the existing value, otherwise reset it.
		
		
		for (var i = 1; i <= number; i++) {

			var itemType = nlapiGetLineItemValue('item', 'custcol_itemtype', i)
			
			log('itemType', 'itemType for item #'  + i + ' is: ' + itemType);  // DEBUG // added June 16, 2014

			//Check if the type isn't Subtotal or Description
			if (itemType != 'Subtotal' || itemType != 'Description') {
				
				//If the type is Discount, the Gross Profit equals the rate.
				if (itemType == 'Discount') {
					grossProfit = nlapiGetLineItemValue('item', RATE, i);
					totalGP += parseFloat(grossProfit);
					nlapiSetLineItemValue('item', ALTERNATESALES, i, grossProfit);
					amount = nlapiGetLineItemValue('item', ITEMAMOUNT, i);
					grossProfit = amount - totalCost;
					totalGP += parseFloat(grossProfit);
					totalAmount += parseFloat(amount);  // added June 16, 2014
					nlapiSetLineItemValue('item', ALTERNATESALES, i, grossProfit);
				} 
				//If the Cost Estimate Type is Purchase Price, we calculate the GP with the Cost Estimate
				else if (nlapiGetLineItemValue('item', COSTESTIMATETYPE, i) == PURCHASEPRICE || nlapiGetLineItemValue('item', COSTESTIMATETYPE, i) == LASTPURCHPRICE || nlapiGetLineItemValue('item', COSTESTIMATETYPE, i) == CUST || nlapiGetLineItemValue('item', COSTESTIMATETYPE, i) == ITEMDEF) {
					totalCost = nlapiGetLineItemValue('item', COSTESTIMATE, i);
					amount = nlapiGetLineItemValue('item', ITEMAMOUNT, i);
					grossProfit = amount - totalCost;
					totalGP += parseFloat(grossProfit);
					totalAmount += parseFloat(amount);  // added June 16, 2014
					nlapiSetLineItemValue('item', ALTERNATESALES, i, grossProfit);
					log('item Review', 'Item Cost: ' + totalCost + ', Item Amount: ' + amount + ', Item GP: ' + grossProfit); // added June 16, 2014
				}
			}
		}
		log('SetBodyField', 'Setting the totalGP ' + totalGP);
		nlapiSetFieldValue(ALTSALESTOT, totalGP);
		
		if ( nlapiGetRecordType() == OPP ) {
			totalGP = Math.min(totalGP, MAXIMUM_GP);
			nlapiSetFieldValue(PROJSALESAMT, totalGP);
			nlapiSetFieldValue(REVENUETOTAL, totalAmount);  // added June 16, 2014
			log('Opportunity', 'totalGP ' + totalGP); // changed June 16, 2014
		}
		else if ( nlapiGetRecordType() == QUOTE ) {		
			nlapiSetFieldValue(PROJSALESAMT, totalGP);
			log('Quote', 'totalGP ' + totalGP); // changed June 16, 2014
		} 
		else {
			nlapiSetFieldValue(GPTOT, totalGP);
			nlapiSetFieldValue(PROJSALESAMT, totalGP);
			log('Not Opp or Quote', 'totalGP ' + totalGP); // changed June 16, 2014
		}
	}
}

function log(title, details) {  // added June 16, 2014
	nlapiLogExecution('DEBUG',title,details);  // added June 16, 2014
}

