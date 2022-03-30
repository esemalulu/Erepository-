/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       15 Jul 2015     clayr
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord InventoryItem
 * 
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */
function afterSubmitInventoryItem(type){
	
		if (type == 'create' || type == 'edit') {
			var newRecord = nlapiGetNewRecord();
			var EBID = newRecord.getFieldValue('itemid');
			var internalId = newRecord.getFieldValue('id');
        	var type = newRecord.getFieldValue('type');
			nlapiSubmitField('inventoryitem',internalId,'externalid',EBID);
		}
	}  

