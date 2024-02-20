/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       16 Dec 2015     jeffrb
 *
 */

/**
 * The html returned that is converted to pdf by the suitelet.
 * @param changeOrderId
 * @returns {String}
 */
function GetChangeOrderPDFHTML(changeOrderId) {
	var changeOrder = nlapiLoadRecord('customrecordrvschangeorder', changeOrderId);
	
	//Variables
	var title = 'CHANGE ORDER #' + changeOrderId;
	var model = nlapiEscapeXML(changeOrder.getFieldText('custrecordchangeorder_model'));
	var revision = nlapiEscapeXML(changeOrder.getFieldValue('custrecordchangeorder_revisionnumber'));
	var vin = nlapiEscapeXML(changeOrder.getFieldText('custrecordchangeorder_unit'));
	var serial = nlapiEscapeXML(changeOrder.getFieldValue('custrecordgd_changeorder_unitserialnum'));
	var online = changeOrder.getFieldValue('custrecordchangeorder_onlinedate');
	
	if (online == null)
		online = '';
	var offline = changeOrder.getFieldValue('custrecordchangeorder_offlinedate');
	if (offline == null)
		offline = '';
	var plant = changeOrder.getFieldText('custrecordchangeorder_location');
	
	var oldDealer = nlapiEscapeXML(trim(changeOrder.getFieldText('custrecordchangeorder_olddealer')));
	var newDealer = nlapiEscapeXML(trim(changeOrder.getFieldText('custrecordchangeorder_newdealer')));
	var oldShippingMethod = nlapiEscapeXML(trim(changeOrder.getFieldText('custrecordchangeorder_oldshippingmethod')));
	var newShippingMethod = nlapiEscapeXML(trim(changeOrder.getFieldText('custrecordchangeorder_newshippingmethod')));
	var oldFloorplanType = nlapiEscapeXML(trim(changeOrder.getFieldText('custrecordchangeorder_oldfloorplantype')));
	var newFloorplanType = nlapiEscapeXML(trim(changeOrder.getFieldText('custrecordchangeorder_newfloorplantype')));
	
	var oldDecor = nlapiEscapeXML(trim(changeOrder.getFieldText('custrecordchangeorder_olddecor')));
	var newDecor = nlapiEscapeXML(trim(changeOrder.getFieldText('custrecordchangeorder_newdecor')));

	var oldDecorId = changeOrder.getFieldValue('custrecordchangeorder_olddecor') || '';
	var newDecorId = changeOrder.getFieldValue('custrecordchangeorder_newdecor') || '';
	
	var decorIdToPrint = newDecorId != '' ? nlapiLookupField('item', newDecorId, 'itemid', false) : oldDecorId != '' ? nlapiLookupField('item', oldDecorId, 'itemid', false) : '';
	
	//Unit Information
	var unitId = nlapiEscapeXML(trim(changeOrder.getFieldValue('custrecordchangeorder_unit')));	
	var salesRep = '';
	var dealer = '';
	if(trim(unitId) != '') {
		var cols = nlapiLookupField('customrecordrvsunit', unitId, ['custrecordunit_salesrep', 'custrecordunit_dealer'], true);

		salesRep = nlapiEscapeXML(trim(cols.custrecordunit_salesrep));
		dealer = nlapiEscapeXML(trim(cols.custrecordunit_dealer));
		
	}
	
	var sales = nlapiEscapeXML(trim(changeOrder.getFieldText('custrecordchangeorder_salesapproval')));
	var plantMgr = nlapiEscapeXML(trim(changeOrder.getFieldText('custrecordchangeorder_plantmgrapproval')));
	var purchasing = nlapiEscapeXML(trim(changeOrder.getFieldText('custrecordchangeorder_purchasingapproval')));
	var changeOrderDate = changeOrder.getFieldValue('custrecordchangeorder_date');
	var printNotes = nlapiEscapeXML(changeOrder.getFieldValue('custrecordchangeorder_printnotes'));
	var notes = nlapiEscapeXML(changeOrder.getFieldValue('custrecordchangeorder_notes'));
	
	var today = getTodaysDate();
	
	var htmlPage = '<body style="font-family:Verdana, Arial, Sans-serif;font-size:12px;">';
	var mainTable = '<table style="border-color:#000000; border-style:solid; border-width:1px; width:100%;" align="center"><tr><td>';
	
	//Add Title
	var titleTable = '<table border="0" style="width:100%;">';
		titleTable += '<tr><td align="left">Revision #: ' + revision + '</td><td align="right">DATE: ' + changeOrderDate + '</td></tr>';
		titleTable += '<tr><td colspan="2"><h3 align="center">' + title + '</h3></td></tr>';
		titleTable += '</table>';
		
	var headerInfoTable = '<table border="0" style="width:100%;" cellpadding="5">';
		headerInfoTable += '<tr><td>Model #: ' + model + '</td><td>Decor: ' + decorIdToPrint + '</td><td>VIN #: ' + vin + '</td></tr>';
		headerInfoTable += '<tr><td>Online: ' + online + '</td><td>Offline: ' + offline + '</td><td>Serial #: ' + serial + '</td></tr>';
		headerInfoTable += '<tr><td>Sales Rep: ' + salesRep + '</td><td>Dealer: ' + dealer + '</td><td>Plant: ' + plant + '</td></tr>';
		
	if (printNotes == 'T') {
		headerInfoTable += '<tr><td colspan="3">Notes: ' + notes + '</td></tr>';
	}	
		
	headerInfoTable += '<tr><td colspan="3"><hr /></td></tr>';
	headerInfoTable += '</table>';
	
	var optionSublist = 'recmachcustrecordchangeorderoptions_changeorder';
	var optionTable = '';
	var addedOptions = '';
	var deletedOptions = '';
	var hasNewDealerBeenAdded = false;
	var hasOldDealerBeenAdded = false;
	
	addedOptions = '<table border="0" style="width:100%; padding-bottom:10px;border-color:#000000;border-style: solid; border-width:1px;">';
	addedOptions += '<tr><td style="padding-bottom:10px;"><b><span padding="0" margin="0" style="border-bottom:1px solid black;">ADD:</span></b></td></tr>';
	
	deletedOptions = '<table border="0" style="width:100%; padding-bottom:10px;padding-top:5px;border-color:#000000;border-style: solid; border-width:1px;">';
	deletedOptions += '<tr><td style="padding-bottom:10px;"><b><span padding="0" margin="0" style="border-bottom:1px solid black;">DELETE:</span></b></td></tr>';
	
	if (newDealer != '') {
		addedOptions += '<tr><td style="padding-bottom:5px">' + newDealer + '</td></tr>';
		deletedOptions += '<tr><td style="padding-bottom:5px">' + oldDealer + '</td></tr>';
	}
	
	if (newShippingMethod != '') {
		addedOptions += '<tr><td style="padding-bottom:5px">' + newShippingMethod + '</td></tr>';
		deletedOptions += '<tr><td style="padding-bottom:5px">' + oldShippingMethod + '</td></tr>';
	}
	
	if (newFloorplanType != '') {
		addedOptions += '<tr><td style="padding-bottom:5px">' + newFloorplanType + '</td></tr>';
		deletedOptions += '<tr><td style="padding-bottom:5px">' + oldFloorplanType + '</td></tr>';
	}
	
	if (newDecor != '') {
		addedOptions += '<tr><td style="padding-bottom:5px">' + newDecor + '</td></tr>';
		deletedOptions += '<tr><td style="padding-bottom:5px">' + oldDecor + '</td></tr>';
	}
	
	for (var i = 1; i <= changeOrder.getLineItemCount(optionSublist); i++) {
		var isAdded = changeOrder.getLineItemValue(optionSublist, 'custrecordchangeorderoptions_addoption', i);
		var isDeleted =  changeOrder.getLineItemValue(optionSublist, 'custrecordchangeorderoptions_removeopt', i);
		var option =  nlapiEscapeXML(changeOrder.getLineItemText(optionSublist, 'custrecordchangeorderoptions_option', i));
		var description =  ConvertNSFieldToString(changeOrder.getLineItemValue(optionSublist, 'custrecordchangeorderoptions_description', i));
		
		if(isAdded == 'T') {
			addedOptions += '<tr><td>' + option + ' - ' + description + '</td></tr>';
		}	
			
		if(isDeleted == 'T') {
			deletedOptions += '<tr><td>' + option + ' - ' + description + '</td></tr>';
		}	
	}
	
	addedOptions += '</table>';
	deletedOptions += '</table>';
	
	optionTable = '<table border="0" style="width:100%;"><tr><td>' + addedOptions + '</td></tr><tr><td style="padding-top:20px;">' + deletedOptions + '</td></tr></table>'; 	
		
	//Now create footer table to add sales and other approving fields
	//Add Title
	var footerTable = '<table border="0" style="width:100%;padding-top:15px;">';
		footerTable += '<tr><td>Sales: ' + sales + '</td></tr>';
		footerTable += '<tr><td>Plant MGR: ' + plantMgr + '</td></tr>';
		footerTable += '<tr><td>Purchasing: ' + purchasing + '</td></tr>';
		footerTable += '</table>';
		
	mainTable += titleTable;
	mainTable += headerInfoTable;
	
	mainTable += optionTable;
	
	mainTable += footerTable;
	
	mainTable+='</td></tr></table>';
	htmlPage += mainTable;
	htmlPage +='</body>';
	
	var today = getTodaysDate();
	
	// Try a few times if the record has collision or record has been changed error before throwing the error.  This helps prevent DevBox errors.
	var maxTryCount = 100;
	var tryCount = 1;
	while(tryCount < maxTryCount) {
		try {
			changeOrder = nlapiLoadRecord('customrecordrvschangeorder', changeOrderId);
			changeOrder.setFieldValue('custrecordchangeorder_printdate', today);
			nlapiSubmitRecord(changeOrder,false, true);
			
			break;
		} catch(err) {
			//Log error
			nlapiLogExecution('debug', 'err message', JSON.stringify(err));
    		if(err.name == 'CUSTOM_RECORD_COLLISION' || err.name == 'RCRD_HAS_BEEN_CHANGED') {
    			tryCount++;
    			continue;
    		}
    		
    		throw err;
		}
	}
	
	return htmlPage;
}