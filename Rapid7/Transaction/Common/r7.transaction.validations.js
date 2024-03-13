/**
 * r7.transaction.validations.js
 * @NApiVersion 2.1
 */
define(['N/ui/message', 'N/runtime'],
    (message, runtime) => {

        function blockApproval(context) {
            const roleId = runtime.getCurrentUser().role;

            if(roleId != 3) {
                context.form.removeButton({
                id :'custpage_my_approvereject_button'
                });
                context.form.removeButton({
                    id :'approve'
                });
            }
        }

        function sharedHostedEnginesRenewalValidation(context) {
            const thisRec = context.newRecord;
            const restrictedEngineSKUs = [3142, 6606, 3363, 3365, 6605, 3367, 3368, 6350, 3371, 3369, 3370, 6625];
            let restrictedSKUPresent = false;
            let restrictedSKUName = '';

            restrictedEngineSKUs.forEach(restrictedEngineSKU => {
                let sharedHostedEngineRenewalSKULine = thisRec.findSublistLineWithValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    value:  restrictedEngineSKU
                });
                if(sharedHostedEngineRenewalSKULine > -1 && !restrictedSKUPresent) {
                    restrictedSKUPresent = true;
                    restrictedSKUName = thisRec.getSublistText({
                        sublistId: 'item',
                        fieldId: 'item',
                        line: sharedHostedEngineRenewalSKULine
                    });
                }
            });
            
            if(restrictedSKUPresent) {
                blockApproval(context);
                const renewalEngineMessage = message.create({
                    title: 'Invalid SKU Found',
                    message: `This quote includes a Shared Hosted Engine line item${restrictedSKUName != '' ? ` (${restrictedSKUName})` : ''}, which will no longer be supported by Rapid7 and needs to be updated to a current External Scanning Service offering. </br></br> <b>Please go to the Zendesk tile in Okta, select the “Quoting Support Form,” and indicate that you need assistance with a “hosted engine swap.”</b>`,
                    type: message.Type.ERROR
                });
                context.form.addPageInitMessage({message: renewalEngineMessage});
            }
        }


        return {
            sharedHostedEnginesRenewalValidation,
            blockApproval
        }

    });