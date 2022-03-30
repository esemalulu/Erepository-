/**
 * Author: joe.son@audaxium.com
 * Date: 3/8/2013
 * Desc:
 * Client level script that provides helper functions to Opportunity Configurator. 
 * Script record is created so that it can be applied programmatically from the Suitelet 
 * but IT IS NEVER DEPLOYED
 */

function configSlFieldChange(type, name, linenum) {
	if (name == 'custpage_deptflt' && nlapiGetFieldValue(name)) {
		//clear item drop down list
		try {
			var jsoneval = eval('('+nlapiGetFieldValue('custpage_jsonval')+')');
			nlapiRemoveSelectOption('custpage_lvloneitem', null);
			
			var deptItems = jsoneval[nlapiGetFieldValue(name)]['items'];
			nlapiInsertSelectOption('custpage_lvloneitem', '', '', true);
			for (var t in deptItems) {
				nlapiInsertSelectOption('custpage_lvloneitem', t, deptItems[t], false);
			}
			
		} catch (evalError) {
			alert('Unable to get related items for '+nlapiGetFieldText(name)+': '+evalError.toString());
		}
		
		
	}
}

function CancelClose() {
	window.ischanged = false;
	window.close();
}

/**
 * Function to add selected items to opportunity
 */
function addToTransaction() {
	var conf = confirm('Please note that your screen may freeze while selected items are added to transaction window. Do you wish to continue?');
	if (!conf) {
		return;
	}
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
			itemobj.deptid = nlapiGetLineItemValue('custpage_itemlist','item_dept', i);
			itemobj.classid = nlapiGetLineItemValue('custpage_itemlist','item_class',i);
			
			//make sure dept and class is set
			if (!itemobj.deptid || !itemobj.classid) {
				alert('Department and/or Class is not set for line #'+i);
				return false;
			}
			
			arItems.push(itemobj);
			
		}
	}
	
	if (unChecked == linecnt) {
		alert('You must select atleast one item to add. It is recommended that you add all');
		return false;
	}
	
	window.opener.setItemsFromConfigurator(arItems);
	
	CancelClose();
}