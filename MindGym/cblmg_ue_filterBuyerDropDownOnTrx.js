//contact as join

/**
 * Filtered buyer list on transaction uses Suitelet to dynamically grab and build custom field.
 * This is because record can be created and/or edited by user and customer value can be changed.
 * @param type
 * @param form
 * @param request
 */

function addFilteredBuyerList(type, form, request) {

	//Only fire for all type Except for Delete and Xedit by User
	//if (type != 'delete' && type != 'xedit' && nlapiGetContext().getExecutionContext()=='userinterface') {
	//Ticket 679 - Make it exactly like Booking. ONLY have it appear on EDIT mode
	if (type == 'edit' && nlapiGetContext().getExecutionContext()=='userinterface') {	
		try {
			
			//disable Buyer field and add custom filtered buyer field
			
			//create new buyer dd field
			var filteredBuyer = form.addField('custpage_ftbuyer', 'select', 'Buyers by Client', null, null);
			filteredBuyer.setMandatory(true);
			filteredBuyer.addSelectOption('', '', true);
			
			form.insertField(filteredBuyer, 'custbody_buyer');
			
			//disable original
			form.getField('custbody_buyer', null).setDisplayType('disabled');
			
		} catch (addfberr) {
			log('error','Error adding filtered Buyer list', getErrText(addfberr));
		}	
	}
}