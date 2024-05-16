/**
 * Module Description
 * 
 * Version Date Author Remarks 1.00 05 Jul 2017 Michael
 * 
 */

function suiteletKCExport(request, response) {
	var fromDate = request.getParameter('custpage_from_date');
	var toDate = request.getParameter('custpage_to_date');
	var vendor = request.getParameter('custpage_vendor');
	var warehouse = request.getParameter('custpage_warehouse');

	if (request.getMethod() == 'GET') {

		form = nlapiCreateForm('KC Rebate Export', false);
		form.addSubmitButton('Select');
		form.addField('custpage_from_date', 'date', 'From Date').setDisplayType('entry');
		form.addField('custpage_to_date', 'date', 'To Date').setDisplayType('entry');
		// form.addField('custpage_vendor', 'select', 'Vendor', 'vendor').setDisplayType('entry');
		// 'item',
		form.addField('custpage_vendor', 'select', 'Vendor','vendor').setDisplayType('entry');
	//	form.addField('custpage_warehouse', 'select', 'Warehouse', 'location').setDisplayType('entry');

		// var s = nlapiLoadSearch(null,'195');
		// var filters = s.getFilters();
		// throw new Error(filters[0]+" "+filters[1]+" "+filters[2]+" "+filters[3]+" "+filters[4]+" "+filters[5]+" "+filters[6]);

		response.writePage(form);

	} else if (vendor && fromDate && toDate) {
	
		form = nlapiCreateForm('KC Export', false);
		form.addSubmitButton('Export');
		list = form.addSubList('custpage_sublist', 'list', 'KC', 'general');
		var fld = form.addField('custpage_mapfield', 'inlinehtml');
		list.addField('refnumber', 'text', 'Reference Number');
		list.addField('distcustid', 'text', 'Dist Customer Number');
	//	list.addField('warehouse', 'text', 'Warehouse');
		list.addField('endusernumber', 'text', 'End User Number');
		list.addField('custnumber', 'text', 'Customer Number');
		list.addField('custname', 'text', 'Customer Name');
		list.addField('custshipadd1', 'text', 'Customer Ship Address 1');
		list.addField('custshipadd2', 'text', 'Customer Ship Address 2');
		list.addField('custshiptocity', 'text', 'Customer Ship To City');
		list.addField('custshiptostate', 'text', 'Customer Ship To State');
		list.addField('custshiptozip', 'text', 'Customer Ship To Zip');
		list.addField('productid', 'text', 'Product ID');
		list.addField('itemnumber', 'text', 'Item Number');
		list.addField('invoicedate', 'text', 'Invoice Date');
		list.addField('invoicenumber', 'text', 'Invoice Number');
		list.addField('quantity', 'text', 'Quantity');
		list.addField('itemuom', 'text', 'Item UOM');
		list.addField('distprice', 'text', 'Dist Price');
		list.addField('paprice', 'text', 'PA Price');
		list.addField('rebateamount', 'text', 'Rebate Amount');
		list.addField('panumber', 'text', 'PA Number');
	//	list.addField('resubmitnumber', 'text', 'Resubmit Number');

		var filters = new Array();
	

		filters[0] = new nlobjSearchFilter('custcol_rebate_vendor', null, 'is', vendor);
		filters[1] = new nlobjSearchFilter('trandate', null, 'within', fromDate, toDate);
		//filters[2] = new nlobjSearchFilter('location', null, 'anyof', warehouse);

		var searchResults = nlapiSearchRecord(null, '2102', filters);
		if (!searchResults || searchResults.length <= 0) {
			throw new Error('No results returned after executing search.');

		} else {
			var refNumber = new Array();
			refNumber = dateFormat(fromDate);
			
			refNumber = refNumber[2]+refNumber[0];
			var kcCustNum = 62151427;
			var d_branch = 'MDMAIN';
			//throw new Error(refNumber);
			var resultText = "";
			var blank = "";
			resultText += "REF_NUM" + "," + "CUSTLOC" + "," + "D_BRANCH" + "," + "KC_ENDU" + "," + "SHTO_NBR" + "," + "SHTO_NME" + "," + "SHTO_AD1"
					+ ","+"SHTO_AD2"+"," + "SHTO_CTY" + "," + "SHTO_ST" + "," + "SHTO_ZIP" + "," + "PROD_ID" + "," + "D_PROD" + "," + "INVC_DTE" + "," + "INVC_NBR"
					+ "," + "CASES" + "," + "UNT_MSR" + "," + "ITW_PRC" + "," + "PA_PRC" + "," + "EXT_RBT" + "," + "PA_NBR" + "," 
					+ "\n";

			for (var i = 0; i < searchResults.length; i++) {
				var invoiceDateModified = new Array();
				var resultSet = searchResults[i];
				columns = resultSet.getAllColumns();
		
				var invoiceNumber = resultSet.getValue(columns[11]);
				var custNumber = resultSet.getValue(columns[0]);
				var custName = resultSet.getValue(columns[1]);
				var custAdd1 = resultSet.getValue(columns[2]);
				var custAdd2 = resultSet.getValue(columns[3]);
				var custCity = resultSet.getValue(columns[4]);
				var custState = resultSet.getValue(columns[5]);
				var custZip = resultSet.getValue(columns[6]);
				var paNumber = resultSet.getValue(columns[20]);
				var endUserNumber = resultSet.getValue(columns[19]);
				var acmeItemNumber = resultSet.getText(columns[9]);
				var mpn = resultSet.getValue(columns[8]);
				var quantity = resultSet.getValue(columns[12]);
				var uom = resultSet.getText(columns[13]);
				var contractCost = resultSet.getValue(columns[18]);
				var billPrice = resultSet.getValue(columns[14]);
				var customerName = resultSet.getValue(columns[1]);
				var invoiceDate = resultSet.getValue(columns[10]);
				
			    invoiceDateModified = dateFormat(invoiceDate);
			    
				custName = custName.replace(/,/g, '');
				custCity = custCity.replace(/,/g, '');
				custAdd1 = custAdd1.replace(/,/g, '');
				//paNumber = paNumber.substr(3,paNumber.length);
			//	paNumber = paNumber.replace(/\D/g,'');
/*				if(endUserNumber == null || endUserNumber == "" ){
					//throw new Error(customerName);
					//var rebateRecord = nlapiLoadRecord('customrecord_rebate_details', paNumberID);
					var rebateid = new Array();
					var rebateidText = new Array();
					var columns = new Array();
					columns[0] = new nlobjSearchColumn('custrecord_rebate_customer_customer');
					columns[1] = new nlobjSearchColumn('custrecord_rebate_customer_customer');
					columns[2] = new nlobjSearchColumn('custrecord_rebate_customer_enduserag'); // customrecord_rebate_details
					columns[3] = new nlobjSearchColumn('custrecord_start_date', 'custrecord_rebate_customer');
					columns[4] = new nlobjSearchColumn('custrecord_end_date', 'custrecord_rebate_customer');
				//	columns[5] = new nlobjSearchColumn('custrecord_upaya_warehouse', 'custrecord_rebate_customer');  

					var filter = new Array();
					filter.push(new nlobjSearchFilter('isinactive', 'custrecord_rebate_customer', 'is', 'F'));
					filter.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
					filter.push(new nlobjSearchFilter('custrecord_rebate_customer_customer', null, 'anyof', customerName));
					filter.push(new nlobjSearchFilter('custrecord_rebate_start_date', 'customrecord_rebate_parent', 'before', invoiceDate));
					filter.push(new nlobjSearchFilter('custrecord_rebate_end_date', 'customrecord_rebate_parent', 'after', invoiceDate));
					//filter.push(new nlobjSearchFilter('custrecord_upaya_warehouse', 'custrecord_rebate_customer', 'anyof', warehouseID));
					//filter.push(new nlobjSearchFilter('custrecord_rebate_','custrecord_rebate_customer','anyof',paNumberID));

					var searchResultsEnd = nlapiSearchRecord('customrecord_rebate_customer', null, filter, columns);
					
					if(searchResultsEnd){
						
						for(var t=0; t<searchResultsEnd.length; t++){
							var result = searchResultsEnd[t];
							rebateid[t] = result.getValue('custrecord_rebate_customer_customer');
							rebateidText[t] = result.getText('custrecord_rebate_customer_customer');
							if(rebateid[t] == paNumberID){
								 endUserNumber = result.getValue('custrecord_rebate_customer_enduserag');
								 paNumber = rebateidText[t].replace(/\D/g,'');
								//throw new Error(paNumberID+"  "+rebateid[t]+ "  "+endUserNumber+" "+rebateidText[t]);
								//break;
							}
							
							
						}
						//throw new Error(searchResults.length);
						
					}
					
				}*/
				

				
				invoiceDate = invoiceDateModified[2]+invoiceDateModified[0]+invoiceDateModified[1];
				// ACME Customer Number:   62151427  COlumn B
				// custentity_custom_kc_customer_no - KC END USR Number
				
				//MDMAIN Column C
				
				endUserNumber = enduserNumberCheck(endUserNumber);
				custAdd1 = addressCheck(custAdd1);
				custCity = cityCheck(custCity);
				custState = stateCheck(custState);
				custZip = zipCheck(custZip);
				custName = customerNameCheck(custName);
				mpn = prodIdCheck(mpn);
				acmeItemNumber = distProdNumberCheck(acmeItemNumber);
			//	paNumber = paNumberCheck(paNumber);
				uom = unitsTypeCheck(uom);
				invoiceNumber = invoiceNumberCheck(invoiceNumber);
				quantity = quantityCheck(quantity);
				quantity = parseFloat(quantity);
				custNumber = custNumberCheck(custNumber);
				
				//custNumber = custNumberCheck(custNumber);
				var rebateAmount = billPrice - contractCost;
				rebateAmount = parseFloat(rebateAmount);
				rebateAmount = rebateAmount * quantity;
				rebateAmount = rebateAmount.toFixed(3);
				 var strLength = rebateAmount.length;
				 strLength = strLength - 1;
				 rebateAmount = rebateAmount.substr(0,strLength);
				
				//rebateAmount = +(rebateAmount.slice(0, --rebateAmount.length));

				var itemlin = parseInt(i) + parseInt(1);
				list.setLineItemValue('invoicenumber', itemlin, invoiceNumber);
				list.setLineItemValue('custnumber', itemlin, custNumber);
				list.setLineItemValue('custname', itemlin, custName);
				list.setLineItemValue('custshipadd1', itemlin, custAdd1);
				list.setLineItemValue('custshipadd2', itemlin, custAdd2);
				list.setLineItemValue('panumber', itemlin, paNumber);
				list.setLineItemValue('custshiptocity', itemlin, custCity);
				list.setLineItemValue('custshiptostate', itemlin, custState);
				list.setLineItemValue('custshiptozip', itemlin, custZip);
				list.setLineItemValue('endusernumber', itemlin, endUserNumber);
				list.setLineItemValue('itemnumber', itemlin, acmeItemNumber);
				list.setLineItemValue('productid', itemlin, mpn);
			//	list.setLineItemValue('warehouse', itemlin, warehouse);
				list.setLineItemValue('quantity', itemlin, quantity);
				list.setLineItemValue('itemuom', itemlin, uom);
				list.setLineItemValue('rebateamount', itemlin, rebateAmount);
				list.setLineItemValue('paprice', itemlin, contractCost);
				list.setLineItemValue('distprice', itemlin, billPrice);
				list.setLineItemValue('invoicedate', itemlin, invoiceDate);
				list.setLineItemValue('refnumber', itemlin, refNumber);
			//	list.setLineItemValue('distcustid', itemlin, kcCustNum);
				
				resultText += refNumber + "," + kcCustNum +","+  d_branch + "," + endUserNumber + "," + custNumber + "," + custName + "," + custAdd1+ ","
						+ custAdd2 + "," + custCity + "," + custState + "," + custZip + "," + mpn + "," + acmeItemNumber + "," + invoiceDate + "," + invoiceNumber
						+ "," + quantity + "," + uom + "," + billPrice + "," + contractCost + "," + rebateAmount + "," + paNumber + "," + blank
						+ "\n";

			}
			//warehouse = warehouse.slice(0,3);
		//	refNumber = refNumber +warehouse+ ".csv";
    		var file = nlapiCreateFile(refNumber, 'CSV', resultText);
			file.setFolder('7637');
			var fileID = nlapiSubmitFile(file);
			nlapiSubmitFile(file);
			//var EMPLOYEE_ID = '428'; // MUST BE A VALID USER ACCOUNT
			//var EMPLOYEE_ID = '56607';
			//var email = 'kard@dixiepaper.net'; //recipient e-mail
			//var email = 'manderson@dixiepaper.net'; // recipient e-mail
			//var email = 'sswift@dixiepaper.net'; //recipient e-mail
			//var subject = refNumber;
			//var body = 'KC Export';
			//nlapiSendEmail(EMPLOYEE_ID, email, subject, body, null, null, null, file);

		}

		html = 'Results:  ' + searchResults.length;
		fld.setDefaultValue(html);
		response.writePage(form);

	} else {

	}

}

