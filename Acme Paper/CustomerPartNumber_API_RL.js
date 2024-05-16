/* Restlet that return Customer Part Number details */

var REC_SCM_CUSTOMERPARTNUMBER = 'customrecord_scm_customerpartnumber'; 
var FLD_SCM_CPN_CUSTOMER = 'custrecord_scm_cpn_customer'; 
var FLD_SCM_CPN_ITEM = 'custrecord_scm_cpn_item'; 
var FLD_SCM_CPN_SUBSIDIARY = 'custrecord_scm_cpn_subsidiary';
  
function getData(datain)
{
    var aColSearch = []; 
    var aFltSearch = []; 
    var aReturn = []; 
    var aResult; 
    var param = JSON.parse(datain);
  
    if(!param.customer_id) {
        return JSON.stringify({error: 'Empty customer_id parameter.'});    
    }
    
    aColSearch.push(new nlobjSearchColumn('name').setSort()); 
    aColSearch.push(new nlobjSearchColumn(FLD_SCM_CPN_CUSTOMER)); 
    aColSearch.push(new nlobjSearchColumn(FLD_SCM_CPN_ITEM)); 
    aColSearch.push(new nlobjSearchColumn(FLD_SCM_CPN_SUBSIDIARY)); 
  
    aFltSearch.push(new nlobjSearchFilter(FLD_SCM_CPN_CUSTOMER,'null','is',param.customer_id)); 
 
    aResult = nlapiSearchRecord(REC_SCM_CUSTOMERPARTNUMBER, null, aFltSearch, aColSearch);
 
 	if(typeof aResult !== 'undefined' && aResult) {
    	aResult.forEach(function(oItem) { 
        	aReturn.push({ 
            	customer_part_number: oItem.getValue('name'), 
            	customer_id: oItem.getValue(FLD_SCM_CPN_CUSTOMER), 
            	customer: oItem.getText(FLD_SCM_CPN_CUSTOMER), 
            	item_id: oItem.getValue(FLD_SCM_CPN_ITEM), 
            	item: oItem.getText(FLD_SCM_CPN_ITEM), 
            	subsidiary_id: oItem.getValue(FLD_SCM_CPN_SUBSIDIARY), 
            	subsidiary: oItem.getText(FLD_SCM_CPN_SUBSIDIARY), 
        	}); 
    	}); 
    }

    return JSON.stringify(aReturn);
}