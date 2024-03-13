/*
 * @author efagone
 */

function r7_modify_license_suitelet(request, response){
	try {
		if (request.getMethod() == 'GET') {
		
			var acrId = request.getParameter('custparam_acrid');
			var licenseId = request.getParameter('custparam_licenseid');
			
			if (!acrId || !licenseId) {
				throw nlapiCreateError('MISSING PARAM', 'Missing a required parameter', true);
			}
			
			var recACRProductType = nlapiLoadRecord('customrecordr7acrproducttype', acrId);
			var objModifySettings = grabModifySettings({
				recType: recACRProductType.getFieldValue('custrecordr7acrrecordid'),
				licenseId: licenseId
			});
			if (!objModifySettings) {
				throw nlapiCreateError('MISSING PARAM', 'Record type not configured for modify license.', true);
			}
			
			var recLicense = nlapiLoadRecord(recACRProductType.getFieldValue('custrecordr7acrrecordid'), licenseId);
			
			var form = nlapiCreateForm('Modify License', false);
			form.setScript('customscriptr7_modify_license_suitelet_c');
			
			form.addFieldGroup('primarygroup', 'License Information');
			form.addFieldGroup('gracegroup', 'Grace Period').setSingleColumn(true);
			form.addFieldGroup('resetgroup', 'Reset Activation').setSingleColumn(true);
			form.addFieldGroup('featuresgroup', 'Features');
			
			//HIDDEN
			form.addField('custpageacrid', 'text').setDisplayType('hidden');
			form.addField('custpagelicensetype', 'text').setDisplayType('hidden');
			form.addField('custpagelicenseid', 'text').setDisplayType('hidden');
			form.addField('custpagemodifysettingsjson', 'inlinehtml').setDisplayType('hidden');
			form.addField('custpagecontact_o', 'text').setDisplayType('hidden');
			form.addField('custpageopportunity_o', 'text').setDisplayType('hidden');
			form.addField('custpagesalesorder_o', 'text').setDisplayType('hidden');
			form.addField('custpageactualexpiration', 'date').setDisplayType('hidden');
			form.addField('custpageextendexpirefieldid', 'text').setDisplayType('hidden');
			form.addField('custpagefmrcreated', 'checkbox').setDisplayType('hidden');
			
			//PRIMARY
			form.addField('custpagelicenselnk', 'url', 'License', null, 'primarygroup').setDisplayType('inline');
			form.addField('custpagecustomer', 'select', 'Customer', 'customer', 'primarygroup').setDisplayType('inline');
			form.addField('custpagecontact', 'select', 'Contact', null, 'primarygroup');
			form.addField('custpagespacer', 'inlinehtml', null, null, 'primarygroup').setPadding(1); //contact was too close
			form.addField('custpageopportunity', 'select', 'Opportunity', null, 'primarygroup').setDisplayType('inline');

			if (userHasPermission('create_license_w_sales_order')) {
				form.addField('custpagesalesorder', 'select', 'Sales Order', null, 'primarygroup');
			} else {
				form.addField('custpagesalesorder', 'select', 'Sales Order', 'transaction', 'primarygroup').setDisplayType('inline');
			}

			form.addField('custpageproductkey', 'text', 'Product Key', null, 'primarygroup').setDisplayType('inline');
			form.addField('custpagecurrentexpiration', 'date', 'Expiration Date', null, 'primarygroup').setDisplayType('inline');
			form.addField('custpageproductlogo', 'inlinehtml', null, null, 'primarygroup');
			
			//RESET
			form.addField('custpagereset', 'checkbox', 'Reset License', null, 'resetgroup');
			form.addField('custpageresetcomments', 'textarea', 'Comments', null, 'resetgroup');
			
			if (!recACRProductType.getFieldValue('custrecordr7acrresetrecid')) {
				form.getField('custpagereset').setDisplayType('hidden');
				form.getField('custpageresetcomments').setDisplayType('hidden');
			}
			else 
				if (!accessChecker.hasAccess({
					all_roles: recACRProductType.getFieldValue('custrecordr7acrreset_perm_allroles'),
					roles: recACRProductType.getFieldValue('custrecordr7acrreset_perm_roles') || [],
					all_departments: recACRProductType.getFieldValue('custrecordr7acrreset_perm_alldepts'),
					departments: recACRProductType.getFieldValue('custrecordr7acrreset_perm_departments') || [],
					all_employees: recACRProductType.getFieldValue('custrecordr7acrreset_perm_allemps'),
					employees: recACRProductType.getFieldValue('custrecordr7acrreset_perm_employees') || []
				})) {
					form.getField('custpagereset').setDisplayType('disabled');
					form.getField('custpageresetcomments').setDisplayType('disabled');
				}
			//FEATURES
			var nonExpirationDateFieldCreated = false;
			var hasAtLeastOneFeature = false;
			var arrDependencies = [];
			//dates
			for (var addOnId in objModifySettings.addOns) {
				var objAddOn = objModifySettings.addOns[addOnId];
				if (objAddOn.include == 'T' && objAddOn.fieldType == 'date') {
					form.addField('custpage_addon_' + objAddOn.internalid, objAddOn.fieldType, objAddOn.fieldLabel, null, ((objAddOn.fieldId == recACRProductType.getFieldValue('custrecordr7acrexpirationfieldid')) ? 'gracegroup' : 'featuresgroup'));
					form.addField('custpage_addon_' + objAddOn.internalid + '_o', objAddOn.fieldType).setDisplayType('hidden');
					form.getField('custpage_addon_' + objAddOn.internalid).setDisplaySize(9);
					if (objAddOn.fieldId == recACRProductType.getFieldValue('custrecordr7acrexpirationfieldid')) {
						form.getField('custpageextendexpirefieldid').setDefaultValue( 'custpage_addon_' + objAddOn.internalid);
						form.getField('custpage_addon_' + objAddOn.internalid).setLayoutType('normal', 'startcol');
						expirationFieldCreated = true;
					} else if (!nonExpirationDateFieldCreated){
						nonExpirationDateFieldCreated = true;
						form.getField('custpage_addon_' + objAddOn.internalid).setLayoutType('normal', 'startcol');
					}
					arrDependencies = arrDependencies.concat(objAddOn.activeDepends);
				}
			}
			
			form.addField('custpage_feature_enddate', 'date', 'Feature Expiration Date', null, 'featuresgroup');
			form.getField('custpage_feature_enddate').setDisplaySize(9);
			if (!nonExpirationDateFieldCreated) {
				form.getField('custpage_feature_enddate').setLayoutType('normal', 'startcol');
			}
			
			//integers
			var first = true;
			for (var addOnId in objModifySettings.addOns) {
				var objAddOn = objModifySettings.addOns[addOnId];
				if (objAddOn.include == 'T' && ['integer', 'decimal'].indexOf(objAddOn.fieldType) != -1) {
					form.addField('custpage_addon_' + objAddOn.internalid, objAddOn.fieldType, objAddOn.fieldLabel, null, 'featuresgroup');
					form.addField('custpage_addon_' + objAddOn.internalid + '_o', objAddOn.fieldType).setDisplayType('hidden');
					form.getField('custpage_addon_' + objAddOn.internalid).setDisplaySize(11);
					if (first) {
						form.getField('custpage_addon_' + objAddOn.internalid).setPadding(1);
						first = false;
						hasAtLeastOneFeature = true;
					}
					
					arrDependencies = arrDependencies.concat(objAddOn.activeDepends);
				}
			}
			
			//checkboxes
			var first = true;
			for (var addOnId in objModifySettings.addOns) {
				var objAddOn = objModifySettings.addOns[addOnId];
				if (objAddOn.include == 'T' && objAddOn.fieldType == 'checkbox') {
					form.addField('custpage_addon_' + objAddOn.internalid, objAddOn.fieldType, objAddOn.fieldLabel, null, 'featuresgroup');
					form.addField('custpage_addon_' + objAddOn.internalid + '_o', objAddOn.fieldType).setDisplayType('hidden');
					if (recLicense.getFieldValue(objAddOn.fieldId) == 'T') {
						form.getField('custpage_addon_' + objAddOn.internalid).setDefaultValue(recLicense.getFieldValue(objAddOn.fieldId));
						form.getField('custpage_addon_' + objAddOn.internalid).setDisabled(true);
						form.getField('custpage_addon_' + objAddOn.internalid + '_o').setDefaultValue(recLicense.getFieldValue(objAddOn.fieldId));
					}
					if (first) {
						form.getField('custpage_addon_' + objAddOn.internalid).setLayoutType('normal', 'startcol');
						first = false;
						hasAtLeastOneFeature = true;
					}
					arrDependencies = arrDependencies.concat(objAddOn.activeDepends);
				}
			}
			
			//selects
			var first = true;
			for (var addOnId in objModifySettings.addOns) {
				var objAddOn = objModifySettings.addOns[addOnId];
				if (objAddOn.include == 'T' && ['select', 'multiselect'].indexOf(objAddOn.fieldType) != -1 && objAddOn.fieldId) {
					form.addField('custpage_addon_' + objAddOn.internalid, objAddOn.fieldType, objAddOn.fieldLabel, null, 'featuresgroup');
					form.addField('custpage_addon_' + objAddOn.internalid + '_o', objAddOn.fieldType).setDisplayType('hidden');
					
					form.getField('custpage_addon_' + objAddOn.internalid).addSelectOption('', '');
					form.getField('custpage_addon_' + objAddOn.internalid + '_o').addSelectOption('', '');
					if (recLicense.getField(objAddOn.fieldId)) {
						var arrValues = [];
						if (objAddOn.limitation && objAddOn.limitation.select.operator) {
							if (objAddOn.limitation.select.values) {
								arrValues = (objAddOn.limitation.select.values || '').replace(/[^0-9,\*]/g, '').split(',');
							}
							else 
								if (objAddOn.limitation.select.dynamicValues) {
									arrValues = (getLimitationResultFromSearch({
										search: objAddOn.limitation.select.dynamicValues,
										internalid: licenseId,
										recordType: recACRProductType.getFieldValue('custrecordr7acrrecordid')
									}) ||
									'').replace(/[^0-9,\*]/g, '').split(',');
								}
						}
						
						var options = recLicense.getField(objAddOn.fieldId).getSelectOptions();
						for (var i = 0; options && i < options.length; i++) {
							var includedVal = (arrValues.indexOf(parseInt(options[i].getId())) != -1 || arrValues.indexOf(options[i].getId().toString()) != -1);
							
							if (arrValues.indexOf('*') == -1) {
								if (objAddOn.limitation && objAddOn.limitation.select.operator && (objAddOn.limitation.select.operator == 1 && !includedVal || objAddOn.limitation.select.operator == 2 && includedVal)) {
									if (recLicense.getFieldValue(objAddOn.fieldId) != options[i].getId()) {
										//hit limitation and not existing val, don't add to list
										continue;
									}
								}
							}
							form.getField('custpage_addon_' + objAddOn.internalid).addSelectOption(options[i].getId(), options[i].getText());
							form.getField('custpage_addon_' + objAddOn.internalid + '_o').addSelectOption(options[i].getId(), options[i].getText());
						}
					}
					if (recLicense.getFieldValue(objAddOn.fieldId)) {
						form.getField('custpage_addon_' + objAddOn.internalid).setDefaultValue(recLicense.getFieldValue(objAddOn.fieldId));
						form.getField('custpage_addon_' + objAddOn.internalid + '_o').setDefaultValue(recLicense.getFieldValue(objAddOn.fieldId));
					}
					if (first) {
						form.getField('custpage_addon_' + objAddOn.internalid).setLayoutType('normal', 'startcol');
						first = false;
						hasAtLeastOneFeature = true;
					}
					arrDependencies = arrDependencies.concat(objAddOn.activeDepends);
				}
			}
			
			//any dependencies they may have not been loaded
			arrDependencies = unique(arrDependencies);
			for (var i = 0; arrDependencies && i < arrDependencies.length; i++) {
				var objAddOn = objModifySettings.addOns[arrDependencies[i]];
				if (objAddOn && !form.getField('custpage_addon_' + objAddOn.internalid)) {
					form.addField('custpage_addon_' + objAddOn.internalid, objAddOn.fieldType, objAddOn.fieldLabel, null, 'featuresgroup').setDisplayType('hidden');
					form.addField('custpage_addon_' + objAddOn.internalid + '_o', objAddOn.fieldType).setDisplayType('hidden');
					
					if (['integer', 'checkbox', 'select', 'multiselect'].indexOf(objAddOn.fieldType) != -1 && recLicense.getFieldValue(objAddOn.fieldId)) {
						form.getField('custpage_addon_' + objAddOn.internalid).setDefaultValue(recLicense.getFieldValue(objAddOn.fieldId));
						form.getField('custpage_addon_' + objAddOn.internalid + '_o').setDefaultValue(recLicense.getFieldValue(objAddOn.fieldId));
					}
				}
			}
			
			//LAYOUT AND OTHER FIELD ATTRIBUTES
			form.getField('custpageresetcomments').setDisplaySize(50, 2);
			
			form.getField('custpageresetcomments').setDisabled(true);
			
			form.getField('custpagelicenselnk').setLayoutType('normal', 'startcol');
			form.getField('custpageopportunity').setLayoutType('normal', 'startcol');
			form.getField('custpageproductkey').setLayoutType('normal', 'startcol');
			form.getField('custpageproductlogo').setLayoutType('normal', 'startcol');
			
			if (!hasAtLeastOneFeature) {
				form.getField('custpage_feature_enddate').setDisplayType('hidden');
			}
			
			//SET DEFAULT VALUES
			form.getField('custpageacrid').setDefaultValue(acrId);
			form.getField('custpagelicensetype').setDefaultValue(recACRProductType.getFieldValue('custrecordr7acrrecordid'));
			form.getField('custpagelicenseid').setDefaultValue(licenseId);
			form.getField('custpagemodifysettingsjson').setDefaultValue(JSON.stringify(objModifySettings));
			form.getField('custpagelicenselnk').setLinkText(recLicense.getFieldValue('name'));
			form.getField('custpagelicenselnk').setDefaultValue(nlapiResolveURL('RECORD', recACRProductType.getFieldValue('custrecordr7acrrecordid'), licenseId));
			form.getField('custpagefmrcreated').setDefaultValue(recLicense.getFieldValue(recACRProductType.getFieldValue('custrecordr7acrfeaturemngcreatedfieldid')));
			
			if (recACRProductType.getFieldValue('custrecordr7acrcustomerfieldid')) {
				form.getField('custpagecustomer').setDefaultValue(recLicense.getFieldValue(recACRProductType.getFieldValue('custrecordr7acrcustomerfieldid')));
				sourceContacts(recLicense.getFieldValue(recACRProductType.getFieldValue('custrecordr7acrcustomerfieldid')), form.getField('custpagecontact'));
				sourceOpportunities(recLicense.getFieldValue(recACRProductType.getFieldValue('custrecordr7acrcustomerfieldid')), form.getField('custpageopportunity'));
			}
			else {
				form.getField('custpagecustomer').setDisplayType('hidden');
			}
			
			if (recACRProductType.getFieldValue('custrecordr7acrcontactfieldid')) {
				form.getField('custpagecontact').setDefaultValue(recLicense.getFieldValue(recACRProductType.getFieldValue('custrecordr7acrcontactfieldid')));
				form.getField('custpagecontact_o').setDefaultValue(recLicense.getFieldValue(recACRProductType.getFieldValue('custrecordr7acrcontactfieldid')));
			}
			else {
				form.getField('custpagecontact').setDisplayType('hidden');
			}
			
			if (recACRProductType.getFieldValue('custrecordr7acropportunityfieldid')) {
				form.getField('custpageopportunity').setDefaultValue(recLicense.getFieldValue(recACRProductType.getFieldValue('custrecordr7acropportunityfieldid')));
				form.getField('custpageopportunity_o').setDefaultValue(recLicense.getFieldValue(recACRProductType.getFieldValue('custrecordr7acropportunityfieldid')));
			}
			else {
				form.getField('custpageopportunity').setDisplayType('hidden');
			}
			
			if (recACRProductType.getFieldValue('custrecordr7acrsalesorderfieldid')) {
				if (userHasPermission('create_license_w_sales_order')) {
					var customerId = recLicense.getFieldValue(recACRProductType.getFieldValue('custrecordr7acrcustomerfieldid'));
					sourceSalesOrders(customerId, form.getField('custpagesalesorder'));
				}

				form.getField('custpagesalesorder').setDefaultValue(recLicense.getFieldValue(recACRProductType.getFieldValue('custrecordr7acrsalesorderfieldid')));
				form.getField('custpagesalesorder_o').setDefaultValue(recLicense.getFieldValue(recACRProductType.getFieldValue('custrecordr7acrsalesorderfieldid')));

				if (!recLicense.getFieldValue(recACRProductType.getFieldValue('custrecordr7acrsalesorderfieldid'))) {
					form.getField('custpageopportunity').setDisplayType('normal');
				}
			}
			else {
				form.getField('custpagesalesorder').setDisplayType('hidden');
			}
			
			if (recACRProductType.getFieldValue('custrecordr7acractivationid')) {
				form.getField('custpageproductkey').setDefaultValue(recLicense.getFieldValue(recACRProductType.getFieldValue('custrecordr7acractivationid')));
			}
			else {
				form.getField('custpageproductkey').setDisplayType('hidden');
			}
			
			if (recACRProductType.getFieldValue('custrecordr7acrexpirationfieldid')) {
				form.getField('custpageactualexpiration').setDefaultValue(lfmUtils.getMaxEndDateLFM({
					productKey: recLicense.getFieldValue(recACRProductType.getFieldValue('custrecordr7acractivationid')),
					recordType: recACRProductType.getFieldValue('custrecordr7acrrecordid'),
					fieldId: recACRProductType.getFieldValue('custrecordr7acrexpirationfieldid')
				}));
				form.getField('custpagecurrentexpiration').setDefaultValue(recLicense.getFieldValue(recACRProductType.getFieldValue('custrecordr7acrexpirationfieldid')));
			}
			else {
				form.getField('custpagecurrentexpiration').setDisplayType('hidden');
			}
			
			if (recACRProductType.getFieldValue('custrecordr7acr_product_logo')) {
				var logoURL = nlapiLookupField('customrecordr7acrproducttype', acrId, 'custrecordr7acr_product_logo', 'text');
				if (logoURL) {
					form.getField('custpageproductlogo').setDefaultValue('<img src="' + logoURL + '" WIDTH="200">');
				}
			}
			else {
				form.getField('custpageproductlogo').setDisplayType('hidden');
			}
			
			form.addSubmitButton('Submit');
			form.addButton('custpage_cancel', 'Cancel', 'history.go(-1);return false;');
			//form.addButton('custpage_replacelicense', 'Replace License', 'replaceIt()');
			
			response.writePage(form);
			
		}
		
		if (request.getMethod() == 'POST') {
		
			var acrId = request.getParameter('custpageacrid');
			var licenseId = request.getParameter('custpagelicenseid');
			var productKey = request.getParameter('custpageproductkey');
			var fmrCreated = request.getParameter('custpagefmrcreated');
			var actualExpirationDate = request.getParameter('custpageactualexpiration');
			var extendedExpirationDate = (request.getParameter('custpageextendexpirefieldid')) ? request.getParameter(request.getParameter('custpageextendexpirefieldid')) : null;
			var featureExpirationDate = request.getParameter('custpage_feature_enddate');
			var objModifySettings = (request.getParameter('custpagemodifysettingsjson')) ? JSON.parse(request.getParameter('custpagemodifysettingsjson')) : null;
			//var addOnFields = getAddOnFields();
			
			if (!acrId || !licenseId || !objModifySettings) {
				throw nlapiCreateError('MISSING PARAM', 'Missing a required parameter', true);
			}
			
			var recACRProductType = nlapiLoadRecord('customrecordr7acrproducttype', acrId);
			var objModifySettings = grabModifySettings({
				recType: recACRProductType.getFieldValue('custrecordr7acrrecordid'),
				licenseId: licenseId
			});
			if (!objModifySettings) {
				throw nlapiCreateError('MISSING PARAM', 'Record type not configured for modify license.', true);
			}
			
			// FEATURE/EXPIRATION UPDATE
			if (extendedExpirationDate || featureExpirationDate) { //license changes
				//ADD TRIAL FEATURES
				if (featureExpirationDate) {
					
					if (fmrCreated == 'F') {
						lfmUtils.scrapeLicenseRecord(licenseId, recACRProductType, actualExpirationDate);
					}
		
					featureExpirationDate = nlapiDateToString(nlapiStringToDate(featureExpirationDate)); //need to fix format for NS
					var arrDependencies = [];
					var arrAddonsProcessed = [];
					for (var addOnId in objModifySettings.addOns) {
						var objAddOn = objModifySettings.addOns[addOnId];
						if (objAddOn.include == 'T' && ['date', 'integer', 'decimal', 'checkbox', 'select', 'multiselect'].indexOf(objAddOn.fieldType) != -1 && objAddOn.fieldId) {
						
							var value = request.getParameter('custpage_addon_' + objAddOn.internalid);
							
							if (value && value != 'F') {
								lfmUtils.createFMR({
									recACRProductType: recACRProductType,
									addOn: addOnId,
									fieldType: objAddOn.fieldType,
									productKey: productKey,
									value: value,
									endDate: featureExpirationDate,
									licenseId: licenseId
								});
								
								if (arrAddonsProcessed.indexOf(addOnId) == -1) {
									arrAddonsProcessed.push(addOnId);
								}
								arrDependencies = arrDependencies.concat(objAddOn.passiveDepends);
							}
						}
					}
					
					arrDependencies = unique(arrDependencies);
					arrDependencies = arrDependencies.filter(function (acrId) {
						return !(arrAddonsProcessed.indexOf(acrId) > -1);
					});
					for (var i = 0; arrDependencies && i < arrDependencies.length; i++) {
						var objAddOn = objModifySettings.addOns[arrDependencies[i]];
						if (objAddOn && ['date', 'integer', 'decimal', 'checkbox', 'select', 'multiselect'].indexOf(objAddOn.fieldType) != -1 && objAddOn.fieldId) {
						
							var value = request.getParameter('custpage_addon_' + objAddOn.internalid) || objAddOn.specificValue;
							
							if (value && value != 'F') {
								lfmUtils.createFMR({
									recACRProductType: recACRProductType,
									addOn: arrDependencies[i],
									fieldType: objAddOn.fieldType,
									productKey: productKey,
									value: value,
									endDate: featureExpirationDate,
									licenseId: licenseId
								});
							}
						}
					}
				}
				
				if (extendedExpirationDate) {
					lfmUtils.extendLicenseExpiration(licenseId, recACRProductType, nlapiDateToString(nlapiStringToDate(extendedExpirationDate)));
				}
				
				var recLicense = nlapiLoadRecord(recACRProductType.getFieldValue('custrecordr7acrrecordid'), licenseId);
				if (request.getParameter('custpagecontact')) {
					recLicense.setFieldValue(recACRProductType.getFieldValue('custrecordr7acrcontactfieldid'), request.getParameter('custpagecontact'));
				}
				if (request.getParameter('custpageopportunity')) {
					recLicense.setFieldValue(recACRProductType.getFieldValue('custrecordr7acropportunityfieldid'), request.getParameter('custpageopportunity'));
				}
				if (request.getParameter('custpagesalesorder')) {
					recLicense.setFieldValue(recACRProductType.getFieldValue('custrecordr7acrsalesorderfieldid'), request.getParameter('custpagesalesorder'));
				}

				lfmUtils.processEverything({
					recACRProductType: recACRProductType,
					recLicense: recLicense,
					actualExpirationDate :actualExpirationDate
				});
			}
			else {
			
				// CONTACT/OPPORTUNITY CHANGE ONLY
				var currentContact = request.getParameter('custpagecontact_o');
				var newContact = request.getParameter('custpagecontact');
				
				var currentOpportunity = request.getParameter('custpageopportunity_o');
				var newOpportunity = request.getParameter('custpageopportunity');

				var currentSalesOrder = request.getParameter('custpagesalesorder_o');
				var newSalesOrder = request.getParameter('custpagesalesorder');

				if ((newContact && newContact !== currentContact) || (newOpportunity && newOpportunity !== currentOpportunity) || newSalesOrder !== currentSalesOrder) {
					var recLicense = nlapiLoadRecord(recACRProductType.getFieldValue('custrecordr7acrrecordid'), licenseId);
					if (request.getParameter('custpagecontact')) {
						recLicense.setFieldValue(recACRProductType.getFieldValue('custrecordr7acrcontactfieldid'), request.getParameter('custpagecontact'));
					}
					if (request.getParameter('custpageopportunity')) {
						recLicense.setFieldValue(recACRProductType.getFieldValue('custrecordr7acropportunityfieldid'), request.getParameter('custpageopportunity'));
					}
					if (request.getParameter('custpagesalesorder')) {
						recLicense.setFieldValue(recACRProductType.getFieldValue('custrecordr7acrsalesorderfieldid'), request.getParameter('custpagesalesorder'));
					}
					nlapiSubmitRecord(recLicense);
				}
			}
			
			//LICENSE RESET
			if (request.getParameter('custpagereset') == 'T') {
			//createResetRecord(licenseId, request.getParameter('custpageresetcomments')); //TODO
			}
			
			nlapiSetRedirectURL('RECORD', recACRProductType.getFieldValue('custrecordr7acrrecordid'), licenseId, 'view');
		}
	} 
	catch (e) {
		response.writeLine(e);
		return;
	}
}

