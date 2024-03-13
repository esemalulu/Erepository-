/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       18 Sep 2012     efagone
 *
 */

/**
 * @param {Object} dataIn Parameter object
 * @returns {Object} Output object
 */
function post_mobilisafe(dataIn){

	try {
		//grabbing all input data
	        var toURL = nlapiRequestURL(nlapiResolveURL('SUITELET','customscriptretrieveurl','customdeployretrieveurl',true)).getBody();
		var params = new Array();
		params['custparamauthcode'] = '4cLJ5RyDHb8hVhmVCxCm6raT9DXtEVd2bBsLvRoRjUMwEpyL2vpRj5v6VNV3yb';
		params['custparamfirstname'] = grabValue(dataIn, 'firstName');
		params['custparamlastname'] = grabValue(dataIn, 'lastName');
		params['custparamtitle'] = grabValue(dataIn, 'title');
		params['custparamcompanyname'] = grabValue(dataIn, 'companyName');
		params['custparamuse'] = grabValue(dataIn, 'typeOfUse');
		params['custparamemail'] = grabValue(dataIn, 'email');
		params['custparamphone'] = grabValue(dataIn, 'phoneNumber');
		params['custparamcountry'] = grabValue(dataIn, 'country');
		params['custparamstate'] = grabValue(dataIn, 'state');
		params['custparamcustentityr7annualrevenue'] = grabValue(dataIn, 'annualRevenue');
		params['custparamleadsource'] = grabValue(dataIn, 'leadSource');
		params['custparamproductaxscode'] = grabValue(dataIn, 'accessCode');
		params['custparamemailserver'] = grabValue(dataIn, 'emailServer');
		params['custparamrandomnumber'] = Math.floor(Math.random() * 99999999);
		
		var logStatement = 'PARAMS:\n';
		
		for (key in params){
			logStatement += '\n' + key + ': ' + params[key];
		}
		
		nlapiLogExecution('DEBUG', 'Request Params', logStatement);
		nlapiLogExecution('DEBUG', 'Sending Request To Suitelet', new Date());
		//var suiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7mobilisafeinprodreg_suitel', 'customdeployr7mobilisafeinprodreg_suitel', true);
		var suiteletResponse = nlapiRequestURL(toURL+'/app/site/hosting/scriptlet.nl?script=572&deploy=1&compid=663271&h=df1fedabb9771f4b393d', params);
		var suiteletJSON = suiteletResponse.getBody();
		
		nlapiLogExecution('DEBUG', 'Recieved Response From Suitelet', new Date());
		nlapiLogExecution('DEBUG', 'Response - suiteletJSON', suiteletJSON);
		
		var objResponse = JSON.parse(suiteletJSON);
		
		if (objResponse.success) {
			return buildSuccessResponseObj(objResponse.internalId);
		}
		else {
			return createErrorObj(objResponse.message);
		}
		
	} 
	catch (err) {
		nlapiLogExecution('ERROR', 'Details', err);
		return createErrorObj(err);
	}
}


function grabValue(dataIn, field){

	var value = '';
	if (dataIn.hasOwnProperty(field)) {
		value = dataIn[field];
	}
	else {
		value = null;
	}
	
	return value;
}
