

function discProcPageInit(type) {
	//onload, grab itemJson built from parent window
	var jsonVal = opener.window.itemJson;
	
	if (jsonVal) {
		nlapiSetFieldValue('custpage_dept', jsonVal.dept);
	}
	
	//populate Item List
	if (nlapiGetFieldValue('custpage_stage')=='default') {
		
		/**
		 * As of NS v2013.1, Sublist column values are NOT editable unless it is set as Editable.
		 * You can NOT control display type of sublist form fields either.
		 * Below is workaround for this issue
		 */
		
		if (jsonVal && parseInt(jsonVal.count) > 0) {
			var line = 1;
			for (var j in jsonVal.byline) {
				nlapiSetLineItemValue('custpage_itemlist', 'custpage_il_itemid', line, jsonVal.byline[j].id);
				
				//
				nlapiSetLineItemValue('custpage_itemlist', 'custpage_il_item_type', line, jsonVal.byline[j].itemtype);
				var iitype = document.createTextNode(jsonVal.byline[j].itemtype);
				document.getElementById('custpage_il_item_type'+line).parentNode.parentNode.appendChild(iitype);
				document.getElementById('custpage_il_item_type'+line).type = 'hidden';
								
				nlapiSetLineItemValue('custpage_itemlist', 'custpage_il_linenum', line, j);
				var ild = document.createTextNode(j);
				document.getElementById('custpage_il_linenum'+line).parentNode.parentNode.appendChild(ild);
				document.getElementById('custpage_il_linenum'+line).type = 'hidden';
				
				nlapiSetLineItemValue('custpage_itemlist', 'custpage_il_itemtext', line, jsonVal.byline[j].text);
				var iit = document.createTextNode(jsonVal.byline[j].text);
				document.getElementById('custpage_il_itemtext'+line).parentNode.parentNode.appendChild(iit);
				document.getElementById('custpage_il_itemtext'+line).type = 'hidden';
				
				nlapiSetLineItemValue('custpage_itemlist', 'custpage_il_item_qty', line, jsonVal.byline[j].qty);
				var itq = document.createTextNode(jsonVal.byline[j].qty);
				document.getElementById('custpage_il_item_qty'+line).parentNode.parentNode.appendChild(itq);
				document.getElementById('custpage_il_item_qty'+line).type = 'hidden';
				
				nlapiSetLineItemValue('custpage_itemlist', 'custpage_il_item_amt', line, jsonVal.byline[j].amount);
				var iiamt = document.createTextNode(jsonVal.byline[j].amount);
				document.getElementById('custpage_il_item_amt'+line).parentNode.parentNode.appendChild(iiamt);
				document.getElementById('custpage_il_item_amt'+line).type = 'hidden';
				
				nlapiSetLineItemValue('custpage_itemlist', 'custpage_il_item_disc', line, jsonVal.byline[j].discatext);
				var iidsic = document.createTextNode(jsonVal.byline[j].discatext);
				document.getElementById('custpage_il_item_disc'+line).parentNode.parentNode.appendChild(iidsic);
				document.getElementById('custpage_il_item_disc'+line).type = 'hidden';
				
				nlapiSetLineItemValue('custpage_itemlist', 'custpage_il_item_term', line, jsonVal.byline[j].terms);
				var iiterm = document.createTextNode(jsonVal.byline[j].terms);
				document.getElementById('custpage_il_item_term'+line).parentNode.parentNode.appendChild(iiterm);
				document.getElementById('custpage_il_item_term'+line).type = 'hidden';
				
				nlapiSetLineItemValue('custpage_itemlist', 'custpage_il_item_licstatusid', line, jsonVal.byline[j].lici);
				
				nlapiSetLineItemValue('custpage_itemlist', 'custpage_il_item_licstatustxt', line, jsonVal.byline[j].lict);
				var iilictext = document.createTextNode(jsonVal.byline[j].lict);
				document.getElementById('custpage_il_item_licstatustxt'+line).parentNode.parentNode.appendChild(iilictext);
				document.getElementById('custpage_il_item_licstatustxt'+line).type = 'hidden';
				
				var ignoreType = ['Subtotal','Discount','Description'];
				if (jsonVal.byline[j].disca || ignoreType.contains(jsonVal.byline[j].itemtype)) {
					var idString = 'D/A';
					if (ignoreType.contains(jsonVal.byline[j].itemtype)) {
						idString = 'N/A';
					}
					var idisable = document.createTextNode(idString);
					
					document.getElementById('custpage_il_selection'+line).parentNode.parentNode.appendChild(idisable);
					document.getElementById('custpage_il_selection'+line).parentNode.style.display = 'none';
				}
				
				line++;
				
			}
		}
	} else {
		//item select page
		var iscount = nlapiGetLineItemCount('custpage_ditemlist');
		for (var j=1; j <= iscount; j++) {
			//disable text fields
			document.getElementById('custpage_dl_item_discount'+j).disabled = true;
			document.getElementById('custpage_dl_item_discountamt'+j).disabled = true;
		}
	}
}

