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
function afterSubmitUpdateOptQueueStatus(type){
	
	try {
		
		if (type == 'edit') {
			
			var recItem = nlapiGetNewRecord();
			
			var recordType = recItem.getRecordType();
			
			var recordId = nlapiGetRecordId();
			
			switch(recordType) {
			    case 'customrecorddiscounts':
					var recordStatus = nlapiGetFieldValue('custrecorddiscounts_status_c');
					var followUpDate = nlapiGetFieldValue('custrecorddisc_fup_date');	// Date Type
					var optField = 'custrecordopt_discount_status_c';
			        break;
			    case 'customrecord51':
					var recordStatus = nlapiGetFieldValue('custrecordlts_status_c');
					var followUpDate = nlapiGetFieldValue('custrecordetailz_aginginv_fup_date_c');	// Date Type
					var optField = 'custrecordopt_ai_status_c';
			        break;
			    case 'customrecordetailz_first_to_market':
					var recordStatus = nlapiGetFieldValue('custrecordftm_status_record_list');
					var followUpDate = '';
					var optField = 'custrecordopt_ftm_status_c';
			        break;
			    case 'customrecordmarketplace_marketing':
					var recordStatus = nlapiGetFieldValue('custrecordetailz_mpm_prt_status_c');
					var followUpDate = nlapiGetFieldValue('custrecordmpm_follow_up_date_c');	// Date-Time Type
					var optField = 'custrecordopt_mpm_status_c';
			        break;
			    default:
					var recordStatus = null;
			    	var followUpDate = '';
			    	var optField = null;
			}
			
			if (followUpDate != '') {
				
				if (followUpDate.length > 10) {
					var indexSpace = followUpDate.indexOf(' ');
					followUpDate = followUpDate.substring(0,indexSpace);
				}
				
			}
			
			if (recordStatus) {
				
				var columns = new Array();
				var filters = new Array();
				
				// Define columns to return and search filter criteria.
				columns[0] = new nlobjSearchColumn('internalid');
				columns[1] = new nlobjSearchColumn('custrecordetailzcustom_opt_recordtype');
				columns[2] = new nlobjSearchColumn('custrecordopt_source_id_c');
				filters[0] = new nlobjSearchFilter('custrecordopt_source_id_c',null,'is',recordId);
	
				// Search for Bin records and return just the desired columns
				var searchRecords = nlapiSearchRecord('customrecord246',null,filters,columns);
				
				var j = 0;
				
				// Loop through returned records and update the status field.
				for (var i in searchRecords) {
					
					j++;
					
					var optInternalId = searchRecords[i].getId();
					
					nlapiSubmitField('customrecord246',optInternalId,optField,recordStatus);
					
					nlapiLogExecution('DEBUG', 'Update Follow-up Date', 'Opt Follow-up date: ' + followUpDate + "; optInternalId: " + optInternalId);
					nlapiSubmitField('customrecord246',optInternalId,'custrecord61',followUpDate);
					
				}
				
			}
			
			nlapiLogExecution('DEBUG', 'Update Opt Status', 'type: ' + type + '; internalId: ' + recordId + '; Total Records: ' + j + 
					'; Record Status: ' + recordStatus + '; Opt Field: ' + optField + '; Record Type: ' + recordType + '; Opt InternalId: ' + optInternalId);
			
		}
		
	} catch (err) {
		
		nlapiLogExecution('ERROR', 'Update Opt Status', 'type: ' + type + '; internalId: ' + recordId + 
				'; errName: ' + err.name + '; errMsg: ' + err.message);
		
	}
 
  
}
