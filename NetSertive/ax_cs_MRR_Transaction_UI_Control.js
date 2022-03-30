/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       19 Mar 2014     AnJoe
 *
 */

/**
 * mrrItemJson variable is created dynamically during page load
 * var mrrItemJson = {
	"hasitems":false,
	"items":{
		[itemid]:[total value]
	}
};
 * custpage_procmrr:
 *  - Indicates if client script should be fired.
 *  - Checkbox T:Process, F:Don't Process
 */


var procMrr = false;

//amrrjson populated from ax_sl_Get_ActualMrrList_by_Customer Suitelet
//0 = new map
//-1 = no map
var amrrjson = null;

//12/9/2014 - JSON object to track Items that are being Removed
var removeItems = {};

//1/28/2015 - JSON object to track MRR Items originally ON the item list
var originalMrrItemsOnTrx = {};

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType 
 * 
 * @param {String} type Access mode: create, copy, edit
 * @returns {Void}
 */
function trxMrrPageInit(type){
	if (nlapiGetFieldValue('custpage_procmrr') == 'T') {
		procMrr = true;
	}
	
	if (procMrr) {
		if (nlapiGetFieldValue('entity')) {
			getActualMrr(nlapiGetFieldValue('entity'));
		}
		
		//1/28/2015 - Need to track what was originally ON the item list and compare it to New one Incase Clear All Lines button is used.
		//			  NetSuite does NOT trigger validateDelete when Clear All Lines button is used.
		if (type=='edit' || type=='copy') {
			for (var l=1; l <= nlapiGetLineItemCount('item'); l++) {
				//Add to JSON ONLY if item is one of mrrItemJson
				if (mrrItemJson['items'][nlapiGetLineItemValue('item','item',l)]) {
					originalMrrItemsOnTrx[nlapiGetLineItemValue('item','item',l)] = nlapiGetLineItemValue('item','item',l);
				}
			}
		}
	}
	
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @returns {Boolean} True to continue save, false to abort save
 */
function trxMrrSaveRecord(){

	if (nlapiGetFieldValue('custpage_procmrr') == 'T') {
		//12/9/2014 - Stringify removeItems JSON OBject and set it to dynamic hidden field custpage_remitems
		var remar = new Array();
		for (var r in removeItems) {
			remar.push(r);
		}
		
		//1/28/2015 - Need to run additional validation to make sure clear line button was used to remove them
		//Need to go through list of ALL Original Mrr Line Items and see if it's still there
		for (var o in originalMrrItemsOnTrx) {
			//Check to see if this item is already ON removeItems JSON
			if (!removeItems[originalMrrItemsOnTrx[o]] && nlapiFindLineItemValue('item', 'item', originalMrrItemsOnTrx[o]) < 0) {
				remar.push(originalMrrItemsOnTrx[o]);
			}
		}
		
		nlapiSetFieldValue('custpage_remitems', remar.toString());
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
function trxMrrFieldChanged(type, name, linenum){

	if (name == 'entity' && nlapiGetFieldValue(name)) {
		getActualMrr(nlapiGetFieldValue(name));
	}
	
	if (procMrr) {
		//when item changes
		if (type == 'item') {
			
			var lineItem = nlapiGetCurrentLineItemValue(type, 'item');
			
			if (name == 'item') {
				if (!lineItem || !mrrItemJson['items'][lineItem]) {
					nlapiDisableLineItemField(type, 'custpage_col_amrr', true);
					//blank out original mapping
					nlapiSetCurrentLineItemValue(type, 'custcol_ax_abmrr_item', '', true, true);
					nlapiSetCurrentLineItemValue(type, 'custcol_ax_abmrr_item_nomap', 'T', true, true);
				} else {
					dynamicActualMrrMatchCol(type);
				}
			}
			
			//track user AMRR match
			if (name == 'custpage_col_amrr') {
				if (nlapiGetCurrentLineItemValue(type, name) == '-1') {
					nlapiSetCurrentLineItemValue(type, 'custcol_ax_abmrr_item_nomap', 'T', true, true);
					nlapiSetCurrentLineItemValue(type, 'custcol_ax_abmrr_item', '', true, true);
				} else {
					var selection = nlapiGetCurrentLineItemValue(type,name);
					if (selection == 0) {
						selection = '';
					}
					nlapiSetCurrentLineItemValue(type, 'custcol_ax_abmrr_item', selection, true, true);
					nlapiSetCurrentLineItemValue(type, 'custcol_ax_abmrr_item_nomap', 'F', true, true);
				}
			}
		}
	} 
}

/**
 * Added to track user removing line items
 * @param type
 */
function trxMrrValidateDelete(type) {
	
	if (!procMrr) {
		return true;
	}
	
	if (type == 'item') {
		//grab item ID of item being removed
		var tobeRemovedItemId = nlapiGetCurrentLineItemValue(type, 'item');
		
		//Add to JSON ONLY if item is one of mrrItemJson
		if (mrrItemJson['items'][tobeRemovedItemId]) {
			removeItems[tobeRemovedItemId] = tobeRemovedItemId;
		}		
	}
	
	return true;
}

/**
 * Triggered when line is selected
 * @param type
 */
function trxMrrLineInit(type) {
	
	if (type == 'item' && procMrr) {
		
		var lineItem = nlapiGetCurrentLineItemValue(type, 'item');
		//alert(lineNumber);
		if (lineItem) {
			if (!lineItem || !mrrItemJson['items'][lineItem]) {
				nlapiDisableLineItemField(type, 'custpage_col_amrr', true);
				nlapiSetCurrentLineItemValue(type, 'custcol_ax_abmrr_item', '', true, true);
				nlapiSetCurrentLineItemValue(type, 'custcol_ax_abmrr_item_nomap', 'T', true, true);
				
			} else {
				dynamicActualMrrMatchCol(type);
			}
		} else {
			nlapiDisableLineItemField(type, 'custpage_col_amrr', true);
			nlapiSetCurrentLineItemValue(type, 'custcol_ax_abmrr_item', '', true, true);
			nlapiSetCurrentLineItemValue(type, 'custcol_ax_abmrr_item_nomap', 'T', true, true);
		}
		
	} 
	
}

function dynamicActualMrrMatchCol(type) {
	var amrrMapId = nlapiGetCurrentLineItemValue(type,'custcol_ax_abmrr_item');
	var amrrDoNotMap = nlapiGetCurrentLineItemValue(type,'custcol_ax_abmrr_item_nomap');
	
	nlapiDisableLineItemField(type, 'custpage_col_amrr', false);
	//remove and repopulate list
	nlapiRemoveLineItemOption(type, 'custpage_col_amrr', null);
	nlapiInsertLineItemOption(type, 'custpage_col_amrr', '', '', true);
	//repopulate based on AMRR for THIS Customer
	for (var am in amrrjson) {
		var optValue = am;
		var isSelected = false;
		if ((optValue == -1 && amrrDoNotMap == 'T') || (amrrMapId == optValue)) {
			isSelected = true;
		}
		nlapiInsertLineItemOption(type, 'custpage_col_amrr', optValue, amrrjson[am], isSelected);
	}
}

function getActualMrr(_custid) {
	
	try {
		var slUrl = nlapiResolveURL('SUITELET', 'customscript_ns_ax_sl_get_amrr', 'customdeploy_ns_ax_sl_get_amrr', 'VIEW')+'&trxcustomer='+_custid;
		var amrrRes = nlapiRequestURL(slUrl);
		amrrjson = eval('('+amrrRes.getBody()+')');
	} catch (amrrerr) {
		log('error','Error getting AMRR List',getErrText(amrrerr));
		alert(getErrText(amrrerr));
	}
}