function discProcFieldChanged(type, name, linenum) {
	
	/**
	if (type == 'custpage_ditemlist' && name =='custpage_dl_selection') {
	
		//enable or disable button
		var selectioncount = nlapiGetLineItemCount('custpage_ditemlist');
		var hasSelection = false;
		for (var s=1; s <= selectioncount; s++) {
			//disable text fields
			if (nlapiGetLineItemValue(type, 'custpage_dl_selection', linenum) == 'T') {
				hasSelection = true;
				break;
			}
		}
		
		//enable or disable button
		nlapiDisableField('custpage_setdiscount', !hasSelection);
	}
	*/
	return true;
}

function discProcSaveRecord(type) {
	if (nlapiGetFieldValue('custpage_stage')=='default') {
		var hasISel = false;
		var sline = nlapiGetLineItemCount('custpage_itemlist');
		
		for (var k=1; k <= sline; k++) {
			if (nlapiGetLineItemValue('custpage_itemlist', 'custpage_il_selection', k)=='T') {
				hasISel = true;
				break;
			}
		}
		
		if (!hasISel) {
			alert('Please select atleast one item to search discounts and apply for');
			return false;
		}
	}
	
	return true;
}

function setDiscountOnTrx() {
	var selectioncount = nlapiGetLineItemCount('custpage_ditemlist');
	var selArray = new Array();
	var hasError = false;
	for (var s=1; s <= selectioncount; s++) {
		//disable text fields
		if (nlapiGetLineItemValue('custpage_ditemlist', 'custpage_dl_selection', s) == 'T') {
			//check to make sure discount was selected
			//line'+j+'disc
			//var radioOps = document.getElementById('line'+s+'disc').
			var rsel = nlapiGetLineItemValue('custpage_ditemlist','custpage_dl_disc_id',s);
			if (!rsel) {
				alert('Line '+s+' you must choose a discount to apply.');
				hasError = true;
				return false;
			}
			
			//build object and add to selArray
			var arRd = document.getElementById(rsel).value.split(':::');
			var discid = arRd[1];
			var discrate = arRd[2];
			var discname = arRd[3];
			var iobj = new Object();
			iobj.line = nlapiGetLineItemValue('custpage_ditemlist','custpage_dl_linenum', s);
			iobj.discid = discid;
			iobj.discamt = nlapiGetLineItemValue('custpage_ditemlist','custpage_dl_item_discountamt', s);
			iobj.discname  = discname;
			iobj.discrate = discrate;
			iobj.itemid = nlapiGetLineItemValue('custpage_ditemlist','custpage_dl_itemid',s);
			selArray.push(iobj);
		}
	}
	
	if (!hasError && selArray.length > 0) {
		if (window.opener.updateWithDiscounts(selArray)) {
			window.ischanged = false;
			window.close();
		}		
	} else {
		alert('Please select atleast one item and appropriate discount to apply on transaction');
		return false;
	}
}

/**
 * 
 * @param rd
 */
function setDiscountValue(rd) {
	//linenum:::id:::rate:::name
	var arRd = rd.value.split(':::');
	var linenum = arRd[0];
	var discid = arRd[1];
	var discrate = arRd[2];
	var discname = arRd[3];
	var totalAmount = nlapiGetLineItemValue('custpage_ditemlist','custpage_dl_item_amount',linenum);
	if (!totalAmount) {
		totalAmount = 0.0;
	}
	
	if (discrate.indexOf('%') > -1) {
		discrate = discrate.substring(0, (discrate.indexOf('%')));
	}
	
	var discAmount = totalAmount;
	if (discrate > 0) {
		discAmount = parseFloat(totalAmount) - (parseFloat(totalAmount) * (parseFloat(discrate)/100));
	}
	
	nlapiSetLineItemValue('custpage_ditemlist','custpage_dl_item_discountamt',linenum, discAmount);
	nlapiSetLineItemValue('custpage_ditemlist','custpage_dl_item_discount',linenum, discname+' ('+discrate+')');
	nlapiSetLineItemValue('custpage_ditemlist','custpage_dl_disc_id',linenum,rd.id);
	
}