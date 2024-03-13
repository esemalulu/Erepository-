/**
 * Module Description
 *
 * This script contains logic for setting of 'Export Classification' field's list options.
 * The following rules must apply:
 *  - This logic should only work in "Edit mode"
 *  - First four options should not be available for select (must be hidden or disabled)
 *  
 * Version    Date            Author           Remarks
 * 1.00       12 Jul 2016     akuznetsov
 *
 */

/**
 * This function will construct new Select field for "Export Classification" and
 * "replace" the existing one by hiding it
 * 
 * List of available options is taken from customlistr7lrpgraylistreason custom
 * list First four options are excluded
 * 
 * @appliedtorecord License Request Processing
 * 
 * @param {String}
 *            type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm}
 *            form Current form
 * @returns {Void}
 */
function setExportClassificationAtBeforeLoad(type, form) {
	if (type != 'edit')
		return;

	var rejectReason = nlapiGetFieldValue('custrecordr7licreq_exportclassification');

	form.insertField(buildNewSelectField(form, 'rejectreason',
			'Export Classification', 'customlistr7lrpgraylistreason', 4,
			rejectReason), 'custrecordr7licreq_addrvalidstatus');
	form.getField('custrecordr7licreq_exportclassification').setDisplayType('hidden');
}

/**
 * Builds up new Select Field
 * 
 * @param {nlobjForm}
 *            form reference to a form object
 * @param {String}
 *            fieldName name of the field
 * @param {String}
 *            label label for the field
 * @param {String}
 *            listname internal id of custom list for options
 * @param {Number}
 *            excludeTill list items with ID's below or equal to that parameters
 *            will be excluded
 * @param value
 *            default value to be set
 * @returns {nlobjField} newly created Select field
 */
function buildNewSelectField(form, fieldName, label, listname, excludeTill,
		value) {
	var newField = form.addField('custpage_' + fieldName, 'select', label,
			null, null);
	newField.addSelectOption('', '', false);

	var col = new Array();
	col[0] = new nlobjSearchColumn('name');
	col[1] = new nlobjSearchColumn('internalId').setSort(false);

	var options = nlapiSearchRecord(listname, null, null, col);

	for (var i = 0; i < options.length; i++) {
		// First excludeTill options should not be available for selection
		if (options[i].getValue('internalId') <= excludeTill)
			continue;

		newField.addSelectOption(options[i].getValue('internalId'), options[i]
				.getValue('name'), false);
	}
	nlapiSetFieldValue('custpage_' + fieldName, value, false, true);
	return newField;
}
