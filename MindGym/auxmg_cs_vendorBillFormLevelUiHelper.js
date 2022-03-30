
function vbPageInit(type) {
	//custcol_column_jobbysupplier
	if (type == 'create') {
		nlapiDisableLineItemField('expense', 'customer', true);
	}
}