function custNumberCheck(custNumber) {

	if (custNumber.length > 25) {
		custNumber = custNumber.slice(0, 25);
		return custNumber;

	} else if (custNumber.length <= 25) {

		var str = '                         ';
		var strCount = str.length;
		var charDiff = strCount - custNumber.length;
		str = str.substring(custNumber.length, 25);
		custNumber = custNumber + str;

		return custNumber;
	} else if (custNumber.length < 1) {
		var str = "                         ";
		return str;
	}

}



function dateFormat(date){
	
	
	var dateMod = date.split("/");
	
	var dateMonth = dateMod[0];
	var dateDay = dateMod[1];
	var dateYear = dateMod[2];
	
	if(dateMonth.length == 1){
		dateMonth = "0"+dateMonth
	}
	if(dateDay.length == 1){
		dateDay = "0"+dateDay
	}
	
	return [dateMonth,dateDay,dateYear];
	
}


function refNumberCheck(refNumber) {

	if (refNumber.length > 16) {
		refNumber = refNumber.slice(0, 16);
		return refNumber;

	} else if (refNumber.length <= 16) {

		var str = '                ';
		var strCount = str.length;
		var charDiff = strCount - refNumber.length;
		str = str.substring(refNumber.length, 16);
		refNumber = refNumber + str;

		return refNumber;
	} else if (refNumber.length < 1) {
		var str = "                ";
		return str;
	}

}

