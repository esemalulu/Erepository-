/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       13 May 2016     json
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function dtScheduled(type) 
{
	var ss = nlapiSearchRecord(null,'662');
	for (var i=0; i < ss.length; i+=1)
	{
		nlapiLogExecution('debug','Search Return Value: ',ss[i].getValue('internalid')+' == '+
				'Event Start Time: '+ss[i].getValue('starttime')+
				'//'+
				'Date/Time Field: '+ss[i].getValue('custevent_dtfld')+
				'//'+
				'Time of Day Field: '+ss[i].getValue('custevent_test_timeofday')
		);
		
		var calrec = nlapiLoadRecord('calendarevent',ss[i].getValue('internalid'));
		nlapiLogExecution('debug','Load Record Value: ',ss[i].getValue('internalid')+' == '+
				'Event Start Time: '+calrec.getFieldValue('starttime')+
				'//'+
				'Date/Time Field: '+calrec.getFieldValue('custevent_dtfld')+
				'//'+
				'Time of Day Field: '+calrec.getFieldValue('custevent_test_timeofday')
		);
		
	}
}
