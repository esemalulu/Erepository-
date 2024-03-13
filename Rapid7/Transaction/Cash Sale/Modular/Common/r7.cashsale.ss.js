// noinspection JSFileReferences
/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/log', 'N/record', 'N/runtime', 'SuiteScripts/Transaction/Common/r7.transaction.library.functions.js'],
    (log, record, runtime, transactionFunctions) => {

        const beforeLoad = (context) => {
                const {UserEventType, type} = context;
                const {COPY} = UserEventType;

                if(type === COPY){
                        transactionFunctions.zc_runCategoryPurchasedCopyRoutine(context);
                }
        }

        const beforeSubmit = (context) => {
                let newRecord = context.newRecord;
                let oldRecord = context.oldRecord || newRecord;

                const {UserEventType, type} = context;
                const {CREATE, EDIT} = UserEventType;
                const {ContextType, executionContext} = runtime;
                const {USER_INTERFACE} = ContextType;

                if(executionContext === USER_INTERFACE){
                        if(type === CREATE || type === EDIT){
                                transactionFunctions.setTotalDiscount(newRecord);
                        }
                }
                if(type === CREATE || type === EDIT){
                        transactionFunctions.stampACV(newRecord);
                        transactionFunctions.zc_stampCategoryPurchased(oldRecord, newRecord);
                }

                /*if (type === CREATE || type === EDIT || type === XEDIT){
                        transactionFunctions.stampClass();
                }*/
        }

        return {beforeLoad, beforeSubmit}

    });
