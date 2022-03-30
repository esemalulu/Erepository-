function updatecustomdatedue(rec_type, rec_id) 
{
		var rec = nlapiLoadRecord(rec_type, rec_id);  //10 units
		var trandate =  rec.getFieldValue('trandate') ;
		var duedate =  rec.getFieldValue('duedate')
		if (!duedate)
		{
		    rec.setFieldValue('custbody_liv_date_due', trandate);
		}
		else
		{
            rec.setFieldValue('custbody_liv_date_due', duedate);
        }
            var id = nlapiSubmitRecord(rec); //20 units
}