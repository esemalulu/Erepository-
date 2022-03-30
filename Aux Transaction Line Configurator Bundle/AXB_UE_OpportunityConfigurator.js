/**
 * Author: joe.son@audaxium.com
 * Date: 3/3/2015
 * Desc:
 * Places transaction line configurator button when in Edit/Create mode to allow users to access Transaction Configurator Suitelet
 * as popup window
 * 
 * This script also contains reference to ALL Company level configuration parameters
 */

//Company Level Configuration Filter
var paramLaunchBtnLabel = nlapiGetContext().getSetting('SCRIPT', 'custscript_oppwiz_launchlabel');
var paramWizardLabel = nlapiGetContext().getSetting('SCRIPT', 'custscript_oppwiz_wizardlabel');
var paramTopLevelFilter = nlapiGetContext().getSetting('SCRIPT', 'custscript_oppwiz_toplvlfilter');

function AxLineWizUeBeforeLoad(type, form, request){

	if ((type == 'edit' || type == 'create' || type=='copy') && nlapiGetContext().getExecutionContext()=='userinterface') {
		var selUrl = nlapiResolveURL('SUITELET','customscript_ax_sl_lineitemwiz_config','customdeploy_ax_sl_lineitemwiz_config');
		form.addButton('custpage_oppconfigbtn',paramLaunchBtnLabel,
					   'window.open(\''+selUrl+'\', \'\', \'width=900,height=700,resizable=yes,scrollbars=yes\');return true;');
	}
	
}

