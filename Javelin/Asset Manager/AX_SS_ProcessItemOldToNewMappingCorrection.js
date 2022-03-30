/**
 * Scheduled script to run against SWX custom records referecning Item record
 * to re-map old item to new item
 */
var ctx = nlapiGetContext();
var paramLastProcId = ctx.getSetting('SCRIPT','custscript_oldnew_procid');

var EXIT_COUNT= 1000;

function genRemapOldToNewItems(type) {
	
	var itemMap = {};
		
	try {

		//get ALL mapping
		var mflt = [new nlobjSearchFilter('custrecord_ax_swxonm_newitemid', null, 'isnotempty')];
		var mcol = [new nlobjSearchColumn('custrecord_ax_swxonm_olditemid'),
		            new nlobjSearchColumn('custrecord_ax_swxonm_newitemid')];
		var mrs = nlapiSearchRecord('customrecord_ax_swx_oldtonew_item_mappin', null, mflt, mcol);
		for (var m=0; mrs && m < mrs.length; m++) {
			if (!itemMap[mrs[m].getValue('custrecord_ax_swxonm_olditemid')]) {
				itemMap[mrs[m].getValue('custrecord_ax_swxonm_olditemid')] = mrs[m].getValue('custrecord_ax_swxonm_newitemid');
			}
		}
		
		//customer asset
		//customrecord_ax_cswx_assets
		/**
		var aflt = [new nlobjSearchFilter('custrecord_ax_cswxa_nsitem', null, 'noneof','@NONE@')];
		
		//process where it left off
		if (paramLastProcId) {
			aflt.push(new nlobjSearchFilter('internalidnumber',null, 'lessthan',paramLastProcId));
		}
		//grab list of customer to process
		var acol = [new nlobjSearchColumn('internalid').setSort(true),
		            new nlobjSearchColumn('custrecord_ax_cswxa_nsitem')];
		*/
		
		//SWX Product To Item Map
		//customrecord_ax_swxpi_map  
		var aflt = [new nlobjSearchFilter('custrecord_ax_swxpim_item', null, 'noneof','@NONE@')];
		
		//process where it left off
		if (paramLastProcId) {
			aflt.push(new nlobjSearchFilter('internalidnumber',null, 'lessthan',paramLastProcId));
		}
		//grab list of customer to process
		var acol = [new nlobjSearchColumn('internalid').setSort(true),
		            new nlobjSearchColumn('custrecord_ax_swxpim_item')];

		
		var recId = 'customrecord_ax_swxpi_map';
		var fldId = 'custrecord_ax_swxpim_item';
		
		var ars = nlapiSearchRecord(recId, null, aflt, acol);
		
		for (var a=0; ars && a < ars.length; a++) {
		
			var existingItem = ars[a].getValue(fldId);
			//check to see if it needs to be remapped
			if (itemMap[existingItem]) {
				//updating
				log('debug',recId+' - Record ID: '+ars[a].getId(), 'Old: '+existingItem+' // New: '+itemMap[existingItem]);
				nlapiSubmitField(recId, ars[a].getId(), fldId, itemMap[existingItem], true);
			}
			
			
			//Reschedule logic
			if ( (ars.length == 1000 && (a+1)==1000) || (ctx.getRemainingUsage() <= EXIT_COUNT && (a+1) < ars.length) ) {
				var params = new Array();
				params['custscript_oldnew_procid'] = ars[a].getId();
				var schStatus = nlapiScheduleScript(ctx.getScriptId(), ctx.getDeploymentId(), params);
				if (schStatus=='QUEUED') {
					break;
				}
			}
		}
		
	} catch (sgenerr) {
		
		log('error','SWX Item Remap Error',getErrText(sgenerr));
		throw nlapiCreateError('SWXGENQ-1000', getErrText(sgenerr), false);
		
	}
	
	
}
