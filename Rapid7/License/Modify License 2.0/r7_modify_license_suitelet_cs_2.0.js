/*
 * @author efagone
 */
var objModifySettings = null;
function r7_pageInit(){
	objModifySettings = (nlapiGetFieldValue('custpagemodifysettingsjson')) ? JSON.parse(nlapiGetFieldValue('custpagemodifysettingsjson')) : null;
	checkAllDependencies();
}

function checkExpirationValidation(){
	//check endDate required field
	var somethingChanged = false;
	for (var addOnId in objModifySettings.addOns) {
		var objAddOn = objModifySettings.addOns[addOnId];
		if (objAddOn && nlapiGetFieldValue('custpageextendexpirefieldid') != 'custpage_addon_' + objAddOn.internalid) {
		
			var value = nlapiGetFieldValue('custpage_addon_' + objAddOn.internalid);
			var value_original = nlapiGetFieldValue('custpage_addon_' + objAddOn.internalid + '_o');
			
			if (value != value_original) {
				somethingChanged = true;
				break;
			}
		}
	}
	zc_lib_client.setFieldMandatory('custpage_feature_enddate', somethingChanged);
	return;
}

function checkAllDependencies(){
	for (var addOnId in objModifySettings.addOns) {
		var objAddOn = objModifySettings.addOns[addOnId];
		if (objAddOn) {
			checkDependencies('custpage_addon_' + objAddOn.internalid, true);
		}
	}
}

function checkDependencies(fld, isInit){
	if (fld && fld.indexOf('custpage_addon_') != -1) {
		var addOnId = fld.substr(15);
		if (addOnId && addOnId.indexOf('_') != -1) {
			addOnId = addOnId.substr(0, addOnId.indexOf('_'));
		}
		
		if (!addOnId) {
			return true;
		}
		
		var objAddOn = objModifySettings.addOns[addOnId];
		
		if (!objAddOn) {
			return true;
		}
		
		var value = nlapiGetFieldValue('custpage_addon_' + objAddOn.internalid);
		var value_original = nlapiGetFieldValue('custpage_addon_' + objAddOn.internalid + '_o');
		var addOnEnabled = (value && (value == objAddOn.specificValue || value != value_original));
		
		if (!isInit) {
			//check if this has other dependencies
			if (addOnEnabled) {
				if (objAddOn.activeDepends) {
					for (var i = 0; objAddOn.activeDepends && i < objAddOn.activeDepends.length; i++) {
						var objDependentAddOn = objModifySettings.addOns[objAddOn.activeDepends[i]];
						if (objDependentAddOn) {
							var dependentAddonValue = nlapiGetFieldValue('custpage_addon_' + objDependentAddOn.internalid);
							if (objDependentAddOn.specificValue && dependentAddonValue != objDependentAddOn.specificValue) {
								alert(objDependentAddOn.fieldLabel + ' is a dependency for ' + objAddOn.fieldLabel + '. Please correct and try again.');
								nlapiSetFieldValue(fld, '', false);
								return false;
							}
							
						}
					}
				}
			}
			
			if (objAddOn.passiveDepends) {
				for (var i = 0; objAddOn.passiveDepends && i < objAddOn.passiveDepends.length; i++) {
					var objDependentAddOn = objModifySettings.addOns[objAddOn.passiveDepends[i]];
					if (objDependentAddOn && objDependentAddOn.specificValue) {
						if (nlapiGetField('custpage_addon_' + objDependentAddOn.internalid)) {
							nlapiSetFieldValue('custpage_addon_' + objDependentAddOn.internalid, objDependentAddOn.specificValue);
							var setDisabled = addOnEnabled;
							if (objDependentAddOn.fieldType == 'checkbox' && nlapiGetFieldValue('custpage_addon_' + objDependentAddOn.internalid + '_o') == 'T') {
								setDisabled = true;
							}
							zc_lib_client.setFieldDisabled('custpage_addon_' + objDependentAddOn.internalid, setDisabled);
						}
					}
				}
			}
		}
				
		//check if anything is dependent on this
		for (var tempAddOnId in objModifySettings.addOns) {
			var objCurrentAddOn = objModifySettings.addOns[tempAddOnId];
			if (objCurrentAddOn && objCurrentAddOn.activeDepends) {
				if (objCurrentAddOn.activeDepends.indexOf(objAddOn.internalid) != -1 || objCurrentAddOn.activeDepends.indexOf(objAddOn.internalid.toString()) != -1) {
					zc_lib_client.setFieldDisabled('custpage_addon_' + objCurrentAddOn.internalid, !addOnEnabled);
				}
			}
		}
	}
	
	return true;
}

