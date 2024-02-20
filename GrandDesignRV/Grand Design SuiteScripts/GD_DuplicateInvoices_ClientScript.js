/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       10 09 2017 	Meghan N Gerke
 *
 */

/**
 * 
 * @returns {Boolean} True to continue save, false to abort save
 */
function GD_DuplicateInvoices_SaveRecord(){
	var vendorId = nlapiGetFieldValue('entity') || '';
	var tranId = nlapiGetFieldValue('tranid') || '';
	if (vendorId != '' && tranId != '') {
		//search over Vendors with transactions IDs
		var filters = new Array();
		filters[filters.length] = new nlobjSearchFilter('mainline',null ,'is', 'T');
		filters[filters.length] = new nlobjSearchFilter('entity',null ,'is', vendorId);
		filters[filters.length] = new nlobjSearchFilter('tranid',null ,'is', nlapiGetFieldValue('tranid'));
		var currRecordId = nlapiGetRecordId();
		
		if (currRecordId != null && currRecordId != ''){
			filters[filters.length] = new nlobjSearchFilter('internalid',null ,'noneof', currRecordId);
		}
		
		var results = nlapiSearchRecord('vendorbill', null, filters);
		
		//if the vendor already has a record linked to this reference number do not let save and throw error
		if (results != null){
			alert("This transaction has already been used with this Vendor. Please change the transaction before saving this record.");
			return false;
		}
	}
	
	//If the vendor does not link with an old record and doesn't match, 
	//If we didn't find anything wrong, let them save.
	return true;
}

/**
 * Name: PageInit
 * Description: set field to disabled on edit/create/copy.
 * 
 * @param {String} type Access mode: create, copy, edit
 * @returns {Void}
 */
function GD_Bill_PageInit(type)
{	
	if (type == 'create' || type == 'edit' || type == 'copy')
	{
		//We are doing this here because these fields are used by the DocuPeak integration and needs to be 
		// diplayed as 'normal' for the webservices to set values on these fields.  Users still should not 
		// have access to these fields on edit/create, so they are set to disabled here.
		nlapiSetFieldDisabled('custbodypolocatincode', true);
		nlapiSetFieldDisabled('custbodygd_purchaseordertranid', true);
	}
}