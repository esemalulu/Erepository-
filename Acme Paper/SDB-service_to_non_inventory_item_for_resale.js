/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/log', 'N/record', 'N/recordContext', 'N/search'],
    /**
 * @param{log} log
 * @param{record} record
 * @param{recordContext} recordContext
 * @param{search} search
 */
    (log, record, recordContext, search) => {

        const getInputData = () => {
            try {
                var itemSearchObj = search.create({
                    type: "item",
                    filters:
                    [
                       ["type","anyof","Service"], 
                       "AND", 
                       ["internalid","anyof","99392","103537","103538","103540","103542","103543","103544","103545","103546","103547","103548","103549","103550","103553","103554","103560","103562","103575","103576","103577","103578","103579","103580","103581","103587","103588","103589","103590","103591","103606","103709","105148","105350","119975","129571","129573","129574","129575","129576","129577","129578","129579","129580","129581","129582","129583","129584","129641","129642","129643","130667","130668","130669","130922","130994","131067","131119","131192"],
                       "AND", 
                        ["subtype","anyof","Resale"]
                    ],
                    columns:
                    [
                       search.createColumn({name: "itemid", label: "Name"}),
                       search.createColumn({name: "internalid", label: "Internal ID"}),
                       search.createColumn({name: "displayname", label: "Display Name"}),
                       search.createColumn({name: "salesdescription", label: "Description"}),
                       search.createColumn({name: "class", label: "Product Category"}),
                       search.createColumn({name: "taxschedule", label: "Tax Schedule"}),
                       search.createColumn({name: "custitem_tax_type", label: "Item Tax Type"}),
                       search.createColumn({name: "saleunit", label: "Primary Sale Unit"}),
                       search.createColumn({name: "purchaseunit", label: "Primary Purchase Unit"}),
                       search.createColumn({name: "custitem_acc_packsize", label: "Pack Size"}),
                       search.createColumn({name: "custitem_dnr", label: "DNR"}),
                       search.createColumn({name: "custitem_acc_base_cost", label: "Base Cost"}),
                       search.createColumn({name: "purchasedescription", label: "Purchase Description"}),
                       search.createColumn({name: "enforceminqtyinternally", label: "Enforce Minimum Quantity Internally"}),
                       search.createColumn({name: "costestimatetype", label: "Cost Estimate Type"}),
                       search.createColumn({name: "custitem_atlas_item_image", label: "Item Image"}),
                       search.createColumn({name: "minimumquantity", label: "Minimum Quantity"}),
                       search.createColumn({name: "maximumquantity", label: "Maximum Quantity"}),
                       search.createColumn({name: "vendorname", label: "Vendor Name"}),
                       search.createColumn({name: "custitem_acc_notes", label: "Item Notes"}),
                       search.createColumn({name: "custitem_auto_quote_celigo_itemid", label: "Auto Quote Item Id"}),
                       search.createColumn({name: "custitem_acc_item_description", label: "Item Description"}),
                       search.createColumn({name: "custitem_printed_name", label: "Printed Name"}),
                       search.createColumn({name: "subsidiary", label: "Subsidiary"}),
                       search.createColumn({name: "includechildren", label: "Include Children"}),
                       search.createColumn({name: "custitem_sds_fileid", label: "SDS FILE ID"}),
                       search.createColumn({name: "custitem11", label: "Myron"}),
                       search.createColumn({name: "isfulfillable", label: "Can be Fulfilled"}),
                       search.createColumn({name: "generateaccruals", label: "Generate Accruals"}),
                       search.createColumn({name: "offersupport", label: "Offer Support"}),
                       search.createColumn({name: "incomeaccount", label: "Income Account"}),
                       search.createColumn({name: "intercoincomeaccount", label: "Intercompany Income Account"}),
                       search.createColumn({name: "billqtyvarianceacct", label: "Bill Quantity Variance Account"}),
                       search.createColumn({name: "billpricevarianceacct", label: "Bill Price Variance Account"}),
                       search.createColumn({name: "custitem_income_account_number", label: "Income Account Number"}),
                       search.createColumn({name: "billexchratevarianceacct", label: "Bill Exchange Rate Variance Account"}),
                       search.createColumn({
                          name: "formulatextintercoexpenseaccount",
                          formula: "{intercoexpenseaccount}",
                          label: "Intercompany Expense Account"
                       }),
                       search.createColumn({name: "custitem_expense_cogs_acct_number", label: "Expense/COGS Account Number"}),
                       search.createColumn({name: "unitstype", label: "Primary Units Type"}),
                       search.createColumn({name: "expenseaccount", label: "Expense/COGS Account"}),
                       search.createColumn({
                        name: "internalid",
                        join: "vendor",
                        label: "Internal ID"
                     }),
                    ]
                 });
                 log.debug('itemSearchObj',itemSearchObj)
                 return itemSearchObj;
            } catch (error) {
               log.error('Error in getInputData()', error)
            }
        }

        const map = (mapContext) => {
            if(mapContext.value != '' && mapContext.value != null && mapContext.value != undefined){
                try{
                    var serviceObj = JSON.parse(mapContext.value);
                    log.debug('service object', serviceObj);
                    var newNonInventoryItemForResale = record.create({
                        type: 'noninventoryitem',
                    });
                    try {
                        newNonInventoryItemForResale.setValue({
                            fieldId: 'subtype',
                            value: 'resale',
                        });
                    } catch (error) {
                        log.error('Error in subtype', error);
                    }
                    
                    try {
                        newNonInventoryItemForResale.setValue({
                            fieldId: 'itemid',
                            value: serviceObj.values.itemid || '',
                        });
                    } catch (error) {
                        log.error('Error in itemid', error);
                    }

                    //custitem_acc_packsize
                    try {
                        newNonInventoryItemForResale.setValue({
                            fieldId: 'custitem_acc_packsize',
                            value: serviceObj.values.custitem_acc_packsize || 1,
                        });
                    } catch (error) {
                        log.error('Error in custitem_acc_packsize', error);
                    }
                    
                    try {
                        newNonInventoryItemForResale.setValue({
                            fieldId: 'class',
                            value: serviceObj.values.class?.value,
                        });
                    } catch (error) {
                        log.error('Error in class', error);
                    }
                    
                    try {
                        newNonInventoryItemForResale.setValue({
                            fieldId: 'displayname',
                            value: serviceObj.values.displayname || '',
                        });
                    } catch (error) {
                        log.error('Error in displayname', error);
                    }
                    
                    try {
                        newNonInventoryItemForResale.setValue({
                            fieldId: 'vendorname',
                            value: serviceObj.values.vendorname || '',
                        });
                    } catch (error) {
                        log.error('Error in vendorname', error);
                    }
                    
                    try {
                        newNonInventoryItemForResale.setValue({//74
                            fieldId: 'unitstype',
                            value: serviceObj.values.unitstype?.value && serviceObj.values.unitstype.value == ("1") ? 74 : serviceObj.values.unitstype.value,
                        });
                    } catch (error) {
                        log.error('Error in unitstype', error);
                    }
                    
                    /*try {
                        newNonInventoryItemForResale.setValue({
                            fieldId: 'purchaseunit',
                            value: 234//serviceObj.values.purchaseunit?.value || '',
                        });
                    } catch (error) {
                        log.error('Error in purchaseunit', error);
                    }*/
                    
                    /*try {
                        newNonInventoryItemForResale.setValue({
                            fieldId: 'saleunit',
                            value: 234//serviceObj.values.saleunit?.value || '',
                        });
                    } catch (error) {
                        log.error('Error in saleunit', error);
                    }*/
                    
                    try {
                        newNonInventoryItemForResale.setValue({
                            fieldId: 'custitem_acc_notes',
                            value: serviceObj.values.custitem_acc_notes || '',
                        });
                    } catch (error) {
                        log.error('Error in custitem_acc_notes', error);
                    }
                    
                    
                    
                    try {
                        newNonInventoryItemForResale.setValue({
                            fieldId: 'custitem_tax_type',
                            value: serviceObj.values.custitem_tax_type?.value,
                        });
                    } catch (error) {
                        log.error('Error in custitem_tax_type', error);
                    }
                    
                    try {
                        newNonInventoryItemForResale.setValue({
                            fieldId: 'taxschedule',
                            value: serviceObj.values.taxschedule?.value || '',
                        });
                    } catch (error) {
                        log.error('Error in taxschedule', error);
                    }
                    
                    
                    try {
                        newNonInventoryItemForResale.setValue({
                            fieldId: 'custitem_acc_base_cost',
                            value: serviceObj.values.custitem_acc_base_cost,
                        });
                    } catch (error) {
                        log.error('Error in custitem_acc_base_cost', error);
                    }
                    
                    try {
                        newNonInventoryItemForResale.setValue({
                            fieldId: 'purchasedescription',
                            value: serviceObj.values.purchasedescription || '',
                        });
                    } catch (error) {
                        log.error('Error in purchasedescription', error);
                    }
                    
                    try {
                        newNonInventoryItemForResale.setValue({
                            fieldId: 'salesdescription',
                            value: serviceObj.values.salesdescription || '',
                        });
                    } catch (error) {
                        log.error('Error in salesdescription', error);
                    }
                    
                    try {
                        newNonInventoryItemForResale.setText({
                            fieldId: 'costestimatetype',
                            value: serviceObj.values.costestimatetype || '',
                        });
                    } catch (error) {
                        log.error('Error in costestimatetype', error);
                    }
                    
                    try {
                        newNonInventoryItemForResale.setValue({
                            fieldId: 'incomeaccount',
                            value: serviceObj.values.incomeaccount?.value || '',
                        });
                    } catch (error) {
                        log.error('Error in incomeaccount', error);
                    }
                    
                    try {
                        newNonInventoryItemForResale.setValue({
                            fieldId: 'intercoincomeaccount',
                            value: serviceObj.values.intercoincomeaccount || '',
                        });
                    } catch (error) {
                        log.error('Error in intercoincomeaccount', error);
                    }
                    
                    
                    try {
                        newNonInventoryItemForResale.setValue({
                            fieldId: 'subsidiary',
                            value: [serviceObj.values.subsidiary.value] || '',
                        });
                    } catch (error) {
                        log.error('Error in subsidiary', error);
                    }
                    
                    try {
                        newNonInventoryItemForResale.setValue({
                            fieldId: 'includechildren',
                            value: serviceObj.values.includechildren === 'T',
                        });
                    } catch (error) {
                        log.error('Error in includechildren', error);
                    }
                    
                    try {
                        newNonInventoryItemForResale.setValue({
                            fieldId: 'expenseaccount',
                            value: serviceObj.values.expenseaccount.value || '',
                        });
                    } catch (error) {
                        log.error('Error in expenseaccount', error);
                    }
                    
                    try {
                        newNonInventoryItemForResale.setText({
                            fieldId: 'intercoexpenseaccount',
                            value: serviceObj.values.formulatextintercoexpenseaccount || '',
                        });
                    } catch (error) {
                        log.error('Error in intercoexpenseaccount', error);
                    }
                    
                    try {
                        newNonInventoryItemForResale.setValue({
                            fieldId: 'custitem_auto_quote_celigo_itemid',
                            value: serviceObj.values.custitem_auto_quote_celigo_itemid || '',
                        });
                    } catch (error) {
                        log.error('Error in custitem_auto_quote_celigo_itemid', error);
                    }
                    
                    try {
                        newNonInventoryItemForResale.setValue({
                            fieldId: 'custitem_printed_name',
                            value: serviceObj.values.custitem_printed_name || '',
                        });
                    } catch (error) {
                        log.error('Error in custitem_printed_name', error);
                    }
                    
                    try {
                        newNonInventoryItemForResale.setValue({
                            fieldId: 'custitem_income_account_number',
                            value: serviceObj.values.custitem_income_account_number || '',
                        });
                    } catch (error) {
                        log.error('Error in custitem_income_account_number', error);
                    }
                    
                    try {
                        newNonInventoryItemForResale.setValue({
                            fieldId: 'custitem_expense_cogs_acct_number',
                            value: serviceObj.values.custitem_expense_cogs_acct_number || '',
                        });
                    } catch (error) {
                        log.error('Error in custitem_expense_cogs_acct_number', error);
                    }
                    
                    try {
                        newNonInventoryItemForResale.setValue({
                            fieldId: 'custitem11',
                            value: serviceObj.values.custitem11 == 'T' ? true : false,
                        });
                    } catch (error) {
                        log.error('Error in custitem11', error);
                    }
                    
                    try {
                        newNonInventoryItemForResale.setValue({
                            fieldId: 'availabletopartners',
                            value: serviceObj.values.availabletopartners == 'T' ? true : false,
                        });
                    } catch (error) {
                        log.error('Error in availabletopartners', error);
                    }
                    
                    try {
                        newNonInventoryItemForResale.setValue({
                            fieldId: 'isfulfillable',
                            value: serviceObj.values.isfulfillable == 'T' ? true : false,
                        });
                    } catch (error) {
                        log.error('Error in isfulfillable', error);
                    }
                    
                    try {
                        newNonInventoryItemForResale.setValue({
                            fieldId: 'generateaccruals',
                            value: serviceObj.values.generateaccruals == 'T' ? true : false,
                        });
                    } catch (error) {
                        log.error('Error in generateaccruals', error);
                    }
                    
                    try {
                        newNonInventoryItemForResale.setValue({
                            fieldId: 'offersupport',
                            value: serviceObj.values.offersupport == 'T' ? true : false,
                        });
                    } catch (error) {
                        log.error('Error in offersupport', error);
                    }
                    
                   
                    var vendorCount = newNonInventoryItemForResale.getLineCount({
                        sublistId: 'itemvendor'
                    })
                    try {
                        newNonInventoryItemForResale.setSublistValue({
                            sublistId: 'itemvendor',
                            fieldId: 'vendor',
                            line: vendorCount,
                            value: serviceObj.values["internalid.vendor"].value, //Agregar el valor en la columna de la search
                        });
                    } catch (error) {
                       log.error('Error itemvendor - vendor', error)
                    }
                    try {
                        newNonInventoryItemForResale.setSublistValue({
                            sublistId: 'itemvendor',
                            fieldId: 'purchaseprice',
                            line: vendorCount,
                            value: serviceObj.values.cost, 
                        });
                    } catch (error) {
                        log.error('ERROR itemvendor purchaseprice', error);
                    }
                    var newRecId = newNonInventoryItemForResale.save(true, true);

                    var serviceToInactivate = record.submitFields({
                        type: 'serviceitem',
                        id: serviceObj.id,
                        values: {
                            custitem_sdb_new_non_inv_item_resale: newRecId,
                            isinactive: true
                        }
                    });

                } catch(error){
                    log.error('map stage error: ', error);
                }	
            }	
        }

        const reduce = (reduceContext) => {

        }


        const summarize = (summaryContext) => {

        }

        return {getInputData, map, reduce, summarize}

    });
