/*
 * @author efagone
 */

function r7_dynamic_marginal_pricing_suite_helper(request, response) {

	try {
nlapiLogExecution('ERROR','body',request.getBody());
		var objRequest = (request.getBody()) ? JSON.parse(request.getBody()) : {};
		var objResponse = {
			success : false,
			error : null
		};

		var suiteletActions = {
			'get_data_tiers' : function() {
				objResponse = get_data_tiers();
			},
			'default' : function() {
				objResponse = {
					success : false,
					error : 'INVALID_OPERATION'
				};
			}
		};

		(suiteletActions[objRequest.operation] || suiteletActions['default'])();

	}
	catch (e) {
		nlapiLogExecution('ERROR', 'ERROR r7_dynamic_marginal_pricing_suite_helper', e);
		objResponse = {
			success : false,
			error : (e || '').toString()
		};
	}

	nlapiLogExecution('AUDIT', 'Response', JSON.stringify(objResponse));
	response.setContentType('JSON');
	response.write(JSON.stringify(objResponse));
	return;
}

function get_data_tiers(){

	var objDataTiers = {};
	
	var arrFilters = [];
	arrFilters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
	
	var arrColumns = [];
	arrColumns.push(new nlobjSearchColumn('internalid'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7_datatier_itemfamily').setSort(false));
	arrColumns.push(new nlobjSearchColumn('custrecordr7_datatier_quantity').setSort(false));
	arrColumns.push(new nlobjSearchColumn('custrecordr7_datatier_data_mb'));
	
	var newSearch = nlapiCreateSearch('customrecordr7_data_tier');
	newSearch.setFilters(arrFilters);
	newSearch.setColumns(arrColumns);
	var resultSet = newSearch.runSearch();
	
	var rowNum = 0;
	do {
		var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
		for (var rs in resultSlice) {
			rowNum++;

			var itemFamily = resultSlice[rs].getValue('custrecordr7_datatier_itemfamily');
			var objFamily = (objDataTiers.hasOwnProperty(itemFamily)) ? objDataTiers[itemFamily] : {
				tiers: []
			};
			
			objFamily.tiers.push({
				item_family: {
					id: resultSlice[rs].getValue('custrecordr7_datatier_itemfamily'),
					text: resultSlice[rs].getText('custrecordr7_datatier_itemfamily')
				},
				threshold: resultSlice[rs].getValue('custrecordr7_datatier_quantity'),
				data_mb: resultSlice[rs].getValue('custrecordr7_datatier_data_mb')
			});
			
			objDataTiers[itemFamily] = objFamily;
		}
	}
	while (resultSlice.length >= 1000);
	
	return {
		success: true,
		data: objDataTiers
	};
}