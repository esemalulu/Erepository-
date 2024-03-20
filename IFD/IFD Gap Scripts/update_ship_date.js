nlapiLogExecution("audit","FLOStart",new Date().getTime());
/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       30 Dec 2016     Rafe Goldbach, Suitelaunch LLC
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
function beforeSubmit(type){
	var shipdate = nlapiGetFieldValue('shipdate');
	nlapiLogExecution('debug','shipdate',shipdate);
	var lineItems = nlapiGetLineItemCount('item');
	nlapiLogExecution('debug','lineItems',lineItems);
	for (var j = 0; j < lineItems; j++) {
		var linedate = nlapiGetLineItemValue('item','expectedshipdate',j+1);
		if (linedate != shipdate){
			nlapiSelectLineItem('item',j+1);
			nlapiSetCurrentLineItemValue('item','expectedshipdate',shipdate);
			nlapiCommitLineItem('item');
			nlapiLogExecution('debug','set date',shipdate);			
		}	
	}
}

// need to also run on PO's and interco sales order ue'
// note that there is a workflow running on PO for ship date based on lead time (marco)