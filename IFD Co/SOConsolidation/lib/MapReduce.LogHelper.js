define([
    'N/log'
], function MapReduceLogHelper(
    log
) {
    return {
        logSummarize: function logSummarize(summarizeContext) {
            var type = summarizeContext.toString();
            var logObj = {};

            logObj['Usage Consumed'] = summarizeContext.usage;
            logObj['Concurrency Number '] = summarizeContext.concurrency;
            logObj['Number of Yields'] = summarizeContext.yields;
            log.audit('type:' + type, JSON.stringify(logObj));

            if (summarizeContext.inputSummary.error) {
                log.error('Input Error', summarizeContext.inputSummary.error);
            }

            summarizeContext.output
                .iterator().each(function eachSummarizeOutput(key, value) {
                    log.debug(key, value);
                    return true;
                });

            summarizeContext.mapSummary.errors
                .iterator()
                .each(function eachMapError(key, value) {
                    log.error(key, value);
                    return true;
                });

            summarizeContext.reduceSummary.errors
                .iterator()
                .each(function eachReduceError(key, value) {
                    log.error(key, value);
                    return true;
                });
        }
    };
});
