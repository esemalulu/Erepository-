//contact as join

/**
 * Filtered buyer list on transaction uses Suitelet to dynamically grab and build custom field.
 * This is because record can be created and/or edited by user and customer value can be changed.
 * @param type
 * @param form
 * @param request
 */

function beforeLoad(type, form, request) {

	var shipMethod = nlapiGetFieldValue('shipmethod');
/*  
	if (type == 'view'  && shipMethod != '21866' && nlapiGetContext().getExecutionContext()=='userinterface') 
	{  
 	    form.getFieldValue('custbody_tagex_pallet_progress').setDisplayType('hidden'); 
	}
*/

    var list = form.getSubList("item");
    list.addButton('custpage_forfietall','Forfeit All','forfietall();');  //markall(); is function name from the client script
    list.addButton('custpage_abondonall','Abandon All','abandonall();'); //unmarkall(); is function name from client script
    form.setScript('customscript_tagex_ue_1_transactions'); // 'customscript_tagex_ue_1_transactions' is the ID of script
    form.setScript('customscript_tagex_cs_1_transactions'); // 'customscript_mark_all_item_quote' is the ID of script

  
}