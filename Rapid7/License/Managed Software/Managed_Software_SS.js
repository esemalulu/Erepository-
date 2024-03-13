/*
 * @author mburstein
 */

function afterSubmit(type){
	
	/*if (type == 'create' || type == 'edit') {
		var recId = nlapiGetRecordId();
		var sId = Math.floor(Math.random() * 9999999) + '' + recId;
		var mngServiceId = 'M'+Math.floor(Math.random() * 9999) + '' + recId;
		
		// Get current ID values
		var sIdVal = nlapiGetFieldValue('custrecordr7managedservicesid');
		var mngServiceIdVal = nlapiGetFieldValue('custrecordr7managedserviceid');
		
		if(sIdVal == null || sIdVal == ''){
			// Set SID if empty
			nlapiSubmitField('customrecordr7managedservices', recId, 'custrecordr7managedservicesid', sId);
		}
		if(mngServiceIdVal == null || mngServiceIdVal == ''){
			// Set Managed Service ID if empty
			nlapiSubmitField('customrecordr7managedservices', recId, 'custrecordr7managedserviceid', mngServiceId);
		}
	}*/
}

function beforeLoad(type){
	
	/*if (type == 'create' || type =='copy') {
		var sId = getRandomString(10); // + '' + recId;
		var mngServiceId = 'M'+getRandomString(10); // + '' + recId;
		
		nlapiSetFieldValue('custrecordr7managedservicesid',sId);

		nlapiSetFieldValue('custrecordr7managedserviceid',mngServiceId);
	}*/
}

function beforeSubmit(type){
	
	if (type == 'create' || type =='copy') {
		//var sId = getRandomString(10); // + '' + recId;
		var mngServiceId = 'M'+getRandomString(10); // + '' + recId;
		
		//nlapiSetFieldValue('custrecordr7managedservicesid',sId);

		nlapiSetFieldValue('custrecordr7managedsoftwareid',mngServiceId);
	}
}

function getRandomString(string_length){
    var chars = '123456789';
    var randomstring = '';
    for (var i = 0; i < string_length; i++) {
        var rnum = Math.floor(Math.random() * chars.length);
        randomstring += chars.substring(rnum, rnum + 1);
    }
    return randomstring;
}