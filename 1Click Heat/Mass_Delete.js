function Mass_Delete(rec_type,rec_id)
{
	try
	{
		nlapiDeleteRecord(rec_type,rec_id);
	}
	catch(err)
	{
		nlapiLogExecution("error","Rec Type: " + rec_type + "  |  Rec ID: " + rec_id,"Error Msg: " + err.message);
	}
}
