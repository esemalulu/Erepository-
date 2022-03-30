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
function beforeSubmitItemVariance(type){
	
	try {
		
		if (type == 'create' || type == 'edit') {
			
			var newRecord = nlapiGetNewRecord();
			
			var etailzSku = newRecord.getFieldValue('itemid');
			var recType = newRecord.getRecordType();
			var location = newRecord.getFieldText('location');
			var qtyVarianceAcct = null;
			
			switch (location) {
				case 'US':
					qtyVarianceAcct = '177';	// 5150 US COGS
					break;
				case 'International : DE':
					qtyVarianceAcct = '191';	//	5183 FBA DE COGS
					break;
				case 'International : CA':
					qtyVarianceAcct = '176';	//	5145 CA COGS
					break;
				case 'International : UK':
					qtyVarianceAcct = '175';	// 5140 UK COGS
					break;
				case 'International : JP':
					qtyVarianceAcct = '189';	// 5181 FBA JP COGS
					break;
				case 'International : MX':
					qtyVarianceAcct = '177';	// 5150 US COGS
					break;
				default:
					qtyVarianceAcct = '177';	// 5150 US COGS
			}
			
			newRecord.setFieldValue('billqtyvarianceacct',qtyVarianceAcct);
			
			nlapiLogExecution('DEBUG', 'Update Item Variance', 'type: ' + type + '; etailzSku: ' + etailzSku + '; recType: ' + recType + 
								'; Location: ' + location + '; QtyVariance: ' + qtyVarianceAcct);
			
		}
		
	} catch (err) {
		
		nlapiLogExecution('ERROR', 'Update Item Variance', 'type: ' + type + '; etailzSku: ' + etailzSku + '; recType: ' + recType +
				'; errName: ' + err.name + '; errMsg: ' + err.message);
		
	}
 
}

