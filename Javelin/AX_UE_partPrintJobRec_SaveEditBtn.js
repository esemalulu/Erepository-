/**
 * Author: joe.son@audaxium.com
 * Date: 5/3/2012
 * Record: Part Printing Job (customrecord_partprint)
 * Desc:
 * User event script deployed on Part Printing Job Record.
 * Creates custom button called Save and Edit which allow users to save the record and return to same record in Edit mode
 */

/**
 * Fires whenever a read operation on the record occurs just prior to returning the record or page
 * type: create, edit, view, copy, print, email
 * form: nlobjForm object representing the current form. 
 * request: nlobjRequest object representing GET request
 */
function beforeLoad(type, form, request) {
	//Only display button in Edit mode
	if (type == 'edit') {
		form.setScript('customscript_cs_ue_sl_helper_func');
		
		var recType = nlapiGetRecordType();
		var recId = nlapiGetRecordId();
		
		form.addButton('custpage_saveandedit','Save & Edit','SaveAndEdit(\''+recType+'\',\''+recId+'\');');
	}
	
}
