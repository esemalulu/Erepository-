/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       10 Aug 2016     billk
 *
 */

/**
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */

function MassUpdateDailyFPNAPurchasingActuals(recType, recId) {
	
	try {
		
		if (recType == 'customrecordfpnalines') {
			
			var recLine = nlapiLoadRecord(recType, recId);
                        var recLineEntity = recLine.getFieldText('custrecordpartner');
                        var recLineDate = recLine.getFieldValue('custrecordfpnalinesmonth');



                        var columns = new Array();
			var filters = new Array();

                      // Define columns to return and search filter criteria.
			columns[0] = new nlobjSearchColumn('name',null,'group');
			columns[1] = new nlobjSearchColumn('amount',null,'sum');
			filters[0] = new nlobjSearchFilter('datecreated',null,'within','thisMonth');
                       

                       // Search Purchase Orders and return MTD total
 			var searchRecords = nlapiSearchRecord('purchaseorder',null,filters,columns);
			
			var poValue = 0;
                        var searchEntity = 0;
			
                        for (var i in searchRecords) {
				
			var poValue = searchRecords[i].getValue(columns[1] );
			var searchEntity = searchRecords[i].getText(columns[0] );

                        var currDate = new Date();                         // Get Current Date
                        var lineDate = nlapiStringToDate(recLineDate);    // Convert string date to Object
                        var v = lineDate.getMonth();
                        var x = lineDate.getFullYear();
                        var y = currDate.getMonth();
                        var z = currDate.getFullYear();
                        var c = v + '/' + x;
                        var d = y + '/' + z;

                         // set value based on date and entity

			 if ((c == d) && (recLineEntity == searchEntity)) {
			            nlapiSubmitField(recType,recId,'custrecordactual_purchase_amount',poValue);

nlapiLogExecution('DEBUG', 'Update FPNA', 'recType: ' + recType + '; recId: ' + recId + 'reclineentity: ' + recLineEntity + 'povalue ' + poValue + 'currdate ' + currDate + 'linedate ' + lineDate + 'search entity' + searchEntity + 'x equals ' + x + 'y equals ' + y);
			 } else {
				
			}
		}
		
	} 

		
 }


catch (err) {
		
		nlapiLogExecution('ERROR', 'Update Vendor Status Stale', 'recType: ' + recType+ '; internalId: ' + recId +  
				'; errCode: ' + err.name + '; err: ' + err.message);

}
}