nlapiLogExecution("audit","FLOStart",new Date().getTime());
/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       20 Sep 2016     Rafe Goldbach, SuiteLaunch LLC
 *
 */
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
function beforeSubmit(type) {
    // if there are any lines on the order marked as restricted then send this order to pending approval stage
	
	var notRestricted = nlapiGetFieldValue('custbody_restrict_items_approved');
	
    if ((type == 'create' || type == 'edit' || type == 'approve')&&notRestricted=='F') {

        var lineCount = nlapiGetLineItemCount('item');
        var restricted = 'F';
        var customer = nlapiGetFieldValue('entity');
        var status = nlapiGetFieldValue('orderstatus');
        //nlapiLogExecution('debug', 'status', status);

        var fields = new Array();
        fields[0] = 'category';
        fields[1] = 'custentityifd_chain_name';
        var columns = nlapiLookupField('customer', customer, fields);
        var custCat = columns.category;
        var custChain = columns.custentityifd_chain_name;
        if(!custChain){custChain='Not Specified'};
        if(!custCat){custCat='Not Specified'};
        nlapiLogExecution('debug', 'lineCount', lineCount);
        var restrictOrder = 'PASS';
        for (var j = 0; j < lineCount; j++) { // loop through all of the lines on the sales order checking for the restricted flag
            var lineRestrict = nlapiGetLineItemValue('item', 'custcol_ifd_restricted_item', j + 1);
            nlapiLogExecution('debug', 'restricted', lineRestrict);
            // if a restricted line is found then fail this line unless the customer chain or customer category is found in the proprietary list
            if (lineRestrict == 'T') {
                restrictOrder = 'FAIL';// if line restrict is true then default this line item to fail
                nlapiLogExecution('debug', 'restricted line found', j + 1);
                var item = nlapiGetLineItemValue('item', 'item', j + 1);

                //first check to see if the item is retricted to a list of customers
                
                var itemRec = nlapiLoadRecord('inventoryitem', item);
                var propCustList = itemRec.getFieldValues('custitem_prop_cust_list');
                if (propCustList) {
                    for (var p = 0; p < propCustList.length; p++) {
                        var propCustomer = propCustList[p];
                        nlapiLogExecution('debug', 'propCustList', propCustomer);
                        if (customer == propCustomer) {
                            restrictOrder = 'PASS';
                            nlapiLogExecution('debug', 'restrict order', 'set to pass');
                        }
                    }
                }
                
                // next search for all proprietary items custom records to see if this item can be sold to the customer chain or category
                var filters = new Array();
                filters[0] = new nlobjSearchFilter('internalid', null, 'is', item);
                // get the proprietary list for the item
                var propList = nlapiSearchRecord('inventoryitem', 'customsearch_prop_search', filters);
                if (!propList) {
                    nlapiLogExecution('debug', 'search error', 'No prorprietary list found on the item record');
                }

                if (propList && restrictOrder == 'FAIL') {// only run this section if the prior test has not passed
                    nlapiLogExecution('debug', 'proplist found', propList.length);
                    for (var k = 0; k < propList.length; k++) {
                        // loop through the proprietary list
                        var list = propList[k].getAllColumns();
                        var propCat = propList[k].getValue(list[1]);
                        var propChain = propList[k].getValue(list[2]);
                        nlapiLogExecution('debug', 'restrictOrder', restrictOrder);
                        nlapiLogExecution('debug', 'propCat', propCat);
                        nlapiLogExecution('debug', 'propChain', propChain);
                        nlapiLogExecution('debug', 'custCat', custCat);
                        nlapiLogExecution('debug', 'custChain', custChain);
                        // if the proprietary category matches the customer category OR the proprietary chain equals the customer chain
                        // then PASS the test
                        if (propCat == custCat || propChain == custChain) {
                            restrictOrder = 'PASS';
                            nlapiLogExecution('debug', 'passed tests', restrictOrder);
                            k = propList.length; // EXIT LOOP
                        }
                    } // End loop through prop list
                }
                if (restrictOrder == 'FAIL') {
                    j = lineCount; // end the loop through lines and fail the order
                } // end loop through the line items            
            } // end processing this line
        }

        if (restrictOrder == 'FAIL') {

            nlapiSetFieldValue('orderstatus', 'A');
            var memo = nlapiGetFieldValue('memo');
            memo += '******RESTRICTED ITEM(S) FOUND******';
            nlapiSetFieldValue('memo', memo);
        }
        nlapiLogExecution('debug', 'restrictOrder', restrictOrder);
    }
}