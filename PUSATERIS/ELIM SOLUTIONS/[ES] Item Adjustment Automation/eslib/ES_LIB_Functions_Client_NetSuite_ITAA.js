/*thisifilename="ES_LIB_Functions_Client_NetSuite.js";*/
/**************** This is for NetSuite Functions, Client Side only***********************/
/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.029      Dec. 11, 2014     richard@elimsolutions.ca	
 * Modified:
 * 1) 
 *
 */
function Section_Browser_Compatibility____________________________________________(){};
//===================================================================================================Browser Compatibility, start (must be place at beginning)
if(!(window.console && console.log)){////patch for IE
  console = {
	log: function(){},
	debug: function(){},
	info: function(){},
	warn: function(){},
	error: function(){}
  };
}
Object.keys = Object.keys || (function(o) {
	if (o !== Object(o))
		throw new TypeError('Object.keys called on a non-object');
	var k=[];
	for (var p in o) if (Object.prototype.hasOwnProperty.call(o,p)) k.push(p);
	return k;
});

String.prototype.trim = String.prototype.trim || (function() {
	return this.replace(/^\s+|\s+$/g, ''); 
});
////===================================================================================================Browser Compatibility, end (must be place at beginning)

function Section_Validate_Variable____________________________________________(){};
////===================================================================================================Validate Variable, start

////===================================================================================================Validate Variable, end

function Section_Log_Related____________________________________________(){};
////===================================================================================================Log Related, start
////===================================================================================================Log Related, end

function Section_Time_Related____________________________________________(){};
////===================================================================================================Time Related, start
function getDateFromCurrDate(dtCurrDate){
	if(typeof(dtCurrDate)== "undefined" || dtCurrDate==null || dtCurrDate=="") return null;
	
	var stDate=nlapiDateToString(dtCurrDate);
	return stDate;
}
function getTimeFromCurrDate(dtCurrDate){
	if(typeof(dtCurrDate)== "undefined" || dtCurrDate==null || dtCurrDate=="") return null;
	
	var stDateTime=nlapiDateToString(dtCurrDate, "datetime");
	var arrDateTime=stDateTime.split(" ");
	if(arrDateTime.length>=2){
		var stTime=arrDateTime[1]+" "+arrDateTime[2];
		return stTime;
	}
}
////===================================================================================================Time Related, end

function Section_Format_Related____________________________________________(){};
////===================================================================================================Format Related, start
////===================================================================================================Format Related, end

function Section_Miscellaneous____________________________________________(){};
////===================================================================================================Miscellaneous, start (sorted by alphabet)
/*
 * search the Script Deployments's internalid by given a Script ID, or a Deployment's ID
 * e.g. given ('customscript_es_sog_sl_script_log_viewer', null), return ["41", "45"]
 * e.g. given ('customscript_es_sog_sl_script_log_viewer', 'customdeploy_es_sog_sl_script_log_viewer'), return  ["45"]
 * e.g. given (null, 'customdeploy_es_sog_sl_script_log_viewer') return  ["45"]
 */
function getScriptDeploymentInternalID(SciptID, DeploymentID){
	var filters=[['script.scriptid','is',SciptID]];
	if(DeploymentID){
		if(filters && filters.length>0) filters.push('AND');
		filters.push(['scriptid','is',DeploymentID]);
	}
	var columns = [new nlobjSearchColumn('internalid')];
	var results = nlapiSearchRecord('scriptdeployment',null,filters,columns);
	var arrInternalid=[];
	if(results && results.length>0) for(var i=0;i<columns.length;i++) arrInternalid.push(results[i].getValue('internalid'));
	return arrInternalid;
}
/*
 * search the Script's internalid by given a Script's script id
 * e.g. given 'customscript_es_sog_sl_script_log_viewer', return 49
 */
function getScriptInternalID(SciptID){
	var filters=[['scriptid','is',SciptID]];
	var columns = [new nlobjSearchColumn('internalid')];
	var results = nlapiSearchRecord('script',null,filters,columns);
	var arrInternalid=[];
	if(results && results.length>0) for(var i=0;i<columns.length;i++) arrInternalid.push(results[i].getValue('internalid'));
	return arrInternalid;
}
function insertSelectOption(fld, objSelArr, idName, valueName){
	if(!isNOE(objSelArr)){
		for ( var i = 0; objSelArr != null && i < objSelArr.length; i++ ){
			var objSel = objSelArr[i] ;
		    var id	 = objSel[idName];
		    var name = objSel[valueName];
			nlapiInsertSelectOption(fld, id, name, false);
		}//for
	}//if(results !=null)
	else{
		nlapiInsertSelectOption(fld,'(No Data)', '(No Data)', false);
	}//if(results !=null)
}
////===================================================================================================Miscellaneous, end (sorted by alphabet)
