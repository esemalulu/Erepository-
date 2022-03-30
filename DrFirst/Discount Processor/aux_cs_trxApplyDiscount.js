/**
 * Author: Audaxium
 * Date: 5/25/2013
 * Record: Select Transaction records
 * Desc:
 * 
 */

/**
 * Fires when page completes loading or form is Reset
 * type: create, copy, edit
 */

var itemJson = {};

function trxPageInit(type) {
	if (type == 'edit') {
		setOriginalAmount(-1);
	}
}

/**
 * Fires when submit is pressed but prior to the form being submitted.
 * Always return true or false depending on values for the form elements are validated
 */
function trxSaveRecord() {
	
}

/**
 * Fires whenever a field is changed by the user or system similar to onchange event in JavaScript
 * type: the sublist internal ID
 * name: Fields' internal ID
 * linenum: line number if chaning field is in sublist 
 */
function trxFieldChanged(type, name, linenum) {
	if (type == 'item' && (name == 'amount' || name == 'rate')) {
		setOriginalAmount(linenum);
	}	
}


/**
 * Fires following a field change once all the field's child field values are sourced from the server. 
 * Enables fieldChange style functionality to occur once all dependent field values have been set.
 * type: the sublist internal ID
 * name: fields' internal ID
 */
function trxPostSourcing(type, name) {
	
}

function setOriginalAmount(linenum) {
	if (linenum == -1) {
		//loop through all line and make sure original amount field is set 
		for (var i=1; i <= nlapiGetLineItemCount('item'); i++) {
			if (!nlapiGetLineItemValue('item','custcol_trxcol_discountapplied',i) && !nlapiGetLineItemValue('item','custcol_trxcol_original_totalamt',i)) {
				nlapiSetLineItemValue('item', 'custcol_trxcol_original_totalamt', i, nlapiGetLineItemValue('item','amount',i));
			}
		}
	} else {		
		if (!nlapiGetCurrentLineItemValue('item','custcol_trxcol_discountapplied')) {
			nlapiSetCurrentLineItemValue('item', 'custcol_trxcol_original_totalamt', nlapiGetCurrentLineItemValue('item','amount'),true,true);
		}
	}
}

function updateWithDiscounts(arlist) {
	/**
	iobj.line = nlapiGetLineItemValue('custpage_ditemlist','custpage_dl_linenum', s);
	iobj.discid = discid;
	iobj.discamt = nlapiGetLineItemValue('custpage_ditemlist','custpage_dl_item_discountamt', s);
	iobj.discname  = discname;
	iobj.discrate = discrate;
	iobj.itemid
	*/
	if (arlist && arlist.length > 0) {
		for (var u=0; u < arlist.length; u++) {
			try {
				var uobj = arlist[u];
				if (nlapiGetLineItemValue('item','item', uobj.line) == uobj.itemid) {
					
					if (uobj.discid != '-1') {
						nlapiSelectLineItem('item', uobj.line);
						nlapiSetCurrentLineItemValue('item', 'custcol_trxcol_discountapplied', uobj.discid, false, true);
						nlapiSetCurrentLineItemText('item', 'price', 'Custom', false, true);
						nlapiSetCurrentLineItemValue('item', 'amount', uobj.discamt, true, true);
						nlapiSetCurrentLineItemValue('item', 'custcol_trxcol_discountdesc', uobj.discname+' ('+uobj.discrate+') applied', false, true);
						nlapiCommitLineItem('item');
					}					
				}
			} catch (e) {
				alert(getErrText(e));
				return false;
			}			
		}
		return confirm('Successfully applied discounts. Please make sure all lines are correct before saving this transaction');
	}
	return true;
	
}

function openDiscountProcessor() {
	
	var lineCount = nlapiGetLineItemCount('item');
	if (lineCount == 0) {
		alert('You must have atleast one item for this transaction');
		return false;
	}
	
	if (!nlapiGetFieldValue('department')) {
		alert('You must select department');
		return false;
	}
	
	//item json by line number
	itemJson = {};
	itemJson['count'] = nlapiGetLineItemCount('item');
	itemJson['dept'] = nlapiGetFieldValue('department');
	itemJson['trxtype'] = nlapiGetRecordType();
	itemJson['trxid'] = nlapiGetRecordId();
	itemJson['byline'] = {};
	for (var i=1; i <= nlapiGetLineItemCount('item'); i++) {
		if (!itemJson['byline'][i]) {
			itemJson['byline'][i] = {};
		}
		
		itemJson['byline'][i]['id'] = nlapiGetLineItemValue('item','item',i);
		itemJson['byline'][i]['text'] = nlapiGetLineItemText('item','item',i);
		itemJson['byline'][i]['itemtype'] = nlapiGetLineItemValue('item','itemtype',i);
		itemJson['byline'][i]['qty'] = nlapiGetLineItemValue('item','quantity',i);
		itemJson['byline'][i]['terms'] = nlapiGetLineItemValue('item','custcol_item_terms',i);
		itemJson['byline'][i]['lici'] = nlapiGetLineItemValue('item','custcol_license_status',i);
		itemJson['byline'][i]['lict'] = nlapiGetLineItemText('item','custcol_license_status',i);
		itemJson['byline'][i]['amount'] = nlapiGetLineItemValue('item','custcol_trxcol_original_totalamt',i);
		itemJson['byline'][i]['disca'] = nlapiGetLineItemValue('item','custcol_trxcol_discountapplied',i);	
		itemJson['byline'][i]['discatext'] = nlapiGetLineItemText('item','custcol_trxcol_discountapplied',i);
	}
	
	var selUrl = nlapiResolveURL('SUITELET','customscript_aux_sl_disc_processor','customdeploy_aux_sl_disc_processor')+'&custpage_itemcount='+nlapiGetLineItemCount('item');

	nlapiSetFieldValue('custpage_hiddenitems', JSON.stringify(itemJson));
	
	window.open(selUrl, 'Processor', 'width=820,height=500,resizable=yes,scrollbars=yes');
}