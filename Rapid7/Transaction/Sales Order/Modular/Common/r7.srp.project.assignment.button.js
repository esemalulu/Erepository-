// noinspection JSFileReferences
/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define(['N/log', 'N/url', 'N/runtime', '/SuiteScripts/Transaction/Common/r7.check.custom.permissions.js'],
    (log, url, runtime, customPermission) => {

        const beforeLoad = (context) => {
                const {newRecord, type, UserEventType, form} = context;
                const {VIEW} = UserEventType;
                const {executionContext, ContextType} = runtime;
                const {USER_INTERFACE} = ContextType;
                if(executionContext === USER_INTERFACE){
                        if(type === VIEW){
                                if(customPermission.userHasPermission('srp_project_assignment')){
                                        let projectAssignmentSuiteletURL = url.resolveScript({
                                                scriptId: 'customscriptzc_srp_project_assignment',
                                                deploymentId: 'customdeployzc_srp_project_assignment',
                                                params: {
                                                        custparam_transaction: newRecord.id
                                                },
                                                returnExternalUrl: false
                                        });

                                        form.addButton({
                                                id: 'custpage_ratabledatesonly',
                                                label: 'Project Assignment',
                                                functionName: 'popUpWindow(\'' + projectAssignmentSuiteletURL + '\')'
                                        });
                                }
                        }
                }
        }

        return {beforeLoad}

    });
