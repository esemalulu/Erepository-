// noinspection JSFileReferences,JSStringConcatenationToES6Template
/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/log', 'N/record', 'N/url', 'SuiteScripts/Transaction/Common/r7.transaction.library.functions.js'],
    (log, record, url, transactionFunctions) => {

        const beforeLoad = (context) => {
                const {UserEventType, type, newRecord, form} = context;
                const {COPY} = UserEventType;

                if(type === COPY){
                        transactionFunctions.zc_runCategoryPurchasedCopyRoutine('copy');
                }
                let internalId = newRecord.id;
                if (internalId != null) {
                        let createPdfUrl = url.resolveScript({
                                scriptId: 'customscript_r7_pck_transaction_suitelet',
                                deploymentId: 'customdeploy_r7_pck_transaction_suitelet',
                                params: {
                                        id: internalId
                                },
                                returnExternalUrl: false
                        });
                        form.addButton({
                                id: 'custpage_r7_pck_transaction_suitelet',
                                label: 'Print Package Credit Memo',
                                functionName: "popUpWindow('" + createPdfUrl + "')"
                        });
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
