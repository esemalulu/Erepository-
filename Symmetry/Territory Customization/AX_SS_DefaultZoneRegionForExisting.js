/* 
* Set custentity_aux_zoneregion_terrzip (Zone/Region) custom field that references AUX:Territory Zipcodes (customrecord_aux_territoryzips) record
 * for all existing customer records.
 * 
 * Assumption:
 * 1. Search for Active (Inactive = F), COMPANY Type records with Missing Zone/Region value 
 * 2. ONLY fires when custentity_aux_zoneregion_terrzip field is blank
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

var ctx = nlapiGetContext();

var lastProcId = ctx.getSetting('SCRIPT','custscript_zrdef_lastid');


function setZoneRegionForExistingRecords(type) {

	try {
		
		var zrflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
		             new nlobjSearchFilter('isperson', null, 'is','F'),
		             new nlobjSearchFilter('custentity_aux_zoneregion_terrzip', null, 'anyof','@NONE@')];
		var zrcol = [new nlobjSearchColumn('internalid').setSort(true),
		             new nlobjSearchColumn('billzipcode'),
		             new nlobjSearchColumn('shipzip'),
		             new nlobjSearchColumn('stage')];
		
		if (lastProcId) {
			zrflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', lastProcId));
		}
		
		var zrrs = nlapiSearchRecord('customer', null, zrflt, zrcol);
		
		for (var i=0; zrrs && i < zrrs.length; i++) {
			
			var billZip = zrrs[i].getValue('billzipcode');
			var shipZip = zrrs[i].getValue('shipzip');
			
			log('debug','bill/ship',billZip+' // '+shipZip);
			
			//only process if either bill or ship zipcode is available
			if (billZip || shipZip) {
				
				var strZip = billZip;
				if (!strZip) {
					strZip = shipZip;
				}
				
				//Execute Logic
				if (strZip.length >=5) {
					//use first 5 digit only for compare
					strZip = strZip.substr(0,5);
					
					var tzflt = [new nlobjSearchFilter('custrecord_auxtz_zipcode', null, 'is', strZip),
					             new nlobjSearchFilter('isinactive', null, 'is','F')];
					var tzcol = [new nlobjSearchColumn('name')];
					var tzrs = nlapiSearchRecord('customrecord_aux_territoryzips', null, tzflt, tzcol);
					
					//found match. set it
					if (tzrs && tzrs.length > 0) {
						log('debug','matching zipid',tzrs[0].getId());
						nlapiSubmitField(zrrs[i].getRecordType(), zrrs[i].getId(), 'custentity_aux_zoneregion_terrzip', tzrs[0].getId(), false);
					}					
				}				
			}
			
			log('debug','i+1',i+1);
			log('debug','left over usage',ctx.getRemainingUsage());
			
			if ((i+1)==1000 || (ctx.getRemainingUsage() <= 1000 && (i+1) < zrrs.length)) {
				var param = new Array();
				param['custscript_zrdef_lastid'] = zrrs[i].getId();
				
				var schStatus = nlapiScheduleScript(ctx.getScriptId(), ctx.getDeploymentId(), param);
				if (schStatus=='QUEUED') {
					break;
				}
			}
		}
		
	} catch (zrerr) {
		throw nlapiCreateError('ZONEREG_DEF_ERROR', getErrText(zrerr), false);
	}
	
}
