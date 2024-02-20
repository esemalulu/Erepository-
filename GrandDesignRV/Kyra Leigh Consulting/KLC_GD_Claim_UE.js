/**
 * Record Type: Claim
 *
 * IF a unit was registered with an open recall,
 * the First Registration Recall Status is currently “Registered with Open Recall”,
 * AND the recall is then resolved (so, the unit recall record is completed), set the value to “Recall Complete”.
 * Recall is resolved via UE on the Claim. Initiating from Claim due to inability to chain user events.
 *
 * Author: Kyra Schaefer
 *
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search'],
    /**
     * @param{record} record
     * @param{search} search
     */
    (record, search) => {

        var RECALL_STATUS_COMPLETE = 2; // Recall Complete

        function updateRegistrationsOpenRecall(unitId) {

            // update registrations with open recall
            var logTitle = 'updateRegistrationsOpenRecall';
            var regSearchObj = search.create({
                type: "customrecordrvsunitretailcustomer",
                filters:
                    [
                        ["custrecordunitretailcustomer_unit", "anyof", unitId],
                        "AND",
                        ["custrecord_urc_first_reg_recall_status", "anyof", "1"]
                    ],
                columns:
                    [
                        "internalid"
                    ]
            });
            regSearchObj.run().each(function (result) {

                    while (true) {
                        try {
                            record.submitFields({
                                type: 'customrecordrvsunitretailcustomer',
                                id: result.id,
                                values: {
                                    custrecord_urc_first_reg_recall_status: RECALL_STATUS_COMPLETE
                                }
                            });
                            break;
                        } catch (e) {
                            if (e.name == 'RCRD_DSNT_EXIST') {
                                break;
                            } else if (e.name != 'RCRD_HAS_BEEN_CHANGED') {
                                log.error(logTitle, e);
                                break;
                            }
                        }
                    }
                    return true;
                }
            )

        }

        function searchRecallsOpen(unitId) {

            // search for open recalls for the unit
            var logTitle = 'searchRecallsOpen';
            var isOpenRecall = false;
            var recallSearchObj = search.create({
                type: "customrecordrvs_recallunit",
                filters:
                    [
                        ["custrecordrecallunit_unit", "anyof", unitId],
                        "AND",
                        ["custrecordrecallunit_recallcode.isinactive", "is", "F"],
                        "AND",
                        ["custrecordrecallunit_recallcode.custrecordgd_flatratecode_type", "noneof", "6"],
                        "AND",
                        ["custrecordrecallunit_claim", "anyof", "@NONE@"]
                    ],
                columns:
                    [
                        "internalid"
                    ]
            });
            var searchResultCount = recallSearchObj.runPaged().count;
            log.debug(logTitle, 'Unit ID: ' + unitId + ' | Open recall count: ' + searchResultCount);

            if (searchResultCount > 0) isOpenRecall = true;

            return isOpenRecall;
        }

      function getCustEmail(custId) {
log.error({title:"custId",details:custId})
        var fieldLookUp = search.lookupFields({
    type: "customrecordrvsunitretailcustomer",
    id: custId,
    columns: ['custrecordunitretailcustomer_email']
});
          var fieldLookUpObject = fieldLookUp.custrecordunitretailcustomer_email[0]; 
var email = quoteStatusObject.value; 
        log.error({title:"email",details:email})
        if(email)
        {
              return email;
        }
        else{
          return false
        }
        
        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {

            var logTitle = 'afterSubmit';
            var newRec = scriptContext.newRecord;
            var oldRec = scriptContext.newRecord;
            var unitId = newRec.getValue('custrecordclaim_unit');
            var oldStatus = oldRec.getValue('custrecordclaim_status');
            var status = newRec.getValue('custrecordclaim_status');
            var customer = newRec.getValue('custrecordclaim_retailcustomer');
          //  if(oldStatus!=5 && status==5)
          //  {
              try{
                var custEmail = getCustEmail(customer);
                log.error({title:"custEmail",details:custEmail})
              }
              catch(e){
                log.error({title:"Error when sending email",details:e.message})
              }
           // }
            if (unitId) {
                // search for open recalls for the unit
                var isOpenRecall = searchRecallsOpen(unitId);

                // if no open recalls, update registration with open recall
                if (!isOpenRecall) updateRegistrationsOpenRecall(unitId);
            }

        }


        return {afterSubmit}

    }
)
;
