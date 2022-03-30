/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       27 Jul 2015     clayr
 *
 */

/**
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function massUpdateVendorStatusStale(recType, recId) {
	
	try {
		if (recType == 'vendor') {
			
			var recVendor = nlapiLoadRecord(recType, recId);
			var venName = recVendor.getFieldValue('companyname');
			var venSeasonal = recVendor.getFieldValue('custentityworkflow_seasonal');
			var venPartnerStatus = recVendor.getFieldValue('custentityaccount_status_c');
			
			var columns = new Array();
			var filters = new Array();
			
			// Define columns to return and search filter criteria.
			columns[0] = new nlobjSearchColumn('internalid',null,'count');
			columns[1] = new nlobjSearchColumn('datecreated',null,'max');
			filters[0] = new nlobjSearchFilter('entity',null,'is',recId);
			filters[1] = new nlobjSearchFilter('custbodyetailz_po_solution',null,'noneOf',[5,6,7,8,9,10]);
			filters[2] = new nlobjSearchFilter('datecreated',null,'after','4/1/2015').setSummaryType('max');

			// Search for Bin records and return just the desired columns
			var searchRecords = nlapiSearchRecord('purchaseorder',null,filters,columns);
			
			var currDate = new Date();
			var lastCreatedDate = currDate;
			var poCount = 0;
			
			// Loop through returned records and get the latest creation date.
			for (var i in searchRecords) {
				
				var poCount = searchRecords[i].getValue('internalid',null,'count');
				var poCreatedDate = searchRecords[i].getValue('datecreated',null,'max');
				
				var lastCreatedDate = new Date(poCreatedDate);

			}
			
			if (poCount > 0) {
				var timeDiff = currDate - lastCreatedDate;
				var dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
			} else {
				dayDiff = 0
			}
			
			nlapiSubmitField(recType,recId,'custentity_days_since_last_po',dayDiff);
			
			if ((dayDiff > 120) && (venSeasonal == 'F')) {
				
				// If greater than 120 days then Set status to Stale 
				nlapiSubmitField(recType,recId,'custentityaccount_status_c','3');
				
			} else if ((dayDiff <= 120) && (venPartnerStatus == '3')) {
				
				// If less than 120 days and Stale then Set status to Active
				nlapiSubmitField(recType,recId,'custentityaccount_status_c','1');
				
			}
			
			nlapiLogExecution('DEBUG', 'Update Vendor Status Stale', 'recType: ' + recType + '; recId: ' + recId + '; poCreatedDate: ' + poCreatedDate + 
					'; lastCreatedDate: ' + lastCreatedDate.toString() + '; venName: ' + venName + '; TotalPOs: ' + poCount + '; dayDiff: ' + dayDiff + 
					'; timeDiff: ' + timeDiff + '; venPartnerStatus: ' + venPartnerStatus);
			
		}
		
	} catch (err) {
		
		nlapiLogExecution('ERROR', 'Update Vendor Status Stale', 'recType: ' + recType+ '; internalId: ' + recId +  
				'; errCode: ' + err.name + '; err: ' + err.message);
			
	}
	
}