function disCustNumberCheck(disCustNumber) {

	if (disCustNumber.length > 10) {
		disCustNumber = disCustNumber.slice(0, 10);
		return disCustNumber;

	} else if (disCustNumber.length <= 10) {

		var str = '          ';
		var strCount = str.length;
		var charDiff = strCount - disCustNumber.length;
		str = str.substring(disCustNumber.length, 10);
		disCustNumber = disCustNumber + str;

		return disCustNumber;
	} else if (disCustNumber.length < 1) {
		var str = "          ";
		return str;
	}

}

function warehouseNumberCheck(warehouseNumber) {

	if (warehouseNumber.length > 15) {
		warehouseNumber = warehouseNumber.slice(0, 15);
		return warehouseNumber;

	} else if (warehouseNumber.length <= 15) {

		var str = '               ';
		var strCount = str.length;
		var charDiff = strCount - warehouseNumber.length;
		str = str.substring(warehouseNumber.length, 15);
		warehouseNumber = warehouseNumber + str;

		return warehouseNumber;
	} else if (warehouseNumber.length < 1) {
		var str = "               ";
		return str;
	}

}


function enduserNumberCheck(enduserNumber) {

	if (enduserNumber.length > 25) {
		enduserNumber = enduserNumber.slice(0, 25);
		return enduserNumber;

	} else if (enduserNumber.length <= 25) {

		var str = '                         ';
		var strCount = str.length;
		var charDiff = strCount - enduserNumber.length;
		str = str.substring(enduserNumber.length, 25);
		enduserNumber = enduserNumber + str;

		return enduserNumber;
	} else if (enduserNumber.length < 1) {
		var str = "                         ";
		return str;
	}

}


