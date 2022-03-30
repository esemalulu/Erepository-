/**
 * Author: joe.son@audaxium.com
 * Date: 3/6/2013
 * Record: opportunity/Quote
 * Desc:
 * Places opportunity configurator button when in Edit mode to allow users to access Opportunity Configurator Suitelet
 * as popup window
 * 
 */

function OpportunityUserEventBeforeLoad(type, form, request){

	if ((type == 'edit' || type == 'create') && nlapiGetContext().getExecutionContext()=='userinterface') {
		var selUrl = nlapiResolveURL('SUITELET','customscript_ax_sl_opp_lineitem_config','customdeploy_ax_sl_opp_lineitem_config');
		
		form.addButton('custpage_oppconfigbtn','Software Item Configurator',
					   'window.open(\''+selUrl+'\', \'\', \'width=820,height=500,resizable=yes,scrollbars=yes\');return true;');
	}
	
}

