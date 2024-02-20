/**
 * Grand Design speicifc code on the Vendor Bill transaction
 * 
 * Version    Date            Author           Remarks
 * 1.00       15 Feb 2018     Jacob Shetler
 *
 */

/**
 * Before Submit
 * 
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */
function GD_Bill_BeforeSubmit(type){
	if(type == 'create'){
		//If we're creating this Bill as a result of a Spiff, then it's a Salesman Spiff.
		//Grand Design wants the Dealer to pull into the External Memo so they can print it on the checks. See Case #8796
		var spiffId = ConvertNSFieldToString(nlapiGetFieldValue('custbodyrvscreatedfromspiff'));
		if(spiffId.length > 0)
			nlapiSetFieldValue('memo', nlapiLookupField('customrecordrvsspiff', spiffId, 'custrecordspiff_dealer', true));
		
		if(nlapiGetContext().getExecutionContext() == 'webservices'){
			// Use the GD Main Live Item Receipt Field to set the Receipts on the Items of the Bill
			var receiptId = ConvertNSFieldToString(nlapiGetFieldValue('custbodygd_mainlineitemreceipt'));
			if(receiptId.length > 0){
				for(var i = 1; i <= nlapiGetLineItemCount('item'); i++) {
					if ((nlapiGetLineItemValue('item', 'itemtype', i) != 'Description')) { //Ignore Description Items
						nlapiSetLineItemValue('item', 'billreceipts', i, nlapiGetFieldValue('custbodygd_mainlineitemreceipt'));
					}
				}
			}
		}
	}
}