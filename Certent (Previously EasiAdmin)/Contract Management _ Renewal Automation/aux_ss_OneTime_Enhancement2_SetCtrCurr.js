/**
 * Part of Enhancement#2.
 * One time script to go through and set default Contract Currency to USD
 * This is because the field is being introduced mid stream of project and existing
 * contract records MUST have value set
 * 
 * 
 * Version    Date            Author           Remarks
 * 1.00       13 Oct 2016     json
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */

function setDefCtrCurrency(type) 
{
	var ctrflt = [new nlobjSearchFilter('custrecord_crc_ctrcurrency', null, 'anyof', '@NONE@')],
		ctrcol = [new nlobjSearchColumn('internalid')],
		ctrrs = nlapiSearchRecord('customrecord_axcr_contract', null, ctrflt, ctrcol);
	
	for (var c=0; ctrrs && c < ctrrs.length; c+=1)
	{
		log('debug','contract',ctrrs[c].getValue('internalid'));
		//default the value to USD on this contract record
		//Internal ID is 1
		nlapiSubmitField(
			'customrecord_axcr_contract', 
			ctrrs[c].getValue('internalid'), 
			'custrecord_crc_ctrcurrency', 
			'1', 
			true
		);
		
		//Loop through ALL ACV reporting contract table and set it to USD if missing
		var actrflt = [new nlobjSearchFilter('custrecord_cracv_contractref', null, 'anyof', ctrrs[c].getValue('internalid')),
		               new nlobjSearchFilter('custrecord_cracv_ctrcurrency', null, 'anyof', '@NONE@')],
			actrcol = [new nlobjSearchColumn('internalid')],
			actrrs = nlapiSearchRecord('customrecord_axcr_acv', null, actrflt, actrcol);
		
		//Loop through and update acv contract records to default value of USD
		for (var a=0; actrrs && a < actrrs.length; a+=1)
		{
			log('debug','acv contract for '+ctrrs[c].getValue('internalid'), actrrs[a].getValue('internalid'));
			nlapiSubmitField(
				'customrecord_axcr_acv', 
				actrrs[a].getValue('internalid'), 
				'custrecord_cracv_ctrcurrency', 
				'1', 
				true
			);
		}
	}	
}
