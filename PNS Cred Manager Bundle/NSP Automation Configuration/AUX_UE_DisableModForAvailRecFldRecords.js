/**
 * User Event script deployed to NSP Available Sync Records and NSP Available Sync Fields 
 * that disables ability to create and modify records.
 * This is set by Audaxium.
 * 
 * Version    Date            Author           Remarks
 * 1.00       22 Jul 2013     AnJoe
 *
 */

/**
 * Applies to  
 * @appliedtorecord recordType
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
function disableModOnLoad(type, form, request){

	//Disable record creation if Account being used in is NOT Audaxium App Account.
	log('debug','type',nlapiGetRecordType());
	if (nlapiGetContext().getCompany() != 'TSTDRV546898' && type != 'view') {
		var errMsg = type.toLocaleUpperCase()+' action on this Record is disabled.';
		
		throw nlapiCreateError('RECORD_MOD_DISABLED', errMsg, true);
	}	
}
