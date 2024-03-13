/*
 * @author efagone
 */

function customSendEmail(fromId, emailTo, subject, body, CC, BCC, ICS){

	var employeeValues = nlapiLookupField('employee', fromId, new Array('firstname', 'lastname', 'email'));
	var fromName = employeeValues['firstname'] + ' ' + employeeValues['lastname'];
	var fromAddress = employeeValues['email'];
	
	//Create Mime Boundry
	var mime_boundary = "_meeting_" + grabTimestamp() + "_";
	
	//Create Email Headers
	var headers = "From: " + fromName + " <" + fromAddress + ">\n";
	headers += "Reply-To: " + fromName + " <" + fromAddress + ">\n";
	headers += "To: " + emailTo + '\n';
	if (CC != null && CC != '') 
		headers += "CC:" + CC + "\n";
	if (BCC != null && BCC != '') 
		headers += "BCC:" + BCC + "\n";
	headers += "Subject: " + subject + '\n';
	headers += "MIME-Version: 1.0\n";
	headers += 'Content-Type: multipart/alternative;boundary="' + mime_boundary + '"\n';
	
	//Create Email Body (HTML)
	var message = "--" + mime_boundary + "\n";
	message += 'Content-Type: text/plain; charset="iso-8859-1"\n';
	message += "Content-Transfer-Encoding:8bit\n\n";
	message += body;
	
	if (ICS != null && ICS != '') {
		message += "\n\n--" + mime_boundary + "\n";
		message += 'Content-Type: text/calendar;method=REQUEST\n';
		message += "Content-Transfer-Encoding:8bit\n\n";
		message += ICS + '\n\n';
		message += "--" + mime_boundary + "--";
	}
	
	
	var mailText = headers + '\n\n' + message;
	
	mailText = Base64.encode(mailText);
	
	var postParams = new Array();
	postParams["message[from]"] = fromAddress;
	postParams["message[to]"] = emailTo;
	postParams["message[mailtext]"] = mailText;
	
	var authHeader = new Array();
	authHeader['Authorization'] = "Basic ZWZhZ29uZTpqRF9XIUFTb19BQjlobkBvQ0dMVmZwQTdTNGFfejNFZ1VfMmtE";
	
	try {
		nlapiRequestURL('https://nsintegration.rapid7.com/emailer', postParams, authHeader);
		return true;
	} 
	catch (e) {
		var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
		nlapiSendEmail(adminUser, adminUser, 'ERROR - mailinfo', 'Error: ' + e + '\n\nfromAddress: ' + fromAddress + '\nemailTo: ' + emailTo + '\nmailText: \n' + mailText);
		nlapiSendEmail(adminUser, nlapiGetUser(), 'ERROR - Could Not Send Email', 'fromAddress: ' + fromAddress + '\nemailTo: ' + emailTo);
		return false;
	}
	
	return false;
}

function grabTimestamp(){
	
	var newDateObject = new Date();
	var year = newDateObject.getFullYear();
	var month = newDateObject.getMonth();
	var date = newDateObject.getDate();
	var hours = newDateObject.getHours();
	var minutes = newDateObject.getMinutes();

	
	var timestamp = year + month + date + 'T' + hours + minutes + '00Z';
	
	return timestamp;
}


/*
*
*  Base64 encode / decode
*  http://www.webtoolkit.info/
*
*/
 
var Base64 = {
 
	// private property
	_keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
 
	// public method for encoding
	encode : function (input) {
		var output = "";
		var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
		var i = 0;
 
		input = Base64._utf8_encode(input);
 
		while (i < input.length) {
 
			chr1 = input.charCodeAt(i++);
			chr2 = input.charCodeAt(i++);
			chr3 = input.charCodeAt(i++);
 
			enc1 = chr1 >> 2;
			enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
			enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
			enc4 = chr3 & 63;
 
			if (isNaN(chr2)) {
				enc3 = enc4 = 64;
			} else if (isNaN(chr3)) {
				enc4 = 64;
			}
 
			output = output +
			this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
			this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
 
		}
 
		return output;
	},
 
	// public method for decoding
	decode : function (input) {
		var output = "";
		var chr1, chr2, chr3;
		var enc1, enc2, enc3, enc4;
		var i = 0;
 
		input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
 
		while (i < input.length) {
 
			enc1 = this._keyStr.indexOf(input.charAt(i++));
			enc2 = this._keyStr.indexOf(input.charAt(i++));
			enc3 = this._keyStr.indexOf(input.charAt(i++));
			enc4 = this._keyStr.indexOf(input.charAt(i++));
 
			chr1 = (enc1 << 2) | (enc2 >> 4);
			chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
			chr3 = ((enc3 & 3) << 6) | enc4;
 
			output = output + String.fromCharCode(chr1);
 
			if (enc3 != 64) {
				output = output + String.fromCharCode(chr2);
			}
			if (enc4 != 64) {
				output = output + String.fromCharCode(chr3);
			}
 
		}
 
		output = Base64._utf8_decode(output);
 
		return output;
 
	},
 
	// private method for UTF-8 encoding
	_utf8_encode : function (string) {
		string = string.replace(/\r\n/g,"\n");
		var utftext = "";
 
		for (var n = 0; n < string.length; n++) {
 
			var c = string.charCodeAt(n);
 
			if (c < 128) {
				utftext += String.fromCharCode(c);
			}
			else if((c > 127) && (c < 2048)) {
				utftext += String.fromCharCode((c >> 6) | 192);
				utftext += String.fromCharCode((c & 63) | 128);
			}
			else {
				utftext += String.fromCharCode((c >> 12) | 224);
				utftext += String.fromCharCode(((c >> 6) & 63) | 128);
				utftext += String.fromCharCode((c & 63) | 128);
			}
 
		}
 
		return utftext;
	},
 
	// private method for UTF-8 decoding
	_utf8_decode : function (utftext) {
		var string = "";
		var i = 0;
		var c = c1 = c2 = 0;
 
		while ( i < utftext.length ) {
 
			c = utftext.charCodeAt(i);
 
			if (c < 128) {
				string += String.fromCharCode(c);
				i++;
			}
			else if((c > 191) && (c < 224)) {
				c2 = utftext.charCodeAt(i+1);
				string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
				i += 2;
			}
			else {
				c2 = utftext.charCodeAt(i+1);
				c3 = utftext.charCodeAt(i+2);
				string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
				i += 3;
			}
 
		}
 
		return string;
	}
 
}
