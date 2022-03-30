/**
 * Scheduled script to run ONCE DAILY.
 * Memorized Join
 * 		[8] = {nlobjSearchColumn} memorized
		[9] = {nlobjSearchColumn} name (transaction)
		[10] = {nlobjSearchColumn} action (transaction)
		[11] = {nlobjSearchColumn} amount (transaction)
		[12] = {nlobjSearchColumn} inprogress (transaction)
		[13] = {nlobjSearchColumn} frequency (transaction)
		[14] = {nlobjSearchColumn} internalid (transaction)
		[15] = {nlobjSearchColumn} nexttrandate (transaction)
		[16] = {nlobjSearchColumn} nextdate (transaction)

 */

var paramJustMemorizedSavedSearch = ctx.getSetting('SCRIPT','custscript_retenjm_id');

var EXIT_COUNT= 1000;

function processNewMemorizedInvoice(type) {
	
	var today = nlapiDateToString(new Date());
	try {
		
		var mflt = [new nlobjSearchFilter('memorized', null, 'is','T'),
		            new nlobjSearchFilter('mainline', null, 'is','F'),
		            new nlobjSearchFilter('cogs', null, 'is','F'),
		            new nlobjSearchFilter('taxline', null, 'is','F'),
		            new nlobjSearchFilter('shipping', null, 'is','F'),
		            new nlobjSearchFilter('datecreated', null, 'on', today)];
		
		var mcol = [new nlobjSearchColumn('linesequencenumber'),
		            new nlobjSearchColumn('internalid').setSort(),
		            new nlobjSearchColumn('tranid'),
		            new nlobjSearchColumn('entity'),
		            new nlobjSearchColumn('amount'),
		            new nlobjSearchColumn('item'),
		            new nlobjSearchColumn('custitem_ax_item_category','item'),
		            new nlobjSearchColumn('type','item')];
		//Discount
		
	    var mrs = nlapiSearchRecord('invoice', null, mflt, mcol);
	    
	    var mjson = {};
	    var newProcIds = '';
	    var curClient = '';
	    var isDeleted = false;
	    for (var i=0; mrs && i < mrs.length; i++) {
	    	var memInvId = mrs[i].getValue('internalid');
	    	var client = mrs[i].getValue('entity');
	    	
	    	if (!mjson[client]) {
	    		mjson[client] = {
	    			'items':{}
	    		};
	    	}
	    	
	    	
	    	
	    	//1. Clear out existing baseline for client
	    	if (!isDeleted) {
	    		var bflt = [new nlobjSearchFilter('custrecord_abmrr_customer', null, 'anyof',client)];
	    		var bcol = [new nlobjSearchColumn('internalid')];
	    		var brs = nlapiSearchRecord('customrecord_ax_baselinecustassets', null, bflt, bcol);
	    		for (var b=0; brs && b < brs.length; b++) {
	    			nlapiDeleteRecord('customrecord_ax_baselinecustassets', brs[b].getId());
	    		}
	    		
	    		isDeleted = true;
	    	}
	    	
	    	if (curClient != client) {
	    		curClient = client;
	    		newProcIds += memInvId+',';
	    	}
	    	
	    }
	    
			
			/**
				//Reschedule logic
				if ( (ars.length == 1000 && (a+1)==1000) || (ctx.getRemainingUsage() <= EXIT_COUNT && (a+1) < ars.length) ) {
					var params = new Array();
					params['custscript_gsrq_assetcid'] = ars[a].getId();
					params['custscript_gsrq_custprocdate'] = ((paramCustProcDate)?paramCustProcDate:'');
					params['custscript_gsrq_trxdtoverride'] = paramTrxDateOverride;
					params['custscript_gsrq_testreconly'] = ((paramProcTestRecOnly=='T')?'T':F);
					var schStatus = nlapiScheduleScript(ctx.getScriptId(), ctx.getDeploymentId(), params);
					if (schStatus=='QUEUED') {
						break;
					}
				}
			*/
	    	
	    }
	    
		
	} catch (setblerr) {
		
		log('error','New Memorized Invoice Baseline Error',getErrText(setblerr));
		throw nlapiCreateError('NMIBL-1000', getErrText(setblerr), false);
		
	}
	
	
}
