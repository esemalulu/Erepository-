//recmachcustrecord_acmcisc_supportcase
/**
* Author: Audaxium
* Record: Case (supportcase)
* Supports contract Item configurator related actions.
*/

/**
 * Fires when page completes loading or form is Reset
 * type: create, copy, edit
 */
function casePageInit(type) {
	
	//check to see if this case page was loaded from SL 
	if (type == 'create' && nlapiGetFieldValue('custpage_citems_sl')) {
		var arcitems = nlapiGetFieldValue('custpage_citems_sl').split(',');
		for (var j=0; arcitems && j < arcitems.length; j++) {
			//add in the contract items
			nlapiSelectNewLineItem('recmachcustrecord_acmcisc_supportcase');
			nlapiSetCurrentLineItemValue('recmachcustrecord_acmcisc_supportcase', 'custrecord_acmcisc_contractitem', arcitems[j], true, true);
			nlapiCommitLineItem('recmachcustrecord_acmcisc_supportcase');
		}
	}
	
	var onCaseAlready = '';
	//loop through recmachcustrecord_acmcisc_supportcase sublist and add in already existing contract items
	var cicount = nlapiGetLineItemCount('recmachcustrecord_acmcisc_supportcase');
	for (var i=1; i <= cicount; i++) {
		onCaseAlready += nlapiGetLineItemValue('recmachcustrecord_acmcisc_supportcase','custrecord_acmcisc_contractitem',i)+',';
	}
	//remove last comma
	if (onCaseAlready.length > 0) {
		onCaseAlready = onCaseAlready.substring(0, (onCaseAlready.length - 1));
	}
	
	nlapiSetFieldValue('custpage_oncase',onCaseAlready);
}


/**
 * Fires after a line has been added to a sublist. 
 * type: the sublist Internal ID
 */
function caseRecalc(type) {
	
	if (type == 'recmachcustrecord_acmcisc_supportcase') {
		var onCaseAlready = '';
		//loop through recmachcustrecord_acmcisc_supportcase sublist and add in already existing contract items
		var cicount = nlapiGetLineItemCount('recmachcustrecord_acmcisc_supportcase');
		for (var i=1; i <= cicount; i++) {
			onCaseAlready += nlapiGetLineItemValue('recmachcustrecord_acmcisc_supportcase','custrecord_acmcisc_contractitem',i)+',';
		}
		//remove last comma
		if (onCaseAlready.length > 0) {
			onCaseAlready = onCaseAlready.substring(0, (onCaseAlready.length - 1));
		}
		
		nlapiSetFieldValue('custpage_oncase',onCaseAlready);
	}
}

function caseFieldChanged(type, name, linenum) {
	
	
}

function openContractItemConfig() {
	var companyId = nlapiGetFieldValue('company')?nlapiGetFieldValue('company'):'';
	
	if (!companyId) {
		alert('Please select customer first');
		return false;
	}
	
	var newCaseGeneratorUrl = nlapiResolveURL('SUITELET',
				  'customscript_ax_sl_contractitem_config',
				  'customdeploy_ax_sl_contractitem_config')+'&custpage_contractheader=&custpage_customerid='+companyId+
				  '&custpage_rectype='+nlapiGetRecordType()+'&custpage_existing='+nlapiGetFieldValue('custpage_oncase');
	
	window.open(newCaseGeneratorUrl, '', 'width=1100,height=750,resizable=yes,scrollbars=yes');
}

/**
 * Called by Contract Item Config Suitlet
 * @param _ciarray
 */

function addToCaseFromSl(_ciarray) {
	for (var j=0; _ciarray && j < _ciarray.length; j++) {
		//add in the contract items
		nlapiSelectNewLineItem('recmachcustrecord_acmcisc_supportcase');
		nlapiSetCurrentLineItemValue('recmachcustrecord_acmcisc_supportcase', 'custrecord_acmcisc_contractitem', _ciarray[j], true, true);
		nlapiCommitLineItem('recmachcustrecord_acmcisc_supportcase');
	}
}