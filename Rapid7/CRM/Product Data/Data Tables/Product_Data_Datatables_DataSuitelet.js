/*
 * @author efagone
 */

function zc_data_Suitelet(request, response){

	nlapiLogExecution('DEBUG', 'HIT', 'OUCH');
	var parameters = request.getAllParameters();
	var headers = request.getAllHeaders();
	//Values for headers, parameters
	var logHeaderParams = '\n--------------------\nHEADERS:\n--------------------\n';
	for (head in headers) {
		logHeaderParams += head + ': ' + headers[head] + '\n';
	}
	
	logHeaderParams += '\n--------------------\nPARAMS:\n--------------------\n';
	for (param in parameters) {
		logHeaderParams += param + ': ' + parameters[param] + '\n';
	}
	nlapiLogExecution('AUDIT', 'Parameters/Headers', logHeaderParams + '\n\n\n\nBODY:\n' + request.getBody());
	
	var objResponse = {};
	
	switch (request.getMethod()) {
	
		case 'GET':
			var cmd = request.getParameter('cmd');
			
			if (cmd == 'getValidListValues') {
				objResponse = getValidListValues(request.getParameter('listid'));
				break;
			}
			if (cmd == 'getProducts') {
				objResponse = getProducts(request.getParameter('oppid'));
				break;
			}
			if (cmd == 'getToolbar') {
				var objFile = nlapiLoadFile(1862958);
				var content = objFile.getValue();
				response.setContentType('HTMLDOC');
				response.write(content);
				return;
			}
			
			break;
			
		case 'POST':
			var json = request.getBody();
			var objRequest = {};
			if (!isBlank(json)) {
				objRequest = JSON.parse(json);
			}
			if (objRequest.action == 'remove') {
				deleteProduct(objRequest.id);
				break;
			}
			if (objRequest.action == 'edit' || objRequest.action == 'create') {
				objResponse = updateProducts(objRequest);
				break;
			}
			break;
	}
	
	nlapiLogExecution('AUDIT', 'Response', JSON.stringify(objResponse));
	response.setContentType('JSON');
	response.write(JSON.stringify(objResponse));
	return;
	
}

function deleteProduct(recId){

	try {
		nlapiDeleteRecord('customrecordr7competitiveproductdata', recId);
	} 
	catch (e) {
		nlapiLogExecution('ERROR', 'Could not delete product', e);
		return {
			error: e.getDetails()
		};
	}
	
	return {};
}

function updateProducts(objRequest){
	
	var data = objRequest.data;
	if (isBlank(data.product.value)) {
		return {
			fieldErrors: [{
				name: "product.value",
				status: "Please specify a product."
			}]
		};
	}
	
	if (isBlank(data.amount)) {
		return {
			fieldErrors: [{
				name: "amount",
				status: "Please specify an amount."
			}]
		};
	}

	if (isNaN(parseFloat(data.amount))) {
		return {
			fieldErrors: [{
				name: "amount",
				status: "Please specify a valid amount."
			}]
		};
	}
	
	
	if (isBlank(data.contractlength)) {
		return {
			fieldErrors: [{
				name: "contractlength",
				status: "Please specify a contract length."
			}]
		};
	}
	
	if (isBlank(data.quantity)) {
		return {
			fieldErrors: [{
				name: "quantity",
				status: "Please specify a quantity."
			}]
		};
	}

	if (isNaN(parseFloat(data.quantity))) {
		return {
			fieldErrors: [{
				name: "quantity",
				status: "Please specify a valid integer."
			}]
		};
	}
	
	if (isNaN(data.contractlength)) {
		return {
			fieldErrors: [{
				name: "contractlength",
				status: "Please specify a valid integer."
			}]
		};
	}
	
	var rec = null;
	if (objRequest.action == 'edit') {
		rec = nlapiLoadRecord('customrecordr7competitiveproductdata', data.nsid);
	}
	else 
		if (objRequest.action == 'create') {
			var prodFound = productExists(data.oppid, data.product.value);
			if (prodFound != false) {
				return {
					fieldErrors: [{
						name: "product.value",
						status: "Duplicate. There is already a record for " + prodFound + '.'
					}]
				};
			}
			rec = nlapiCreateRecord('customrecordr7competitiveproductdata');
		}
	
	var customerId = nlapiLookupField('opportunity', data.oppid, 'entity');
	
	rec.setFieldValue('custrecordr7competproddataproduct', data.product.value);
	rec.setFieldValue('custrecordr7proddataqty', data.quantity.replace(/[^0-9\.]/ig, ''));
	rec.setFieldValue('custrecordr7competproddatacontractlength', data.contractlength);
	rec.setFieldValue('custrecordr7competproddataprojtotal', data.amount.replace(/[^0-9\.]/ig, ''));
	rec.setFieldValue('custrecordr7competproddataincumbent', data.incumbent.value);
	rec.setFieldValue('custrecordr7competproddatacompetition', data.competition.value);
	rec.setFieldValue('custrecordr7competproddataconclusion', data.conclusion.value);
	rec.setFieldValue('custrecordr7proddatawinner', data.winner.value);
	rec.setFieldValue('custrecordr7proddataloser', data.loser.value);
	rec.setFieldValue('custrecordr7competproddatareasons', data.winlossreason.value);
	rec.setFieldValue('custrecordr7competproddatadescription', data.description);
	rec.setFieldValue('custrecordr7competproddataopportunity', data.oppid);
	rec.setFieldValue('custrecordr7competproddatacustomer', customerId);
	
	var id = data.nsid;
	nlapiLogExecution('DEBUG', "id",id);
	try {
		id = nlapiSubmitRecord(rec);
	} 
	catch (e) {
		nlapiLogExecution('ERROR', 'Could not update product', e);
		return {
			error: e.getDetails()
		};
	}
	
	if (id == null || id == '') {
		return {
			error: 'Something went wrong processing your request. Please contact your Administrator.'
		};
	}
	return getProducts(null, id);
	
}

