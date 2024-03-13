//https://forms.netsuite.com/app/site/hosting/scriptlet.nl?script=169&deploy=1&compid=663271&h=8854f68829ed30a965fb&it=EXPRESS&pk=GX1V-64ZD-1BBV-DQNG&q=1

function handleRequest(request, response){
	//Needs parameters &it=EXPRESS
	//pk=
	//
	
	nlapiLogExecution('DEBUG', 'Get Method', request.getMethod());
	
	if (request.getMethod() == 'GET' || request.getMethod() == 'POST') {
	
		//customrecordr7
		var count = nlapiLookupField('customrecordr7suiteletpkquerylog',1,'custrecordr7mspkeyquerylogcount');
		nlapiSubmitField('customrecordr7suiteletpkquerylog',1,'custrecordr7mspkeyquerylogcount',count+1);
		
		nlapiLogExecution('DEBUG','Present Count',count+1);
		
		
		var productKey = '';
		var itemId = '';
		productKey = request.getParameter('pk');
		itemId = request.getParameter('it');
		if (productKey == null) 
			productKey = '';
		if (itemId == null) 
			itemId = '';
		nlapiLogExecution('DEBUG', 'Product Key', productKey);
		nlapiLogExecution('DEBUG', 'ItemId', itemId);
		var result = false;
		if (itemId == 'EXPRESS') {
			itemId = 210;
		}
		else {
			itemId = '';
		}
		
		if (productKey != null && productKey != '' && itemId != null && itemId != '') {
		
			var LicenseType = lookupLicenseTypeForItem(itemId);
			
			if (LicenseType[1] == 'nexpose') {
				var result = validateNexposePKey(productKey, itemId, licenseType[0]);
			}
			else if (LicenseType[1] == 'metasploit') {
				var result = validateMetasploitPKey(productKey, itemId, licenseType[0]);
			}
			
			var text = "validate_pkey(" + result + ");";
			nlapiLogExecution('DEBUG', 'Response', text);
			//response.setContentType('PLAINTEXT');	
			response.write(text);
		}
	}
}

//Trying to lookup if the product type is NeXpose or Metaploit based on 
//Licence Type field in the item record
function lookupProductTypeForItem(itemId){
	if(itemId==null || itemId =='') return '';
	var productLine = nlapiLookupField('item',itemId,new Array('custitemr7itemnxlicensetype','custitemr7itemmslicensetype'));
	if(productLine['custitemr7itemnxlicensetype']!=null && productLine['custitemr7itemnxlicensetype']!=''){
		if(productLine['custitemr7itemmslicensetype']==null || productLine['custitemr7itemmslicensetype']==''){
			return new Array(productLine['custitemr7itemnxlicensetype'],"nexpose");
		}
	}else if(productLine['custitemr7itemmslicensetype']!=null && productLine['custitemr7itemmslicensetype']!=''){
		if(productLine['custitemr7itemnxlicensetype']==null || productLine['custitemr7itemnxlicensetype']==''){
			return new Array(productLine['custitemr7itemmslicensetype'],"metasploit");
		}
	}
	return "";
}


function validateMetasploitPKey(productKey, itemId, licenseType){
	try{
		//Finding the metasploit license which has the specified product Key
		var result = 'false';
		var searchFilter = new Array(
		new nlobjSearchFilter('custrecordr7msproductkey', null, 'is', productKey),
		new nlobjSearchFilter('custrecordr7msordertype', null, 'is', licenseType)
		);
		var results = nlapiSearchRecord('customrecordr7metasploitlicensing', null, searchFilter);
		if (results != null) {
				result = 'true';	
		}
		else{	
				result = 'false';
		}	
	}catch(err){
				nlapiLogExecution("ERROR",err.name,err.message);
	}
	return result;		
}

function validateNexposePKey(productKey, itemId, licenseType){
	try{
		//Finding the nexpose license which has the specified product Key
		var result = 'false';
		var searchFilter = new Array(
		new nlobjSearchFilter('custrecordr7nxproductkey', null, 'is', productKey)
		);
		var results = nlapiSearchRecord('customrecordr7nexposelicensing', null, searchFilter);
		if (results != null) {
				result = 'true';	
		}
		else{	
				result = 'false';
		}	
	}catch(err){
				nlapiLogExecution("ERROR",err.name,err.message);
	}
	return result;		
}