function sourceContacts(customerId, fld){

	fld.addSelectOption('', '');
	
	if (customerId) {
	
		var arrFilters = [];
		arrFilters.push(new nlobjSearchFilter('company', null, 'is', customerId));
		arrFilters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
		//arrFilters.push(new nlobjSearchFilter('email', null, 'isnotempty'));

		var arrColumns = [];
		arrColumns.push(new nlobjSearchColumn('internalid'));
		arrColumns.push(new nlobjSearchColumn('entityid'));
		arrColumns.push(new nlobjSearchColumn('email'));
		
		var arrResults = nlapiSearchRecord('contact', null, arrFilters, arrColumns);
		
		for (var i = 0; arrResults && i < arrResults.length; i++) {
			fld.addSelectOption(arrResults[i].getValue('internalid'), arrResults[i].getValue('entityid'));
		}
	}
	
	return fld;
}

function sourceOpportunities(customerId, fld){

	fld.addSelectOption('', '');
	
	if (customerId) {
		var arrFilters = [];
		arrFilters.push(new nlobjSearchFilter('entity', null, 'is', customerId));
		
		var arrColumns = [];
		arrColumns.push(new nlobjSearchColumn('internalid'));
		arrColumns.push(new nlobjSearchColumn('tranid').setSort(true));
		arrColumns.push(new nlobjSearchColumn('title'));

		var arrResults = nlapiSearchRecord('opportunity', null, arrFilters, arrColumns);
		
		for (var i = 0; arrResults && i < arrResults.length; i++) {
			var optionText = arrResults[i].getValue('tranid') + ': ' + arrResults[i].getValue('title');
			fld.addSelectOption(arrResults[i].getValue('internalid'), optionText);
		}
	}
	
	return fld;
}

