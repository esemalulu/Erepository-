function save(type){

	if (nlapiGetFieldValue('custrecordr7nxcommunitylicense') == 'T') {
		nlapiSetFieldValue('custrecordr7nxlicensenumberips', 32, false);
	}
	if (nlapiGetFieldValue('custrecordr7nxexpress') == 'T') {
		nlapiSetFieldValue('custrecordr7nxmetasploit', 'F', false);
	}

	return confirm("Are you sure you want to save this record?");
	
}

function pageInit(type){
	
	if (type == 'create') {
		nlapiSetFieldValue('custrecordr7nxlicensemodel', 1, false);
	}
	
	//checks to see if discovery is false, if it is, then it disables/enables the dip field
	if (nlapiGetFieldValue('custrecordr7nxlicensediscoverylicense') == 'F') {
		nlapiDisableField('custrecordr7nxlicensenumberdiscoveryips', true);
	}
	else {
		nlapiDisableField('custrecordr7nxlicensenumberdiscoveryips', false);
	}
	
}

function fieldChanged(type, name){

	if (name == 'custrecordr7nxlicensediscoverylicense') {
	
		if (nlapiGetFieldValue('custrecordr7nxlicensediscoverylicense') == 'T') {
			nlapiDisableField('custrecordr7nxlicensenumberdiscoveryips', false);
		}
		else {
			nlapiDisableField('custrecordr7nxlicensenumberdiscoveryips', true);
			nlapiSetFieldValue('custrecordr7nxlicensenumberdiscoveryips', '', false);
		}
	}
	
}