/* Mca140 | Sears Address Form.js
 * To validate address to not allow special characters
 * By, Rajiv@mca140.com
 * Updated On, 8-Dec-2016
 */
var browsers = new Array();
browsers['ns_valid_browsers'] = new Array('Chrome', 'Opera', 'Firefox', 'IE');
browsers['ns_novalid_browsers'] = new Array('Chromium', 'Safari');
var browserName = getBrowserName();
var isWorkingBrowser = browsers['ns_valid_browsers'].indexOf(browserName) !== -1 ? true : false;
var alphaNumericOnly = new RegExp('[^A-Za-z0-9 ,&.]'); //false if a-, A-Z, 0-9, ,, &, - in the string
var streetAddressANOnly = new RegExp('[^A-Za-z0-9- ,&.]'); //false if a-, A-Z, 0-9, ,, &, - in the string
var phoneTenDigitPattern = (/\d/g);
var phoneSpecialCharPattern = new RegExp('[_+.,!@#$%^&*;\\/|<>"\':?=£`\ta-zA-Z]'); //false if 0-9 (, ), , - in the phone number ///old
var zipCodeSixLengthPattern = new RegExp('([A-Z]{1}[0-9]{1}[A-Z]{1}[0-9]{1}[A-Z]{1}[0-9]{1})');
var zipCodeSpecialCharPattern = new RegExp('[-_+.,!@#$%^&*();\\/|<>"\':?=£`\t]'); //only special characters & small a-z
var zipCodeSixLengthSpacePattern = new RegExp('([A-Z]{1}[0-9]{1}[A-Z]{1} [0-9]{1}[A-Z]{1}[0-9]{1})');
var phoneNumberPattern = new RegExp('([0-9]{10})'); //10 digits numeric mobile number ///new
var fieldsLabel = new Object();
fieldsLabel = {
    'label': "Label",
    'attention': "Attention",
    'addressee': "Addressee",
    'addrphone': "Phone Number",
    'addr1': "Address #1",
    'addr2': "Address #2",
    'addr3': "PO Box",
    'city': "City",
    'zip': "Postal Code"
};

/* validate to check special characters*/
function validateField(type, field) {
    switch (field) {
        case "attention": //attention
        case "addr3": //PO Box
        case "city": //city
        case "addressee": //receiving person alreay loaded from customer details
            var value = nlapiGetFieldValue(field);

            if(value !== '' && value !== null){
                if (alphaNumericOnly.test(value)) {
                    alert("Field: '" + fieldsLabel[field] + "' contains invalid special characters.");

/*                    if(isWorkingBrowser){
                        return false;
                    }else{
                        return true;
                    }*/
                }
            }
            break;

        case "addrphone": //phone number
            var value = nlapiGetFieldValue(field);

            if(value !== '' && value !== null){
                if (phoneSpecialCharPattern.test(value)) {
                    alert("Field: '" + fieldsLabel[field] + "' should only contain numbers.");

                    return true;
/*                    if(isWorkingBrowser){
                        return false;
                    }else{
                        return true;
                    }*/
                }
                var count = (value.match(phoneTenDigitPattern) || []).length;

                if (count != 10) {
                    alert("Field: '" + fieldsLabel[field] + "' should have 10 digits.");

                    return true;
/*                    if(isWorkingBrowser){
                        return false;
                    }else{
                        return true;
                    }*/
                }
            }
            break;

        case "zip": //postal code
			var value = nlapiGetFieldValue(field);
			
            if(value !== '' && value !== null){
                if(zipCodeSpecialCharPattern.test(value)) {
                    alert("Field: '" + fieldsLabel[field] + "' contains invalid special characters.");

                    return true;
/*                    if(isWorkingBrowser){
                        return false;
                    }else{
                        return true;
                    }*/
                }
                if (zipCodeSixLengthSpacePattern.test(value)) {
                    alert("Field: '" + fieldsLabel[field] + "' Please format postal code without space. e.g. A1A2B2");

                    return true;
/*                    if(isWorkingBrowser){
                        return false;
                    }else{
                        return true;
                    }*/
                }     
                if (!zipCodeSixLengthPattern.test(value) || value.length != 6) {
                    alert("Field: '" + fieldsLabel[field] + "' should be in the format of A1A1A1.");

                    return true;
/*                    if(isWorkingBrowser){
                        return false;
                    }else{
                        return true;
                    }*/
                }
            }
            break;

        case "addr1": //address 1
        case "addr2": //address 2
        case "label": //if no value entered then address 1 value will be copied to label field
            var value = nlapiGetFieldValue(field);

            if(value !== '' && value !== null){
                if (streetAddressANOnly.test(value)) {
                    alert("Field: '" + fieldsLabel[field] + "' contains invalid special characters.");

/*                    if(isWorkingBrowser){
                        return false;
                    }else{
                        return true;
                    }*/
                }
            }
            break;
    }

    return true;
}

