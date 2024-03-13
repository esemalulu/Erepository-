/*
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       12 Sep 2012     mburstein
 *
 */

/*
 * @author mburstein
 */

// Set SID for Twilio Database Record or Event Attendee

function beforeSubmit(type){
	
	// Get Record Type
	//var recType = nlapiGetRecordType();
	//nlapiLogExecution('DEBUG'," Rec Type: "+recType);
	
	// Set SID
	setSID();
}

function afterSubmit(type){

}

function setSID(){
	var fldSID = 'custrecordr7twiliodbsid';
	
	var currentSID = nlapiGetFieldValue(fldSID);
	if (currentSID == null || currentSID == '') {
		// Create SID on before record submit
		if (type == 'create' || type =='copy') {
			var sId = getRandomString(10);
			nlapiSetFieldValue(fldSID, sId);
		}
	}
}

function getRandomString(string_length){
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXTZ';
    var randomstring = '';
    for (var i = 0; i < string_length; i++) {
        var rnum = Math.floor(Math.random() * chars.length);
        randomstring += chars.substring(rnum, rnum + 1);
    }
    return randomstring;
}