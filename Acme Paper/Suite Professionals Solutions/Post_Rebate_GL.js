/**
 * Module Description
 * 
 * Version Date Author Remarks 1.00 16 May 2017 Michael
 * 
 */

function rebatePost(request, response) {
	var fromDate = request.getParameter('custpage_from_date');
	var toDate = request.getParameter('custpage_to_date');
	var vendor = request.getParameter('custpage_vendor');
	var warehouse = request.getParameter('custpage_warehouse');

	if (request.getMethod() == 'GET') {

		form = nlapiCreateForm('Rebate Search', false);
		form.addField('custpage_vendor', 'text', 'Vendor').setDisplayType('entry');
		form.addField('custpage_from_date', 'date', 'From Date').setDisplayType('entry');
		form.addField('custpage_to_date', 'date', 'To Date').setDisplayType('entry');
		form.addField('custpage_warehouse', 'select','Warehouse','location').setDisplayType('entry');
		form.addSubmitButton('Search');

		response.writePage(form);

	} else if ((fromDate && toDate) && vendor) {
		form = nlapiCreateForm('Rebate Total Results', false);
		form.addSubmitButton('Post');
		
		list = form.addSubList('custpage_sublist', 'list', 'Rebate Search Results', 'general');
		list.addField('selected', 'checkbox', 'Selected');
		list.addField('totalbillcost', 'text', 'Total Bill Cost');
		list.addField('totalcontractcost', 'text', 'Total Contract Cost');
		list.addField('totalrebateamount', 'text', 'Total Rebate Amount');
		list.addField('totalvendor', 'text', 'Vendor');
		list.addField('totalmonth', 'text', 'Month');
		list.addMarkAllButtons();
		
		var filters = new Array();

	   filters[0] =	new nlobjSearchFilter('type', null, 'anyof', 'CustInvc');
	   filters[1] = new nlobjSearchFilter('mainline', null, 'is', 'F');
	   filters[2] = new nlobjSearchFilter('vendtype', null, 'anyof', '@ALL@'); 
	   filters[3] = new nlobjSearchFilter('taxline', null, 'is', 'F'); 
	   filters[4] = new nlobjSearchFilter('shipping', null, 'is', 'F'); 
	   filters[5] = new nlobjSearchFilter('custcol_rebate_id', null, 'noneof', '@NONE@'); 
	   filters[6] = new nlobjSearchFilter('custcol_vendor', null, 'startswith', vendor); 
	   filters[7] = new nlobjSearchFilter('location', null, 'anyof', '2, 7, 12'); 
	   filters[8] = new nlobjSearchFilter('trandate', null, 'within', fromDate, toDate);
		
		
		/* var s = nlapiLoadSearch(null,'195');
		 var filters = s.getFilters();
		 throw new Error(filters[0]+"  "+filters[1]+"  "+filters[2]+"  "+filters[3]+"  "+filters[4]+"  "+filters[5]+"  "+filters[6]+"  "+filters[7]+"  "+filters[8]);*/

	 var searchResult = nlapiSearchRecord('transaction', 'customsearch195', filters);
		if (!searchResult || searchResult.length <= 0) {
			throw new Error('No results returned after executing search.');
		} else {
			
			var totalRebateAmountArray =0;
			var contractCostArray =0;
			var totalCogsArray =0;
			for (var i = 0; i < searchResult.length; i++) {

			
				
				var resultSet = searchResult[i];
				columns = resultSet.getAllColumns();
				var billPrice = resultSet.getValue(columns[20]);
				var contractCost = resultSet.getValue(columns[22]);
				var quantity = resultSet.getValue(columns[23]);
				var month = resultSet.getValue(columns[26]);
				var vendorText = resultSet.getValue(columns[14]);
				
				
				contractCost = parseFloat(contractCost);
				quantity = parseFloat(quantity);
				totalCogsArray = parseFloat(totalCogsArray);
				contractCostArray = parseFloat(contractCostArray);
				totalRebateAmountArray = parseFloat(totalRebateAmountArray);
				
			//	throw new Error(billPrice);
				
				if(billPrice){
					// throw new Error(billPrice);
					billPrice = parseFloat(billPrice);
					billPrice = billPrice * quantity;
					totalCogsArray = totalCogsArray + billPrice;
					
					
				}else{
					totalCogsArray = totalCogsArray + 0;
				}
				
			
				
				
			
				
			
				
				
				
				
				contractCost = contractCost * quantity;
				contractCostArray = contractCostArray + contractCost;
			
				totalRebateAmountArray = totalCogsArray - contractCostArray;
				
				totalCogsArray = totalCogsArray.toFixed(2);
				contractCostArray = contractCostArray.toFixed(2);
				totalRebateAmountArray = totalRebateAmountArray.toFixed(2);
				
			

			}
			// var itemlin = parseInt(i) + parseInt(1);
			
			list.setLineItemValue('totalbillcost', 1, totalCogsArray);
			list.setLineItemValue('totalcontractcost', 1, contractCostArray);
			list.setLineItemValue('totalrebateamount', 1, totalRebateAmountArray);
			list.setLineItemValue('totalvendor', 1, vendorText);
			list.setLineItemValue('totalmonth', 1, month);
		}
		response.writePage(form);
	} else {
		
		// 150 Rebate Receivable Debit id=398
		// 405 Supplier rebates Credit id=402
		// 699 Rebate clearing id=399
		var rebateR = 398;
		var supplierR = 402;
		//var memo = "Dart April";
		
		for (i = 1; i <= request.getLineItemCount('custpage_sublist'); i++) {
			
			if (request.getLineItemValue('custpage_sublist','selected', i) == 'T') {
				
				var totalrebateAmount = request.getLineItemValue('custpage_sublist', 'totalrebateamount', i);
				var vendor = request.getLineItemValue('custpage_sublist', 'totalvendor', i);
				var month = request.getLineItemValue('custpage_sublist', 'totalmonth', i);
			}
			
		}
		var memo = vendor+" "+month;
		//throw new Error(totalrebateAmount);
		var record = nlapiCreateRecord('journalentry');
		record.selectNewLineItem('line');
		record.setCurrentLineItemValue('line','account',rebateR);
		record.setCurrentLineItemValue('line','debit',totalrebateAmount);
		record.setCurrentLineItemValue('line','memo',memo);
		record.commitLineItem('line');
		
		record.selectNewLineItem('line');
		record.setCurrentLineItemValue('line','account',supplierR);
		record.setCurrentLineItemValue('line','credit',totalrebateAmount);
		record.setCurrentLineItemValue('line','memo',memo);
		record.commitLineItem('line');
		
		var id = nlapiSubmitRecord(record, true);
	}

}