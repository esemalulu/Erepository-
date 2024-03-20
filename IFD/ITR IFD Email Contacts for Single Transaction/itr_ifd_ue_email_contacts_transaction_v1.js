/**
 * @description User event script used to implement custom functionality of the Email All Contacts module
 * @author Franklin Ilo (AddCore Software Corp.) franklin@addcore.io
 *
 */

function _beforeLoad (type, form, request) {
    try {
        //Hide the "Attach" button
        if (type == 'view') {
			var emailAttachmentAttachSelectField = nlapiGetField('existingrecmachcustrecord_ifd_parent_transaction');
			if (emailAttachmentAttachSelectField) {
				emailAttachmentAttachSelectField.setDisplayType('hidden');
			}
		}
    }
    catch (err) {
        nlapiLogExecution('Error', '_beforeLoad() Error', err);
    }
}