function sourceSalesOrders(customerId, fld) {
	fld.addSelectOption('', '');

	var arrSearchResults = nlapiSearchRecord('salesorder', null, [
		['entity', 'anyof', customerId],
		'and', ['mainline', 'is', 'T']
	], [
		new nlobjSearchColumn('tranid').setSort(true)
	]);

	(arrSearchResults || []).forEach(function(result) {
		var optionId = result.getId();
		var documentNumber = result.getValue('tranid');

		var optionText = 'Sales Order #' + documentNumber;

		fld.addSelectOption(optionId, optionText);
	});
}

function grabModifySettings(params){

	if (!params || !params.recType) {
		return null;
	}
		
	var arrFilters = [];
	arrFilters.push(new nlobjSearchFilter('formulatext', null, 'is', params.recType).setFormula("{custrecordr7aclrecord_internalid}"));
	
	var arrColumns = [];
	arrColumns.push(new nlobjSearchColumn('internalid').setSort(false));
	arrColumns.push(new nlobjSearchColumn('isinactive'));
	arrColumns.push(new nlobjSearchColumn('name'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7acladdon_fieldid'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7acladdon_fieldtype'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7aclrecord_internalid'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7acladdon_mod_include'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7acladdon_specificvalue'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7acladdon_mod_field_label'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7acladdon_mod_perm_allroles'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7acladdon_mod_perm_roles'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7acladdon_mod_perm_depts'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7acladdon_mod_perm_alldepts'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7acladdon_mod_perm_employees'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7acladdon_mod_perm_allemps'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7acladdon_mod_passive_depends'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7acladdon_mod_active_depends'));

	var savedsearch = nlapiCreateSearch('customrecordr7acladdoncomponents', arrFilters, arrColumns);
	var resultSet = savedsearch.runSearch();
	
	var objSettings = {
		addOns: {}
	};
	
	var arrAvailableAddonIds = [];
	
	var rowNum = 0;
	do {
		var arrResults = resultSet.getResults(rowNum, rowNum + 1000);
		for (var i = 0; arrResults && i < arrResults.length; i++) {
			rowNum++;
			
			//permission fields
			var allRoles = arrResults[i].getValue('custrecordr7acladdon_mod_perm_allroles');
			var allDepartments = arrResults[i].getValue('custrecordr7acladdon_mod_perm_alldepts');
			var allEmployees = arrResults[i].getValue('custrecordr7acladdon_mod_perm_allemps');
			var roles = txtToArray(arrResults[i].getValue('custrecordr7acladdon_mod_perm_roles'));
			var departments = txtToArray(arrResults[i].getValue('custrecordr7acladdon_mod_perm_depts'));
			var employees = txtToArray(arrResults[i].getValue('custrecordr7acladdon_mod_perm_employees'));
			
			var objAddOn = {
				isinactive: arrResults[i].getValue('isinactive'),
				internalid: arrResults[i].getValue('internalid'),
				name: arrResults[i].getValue('name'),
				fieldId: arrResults[i].getValue('custrecordr7acladdon_fieldid'),
				fieldType: arrResults[i].getValue('custrecordr7acladdon_fieldtype'),
				recordType: arrResults[i].getText('custrecordr7aclrecord_internalid'),
				specificValue: arrResults[i].getValue('custrecordr7acladdon_specificvalue'),
				include: arrResults[i].getValue('custrecordr7acladdon_mod_include'),
				fieldLabel: arrResults[i].getValue('custrecordr7acladdon_mod_field_label') || arrResults[i].getValue('name'),
				passiveDepends: txtToArray(arrResults[i].getValue('custrecordr7acladdon_mod_passive_depends')),
				activeDepends: txtToArray(arrResults[i].getValue('custrecordr7acladdon_mod_active_depends')),
				hasAccess: accessChecker.hasAccess({
					all_roles: allRoles,
					roles: roles,
					all_departments: allDepartments,
					departments: departments,
					all_employees: allEmployees,
					employees: employees
				}),
				limitation: null
			};
			
			objSettings.addOns[objAddOn.internalid] = objAddOn;
			
			if (objAddOn.include == 'T' && objAddOn.hasAccess && arrAvailableAddonIds.indexOf(objAddOn.internalid) == -1){
				arrAvailableAddonIds.push(objAddOn.internalid);
			}
		}
	}
	while (arrResults.length >= 1000);
	
	var objAddOnLimits = grabModifyLicenseLimits({
		addOns: arrAvailableAddonIds,
		licenseId: params.licenseId,
		recType: params.recType
	}) || {}; //had trouble running in single search... kept timing out in script
	
	if (objAddOnLimits) {
		for (var id in objSettings.addOns) {
			objSettings.addOns[id].limitation = (objAddOnLimits[id] || null);
		}
	}
	if (rowNum == 0) {
		return null;
	}

	return objSettings;
}

