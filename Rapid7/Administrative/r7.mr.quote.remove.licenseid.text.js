/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 */
define(['N/log', 'N/query', 'N/record'], function (log, query, record) {
    function getInputData(context) {
        return query.runSuiteQL({
            query: `
                select 
                  t.id as internalid, 
                  --t.type,
                  --t.createdDate,
                  --tl.custcolr7translicenseid
                from transaction t
                inner join transactionline tl
                  on tl.transaction = t.id
                where 1 = 1
                  and type = 'Estimate'
                  and createdDate > '8/8/2022'
                  and tl.custcolr7translicenseid is not null
                  --and rownum = 1
                group by t.id
            `
        }).asMappedResults();
    }

    function map(context) {
        const result = JSON.parse(context.value);
        const internalId = result['internalid'];

        log.debug({ title: 'internalId', details: internalId });

        context.write({
            key: internalId,
            value: internalId
        });
    }

    function reduce(context) {
        const internalId = context.key;
        log.debug({ title: 'internalId', details: internalId });

        record.load({
            type: 'estimate',
            id: internalId
        }).save();
    }

    function summarize(context) {
        context.mapSummary.errors.iterator().each((key, error) => {
            log.error({ title: key, details: error })
        });

        context.reduceSummary.errors.iterator().each((key, error) => {
            log.error({ title: key, details: error })
        });
    }

    return {
        getInputData,
        map,
        reduce,
        summarize
    };
});