function RejectAction()
{
	var url = nlapiResolveURL('SUITELET','customscript_set_reject_reason','customdeploy_set_reject_reason');
		
		//alert('Record ID: '+nlapiGetRecordId());
		url+='&record_id='+nlapiGetRecordId()+'&record_type='+nlapiGetRecordType();
       // alert('URL: '+url);
	var win = window.open(url, 'Enter Reason For Rejection','scrollbars=yes,menubar=no,width=500,height=300,toolbar=no');
}

function clientSaveRecord()
{
	//alert('Client Triggered');
	var rejectReason = nlapiGetFieldValue('custpage_reject_comments');
	var strRejectReason = trim(rejectReason);

	if(strRejectReason == '' || strRejectReason == null)
	{
		alert('Please Enter Reason for Rejection');
		return false;
	}
	else
	{
		//alert('Comments Entered!');
		return true;
	}
}

function trim(rejectReason){
    var str = new String(rejectReason);
    return str.replace(/(^\s*)|(\s*$)/g,"");
}