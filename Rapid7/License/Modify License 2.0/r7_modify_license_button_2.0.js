/*
 * @author efagone
 */

function r7_beforeLoad(type, form){

	if (type == 'view') {
		form.setScript('customscriptr7_modify_license_suitelet_c');
		
		var acrProductType = getACRProductType({
			recordType: nlapiGetRecordType()
		});
		
		if (!acrProductType || !acrProductType.modifyLicenseFeatureId) {
			return;
		}
		
		if (!acrProductType.featureManagementCreatedFieldId || nlapiGetFieldValue(acrProductType.featureManagementCreatedFieldId) == 'T') {
		
			if (userHasPermission(acrProductType.modifyLicenseFeatureId)
			&& ((nlapiGetFieldValue('custrecordr7nxlicenseconsoleselfservice') === 'F'
			|| 	nlapiGetFieldValue('custrecordr7nxlicense_nosendserver') === 'T') 
			|| (nlapiGetFieldValue('custrecordr7nxlicenseconsoleselfservice') === 'T'
			&& nlapiGetFieldValue('custrecordr7nxlicense_parentlicense') == null))) {
				//if (nlapiGetFieldValue('custrecordr7nxordertype') != 7) { //TODO
				
				var suiteletURL = nlapiResolveURL('SUITELET', 'customscriptr7_modify_license_suitelet', 'customdeployr7_modify_license_suitelet', false);
				suiteletURL += '&custparam_acrid=' + acrProductType.internalid;
				suiteletURL += '&custparam_licenseid=' + nlapiGetRecordId();
				form.addButton('custpage_modify_license_2', 'Modify/Reset License 2.0', 'zc_windowUtils.replaceWindow(\'' + suiteletURL + '\');');
			}
		}
	}
}

function getACRProductType(params){

	if (!params) {
		throw nlapiCreateError('MISSING_REQ_ARG', 'params');
	}
	
	if (!params.recordType) {
		throw nlapiCreateError('MISSING_REQ_ARG', 'recordType');
	}
	
	var arrFilters = [];
	arrFilters.push(new nlobjSearchFilter('custrecordr7acrrecordid', null, 'is', params.recordType));
	arrFilters.push(new nlobjSearchFilter('custrecordr7acr_modify_license_feat_id', null, 'isnotempty'));
	
	var arrColumns = [];
	arrColumns.push(new nlobjSearchColumn('internalid'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7acr_modify_license_feat_id'));
	arrColumns.push(new nlobjSearchColumn('custrecordr7acrfeaturemngcreatedfieldid'));
	
	var arrResults = nlapiSearchRecord('customrecordr7acrproducttype', null, arrFilters, arrColumns);
	
	for (var i = 0; arrResults && i < arrResults.length; i++) {
		return {
			internalid: arrResults[i].getValue('internalid'),
			modifyLicenseFeatureId: arrResults[i].getValue('custrecordr7acr_modify_license_feat_id'),
			featureManagementCreatedFieldId: arrResults[i].getValue('custrecordr7acrfeaturemngcreatedfieldid')
		};
	}
	
	return null;
}