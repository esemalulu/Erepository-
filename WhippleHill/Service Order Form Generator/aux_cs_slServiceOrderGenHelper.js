var sofGeneratorUrl = nlapiResolveURL('SUITELET','customscript_aux_sl_serviceorder_gen','customdeploy_aux_sl_serviceorder_gen');

function slPageInit(type) {
	setLayoutOptionHelp();
}

function slSaveRecord(){

	if (nlapiGetFieldValue('custparam_action')=='gen') {
		if (nlapiGetFieldValue('custpage_createnew')=='F' && !nlapiGetFieldValue('custpage_replacefile')) {
			alert('Please check new PDF or select file to Replace');
			return false;
		}
		
		
		if (nlapiGetFieldValue('custpage_createnew')=='T' && nlapiGetFieldValue('custpage_replacefile')) {
			alert('You can not create new file and replace at the same time. Please select one or the other');
			return false;
		}
		
		//check to make sure character size on custom tac is not over 24000 characters
		if (nlapiGetFieldValue('custpage_tacedit')) {
			var customTac = nlapiGetFieldValue('custpage_tacedit');
			if (customTac.length > 24000) {
				alert('Custom Terms and Conditions text (Including HTML Tags) exceeds 24000 characters. Please reduce text');
				return false;
			}
			
			//when its within the limit, get 4000 characters from tacedit and add it to
			var maxNeeded = (Math.ceil(customTac.length/4000)).toFixed();
			var nextMax = 3900;
			var nextMin = 0;
			for (var t=1; t<=maxNeeded; t++) {
				var text = customTac.substring(nextMin, nextMax);
				nlapiSetFieldValue('custpage_tacedit'+t, text);
				//alert(nlapiGetFieldValue('custpage_tacedit'+t, text));
				//increment by 3900
				nextMax += 3900;
				nextMin += 3900;
			}
			
			//return false;
		}
		
	} else {
		//assume it's email
		var ccstr = nlapiGetFieldValue('custpage_sendcc');
		if (ccstr) {
			//break up the email string and make sure all email addresses are valid
			var arcc = ccstr.split(',');
			//incase they separated with space after comma, build string
			var newarstr = '';
			var hasError = false;
			var errStr = '';
			for (var e=0; e < arcc.length; e++) {
				var emailStr = strTrim(arcc[e]);
				if (!validateEmail(emailStr)) {
					errStr += emailStr+',';
					
					if (!hasError) {
						hasError = true;
					}
				}
				newarstr += emailStr+',';
			}
			
			newarstr = newarstr.substring(0, (newarstr.length - 1));
			errStr = errStr.substring(0, (errStr.length - 1));
			
			nlapiSetFieldValue('custpage_sendcc', newarstr);
			
			if (hasError) {
				alert('Following emails are not a valid email address: '+errStr);
				return false;
			}
		}
	}
	
    return true;
}

function slFieldChanged(type, name, linenum){

	if (nlapiGetFieldValue('custparam_action')=='gen') {
		
		if (name == 'custpage_tacselectoption') {
			nlapiSetFieldValue('custpage_templatename',nlapiGetFieldText(name));
			nlapiSetFieldValue('custpage_layoutoption', nlapiGetFieldValue(name));
			//custpage_tacedit
			if (nlapiGetFieldValue(name)=='-1') {
				nlapiSetFieldValue('custpage_tacedit', nlapiGetFieldValue('custpage_tacdefault'));
				
			} else if (nlapiGetFieldValue(name)=='-2') {
				nlapiSetFieldValue('custpage_tacedit', nlapiGetFieldValue('custpage_tacquote'));
			} else if (nlapiGetFieldText(name).indexOf('Template #1') > 0) {
				nlapiSetFieldValue('custpage_tacedit', nlapiGetFieldValue('custpage_tac1'));
			} else if (nlapiGetFieldText(name).indexOf('Template #2') > 0) {
				nlapiSetFieldValue('custpage_tacedit', nlapiGetFieldValue('custpage_tac2'));
			}else if (nlapiGetFieldText(name).indexOf('Template #3') > 0) {
				nlapiSetFieldValue('custpage_tacedit', nlapiGetFieldValue('custpage_tac3'));
			}else if (nlapiGetFieldText(name).indexOf('Template #4') > 0) {
				nlapiSetFieldValue('custpage_tacedit', nlapiGetFieldValue('custpage_tac4'));
			}			
		}
		
		//show user what will happen for different layout types
		if (name == 'custpage_layoutoption') {
			setLayoutOptionHelp();
		}
		
		if (name == 'custpage_createnew') {
			if (nlapiGetFieldValue(name)=='T') {
				nlapiSetFieldValue('custpage_replacefile','');
				nlapiDisableField('custpage_replacefile',true);
			} else {
				nlapiSetFieldValue('custpage_replacefile','');
				nlapiDisableField('custpage_replacefile',false);
			}
		}

		if (name == 'custpage_replacefile') {
			nlapiSetFieldValue('custpage_replacefilename', nlapiGetFieldText('custpage_replacefile'));
			if (nlapiGetFieldValue('custpage_replacefile') && nlapiGetFieldValue('custpage_createnew')=='T') {
				nlapiSetFieldValue('custpage_createnew','F');
			}
		}
	} else {
		//assume it's email
		
	}
	
	
}

function setLayoutOptionHelp() {
	var selection = nlapiGetFieldValue('custpage_layoutoption');
	var selectionText = nlapiGetFieldText('custpage_layoutoption');
	
	if (!selection) {
		 nlapiSetFieldValue('custpage_layoutophelp','');
		 return;
	}
	
	if (selectionText.indexOf('Template #1') > 0 ||selectionText.indexOf('Template #3') > 0 ||
		selection == '1047608' || selection == '1047610') {
		
		nlapiSetFieldValue('custpage_layoutophelp','Subtotal and Tax will NOT BE SHOWN below Item List Table.');
	} else if (selectionText.indexOf('Template #2') > 0 ||selectionText.indexOf('Template #4') > 0 ||
			   selection == '1047609' || selection == '1047611') {
		
		nlapiSetFieldValue('custpage_layoutophelp','Subtotal will be show and GST/HST will be shown in place of Tax below Item List Table.');
	} else if (selectionText.indexOf('Default') > 0 || selection == '-1'){
		//default
		nlapiSetFieldValue('custpage_layoutophelp','Subtotal and Tax will below Item List Table.');
	}
}

function closeWindow() {
	//alert(window.opener.location);
	window.opener.location.reload();
	
	window.close();
}


function loadGenSl() {
	sofGeneratorUrl += '&custparam_quoteid='+nlapiGetFieldValue('custparam_quoteid')+'&custparam_action=gen';
	window.ischanged = false;
	window.location = sofGeneratorUrl;
}

function loadEmailSl() {
	sofGeneratorUrl += '&custparam_quoteid='+nlapiGetFieldValue('custparam_quoteid')+'&custparam_action=email';
	window.ischanged = false;
	window.location = sofGeneratorUrl;
}
