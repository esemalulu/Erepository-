function getRecord(args) {
	// args processing
	var searchNumber = args.searchNumber || '730'; searchNumber = parseInt(searchNumber);
	var offset = args.offset || '0'; offset = parseInt(offset);
	var limit = args.limit || '1000'; limit = parseInt(limit);
	var output = { 'suppliedArguments':args, 'processedArguments': { 'searchNumber':searchNumber, 'offset':offset, 'limit':limit } };

	var search = nlapiLoadSearch('transaction','customsearch' + searchNumber);
	var columns = search.getColumns();
	output.columns = columns.map( function(column){ return column.getName(); } );
	var resultSet = search.runSearch();

	if (true) {
		output.results = resultSet.getResults(offset, offset+limit);
	} else {
		// experimental
		var results = [];
		var chunk;
		for (var i = 0; i < limit; i += chunk.length) {
			// Not quite right: can return up to 999 more records than requested
			chunk = resultSet.getResults(offset+i, offset+i+1000);
			if (chunk.length == 0)
				break;
			else
				results = results.concat(chunk);
		}
		output.results = results;
	}

	return output;
}
