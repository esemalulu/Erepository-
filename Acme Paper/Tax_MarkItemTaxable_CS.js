
//This scripts set the line item if taxable based on the Customer - Item Tax Type Mapping

var REC_CUST_ITEM_TAXTYPEMAPPING = 'customrecord_cust_item_taxtypemapping'; 
var FLD_CITTM_ITEM_TAX_TYPE = 'custrecord_cittm_item_tax_type'; 
var FLD_CITTM_TAXABLE = 'custrecord_cittm_taxable'; 
var FLD_CITTM_CUSTOMER_TAX_TYPE = 'custrecord_cittm_customer_tax_type'; 
var FLD_CUSTOMER_TAX_TYPE = 'custentity_tax_type';
var FLD_ITEM_TAX_TYPE = 'custitem_tax_type';

var oTaxMapping = {};

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType 
 * 
 * @param {String} type Access mode: create, copy, edit
 * @returns {Void}
 */
function setTaxablePageInit(type){
    if(nlapiGetFieldValue('entity')) {
        setTaxTypeMappingOfCustomer(nlapiGetFieldValue('entity'));
    }
}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}
 */
function setTaxableFieldChanged(type, name, linenum){
    var idItemTaxType = null;
    
    if(name == 'entity' && nlapiGetFieldValue('entity')) {
        setTaxTypeMappingOfCustomer(nlapiGetFieldValue('entity'));
    }
    
    if(name == 'shipaddresslist') {
        setTimeout(function(){ 
            updateItemTax();
        }, 5000);
    }
    
    if(nlapiGetFieldValue('entity')) {
        if(type == 'item' && name == 'item') {
            if(nlapiGetCurrentLineItemValue('item','item')) {
                idItemTaxType = nlapiLookupField('item',nlapiGetCurrentLineItemValue('item','item'),FLD_ITEM_TAX_TYPE);

                if(idItemTaxType) {
                    if(oTaxMapping[nlapiGetFieldValue('entity')] && oTaxMapping[nlapiGetFieldValue('entity')][idItemTaxType]) {
                        setTimeout(function(){ 
                            nlapiSetCurrentLineItemValue('item','istaxable',oTaxMapping[nlapiGetFieldValue('entity')][idItemTaxType]);
                        }, 1000);
                    }
                }
            }
        }
    }
}

/**
 * This function updates the line items if taxable
 * 
 * @returns {Void}
 */
function updateItemTax() {
    if(nlapiGetFieldValue('entity')) {
        setTaxTypeMappingOfCustomer(nlapiGetFieldValue('entity'));
        
        for(var nFlag=1;nFlag<=nlapiGetLineItemCount('item');nFlag++) {
            idItemTaxType = nlapiLookupField('item',nlapiGetLineItemValue('item','item',nFlag),FLD_ITEM_TAX_TYPE);

            if(idItemTaxType) {
                if(oTaxMapping[nlapiGetFieldValue('entity')] && oTaxMapping[nlapiGetFieldValue('entity')][idItemTaxType]) {
                    nlapiSetLineItemValue('item','istaxable',nFlag,oTaxMapping[nlapiGetFieldValue('entity')][idItemTaxType]);
                }
            }
        }
        
        if(nlapiGetLineItemCount('item') >= 1) {
            nlapiSelectLineItem('item', nlapiGetLineItemCount('item'));
        }
    }
}

/**
 * This function sets the customer - item mapping
 * 
 * @param {ID} Customer Id
 * @returns {Void}
 */
function setTaxTypeMappingOfCustomer(idCustomer) 
{ 
    var aColSearch = []; 
    var aFltSearch = []; 
    var oReturn = {}; 
    var aResult; 
    var idCustomerTaxType = nlapiLookupField('customer',idCustomer,FLD_CUSTOMER_TAX_TYPE);
  
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
}