/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 * author: ngrigoriev
 * Date: 22.07.2019
 * Version: 1.0
 */                               
      
define(['N/record','N/search','N/ui/message'],

 /**
* @param {record} record
* @param {search} search
*/
    function(record, search, message) {

     /**
      * Validation function to be executed when page is loaded.
      * @param {Object} scriptContext
      * @param {Record} scriptContext.currentRecord - Current form record
      * @param {Record} scriptContext.mode - The mode in which the record is being accessed. T
      */
        function pageInit(scriptContext) {
            if(scriptContext.mode=='edit'||scriptContext.mode=='create') {
                var linkedVendorId = scriptContext.currentRecord.getValue({fieldId: 'custrecordr7wire_vendor'});
                //log.debug('pageInit linkedVendorId', linkedVendorId);
                if (linkedVendorId) {
                    var vendorData = search.lookupFields({
                        type: search.Type.VENDOR,
                        id: linkedVendorId,
                        columns: ['isInactive', 'custentityr7_approval_status']
                    })
                    var isVendorInactive = vendorData['isInactive'];
                    //alert(JSON.stringify(vendorData));
                    var vendorApprStatus = vendorData['custentityr7_approval_status'][0]?vendorData['custentityr7_approval_status'][0]['value']:1;
                    console.log('vendorApprStatus')
                    console.log(vendorApprStatus)
                    log.debug('beforeSubmit vendorApprStatus', vendorApprStatus);
                    if (!isVendorInactive) {
                        var errorMsg = message.create({
                            title: "Vendor Validation Error",
                            message: "You can\'t update wire instructions for an active vendor",
                            type: message.Type.ERROR
                        });
                        errorMsg.show(); // will stay up until hide is called.
                        setTimeout(errorMsg.hide, 15000);
                    }
                    if (vendorApprStatus==1&&isVendorInactive) {
                        var errorMsg = message.create({
                            title: "Vendor Validation Error",
                            message: "You can\'t update wire instructions for vendor that is pending approval",
                            type: message.Type.ERROR
                        });
                        errorMsg.show(); // will stay up until hide is called.
                        setTimeout(errorMsg.hide, 15000);
                    }

                }
            }
        }

      /**
         * Validation function to be executed when record is saved.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @returns {boolean} Return true if record is valid
         * @since 2015.2
         */
        function saveRecord(scriptContext) {
          var linkedVendorId = scriptContext.currentRecord.getValue({fieldId:'custrecordr7wire_vendor'});
          //log.debug('beforeSubmit linkedVendorId', linkedVendorId);
          if(linkedVendorId) {

              var vendorData = search.lookupFields({
                  type: search.Type.VENDOR,
                  id: linkedVendorId,
                  columns: ['isInactive', 'custentityr7_approval_status']
              })
              var isVendorInactive = vendorData['isInactive'];
              var vendorApprStatus = vendorData['custentityr7_approval_status'][0]?vendorData['custentityr7_approval_status'][0]['value']:1;
              console.log('vendorApprStatus')
              console.log(vendorApprStatus)
              if(!isVendorInactive){
                  var errorMsg = message.create({
                      title: "Vendor Validation Error",
                      message: "You can\'t update wire instructions for an active vendor",
                      type: message.Type.ERROR
                  });
                  errorMsg.show(); // will stay up until hide is called.
                  setTimeout(errorMsg.hide, 15000);
                  return false
              }
              if (vendorApprStatus==1&&isVendorInactive) {
                  var errorMsg = message.create({
                      title: "Vendor Validation Error",
                      message: "You can\'t update wire instructions vendor that is pending approval",
                      type: message.Type.ERROR
                  });
                  errorMsg.show(); // will stay up until hide is called.
                  setTimeout(errorMsg.hide, 15000);
                  return false
              }
          }
          return true;
        }

            return {
                saveRecord: saveRecord,
                pageInit: pageInit
            }
    }
);