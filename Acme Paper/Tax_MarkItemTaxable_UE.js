
//This scripts set the line item if taxable based on the Customer - Item Tax Type Mapping

var REC_CUST_ITEM_TAXTYPEMAPPING = 'customrecord_cust_item_taxtypemapping'; 
var FLD_CITTM_ITEM_TAX_TYPE = 'custrecord_cittm_item_tax_type'; 
var FLD_CITTM_TAXABLE = 'custrecord_cittm_taxable'; 
var FLD_CITTM_CUSTOMER_TAX_TYPE = 'custrecord_cittm_customer_tax_type'; 
var FLD_CUSTOMER_TAX_TYPE = 'custentity_tax_type';
var FLD_ITEM_TAX_TYPE = 'custitem_tax_type';

/**
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @return {void}
 */
function setTaxableBeforeLoad(type, form, request) {
    if(nlapiGetLineItemField('item', 'istaxable', 1) !=null) {
        nlapiGetLineItemField('item', 'istaxable', 1).setDisplayType('disabled');
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
function setTaxableBeforeSubmit(type){
    var idItemTaxType = null;
    var oTaxMapping;
    
    if(nlapiGetFieldValue('entity')) {
        oTaxMapping = getTaxTypeMappingOfCustomer(nlapiGetFieldValue('entity'));
        
        for(var nFlag=1;nFlag<=nlapiGetLineItemCount('item');nFlag++) {
            idItemTaxType = nlapiLookupField('item',nlapiGetLineItemValue('item','item',nFlag),FLD_ITEM_TAX_TYPE);

            if(idItemTaxType) {
                if(oTaxMapping[nlapiGetFieldValue('entity')] && oTaxMapping[nlapiGetFieldValue('entity')][idItemTaxType]) {
                    if(nlapiGetLineItemValue('item','istaxable',nFlag) != oTaxMapping[nlapiGetFieldValue('entity')][idItemTaxType]) {
                        nlapiSetLineItemValue('item','istaxable',nFlag,oTaxMapping[nlapiGetFieldValue('entity')][idItemTaxType]);
                    }
                }
            }
        }
    }
}


/**
 * This function returns the customer - item mapping
 * 
 * @param {ID} Customer Id
 * @returns {Object}
 */
function getTaxTypeMappingOfCustomer(idCustomer) 
{ 
    var aColSearch = []; 
    var aFltSearch = []; 
    var oReturn = {}; 
    var aResult; 
    var idCustomerTaxType = nlapiLookupField('customer',idCustomer,FLD_CUSTOMER_TAX_TYPE);
    var oTaxMapping = {};
  
    if(idCustomerTaxType) {
        aColSearch.push(new nlobjSearchColumn(FLD_CITTM_ITEM_TAX_TYPE)); 
        aColSearch.push(new nlobjSearchColumn(FLD_CITTM_TAXABLE)); 
        aFltSearch.push(new nlobjSearchFilter(FLD_CITTM_CUSTOMER_TAX_TYPE,'null','is',idCustomerTaxType)); 
        aResult = nlapiSearchRecord(REC_CUST_ITEM_TAXTYPEMAPPING, null, aFltSearch, aColSearch); 

        if(typeof aResult !== 'undefined' && aResult) {
            aResult.forEach(function(oItem) {
                oReturn[oItem.getValue(FLD_CITTM_ITEM_TAX_TYPE)] = oItem.getValue(FLD_CITTM_TAXABLE);
            }); 

            oTaxMapping[idCustomer] = oReturn;
        }
    }
    
    return oTaxMapping;
}