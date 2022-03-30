/**
 * Author: js@Audaxium
 * User event deployed for Sales Order to display button
 * that launhces Contract Managemnt tool as pop up window
 */

function salesOrderBeforeLoad(type, form, request){
	//Only display on view mode
	if (type=='view') {
		var contractMgmtGeneratorUrl = nlapiResolveURL('SUITELET',
													   'customscript_ax_sl_contractmgmttool',
													   'customdeploy_ax_sl_contractmgmttool')+'&custparam_trxid='+nlapiGetRecordId()+
													   '&custparam_trxtype='+nlapiGetRecordType();

		var genBtn = form.addButton('custpage_btn_contractmgmt',
									'Manage Contract',
									'window.open(\''+contractMgmtGeneratorUrl+'\', \'\', \'width=1100,height=750,resizable=yes,scrollbars=yes\');return true;');
	}
}
