function beforeSubmit(type)
{
var record = nlapiGetNewRecord();

var ls = record.getFieldValue('leadsource');
var lsO = record.getFieldValue('custentityr7leadsourceoriginal');

if ( ls !='' && (lsO=='' || lsO==null)){

	var leadSrc = record.getFieldValue('leadsource');
	if(leadSrc){record.setFieldValue('custentityr7leadsourceoriginal',leadSrc);}

	var d = new Date();
	var date = 	(d.getMonth() + 1)+"/"+d.getDate()+"/"+d.getFullYear();   
	var leadSrcD = record.getFieldValue('datecreated');
	if(leadSrc){record.setFieldValue('custentityr7leadsourceoriginaldate',date);}
	
	record.setFieldValue('comments', 'If does execute.');
	
	/*
	leadsource
	custentityr7leadsourceoriginaldate
	custentityr7leadsourceoriginal
	datecreated
	*/

}	
}