function r7_saveRecord(){
	if (!objModifySettings) {
		alert('Something went wrong. Could not find modify license settings. Please contact your Administrator.');
		return false;
	}
	
	var validation = zc_lib_client.validateRequiredFields();
	if (!validation.pass) {
		alert(validation.message);
		return false;
	}

	//check limitations
	var featureEndDate = nlapiGetFieldValue('custpage_feature_enddate');
	for (var addOnId in objModifySettings.addOns) {
		var objAddOn = objModifySettings.addOns[addOnId];
		if (objAddOn.limitation && objAddOn.include == 'T' && ['date', 'integer', 'decimal', 'checkbox'].indexOf(objAddOn.fieldType) != -1 && objAddOn.fieldId) {
		
			var value = nlapiGetFieldValue('custpage_addon_' + objAddOn.internalid);
			
			if (value && value != 'F') {
				var dateValueToCheck = (objAddOn.fieldType == 'date') ? value : featureEndDate;
				
				if (dateValueToCheck) {
					//max date
					if (objAddOn.limitation.date.maxVal && nlapiStringToDate(dateValueToCheck) > nlapiStringToDate(objAddOn.limitation.date.maxVal)) {
						alert(objAddOn.fieldLabel + ' is limited to a max date of ' + objAddOn.limitation.date.maxVal + '. Please correct and try again.');
						return false;
					}
					//dynamic max date
					if (objAddOn.limitation.date.dynamicMaxVal) {
						if (isNaN(nlapiStringToDate(objAddOn.limitation.date.dynamicMaxVal))) {
							//must be number of days, not date
							if (days_between(nlapiStringToDate(dateValueToCheck), new Date()) > parseFloat(maxDays)) {
								alert(objAddOn.fieldLabel + ' has a ' + objAddOn.limitation.date.dynamicMaxVal + ' day expiration limit. Please correct and try again.');
								return false;
							}
						}
						else {
							if (nlapiStringToDate(dateValueToCheck) > nlapiStringToDate(objAddOn.limitation.date.dynamicMaxVal)) {
								alert(objAddOn.fieldLabel + ' is limited to a max date of ' + objAddOn.limitation.date.dynamicMaxVal + '. Please correct and try again.');
								return false;
							}
						}
					}
					
					//max days
					if (objAddOn.limitation.date.maxDays && days_between(nlapiStringToDate(dateValueToCheck), new Date()) > parseFloat(objAddOn.limitation.date.maxDays)) {
						alert(objAddOn.fieldLabel + ' has a ' + objAddOn.limitation.date.maxDays + ' day expiration limit. Please correct and try again.');
						return false;
					}
					
					//dynamic max days
					if (objAddOn.limitation.date.dynamicMaxDays) {
					
						if (isNaN(nlapiStringToDate(objAddOn.limitation.date.dynamicMaxDays))) {
							//must be number of days, not date
							if (days_between(nlapiStringToDate(dateValueToCheck), new Date()) > parseFloat(maxDays)) {
								alert(objAddOn.fieldLabel + ' has a ' + objAddOn.limitation.date.dynamicMaxDays + ' day expiration limit. Please correct and try again.');
								return false;
							}
						}
						else {
							if (nlapiStringToDate(dateValueToCheck) > nlapiStringToDate(objAddOn.limitation.date.dynamicMaxDays)) {
								alert(objAddOn.fieldLabel + ' is limited to a max date of ' + objAddOn.limitation.date.dynamicMaxDays + '. Please correct and try again.');
								return false;
							}
						}
					}
				}
				
				if (['integer', 'decimal'].indexOf(objAddOn.fieldType) != -1) {
					var existingVal = parseFloat(objAddOn.limitation.integer.existingVal || 0);
					var existingValMsg = (existingVal > 0) ? ('This license already has ' + existingVal + ' ' + objAddOn.fieldLabel + ' that is being included in this calculation. ') : '';
					if (objAddOn.limitation.integer.maxVal && (parseFloat(value) + existingVal) > parseFloat(objAddOn.limitation.integer.maxVal)) {
						alert(objAddOn.fieldLabel + ' is limited to a max value of ' + objAddOn.limitation.integer.maxVal + '. ' + existingValMsg + 'Please correct and try again.');
						return false;
					}
					
					if (objAddOn.limitation.integer.dynamicMaxVal != null && objAddOn.limitation.integer.dynamicMaxVal !== '' && (parseFloat(value) + existingVal) > parseFloat(objAddOn.limitation.integer.dynamicMaxVal)) {
						alert(objAddOn.fieldLabel + ' is limited to a max value of ' + objAddOn.limitation.integer.maxVal + '. Please correct and try again.');
						return false;
					}
				}
			}
		}
	}
	
	return true;
}

