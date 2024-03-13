/**
 * @param {Object} dataIn Parameter object
 * @returns {Object} Output object
 */
function get(dataIn) {
	var dataOut = new Array();
	var searchId = nlapiGetContext().getSetting('SCRIPT', 'custscriptsavedsearchid'); // customsearch20715
	
	try {
		var savedSearch = nlapiLoadSearch('employee', searchId);
		var cols = savedSearch.getColumns();
		var resultSet = savedSearch.runSearch();
		var count = 0;
		var timing = 0;
		
	/*	var resultsSlice = resultSet.getResults(0, 100);

		resultsSlice.forEach(function(element, index, array) {
			results.push(element);
			
			var userInfo = getUserInfoStub();
			userInfo['Name'] = element.getValue('entityid');
			userInfo['Department'] = element.getText('department');
			userInfo['Job Title'] = element.getValue('title');
			userInfo['Email'] = element.getValue('email');
			userInfo['Role'] = element.getText('role');
			userInfo['Supervisor Direct'] = element.getText('custentityr7supervisordirect');
			userInfo['Manager Email'] = element.getValue(cols[6]);
			userInfo['Employee Status'] = element.getText('employeestatus');
			userInfo['Start Date'] = element.getValue('hiredate');
			userInfo['Release Date'] = element.getValue('releasedate');
			userInfo['Inactive'] = element.getValue('isinactive');
			results.push(userInfo);
			
			count++;
		});*/
		
		resultSet.forEachResult(function(searchResult){
			var userInfo = getUserInfoStub();
			userInfo['Name'] = searchResult.getValue('entityid');
			userInfo['Department'] = searchResult.getText('department');
			userInfo['Job Title'] = searchResult.getValue('title');
			userInfo['Email'] = searchResult.getValue('email');
			userInfo['Role'] = searchResult.getText('role');
			userInfo['Supervisor Direct'] = searchResult.getText('custentityr7supervisordirect');
			userInfo['Manager Email'] = searchResult.getValue(cols[6]);
			userInfo['Employee Status'] = searchResult.getText('employeestatus');
			userInfo['Start Date'] = searchResult.getValue('hiredate');
			userInfo['Release Date'] = searchResult.getValue('releasedate');
			userInfo['Inactive'] = searchResult.getValue('isinactive');
			dataOut.push(userInfo);
			
			count++;
			return true;
		});
	} catch (err) {
		var stackTrace = err.stackTrace[0];
		for (var i=1;i<err.stackTrace.length;i++) {
			stackTrace += ', ' + err.stackTrace[i];
		}
		
		dataOut = new Object;
		var error = new Object();
		error.code = err.code;
		error.message = err.message;
		dataOut.error = error;
		dataOut.stackTrace = err.stackTrace;
		dataOut.searchId = searchId;
	}
	
	return dataOut;
}

/**
 * Used to get empty user info object to be filled further
 * @returns empty user info object
 */
function getUserInfoStub() {
	var ret = Object();
	
	ret['Name'] = null;
	ret['Department'] = null;
	ret['Job Title'] = null;
	ret['Email'] = null;
	ret['Role'] = null;
	ret['Supervisor Direct'] = null;
	ret['Manager Email'] = null;
	ret['Employee Status'] = null;
	ret['Start Date'] = null;
	ret['Release Date'] = null;
	ret['Inactive'] = null;
	
	return ret;
}