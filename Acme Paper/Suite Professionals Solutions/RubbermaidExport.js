/**
 * Module Description
 * 
 * Version Date Author Remarks 1.00 19 Jul 2021 Suite Professionals LLC
 * 
 */

function suiteletRubbermaidExport(request, response) {

	if (request.getMethod() == 'GET') {
		form = nlapiCreateForm('Rubbermaid Export', false);
		list = form.addSubList('custpage_sublist', 'list', 'Rubbermaid', 'general');
		var fld = form.addField('custpage_mapfield', 'inlinehtml');
		list.addField('bidnumber', 'text', 'Bid Number');
		list.addField('rcpdistid', 'text', 'RCP Dist ID');
	//	list.addField('distbranchid', 'text', 'Dist Branch ID');
		list.addField('distcustid', 'text', 'Dist Customer ID');
		list.addField('customername', 'text', 'Customer Name');
		list.addField('custshipadd1', 'text', 'Customer Ship Address 1');
		list.addField('custshipadd2', 'text', 'Customer Ship Address 2');
		list.addField('custshiptocity', 'text', 'Customer Ship To City');
		list.addField('custshiptostate', 'text', 'Customer Ship To State');
		list.addField('custshiptozip', 'text', 'Customer Ship To Zip');
		//list.addField('customerphone', 'text', 'Customer Phone');
		list.addField('invoicedate', 'date', 'Invoice Date');
		list.addField('invoicenumber', 'text', 'Invoice Number');
		list.addField('distproductupc', 'text', 'Dist Product UPC');
		list.addField('productid', 'text', 'Product ID');
		list.addField('quantity', 'text', 'Quantity');
		list.addField('custpage_uom', 'text', 'UOM');
		// list.addMarkAllButtons();

		var searchResults = nlapiSearchRecord(null, '2100');
		if (!searchResults || searchResults.length <= 0) {
			throw new Error('No results returned after executing search.');

		} else {
			var distId = "103";
			var blank = "";
			var resultText = "";
			// bid number vendor contract number
			// cust_id 103

			resultText += "Bid_Nbr" + "," + "Cust_Id" + "," + "Cust_Endu_Id" + "," + "Endu_Nme" + "," + "Endu_Ad1" + ","
					+ "Endu_Ad2" + "," + "Endu_Cty" + "," + "Endu_St" + "," + "Endu_Zip" + "," + "Endu_Ph" + "," + "Prod_Id" + "," + "D_Prod" + ","
					+ "Invc_Dte" + "," + "Invc_Nbr" + "," + "Qty" + "," + "UOM"+ "\n";

			for (var i = 0; i < searchResults.length; i++) {

				var resultSet = searchResults[i];
				columns = resultSet.getAllColumns();
				var invoiceDate = resultSet.getValue(columns[0]);
				var invoiceNumber = resultSet.getValue(columns[1]);
				var customerName = resultSet.getValue(columns[2]);
				var customerNumber = resultSet.getValue(columns[3]);
				var mpn = resultSet.getValue(columns[9]);
				var acmeItem = resultSet.getText(columns[10]);
				var quantity = resultSet.getValue(columns[11]);
				var rebateId = resultSet.getValue(columns[13]);
				var shipAddress1 = resultSet.getValue(columns[4]);
				var shipAddress2 = resultSet.getValue(columns[5]);
				var shipCity = resultSet.getValue(columns[6]);
				var shipState = resultSet.getValue(columns[7]);
				var shipZip = resultSet.getValue(columns[8]);
				var uom = resultSet.getValue(columns[13]);
				uom = unitsTypeCheck(uom);
		
				
				
				
				customerName = customerNameCheck(customerName);
				customerName = customerName.replace(/,/g, '');
				shipCity = shipCity.replace(/,/g, '');
				shipAddress1 = shipAddress1.replace(/,/g, '');
				shipAddress2 = shipAddress2.replace(/,/g, '');
				var itemlin = parseInt(i) + parseInt(1);
				list.setLineItemValue('bidnumber', itemlin, rebateId);
				list.setLineItemValue('rcpdistid', itemlin, distId);
				list.setLineItemValue('distcustid', itemlin, customerNumber);
				list.setLineItemValue('customername', itemlin, customerName);
				list.setLineItemValue('custshipadd1', itemlin, shipAddress1);
				list.setLineItemValue('custshipadd2', itemlin, shipAddress2);
				list.setLineItemValue('custshiptocity', itemlin, shipCity);
				list.setLineItemValue('custshiptostate', itemlin, shipState);
				list.setLineItemValue('custshiptozip', itemlin, shipZip);
			//	list.setLineItemValue('customerphone', itemlin, blank);
				list.setLineItemValue('invoicedate', itemlin, invoiceDate);
				list.setLineItemValue('invoicenumber', itemlin, invoiceNumber);
				list.setLineItemValue('distproductupc', itemlin, acmeItem);
				list.setLineItemValue('productid', itemlin, mpn);
				list.setLineItemValue('quantity', itemlin, quantity);
				list.setLineItemValue('custpage_uom', itemlin, uom);

				resultText += rebateId + "," + distId + "," + customerNumber + "," + customerName + "," + shipAddress1 + ","
						+ shipAddress2 + "," +shipCity+","+shipState+","+shipZip+","+blank+","+mpn+","+acmeItem+","+invoiceDate+","+invoiceNumber+","+quantity+ ","+uom+"\n";
			}

			var file = nlapiCreateFile('rubbermaid.csv', 'CSV', resultText);
			file.setFolder('7637');
			var fileID = nlapiSubmitFile(file);
			nlapiSubmitFile(file);
		//	var EMPLOYEE_ID = '428'; // MUST BE A VALID USER ACCOUNT
		//	 var email = 'kard@dixiepaper.net'; //recipient e-mail
			//var email = 'manderson@dixiepaper.net'; // recipient e-mail
			// var email = 'sswift@dixiepaper.net'; //recipient e-mail
		//	var subject = 'Rubbermaid Export';
		//	var body = 'Rubbermaid Export';
		//	nlapiSendEmail(EMPLOYEE_ID, email, subject, body, null, null, null, file);

		}
		response.writePage(form);
	} else {
		form = nlapiCreateForm('Rubbermaid Export Results', false);
		var fld = form.addField('custpage_mapfield', 'inlinehtml');

		html = 'Results: Pass ';
		fld.setDefaultValue(html);
		response.writePage(form);
	}

}

