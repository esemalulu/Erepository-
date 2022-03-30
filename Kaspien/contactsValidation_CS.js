function saveRecord() {
	var phone = nlapiGetFieldValue('phone');
	var mobilephone = nlapiGetFieldValue('mobilephone');
	if(isNaN(nlapiGetFieldValue('phone'))) {
		nlapiSetFieldValue('phone', phone, false);
		alert('MAIN PHONE accepts only NUMERIC characters.');
		return false;
	}
	if(isNaN(nlapiGetFieldValue('mobilephone'))) {
		nlapiSetFieldValue('mobilephone', mobilephone, false);
		alert('MOBILE PHONE accepts only NUMERIC characters.');
		return false;
	}
	return true;
}