function shipNumberCheck(shipNumber) {

	if (shipNumber.length > 25) {
		shipNumber = shipNumber.slice(0, 25);
		return shipNumber;

	} else if (shipNumber.length <= 25) {

		var str = '                         ';
		var strCount = str.length;
		var charDiff = strCount - shipNumber.length;
		str = str.substring(shipNumber.length, 25);
		shipNumber = shipNumber + str;

		return shipNumber;
	} else if (shipNumber.length < 1) {
		var str = "                         ";
		return str;
	}

}





function customerNameCheck(companyName) {

	if (companyName.length > 30) {
		companyName = companyName.slice(0, 30);
		return companyName;

	} else if (companyName.length <= 30) {

		var str = '                              ';
		var strCount = str.length;
		var charDiff = strCount - companyName.length;
		str = str.substring(companyName.length, 30);
		companyName = companyName + str;

		return companyName;
	} else if (companyName.length < 1) {
		var str = "                              ";
		return str;
	}

}





function addressCheck(address) {

	if (address.length > 30) {
		address = address.slice(0, 30);

		return address;

	} else if (address.length < 30) {
		var str = '                              ';
		var strCount = str.length;
		var charDiff = strCount - address.length;
		str = str.substring(address.length, 30);
		address = address + str;
		return address;
	} else if (address.length < 1) {
		var str = "                              ";
		address = str;
		return address;
	} else if (address.length == 30) {
		return address;
	}

}
function cityCheck(city) {

	if (city.length > 19) {
		city = city.slice(0, 19);
		return city;

	} else if (city.length <= 19) {
		var str = '                    ';
		var strCount = str.length;
		var charDiff = strCount - city.length;
		str = str.substring(city.length, 19);
		city = city + str;
		return city;
	} else if (city.length < 1) {
		var str = "                   ";
		return str;
	}

}
function stateCheck(state) {

	if (state.length > 2) {
		state = state.slice(0, 2);

		return state;

	} else if (state.length < 3) {
		var str = '  ';
		var strCount = str.length;
		var charDiff = strCount - state.length;
		str = str.substring(state.length, 2);
		state = state + str;
		return state;
	} else if (state.length < 1) {
		var str = "  ";
		return str;
	}

}

