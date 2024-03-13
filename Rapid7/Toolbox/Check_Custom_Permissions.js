/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       15 Aug 2014     mburstein
 * 1.10       20 Aug 2014     mburstein			Split function into a search to load all permissions and a seperate permission check 
 * 
 * The Check_Custom_Permissions module provides a custom set of permissions checking features to a script.  
 * The functions work in conjunction with the Custom Script Permissions record to 
 * 	load an object (objCustomPermissions) with details on which Employee, Roles and Departments should be permitted access to a specific feature.
 * The object can then be queried on a case-by-case basis to limit feature access.
 * 
 * @module Check_Custom_Permissions
 * @main getCustomPermissions
 */
/**
 * Search the Custom Permissions record type and return an object that maps each recordId (feature ID) 
 * 	to it's permitted parties (users/roles/departments).  
 * 	Best practice to load all features into global var to avoid having to do multiple searches for each permissions check. 
 * 	Optionally, provide a specific record internal ID to limit the search to a specific feature.
 * 
 * @method getCustomPermissions
 * @return {Object} objCustomPermissions Maps feature ID to name/employee/role/department
 */

var objCustomPermissions = null;

function getCustomPermissions(){

	var objPerms = {};
	
	var arrFilters = [];
	arrFilters[arrFilters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
	
	var arrColumns = [];
	arrColumns.push(new nlobjSearchColumn('name'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7cusspfeatureid')); // Feature ID field
	arrColumns.push(new nlobjSearchColumn('custrecordr7cusspallemployees')); // All Employees field
	arrColumns.push(new nlobjSearchColumn('custrecordr7cusspemployees')); // Employees field
	arrColumns.push(new nlobjSearchColumn('custrecordr7cusspallroles')); // All Roles field
	arrColumns.push(new nlobjSearchColumn('custrecordr7cussproles')); // Roles field
	arrColumns.push(new nlobjSearchColumn('custrecordr7cusspalldepartments')); // All Departments field
	arrColumns.push(new nlobjSearchColumn('custrecordr7cusspdepartments')); // Departments field
	
	// Serach Custom Script Permissions record
	var savedsearch = nlapiCreateSearch('customrecordr7cussp', arrFilters, arrColumns);
	var resultSet = savedsearch.runSearch();
	
	var rowNum = 0;
	do {
		var resultSlice = resultSet.getResults(rowNum, rowNum + 1000);
		for (var i = 0; resultSlice != null && i < resultSlice.length; i++) {
		
			objPerms[resultSlice[i].getValue('custrecordr7cusspfeatureid')] = {
				internalid: resultSlice[i].getId(),
				name: resultSlice[i].getValue('name'),
				feature: resultSlice[i].getValue('custrecordr7cusspfeatureid'),
				all_employees: strToArray(resultSlice[i].getValue('custrecordr7cusspallemployees')),
				employees: strToArray(resultSlice[i].getValue('custrecordr7cusspemployees')),
				all_roles: strToArray(resultSlice[i].getValue('custrecordr7cusspallroles')),
				roles: strToArray(resultSlice[i].getValue('custrecordr7cussproles')),
				all_departments: strToArray(resultSlice[i].getValue('custrecordr7cusspalldepartments')),
				departments: strToArray(resultSlice[i].getValue('custrecordr7cusspdepartments'))
			};
			
			rowNum++;
		}
	}
	while (resultSlice.length >= 1000);
	
	return objPerms;
}
	
/**
 * Check the specific access of the given feature.  Ideal usage requires the objCustomPermissions object loaded globally to reduce governance usage.
 * 	If the objCustomPermissions object doesn't exist then create it for the given feature ID at runtime
 * 
 * @method userHasPermission
 * @param {Number|String} featureId The record Id of the Custom Script Permissions record for the specific feature
 * @return {Boolean} [hasAccess=false] true if the user is allowed access to the feature
 */
function userHasPermission(featureId){

	// If the objCustomPermissions object doesn't exist then create it for the given feature ID
	if (!objCustomPermissions) {
		objCustomPermissions = getCustomPermissions();
	}
	
	if (!featureId || !objCustomPermissions.hasOwnProperty(featureId)) {
		// feature doesn't exist... should never happen
		nlapiLogExecution('ERROR', 'Custom permission feature not found', featureId);
		return false;
	}
	
	// Check if role is permitted access
	var roleId = nlapiGetRole(); // -31 is returned if a user cannot be properly identified by NetSuite
	if ((objCustomPermissions[featureId].all_roles == 'T' && roleId != -31) || objCustomPermissions[featureId].roles.indexOf(roleId) != -1 || objCustomPermissions[featureId].roles.indexOf(roleId.toString()) != -1) {
		return true;
	}
	
	// Check if department is permitted access
	var departmentId = nlapiGetDepartment();
	if (objCustomPermissions[featureId].all_departments == 'T' || objCustomPermissions[featureId].departments.indexOf(departmentId) != -1 || objCustomPermissions[featureId].departments.indexOf(departmentId.toString()) != -1) {
		return true;
	}
	
	// Check if user is permitted access
	var userId = nlapiGetUser(); //-4 is returned if a user cannot be properly identified by NetSuite.
	if ((objCustomPermissions[featureId].all_employees == 'T' && userId != -4) || objCustomPermissions[featureId].employees.indexOf(userId) != -1 || objCustomPermissions[featureId].employees.indexOf(userId.toString()) != -1) {
		return true;
	}
	
	return false;
}

function strToArray(val){
	return (val == null || val == '') ? [] : val.split(',');
}