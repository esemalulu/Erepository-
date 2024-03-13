/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       03 Dec 2012     mburstein
 * 1.01       05 Feb 2014     mburstein			Added + sign for phone if AM is location not US
 */
function getSignature(sendEmailFrom){
	var fromRec = nlapiLoadRecord('employee',sendEmailFrom);
	var sigFirst = escapeHtmlEntities(fromRec.getFieldValue('firstname'));
	var sigLast = escapeHtmlEntities(fromRec.getFieldValue('lastname'));
	var sigEmail = fromRec.getFieldValue('email');
	var sigPhone = escapeHtmlEntities(fromRec.getFieldValue('phone'));
	// If phone is empty grab mobile
	if (sigPhone == null || sigPhone == ''){
		sigPhone = escapeHtmlEntities(fromRec.getFieldValue('mobilephone'));
	}
	var sigTitle = escapeHtmlEntities(fromRec.getFieldValue('title'));
	
	// Added + sign for phone if AM is location not US
	var location = fromRec.getFieldValue('location');
	var country = nlapiLookupField('location',location,'country');
	if (country != 'US') {
		sigPhone = '&#43;' + sigPhone;
	}

	
	
	var signatureHTML = '';
	signatureHTML +='<p>Best regards,<br /></p>';
	signatureHTML +='<div style="padding: 0px; margin:0px; class="signature" style="width: 60%;">';
	signatureHTML +=	'<p style="padding: 0px; margin:0px; font-family:trebuchet ms; font-size: 14px; color: rgb(86,85,85);">';
	signatureHTML +=	'<span style="color: black; font-family: trebuchet ms; font-size: 16px;">'+sigFirst+' '+sigLast+'</span><br />';
	//signatureHTML +=	'<span style="font-style: italic; font-family: trebuchet ms;">'+sigTitle+'</span>';
	signatureHTML +=	'</p><hr>';
	signatureHTML +=	'<p style="padding: 0px; margin:0px; font-family:arial; font-size: 12px; color: rgb(76,76,76);">';
	signatureHTML +=	'<span style="font-weight: bold;">Direct&#58;</span> '+sigPhone+'<br />';
	signatureHTML +=	'<span style="font-weight: bold;">Email&#58; </span><a href="mailto:'+sigEmail+'">'+sigEmail+'</a><br />';
	signatureHTML +=	'</p>';
	signatureHTML +='</div>';
	return signatureHTML;
}

function findSigMatches(htmlContent){

	//<!--{NLCUSEATSIG1}-->
	var regex = /\<\!\-\-\{NLCUSEATSIG\d+\}\-\-\>/g;
	var matches = [];
	var match;
	
	while (match = regex.exec(htmlContent)) {
		matches.push(match[0]);
	}
	
	matches = unique(matches);
	
	return matches;
}

function replaceSigTagsWithContent(matches, htmlContent, signature){

	for (var i = 0; matches != null && i < matches.length; i++) {
		var match = matches[i];
		var replaceRegex = new RegExp(match, 'g');
		
		htmlContent = htmlContent.replace(replaceRegex, signature);
	}
	return htmlContent;
}

function unique(a){
	a.sort();
	for (var i = 1; i < a.length;) {
		if (a[i - 1] == a[i]) {
			a.splice(i, 1);
		}
		else {
			i++;
		}
	}
	return a;
}

function escapeHtmlEntities(string) {
	if (string != null && string != '') {
		string = string.replace(/\(/g, "&#40;");
		string = string.replace(/\)/g, "&#41;");
		string = string.replace(/\+/g, "&#43;");
		string = string.replace(/\-/g, "&#45;");
		return string;
	}
}
