function handleRequest(request, response){
	//Needs parameters &it=EXPRESS
	//pk=
	//
	
	nlapiLogExecution('DEBUG', 'Get Method', request.getMethod());
	
	if (request.getMethod() == 'GET' || request.getMethod() == 'POST') {
	
		//customrecordr7
		var count = nlapiLookupField(
		'customrecordr7suiteletpkquerylog',1,'custrecordr7mspkeyquerylogcount');
		count = parseInt(count)+1;
		nlapiSubmitField('customrecordr7suiteletpkquerylog',1,'custrecordr7mspkeyquerylogcount',count);
		
		nlapiLogExecution('DEBUG','Present Count',count);
		
		var productKey = '';
		var itemId = '';
		productKey = request.getParameter('pk');
		itemId = request.getParameter('it');
		if (productKey == null || productKey.length!=19) 
			productKey = '';
		if (itemId == null) 
			itemId = '';
		nlapiLogExecution('DEBUG', 'Product Key', productKey);
		nlapiLogExecution('DEBUG', 'ItemId', itemId);
		nlapiLogExecution('DEBUG','Product Key length',productKey.length);
		
		var result = false;
		if (itemId == 'EXPRESS') {
			itemId = 210;
		}
		
		
		var result = "false";
		if (productKey != null && productKey != '' && itemId != null && itemId != '') {
		
			var LicenseType = lookupProductTypeForItem(itemId);
			nlapiLogExecution('DEBUG','LicenseType',LicenseType);
			if (LicenseType[1] == 'nexpose') {
				result = validateNexposePKey(productKey, itemId, LicenseType[0]);
			}
			else if (LicenseType[1] == 'metasploit') {
				result = validateMetasploitPKey(productKey, itemId, LicenseType[0]);
			}
			nlapiLogExecution('DEBUG', 'Response', text);
			//response.setContentType('PLAINTEXT');
		}
		var text = "validate_pkey(" + result + ");";
		response.write(text);
	}
}

//Trying to lookup if the product type is NeXpose or Metaploit based on 
//Licence Type field in the item record
function lookupProductTypeForItem(itemId){
	if(itemId==null || itemId =='') return '';
	try {
		var productLine = nlapiLookupField('item', itemId, new Array('custitemr7itemnxlicensetype', 'custitemr7itemmslicensetype'));
		if (productLine['custitemr7itemnxlicensetype'] != null && productLine['custitemr7itemnxlicensetype'] != '') {
			if (productLine['custitemr7itemmslicensetype'] == null || productLine['custitemr7itemmslicensetype'] == '') {
				return new Array(productLine['custitemr7itemnxlicensetype'], "nexpose");
			}
		}
		else 
			if (productLine['custitemr7itemmslicensetype'] != null && productLine['custitemr7itemmslicensetype'] != '') {
				if (productLine['custitemr7itemnxlicensetype'] == null || productLine['custitemr7itemnxlicensetype'] == '') {
					return new Array(productLine['custitemr7itemmslicensetype'], "metasploit");
				}
			}
		return "";
	}catch(err){
		return "";
	}
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
			nlapiLogExecution('DEBUG','Nexpose results found',results.length);
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




