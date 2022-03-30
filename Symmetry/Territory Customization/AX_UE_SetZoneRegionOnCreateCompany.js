/**
 * Set custentity_aux_zoneregion_terrzip (Zone/Region) custom field that references AUX:Territory Zipcodes (customrecord_aux_territoryzips) record
 * during creation.
 * 
 * Assumption:
 * 1. By Default, it ONLY fires on Create
 * 2. ONLY fires when customer record is COMPANY Type. This means Is Individual is NOT Checked.
 * 3. ONLY fires when custentity_aux_zoneregion_terrzip field is blank
 * 3. LOGIC:
 * 	- Use Shipping Zipcode.
 * 	- If Shipping Zip is not available, 
 * 	- USE Billing Zipcode.
 * 
 * 
 * Version    Date            Author           Remarks
 * 1.00       19 Dec 2013     Audaxium
 *
 */

/**
 * The recordType (internal id) corresponds to Company Record (customer) record 
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

var ctx = nlapiGetContext();

//script parameter to set Zone/Region even on Modification
var setOnModification = false;
if (ctx.getSetting('SCRIPT','custscript_zonereg_onmod')=='T') {
	setOnModification = true;
}

function setZoneRegionBeforeSubmit(type){
	try {
		
		//if delete or xedit, don't do anything
		if (type == 'delete' || type == 'xedit') {
			return;
		}
		
		//ONLY proceed when Zone/Region field is blank
		//if (!nlapiGetFieldValue('custentity_aux_zoneregion_terrzip')) {
		
			//Execute ONLY if it is COMPANY AND CREATE or override to execute on update is authorized.
			if (nlapiGetFieldValue('isperson') != 'T' && (type == 'create' || setOnModification)) {
				
				//log('debug','Fire', nlapiGetContext().getExecutionContext());
				
				//execute ONLY if Shipping Zip or Billing Zip is available
				if (nlapiFindLineItemValue('addressbook', 'defaultshipping', 'T') >=1 ||nlapiFindLineItemValue('addressbook', 'defaultbilling', 'T') >=1) {
				
					var strZip = '';
					
					if (nlapiFindLineItemValue('addressbook', 'defaultshipping', 'T') >=1 && 
						nlapiGetLineItemValue('addressbook', 'zip', nlapiFindLineItemValue('addressbook', 'defaultshipping', 'T'))) {
						//Default Shipping address has zipcode value
						
						strZip = nlapiGetLineItemValue('addressbook', 'zip', nlapiFindLineItemValue('addressbook', 'defaultshipping', 'T'));
						
					} else if (nlapiFindLineItemValue('addressbook', 'defaultbilling', 'T') >=1 && 
							   nlapiGetLineItemValue('addressbook', 'zip', nlapiFindLineItemValue('addressbook', 'defaultbilling', 'T'))) {
						//Default Billing address has zipcode value
						strZip = nlapiGetLineItemValue('addressbook', 'zip', nlapiFindLineItemValue('addressbook', 'defaultbilling', 'T'));
					}

					//Execute Logic
					if (strZip.length >=5) {
						//use first 5 digit only for compare
						strZip = strZip.substr(0,5);
						
						var tzflt = [new nlobjSearchFilter('custrecord_auxtz_zipcode', null, 'is', strZip),
						             new nlobjSearchFilter('isinactive', null, 'is','F')];
						var tzcol = [new nlobjSearchColumn('name'),
						             new nlobjSearchColumn('custrecord_auxtz_details')];
						var tzrs = nlapiSearchRecord('customrecord_aux_territoryzips', null, tzflt, tzcol);
						
						//found match. set it
						if (tzrs && tzrs.length > 0) {
							nlapiSetFieldValue('custentity_aux_zoneregion_terrzip', tzrs[0].getId());
							nlapiSetFieldText('custentity_assign_region', tzrs[0].getValue('custrecord_auxtz_details'));
						}					
					}
					
				}
			}
		//}
	} catch (setzrerr) {
		var err = nlapiCreateError('SET_ZONEREGION_ERR', getErrText(setzrerr), false);
		log('error','Error Setting Zone/Region', getErrText(setzrerr));
	}
		
}
