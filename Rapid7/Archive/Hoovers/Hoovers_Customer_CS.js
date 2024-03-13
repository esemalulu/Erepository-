/**
 * @author suvarshi
 */

function findCompetitors(dunsNo){

	if (dunsNo != null && dunsNo.length > 2) {
		var url = nlapiResolveURL('SUITELET', 'customscriptr7hooverspopup', 'customdeployr7hooverspopup', null) + '&custparamcompetitorsearch=true2' + '&custparamdunsno=' + dunsNo;
		window.open(url, "Rapid7HooversPopup");
	}
	else {
		alert("Duns# field is empty.");
	}
}

function updateData(){
	
	document.getElementById('custpage_updatehoovers').value = 'Updating Hoovers...';
	
	var id = nlapiGetRecordId();
	var recordType = nlapiGetRecordType();
	
	var fields = new Array();
	fields[0] = 'custentityr7hooversdatelastupdateattempt'
	fields[1] = 'custentityr7hooversupdateflag'
	
	var values = new Array();
	values[0] = '';
	values[1] = 'T';
	
	alert("Updating Hoovers Data");
	nlapiSubmitField(recordType, id, fields, values);
	document.location.reload();
	
}

function matchHoovers(name){

	var id = nlapiGetRecordId();
	var recordType = nlapiGetRecordType();
	
	var url = nlapiResolveURL('SUITELET', 'customscriptr7hooverscompanyresolve', 'customdeployhooverscompanyresolve', null) +
	'&custparaminternalid=' +
	id +
	'&custparamcustomername=' +
	name +
	'&custparamresultsperpage=50' +
	'&custparamhitoffset=0' +
	'&custparamrecordtype=' +
	recordType;
	window.open(url);
	
}
