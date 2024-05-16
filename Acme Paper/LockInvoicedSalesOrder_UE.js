/**
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @return {void}
 */
function lockRecordBeforeLoad(type, form, request) {
    if(type == 'view') {
        if(hasInvoice(nlapiGetRecordId())) {
            form.removeButton('edit');
        }
    } else if(type == 'edit') { 
        if(hasInvoice(nlapiGetRecordId())) {
            nlapiSetRedirectURL('RECORD','salesorder',nlapiGetRecordId(),'view');
        }
    }
}


/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */
function lockRecordBeforeSubmit(type){
 // var userID = 3;
 // var currentUser = nlapiGetRole();
    if(type == 'edit') {
        if(hasInvoice(nlapiGetRecordId()) /*&& currentUser != userID */) {
            throw nlapiCreateError('LOCKED_RECORD', 'Unable to save changes (ID: '+nlapiGetRecordId()+'). This is a locked record.');
        }
    }
}

  
function hasInvoice(idSO) 
{ 
    var aColSearch = []; 
    var aFltSearch = []; 
    var bReturn = false; 
    var aResult; 
  
    if(idSO){
        aColSearch.push(new nlobjSearchColumn('createdfrom')); 

        aFltSearch.push(new nlobjSearchFilter('type','null','anyof',['CustInvc'])); 
        aFltSearch.push(new nlobjSearchFilter('mainline','null','is','T')); 
        aFltSearch.push(new nlobjSearchFilter('formulanumeric','null','greaterthan','1').setFormula('SYSDATE-{datecreated}')); 
        aFltSearch.push(new nlobjSearchFilter('createdfrom','null','is',idSO)); 

        aResult = nlapiSearchRecord('transaction', null, aFltSearch, aColSearch); 

        if(typeof aResult !== 'undefined' && aResult) {
            aResult.forEach(function(oItem) { 
                bReturn = true;
            }); 
        }
    }
    return bReturn; 
} 