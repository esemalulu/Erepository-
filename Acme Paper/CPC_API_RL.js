/* Restlet that return CPC details */

var REC_ACME_CUST_PRICE_CONTRACTS = 'customrecord_acme_cust_price_contracts'; 
var FLD_ACME_CPC_START_DATE = 'custrecord_acme_cpc_start_date'; 
var FLD_ACME_CPC_END_DATE = 'custrecord_acme_cpc_end_date'; 
var FLD_ACME_CPC_CONTRACT_REF_NO = 'custrecord_acme_cpc_contract_ref_no'; 
var FLD_ACME_CPC_LINE_CUSTOMER = 'custrecord_acme_cpc_line_customer'; 
var FLD_ACME_CPC_CUST_HEADER = 'custrecord_acme_cpc_cust_header'; 
var FLD_ACME_CPC_LINE_DESCRIPTION = 'custrecord_acme_cpc_line_description'; 
var FLD_ACME_CPC_ITEM_HEADER = 'custrecord_acme_cpc_item_header'; 
var FLD_ACME_CPC_LINE_ITEM = 'custrecord_acme_cpc_line_item'; 
var FLD_ACME_CPC_LINE_COST = 'custrecord_acme_cpc_line_cost'; 
var FLD_ACME_CPC_LINE_PRICE = 'custrecord_acme_cpc_line_price'; 
var FLD_ACC_CPCL_SALE_UNIT = 'custrecord_acc_cpcl_sale_unit'; 
  
function getData(datain)
{
    var aColSearch = []; 
    var aFltSearch = []; 
    var aReturn = {}; 
    var aReturnArr = []; 
    var aResult; 
    var param = JSON.parse(datain);
  
    if(!param.customer_id) {
        return JSON.stringify({error: 'Empty customer_id parameter.'});    
    }
    
    aColSearch.push(new nlobjSearchColumn('name').setSort()); 
    aColSearch.push(new nlobjSearchColumn(FLD_ACME_CPC_START_DATE)); 
    aColSearch.push(new nlobjSearchColumn(FLD_ACME_CPC_END_DATE)); 
    aColSearch.push(new nlobjSearchColumn(FLD_ACME_CPC_CONTRACT_REF_NO)); 
    aColSearch.push(new nlobjSearchColumn(FLD_ACME_CPC_LINE_CUSTOMER,FLD_ACME_CPC_CUST_HEADER)); 
    aColSearch.push(new nlobjSearchColumn(FLD_ACME_CPC_CUST_HEADER,FLD_ACME_CPC_CUST_HEADER)); 
    aColSearch.push(new nlobjSearchColumn(FLD_ACME_CPC_LINE_DESCRIPTION,FLD_ACME_CPC_ITEM_HEADER)); 
    aColSearch.push(new nlobjSearchColumn(FLD_ACME_CPC_ITEM_HEADER,FLD_ACME_CPC_ITEM_HEADER)); 
    aColSearch.push(new nlobjSearchColumn(FLD_ACME_CPC_LINE_ITEM,FLD_ACME_CPC_ITEM_HEADER).setSort()); 
    aColSearch.push(new nlobjSearchColumn(FLD_ACME_CPC_LINE_COST,FLD_ACME_CPC_ITEM_HEADER)); 
    aColSearch.push(new nlobjSearchColumn(FLD_ACME_CPC_LINE_PRICE,FLD_ACME_CPC_ITEM_HEADER)); 
    aColSearch.push(new nlobjSearchColumn(FLD_ACC_CPCL_SALE_UNIT,FLD_ACME_CPC_ITEM_HEADER)); 
  
    aFltSearch.push(new nlobjSearchFilter(FLD_ACME_CPC_LINE_CUSTOMER,FLD_ACME_CPC_CUST_HEADER,'is',param.customer_id)); 
 
    aResult = nlapiSearchRecord(REC_ACME_CUST_PRICE_CONTRACTS, null, aFltSearch, aColSearch); 
 
 	if(typeof aResult !== 'undefined' && aResult) {
    	aResult.forEach(function(oItem) { 
            
            if(!aReturn[oItem.getId()]) {
                aReturn[oItem.getId()] = {
                    internal_id: oItem.getId(),
                    name: oItem.getValue('name'),
            	    customer_id: oItem.getValue(FLD_ACME_CPC_LINE_CUSTOMER,FLD_ACME_CPC_CUST_HEADER), 
            	    customer: oItem.getText(FLD_ACME_CPC_LINE_CUSTOMER,FLD_ACME_CPC_CUST_HEADER), 
                    start_date: oItem.getValue(FLD_ACME_CPC_START_DATE), 
                    end_date: oItem.getValue(FLD_ACME_CPC_END_DATE), 
            	    contract_reference_no: oItem.getValue(FLD_ACME_CPC_CONTRACT_REF_NO), 
                    line: []
                };
            }
            
        	aReturn[oItem.getId()].line.push({ 
            	item_id: oItem.getValue(FLD_ACME_CPC_LINE_ITEM,FLD_ACME_CPC_ITEM_HEADER), 
            	item: oItem.getText(FLD_ACME_CPC_LINE_ITEM,FLD_ACME_CPC_ITEM_HEADER), 
            	description: oItem.getValue(FLD_ACME_CPC_LINE_DESCRIPTION,FLD_ACME_CPC_ITEM_HEADER), 
            	loaded_cost: oItem.getValue(FLD_ACME_CPC_LINE_COST,FLD_ACME_CPC_ITEM_HEADER), 
            	price: oItem.getValue(FLD_ACME_CPC_LINE_PRICE,FLD_ACME_CPC_ITEM_HEADER), 
            	sale_unit_id: oItem.getValue(FLD_ACC_CPCL_SALE_UNIT,FLD_ACME_CPC_ITEM_HEADER),
            	sale_unit: oItem.getText(FLD_ACC_CPCL_SALE_UNIT,FLD_ACME_CPC_ITEM_HEADER) 
        	}); 
    	}); 
    }
    
    for (var key in aReturn) {
        if (aReturn.hasOwnProperty(key)) {
            aReturnArr.push(aReturn[key]);
        }
    }
    
    return JSON.stringify(aReturnArr);
}