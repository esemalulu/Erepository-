/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * author: ngrigoriev
 * Date: 22.07.2019
 * Version: 1.0
 */                              
      
define(['N/search','N/error'],

 /**
* @param {search} search
* @param {error} error
*/
    function(search, error) {

                 /**
         * Function definition to be triggered before record is loaded.
         * @param {Object} context
         * @param {Record} context.newRecord - New record
         * @param {Record} context.oldRecord - Old record
         * @param {string} context.type - Trigger type
         * @Since 2015.2
         */
        function beforeSubmit(context) {
            var linkedVendorId;
            if(context.newRecord){
                linkedVendorId  = context.newRecord.getValue({fieldId:'custrecordr7wire_vendor'});
            }else if(context.oldRecord){
                linkedVendorId = context.oldRecord.getValue({fieldId:'custrecordr7wire_vendor'});
            }
            log.debug('beforeSubmit linkedVendorId', linkedVendorId);
            if(linkedVendorId) {
                var vendorData = search.lookupFields({
                    type: search.Type.VENDOR,
                    id: linkedVendorId,
                    columns: ['isInactive', 'custentityr7_approval_status']
                })
                var isVendorInactive = vendorData['isInactive'];
                var vendorApprStatus = vendorData['custentityr7_approval_status'][0]?vendorData['custentityr7_approval_status'][0]['value']:1;;
                log.debug('beforeSubmit isVendorInactive', isVendorInactive);
                if(!isVendorInactive){
                    throw error.create({
                        name: 'Vendor Validation',
                        message: 'You can not update wire instructions for an active vendor',
                        notifyOff: false
                    });
                }
                if(vendorApprStatus==1&&isVendorInactive){
                    throw error.create({
                        name: 'Vendor Validation',
                        message: 'You can\'t update wire instructions for vendor that is pending approval',
                        notifyOff: false
                    });
                }
            }
        }

                return {
            beforeLoad:  null ,
            beforeSubmit: beforeSubmit,
            afterSubmit:  null         }
    }
);