function r7_fieldChanged(type, name, linenum){
	
	checkExpirationValidation();
	
	if (name == 'custpagereset'){
		zc_lib_client.setFieldDisabled('custpageresetcomments', (nlapiGetFieldValue('custpagereset') != 'T'), true, true);
	}
	
}

function r7_validateField(type, name, linenum){
	var isValid = checkDependencies(name);
	if (!isValid){
		return false;
	}
	return true;	
}

function days_between(date1, date2){

	// The number of milliseconds in one day
	var ONE_DAY = 1000 * 60 * 60 * 24;
	
	// Convert both dates to milliseconds
	var date1_ms = date1.getTime();
	var date2_ms = date2.getTime();
	
	// Calculate the difference in milliseconds
	var difference_ms = Math.abs(date1_ms - date2_ms);
	
	// Convert back to days and return
	return Math.round(difference_ms / ONE_DAY);
	
}

var zc_windowUtils = (function(){
	
	function popUpWindow(url, title, width, height){
		var params = [];
		
		if (width && height) {
			var dualScreenLeft = window.screenLeft != undefined ? window.screenLeft : screen.left;
			var dualScreenTop = window.screenTop != undefined ? window.screenTop : screen.top;
			
			var screenWidth = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
			var screenHeight = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;
			
			var top = ((screenHeight / 2) - (height / 2)) + dualScreenTop;
			var left = ((screenWidth / 2) - (width / 2)) + dualScreenLeft;
			
			params.push('width=' + width);
			params.push('height=' + height);
			params.push('top=' + top);
			params.push('left=' + left);
			params.push('menubar=no');
			params.push('status=no');
		}
		
		newwin = window.open(url, title, params.join(','));
		
		if (window.focus) {
			newwin.focus();
		}
		return false;
	}
	
	function replaceWindow(url){
		window.location = url;
		return false;
	}
	
	return {
		popUpWindow: popUpWindow,
		replaceWindow: replaceWindow
	};
})();

var zc_lib_client = (function(){
	var objRequiredFieldsSet = {};
	
	function setFieldDisplay(fld, show, setNull){
	
		show = (!show) ? false : true;
		
		if (!show) {
			if (setNull) {
				nlapiSetFieldValue(fld, '', false);
			}
			setFieldMandatory(fld, false);
		}
		nlapiSetFieldDisplay(fld, show);
		return;
	}
	
	function setFieldMandatory(fieldId, isMandatory){
		if (isMandatory) {
			setFieldDisplay(fieldId, isMandatory);
		}
		nlapiSetFieldMandatory(fieldId, isMandatory);
		objRequiredFieldsSet[fieldId] = isMandatory;
		return;
	}
	
	function setFieldDisabled(fld, isDisabled, setNull, mandatoryIfNotDisabled){
		isDisabled = (!isDisabled) ? false : true;
		
		if (isDisabled) {
			if (setNull) {
				nlapiSetFieldValue(fld, '', false);
			}
			setFieldMandatory(fld, false);
		}
		else 
			if (mandatoryIfNotDisabled) {
				setFieldMandatory(fld, true);
			}
		nlapiDisableField(fld, isDisabled);
		return;
	}
	
	function validateRequiredFields(){
	
		var arrMissing = [];
		for (key in objRequiredFieldsSet) {
			if (objRequiredFieldsSet.hasOwnProperty(key) && objRequiredFieldsSet[key]) {
				if (nlapiGetFieldValue(key) == null || nlapiGetFieldValue(key) == '') {
					arrMissing.push(nlapiGetFieldLabel(key));
				}
			}
		}
		
		if (arrMissing && arrMissing.length > 0) {
			return {
				pass: false,
				message: 'Please enter a value(s) for: ' + arrMissing.join(', ')
			};
		}
		
		return {
			pass: true
		};
	}
	
	function popUpWindow(url, width, height){
		var params = '';
		
		if (width != null && width != '' && height != null && height != '') {
			params += 'width=' + width + ', height=' + height;
		}
		
		newwin = window.open(url, null, params);
		
		if (window.focus) {
			newwin.focus();
		}
		return false;
	}
	
	return {
		setFieldDisplay: setFieldDisplay,
		setFieldMandatory: setFieldMandatory,
		setFieldDisabled: setFieldDisabled,
		validateRequiredFields: validateRequiredFields,
		popUpWindow: popUpWindow
	};
})();
