
var isCreate = false;
//Script level parameter to map out subsidiary to currency
var paramUkSubs = nlapiGetContext().getSetting('SCRIPT', 'custscript_266sbuksubsid');
var paramUkCurr = nlapiGetContext().getSetting('SCRIPT', 'custscript_266sbukcurrid');

var paramUsaSubs = nlapiGetContext().getSetting('SCRIPT', 'custscript_266sbusasubsid');
var paramUsaCurr = nlapiGetContext().getSetting('SCRIPT', 'custscript_266sbusacurrid');

var paramSgSubs = nlapiGetContext().getSetting('SCRIPT', 'custscript_266sbsgsubsid');
var paramSgCurr = nlapiGetContext().getSetting('SCRIPT', 'custscript_266sbsgcurrid');

var paramUaeSubs = nlapiGetContext().getSetting('SCRIPT', 'custscript_266sbuaesubsid');
var paramUaeCurr = nlapiGetContext().getSetting('SCRIPT', 'custscript_266sbuaecurrid');

function setCurrencyPageInit(type) {
	
	//swap parameter ID based on environment. This added because the IDs are different between the two env. 
	//	- In order to make script parameter unique to this script, Internal ID of script was used to create paramter IDs.
	if (nlapiGetContext().getEnvironment()=='PRODUCTION') {
		paramUkSubs = nlapiGetContext().getSetting('SCRIPT', 'custscript_311sbuksubsid');
		paramUkCurr = nlapiGetContext().getSetting('SCRIPT', 'custscript_311sbukcurrid');
		paramUsaSubs = nlapiGetContext().getSetting('SCRIPT', 'custscript_311sbusasubsid');
		paramUsaCurr = nlapiGetContext().getSetting('SCRIPT', 'custscript_311sbusacurrid');
		paramSgSubs = nlapiGetContext().getSetting('SCRIPT', 'custscript_311sbsgsubsid');
		paramSgCurr = nlapiGetContext().getSetting('SCRIPT', 'custscript_311sbsgcurrid');
		paramUaeSubs = nlapiGetContext().getSetting('SCRIPT', 'custscript_311sbuaesubsid');
		paramUaeCurr = nlapiGetContext().getSetting('SCRIPT', 'custscript_311sbuaecurrid');
	}
	
	//Identify 
	if (type=='create') {
		isCreate = true;
	}
}

function setCurrencyFidChange(type, name, linenum) {
	//ONLY check if create
	if (!isCreate) {
		return;
	}
	
	//ONLY fire if currency is empty
	if (name == 'subsidiary' && nlapiGetFieldValue(name)) {
		if (nlapiGetFieldValue(name) == paramUkSubs) {
			nlapiSetFieldValue('currency', paramUkCurr);
		} else if (nlapiGetFieldValue(name) == paramUsaSubs) {
			nlapiSetFieldValue('currency', paramUsaCurr);
		} else if (nlapiGetFieldValue(name) == paramSgSubs) {
			nlapiSetFieldValue('currency', paramSgCurr);
		} else if (nlapiGetFieldValue(name) == paramUaeSubs) {
			nlapiSetFieldValue('currency', paramUaeCurr);
		}
	}
}

function validateCurrencyField(type, name, line) {
	if (name=='currency') {
		alert(nlapiGetFieldValue(name));
	}
}

function syncCurrencyPostSource(type, name) {
	if (name == 'subsidiary') {
		if (nlapiGetFieldValue('subsidiary') == paramUkSubs) {
			nlapiSetFieldValue('currency', paramUkCurr);
		} else if (nlapiGetFieldValue('subsidiary') == paramUsaSubs) {
			nlapiSetFieldValue('currency', paramUsaCurr);
		} else if (nlapiGetFieldValue('subsidiary') == paramSgSubs) {
			nlapiSetFieldValue('currency', paramSgCurr);
		} else if (nlapiGetFieldValue('subsidiary') == paramUaeSubs) {
			nlapiSetFieldValue('currency', paramUaeCurr);
		}
	}
	
}