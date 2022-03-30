function validateNumbers() {
	var context = nlapiGetContext();
	var usageRemaining = context.getRemainingUsage();
	var myCSV = '';
	var objSearchResultArray = [];
	var phoneNumber;
	var fixedPhoneNumber='';
	
	objSearchResultArray = getSearchResults();
		
	if (objSearchResultArray !=null && objSearchResultArray.length > 0) { 
		nlapiLogExecution('DEBUG', 'objSearchResultArray', 'objSearchResultArray length = ' + objSearchResultArray.length);
		for (var intSearchIndex = 0; intSearchIndex < objSearchResultArray.length ; intSearchIndex ++) {
		
			usageRemaining = context.getRemainingUsage();
			if (usageRemaining > 150) {
			
				phoneNumber = objSearchResultArray[intSearchIndex].getValue('phone'); 
				recordInternalID = objSearchResultArray[intSearchIndex].getValue('internalid');
				fixedPhoneNumber = getVerifiedNumber(phoneNumber);
				
				if (fixedPhoneNumber == null) {
					fixedPhoneNumber = 'invalidPhoneNumber';
				}
				if (intSearchIndex == 0) {
					myCSV = myCSV + 'InternalID,Phone Number,fixedPhoneNumber\n';
				}
				myCSV = myCSV + recordInternalID + ',' + phoneNumber + ',' + fixedPhoneNumber + '\n';
				//nlapiLogExecution('DEBUG', 'Phone Number Verfication', 'Netsuite Phone (' +  intSearchIndex + ') = ' + phoneNumber + ', Fixed Phone Number = ' + fixedPhoneNumber);
			}
			else {
				nlapiLogExecution('DEBUG', 'Usage Exceeded', 'Script usage limit has been exceeded');
				break;
			}
		}
		var fileID = writeCSVFile(myCSV);
	}
	else {
		nlapiLogExecution('DEBUG', 'Array Check Failed', 'objSearchResultArray is null or objSearchResultArray.length is zero');
	}
}

function getSearchResults() {
	nlapiLogExecution('DEBUG', 'getSearchResults', 'Starting getSearchResults function');	
	var results = [];
	// var savedsearch = nlapiLoadSearch( 'customer','customsearch_verifyphonenumbers');  // select either contact or customer search
	var savedsearch = nlapiLoadSearch( 'contact','customsearch_contactsverifyphonenumbers');  // select either contact or customer search
	var resultset = savedsearch.runSearch();
	var searchid = 0;
	do {
	    var resultslice = resultset.getResults( searchid, searchid+1000 );
	    for (var rs in resultslice) {
	        results.push( resultslice[rs] );
	        searchid++;
	    }
	} while (resultslice.length >= 1000);
	return results;
}

function writeCSVFile(myData) {
	
	// file foler ID = 525328 - Suitescript csv exports
	var folderId = 525328; // Your File Cabinet folder ID here
	var f = nlapiCreateFile('phoneNumberValidation2.csv', 'CSV', myData);
	f.setFolder(folderId);
	var id = nlapiSubmitFile(f);
	nlapiLogExecution('DEBUG', 'Attempting to write CSV', 'CSV file written with ID = ' + id);
	return id;
}
 
function getVerifiedNumber(inputPhoneNumber) {
	// Don't understant yet how to remove the option for 7-digit phone number in the regex so I will test before
	var testLength = inputPhoneNumber;
	testLength = testLength.replace(/\D/gi,'').replace(/^1+/,'').length;
	if (testLength >= 10) {
		lengthOK = true;
	}
	else {
		lengthOK = false;
	}
	inputPhoneNumber = inputPhoneNumber.replace(/^[,\s]+|[,\s]+$/g, '').replace(/,[,\s]*,/g, 'x');
	var regex = /^(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})(?:\s*(?:#|x\.?|ex\s?\.?|ext\s?:?|ext\.?|extension\.?|xt\.?|\.|\s?)\s*(\d+))?$/i; 
	
	var i = 0 ;
	var formattedNumber = '';
	var areaCode; 
	var number1;
	var number2;
	var ext;
	
	if (lengthOK && regex.test(inputPhoneNumber)) {
		var matches = inputPhoneNumber.match(regex);
		for (var match in matches) {
			if (typeof matches[match] === "undefined") {
			  // if undefined type, just skip
			}
			else {
				i+=1;
				switch(i) {
					case 2:
						areaCode = matches[match];
						break;
					case 3:
						number1 = matches[match];
						break;
					case 4:
						number2 = matches[match];
						break;
					case 5:
						ext = matches[match];
						break;
				}
			}
		} 
		if (ext != '0') {
			formattedNumber = areaCode + '.' + number1 + '.' + number2 + ' x' + ext;  // This is the properly formatted number!!!! 
		}
		else {
			formattedNumber = areaCode + '.' + number1 + '.' + number2;
		}
		
		//nlapiLogExecution('DEBUG', 'regEx Test', 'Formatted Number = ' + formattedNumber);
		return formattedNumber;  
	} 
	else {
		//nlapiLogExecution('DEBUG', 'regEx Test', 'Regex test failed for:  ' + inputPhoneNumber);
		return null; 
	}
}