/* validate to check special characters whilst saving*/
function validateFieldOnSave(field) {
    switch (field) {
        case "attention": //attention
        case "addr3": //PO Box
        case "city": //city
        case "addressee": //receiving person alreay loaded from customer details
            var value = nlapiGetFieldValue(field);

            if(value !== '' && value !== null){
                if (alphaNumericOnly.test(value)) {
                    alert("Field: '" + fieldsLabel[field] + "' contains invalid special characters.");
                    
                    return false;
                }
            }
            break;

        case "addrphone": //phone number
            var value = nlapiGetFieldValue(field);

            if(value !== '' && value !== null){
                if (phoneSpecialCharPattern.test(value)) {
                    alert("Field: '" + fieldsLabel[field] + "' should only contain numbers.");

                    return false;
                }
                var count = (value.match(phoneTenDigitPattern) || []).length;

                if (count != 10) {
                    alert("Field: '" + fieldsLabel[field] + "' should have 10 digits.");
                        
                    return false;
                }
            }
            break;

		case "zip": //postal code
			var value = nlapiGetFieldValue(field);

            if(value !== '' && value !== null){
                if (zipCodeSpecialCharPattern.test(value)) {
                    alert("Field: '" + fieldsLabel[field] + "' contains invalid special characters.");
                    
                    return false;
                }
                if (zipCodeSixLengthSpacePattern.test(value)) {
                    alert("Field: '" + fieldsLabel[field] + "' Please format postal code without space. e.g. A1A2B2");

                    return false;
                }
    			if (!zipCodeSixLengthPattern.test(value)) {
                    alert("Field: '" + fieldsLabel[field] + "' should be in the format of A1A1A1.");

                    return false;
                }
            }
            break;

        case "addr1": //address 1
        case "addr2": //address 2
        case "label": //if no value entered then address 1 value will be copied to label field
            var value = nlapiGetFieldValue(field);

            if(value !== '' && value !== null){
                if (streetAddressANOnly.test(value)) {
                    alert("Field: '" + fieldsLabel[field] + "' contains invalid special characters.");
                    
                    return false;
                }
            }
            break;
    }

    return true;
}

/* validate before save*/
function saveRecord(){
    for(field in fieldsLabel){
        if(!validateFieldOnSave(field)){
            return false;
        }
    }

    return true;
}

/* Get currently using web browser name*/
function getBrowserName() {
    if ((navigator.userAgent.indexOf("Opera") || navigator.userAgent.indexOf('OPR')) != -1) {
        return 'Opera';
    } else if (navigator.userAgent.indexOf("Chrome") != -1) {
        return 'Chrome';
    } else if (navigator.userAgent.indexOf("Safari") != -1) {
        return 'Safari';
    } else if (navigator.userAgent.indexOf("Firefox") != -1) {
        return 'Firefox';
    } else if ((navigator.userAgent.indexOf("MSIE") != -1) || (!!document.documentMode == true)) {//IF IE > 10
        return 'IE';
    } else {
        return false;
    }
}