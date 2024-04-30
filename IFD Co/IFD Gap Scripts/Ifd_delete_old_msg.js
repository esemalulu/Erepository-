nlapiLogExecution("audit","FLOStart",new Date().getTime());
/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       27 Jun 2016     rafe goldbach, suitelaunch llc
 * 1.50		  29 Nov 2021     Manda Bigelow    changing deletion of item messages to 1 day after expiration at request of Jim K
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function deleteMsg(type) {
	// the purpose of this script is to delete item messages which are one week old or more
	
	
		// define search filters
		var filters = new Array();
		filters[0] = new nlobjSearchFilter( 'custrecord_ifd_msgenddate', null, 'onOrBefore', 'daysAgo1' );

		// return record id
		var columns = new Array();
		columns[0] = new nlobjSearchColumn( 'internalid' );
		columns[1] = new nlobjSearchColumn( 'custrecord_ifd_messageitemnumber' );
		columns[2] = new nlobjSearchColumn( 'custrecord_ifd_messagebyitem' );
		columns[3] = new nlobjSearchColumn( 'custrecord_ifd_msgenddate' );
		columns[3] = new nlobjSearchColumn( 'custrecord_ifd_msgstartdate' )

		// execute the Warrenty search, passing all filters and return columns
		var searchresults = nlapiSearchRecord( 'customrecord_ifd_item_message', null, filters, columns );

		// loop through the results
		for ( var i = 0; searchresults != null && i < searchresults.length; i++ )
		   {
		   // get result values
		   var searchresult = searchresults[ i ];
		   var record = searchresult.getId( );
		   var rectype = searchresult.getRecordType( );
		   var item = searchresult.getValue( 'custrecord_ifd_messageitemnumber' );
		   var endDate = searchresult.getValue( 'custrecord_ifd_msgenddate' );
		   var message = searchresult.getValue( 'custrecord_ifd_messagebyitem' );
		   var startDate = searchresult.getText( 'custrecord_ifd_msgstartdate' );
		   nlapiLogExecution('debug','to be deleted', record+'/'+message);
		   nlapiDeleteRecord('customrecord_ifd_item_message', record);
		   nlapiLogExecution('debug','deleted', record);
		}
	
	

}
