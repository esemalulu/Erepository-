/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define([], function() {
	function pageInit(context) {
		try {
			var addressRec = context.currentRecord;
			if (addressRec.type === 'address') {
				if (addressRec.getValue({ fieldId: 'override' }) === false) {
					var overrideField = addressRec.getField({ fieldId: 'override' });
					overrideField.isDisabled = true;
				}
			}
		} catch (e) {}
	}
	return {
		pageInit: pageInit
	};
});
