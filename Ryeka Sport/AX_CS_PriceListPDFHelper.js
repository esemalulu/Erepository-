/**
 * Field Changed provides client side automation for PDF Generator UI Suitelet
 * @param type
 * @param name
 * @param linenum
 */

function slPdfFieldChanged(type, name, linenum) {
	
	//class drop down is changed, set the text value on custpage_classtext field
	if (name == 'custpage_class') {
		
		//Replace out " : " and " " with Underscore
		var textValue = nlapiGetFieldText('custpage_class');
		var displayValue = textValue;
		if (textValue) {
			
			//Lowest Hierarch value
			var arClassHierarchy = textValue.split(' : '); 
			//Lowest hierarch value is the Last array element after splitting using ' : ' character
			displayValue = arClassHierarchy[arClassHierarchy.length-1];
			
			textValue = strGlobalReplace(textValue, ' : ', '_');
			textValue = strGlobalReplace(textValue, ' ','_');
			 
		}
		nlapiSetFieldValue('custpage_classtextdisplay', displayValue,true, true);
		nlapiSetFieldValue('custpage_classtext', textValue, true, true);
	}
}


/**
 * Email Function 
 */
function generateEmail() {
	//check to make sure all fields are filled in
	//alert(nlapiGetFieldValues('custpage_contacts'));
	
	if (!nlapiGetFieldValues('custpage_contacts') || (nlapiGetFieldValues('custpage_contacts') && nlapiGetFieldValues('custpage_contacts').length < 1)) {
		alert('Please choose one or more contacts to send this price list to');
		return false;
	}
	
	if (!nlapiGetFieldValue('custpage_emailsubject')) {
		alert('Please provide subject for email');
		return false;
	}
	
	if (!nlapiGetFieldValue('custpage_comments')) {
		alert('Please provide email message');
		return false;
	}
	
	//Make sure atleast 1 and MAX of 3 PDF is selected
	var fileCount = nlapiGetLineItemCount('custpage_pdffiles');
	var fileSelCount = 0;
	for (var f=1; f <= fileCount; f++) {
		if (nlapiGetLineItemValue('custpage_pdffiles','fsl_sendfile',f)=='T') {
			fileSelCount++;
		}
	}
	
	if (fileSelCount == 0 || fileSelCount > 3) {
		alert('Please select atleast 1 file to send but NO MORE than 3');
		return false;
	}
	
	//Set Class as something
	nlapiSetFieldValue('custpage_class','3',true,true);
	
	//Set send email to T
	//nlapiSetFieldValue('custpage_sendemailflag', 'T',true,true);
	
	if (NS.form.isInited() && NS.form.isValid()) { 
		NLDoMainFormButtonAction('submitter',false);
	}
}