/**
 * Helper functions can be accessed by any other suitescript deployed on DesignPoint's NetSuite Env.
 * 
 */

//returns context object
var ctx = nlapiGetContext();

/**
 * Debugging tool:
 * Prints key/values of javascript Obect
 * @param {Object} _obj = javascript Object
 */
function printObject(_obj) {
	for (var key in _obj) {
		log('DEBUG','Printing Object Key/value',key+' :: '+_obj[key]);
	}
}

/**
 * @param _curArrayIndex: Current index of an array being processed
 * @param _rslt: Actual result set from calling Scheduled Script
 * @param _exitCnt: Exit governance provided on the calling scheduled script 
 * @returns
 * Returns true if scheduled script runs out of governance and gets rescheduled.
 * getParam function should be provided on the Scheduled script file
 * 
 */

function verifyMeter(_curArrayIndex, _rslt, _exitCnt) {
	log('DEBUG','Usage Meter','-------------------------'+ctx.getRemainingUsage()+'---------------------------');
	if (ctx.getRemainingUsage() <=_exitCnt && (_curArrayIndex+1) < _rslt.length) {
		var schStatus = nlapiScheduleScript(ctx.getScriptId(), ctx.getDeploymentId(), getParam(_rslt[_curArrayIndex]));
		if (schStatus=='QUEUED') {
			return true;
		}
	} else {
		return false;
	}
}

/**
 * Does global search from provided _fullString for _searchChar and replace it with _replaceChar
 * @param _fullString
 * @param _searchChar
 * @param _replaceChar
 * @returns

 */
function strGlobalReplace(_fullString, _searchChar, _replaceChar) {
	var jsrs = new RegExp(_searchChar, "g");
	
	return _fullString.replace(jsrs,_replaceChar);
}


/**
 * Returns formatted error message from calling scripts' try catch block
 * @param _e
 * @returns
 */
function getErrText(_e) {
	var txt='';
	if (_e instanceof nlobjError) {
		//this is netsuite specific error
		txt = 'NLAPI Error: '+_e.getCode()+' :: '+_e.getDetails();
	} else {
		//this is generic javascript error
		txt = 'JavaScript/Other Error: '+_e.toString();
	}
	return strGlobalReplace(txt,"\\,","_"); ;
}

/**
 * Logs DEBUG or ERROR messages on the Execution Log
 */
function log(_type, _title, _msg) {
	nlapiLogExecution(_type, _title, _msg);
}
