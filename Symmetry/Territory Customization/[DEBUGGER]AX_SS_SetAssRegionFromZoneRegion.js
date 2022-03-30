/* 
 *
 */

var lastProcId = '';

var ctx = nlapiGetContext();


function setAssignmentRegionFldForExistingRecords(type) {

	try {

		var rjson = {};
		var arcol = [new nlobjSearchColumn('internalid'),
		             new nlobjSearchColumn('name')];
		var arrs = nlapiSearchRecord('customlist_territories', null, null, arcol);
		for (var a=0; a < arrs.length; a++) {
			rjson[arrs[a].getValue('name')] = arrs[a].getId();
		}
		//custentity_assign_region
		var zrflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
		             new nlobjSearchFilter('isperson', null, 'is','F'),
		             new nlobjSearchFilter('custentity_aux_zoneregion_terrzip', null, 'noneof','@NONE@'),
		             new nlobjSearchFilter('custentity_assign_region', null, 'anyof','@NONE@')];

		var zrcol = [new nlobjSearchColumn('internalid').setSort(true),
		             new nlobjSearchColumn('custrecord_auxtz_details','custentity_aux_zoneregion_terrzip')];

		if (lastProcId) {
			zrflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', lastProcId));
		}

		var zrrs = nlapiSearchRecord('customer', null, zrflt, zrcol);

		alert('size: '+zrrs.length);

		for (var i=0; zrrs && i < zrrs.length; i++) {
			alert(zrrs[i].getId()+'::'+zrrs[i].getValue('custrecord_auxtz_details','custentity_aux_zoneregion_terrzip'));
			
			nlapiSubmitField(zrrs[i].getRecordType(), zrrs[i].getId(), 'custentity_assign_region', rjson[zrrs[i].getValue('custrecord_auxtz_details','custentity_aux_zoneregion_terrzip')], true);
			if ((i+1)==1000 || (ctx.getRemainingUsage() <= 1000 && (i+1) < zrrs.length)) {
				
				var schStatus = nlapiScheduleScript(ctx.getScriptId(), ctx.getDeploymentId(), null);
				if (schStatus=='QUEUED') {
					break;
				}
			}
		}
	} catch (reseterr) {
		log('error','Terminating Error',getErrText(reseterr));
	}

}