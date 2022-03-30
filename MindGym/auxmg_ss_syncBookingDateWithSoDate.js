/**
 * Scheduled script to go through and look at all Sales Order dated on or after This month
 * - If any of the lines has booking created and the custom date on the line
 * 	 do not match with linked Booking, This script will Update SO lines' date value to 
 * 	 linked booking date value.
 * 
 * Version    Date            Author           Remarks
 * 1.00       10 May 2016     json
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function syncSoLineDateWithBooking(type) 
{
	var paramLastProcId = nlapiGetContext().getSetting('SCRIPT','custscript_512_lastid');
	
	try
	{
		var formulaDateExistsCheck = new nlobjSearchFilter('formuladate', null, 'isnotempty',''),
			formulaTextCheck = new nlobjSearchFilter('formulatext', null,'is','yes');
		
		formulaDateExistsCheck.setFormula('{custcol_bo_date}');
		formulaTextCheck.setFormula(
			"CASE WHEN {job.enddate} != {custcol_bo_date} THEN 'yes' else 'no' end"
		);
		
		var gflt = [new nlobjSearchFilter('mainline', null, 'is','F'),
		            new nlobjSearchFilter('type', null, 'anyof', ['SalesOrd']),
		            new nlobjSearchFilter('internalid','job','noneof','@NONE@'),
		            new nlobjSearchFilter('enddate','job','isnotempty',''),
		            new nlobjSearchFilter('trandate', null, 'onorafter','startofthismonth'),
		            formulaDateExistsCheck,
		            formulaTextCheck],
		    
		            //Initial Search is grouped by Transaction Internal ID.
			gcol = [new nlobjSearchColumn('internalid',null,'group').setSort(true),
			        new nlobjSearchColumn('tranid', null,'group')],
			
			//For each search, dcol will return details of 
			dcol = [new nlobjSearchColumn('internalid'),
			        new nlobjSearchColumn('tranid'),
			        new nlobjSearchColumn('entity'),
			        new nlobjSearchColumn('linesequencenumber'),
			        new nlobjSearchColumn('enddate','job'),
			        new nlobjSearchColumn('custcol_bo_date')];
		
		if (paramLastProcId)
		{
			gflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcId));
		}
		
		var rs = nlapiSearchRecord('transaction', null, gflt, gcol);
		
		//Loop through each group of Sales Orders and process sync
		for (var r=0; rs && r < rs.length; r+=1)
		{
			log('debug','processing SO ID', rs[r].getValue('internalid', null, 'group'));
			
			var detailflt = [new nlobjSearchFilter(
								'internalid', 
								null, 
								'anyof', 
								rs[r].getValue('internalid', null,'group')
							 ),
							 new nlobjSearchFilter('mainline', null, 'is','F'),
					         new nlobjSearchFilter('type', null, 'anyof', ['SalesOrd']),
					         new nlobjSearchFilter('internalid','job','noneof','@NONE@'),
					         new nlobjSearchFilter('enddate','job','isnotempty',''),
					         formulaDateExistsCheck,
					         formulaTextCheck],
				
				detailrs = nlapiSearchRecord('salesorder', null, detailflt, dcol);
			
			//1. Load Sales order
			var sorec = nlapiLoadRecord('salesorder', rs[r].getValue('internalid', null,'group'));
			
			for (var d=0; d < detailrs.length; d+=1)
			{
				log(
					'debug',
					'---- Line '+detailrs[d].getValue('linesequencenumber'), 
					detailrs[d].getValue('enddate','job')+
						' // '+
						detailrs[d].getValue('custcol_bo_date')+
						' // '+
						detailrs[d].getValue('tranid')+
						' // '+
						detailrs[d].getValue('internalid')
						
				);
				
				sorec.setLineItemValue(
					'item', 
					'custcol_bo_date', 
					detailrs[d].getValue('linesequencenumber'), 
					detailrs[d].getValue('enddate','job')
				);
				
			}
			
			try
			{
				nlapiSubmitRecord(sorec, true, true);
				
				log(
					'debug',
					'update SO',
					rs[r].getValue('tranid', null,'group')+' // '+
						rs[r].getValue('internalid',null,'group')
				);
			}
			catch(updsoerr)
			{
				throw nlapiCreateError(
						'LINE_SYNC_ERR', 
						'Faile dto update Sales Order '+rs[r].getValue('internalid',null,'group')+
							' // '+getErrText(updsoerr), 
						true
				);
			}
			
			//*************** Reschedule logic ********
			//Set % completed of script processing
			var pctCompleted = Math.round(((r+1) / rs.length) * 100);
			nlapiGetContext().setPercentComplete(pctCompleted);
			
			//Reschedule logic
			if ((r+1)==1000 || ((r+1) < rs.length && nlapiGetContext().getRemainingUsage() < 1000)) 
			{
				log.audit('Reschedule','ID: '+rs[r].getValue('internalid', null, 'group'));
				
				var rparam = 
				{
					'custscript_512_lastid':rs[r].getValue('internalid', null, 'group')	
				};
				
				nlapiScheduleScript(
					nlapiGetContext().getScriptId(), 
					nlapiGetContext().getDeploymentId(), 
					rparam
				);
				
				break;
			}
			
		}
		
		
	}
	catch(runerr)
	{
		log('error','SO/Booking Date Sync Error',getErrText(runerr));
		throw nlapiCreateError('SOBOOK_SYNC_ERR', getErrText(runerr), false);
	}
}
