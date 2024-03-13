function pageInit(type, fld)
{
if ( type == 'create' ) 
{
	try{
	nlapiSetFieldValue('title', 'Complete Lead Profile (10 Days)');
	nlapiSetFieldValue('sendemail','T');
	var due = nlapiAddDays(new Date(),12);
	var dueString = nlapiDateToString(due);
	nlapiSetFieldValue('duedate', dueString);
	
	var company = nlapiGetFieldValue('company');
	
	if(company!=null && company.length>=1){
		var salesRep = nlapiLookupField('customer',company,'salesrep');
		nlapiSetFieldValue('assigned',salesRep);
	}
	}catch(err){
		nlapiSendEmail(2,2,'Some Error on New Task Form','Some Error');
	}
}
}

function postSourcing(type, name){
	try{
	if(name=='company'){
		var company = nlapiGetFieldValue('company');
		if(company!=null && company.length>=1){
			var salesRep = nlapiLookupField('customer',company,'salesrep');
			nlapiSetFieldValue('assigned',salesRep);
		}
	}
	}catch(err){
		nlapiSendEmail(2,2,'Some Error on New Task Form','Some Error');
	}
}