function grabModifyLicenseLimits(params){

	if (!params || !params.addOns || params.addOns.length < 1) {
		return null;
	}
	
	var arrFilters = [];
	arrFilters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
	arrFilters.push(new nlobjSearchFilter('custrecordr7modliclim_addon_component', null, 'anyof', params.addOns));
	
	var arrColumns = [];
	arrColumns.push(new nlobjSearchColumn('internalid').setSort(false));
	arrColumns.push(new nlobjSearchColumn('isinactive'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7modliclim_addon_component'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7modliclim_roles'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7modliclim_allroles'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7modliclim_departments'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7modliclim_alldepartments'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7modliclim_employees'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7modliclim_allemployees'));
	
	arrColumns.push(new nlobjSearchColumn('custrecordr7modliclim_integer_max_val'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7modliclim_integer_max_val_d')); //searchId
	arrColumns.push(new nlobjSearchColumn('custrecordr7modliclim_integer_exist_val')); //searchId
	arrColumns.push(new nlobjSearchColumn('custrecordr7modliclim_date_max_val'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7modliclim_date_max_val_d'));//searchId
	arrColumns.push(new nlobjSearchColumn('custrecordr7modliclim_date_max_days'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7modliclim_date_max_days_d')); //searchId
	arrColumns.push(new nlobjSearchColumn('custrecordr7modliclim_select_operator'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7modliclim_select_values'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7modliclim_select_values_d')); //searchId
	
	var savedsearch = nlapiCreateSearch('customrecordr7modifylicense_addon_limits', arrFilters, arrColumns);
	var resultSet = savedsearch.runSearch();
	
	var objAddOnLimits = {};
	
	var rowNum = 0;
	do {
		var arrResults = resultSet.getResults(rowNum, rowNum + 1000);
		for (var i = 0; arrResults && i < arrResults.length; i++) {
			rowNum++;
			
			//permission fields
			var allRoles = arrResults[i].getValue('custrecordr7modliclim_allroles');
			var allDepartments = arrResults[i].getValue('custrecordr7modliclim_alldepartments');
			var allEmployees = arrResults[i].getValue('custrecordr7modliclim_allemployees');
			var roles = txtToArray(arrResults[i].getValue('custrecordr7modliclim_roles'));
			var departments = txtToArray(arrResults[i].getValue('custrecordr7modliclim_departments'));
			var employees = txtToArray(arrResults[i].getValue('custrecordr7modliclim_employees'));
			
			var accessLevel = accessChecker.getLevel({
				all_roles: allRoles,
				roles: roles,
				all_departments: allDepartments,
				departments: departments,
				all_employees: allEmployees,
				employees: employees
			});
			
			if (accessLevel < 0) {
				// does not apply to current user
				continue;
			}
			
			var addOnId = arrResults[i].getValue('custrecordr7modliclim_addon_component');
			
			if (objAddOnLimits[addOnId] && objAddOnLimits[addOnId].accessLevel > accessLevel) {
				// already have more specific limitation
				continue;
			}
			
			objAddOnLimits[addOnId] = {
				internalid: arrResults[i].getValue('internalid'),
				accessLevel: accessLevel,
				addOnId: arrResults[i].getValue('custrecordr7modliclim_addon_component'),
				integer: {
					maxVal: arrResults[i].getValue('custrecordr7modliclim_integer_max_val'),
					dynamicMaxVal: getLimitationResultFromSearch({
						search: arrResults[i].getValue('custrecordr7modliclim_integer_max_val_d'),
						internalid: params.licenseId,
						recordType: params.recType
					}),
					existingVal: parseFloat(getLimitationResultFromSearch({
						search: arrResults[i].getValue('custrecordr7modliclim_integer_exist_val'),
						internalid: params.licenseId,
						recordType: params.recType
					}) || 0)
				},
				date: {
					maxVal: arrResults[i].getValue('custrecordr7modliclim_date_max_val'),
					dynamicMaxVal: arrResults[i].getValue('custrecordr7modliclim_date_max_val_d'),
					maxDays: arrResults[i].getValue('custrecordr7modliclim_date_max_days'),
					dynamicMaxDays: getLimitationResultFromSearch({
						search: arrResults[i].getValue('custrecordr7modliclim_date_max_days_d'),
						internalid: params.licenseId,
						recordType: params.recType
					})
				},
				select: {
					operator: arrResults[i].getValue('custrecordr7modliclim_select_operator'),
					values: arrResults[i].getValue('custrecordr7modliclim_select_values'),
					dynamicValues: getLimitationResultFromSearch({
						search: arrResults[i].getValue('custrecordr7modliclim_select_values_d'),
						internalid: params.licenseId,
						recordType: params.recType
					})
				}
			};
		}
	}
	while (arrResults.length >= 1000);
	
	if (rowNum == 0) {
		return null;
	}
	
	return objAddOnLimits;
}

var objSearchResults = {};
function getLimitationResultFromSearch(params){

	if (!params || !params.search || !params.recordType || !params.internalid) {
		return null;
	}
	
	var identifier = params.search + '|' + params.internalid;
	if (objSearchResults.hasOwnProperty(identifier)) {
		return objSearchResults[identifier];
	}
	
	var arrFilters = [];
	arrFilters.push(new nlobjSearchFilter('internalid', null, 'anyof', params.internalid));
	
	var arrResults = nlapiSearchRecord(params.recordType, params.search, arrFilters);
	
	var value = '';
	if (arrResults && arrResults.length > 0) {
		var arrColumns = arrResults[0].getAllColumns();
		value = arrResults[0].getValue(arrColumns[0]);
	}
	objSearchResults[identifier] = value;
	return objSearchResults[identifier];
}

var accessChecker = (function(){

	var departmentId = nlapiGetDepartment();
	var roleId = nlapiGetRole(); // -31 is returned if a user cannot be properly identified by NetSuite
	var userId = nlapiGetUser(); //-4 is returned if a user cannot be properly identified by NetSuite.
	
	function hasAccess(params){
		return (getLevel(params) >= 0);
	}
	
	function getLevel(params){
	
		if (!params) {
			return -1;
		}
		
		// Check if user is permitted access
		if (params.employees.indexOf(userId) != -1 || params.employees.indexOf(userId.toString()) != -1) {
			return 6;
		}
		
		// Check if role is permitted access
		if (params.roles.indexOf(roleId) != -1 || params.roles.indexOf(roleId.toString()) != -1) {
			return 5;
		}
		
		// Check if department is permitted access
		if (params.departments.indexOf(departmentId) != -1 || params.departments.indexOf(departmentId.toString()) != -1) {
			return 4;
		}
		
		// Check if all employees is permitted access
		if (params.all_employees == 'T' && userId != -4) {
			return 3;
		}
		
		// Check if all departments
		if (params.all_departments == 'T' && parseInt(departmentId || -1) > 0) {
			return 2;
		}
		
		// Check if all roles is permitted access
		if (params.all_roles == 'T' && roleId != -31) {
			return 1;
		}
		
		return -1;
	}
	
	return {
		hasAccess: hasAccess,
		getLevel: getLevel
	};

})();

var lfmUtils = (function(){

	var lfmsLoaded = false;
	var arrLFMs = [];
	
	function hasDupeFMR(params){
	
		if (params.addOn && params.productKey && params.value && params.endDate) {
		
			if (!lfmsLoaded) {
				getLicenseLFMs({
					productKey: params.productKey,
					recordType: params.recACRProductType.getFieldValue('custrecordr7acrrecordid')
				});
			}
			
			if (params.fieldType == 'integer') {
				return false;
			}
			//checking for duplicate non-integer addons (integers get added so duplicates CAN be okay)
			for (var i = 0; arrLFMs && i < arrLFMs.length; i++) {
				if (params.addOn == arrLFMs[i].feature &&
				params.value == arrLFMs[i].value &&
				arrLFMs[i].startdate &&
				nlapiStringToDate(arrLFMs[i].startdate) <= nlapiStringToDate(nlapiDateToString(new Date())) &&
				arrLFMs[i].enddate &&
				nlapiStringToDate(params.endDate) >= nlapiStringToDate(arrLFMs[i].enddate) &&
				['4', '7', '8', '9'].indexOf((arrLFMs[i].status || '').toString() == -1)) {
					return true;
				}
			}
			
		}
		
		return false;
	}
	
	function createFMR(params){
	
		if (!params.recACRProductType || !params.addOn || !params.productKey || !params.value || !params.endDate) {
			return;
		}
		
		if (hasDupeFMR({
			recACRProductType: params.recACRProductType,
			addOn: params.addOn,
			fieldType: params.fieldType,
			productKey: params.productKey,
			value: params.value,
			endDate: params.endDate
		})) {
			//already has one
			return false;
		}
		
		if (params.fieldType == 'date') {
			params.value = params.endDate;
		}
		
		var newFMRRecord = nlapiCreateRecord('customrecordr7licensefeaturemanagement');
		newFMRRecord.setFieldValue('custrecordr7licfmfeature', params.addOn);
		newFMRRecord.setFieldValue('custrecordr7licfmvalue', params.value);
		newFMRRecord.setFieldValue('custrecordr7licfmstartdate', nlapiDateToString(new Date()));
		newFMRRecord.setFieldValue('custrecordr7licfmenddate', params.endDate);
		newFMRRecord.setFieldValue('custrecordr7licfmproductkey', params.productKey);
		newFMRRecord.setFieldValue(params.recACRProductType.getFieldValue('custrecordr7acrfeaturemngreclinkfieldid'), params.licenseId);
		newFMRRecord.setFieldValue('custrecordr7licfmstatus', 3);
		newFMRRecord.setFieldValue('custrecordr7licfmgrace', 'T');
		
		try {
			nlapiSubmitRecord(newFMRRecord, true, true);
		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'Could not FMR from suitelet', 'AddOnId: ' + params.addOn + '\n\nError:' + e);
		}
		
		return true;
	}
	
	function extendLicenseExpiration(licenseId, recACRProductType, endDateFMR){
	
		var recLicense = nlapiLoadRecord(recACRProductType.getFieldValue('custrecordr7acrrecordid'), licenseId);
		var currentExpirationDate = recLicense.getFieldValue(recACRProductType.getFieldValue('custrecordr7acrexpirationfieldid')) || nlapiDateToString(new Date());
		
		if (nlapiStringToDate(endDateFMR) <= nlapiStringToDate(currentExpirationDate)) {
			//only if expiration is after current
			return;
		}
		
		var startDateFMR = nlapiDateToString(new Date());
		if (currentExpirationDate && nlapiStringToDate(currentExpirationDate) >= nlapiStringToDate(nlapiDateToString(new Date()))) {
			startDateFMR = nlapiDateToString(nlapiAddDays(nlapiStringToDate(currentExpirationDate), 1));
		}
		
		var arrFilters = [];
		arrFilters.push(new nlobjSearchFilter('formulatext', null, 'is', recLicense.getRecordType()).setFormula("{custrecordr7aclrecord_internalid}"));
		arrFilters.push(new nlobjSearchFilter('custrecordr7acladdon_fieldid', null, 'isnot', 'id'));
		arrFilters.push(new nlobjSearchFilter('custrecordr7acladdon_value', null, 'noneof', [7, 8])); // No Change addon values
		
		var arrColumns = [];
		arrColumns.push(new nlobjSearchColumn('internalid'));
		arrColumns.push(new nlobjSearchColumn('custrecordr7acladdon_fieldid'));
		arrColumns.push(new nlobjSearchColumn('custrecordr7acladdon_fieldtype'));
		arrColumns.push(new nlobjSearchColumn('custrecordr7acladdon_value'));
		arrColumns.push(new nlobjSearchColumn('custrecordr7acladdon_specificvalue'));
		
		var arrResults = nlapiSearchRecord('customrecordr7acladdoncomponents', null, arrFilters, arrColumns);
		
		var allFields = recLicense.getAllFields();
		
		for (var i = 0; arrResults && i < arrResults.length; i++) {
		
			var addOnId = arrResults[i].getValue('internalid');
			var fieldId = arrResults[i].getValue('custrecordr7acladdon_fieldid');
			var fieldType = arrResults[i].getValue('custrecordr7acladdon_fieldtype');
			var specificValue = arrResults[i].getValue('custrecordr7acladdon_specificvalue');
			
			var createAddOn = false;
			var fieldValue = '';
			if (allFields.indexOf(fieldId) != -1) {
				fieldValue = recLicense.getFieldValue(fieldId);
				
				if (fieldType == 'date' || fieldType == 'integer') {
					if (!specificValue && fieldValue) {
						createAddOn = true;
					}
				}
				else 
					if (specificValue && fieldValue == specificValue && fieldValue != 'F') {
						createAddOn = true;
					}
					else 
						if (!specificValue && fieldType == 'select') {
							createAddOn = true;
						}
			}
			
			if (createAddOn) {
				nlapiLogExecution('DEBUG', 'creating add on', fieldId);
				
				//Remove field from allFields to prevent duplicate FMR
				allFields.splice(allFields.indexOf(fieldId), 1);
				
				if (fieldType == 'date') {
					fieldValue = endDateFMR;
					startDateFMR = nlapiDateToString(new Date());
				}
				
				var newFMRRecord = nlapiCreateRecord('customrecordr7licensefeaturemanagement');
				newFMRRecord.setFieldValue('custrecordr7licfmfeature', addOnId);
				newFMRRecord.setFieldValue('custrecordr7licfmvalue', fieldValue);
				newFMRRecord.setFieldValue('custrecordr7licfmsalesorder', recLicense.getFieldValue(recACRProductType.getFieldValue('custrecordr7acrsalesorderfieldid')));
				newFMRRecord.setFieldValue('custrecordr7licfmstartdate', startDateFMR);
				newFMRRecord.setFieldValue('custrecordr7licfmenddate', endDateFMR);
				newFMRRecord.setFieldValue('custrecordr7licfmproductkey', recLicense.getFieldValue(recACRProductType.getFieldValue('custrecordr7acractivationid')));
				newFMRRecord.setFieldValue('custrecordr7licfmstatus', 3);
				newFMRRecord.setFieldValue('custrecordr7licfmaclcreated', 'T');
				newFMRRecord.setFieldValue('custrecordr7licfmlicense', recLicense.getId());
				newFMRRecord.setFieldValue(recACRProductType.getFieldValue('custrecordr7acrfeaturemngreclinkfieldid'), recLicense.getId());
				newFMRRecord.setFieldValue('custrecordr7licfmgrace', 'T');
				
				try {
					nlapiSubmitRecord(newFMRRecord, true, true);
				} 
				catch (e) {
					nlapiLogExecution('ERROR', 'Could not create built-in FMR', 'AddOnId: ' + addOnId + '\nSalesOrder: ' + recLicense.getFieldValue(recACRProductType.getFieldValue('custrecordr7acrsalesorderfieldid')) + '\n\nError:' + e);
				}
			}
		}
	}
	
	function scrapeLicenseRecord(licenseId, recACRProductType, actualExpiration){
	
		var recLicense = nlapiLoadRecord(recACRProductType.getFieldValue('custrecordr7acrrecordid'), licenseId);

		var endDateFMR = recLicense.getFieldValue(recACRProductType.getFieldValue('custrecordr7acrexpirationfieldid')) || nlapiDateToString(new Date());

		if (actualExpiration && nlapiStringToDate(actualExpiration) > nlapiStringToDate(endDateFMR)) {
			endDateFMR = actualExpiration;
		}

		var arrFilters = [];
		arrFilters.push(new nlobjSearchFilter('formulatext', null, 'is', recLicense.getRecordType()).setFormula("{custrecordr7aclrecord_internalid}"));
		arrFilters.push(new nlobjSearchFilter('custrecordr7acladdon_fieldid', null, 'isnot', 'id'));
		arrFilters.push(new nlobjSearchFilter('custrecordr7acladdon_value', null, 'noneof', [7, 8])); // No Change addon values
		
		var arrColumns = [];
		arrColumns.push(new nlobjSearchColumn('internalid'));
		arrColumns.push(new nlobjSearchColumn('custrecordr7acladdon_fieldid'));
		arrColumns.push(new nlobjSearchColumn('custrecordr7acladdon_fieldtype'));
		arrColumns.push(new nlobjSearchColumn('custrecordr7acladdon_value'));
		arrColumns.push(new nlobjSearchColumn('custrecordr7acladdon_specificvalue'));
		
		var arrResults = nlapiSearchRecord('customrecordr7acladdoncomponents', null, arrFilters, arrColumns);
		
		var allFields = recLicense.getAllFields();
		
		for (var i = 0; arrResults && i < arrResults.length; i++) {
		
			var addOnId = arrResults[i].getValue('internalid');
			var fieldId = arrResults[i].getValue('custrecordr7acladdon_fieldid');
			var fieldType = arrResults[i].getValue('custrecordr7acladdon_fieldtype');
			var specificValue = arrResults[i].getValue('custrecordr7acladdon_specificvalue');
			
			var createAddOn = false;
			var fieldValue = '';
			if (allFields.indexOf(fieldId) != -1) {
				fieldValue = recLicense.getFieldValue(fieldId);
				
				if (fieldType == 'date' || fieldType == 'integer') {
					if (!specificValue && fieldValue) {
						createAddOn = true;
					}
				}
				else 
					if (specificValue && fieldValue == specificValue && fieldValue != 'F') {
						createAddOn = true;
					}
					else 
						if (!specificValue && fieldType == 'select') {
							createAddOn = true;
						}
			}
			
			if (createAddOn) {

				//Remove field from allFields to prevent duplicate FMR
				allFields.splice(allFields.indexOf(fieldId), 1);
				
				var newFMRRecord = nlapiCreateRecord('customrecordr7licensefeaturemanagement');
				newFMRRecord.setFieldValue('custrecordr7licfmfeature', addOnId);
				newFMRRecord.setFieldValue('custrecordr7licfmvalue', fieldValue);
				newFMRRecord.setFieldValue('custrecordr7licfmsalesorder', recLicense.getFieldValue(recACRProductType.getFieldValue('custrecordr7acrsalesorderfieldid')));
				newFMRRecord.setFieldValue('custrecordr7licfmstartdate', nlapiDateToString(now));
				newFMRRecord.setFieldValue('custrecordr7licfmenddate', endDateFMR);
				newFMRRecord.setFieldValue('custrecordr7licfmproductkey', recLicense.getFieldValue(recACRProductType.getFieldValue('custrecordr7acractivationid')));
				newFMRRecord.setFieldValue('custrecordr7licfmstatus', 3);
				newFMRRecord.setFieldValue('custrecordr7licfmaclcreated', 'T');
				newFMRRecord.setFieldValue('custrecordr7licfmlicense', recLicense.getId());
				newFMRRecord.setFieldValue(recACRProductType.getFieldValue('custrecordr7acrfeaturemngreclinkfieldid'), recLicense.getId());
				newFMRRecord.setFieldValue('custrecordr7licfmgrace', 'F');
				
				try {
					nlapiSubmitRecord(newFMRRecord);
				} 
				catch (e) {
					nlapiLogExecution('ERROR', 'Could not create built-in FMR - scrape license', 'AddOnId: ' + addOnId  + '\n\nError:' + e);
				}
			}
		}
	}
	
	/*
	 * Load all the LFMS for given license
	 * @method getLicenseLFMs
	 * @param.productKey {String} productKey
	 * @param.recordType {String} recordType
	 */
	function getLicenseLFMs(params){
	
		if (lfmsLoaded) {
			return arrLFMs;
		}
		
		if (!params) {
			throw nlapiCreateError('MISSING_REQ_ARG', 'params');
		}
		
		if (!params.productKey || !params.recordType) {
			throw nlapiCreateError('MISSING_REQ_ARG', 'license');
		}
		
		var arrFilters = [];
		arrFilters.push(new nlobjSearchFilter('custrecordr7licfmproductkey', null, 'is', params.productKey));
		arrFilters.push(new nlobjSearchFilter('custrecordr7licfmrecordtypeid', null, 'is', params.recordType));
		arrFilters.push(new nlobjSearchFilter('custrecordr7licfmstatus', null, 'noneof', [7, 8, 9])); //Expired-Manual, Suspended, On Hold
		var arrColumns = [];
		arrColumns.push(new nlobjSearchColumn('internalid'));
		arrColumns.push(new nlobjSearchColumn('custrecordr7licfmproductkey'));
		arrColumns.push(new nlobjSearchColumn('custrecordr7licfmrecordtypeid'));
		arrColumns.push(new nlobjSearchColumn('custrecordr7licfmfeaturefieldtype'));
		arrColumns.push(new nlobjSearchColumn('custrecordr7licfmfeature'));
		arrColumns.push(new nlobjSearchColumn('custrecordr7licfmgrace'));
		arrColumns.push(new nlobjSearchColumn('custrecordr7licfmaclcreated'));
		arrColumns.push(new nlobjSearchColumn('custrecordr7licfmvalue'));
		arrColumns.push(new nlobjSearchColumn('custrecordr7licfmstatus'));
		arrColumns.push(new nlobjSearchColumn('custrecordr7licfmstartdate'));
		arrColumns.push(new nlobjSearchColumn('custrecordr7licfmenddate'));
		
		var arrResults = nlapiSearchRecord('customrecordr7licensefeaturemanagement', null, arrFilters, arrColumns);
		
		for (var i = 0; arrResults && i < arrResults.length; i++) {
		
			arrLFMs.push({
				internalid: arrResults[i].getValue('internalid'),
				productkey: arrResults[i].getValue('custrecordr7licfmproductkey'),
				recordtypeid: arrResults[i].getText('custrecordr7licfmrecordtypeid'),
				fieldType: arrResults[i].getValue('custrecordr7licfmfeaturefieldtype'),
				feature: arrResults[i].getValue('custrecordr7licfmfeature'),
				grace: arrResults[i].getValue('custrecordr7licfmgrace'),
				aclcreated: arrResults[i].getValue('custrecordr7licfmaclcreated'),
				value: arrResults[i].getValue('custrecordr7licfmvalue'),
				status: arrResults[i].getValue('custrecordr7licfmstatus'),
				startdate: arrResults[i].getValue('custrecordr7licfmstartdate'),
				enddate: arrResults[i].getValue('custrecordr7licfmenddate')
			});
		}
		
		lfmsLoaded = true;
		return arrLFMs;
	}
	
	function getMaxEndDateLFM(params){
	
		if (!params) {
			throw nlapiCreateError('MISSING_REQ_ARG', 'params');
		}
		
		if (!params.productKey || !params.recordType || !params.fieldId) {
			throw nlapiCreateError('MISSING_REQ_ARG', 'license');
		}
		
		if (!lfmsLoaded) {
			getLicenseLFMs(params);
		}
		
		var dtMaxEnd = null;
		for (var i = 0; arrLFMs && i < arrLFMs.length; i++) {
		
			if (arrLFMs[i].fieldId = params.fieldId && (arrLFMs[i].grace == 'F' || params.includeGrace)) {
				var currentEnd = arrLFMs[i].enddate;
				if (currentEnd) {
					var dtCurrentEnd = nlapiStringToDate(currentEnd);
					if (!dtMaxEnd || dtCurrentEnd > dtMaxEnd) {
						dtMaxEnd = dtCurrentEnd;
					}
				}
			}
		}
		
		return (dtMaxEnd) ? nlapiDateToString(dtMaxEnd) : null;
	}
	
	function processEverything(params){

		var activationId = params.recLicense.getFieldValue(params.recACRProductType.getFieldValue('custrecordr7acractivationid'));

		params.recLicense.setFieldValue(params.recACRProductType.getFieldValue('custrecordr7acrfeaturemngcreatedfieldid'), 'T');
		
		params.recLicense = freshenUpLicense(params.recLicense);
		params.recLicense = processLicense(params.recLicense, params.recACRProductType);
		
		try {
		
			var expirationDate = params.recLicense.getFieldValue(params.recACRProductType.getFieldValue('custrecordr7acrexpirationfieldid'));
			
			if (nlapiStringToDate(expirationDate) > nlapiStringToDate(nlapiDateToString(new Date()))) {
				nlapiSubmitRecord(params.recLicense);
			}
			else if (params.actualExpirationDate) {
				var recLicense2 = nlapiLoadRecord(params.recLicense.getRecordType(), params.recLicense.getId());
				recLicense2.setFieldValue(params.recACRProductType.getFieldValue('custrecordr7acrexpirationfieldid'), params.actualExpirationDate);
				nlapiSubmitRecord(recLicense2);
			}
			
			markFMRsProcessed(params.recLicense.getRecordType(), activationId, true);
		} 
		catch (e) {
			nlapiLogExecution('ERROR', 'Could not process license', 'RecType: ' + params.recLicense.getRecordType() + '\nLicenseId: ' + params.recLicense.getId() + '\n' + e);
			markFMRsProcessed(params.recLicense.getRecordType(), activationId, false, e);
		}
		
	}
	
	function markFMRsProcessed(recordType, activationId, success, error){
	
		if (success) {
			// expire enddate prior to today
			var arrFilters = [];
			arrFilters[0] = new nlobjSearchFilter('custrecordr7licfmrecordtypeid', null, 'is', recordType);
			arrFilters[1] = new nlobjSearchFilter('custrecordr7licfmproductkey', null, 'is', activationId);
			arrFilters[2] = new nlobjSearchFilter('custrecordr7licfmenddate', null, 'before', 'today');
			arrFilters[3] = new nlobjSearchFilter('custrecordr7licfmstatus', null, 'noneof', 4);
			
			var arrResults = nlapiSearchRecord('customrecordr7licensefeaturemanagement', null, arrFilters);
			
			for (var i = 0; arrResults && i < arrResults.length; i++) {
				nlapiSubmitField('customrecordr7licensefeaturemanagement', arrResults[i].getId(), 'custrecordr7licfmstatus', 4);
			}
			
			// mark active anything within dates 
			
			var arrFilters = [];
			arrFilters[0] = new nlobjSearchFilter('custrecordr7licfmrecordtypeid', null, 'is', recordType);
			arrFilters[1] = new nlobjSearchFilter('custrecordr7licfmproductkey', null, 'is', activationId);
			arrFilters[2] = new nlobjSearchFilter('custrecordr7licfmstartdate', null, 'onorbefore', 'today');
			arrFilters[3] = new nlobjSearchFilter('custrecordr7licfmenddate', null, 'onorafter', 'today');
			arrFilters[4] = new nlobjSearchFilter('custrecordr7licfmstatus', null, 'noneof', new Array(7, 8, 9));
			
			var arrResults = nlapiSearchRecord('customrecordr7licensefeaturemanagement', null, arrFilters);
			
			for (var i = 0; arrResults && i < arrResults.length; i++) {
				nlapiSubmitField('customrecordr7licensefeaturemanagement', arrResults[i].getId(), 'custrecordr7licfmstatus', 3);
			}
		}
		else {
		
			var arrFilters = [];
			arrFilters[0] = new nlobjSearchFilter('custrecordr7licfmrecordtypeid', null, 'is', recordType);
			arrFilters[1] = new nlobjSearchFilter('custrecordr7licfmproductkey', null, 'is', activationId);
			arrFilters[2] = new nlobjSearchFilter('custrecordr7licfmenddate', null, 'before', 'today');
			arrFilters[3] = new nlobjSearchFilter('custrecordr7licfmstatus', null, 'anyof', new Array(1, 2, 3));
			
			var arrResults = nlapiSearchRecord('customrecordr7licensefeaturemanagement', null, arrFilters);
			
			for (var i = 0; arrResults && i < arrResults.length; i++) {
				nlapiSubmitField('customrecordr7licensefeaturemanagement', arrResults[i].getId(), 'custrecordr7licfmstatus', 6);
			}
			
			var arrFilters = [];
			arrFilters[0] = new nlobjSearchFilter('custrecordr7licfmrecordtypeid', null, 'is', recordType);
			arrFilters[1] = new nlobjSearchFilter('custrecordr7licfmproductkey', null, 'is', activationId);
			arrFilters[2] = new nlobjSearchFilter('custrecordr7licfmstartdate', null, 'onorbefore', 'today');
			arrFilters[3] = new nlobjSearchFilter('custrecordr7licfmenddate', null, 'onorafter', 'today');
			arrFilters[4] = new nlobjSearchFilter('custrecordr7licfmstatus', null, 'noneof', new Array(3, 7, 8, 9));
			
			var arrResults = nlapiSearchRecord('customrecordr7licensefeaturemanagement', null, arrFilters);
			
			var errorText = 'Code: ' + error.name + '<br>Details: ' + error.message;
			
			for (var i = 0; arrResults && i < arrResults.length; i++) {

				var fields = [];
				fields[0] = 'custrecordr7licfmerrortext';
				fields[1] = 'custrecordr7licfmstatus';
				
				var values = [];
				values[0] = errorText;
				values[1] = 6;
				
				nlapiSubmitField('customrecordr7licensefeaturemanagement', arrResults[i].getId(), fields, values);
			}
		}
	}
	
	function processLicense(recLicense, recACRProductType){

		var activationId = recLicense.getFieldValue(recACRProductType.getFieldValue('custrecordr7acractivationid'));
		
		var arrFilters = [];
		arrFilters.push(new nlobjSearchFilter('custrecordr7licfmrecordtypeid', null, 'is', recACRProductType.getFieldValue('custrecordr7acrrecordid')));
		arrFilters.push( new nlobjSearchFilter('custrecordr7licfmproductkey', null, 'is', activationId));
		arrFilters.push(new nlobjSearchFilter('custrecordr7licfmstartdate', null, 'onorbefore', 'today'));
		arrFilters.push(new nlobjSearchFilter('custrecordr7licfmenddate', null, 'onorafter', 'today'));
		arrFilters.push(new nlobjSearchFilter('custrecordr7licfmstatus', null, 'noneof', [7, 8, 9]));
		
		var arrColumns = [];
		arrColumns.push(new nlobjSearchColumn('custrecordr7licfmfeildid'));
		arrColumns.push(new nlobjSearchColumn('custrecordr7licfmfeaturefieldtype'));
		arrColumns.push(new nlobjSearchColumn('custrecordr7licfmvalue'));
		arrColumns.push(new nlobjSearchColumn('custrecordr7licfmenddate'));
		arrColumns.push(new nlobjSearchColumn('custrecordr7licfmsalesorder'));
		arrColumns.push(new nlobjSearchColumn('custrecordr7licfmgrace'));
		arrColumns.push(new nlobjSearchColumn('created').setSort(false));
		
		//all FMR's ever tied to that license
		var arrResults = nlapiSearchRecord('customrecordr7licensefeaturemanagement', null, arrFilters, arrColumns);
		var disabledFields = [];
		for (var i = 0; arrResults && i < arrResults.length; i++) {

			var fieldId = arrResults[i].getValue('custrecordr7licfmfeildid');
			
			var fieldType = arrResults[i].getValue('custrecordr7licfmfeaturefieldtype');
			var fmrValue = arrResults[i].getValue('custrecordr7licfmvalue');
			var fmrEndDate = arrResults[i].getValue('custrecordr7licfmenddate');
			var currentValue = recLicense.getFieldValue(fieldId);
			var isGrace = arrResults[i].getValue('custrecordr7licfmgrace');
			var salesOrderId = arrResults[i].getValue('custrecordr7licfmsalesorder');
			
			if (fieldType == 'checkbox' && fmrValue == 'r7disable') {
				disabledFields.push(fieldId);
			}
			
			if (fieldType == 'date') {
				fmrValue = fmrEndDate;
			}
			
			var newValue = (disabledFields.indexOf(fieldId) != -1) ? 'F' : determineNewFieldValue(currentValue, fmrValue, fieldType);

			recLicense.setFieldValue(fieldId, newValue);
			
			if (fieldType == 'date' && isGrace == 'F' && salesOrderId) {
				recLicense.setFieldValue(recACRProductType.getFieldValue('custrecordr7acrsalesorderfieldid'), salesOrderId);
			}
			
		}
		
		if ((recACRProductType.getFieldValue('custrecordr7acrrecordid') == 'customrecordr7nexposelicensing') && !recLicense.getFieldValue('custrecordr7nxnumberengines')) {
			recLicense.setFieldValue('custrecordr7nxnumberengines', 1);
		}
		
		return recLicense;
	}
	
	function determineNewFieldValue(currentValue, fmrValue, fieldType){
	
		var newValue = '';
		
		switch (fieldType) {
			case 'checkbox':
				if (fmrValue == 'T') {
					newValue = fmrValue;
				}
				else {
					newValue = currentValue;
				}
				break;
			case 'date':
				if (!currentValue || nlapiStringToDate(fmrValue) > nlapiStringToDate(currentValue)) {
					newValue = fmrValue;
				}
				else {
					newValue = currentValue;
				}
				break;
			case 'integer':
				if (!currentValue) {
					if (fmrValue) {
						newValue = parseInt(fmrValue);
					}
					else {
						newValue = '';
					}
				}
				else 
					if (fmrValue) {
						newValue = parseInt(currentValue) + parseInt(fmrValue);
					}
					else {
						newValue = currentValue;
						
					}
				break;
			case 'select':
				newValue = fmrValue;
				break;
			case 'text':
				newValue = fmrValue;
				break;
			case 'multiselect':
				newValue = fmrValue;
				break;
			default:
				newValue = fmrValue;
		}
		
		return newValue;
		
	}
	
	function freshenUpLicense(recLicense){
	
		var arrFilters = [];
		arrFilters.push(new nlobjSearchFilter('formulatext', null, 'is', recLicense.getRecordType()).setFormula("{custrecordr7aclrecord_internalid}"));
		arrFilters.push(new nlobjSearchFilter('custrecordr7acladdon_fieldid', null, 'isnot', 'id'));
		arrFilters.push(new nlobjSearchFilter('custrecordr7acladdon_fieldtype', null, 'isnot', 'select')); // we dont disable selects
		arrFilters.push(new nlobjSearchFilter('custrecordr7acladdon_value', null, 'noneof', 7));
		
		var arrColumns = [];
		arrColumns.push(new nlobjSearchColumn('custrecordr7acladdon_fieldid', null, 'group'));
		arrColumns.push(new nlobjSearchColumn('custrecordr7acladdon_fieldtype', null, 'max'));
		
		//all FMR's ever tied to that license
		var arrResults = nlapiSearchRecord('customrecordr7acladdoncomponents', null, arrFilters, arrColumns);
		
		for (var i = 0; arrResults && i < arrResults.length; i++) {
			var fieldId = arrResults[i].getValue('custrecordr7acladdon_fieldid', null, 'group');
			var fieldType = arrResults[i].getValue('custrecordr7acladdon_fieldtype', null, 'max');
			recLicense.setFieldValue(fieldId, howToDisableField(fieldType));
		}
		
		return recLicense;
	}
	
	function howToDisableField(fieldType){
	
		var result = '';
		
		switch (fieldType) {
			case 'checkbox':
				result = 'F';
				break;
			case 'date':
				result = nlapiDateToString(new Date());
				break;
			default:
				result = '';
		}
		
		return result;
	}

	return {
		getMaxEndDateLFM: getMaxEndDateLFM,
		createFMR: createFMR,
		extendLicenseExpiration: extendLicenseExpiration,
		scrapeLicenseRecord: scrapeLicenseRecord,
		processEverything: processEverything
	};
	
})();



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

function txtToArray(val){
	return (val == null || val === '') ? [] : val.split(',');
}