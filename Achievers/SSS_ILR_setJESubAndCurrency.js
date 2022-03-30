
// constants
{
	var ENABLE_DEBUG=true;

	var SUBSIDIARY_ID='1';
	var CURRENCY_ID='2';
}


// beforesubmit script
// this script sets both the Subsidiary and Currency
function beforeSubmitSetJEFields(type)
{
	if (ENABLE_DEBUG) { nlapiLogExecution('debug','Update JE Fields','*** START ***'); }

	var ctx = nlapiGetContext();
	var executionType=ctx.getExecutionContext();
	
	if (ENABLE_DEBUG) { nlapiLogExecution('debug','Update JE Fields','Execution Type is: '+executionType); }

	var stParamSub = ctx.getSetting('SCRIPT', 'custscript_je_sub');
	if (stParamSub != null && stParamSub != '' )
	{
		SUBSIDIARY_ID=stParamSub;
	}
	var stParamCurr = ctx.getSetting('SCRIPT', 'custscript_je_curr');
	if (stParamCurr != null && stParamCurr != '' )
	{
		CURRENCY_ID=stParamCurr;
	}

	if (executionType=='smbxml')
	{
		// get the new record
		var jeRecord = nlapiGetNewRecord();
		
		// set Subsidiary and Currency to hardcoded values (body fields only - not line-level)
		jeRecord.setFieldValue("subsidiary", SUBSIDIARY_ID);
		jeRecord.setFieldValue("currency", CURRENCY_ID);
		
		if (ENABLE_DEBUG) { nlapiLogExecution('debug','Update JE Fields','Just Set Subsidiary and Currency'); }
 	}
	// not smbxml

	if (ENABLE_DEBUG) { nlapiLogExecution('debug','Update JE Fields','*** END ***'); }
}