/**
 * Module Description
 * 
 * Version Date Author Remarks 1.00 19 Dec 2017 Michael
 * 
 */

function suiteletGPExport(request, response) {
	var fromDate = request.getParameter('custpage_from_date');
	var toDate = request.getParameter('custpage_to_date');
	var vendor = request.getParameter('custpage_vendor');
	var warehouse = request.getParameter('custpage_warehouse');

	if (request.getMethod() == 'GET') {

		form = nlapiCreateForm('GP Rebate Export', false);
		form.addSubmitButton('Select');
		form.addField('custpage_from_date', 'date', 'From Date').setDisplayType('entry');
		form.addField('custpage_to_date', 'date', 'To Date').setDisplayType('entry');
		form.addField('custpage_vendor', 'text', 'Vendor').setDisplayType('entry');
		// form.addField('custpage_warehouse', 'select', 'Warehouse', 'location').setDisplayType('entry');

		response.writePage(form);

	} else if (vendor && fromDate && toDate) {
		var totalRebateAmountRequested = [];
		form = nlapiCreateForm('GP Export', false);
		list = form.addSubList('custpage_sublist', 'list', 'GP', 'general');
		var fld = form.addField('custpage_mapfield', 'inlinehtml');
		list.addField('custname', 'text', 'Customer Name');
		list.addField('custshipadd1', 'text', 'Customer Ship Address 1');
		list.addField('custshiptocity', 'text', 'Customer Ship To City');
		list.addField('custshiptostate', 'text', 'Customer Ship To State');
		list.addField('custshiptozip', 'text', 'Customer Ship To Zip');
		list.addField('productid', 'text', 'Product ID');
		list.addField('itemnumber', 'text', 'Item Number');
		list.addField('invoicedate', 'text', 'Invoice Date');
		list.addField('invoicenumber', 'text', 'Invoice Number');
		list.addField('quantity', 'text', 'Quantity');
		list.addField('distprice', 'text', 'Dist Price');
		list.addField('paprice', 'text', 'PA Price');
		list.addField('rebateid', 'text', 'PA Number');
		list.addField('endusernumber', 'text', 'End User Number');
		list.addField('itemuom', 'text', 'Item UOM');

		var filters = new Array();

		filters[0] = new nlobjSearchFilter('custcol_vendor', null, 'startswith', vendor);
		filters[1] = new nlobjSearchFilter('trandate', null, 'within', fromDate, toDate);
		// filters[2] = new nlobjSearchFilter('location', null, 'anyof', warehouse);

		var searchResults = nlapiSearchRecord(null, '829', filters);
		if (!searchResults || searchResults.length <= 0) {
			throw new Error('No results returned after executing search.');

		} else {
			var refNumber = new Array();
			refNumber = dateFormat(fromDate);
			refNumber = refNumber[2]+refNumber[0];
			
			
			var invoiceDateModified = [];
			var resultText = "";
			var headerResultText = "";
			var dunsNumber = 'DIXIEPAPER';
			var distId = '105145';
			invoiceDateModified = dateFormat(fromDate);
			debitMemoNumber = invoiceDateModified[2] + invoiceDateModified[0] + invoiceDateModified[1];
	
			// grab the total rebate amount requested
			
			for(var v=0; v < searchResults.length; v++){
				
				var resultSet1 = searchResults[v];
				columns = resultSet1.getAllColumns();
				var qty = resultSet1.getValue(columns[23]);
				var billPrice = resultSet1.getValue(columns[20]);
				var contractCost = resultSet1.getValue(columns[22]);
			
				if(contractCost == '' || contractCost == null || isNaN(contractCost)){
					contractCost = 0;
					contractCost = parseFloat(contractCost);
				}
				if(billPrice == '' || billPrice == null || isNaN(billPrice)){
					billPrice = 0;
					billPrice = parseFloat(billPrice);
				}
				billPrice = parseFloat(billPrice);
				qty = parseFloat(qty);
				contractCost = parseFloat(contractCost);
				var totalTemp = 0;
				    totalTemp  = ((qty * billPrice) - (qty * contractCost));
				    // check for blanks and NaN
					if(totalTemp !== totalTemp){
						throw new Error(v);
						totalTemp = 0;
					}else{
					//	throw new Error("Fail "+v);
					//	totalTemp = parseFloat(totalTemp);
					//	totalTemp = totalTemp.toFixed(2);
						//totalRebateAmountRequested.push(totalTemp);
					}
				    totalTemp = parseFloat(totalTemp);
					totalTemp = totalTemp.toFixed(2);
					totalRebateAmountRequested.push(totalTemp);
				
				
				// stopped here
				
			}
			var temp5 = 0;
			for(var t = 0; t < totalRebateAmountRequested.length; t++){
				
				var temp8 = totalRebateAmountRequested[t];
				temp5 = parseFloat(temp5);
				temp8 = parseFloat(temp8);
				temp5 = temp5 + temp8;
				temp5 = temp5.toFixed(2);
			/*	if(t == 285){
					throw new Error(temp5);
				}*/
				
			}
			
			//throw new Error(temp5);
			//***************************************
			
			headerResultText += "1" + "\t" + "1" + "\t" + "2" + "\t" + distId + "\t"+ "\t" + "Dixie Paper Company" + "\t"
					+ "3010 Hwy 31 East" + "\t" + "" + "\t" + "Tyler" + "\t" + "Tx" + "\t" + "75702" + "\t" + "1" + "\t" + fromDate + "\t" + toDate
					+ "\t" + debitMemoNumber +"\t"+temp5+ "\n";


			for (var i = 0; i < searchResults.length; i++) {

				var detailRecord = 2;
				var resultSet = searchResults[i];
				columns = resultSet.getAllColumns();

				var invoiceDate = resultSet.getValue(columns[0]);
				var warehouse = resultSet.getText(columns[1]);

				var documentNumber = resultSet.getValue(columns[2]);
				var customerNumber = resultSet.getValue(columns[3]);
				var customerName = resultSet.getValue(columns[4]);
				var shipAddress1 = resultSet.getValue(columns[5]);
				var shipCity = resultSet.getValue(columns[6]);
				var shipState = resultSet.getValue(columns[7]);
				var shipZip = resultSet.getValue(columns[8]);

				var vendor = resultSet.getValue(columns[14]);
				var rebateId = resultSet.getText(columns[15]);
				var endUserNum = resultSet.getValue(columns[16]);
				var dixieItemNumber = resultSet.getText(columns[17]);
				var mpn = resultSet.getValue(columns[18]);

				var description = resultSet.getValue(columns[19]);
				var billPrice = resultSet.getValue(columns[20]);
				var contractCost = resultSet.getValue(columns[22]);
				var qty = resultSet.getValue(columns[23]);
				var uom = resultSet.getText(columns[24]);
				uom = unitsTypeCheck(uom);
				documentNumber = documentNumber.substr(3);
				rebateId = rebateId.replace(/\D/g,'');
				
				
				var itemlin = parseInt(i) + parseInt(1);
				list.setLineItemValue('endusernumber', itemlin, endUserNum);
				list.setLineItemValue('custname', itemlin, customerName);
				list.setLineItemValue('custshipadd1', itemlin, shipAddress1);
				list.setLineItemValue('custshiptocity', itemlin, shipCity);
				list.setLineItemValue('custshiptostate', itemlin, shipState);
				list.setLineItemValue('custshiptozip', itemlin, shipZip);
				list.setLineItemValue('invoicenumber', itemlin, documentNumber);
				list.setLineItemValue('invoicedate', itemlin, invoiceDate);
				list.setLineItemValue('productid', itemlin, mpn);
				list.setLineItemValue('itemnumber', itemlin, dixieItemNumber);
				list.setLineItemValue('itemuom', itemlin, uom);
				list.setLineItemValue('rebateid', itemlin, rebateId);
				list.setLineItemValue('quantity', itemlin, qty);
				list.setLineItemValue('distprice', itemlin, billPrice);
				list.setLineItemValue('paprice', itemlin, contractCost);
				var rebateDiff = billPrice - contractCost;
				var totalRebateAmount = qty * contractCost;

				headerResultText += detailRecord + "\t" + customerNumber + "\t" + customerName + "\t" + shipAddress1 + "\t" + "\t" + "\t" + shipCity
						+ "\t" + shipState + "\t" + shipZip + "\t" + "\t" + documentNumber + "\t" + invoiceDate + "\t" + "\t" + mpn + "\t"
						+ "\t" + uom + "\t" + rebateId + "\t" + "\t" + qty + "\t" + billPrice + "\t" + contractCost + "\n";

			}

		}
		vendor = vendor.slice(0,4);
		refNumber = refNumber +vendor+ ".txt";
		html = 'Results:  ' + searchResults.length;
		fld.setDefaultValue(html);
		var file = nlapiCreateFile(refNumber, 'PLAINTEXT', headerResultText);
		file.setFolder('237399');
		var fileID = nlapiSubmitFile(file);
		nlapiSubmitFile(file);
		
		var EMPLOYEE_ID = '56607';
		var email = 'kard@dixiepaper.net'; //recipient e-mail
		//var email = 'manderson@dixiepaper.net'; // recipient e-mail
		//var email = 'sswift@dixiepaper.net'; //recipient e-mail
		var subject = refNumber;
		var body = 'GP Export';
		nlapiSendEmail(EMPLOYEE_ID, email, subject, body, null, null, null, file);
		
		
		// 237399 folder ID
		response.writePage(form);

	} else {

	}

}

