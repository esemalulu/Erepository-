// noinspection JSFileReferences
/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/log', 'N/record', 'SuiteScripts/Transaction/Common/r7.transaction.library.functions.js'],
    (log, record, transactionFunctions) => {

        const beforeLoad = (context) => {
                const {UserEventType, type} = context;
                const {COPY} = UserEventType;

                if(type === COPY){
                        transactionFunctions.zc_runCategoryPurchasedCopyRoutine('copy');
                }
        }

        const beforeSubmit = (context) => {
                let newRecord = context.newRecord;
                let oldRecord = context.oldRecord || newRecord;

                const {UserEventType, type} = context;
                const {CREATE, EDIT} = UserEventType;

                if(type === CREATE || type === EDIT){
                        transactionFunctions.stampACV(newRecord);
                        transactionFunctions.zc_stampCategoryPurchased(oldRecord, newRecord);
                }
        }

        const afterSubmit = (context) => {
                const {UserEventType, type, newRecord} = context;
                const {CREATE, EDIT} = UserEventType;
                if (type === CREATE || type === EDIT) {
                        transactionFunctions.zc_categorypurchased_credits(newRecord.id);
                }
        }

        return {beforeLoad, beforeSubmit, afterSubmit}

    });
