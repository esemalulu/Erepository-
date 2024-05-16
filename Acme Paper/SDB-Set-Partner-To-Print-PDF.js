/**
 * @NScriptType UserEventScript
 * @NApiVersion 2.1
*/
define(['N/record','N/error'],
    function (record,error) {
        function beforeSubmit(context){
        try{
            var invoice = context.newRecord;
            var contextType = context.type;
            var customerInvoice = invoice.getValue('entity')
            log.debug('customerInvoice',customerInvoice)
            log.debug('contextType',contextType)
            if(contextType=='create'||contextType=='edit'||contextType=='xedit'){
                var isNetworkPartnerResult;
                if(contextType=='edit'||contextType=='xedit'){
                    var invoiceRecord = record.load({
                        type: record.Type.INVOICE,
                        id: invoice.id,
                        isDynamic: true,
                    });
                    var invoiceBodyPartner = invoiceRecord.getValue('partner');
                    log.debug('invoiceRecord invoiceBodyPartner',invoiceBodyPartner)
                    if(invoiceBodyPartner)return;
                    isNetworkPartnerResult = isNetworkPartner(invoiceRecord);
                }
                if(contextType=='create'){
                    var invoiceBodyPartner = invoice.getValue('partner');
                    log.debug('invoice invoiceBodyPartner',invoiceBodyPartner)
                    if(invoiceBodyPartner)return;
                    isNetworkPartnerResult = isNetworkPartner(invoice);
                }
                var partnerFieldPrint = '';
                if(isNetworkPartnerResult){
                    partnerFieldPrint = 'Network Services Company'
                }else if(invoice.getValue('cseg_accrete_divisi')==16){
                    partnerFieldPrint = 'NATIONAL PAPER CO, INC.'
                }
                else{
                    partnerFieldPrint = '';
                }
                invoice.setValue('custbody_sdb_partner_to_print',partnerFieldPrint)
                log.debug('updated')
            }
        }catch(error){
            log.error('beforeSubmit Error: ', error)
        }
        }
        function isNetworkPartner(invoiceRecord){
            try {
                if(invoiceRecord.getValue('partner')==51327) return true;
                var customerId = invoiceRecord.getValue('entity');
                var primaryPartnerIndex = invoiceRecord.findSublistLineWithValue({
                    sublistId: 'partners',
                    fieldId: 'isprimary',
                    value: true
                })
                if(primaryPartnerIndex != -1){
                    var primaryPartner = invoiceRecord.getSublistValue({
                        sublistId: 'partners',
                        fieldId: 'partner',
                        line: primaryPartnerIndex
                    })
                    if(primaryPartner==51327)return true;
                }
                var customerInvoice = record.load({
                    type: record.Type.CUSTOMER,
                    id: customerId,
                    isDynamic: true,
                })
                if(customerInvoice.getValue('partner')==51327)return true;
                var primaryCustomerPartnerIndex = customerInvoice.findSublistLineWithValue({
                    sublistId: 'partners',
                    fieldId: 'isprimary',
                    value: true
                })
                if(primaryCustomerPartnerIndex != -1){
                    var primaryCustomerPartner = customerInvoice.getSublistValue({
                        sublistId: 'partners',
                        fieldId: 'partner',
                        line: primaryCustomerPartnerIndex
                    })
                    if(primaryCustomerPartner==51327)return true;
                }
                return false;
            } catch (error) {
                log.error('isNetworkPartner ERROR: ' , error)
            }
        }

        return {
            beforeSubmit:beforeSubmit,
        };
    });