function customerNameCheck(companyName) {

	if (companyName.length > 35) {
		companyName = companyName.slice(0, 35);
		return companyName;

	} else if (companyName.length <= 35) {

		var str = '                                   ';
		var strCount = str.length;
		var charDiff = strCount - companyName.length;
		str = str.substring(companyName.length, 35);
		companyName = companyName + str;

		return companyName;
	} else if (companyName.length < 1) {
		var str = "                                   ";
		return str;
	}

}

function bidNumberCheck(rebateId) {

	if (rebateId.length > 20) {
		rebateId = rebateId.slice(0, 20);
		return rebateId;

	} else if (rebateId.length <= 20) {

		var str = '                    ';
		var strCount = str.length;
		var charDiff = strCount - rebateId.length;
		str = str.substring(rebateId.length, 20);
		rebateId = rebateId + str;

		return rebateId;
	} else if (rebateId.length < 1) {
		var str = "                    ";
		return str;
	}

}

function custNumberCheck(custNumber) {

	if (custNumber.length > 11) {
		custNumber = custNumber.slice(0, 11);
		return custNumber;

	} else if (custNumber.length <= 11) {

		var str = '           ';
		var strCount = str.length;
		var charDiff = strCount - custNumber.length;
		str = str.substring(custNumber.length, 11);
		custNumber = custNumber + str;

		return custNumber;
	} else if (custNumber.length < 1) {
		var str = "           ";
		return str;
	}

}



function unitsTypeCheck(unitsType) {

	switch (unitsType) {

	case 'Case':
		var text = 'CA';
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
		var text = 'PA';
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
	case 'Pack':
		var text = 'PK';
		return text;
		break;
	case 'Can':
		var text = 'CN';
		return text;
		break;
	case 'Bundle':
		var text = 'BA';
		return text;
		break;
	case 'Bundles':
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
	case 'Qt':
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
	case 'Pallet':
		var text = 'PL';
		return text;
		break;
	default:
		var text = 'CA';
		return text;

	}

}
