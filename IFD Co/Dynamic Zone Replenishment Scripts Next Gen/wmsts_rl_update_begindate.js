/**
 *    Copyright � 2018, Oracle and/or its affiliates. All rights reserved.
 */

/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */

define(['N/format','./wmsts_utility.js'],
function (format,utility) {

    function doPost(context) {

        var dateObj={};
        var currDate = utility.DateStamp();

       
		var parsedCurrentDate = format.parse({
			value: currDate,
			type: format.Type.DATE
		});
log.debug('parsedCurrentDate',parsedCurrentDate);
dateObj.begindate=currDate;

var currTime=utility.getCurrentTimeStamp();

dateObj.begintime=currTime;
return dateObj;


    }
    return {
        'post': doPost
    };
});