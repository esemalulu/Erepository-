/**
 * Author: Audaxium
 * Date: 4/27/2013
 * Desc:
 * Undeployed script file to assist contract item config suitelet
 */

/**
 * Fires when page completes loading or form is Reset
 * type: create, copy, edit
 */
function cicSlPageInit(type) {
	
}

/**
 * Fires when submit is pressed but prior to the form being submitted.
 * Always return true or false depending on values for the form elements are validated
 */
function cmSlSaveRecord() {

}

function goToContractItem() {
	if (!nlapiGetFieldValue('custpage_contractheader')) {
		alert('You must select contract');
		return false;
	}
	
	reloadSlUrl = nlapiResolveURL('SUITELET',
				   'customscript_ax_sl_contractitem_config',
				   'customdeploy_ax_sl_contractitem_config')+'&custpage_contractheader='+nlapiGetFieldValue('custpage_contractheader')+'&custpage_customerid='+nlapiGetFieldValue('custpage_customerid')+
				   '&custpage_rectype='+nlapiGetFieldValue('custpage_rectype')+'&custpage_existing='+nlapiGetFieldValue('custpage_existing');
	window.ischanged = false;
	window.location = reloadSlUrl;
}

/**
 * Fires whenever a field is changed by the user or system similar to onchange event in JavaScript
 * type: the sublist internal ID
 * name: Fields' internal ID
 * linenum: line number if chaning field is in sublist 
 */
function cicSlFieldChanged(type, name, linenum) {
	if (name == 'custpage_customerid' && nlapiGetFieldValue(name)) {
		//reload Suitelet and pass in variables
		var reloadSlUrl = '';
		
		if (name =='custpage_customerid') {
			reloadSlUrl = nlapiResolveURL('SUITELET',
					   'customscript_ax_sl_contractitem_config',
					   'customdeploy_ax_sl_contractitem_config')+'&custpage_contractheader=&custpage_customerid='+nlapiGetFieldValue('custpage_customerid')+
					   '&custpage_rectype='+nlapiGetFieldValue('custpage_rectype')+'&custpage_existing='+nlapiGetFieldValue('custpage_existing');
			
			window.ischanged = false;
			window.location = reloadSlUrl;
		} 
	}
	
	//track contract selection made
	if (type=='custpage_contractsublist' && name=='ccs_selectcontract') {
		var chkVal = nlapiGetLineItemValue('custpage_contractsublist','ccs_selectcontract', linenum);
		var hasValueChecked = false;
		var checkedLine = '';
		if (chkVal == 'T') {
			hasValueChecked = true;
			checkedLine = linenum;
			//set the value to checked
			nlapiSetFieldValue('custpage_contractheader', nlapiGetLineItemValue('custpage_contractsublist','ccs_ctid', linenum));
			for (var i=1; i < nlapiGetLineItemCount('custpage_contractsublist'); i++) {
				if (checkedLine != i) {
					nlapiSetLineItemValue('custpage_contractsublist','ccs_selectcontract', linenum,'F');
				}
			}
		}
		
		if (!hasValueChecked) {
			nlapiSetFieldValue('custpage_contractheader', '');
		}
	}
	
}

/**
 * Calls addToCaseFromSl function defined on support case client script.
 * aux_cs_supportCaseContractItemConfigure.js
 * @returns {Boolean}
 */
function addToCaseSublist() {
	var cicount = nlapiGetLineItemCount('custpage_citemsublist');
	var arCiToAdd = new Array();
	for (var i=1; i <= cicount; i++) {
		if (nlapiGetLineItemValue('custpage_citemsublist','cis_selectitem',i)=='T') {
			arCiToAdd.push(nlapiGetLineItemValue('custpage_citemsublist','cis_citemid',i));
		}
	}
	
	if (arCiToAdd.length == 0) {
		alert('You must select atleast one contract item to add to this case');
		return false;
	}
	
	window.opener.addToCaseFromSl(arCiToAdd);
	window.ischanged = false;
	window.close();
}

//redirect the user to New Case Form. Passes in contract item information if selected
function redirectToCreateCase() {
	var contractItems = '';
	var cicount = nlapiGetLineItemCount('custpage_citemsublist');
	for (var i=1; i <= cicount; i++) {
		if (nlapiGetLineItemValue('custpage_citemsublist','cis_selectitem',i)=='T') {
			contractItems += nlapiGetLineItemValue('custpage_citemsublist','cis_citemid',i)+',';

		}
	}
	//remove last comma
	if (contractItems.length > 0) {
		contractItems = contractItems.substring(0, (contractItems.length-1));
	}
	
	var nsdomain = 'https://system.netsuite.com/';

	if (window.location.href.indexOf('debugger') > -1) {
		nsdomain = 'https://debugger.netsuite.com/';
	}
	
	var newCaseUrl = nlapiResolveURL('RECORD', 'supportcase')+'?reqcustomer='+nlapiGetFieldValue('custpage_customerid')+'&reqcontractitems='+contractItems;
	
	window.ischanged = false;
	window.opener.location.href = nsdomain+newCaseUrl+'&fromsl=yes';
	window.close();
	
}


