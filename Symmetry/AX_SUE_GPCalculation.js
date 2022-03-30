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

//var MAXIMUM_GP = 20000;



 function beforeSubmit(type){
	var ctx = nlapiGetContext();
	//Note: Only Execute this Script when it's done through user interface. 
	//      There seems to be a bug when Trx is loaded and saved via another User Event Script, this is NOT fired.
 	if (type != 'delete' && type != 'xedit' && ctx.getExecutionContext()=='userinterface') {
 		//if (nlapiGetFieldValue('customform') == 132 || nlapiGetFieldValue('customform') == 133 || nlapiGetFieldValue('customform') == 134 || nlapiGetFieldValue('customform') == 131 || nlapiGetFieldValue('customform') == 102 || nlapiGetFieldValue('customform') == 121 || nlapiGetFieldValue('customform') == 123 || nlapiGetFieldValue('customform') == 126 || nlapiGetFieldValue('customform') == 101 || nlapiGetFieldValue('customform') == 103 || nlapiGetFieldValue('customform') == 107 || nlapiGetFieldValue('customform') == 112 || nlapiGetFieldValue('customform') == 119 || nlapiGetFieldValue('customform') == 109 || nlapiGetFieldValue('customform') == 97) 
		{
 		
 			var number = nlapiGetLineItemCount("item");
 			var totalGP = 0;
 			var totalCost;
 			var grossProfit;
 			var amount;
 			
 			
 			for (var i = 1; i <= number; i++) {
 				var itemType = nlapiGetLineItemValue('item', 'custcol_itemtype', i)
 				
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
							nlapiSetLineItemValue('item', ALTERNATESALES, i, grossProfit);
							
						//If the Cost Estimate Type is Purchase Price, we calculate the GP with the Cost Estimate
						} else {
						/**
						if (nlapiGetLineItemValue('item', COSTESTIMATETYPE, i) == PURCHASEPRICE || nlapiGetLineItemValue('item', COSTESTIMATETYPE, i) == LASTPURCHPRICE || nlapiGetLineItemValue('item', COSTESTIMATETYPE, i) == CUST || nlapiGetLineItemValue('item', COSTESTIMATETYPE, i) == ITEMDEF) {
						*/
							totalCost = nlapiGetLineItemValue('item', COSTESTIMATE, i);
							amount = nlapiGetLineItemValue('item', ITEMAMOUNT, i);
							grossProfit = amount - totalCost;
							totalGP += parseFloat(grossProfit);
							nlapiSetLineItemValue('item', ALTERNATESALES, i, grossProfit);
						}
					}
				}
				nlapiLogExecution('debug', 'SetBodyField', 'Setting the totalGP ' + totalGP);
				nlapiSetFieldValue(ALTSALESTOT, totalGP);
				
				if ( nlapiGetRecordType() == OPP ) {
					//totalGP = Math.min(totalGP, MAXIMUM_GP);
					nlapiSetFieldValue(PROJSALESAMT, totalGP);
					nlapiLogExecution('debug', 'Opportunity', 'totalGP ' + totalGP);
				} else if ( nlapiGetRecordType() == QUOTE ) {		
					nlapiSetFieldValue(PROJSALESAMT, totalGP);
				} else {
					nlapiSetFieldValue(GPTOT, totalGP);
					nlapiSetFieldValue(PROJSALESAMT, totalGP);
				}
			}
		}
	}