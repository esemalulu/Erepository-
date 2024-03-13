/*
 * @author suvarshi
 */

/*
 * synchronize contact's subsidiary with customer's subsidiary
 */
function beforeSubmit(type) {
    if (type != 'delete' && type != 'xedit' && nlapiGetRecordType() == 'contact') {
        var contactSubsidiary = nlapiGetFieldValue('subsidiary');
        var leadSubsidiary = nlapiLookupField('customer', nlapiGetFieldValue('company'), 'subsidiary');        
        if (contactSubsidiary !== leadSubsidiary) {
            nlapiSetFieldValue('subsidiary', leadSubsidiary);
        }
    }
}
function afterSubmit(type){
	//populate company-level Lead source
	populateCompanyLevelLeadSource(type);
}

function populateCompanyLevelLeadSource(type){
	
	nlapiLogExecution('DEBUG','executed','yes');
	
}