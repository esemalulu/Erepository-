/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       15 Mar 2016     Fan
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @returns {Boolean} True to continue save, false to abort save
 */
function Es_ValidateItem_clientSaveRecord(){
	var group = 'itemvendor';
	var count = nlapiGetLineItemCount(group);
	var found = false;
	for (var l = 1; l <= count; l += 1) {
		if (nlapiGetLineItemValue(group, 'subsidiary', l) == '12' && //Canadian Operations
				nlapiGetLineItemValue(group, 'preferredvendor', l) == 'T') {
			nlapiSelectLineItem('itemvendor', l);
			var sub = nlapiViewCurrentLineItemSubrecord('itemvendor', 'itemvendorprice');
			if (sub) {
				var lines = sub.getLineItemCount('itemvendorpricelines');
				nlapiCancelLineItem('itemvendor');
				if (lines > 0){
					found = true;
					break;
				}
			}
		}
	}
	if (!found && count != -1) {
		alert('You are missing a preferred vendor for the Canadian Operations Partnership subsidiary and/or the purchase price.');
		return false;
	}
    return true;
}