function zipCheck(zip) {

	if (zip.length > 9) {
		zip = zip.slice(0, 9);

		return zip;

	} else if (zip.length < 9) {
		var str = '         ';
		var strCount = str.length;
		var charDiff = strCount - zip.length;
		str = str.substring(zip.length, 9);
		zip = zip + str;
		return zip;
	} else if (zip.length < 1) {
		var str = "         ";
		return str;
	}

}

function prodIdCheck(prodIdNumber) {

	if (prodIdNumber.length > 14) {
		prodIdNumber = prodIdNumber.slice(0, 14);
		return prodIdNumber;

	} else if (prodIdNumber.length <= 14) {

		var str = '              ';
		var strCount = str.length;
		var charDiff = strCount - prodIdNumber.length;
		str = str.substring(prodIdNumber.length, 14);
		prodIdNumber = prodIdNumber + str;

		return prodIdNumber;
	} else if (prodIdNumber.length < 1) {
		var str = "              ";
		return str;
	}

}


function distProdNumberCheck(disProdNumber) {

	if (disProdNumber.length > 15) {
		disProdNumber = disProdNumber.slice(0, 15);
		return disProdNumber;

	} else if (disProdNumber.length <= 15) {

		var str = '               ';
		var strCount = str.length;
		var charDiff = strCount - disProdNumber.length;
		str = str.substring(disProdNumber.length, 15);
		disProdNumber = disProdNumber + str;

		return disProdNumber;
	} else if (disProdNumber.length < 1) {
		var str = "               ";
		return str;
	}

}


function invoiceNumberCheck(invoiceNumber) {

	if (invoiceNumber.length > 20) {
		invoiceNumber = invoiceNumber.slice(0, 20);
		return invoiceNumber;

	} else if (invoiceNumber.length <= 20) {

		var str = '                    ';
		var strCount = str.length;
		var charDiff = strCount - invoiceNumber.length;
		str = str.substring(invoiceNumber.length, 20);
		invoiceNumber = invoiceNumber + str;

		return invoiceNumber;
	} else if (invoiceNumber.length < 1) {
		var str = "                    ";
		return str;
	}

}

function quantityCheck(quantityNumber) {

	if (quantityNumber.length > 11) {
		quantityNumber = quantityNumber.slice(0, 11);
		return quantityNumber;

	} else if (quantityNumber.length <= 11) {

		var str = '           ';
		var strCount = str.length;
		var charDiff = strCount - quantityNumber.length;
		str = str.substring(quantityNumber.length, 11);
		quantityNumber = quantityNumber + str;

		return quantityNumber;
	} else if (quantityNumber.length < 1) {
		var str = "           ";
		return str;
	}

}


function uomCheck(uom) {

	if (uom.length > 3) {
		uom = uom.slice(0, 3);

		return uom;

	} else if (uom.length < 4) {
		var str = '   ';
		var strCount = str.length;
		var charDiff = strCount - uom.length;
		str = str.substring(uom.length, 3);
		uom = uom + str;
		return uom;
	} else if (uom.length < 1) {
		var str = "   ";
		return str;
	}

}


function paNumberCheck(paNumber) {

	if (paNumber.length > 10) {
		paNumber = paNumber.slice(0, 10);
		return paNumber;

	} else if (paNumber.length <= 10) {

		var str = '          ';
		var strCount = str.length;
		var charDiff = strCount - paNumber.length;
		str = str.substring(paNumber.length, 10);
		paNumber = paNumber + str;

		return paNumber;
	} else if (paNumber.length < 1) {
		var str = "          ";
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
		var text = 'EA';
		return text;

	}

}

