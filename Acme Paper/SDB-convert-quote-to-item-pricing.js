/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
 define(['N/record'], function (record) {


    function onRequest(context) {
        try {
            var request = context.request;
            if (request.method == 'POST') {

                var custom_param_items_to_convert          = context?.request?.parameters?.custom_param_items_to_convert;
                var custom_param_items_to_convert_formated = JSON.parse(custom_param_items_to_convert);
                var custom_param_customer                  = context?.request?.parameters?.custom_param_customer;
                log.debug("onRequest custom_param_items_to_convert_formated length ",custom_param_items_to_convert_formated.length)
                if(!custom_param_customer || !custom_param_items_to_convert_formated) return;
                var customer = record.load({
                    type:record.Type.CUSTOMER,
                    id:custom_param_customer,
                    isDynamic: true         
                  })
                  for (let i = 0; i < custom_param_items_to_convert_formated.length; i++) {
                    let line = customer.findSublistLineWithValue({
                        sublistId: "itempricing",
                        fieldId: "item",
                        value: custom_param_items_to_convert_formated[i].item
                    });

                    if(line==-1){
                        //Insert new item pricing line
                        try {
                            customer.selectNewLine({
                                sublistId: 'itempricing'
                            });
                            customer.setCurrentSublistValue({
                                sublistId: 'itempricing',
                                fieldId: 'item',
                                value: custom_param_items_to_convert_formated[i].item,
                                forceSyncSourcing: true
                            });
                            customer.setCurrentSublistValue({
                                sublistId: 'itempricing',
                                fieldId: 'level',
                                value: custom_param_items_to_convert_formated[i].priceLevel,
                                forceSyncSourcing: true
                            });
                            // if(custom_param_items_to_convert_formated[i].priceLevel!=-1)
                            customer.setCurrentSublistValue({
                                sublistId: 'itempricing',
                                fieldId: 'price',
                                value: custom_param_items_to_convert_formated[i].sellPrice,
                                forceSyncSourcing: true
                            });
                            customer.commitLine({
                                sublistId: 'itempricing'
                            });
                        } catch (error) {
                            log.debug('error new line',error)
                        }
                    }else{
                        //Edit current item pricing line
                        try {
                            var lineSelected = customer.selectLine({
                                sublistId: 'itempricing',
                                line: line
                            })
                            customer.setCurrentSublistValue({
                                sublistId: 'itempricing',
                                fieldId: 'item',
                                line:lineSelected,
                                value: custom_param_items_to_convert_formated[i].item
                            });
                            customer.setCurrentSublistValue({
                                sublistId: 'itempricing',
                                fieldId: 'level',
                                line:lineSelected,
                                value: custom_param_items_to_convert_formated[i].priceLevel
                            });
                            // if(custom_param_items_to_convert_formated[i].priceLevel!=-1)
                            customer.setCurrentSublistValue({
                                sublistId: 'itempricing',
                                fieldId: 'price',
                                line:lineSelected,
                                value: custom_param_items_to_convert_formated[i].sellPrice
                            });
                            customer.commitLine({
                                sublistId: 'itempricing'
                            });
                        } catch (error) {
                            log.debug('error edit current line', error)
                        }
                    }
                  }
                  customer.save({
                    ignoreMandatoryFields: true
                });
                var newLineCount = customer.getLineCount({
                    sublistId: 'itempricing'
                })
                log.debug("newLineCount",newLineCount)
                }
        } catch (error) {
            log.debug("onRequest", error)
        }
    }

    return {
        onRequest: onRequest
    }
});



