function postRESTlet(objRequest)
{
	var objResponse = {};
	//var execType = CONTEXT.getExecutionContext();
	var logTitle = "SCIOrderRequest";//['POST::SCIOrderRequest', execType].join(':');

	var NOWTIME = new Date();
	var START_TIME = NOWTIME.getTime();
    
    var custTable = nlapiGetContext().getSetting('SCRIPT', 'custscript_table_id')
    var creatorScript = nlapiGetContext().getSetting('SCRIPT', 'custscript_creator_id')
    var creatorScriptDeploy = nlapiGetContext().getSetting('SCRIPT', 'custscript_creator_id_deploy')

	try
	{
		if ( Helper.isEmpty(objRequest))
		{
			objResponse.errorMessage = 'Empty Request (1)';
			return false;

		}
		// get the key for this record //
		for (var strRequestType in objRequest);
		var strDateReceived = nlapiDateToString(NOWTIME, 'datetimetz');

		nlapiLogExecution('DEBUG', logTitle, '*** START *** ' + [strRequestType, strDateReceived].join(' : '));
        nlapiLogExecution ('DEBUG', logTitle, JSON.stringify(objRequest));

		if ( Helper.isEmpty(objRequest[strRequestType]))
		{
			objResponse.errorMessage = 'Empty Request (2)';
			return false;
		}

		var listRequestData = objRequest[strRequestType];
		if (Helper.isEmpty(listRequestData) )
		{
			objResponse.errorMessage = 'Empty Request list';
			return false;
		}

		nlapiLogExecution('DEBUG', logTitle, 'Total number of request: ' + listRequestData.length);

		for (var i=0; i < listRequestData.length; i++)
		{
                var requestData = listRequestData[i];
                //nlapiLogExecution('DEBUG', logTitle, 'Theres an error here:'+JSON.stringify(requestData));
                if (requestData != null) {
                var size = requestData.items.length;
                if (size != 0) {
                nlapiLogExecution('DEBUG', logTitle, '.. adding new record:' + JSON.stringify(requestData));
                var requestDataSub = clone(requestData);
                requestDataSub.items = [];
                nlapiLogExecution('DEBUG', logTitle, 'first GO:'+JSON.stringify(requestData.items[0]));
                for (j=0; j < size; j++) {
                    nlapiLogExecution('DEBUG', logTitle, 'GO:'+JSON.stringify(requestData.items[j]));
                    requestDataSub.items.push(requestData.items[j]);
                    nlapiLogExecution('DEBUG', logTitle, 'GO:'+j+' | ' + JSON.stringify(requestDataSub));
                    if (j % 50 == 0 && j != 0) { 
                        nlapiLogExecution('DEBUG', logTitle, '.. adding new sub record:' + JSON.stringify(requestDataSub));

                        // create the custom record
                        var recWebRequest = nlapiCreateRecord(custTable);//'customrecord241');
                        recWebRequest.setFieldValue('custrecordcustrecord_sci_type', strRequestType);
                        recWebRequest.setFieldValue('custrecordcustrecord_sci_content', JSON.stringify(requestDataSub));
                        recWebRequest.setFieldValue('custrecordcustrecord_sci_status', 1); // PENDING
                        recWebRequest.setFieldValue('custrecordcustrecord_sci_received', strDateReceived);
                        recWebRequest.setFieldValue('custrecordcustrecord_sci_recordtype', strRequestType);

                        var id = nlapiSubmitRecord(recWebRequest);
                        nlapiLogExecution('DEBUG', logTitle, '.. new record:' + id);
                        requestDataSub.items = [];
                    }
                }
                if (requestDataSub.items.length != 0) {
                    nlapiLogExecution('DEBUG', logTitle, '.. adding new sub record:' + JSON.stringify(requestDataSub));

                    // create the custom record
                    var recWebRequest = nlapiCreateRecord(custTable);//'customrecord241');
                    recWebRequest.setFieldValue('custrecordcustrecord_sci_type', strRequestType);
                    recWebRequest.setFieldValue('custrecordcustrecord_sci_content', JSON.stringify(requestDataSub));
                    recWebRequest.setFieldValue('custrecordcustrecord_sci_status', 1); // PENDING
                    recWebRequest.setFieldValue('custrecordcustrecord_sci_received', strDateReceived);
                    recWebRequest.setFieldValue('custrecordcustrecord_sci_recordtype', strRequestType);

                    var id = nlapiSubmitRecord(recWebRequest);
                    nlapiLogExecution('DEBUG', logTitle, '.. new record:' + id);
                }
		}
    }
    }
    }
    catch (e)
    {
        objResponse.errorMessage = e;
    }
    //var status = nlapiScheduleScript(creatorScript, creatorScriptDeploy);//'customscript131', 'customdeploy1');
    //nlapiLogExecution('DEBUG', logTitle, 'Status: ' +status);
    nlapiLogExecution('DEBUG', logTitle, '*****FINISHED******');
    //nlapiLogExecution('DEBUG', logTitle, 'MATT IS AWESOME');
    return objResponse;
}



function clone(obj) {
    var copy;
    
    if (null === obj || "object" != typeof obj) return obj;
    
    if (obj instanceof Object) {
        copy = {};
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
        }
        return copy;
    }

    throw new Error("Unable to copy! Its type isn't supported.");
}
