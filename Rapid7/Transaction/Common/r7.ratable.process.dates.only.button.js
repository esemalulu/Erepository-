// noinspection JSFileReferences
/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define(['N/log', 'N/url', '/SuiteScripts/Transaction/Common/r7.check.custom.permissions.js'],
    (log, url, customPermission) => {

        const beforeLoad = (context) => {
            const {newRecord, type, UserEventType, form} = context;
            const {VIEW} = UserEventType;
            if(type === VIEW){
                if(customPermission.userHasPermission('ratable_dates_only_button')){
                    let ratableDateOnlyURL = url.resolveScript({
                        scriptId: 'customscriptr7_ratabledatesonlysuitelet',
                        deploymentId: 'customdeployr7_ratabledatesonlysuitelet',
                        params: {
                            custparam_trantype: newRecord.type,
                            custparam_transaction: newRecord.id
                        },
                        returnExternalUrl: false
                    });
                    form.addButton({
                        id: 'custpage_ratabledatesonly',
                        label: 'Ratable Process Dates Only',
                        functionName: 'replaceWindow(\'' + ratableDateOnlyURL + '\')'
                    });
                }
            }
        }

        return {beforeLoad}

    });
