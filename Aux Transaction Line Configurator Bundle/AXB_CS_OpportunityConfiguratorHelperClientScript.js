/**
 * Author: joe.son@audaxium.com
 * Date: 3/8/2013
 * Desc:
 * Client level script that provides helper functions to Opportunity Configurator. 
 * Script record is created so that it can be applied programmatically from the Suitelet 
 * but IT IS NEVER DEPLOYED
 */

/************* Suitelet UI Helper Client Function *******************/
/**
 * [filter]:{
 *  filtertext:[filtertextvalue],
 * 	items:{
 *   [itemid]:{
 *   	itemtext:[item text],
 *   	relateditems:Array
 *   },
 *   ...
 *  },
 * }
*/
function configSlFieldChange(type, name, linenum) {
	if (name == 'custpage_userflt' && nlapiGetFieldValue(name)) {
		//clear item drop down list
		try {
			var jsoneval = eval('('+nlapiGetFieldValue('custpage_jsonval')+')');
			nlapiRemoveSelectOption('custpage_lvloneitem', null);
			
			if (jsoneval[nlapiGetFieldValue(name)]) {
				var filterItems = jsoneval[nlapiGetFieldValue(name)]['items'];
				for (var t in filterItems) {
					nlapiInsertSelectOption('custpage_lvloneitem', t, filterItems[t].itemtext, false);
				}
			}
		} catch (evalError) {
			alert('Unable to get related items for '+nlapiGetFieldText(name)+': '+evalError.toString());
		}
	}
}

/**
 * ON Save, Go through the item JSON and build comma separated list of ALL Selected Items:
 * 	- What is selected as First Level
 * 	- relateditems of each of selected first level
 */
function configSlOnSave() {
	
	var userTopLvlSel = nlapiGetFieldValues('custpage_lvloneitem');
	if (!userTopLvlSel || userTopLvlSel.length == 0) {
		alert('You must select atleast one top level Items to search for Related items');
		return false;
	}
	
	//custpage_allitems
	var jsoneval = eval('('+nlapiGetFieldValue('custpage_jsonval')+')');
	
	var arAllItems = [];
	for (var j=0; j < userTopLvlSel.length; j++) {
		//first add in top level item user selected
		if (!arAllItems.contains(userTopLvlSel[j])) {
			arAllItems.push(userTopLvlSel[j]);
		}
		
		//Grap related items of Top level item in context
		var tempRelItems = jsoneval[nlapiGetFieldValue('custpage_userflt')]['items'][userTopLvlSel[j]].relateditems;
		if (tempRelItems && tempRelItems.length > 0) {
			//loop through and add ONLY new ones
			for (var k=0; k < tempRelItems.length; k++) {
				if (!arAllItems.contains(tempRelItems[k])) {
					arAllItems.push(tempRelItems[k]);
				}
			}
		}		
	}
	
	nlapiSetFieldValue('custpage_allitems', arAllItems.toString());
	
	return true;
}

function CancelClose() {
	window.ischanged = false;
	window.close();
}

/**
 * Function to search new
 */
function searchForNew() {
	var selUrl = nlapiResolveURL('SUITELET','customscript_ax_sl_lineitemwiz_config','customdeploy_ax_sl_lineitemwiz_config');
	window.ischanged = false;
	window.location.href = selUrl;
}

/**
 * Function to add selected items to opportunity
 */
function addToTransaction() {
	
	var arItems = new Array();
	var unChecked = 0;
	//line count
	var linecnt = nlapiGetLineItemCount('custpage_itemlist');
	//loop through and build array of items to push back to opportunity client script
	for (var i=1; i <= linecnt; i++) {
		var itemobj = new Object();
		if (nlapiGetLineItemValue('custpage_itemlist','item_select', i)!='T') {
			unChecked++;
		} else {
			
			itemobj.id = nlapiGetLineItemValue('custpage_itemlist','item_internalid', i);
			itemobj.qty = nlapiGetLineItemValue('custpage_itemlist','item_qty', i);
						
			arItems.push(itemobj);
			
		}
	}
	
	if (unChecked == linecnt) {
		alert('You must select atleast one item to add. It is recommended that you add all');
		return false;
	}
	
	/**
	var conf = confirm('Please note that your screen may freeze while selected items are added to transaction window. Do you wish to continue?');
	if (!conf) {
		return;
	}
	*/
	
	//window.opener.setItemsFromConfigurator(arItems);
	var proceed = true;
	if (window.opener.nlapiGetLineItemCount('item') > 0) {
		proceed = confirm('There are items already on the transaction. This will Remove all current items and replace with these selection \n Continue? ');
	}
	
	if (proceed) {
		var lineCount = window.opener.nlapiGetLineItemCount('item');
		for (var l=lineCount; l >= 1; l--) {
			window.opener.nlapiRemoveLineItem('item', l);
		}
		
		//alert(aritems.length);
		for (var i=0; i < arItems.length; i++) {
			try {
				window.opener.nlapiSelectNewLineItem('item');
				window.opener.nlapiSetCurrentLineItemValue('item', 'item', arItems[i].id, true, true);
				window.opener.nlapiSetCurrentLineItemValue('item', 'quantity', arItems[i].qty, true, true);
				window.opener.nlapiCommitLineItem('item');
			} catch (e) {
				alert(e.toString());
			}
			
		}
		
	}
	
	CancelClose();
}

