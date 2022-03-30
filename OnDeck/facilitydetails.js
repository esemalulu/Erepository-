/**
 * @author charlie
 */
function getFacilityInformation(request, response){
	var customerID = request.getParameter('id');
	
	var customerline = searchCustomer(customerID);
	response.write("var customerinfo= '("+ customerline + ")';\n");
	response.write("var customer = eval(customerinfo);\n");
	response.write("drawCustomer(customer);");
		
}

function searchCustomer(pID){
	var returns = "";
	var filters = new Array();
	filters.push(new nlobjSearchFilter('internalid', null, 'is', pID));
		
	var searchresults = nlapiSearchRecord('Customer', 14, filters, null);
	
	if(searchresults){
		var i = 0;
		var lines = new Array();
		var columns = searchresults[i].getAllColumns();
		for(var j=0;j<columns.length;j++){
			var value = searchresults[ i ].getValue(columns[j]);
			if(columns[j].getName().indexOf("image") != -1){
				value = searchresults[ i ].getText(columns[j]);
			}
			var line = '"' + columns[j].getName() + '":"' + escape(value) + '"';
			lines.push(line);
		}
		
		returns = '{' + lines.join(',') + '}';
	}
	
	return returns;
	
}

