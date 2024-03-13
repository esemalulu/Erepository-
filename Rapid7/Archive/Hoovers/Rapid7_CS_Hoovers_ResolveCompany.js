//Soap Requests from inside SuiteScript??
//https://usergroup.netsuite.com/users/showthread.php?t=3561&highlight=soap+request+suitescript

function pageInit(type){
	window.onbeforeunload = function() {};
	nlapiDisableLineItemField('custpage_sublistmult', 'custpage_sublist_check', false);
	/*
	var count = nlapiGetLineItemCount('custpage_sublistmult');
	if(count==1){
		nlapiSetLineItemValue('custpage_sublistmult','custpage_sublist_check',1,'T');
	}
	*/
}

function buttonClicked(){

	var count = nlapiGetLineItemCount('custpage_sublistmult');
	var recordArray = new Array();
	if(count==1){
		dunsNo = nlapiGetLineItemValue('custpage_sublistmult','custpage_sublist_dunsno',1);
		recordArray[0]=dunsNo;
	}
	else{
		for(var i=1; i <= count; i++){
			value=nlapiGetLineItemValue('custpage_sublistmult','custpage_sublist_check',i);
			var name ='';var dunsNo='';var status=''; var internalId='';
			if(value=='T'){
				dunsNo = nlapiGetLineItemValue('custpage_sublistmult','custpage_sublist_dunsno',i);
				recordArray[0]=dunsNo;
				break;
			}
		}
	}

if(recordArray!=null){
	updateCustomerRecord(recordArray[0]);
	var recordTypeField = nlapiGetFieldValue('custpage_recordtype');
	var recordIdField = nlapiGetFieldValue('custpage_internalid');
	var url = nlapiResolveURL('RECORD', recordTypeField, recordIdField, 'VIEW');
	window.opener.location.href = url;
	window.close();
	}
}


function updateCustomerRecord(cRecord){
	//alert("here");
	//alert(window.opener.location);	
	var recordTypeField = nlapiGetFieldValue('custpage_recordtype');
	var recordIdField = nlapiGetFieldValue('custpage_internalid');
	var url = nlapiResolveURL('RECORD', recordTypeField, recordIdField, 'VIEW');
	//window.opener.location.href = url;	
	var record = nlapiLoadRecord(recordTypeField, recordIdField);
	//alert("here" + recordTypeField + recordIdField + cRecord);
	record.setFieldValue('custentityr7hooversdatelastupdateattempt', '');
	record.setFieldValue('custentityr7dunsnumber', cRecord);
	record.setFieldValue('custentityr7hooversupdateflag', 'T');
	nlapiSubmitRecord(record);
	//alert("Successfully submitted record");
	//url = "https://system.netsuite.com" + url

}

function previousResultPage(){
	var coNameField = nlapiGetFieldValue('custpage_coname');	
	var hitOffsetField = nlapiGetFieldValue('custpage_hitoffset');
	var resultsPerPageField = nlapiGetFieldValue('custpage_resultsperpage');
	
	hitOffsetField -= parseInt(resultsPerPageField);
	
	var baseUrl = nlapiResolveURL('SUITELET', 'customscriptr7hooverscompanyresolve','customdeployhooverscompanyresolve', null);	
	var url3 = baseUrl +
	'&custparamcustomername=' + coNameField +
	'&custparamhitoffset=' + hitOffsetField + 
	'&custparamresultsperpage=' + resultsPerPageField;
	
	window.location = url3;
}

function searchAgain(){
	//nlapiGetField Value parameters from the page, and nlapiRequestUrl the bitch.
	
	var name = escape(nlapiGetFieldValue('custpage_coname'));	
	var recordType = nlapiGetFieldValue('custpage_recordtype'); 
    var id = nlapiGetFieldValue('custpage_internalid');
	
	var url = nlapiResolveURL('SUITELET', 'customscriptr7hooverscompanyresolve', 'customdeployhooverscompanyresolve', null) +
	'&custparaminternalid=' +
	id +
	'&custparamcustomername=' +
	name +
	'&custparamresultsperpage=50' +
	'&custparamhitoffset=0' +
	'&custparamrecordtype=' +
	recordType;

	//alert(url3);
	window.location = url;
	
}

function nextResultPage(){
	var coNameField = nlapiGetFieldValue('custpage_coname');	
	var hitOffsetField = nlapiGetFieldValue('custpage_hitoffset');
	var resultsPerPageField = nlapiGetFieldValue('custpage_resultsperpage');
	
	hitOffsetField = parseInt(hitOffsetField) + parseInt(resultsPerPageField);
	
	var baseUrl = nlapiResolveURL('SUITELET', 'customscriptr7hooverscompanyresolve','customdeployhooverscompanyresolve', null);
	var url3 = baseUrl +
	'&custparamcustomername=' + coNameField +
	'&custparamhitoffset=' + hitOffsetField + 
	'&custparamresultsperpage=' + resultsPerPageField;
	
	window.location = url3;
}

