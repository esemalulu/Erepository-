define(['N/search'], (search) => {

    let ERROR_DATA = null;

    function matchErrorMessage(eventError) {
        if(!ERROR_DATA) {
            getAllErrorDescriptions();
        };

        for(let i=0; i<ERROR_DATA.length; i++) {
            const errorMessage = ERROR_DATA[i];
            log.debug('regex', errorMessage.regex);
            if(eventError.match(errorMessage.regex)) {
                log.debug('match found', errorMessage.cause);
                return errorMessage;
            }
        };
    }

    function getAllErrorDescriptions() {
        var customrecord_platform_errors_helpSearchObj = search.create({
            type: "customrecord_platform_errors_help",
            filters:
                [
                    ["isinactive","is","F"]
                ],
            columns:
                [
                    search.createColumn({
                        name: "custrecord_platform_error_cause",
                        sort: search.Sort.ASC
                    }),
                    "custrecord_platform_error_description",
                    "custrecord_platform_error_next_steps",
                    "custrecord_platform_error_notes"
                ]
        });
        const columns = customrecord_platform_errors_helpSearchObj.columns;
        ERROR_DATA = [];
        customrecord_platform_errors_helpSearchObj.run().each(function(result){
            const cause = result.getValue(columns[0]);
            ERROR_DATA.push({
                cause: cause,
                description: result.getValue(columns[1]),
                nextSteps: result.getValue(columns[2]),
                notes: result.getValue(columns[3]),
                regex: new RegExp(cause.replace(/{.*?}/g, '[a-zA-Z0-9].*'),"gi")
            })
            return true;
        });
    }

    return /** @alias module: */ {
        matchErrorMessage: matchErrorMessage
    };
});