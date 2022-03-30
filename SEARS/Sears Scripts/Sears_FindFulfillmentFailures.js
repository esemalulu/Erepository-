/**
 * @NApiVersion 2.x
 * @NModuleScope Public
 * @NScriptType ScheduledScript
 */

define (['N/record' , 'N/search' , 'N/runtime' , 'N/http' , './NSUtil' , 'N/error', 'N/file'] ,
    function ( record , search , runtime , http , util , error, file ) {

        var logTitle = "FindFailedFulfillments";

        var EndPoint = {};

        EndPoint.execute = function ( context ) {
            log.audit(logTitle, "****START****");

            var fileObj = file.load({
                id: 'Input/NoHitFile_41280.csv'
            });
            var fileContents = fileObj.getContents();
            var fileOutputName = fileObj.name.slice(0,-4) + "_out.csv";
            //log.debug(logTitle, "File Contents:"+fileContents);
            var fulfillmentArray = fileContents.split("\n");
            log.debug(logTitle, "Fulfillment Array:"+JSON.stringify(fulfillmentArray));
            //var fileId = fileObj.save();
            var outputFileContents = "";


            for (var i=0; i < fulfillmentArray.length; i++) {
                try {
                var subFulfillmentArray = fulfillmentArray[i].split("|");
                //log.debug(logTitle, 'Value:'+subFulfillmentArray[0]);
                var trackingNumber = subFulfillmentArray[3];
                if (trackingNumber == null || trackingNumber== undefined) {
                    trackingNumber = '';
                }
                log.debug(logTitle, 'Order:'+subFulfillmentArray[0]+",Item:"+subFulfillmentArray[1]);
                var fulfillmentSearch = search.create({
                    type: 'customrecord_json_webrequest',
                    columns: [{
                        name: 'custrecord_jsonreq_messsage'
                    },{
                        name: 'custrecord_jsonreq_status'
                    }],
                    filters: [{
                        name: 'custrecord_jsonreq_content',
                        operator: 'contains',
                        values: ["'"+subFulfillmentArray[0]+"'"]
                    },{
                        name: 'custrecord_jsonreq_content',
                        operator: 'contains',
                        values: ["'"+subFulfillmentArray[1]+"'"]
                    },{
                        name: 'custrecord_jsonreq_type',
                        operator: 'contains',
                        values: ['FulfillmentRequest']
                    }]
                });

                log.debug(logTitle, "Running search:",JSON.stringify(fulfillmentSearch));
                var fulfillmentSearchResults = fulfillmentSearch.run();
                //log.debug(logTitle, "Search Results:"+JSON.stringify(fulfillmentSearchResults));
                fulfillmentSearchResults.each(function(result) {
                    var message = result.getValue({ name:'custrecord_jsonreq_messsage'});
                    var resultStatus = result.getValue({ name:'custrecord_jsonreq_status'});
                    log.debug(logTitle, "Message:"+message);
                    log.debug(logTitle, "Status:"+resultStatus);
                    outputFileContents += fulfillmentArray[i] + "|" + resultStatus + "|" + message + "\n";
                    return true;
                });
                var outputFile = file.create({
                    name: fileOutputName,
                    fileType: file.Type.PLAINTEXT,
                    contents: outputFileContents,
                    description: '',
                    encoding: file.Encoding.UTF8,
                    folder: 2734,
                    isOnline: true
                }); 
                outputFile.save();
                }
                catch (e) {
                    log.debug(logTitle,"ERROR:"+e);
                    outputFileContents += fulfillmentArray[i] + "||" + e + "\n";
                }
            }
            log.audit(logTitle, "****FINISHED****");
            return true;
        };

        return EndPoint;
    });
