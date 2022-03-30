/**
 *
 * @NApiVersion 2.x
 * @NScriptType restlet
 */
define(['N/record', 'N/search', 'N/task', 'N/format', 'N/runtime'],

function(record, search, task, format, runtime) {
    var EndPoint = {};

	EndPoint.post = function (requestBody)
	{
		var logTitle = "RefundGenerator";
        log.debug(logTitle, "***START***");
        log.debug(logTitle, JSON.stringify(requestBody));
		var responseBody = {"status":"","id":"","message":""};

        //log.debug(logTitle, search.Type.CASH_SALE);
        var refundSearch = search.create({
            type: search.Type.CASH_SALE,
            columns: [{
                name: 'custbody_integration_so_external_id'
            }],
            filters: [{
                name: 'externalid',
                //name: 'custbody_integration_so_external_id',
                operator: 'is',
                values: ['21038930002171004C']
            }
            /*,{
                name: 'custcol_externalid',
                operator: 'contains',
                values: ["'"+requestBody.itemId+"'"]
            }*/
            ]
        });
        log.debug(logTitle, JSON.stringify(refundSearch.filters));

        log.debug(logTitle, "Running search:",JSON.stringify(refundSearch));
        var refundSearchResults = refundSearch.run();
        log.debug(logTitle, "Search Results:"+JSON.stringify(refundSearchResults));
        refundSearchResults.each(function(result) {
            var internalId = result.getValue({ name:'internalid'});
        });

		return responseBody;
	};

    return EndPoint;
});
