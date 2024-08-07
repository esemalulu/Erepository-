/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/log', 'N/record'],
    /**
 * @param{log} log
 * @param{record} record
 */
    (log, record) => {

        const afterSubmit = (scriptContext) => {
            var oldCPCCustomerRecord = scriptContext.oldRecord;
			var newCPCCustomerRecord = scriptContext.newRecord;
			var scriptType  = scriptContext.type;


			log.debug('scriptType',scriptType);

            if(scriptType == 'delete'){
                var customer = oldCPCCustomerRecord.getValue('custrecord_acme_cpc_line_customer');
                var savedCustomerId = record.submitFields({ type: 'customer', id: customer, values: { "custentity_customer_price_updated": true} });
                log.debug('context delete, customer updated:', savedCustomerId);
            }
  
            if(scriptType == 'create'){
                var customer = newCPCCustomerRecord.getValue('custrecord_acme_cpc_line_customer');
                var savedCustomerId = record.submitFields({ type: 'customer', id: customer, values: { "custentity_customer_price_updated": true} });
                log.debug('context create || edit customer updated: ', savedCustomerId);
            }
            if(scriptType == 'edit'){
                var newCpcHeader = newCPCCustomerRecord.getValue('custrecord_acme_cpc_cust_header');
                var oldCpcHeader = oldCPCCustomerRecord.getValue('custrecord_acme_cpc_cust_header');
                var newCustomer  = newCPCCustomerRecord.getValue('custrecord_acme_cpc_line_customer');
                var oldCustomer  = oldCPCCustomerRecord.getValue('custrecord_acme_cpc_line_customer');
                if(newCpcHeader != oldCpcHeader){
                    log.debug('newCpcHeader != newCpcHeader');
                    if(newCustomer!=oldCustomer){
                        record.submitFields({ type: 'customer', id: newCustomer, values: { "custentity_customer_price_updated": true} });
                        record.submitFields({ type: 'customer', id: oldCustomer, values: { "custentity_customer_price_updated": true} });
                        log.debug('newCustomer!=oldCustomer customer updates', ' newCustomer ' + newCustomer + ' oldCustomer ' + oldCustomer );
                    }else{
                        record.submitFields({ type: 'customer', id: newCustomer, values: { "custentity_customer_price_updated": true } });
                        log.debug('newCustomer==oldCustomer customer updated', newCustomer);
                    }
                }
                else if(newCustomer!=oldCustomer){
                    record.submitFields({ type: 'customer', id: newCustomer, values: { "custentity_customer_price_updated": true} });
                    record.submitFields({ type: 'customer', id: oldCustomer, values: { "custentity_customer_price_updated": true} });
                    log.debug('ELSE IF newCustomer!=oldCustomer customer updates', ' newCustomer ' + newCustomer + ' oldCustomer ' + oldCustomer );
                }
            }
        }
        return {afterSubmit}

    });
