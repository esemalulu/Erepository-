/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define(['N/log', 'N/runtime'],
    (log, runtime) => {

        const beforeLoad = (context) => {
                const {type, UserEventType, form} = context;
                const {VIEW} = UserEventType;

                let userId= runtime.getCurrentUser().id;
                if(type === VIEW){
                        if (userId === 283872 || userId === 944519 || userId === 2 || userId === 1230735) {
                                form.addButton({
                                        id: 'custpage_deletejournals',
                                        label: 'Delete Journals',
                                        functionName: 'deleteJournals_cs'
                                });
                        }
                }
        }

        return {beforeLoad}

    });
