/*
 * @author efagone
 */

function r7_updateDNB_Data(){
	
	alert("Updating D&B Data. The page will refresh when refresh completes.");

	var rec = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
	rec.setFieldValue('custentityr7hooversdatelastupdateattempt', '');
	rec.setFieldValue('custentityr7hooversdateupdated', '');
	rec.setFieldValue('custentityr7hooversupdateflag', 'T');
	nlapiSubmitRecord(rec);
	
	document.location.reload();
	
}
