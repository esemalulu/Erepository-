/**
 * Author: Audaxium
 * Date: 4/16/2013
 * Desc:
 * Undeployed script file to assist contract manager suitelet
 */

/**
 * Fires when page completes loading or form is Reset
 * type: create, copy, edit
 */
function cmSlPageInit(type) {
	
	var nsdomain = 'https://system.netsuite.com/';

	if (window.location.href.indexOf('debugger') > -1) {
		nsdomain = 'https://debugger.netsuite.com/';
	}
	
	//when complete close and refresh to new contract header record in edit mode
	//custpage_redirectcontractid, custpage_step
	if (nlapiGetFieldValue('custpage_step')=='COMPLETE' && nlapiGetFieldValue('custpage_redirectcontractid')) {
		var contractRecUrl = nlapiResolveURL('RECORD',
											 'customrecord_acm_contractheader', 
											 nlapiGetFieldValue('custpage_redirectcontractid'),
											 'EDIT');
		window.opener.location.href = nsdomain+contractRecUrl+'&fromsl=yes';
		window.close();
		return;
	}
	
	//on page load, build JSON String 
	var itemJson = {};
	if (nlapiGetFieldValue('custpage_itemsincontract')) {
		itemJson = eval('('+nlapiGetFieldValue('custpage_itemsincontract')+')');
	}
	
	//mark and disable those items already in contract tis_ignore checked
	for (var i=1; i <= nlapiGetLineItemCount('custpage_trxitemsublist'); i++) {
		var itemId = nlapiGetLineItemValue('custpage_trxitemsublist','tis_itemid',i);
		var serial = nlapiGetLineItemValue('custpage_trxitemsublist','tis_itemserial',i);
		/**
		 * NetSuite HTML Hack to disable line item checkbox and select drop down
		 */
		if (itemJson[itemId] && itemJson[itemId].contains(serial)) {
			document.getElementById('tis_selectitem'+i+'_fs').className='checkbox_read_ck';
			nlapiSetLineItemValue('custpage_trxitemsublist','tis_select',i,'T');
			nlapiSetLineItemValue('custpage_trxitemsublist','tis_ignore',i,'T');
			document.getElementById('tis_selectitem'+i).disabled = true;
			
			//disable room select - ONLY Show as Disabled
			document.getElementById('custpage_trxitemsublist_tis_roomid'+i+'_fs').className='nldropdown effectDisabled';
			
		}
	}
	
}

/**
 * Fires when submit is pressed but prior to the form being submitted.
 * Always return true or false depending on values for the form elements are validated
 */
function cmSlSaveRecord() {
	//Make sure atleast one item is selected before submitting
	if (nlapiGetFieldValue('custpage_step')=='PROCESS') {
		var hasError = false;
		var issueLineNums = new Array();
		var validSelections = new Array();
		for (var i=1; i <= nlapiGetLineItemCount('custpage_trxitemsublist'); i++) {
			if (nlapiGetLineItemValue('custpage_trxitemsublist','tis_selectitem',i)=='T' &&
				nlapiGetLineItemValue('custpage_trxitemsublist','tis_ignore',i)!='T' &&
				nlapiGetLineItemValue('custpage_trxitemsublist','tis_roomid',i)) {
				validSelections.push(nlapiGetLineItemValue('custpage_trxitemsublist','tis_itemid',i));
				
			} else if ( nlapiGetLineItemValue('custpage_trxitemsublist','tis_ignore',i)!='T' && 
					    (nlapiGetLineItemValue('custpage_trxitemsublist','tis_selectitem',i)=='T' && !nlapiGetLineItemValue('custpage_trxitemsublist','tis_roomid',i))) {
				issueLineNums.push(i);
			}
		}
		
		if (validSelections.length==0 || issueLineNums.length > 0) {
			var issueText = '';
			if (issueLineNums.length > 0) {
				issueText = 'Following Line #s need correction: '+issueLineNums;
			}
			alert('You must select atleast one item with room identified to add to contract\n\n'+issueText);
			hasError = true;
			return false;
		}
		
		if (parseInt(nlapiGetFieldValue('custpage_totalqty')) > 55) {
			alert('Total number of items selected exceed max allowed.');
			hasError = true;
			return false;
		}
		
		if (!hasError) {
			var holdDiv = document.getElementById('PleaseHold');
			holdDiv.style.display = 'block';
			holdDiv.style.position = 'absolute';
			holdDiv.style.top='18%';
			holdDiv.style.left='35%';
			holdDiv.style.width='500px';
			holdDiv.style.border='2px solid black';
			holdDiv.style.padding='8px';
			holdDiv.style.fontSize = '12px';
			holdDiv.style.fontWeight = 'bold';
			holdDiv.style.backgroundColor = '#FFFFFF';
		}
		
	}
	
	return true;
}


/**
 * Fires whenever a field is changed by the user or system similar to onchange event in JavaScript
 * type: the sublist internal ID
 * name: Fields' internal ID
 * linenum: line number if chaning field is in sublist 
 */
function cmSlFieldChanged(type, name, linenum) {
	if (type && (name=='tis_selectitem' || name=='tis_roomid')) {
		//each time something changes on the sublist, recalculate total qty
		var newtotalqty=0;
		for (var i=1; i <= nlapiGetLineItemCount('custpage_trxitemsublist'); i++) {
			nlapiSelectLineItem(type, i);
			if (nlapiGetCurrentLineItemValue(type,'tis_selectitem')=='T' && nlapiGetLineItemValue('custpage_trxitemsublist','tis_ignore',i)!='T' && nlapiGetCurrentLineItemValue(type,'tis_roomid')) {
				newtotalqty += parseInt(nlapiGetLineItemValue(type,'tis_itemqty',i));
			}
		}
		nlapiSetFieldValue('custpage_totalqty',newtotalqty);
	}
}

function backToContractInfo() {
	var contractMgmtGeneratorUrl = nlapiResolveURL('SUITELET',
			   					   'customscript_ax_sl_contractmgmttool',
			   					   'customdeploy_ax_sl_contractmgmttool')+'&custparam_trxid='+nlapiGetFieldValue('custparam_trxid')+
			   					   '&custparam_trxtype='+nlapiGetFieldValue('custparam_trxtype');
	window.location = contractMgmtGeneratorUrl;
}


