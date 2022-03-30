/**
 * Validate Uniqueness of zipcode on AUX:Territory Zipcodes (customrecord_aux_territoryzips) record
 * 
 * Version    Date            Author           Remarks
 * 1.00       19 Dec 2013     Audaxium
 *
 */

/**
 * The recordType (internal id) corresponds to AUX:Territory Zipcodes (customrecord_aux_territoryzips) record 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */
function territoryZipBeforeSubmit(type){

	try {
		
		log('debug','context',nlapiGetContext().getExecutionContext());
		
		//validate to make sure Zipcode is unique as long as it's not being deleted
		if (type != 'delete') {
			
			//check to see if we need to check for uniqueness of zipcode
			var validateUniqueZip = false;
			var originalZip = '';
			if (nlapiGetOldRecord()) {
				originalZip = nlapiGetOldRecord().getFieldValue('custrecord_auxtz_zipcode');
			}
			var newZip = nlapiGetNewRecord().getFieldValue('custrecord_auxtz_zipcode');
			
			//when create, always check for uniqueness of zipcode.
			//OR
			//edit or xedit, when original and new zipcode doesn't match, execute uniqueness on newZip code.
			//**when xedit, if field being changed is zipcode, it will always have value
			
			if (type == 'create' || (newZip && originalZip != newZip)) {
				validateUniqueZip = true;
			}
			
			if (validateUniqueZip) {
				log('debug','Type//Zip',type+' // '+newZip);
				var tzflt = [new nlobjSearchFilter('custrecord_auxtz_zipcode', null, 'is', newZip),
				             new nlobjSearchFilter('isinactive', null, 'is','F')];
				var tzcol = [new nlobjSearchColumn('name')];
				var tzrs = nlapiSearchRecord('customrecord_aux_territoryzips', null, tzflt, tzcol);
				
				if (tzrs && tzrs.length > 0) {
					throw nlapiCreateError('TERRITORY_DUP_ZIP', newZip+' Already Exists', true);
				}
			}
			
			//1/25/2014 - Update Name field so that it shows Territory detail as well as zip code.
			var nameValue = nlapiGetFieldValue('name');
			var formattedNameValue = nlapiGetFieldValue('custrecord_auxtz_zipcode')+' - '+nlapiGetFieldValue('custrecord_auxtz_details');
			if (nameValue != formattedNameValue) {
				nlapiSetFieldValue('name',formattedNameValue);
			}
			
		}
	} catch (tzbserr) {
		
		throw nlapiCreateError('TERRITORY_ZIP_ERR', getErrText(tzbserr), true);
		
	}
}
