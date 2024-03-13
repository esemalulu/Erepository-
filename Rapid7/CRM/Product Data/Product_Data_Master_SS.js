
function beforeLoad(type, form){
    var context = nlapiGetContext();
    var userId = nlapiGetUser();
    
    if ((type == 'edit' || type == 'view' || type == 'create') && context.getExecutionContext() == 'userinterface') {
    	
		var oppId = nlapiGetFieldValue('custrecordr7proddatamaster_opp');
		if (type != 'create' && type != 'copy'){
			updateChildOppFields(oppId);
		}
		var urlOppId = request.getParameter('record.custrecordr7proddatamaster_opp');
		var params = new Array();
		params['l'] = 'T';

		if (urlOppId != null && urlOppId != ''){
			var masterId = findMasterRec(urlOppId);
			nlapiLogExecution('DEBUG', 'masterId1', masterId);
			if (masterId != null && masterId != '') {
				nlapiSetRedirectURL('RECORD', 'customrecordr7productdatamaster', masterId, true, params);
				return;
			}
			else {
				var recMaster = nlapiCreateRecord('customrecordr7productdatamaster');
				recMaster.setFieldValue('custrecordr7proddatamaster_opp', oppId);
				var id = nlapiSubmitRecord(recMaster);
				nlapiLogExecution('DEBUG', 'masterId3 - NEW', id);
				updateChildOppFields(oppId, id);
				nlapiSetRedirectURL('RECORD', 'customrecordr7productdatamaster', id, true, params);
			}
		} else if (type == 'create' && oppId != null && oppId != ''){
			var masterId = findMasterRec(oppId);
			nlapiLogExecution('DEBUG', 'masterId2', masterId);
			if (masterId != null && masterId != '') {
				nlapiSetRedirectURL('RECORD', 'customrecordr7productdatamaster', masterId, true, params);
				return;
			} 
		}
		if (type == 'view') {
			var id = nlapiGetRecordId();
			if (id != null && id != '') {
				nlapiSetRedirectURL('RECORD', 'customrecordr7productdatamaster', id, true, params);
				return;
			}
		}
		
    }
}

function beforeSubmit(type){
	
	if (type == 'create' || type == 'copy') {
		try {
			if (findMasterRec(nlapiGetFieldValue('custrecordr7proddatamaster_opp')) != null){
				throw nlapiCreateError('DUPLICATE_ERROR', 'Master Record Already Exists', true);
			}
		} 
		catch (e) {
			 if (e.getCode() == 'DUPLICATE_ERROR'){
			 	throw nlapiCreateError(e.getCode(), e.getDetails(), false);
			 } 
		}
	}
	
	if (type == 'delete'){
		deleteChildren(type);
	}
}

function afterSubmit(type){
	if (type != 'delete') {
		try {
			
			var oppId = nlapiLookupField(nlapiGetRecordType(), nlapiGetRecordId(), 'custrecordr7proddatamaster_opp');
			updateChildOppFields(oppId);
			updateOppTotal(oppId);
		} 
		catch (e) {
			var adminUser =  nlapiLoadConfiguration('companypreferences').getFieldValue('custscriptr7_system_info_email_sender');
			nlapiSendEmail(adminUser, adminUser, 'Error ProdDataMaster afterSubmit', 'Error: ' + e);
		}
	}
}

function updateOppTotal(oppId){

	var newProjTotal = 0;
	
	if (oppId != null && oppId != '') {

		var arrFilters = new Array();
		arrFilters[arrFilters.length] = new nlobjSearchFilter('isinactive', null, 'is', 'F');
		arrFilters[arrFilters.length] = new nlobjSearchFilter('custrecordr7competproddataopportunity', null, 'anyof', oppId);
		arrFilters[arrFilters.length] = new nlobjSearchFilter('probability', 'custrecordr7competproddataopportunity', 'lessthan', 100); 
		
		var arrColumns = new Array();
		arrColumns[0] = new nlobjSearchColumn('custrecordr7competproddataopportunity', null, 'group');
		arrColumns[1] = new nlobjSearchColumn('formulacurrency', null, 'sum');
		arrColumns[1].setFormula("CASE WHEN {custrecordr7competproddataconclusion.id} = ANY(2, 3) THEN 0 ELSE {custrecordr7competproddataprojtotal} END");
		
		var arrSearchResults = nlapiSearchRecord('customrecordr7competitiveproductdata', null, arrFilters, arrColumns);
		
		if (arrSearchResults != null && arrSearchResults.length > 0){
			newProjTotal = arrSearchResults[0].getValue(arrColumns[1]);

			nlapiSubmitField('opportunity', oppId, 'projectedtotal', newProjTotal);
		}
	
	}
	
}

function findMasterRec(oppId){

    if (oppId != null && oppId != '') {
    
        var searchFilters = new Array(new nlobjSearchFilter('custrecordr7proddatamaster_opp', null, 'is', oppId));
        var searchColumns = new Array(new nlobjSearchColumn('internalid'));
        
        var searchResults = nlapiSearchRecord('customrecordr7productdatamaster', null, searchFilters, searchColumns);
        
        if (searchResults != null && searchResults.length >= 1) {
        
            var masterId = searchResults[0].getValue(searchColumns[0]);
            
            return masterId;
        }
        
    }
    return null;
}

function updateChildOppFields(oppId, id){
	
	if (id == null || id == ''){
		id = nlapiGetRecordId();
	}

	if (id != null && id != '' && oppId != null && oppId != '') {
		var arrFilters = new Array();
		arrFilters[0] = new nlobjSearchFilter('custrecordr7productdata_masterrec', null, 'anyof', id);
		arrFilters[0].setLeftParens(1);
		arrFilters[1] = new nlobjSearchFilter('custrecordr7competproddataopportunity', null, 'noneof', oppId);
		arrFilters[1].setRightParens(1);
		arrFilters[1].setOr(true);
		arrFilters[2] = new nlobjSearchFilter('custrecordr7productdata_masterrec', null, 'noneof', id);
		arrFilters[2].setLeftParens(1);
		arrFilters[3] = new nlobjSearchFilter('custrecordr7competproddataopportunity', null, 'anyof', oppId);
		arrFilters[3].setRightParens(1);

		var arrColumns = new Array();
		arrColumns[0] = new nlobjSearchColumn('internalid');
		
		var arrSearchResults = nlapiSearchRecord('customrecordr7competitiveproductdata', null, arrFilters, arrColumns);
		
		for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
			nlapiSubmitField('customrecordr7competitiveproductdata', arrSearchResults[i].getId(), new Array('custrecordr7competproddataopportunity', 'custrecordr7productdata_masterrec'), new Array(oppId, id));
		}
	}
}

function deleteChildren(type){
	
	if (type == 'delete') {
		var id = nlapiGetRecordId();
		
		if (id != null && id != '') {
			var arrFilters = new Array();
			arrFilters[arrFilters.length] = new nlobjSearchFilter('custrecordr7productdata_masterrec', null, 'is', id);
			
			var arrColumns = new Array();
			arrColumns[0] = new nlobjSearchColumn('internalid');
			
			var arrSearchResults = nlapiSearchRecord('customrecordr7competitiveproductdata', null, arrFilters, arrColumns);
			
			for (var i = 0; arrSearchResults != null && i < arrSearchResults.length && arrSearchResults.length <= 25; i++) {
				nlapiDeleteRecord('customrecordr7competitiveproductdata', arrSearchResults[i].getId());
			}
		}
	}
}
