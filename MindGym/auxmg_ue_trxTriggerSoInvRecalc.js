/**
 * Modified Sep. 1 2015 by JS@Audaxium:
 *	- If SO is being created, check for created from. If created from is a Quote, trigger SO and Invoice count recalc for the Quote.
 * 
 * Version    Date            Author           Remarks
 * 1.00       01 Sep 2015     json
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord Sales Order
 * 
 * @param {String} type Operation types: create, copy
 * @returns {Void}
 */
function soInvRecalcTrigger(type){

	//Only trigger for create or copy of salesorder
	if ( (type == 'create' || type == 'copy') && nlapiGetRecordType()=='salesorder')
	{
		var createdFromText = nlapiGetFieldText('createdfrom');
		//make sure it's Quote
		if (createdFromText && createdFromText.indexOf('Quote') > -1)
		{
			try 
			{
				var rparam = {
					'custscript_340_quoteid':nlapiGetFieldValue('createdfrom'),
					'custscript_340_isdailyprocess':'F',
					'custscript_340_zerosoonly':'F',
					'custscript_340_lastprocid':'F'
				};
				
				
				var queueStatus = nlapiScheduleScript(
										'customscript_ax_ss_recount_soinvquote', 
										null, 
										rparam
								  );
				
				log('audit','SO ID '+nlapiGetRecordId(),'Trigger status: '+queueStatus+' SO/INV Recalc for Quote ID '+nlapiGetFieldValue('createdfrom'));
				
			}
			catch (queueerr)
			{
				log('error','Error triggering SO/INV Recalc SO ID '+nlapiGetRecordId(), getErrText(queueerr));
			}
		}
	}
	
}
