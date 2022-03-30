/****************** LPC Demo Date User Event Functions ****************************/

/**
 * Demo Date scheduler V2
 * User event script will hold button placement to allow user to create new demo event in VIEW mode only
 * 
 */
function lpcBeforeLoad(type, form, request)
{
	if (nlapiGetContext().getExecutionContext() == 'userinterface')
	{
		
		if (type == 'view')
		{

			var slUrl = nlapiResolveURL('SUITELET', 'customscript_ax_sl_demodatescheduler', 'customdeploy_ax_sl_demodatescheduler', 'VIEW')+
		 				'&custparam_lpcid='+nlapiGetRecordId()+'&custparam_lpctype='+nlapiGetRecordType();

			//var scriptHtml = 'window.open(\''+slUrl+'\', \'DDSch\', \'width=400,height=750,resizable=yes,scrollbars=yes\');return true;';
			
			var scriptHtml = 'window.location.href = \''+nsDomain+slUrl+'\'';
			
			form.addButton('custpage_setsterbtn', 'Book Event', scriptHtml);
		}
		
	}
}

