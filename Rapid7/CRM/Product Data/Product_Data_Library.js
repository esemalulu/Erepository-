/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       25 Sep 2014     efagone
 *
 */

function updateOppTotal(oppId){

	if (oppId != null && oppId != '') {
		
		var hasAdvanced = updateIncludeProdData(oppId);

		var arrFilters = [];
		arrFilters[arrFilters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		arrFilters[arrFilters.length] = new nlobjSearchFilter('custrecordr7competproddataopportunity', null, 'anyof', oppId);
		if (hasAdvanced) {
			arrFilters[arrFilters.length] = new nlobjSearchFilter('custrecordr7proddata_include', null, 'is', 'T');
		}
		
		var arrColumns = [];
		arrColumns[0] = new nlobjSearchColumn('custrecordr7competproddataprojtotal', null, 'sum');
		arrColumns[1] = new nlobjSearchColumn('formulanumeric', null, 'max');
		arrColumns[1].setFormula("{custrecordr7competproddataopportunity.department.id}");
		arrColumns[2] = new nlobjSearchColumn('custbodyr7opprenewalautomationcreated', 'custrecordr7competproddataopportunity', 'max');
		
		var arrResults = nlapiSearchRecord('customrecordr7competitiveproductdata', null, arrFilters, arrColumns);
		
		if (arrResults != null && arrResults.length > 0) {
			var newTotal = parseFloat(arrResults[0].getValue(arrColumns[0]) || 0);
			var oppDept = parseFloat(arrResults[0].getValue(arrColumns[1]));
			var raCreatedOpp = arrResults[0].getValue(arrColumns[1]);
			nlapiLogExecution('DEBUG', 'oppDept', oppDept);
			if (oppDept == 10 || raCreatedOpp == 'T'){ //account management
				return;
			}
			nlapiSubmitField('opportunity', oppId, 'projectedtotal', newTotal);
		}
		
	}
}

function getProdDataTranAmounts(oppId){
	
	var objProdData = {};
	objProdData.products = [];
	
	if (oppId != null && oppId != '') {
	
		var arrFilters = [];
		arrFilters[0] = new nlobjSearchFilter('opportunity', null, 'anyof', oppId);
		
		var arrResults = nlapiSearchRecord('transaction', 17687, arrFilters);

		var highRank = null;
		// 0 == salesorder
		// 1 == estimate
		for (var i = 0; arrResults != null && i < arrResults.length; i++) {
		
			var columns = arrResults[i].getAllColumns();
			var categoryid = arrResults[i].getValue(columns[1]);
			var total = arrResults[i].getValue(columns[2]) || 0;
			var transaction_rank = parseInt(arrResults[i].getValue(columns[3]));
			var quantity = arrResults[i].getValue(columns[4]);
			var contractlength = arrResults[i].getValue(columns[5]);

			if (highRank != null && transaction_rank != highRank){
				break;
			}
			
			highRank = transaction_rank;
			
			objProdData.products[objProdData.products.length] = {
				categoryid: categoryid,
				total: total,
				quantity: quantity,
				contractlength: contractlength,
				transaction_rank: transaction_rank,
				conclusion: (highRank == 0) ? 1 : '',
			};
			
		}
		
		objProdData.high_rank = highRank;
	}
	
	return objProdData;
}

function updateIncludeProdData(oppId){

	if (oppId != null && oppId != '') {
	
		var objData = getProdDataTranAmounts(oppId);
		var arrData = objData.products;
		
		var arrFilters = [];
		arrFilters[arrFilters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		arrFilters[arrFilters.length] = new nlobjSearchFilter('custrecordr7competproddataopportunity', null, 'anyof', oppId);
		
		var arrColumns = [];
		arrColumns[0] = new nlobjSearchColumn('internalid');
		arrColumns[1] = new nlobjSearchColumn('custrecordr7competproddataproduct');
		arrColumns[2] = new nlobjSearchColumn('custrecordr7competproddataprojtotal');
		arrColumns[3] = new nlobjSearchColumn('custrecordr7proddatawinner');
		arrColumns[4] = new nlobjSearchColumn('custrecordr7proddataloser');
		arrColumns[5] = new nlobjSearchColumn('custrecordr7competproddataconclusion');
		
		var arrResults = nlapiSearchRecord('customrecordr7competitiveproductdata', null, arrFilters, arrColumns);
		
		var locked = (objData.high_rank === 0) ? 'T' : 'F';
		var hasAdvanced = false;
		for (var i = 0; arrResults != null && i < arrResults.length; i++) {
		
			var columns = arrResults[i].getAllColumns();
			var recid = arrResults[i].getValue(columns[0]);
			var categoryid = arrResults[i].getValue(columns[1]);
			var currentWinner = arrResults[i].getValue(columns[3]);
			var currentLoser = arrResults[i].getValue(columns[4]);
			var currentConclusion = arrResults[i].getValue(columns[5]);
			
			var total = 0;
			var found = 'F';
			var conclusion = '';
			for (var j = 0; arrData != null && j < arrData.length; j++) {
			
				if (arrData[j].categoryid == categoryid) {
					found = 'T';
					total = arrData[j].total;
					conclusion = arrData[j].conclusion;
					incumbent = arrData[j].incumbent;
					quantity = arrData[j].quantity;
					contractlength = arrData[j].contractlength;
					arrData.splice(j, 1);
					hasAdvanced = true;
					break;
				}
			}
			
			var fields = [];
			var values = [];
			
			if (found == 'T') {
				fields[fields.length] = 'custrecordr7competproddataprojtotal';
				values[values.length] = total;
				
				fields[fields.length] = 'custrecordr7competproddatacontractlength';
				values[values.length] = contractlength;
				
				fields[fields.length] = 'custrecordr7proddataqty';
				values[values.length] = quantity;
			}
			else 
				if (objData.high_rank === 0) {
					conclusion = 2; //lost
				}
			
			if (conclusion == 2) {
				fields[fields.length] = 'custrecordr7proddataloser';
				values[values.length] = 90; //R7
			}
			
			if (conclusion == 1) {
				fields[fields.length] = 'custrecordr7proddatawinner';
				values[values.length] = 90; //R7
			}
			
			//if (found == 'T' || objData.high_rank === 0) {
				fields[fields.length] = 'custrecordr7competproddataconclusion';
				values[values.length] = conclusion;
			//}
			
			fields[fields.length] = 'custrecordr7proddata_include';
			values[values.length] = found;
			
			fields[fields.length] = 'custrecordr7proddata_locked';
			values[values.length] = locked;
			
			nlapiSubmitField('customrecordr7competitiveproductdata', recid, fields, values);
		}
		
		for (var j = 0; arrData != null && j < arrData.length; j++) {
			var recProd = nlapiCreateRecord('customrecordr7competitiveproductdata');
			recProd.setFieldValue('custrecordr7competproddataproduct', arrData[j].categoryid);
			recProd.setFieldValue('custrecordr7competproddataopportunity', oppId);
			recProd.setFieldValue('custrecordr7proddata_include', 'T');
			recProd.setFieldValue('custrecordr7competproddataprojtotal', arrData[j].total);
			recProd.setFieldValue('custrecordr7competproddatacontractlength', arrData[j].contractlength);
			recProd.setFieldValue('custrecordr7proddataqty', arrData[j].quantity);
			recProd.setFieldValue('custrecordr7competproddataconclusion', arrData[j].conclusion);
			recProd.setFieldValue('custrecordr7proddatawinner', (arrData[j].conclusion == 1) ? 90 : '');
			recProd.setFieldValue('custrecordr7proddataloser', (arrData[j].conclusion == 2) ? 90 : '');
			recProd.setFieldValue('custrecordr7proddata_locked', locked);
			nlapiSubmitRecord(recProd);
			hasAdvanced = true;
		}
		
		return hasAdvanced;
	}
	
	return false;
}
