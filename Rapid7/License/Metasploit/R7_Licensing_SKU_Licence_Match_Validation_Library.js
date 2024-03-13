function isCompatibleSKULicenseMetasploit(itemId,msLicenseRecord){
	var msCompatibilityArray = ["custrecordr7msordertype","custrecordr7msprousercount"];
	
	var msTemplateLicense = nlapiLookupField('item',itemId,'custitemr7itemmslicensetype1');
	
	if (msTemplateLicense != null && msTemplateLicense != '') {
		var msTemplateRecord = nlapiLoadRecord('customrecordr7metasploitlicensing', msTemplateLicense);
		
		for (var i = 0; i < msCompatibilityArray.length; i++) {
			var field = msCompatibilityArray[i];
			nlapiLogExecution('DEBUG','Checking field '+field+ ' '+msTemplateRecord.getFieldValue(field)+ ' '+
			msLicenseRecord.getFieldValue(field),'yup');
			if (msTemplateRecord.getFieldValue(field) != msLicenseRecord.getFieldValue(field)) {
				//If a field value doesn't match return false
				return false;
			}
		}
		return true;
	}
	return true;
}

function isCompatibleSKULicenseNexpose(itemId,nxLicenseRecord){
	var nxCompatibilityArray = ["custrecordr7nxlicensenumberips",
	"custrecordr7nxlicensenumberhostedips",
	"custrecordr7nxnumberengines",
	"custrecordr7nxlicensediscoverylicense",
	"custrecordr7nxlicensepcitemplate",
	"custrecordr7nxscada",
	"custrecordr7nxwebscan",
	"custrecordr7nxpolicy",
	"custrecordr7nxcloud",
	"custrecordr7nxmetasploit"];
	
	var nxTemplateLicense = nlapiLookupField('item',itemId,'custitemr7itemnxlicensetype');
	if (nxTemplateLicense != null && nxTemplateLicense != '') {
		var nxTemplateRecord = nlapiLoadRecord('customrecordr7nexposelicensing', nxTemplateLicense);
		for (var i = 0; i < nxCompatibilityArray.length; i++) {
			var field = nxCompatibilityArray[i];
			if (nxTemplateRecord.getFieldValue(field) != nxLicenseRecord.getFieldValue(field)) {
				//If a field value doesn't match return false
				return false;
			}
		}
		return true;
	}
	return true;
}

function skuLicenseIsIncompatibleProcessing(itemId,licenseId,salesOrderId,recordType){
	
	nlapiLogExecution('DEBUG','SKU License is Incompatible Processing','word');
	
	nlapiLogExecution('DEBUG','Details', 'Item Id:'+itemId + " LicenseId: "+ licenseId+" SalesOrder Id:"+ salesOrderId+ " RecordType:"+recordType);
	
    var licenseURL ='https://663271.app.netsuite.com/app/common/custom/custrecordentry.nl?rectype='+recordType+'&id='+licenseId;
    var skuURL = 'https://663271.app.netsuite.com/app/common/item/item.nl?id='+ itemId;
	var salesOrderURL = 'https://663271.app.netsuite.com/app/accounting/transactions/salesord.nl?id='+salesOrderId+'&e=T';
	
	var txt = 
	"\nThe sku " + skuURL + " is not compatible with license " + licenseURL  +
	"\nThe processing of this  sales order " + salesOrderURL + " has been suspended."+
	"\n"+
	"\nPlease check details. To override check off box custbodyr7transactionignorepkvalid."+
	"\nThank you";
	var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
	nlapiSendEmail(adminUser,adminUser,'Suspended SalesOrder: SKU/License Incompatible',
	txt);
	
}


