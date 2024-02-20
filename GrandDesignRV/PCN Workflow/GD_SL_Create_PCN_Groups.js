/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/record'],
    /**
     * @param{record} record
     */
    (record) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {

            const entityGroups = [
                'PCN Plant Manager PLT12 Notification',
                'PCN Purchasing PLT 12 Notification',
                'PCN Engineering PLT12 Notification',
                'PCN Service Notification',
                'PCN General Manager Notification',
                'PCN Product Manager Approval PLT12 Notification',
                'PCN BOM Approval PLT12 Notification',
                'PCN Notification Group Notification',
                'PCN Final Approval Notification',
                'PCN Codes Notification',
                'PCN CFO VP OPS Notification',
                'PCN DECOR Notification',
            ]

            if (scriptContext.request.method === 'GET') {
                entityGroups.forEach((entityGroup) => {
                    // create the entity group record in NetSuite
                    const entityGroupRecord = record.create({
                        type: 'entitygroup',
                        isDynamic: true,
                        defaultValues: {
                            'grouptype' : 'Employee',
                            'dynamic': false
                        }
                    });
                    entityGroupRecord.setValue({
                        fieldId: 'groupname',
                        value: entityGroup
                    });
                    entityGroupRecord.setValue({
                        fieldId: 'groupowner',
                        value: 3907895 // Eric
                    });
                    entityGroupRecord.setValue({
                        fieldId: 'email',
                        value: 'ejdiaz@granddesignrv.com'
                    })
                   /* entityGroupRecord.setValue({
                        fieldId: 'dynamic',
                        value: false
                    })
                    entityGroupRecord.setValue({
                        fieldId: 'grouptype',
                        value: 'Employee'
                    })*/
                    entityGroupRecord.save();
                });
            }
        }

        return {onRequest}

    });
