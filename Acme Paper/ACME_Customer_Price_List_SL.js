/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/ui/serverWidget', 'N/search', 'N/record', 'N/url', 'N/redirect', 'N/runtime'], function (serverWidget, search, record, url, redirect, runtime) { 
    function onRequest(context) {
        var form = serverWidget.createForm({
            title: 'Item Pricing Details'
        })
        var customer = form.addField({
            id: 'customer',
            type: serverWidget.FieldType.SELECT,
            label: 'Customer : ',
            source: 'customer',
            isMandatory: true
        });
        var text = form.addField({
            id: 'customername',
            type: serverWidget.FieldType.TEXT,
            label: 'Customer : ',
        });
        text.updateDisplayType({
            displayType: serverWidget.FieldDisplayType.HIDDEN
        });
        var sublist = form.addSublist({
            type: serverWidget.SublistType.LIST,
            id: 'custpage_itempricingsublist',
            label: 'Item Pricing Details'
        })
        addColumnsToSubList(sublist)
        form.addSubmitButton({
            label: 'Generate PrcieList'
        });
        form.addButton({
            id: 'download_button',
            label: 'Download',
            functionName: 'createCsvString()'
        });
        form.clientScriptModulePath = 'SuiteScripts/ACME_Customer_priceList_CS.js'
        context.response.writePage(form);

        if (context.request.method === 'POST') {
            var reamingUnits = runtime.getCurrentScript().getRemainingUsage()
            log.debug('remaining unit start', reamingUnits)
            var custIntId = context.request.parameters.customer;
            log.debug('custIntId',custIntId)

            if (custIntId !== '' && custIntId !== undefined) {
                var customerRec = record.load({
                    type: 'customer',
                    id: custIntId
                })
                var customerName = customerRec.getValue('companyname')
                text.defaultValue = customerName
                setColumnsValues(customerRec,sublist)

            } else {
                form.addPageInitMessage({
                    type: 'warning',
                    title: 'Please select customer',
                });
                context.response.writePage(form);
            }
        }
    }

    function addColumnsToSubList(sublist){
        try {
            sublist.addField({
                id: 'custpage_customer',
                type: serverWidget.FieldType.TEXT,
                label: 'Customer'
            });
            sublist.addField({
                id: 'custpage_item',
                type: serverWidget.FieldType.TEXT,
                label: 'Item'
            });
          
            sublist.addField({
                id:'custpage_price_level',
                type : serverWidget.FieldType.TEXT,
                label:'Price Level'
            })
    
            sublist.addField({
                id: 'custpage_commodity',
                label: 'Commodity',
                type: serverWidget.FieldType.TEXT,
              });

              sublist.addField({
                id: 'custpage_current_sell',
                label: 'Current Sell',
                type: serverWidget.FieldType.TEXT,
              });

              sublist.addField({
                id: 'custpage_unit_cost',
                label: 'Unit Cost C/S',
                type: serverWidget.FieldType.TEXT,
              });
              // Current GP%-
              sublist.addField({
                id: 'custpage_current_gp',
                label: 'Current GP%',
                type: serverWidget.FieldType.TEXT,
              });
              // Last Sale Date-
              sublist.addField({
                id: 'custpage_last_sale_date',
                label: 'Last Sale Date',
                type: serverWidget.FieldType.TEXT,
              });
              //Las Sell
              sublist.addField({
                id: 'custpage_last_sell',
                label: 'Last Sell C/S',
                type: serverWidget.FieldType.TEXT,
              });
              // Last Cost-
              sublist.addField({
                id: 'custpage_last_cost',
                label: 'Last Cost C/S',
                type: serverWidget.FieldType.TEXT,
              });
              //Margin - Last GP %
              sublist.addField({
                id: 'custpage_last_gp',
                label: 'Last GP%',
                type: serverWidget.FieldType.TEXT,
              });
              // Last Qty-
              sublist.addField({
                id: 'custpage_last_quantity',
                label: 'Last Qty C/S',
                type: serverWidget.FieldType.TEXT,
              });
              sublist.addField({
                id: 'custpage_wh_avail',
                label: 'WH Avail C/S',
                type: serverWidget.FieldType.TEXT,
              });
        } catch (error) {
            log.error('addColumnsToSubList ERROR:', error)
        }
    }
    function setColumnsValues(customerRec,sublist){
        try {
            var itemPricingSublistCount = customerRec.getLineCount({
                sublistId: 'itempricing'
            })
            var customerTitle = customerRec.getValue('entitytitle')
            log.debug('customerTitle',customerTitle)
            for (var i = 0; i < itemPricingSublistCount; i++) {
                sublist.setSublistValue({
                    sublistId: 'custpage_itempricingsublist',
                    id: 'custpage_customer',
                    line: i,
                    value: customerTitle?customerTitle: ' '
                })
                // var itemId = customerRec.getSublistValue({sublistId: 'itempricing',fieldId: 'item',line: i})
                var itemText = customerRec.getSublistText({sublistId: 'itempricing',fieldId: 'item',line: i})
                sublist.setSublistValue({
                    sublistId: 'custpage_itempricingsublist',
                    id: 'custpage_item',
                    line: i,
                    value: itemText?itemText: ' '
                })
                var priceLevel = customerRec.getSublistText({sublistId: 'itempricing',fieldId: 'level',line: i})
                var customPriceLevel = customerRec.getSublistValue({sublistId: 'itempricing',fieldId: 'level',line: i})
                sublist.setSublistValue({
                    sublistId: 'custpage_itempricingsublist',
                    id: 'custpage_price_level',
                    line: i,
                    value: (customPriceLevel&&customPriceLevel==-1)? 'Custom' : priceLevel?priceLevel: ' '
                })
                var commodityCode = customerRec.getSublistValue({sublistId: 'itempricing',fieldId: 'custpage_commodity',line: i})
                sublist.setSublistValue({
                    sublistId: 'custpage_itempricingsublist',
                    id: 'custpage_commodity',
                    line: i,
                    value: commodityCode?commodityCode:' '
                })
                var currentSell = customerRec.getSublistValue({sublistId: 'itempricing',fieldId: 'price',line: i})
                sublist.setSublistValue({
                    sublistId: 'custpage_itempricingsublist',
                    id: 'custpage_current_sell',
                    line: i,
                    value: currentSell?currentSell: ' '
                })
                var unitCost = customerRec.getSublistValue({sublistId: 'itempricing',fieldId: 'custpage_unit_cost',line: i})
                sublist.setSublistValue({
                    sublistId: 'custpage_itempricingsublist',
                    id: 'custpage_unit_cost',
                    line: i,
                    value: unitCost ? unitCost: ' '
                })
                var current_gp= customerRec.getSublistValue({sublistId: 'itempricing',fieldId: 'custpage_current_gp',line: i})
                sublist.setSublistValue({
                    sublistId: 'custpage_itempricingsublist',
                    id: 'custpage_current_gp',
                    line: i,
                    value: current_gp ? current_gp :  ' '
                })
                var lastSaleDate = customerRec.getSublistValue({sublistId: 'itempricing',fieldId: 'custpage_last_sale_date',line: i})
                sublist.setSublistValue({
                    sublistId: 'custpage_itempricingsublist',
                    id: 'custpage_last_sale_date',
                    line: i,
                    value: lastSaleDate?lastSaleDate:' '
                })
                var lastSell = customerRec.getSublistValue({sublistId: 'itempricing',fieldId: 'custpage_last_sell',line: i})
                sublist.setSublistValue({
                    sublistId: 'custpage_itempricingsublist',
                    id: 'custpage_last_sell',
                    line: i,
                    value: lastSell?lastSell:' '
                })
                var lastCost = customerRec.getSublistValue({sublistId: 'itempricing',fieldId: 'custpage_last_cost',line: i})
                sublist.setSublistValue({
                    sublistId: 'custpage_itempricingsublist',
                    id: 'custpage_last_cost',
                    line: i,
                    value: lastCost?lastCost:' '
                })
                var lastGP = customerRec.getSublistValue({sublistId: 'itempricing',fieldId: 'custpage_last_gp',line: i})
                sublist.setSublistValue({
                    sublistId: 'custpage_itempricingsublist',
                    id: 'custpage_last_gp',
                    line: i,
                    value: lastGP?lastGP:' '
                })
                var lastQuantity = customerRec.getSublistValue({sublistId: 'itempricing',fieldId: 'custpage_last_quantity',line: i})
                sublist.setSublistValue({
                    sublistId: 'custpage_itempricingsublist',
                    id: 'custpage_last_quantity',
                    line: i,
                    value: lastQuantity?lastQuantity:' '
                })
                var whAvail = customerRec.getSublistValue({sublistId: 'itempricing',fieldId: 'custpage_wh_avail',line: i})
                sublist.setSublistValue({
                    sublistId: 'custpage_itempricingsublist',
                    id: 'custpage_wh_avail',
                    line: i,
                    value: whAvail?whAvail:' '
                })
            }
        } catch (error) {
            log.error('setColumnsValues Error',error)
        }
    }
    return {
        onRequest: onRequest,
    }
});