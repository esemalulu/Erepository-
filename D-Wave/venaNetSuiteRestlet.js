function get(args) {
	// Process arguments
	var searchNumber = args.searchNumber; searchNumber = parseInt(searchNumber);
	var offset = args.offset || '0'; offset = parseInt(offset);
	var limit = args.limit || '1000'; limit = parseInt(limit);
	var output = { 'suppliedArguments':args, 'processedArguments': { 'searchNumber':searchNumber, 'offset':offset, 'limit':limit } };

	// Execute the search
	var search = nlapiLoadSearch('transaction','customsearch' + searchNumber);
	var columns = search.getColumns();
	output.columns = columns.map( function(column){ return column.getName(); } );
	var resultSet = search.runSearch();
	output.results = resultSet.getResults(offset, offset+limit);

	return output;
}