function productExists(oppId, prodId){

	if (oppId != null && oppId != '') {
		var arrFilters = new Array();
		arrFilters[arrFilters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		arrFilters[arrFilters.length] = new nlobjSearchFilter('custrecordr7competproddataopportunity', null, 'anyof', oppId);
		arrFilters[arrFilters.length] = new nlobjSearchFilter('custrecordr7competproddataproduct', null, 'anyof', prodId);
		
		var arrColumns = new Array();
		arrColumns[0] = new nlobjSearchColumn('custrecordr7competproddataproduct');
	
		var arrResults = nlapiSearchRecord('customrecordr7competitiveproductdata', null, arrFilters, arrColumns);
		
		if (arrResults != null && arrResults.length > 0) {
			return arrResults[0].getText('custrecordr7competproddataproduct');
		}
	}
	return false;
}

function getProducts(oppId, recId){

	var arrData = new Array();
	
	// Current Daya Population
	var arrFilters = [];
	if (oppId != null && oppId != '') {
		arrFilters[arrFilters.length] = nlobjSearchFilter('custrecordr7competproddataopportunity', null, 'anyof', oppId);
	}
	else {
		arrFilters[arrFilters.length] = nlobjSearchFilter('internalid', null, 'is', recId);
	}
	
	var arrColumns = new Array();
	arrColumns[0] = new nlobjSearchColumn('internalid');
	arrColumns[1] = new nlobjSearchColumn('custrecordr7competproddataproduct').setSort(false);
	arrColumns[2] = new nlobjSearchColumn('custrecordr7competproddataprojtotal');
	arrColumns[3] = new nlobjSearchColumn('custrecordr7competproddataincumbent');
	arrColumns[4] = new nlobjSearchColumn('custrecordr7competproddatacompetition');
	arrColumns[5] = new nlobjSearchColumn('custrecordr7competproddataconclusion');
	arrColumns[6] = new nlobjSearchColumn('custrecordr7proddata_locked');
	arrColumns[7] = new nlobjSearchColumn('custrecordr7competproddatareasons');
	arrColumns[8] = new nlobjSearchColumn('custrecordr7competproddatadescription');
	arrColumns[9] = new nlobjSearchColumn('custrecordr7proddatawinner');
	arrColumns[10] = new nlobjSearchColumn('custrecordr7proddataloser');
	arrColumns[11] = new nlobjSearchColumn('custrecordr7competproddatacustomer');
	arrColumns[12] = new nlobjSearchColumn('custrecordr7competproddatacontractlength');
	arrColumns[13] = new nlobjSearchColumn('custrecordr7proddataqty');
	arrColumns[14] = new nlobjSearchColumn('custrecordr7competproddataopportunity');
	arrColumns[15] = new nlobjSearchColumn('custrecordr7proddata_include');
	
	var newSearch = nlapiCreateSearch('customrecordr7competitiveproductdata');
	newSearch.setFilters(arrFilters);
	newSearch.setColumns(arrColumns);
	var resultSet = newSearch.runSearch();
	
	var rowNum = 0;
	var anyIncludes = false;
	do {
		var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
		for (var rs in resultSlice) {
			var result = resultSlice[rs];
			
			var objProduct = {};
			objProduct.DT_RowClass = 'uir-list-row-tr';
			objProduct.DT_RowId = 'row_' + result.getValue(arrColumns[0]);
			objProduct.locked = result.getValue(arrColumns[6]);

			objProduct.nsid = result.getValue(arrColumns[0]);
			objProduct.product = {
				value: result.getValue(arrColumns[1]),
				label: result.getText(arrColumns[1])
			};
			objProduct.amount = result.getValue(arrColumns[2]) || 0;
			objProduct.incumbent = {
				value: valToArray(result.getValue(arrColumns[3])),
				label: labelToArray(result.getText(arrColumns[3]))
			};
			objProduct.competition = {
				value: valToArray(result.getValue(arrColumns[4])),
				label: labelToArray(result.getText(arrColumns[4]))
			};
			objProduct.conclusion = {
				value: valToArray(result.getValue(arrColumns[5])),
				label: labelToArray(result.getText(arrColumns[5]))
			};
			objProduct.winlossreason = {
				value: valToArray(result.getValue(arrColumns[7])),
				label: labelToArray(result.getText(arrColumns[7]))
			};
			objProduct.description = result.getValue(arrColumns[8]);
			objProduct.winner = {
				value: valToArray(result.getValue(arrColumns[9])),
				label: labelToArray(result.getText(arrColumns[9]))
			};
			objProduct.loser = {
				value: valToArray(result.getValue(arrColumns[10])),
				label: labelToArray(result.getText(arrColumns[10]))
			};
			objProduct.contractlength = result.getValue(arrColumns[12]);
			objProduct.quantity = result.getValue(arrColumns[13]) || 0;
			objProduct.oppid = result.getValue(arrColumns[14]);
			objProduct.customerid = result.getValue(arrColumns[11]);
			objProduct.include = result.getValue(arrColumns[15]);
			
			if (objProduct.include == 'T'){
				anyIncludes = true;
			}
			
			if (recId != null && recId != '') {
				return {
					row: objProduct
				};
			}
			
			arrData[arrData.length] = objProduct;
			rowNum++;
		}
	}
	while (resultSlice.length >= 1000);
	
	if (!anyIncludes){
		for (var k = 0; arrData != null && k < arrData.length; k++){
			arrData[k].include = 'T';
		}
	}
	
	//get list values
	var options_competitors = getValidCompetitorListValues();
	var options_products = getValidListValues('customrecord302');
	var options_conclusions = getValidListValues('customlistwinloss');
	var options_winlossreasons = getValidListValues('winlossreason');
	
	return {
		data: arrData,
		opts_competitors: options_competitors,
		opts_products: options_products,
		opts_conclusions: options_conclusions,
		opts_winlossreaons: options_winlossreasons,
		opportunity: {id: oppId},
		tran_driven: anyIncludes
	};
}

function valToArray(val){
	return (!isBlank(val)) ? val.split(',') : [];
}

function labelToArray(val){
	return (!isBlank(val)) ? val.split(',').join(', ') : [];
}

function formatText(str){
	str = str.replace(new RegExp("\r\n", 'g'), "<br>");
	str = str.replace(new RegExp("\n", 'g'), "<br>");
	str = str.replace(new RegExp("\r", 'g'), "<br>");
	return str;
}

function getValidListValues(listId){

	var objValidOptions = new Object();
	objValidOptions.options = new Array();
	
	var objOption = new Object();
	objOption.name = '';
	objOption.label = '';
	objValidOptions.options[objValidOptions.options.length] = objOption;
	
	if (listId != null && listId != '') {
		var arrFilters = new Array();
		arrFilters[arrFilters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		
		var arrColumns = new Array();
		arrColumns[0] = new nlobjSearchColumn('internalid');
		arrColumns[1] = new nlobjSearchColumn('name');
		
		var savedsearch = nlapiCreateSearch(listId, arrFilters, arrColumns);
		var resultSet = savedsearch.runSearch();
		
		resultSet.forEachResult(function(searchResult){
			var objOption = new Object();
			objOption.value = searchResult.getValue(arrColumns[0]);
			objOption.label = searchResult.getValue(arrColumns[1]);
			objValidOptions.options[objValidOptions.options.length] = objOption;
			return true; // return true to keep iterating
		});
	}
	return objValidOptions.options;
}

function getValidCompetitorListValues(){

	var objValidOptions = new Object();
	objValidOptions.options = new Array();
	
	var objOption = new Object();
	objOption.name = '';
	objOption.label = '';
	objOption.competes_with = [];
	objValidOptions.options[objValidOptions.options.length] = objOption;
	
	var arrFilters = new Array();
	arrFilters[arrFilters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	
	var arrColumns = new Array();
	arrColumns[0] = new nlobjSearchColumn('internalid');
	arrColumns[1] = new nlobjSearchColumn('name');
	arrColumns[2] = new nlobjSearchColumn('custrecordr7compcompetecatbooksales');
	
	var savedsearch = nlapiCreateSearch('competitor', arrFilters, arrColumns);
	var resultSet = savedsearch.runSearch();
	
	resultSet.forEachResult(function(searchResult){
		var objOption = new Object();
		objOption.value = searchResult.getValue(arrColumns[0]);
		objOption.label = searchResult.getValue(arrColumns[1]);
		objOption.competes_with = txtToArray(removeSpaces(searchResult.getValue(arrColumns[2])));
		
		objValidOptions.options[objValidOptions.options.length] = objOption;
		return true; // return true to keep iterating
	});
	
	return objValidOptions.options;
}

function txtToArray(str){

	if (str == null || str == '') {
		return [];
	}
	
	return str.split(',')
}

function removeSpaces(str){

	return (str == null || str == '') ? null : str.replace(/[\s]/g,'');
}

function isBlank(val){
	return (val == null || val == '') ? true : false;
}