function unitsTypeCheck(unitsType) {

	switch (unitsType) {

	case 'Case':
		var text = 'CS';
		return text;
		break;
	case 'Each':
		var text = 'EA';
		return text;
		break;
	case 'Dozen':
		var text = 'DZ';
		return text;
		break;
	case 'Bale':
		var text = 'BL';
		return text;
		break;
	case 'Box':
		var text = 'BX';
		return text;
		break;
	case 'Pail':
		var text = 'PL';
		return text;
		break;
	case 'Pair':
		var text = 'PR';
		return text;
		break;
	case 'Roll':
		var text = 'RL';
		return text;
		break;
	case 'Tube':
		var text = 'TB';
		return text;
		break;
	case 'Carton':
		var text = 'CT';
		return text;
		break;
	case 'Bag':
		var text = 'BG';
		return text;
		break;
	case 'Drum':
		var text = 'DR';
		return text;
		break;
	case 'Package':
		var text = 'PK';
		return text;
		break;
	case 'Can':
		var text = 'CN';
		return text;
		break;
	case 'Bundle':
		var text = 'BD';
		return text;
		break;
	case 'Display':
		var text = 'DS';
		return text;
		break;
	case 'Cylinder':
		var text = 'CY';
		return text;
		break;
	case 'Gallon':
		var text = 'GL';
		return text;
		break;
	case 'Pound':
		var text = 'LB';
		return text;
		break;
	case 'Quart':
		var text = 'QT';
		return text;
		break;
	case 'Ream':
		var text = 'RM';
		return text;
		break;
	case 'Pad':
		var text = 'PD';
		return text;
		break;
	case 'Hour':
		var text = 'HR';
		return text;
		break;
	case 'Kit':
		var text = 'KT';
		return text;
		break;
	case 'Lot':
		var text = 'LT';
		return text;
		break;
	case 'Skid':
		var text = 'SK';
		return text;
		break;
	case 'Tote':
		var text = 'TT';
		return text;
		break;
	case 'Thousand':
		var text = ' M';
		return text;
		break;
	case 'Unit':
		var text = 'UN';
		return text;
		break;
	case 'Set':
		var text = 'ST';
		return text;
		break;
	default:
		var text = 'EA';
		return text;

	}

}

function dateFormat(date) {

	var dateMod = date.split("/");

	var dateMonth = dateMod[0];
	var dateDay = dateMod[1];
	var dateYear = dateMod[2];

	if (dateMonth.length == 1) {
		dateMonth = "0" + dateMonth
	}
	if (dateDay.length == 1) {
		dateDay = "0" + dateDay
	}

	return [ dateMonth, dateDay, dateYear ];

}


function sumArray(array) {
	for (var index = 0, length = array.length, sum = 0; index < length; sum += array[index++])
		;
	return sum;
}

