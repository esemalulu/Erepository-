/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       29 Apr 2016     clayr
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit,
 *                      approve, cancel, reject (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF only)
 *                      dropship, specialorder, orderitems (PO only) 
 *                      paybills (vendor payments)
 * @returns {Void}
 */
function afterSubmitUpdateOptQueueStaleStatus(type){
	
	try {
		
		if (type == 'edit') {
			
			var recItem = nlapiGetNewRecord();
			var recordType = recItem.getRecordType();
			var recordId = nlapiGetRecordId();
			
			var recordStatus = recItem.getFieldValue('custentityaccount_status_c');

			var optStatusField = 'custrecordoptstalepartnerstatus';
						
			if (recordStatus) {
				
				var columns = new Array();
				var filters = new Array();
				
				// Define columns to return and search filter criteria.
				columns[0] = new nlobjSearchColumn('internalid');
				columns[1] = new nlobjSearchColumn('custrecordetailzcustom_opt_recordtype');
				columns[2] = new nlobjSearchColumn('custrecordopt_source_id_c');
				filters[0] = new nlobjSearchFilter('custrecordopt_source_id_c',null,'is',recordId);
				filters[1] = new nlobjSearchFilter('custrecordetailzcustom_opt_recordtype',null,'is','7');
	
				// Search for Opt Queue records and return just the desired columns
				var searchRecords = nlapiSearchRecord('customrecord246',null,filters,columns);
				
				var j = 0;
				
				// Loop through returned records and update the status field.
				for (var i in searchRecords) {
					
					j++;
					
					var optInternalId = searchRecords[i].getId();
					var optRecordType = searchRecords[i].getValue('custrecordetailzcustom_opt_recordtype');
					
					nlapiSubmitField('customrecord246',optInternalId,optStatusField,recordStatus);
					
					nlapiLogExecution('DEBUG', 'Update Opt Status 1', 'Partner Record Status: ' + recordStatus + '; optInternalId: ' + optInternalId + 
							'; optRecordType: ' + optRecordType);
					
				}
				
			}
			
			nlapiLogExecution('DEBUG', 'Update Opt Status 2', 'type: ' + type + '; internalId: ' + recordId + '; Total Records: ' + j + 
					'; Record Status: ' + recordStatus + '; Opt Status Field: ' + optStatusField + '; Record Type: ' + recordType + '; Opt InternalId: ' + optInternalId);
			
		}
		
	} catch (err) {
		
		nlapiLogExecution('ERROR', 'Update Opt Status', 'type: ' + type + '; internalId: ' + recordId + 
				'; errName: ' + err.name + '; errMsg: ' + err.message);
		
	}
 
  
}
