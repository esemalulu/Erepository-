function AfterSubmit() 
{
	var rec = nlapiLoadRecord(nlapiGetRecordType(), nlapiGetRecordId());
    var wharehouse = rec.getFieldValue('location')
    var name = rec.getFieldValue('entity')

    rec.setFieldText('subsidiary', '3');
    rec.setFieldValue('custbody_so_rejereas', 'NO REASON');
    //rec.setFieldValue('entity', 'name');
    //rec.setFieldValue('location', 'wharehouse'); 
  
  	nlapiSubmitRecord(rec);	
  	
	
}

   