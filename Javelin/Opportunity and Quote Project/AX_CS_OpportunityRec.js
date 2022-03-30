/**
 * Author: joe.son@audaxium.com
 * Date: 3/8/2013
 * Desc:
 * Client level script deployed for Opportunity/Quote at record level.
 */

/**
 * function called by Suitelets' client script to add items to Opportunity line
 */
function setItemsFromConfigurator(aritems) {
	//loop through aritems and add selected items from Configurator Suitelet
	for (var i=0; i < aritems.length; i++) {
		try {
			nlapiSelectNewLineItem('item');
			nlapiSetCurrentLineItemValue('item', 'item', aritems[i].id, true, true);
			nlapiSetCurrentLineItemValue('item', 'quantity', aritems[i].qty, true, true);
			nlapiSetCurrentLineItemValue('item', 'department', aritems[i].deptid, true, true);
			nlapiSetCurrentLineItemValue('item', 'class', aritems[i].classid, true, true);
			nlapiSetCurrentLineItemText('item', 'taxcode', 'Exempt', true, true);
			nlapiCommitLineItem('item');
		} catch (e) {
			alert(e.toString());
		}
		
	}
	
}