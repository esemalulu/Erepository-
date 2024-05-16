/**
 *@NApiVersion 2.0
 *@NScriptType mapreducescript

 */
define(['N/search', 'N/record', 'N/log', 'N/runtime'],

    function (search, record, log, runtime) {

        return {

            getInputData: function (context) {
                try {

                    try {//Item UPC by UOM is 94480 filter test in SB
                        var mySearch = search.load({
                            id: 'customsearch_sdb_ups_by_uom'
                        });
                    } catch (e) {
                        log.debug({
                            title: 'Error in getInputData',
                            details: e
                        })
                    }
                } catch (e) {
                    log.error({ title: 'error getInputData ', details: JSON.stringify(e) });
                }
                return mySearch;
            },

            map: function (context) {
                try {
                  //  log.debug({ title: 'context.value', details: JSON.parse(context.value) });
                } catch (e) {
                    log.error({ title: 'error map', details: JSON.stringify(e) });
                }
                context.write({
                    key: context.key,
                    value: context.value
                });
            },

            reduce: function (context) {
                try {
                    log.debug({ title: 'key reduce', details: context.key });
                    var objs = JSON.parse(context.values[0])
                    log.audit({ title: 'arrObjs reduce', details: objs });
                    // {
                    //     recordType: "customrecord_sdb_acme_upc_sap_uom",
                    //     id: "94480",
                    //     values: {
                    //        custrecord_sdb_acme_upc: "10031009063458",
                    //        custrecord_sdb_acme_sap: "1156908",
                    //        custrecord_sdb_acme_uom: "Cases",
                    //        custrecord_sdb_item_croos_ref: "",
                    //        custrecord_sdb_acme_item:'1234'
                    //     }
                    //  }
                    var item = objs.values['custrecord_sdb_acme_item'].value
                    //log.debug('item', item)
                    var item = objs.values['custrecord_sdb_acme_item'].value
                    var sapCode = objs.values['custrecord_sdb_acme_sap']
                    var upcCode = objs.values['custrecord_sdb_acme_upc']
                    var croos_ref = objs.values['custrecord_sdb_item_croos_ref'].value

                    var crossRef = itemCrossReferences(item, sapCode, upcCode, croos_ref)
                    
                    if (crossRef) {
                        log.audit('add crossRef ' + crossRef + ' to:', crossRef)
                        record.submitFields({
                            type: objs.recordType,
                            id: objs.id,
                            values: {
                                custrecord_sdb_item_croos_ref: crossRef,
                                custrecord_sdb_create_from_mr: true
                            }
                        })
                    } else {

                        var rec = record.create({
                            type: 'customrecord_sps_cxref',
                            // isDynamic: true,
                        })
                        rec.setValue({
                            fieldId: 'custrecord_sps_cxref_customer',
                            value: '',
                        })
                        rec.setValue({
                            fieldId: 'custrecord_sps_cxref_item',
                            value: item,
                        })
                        rec.setValue({
                            fieldId: 'custrecord_sps_cxref_pn0',
                            value: sapCode,
                        })
                        rec.setValue({
                            fieldId: 'custrecord_sps_cxref_upc',
                            value: upcCode,
                        })

                        var newRecCroosRef = rec.save({
                            ignoreMandatoryFields: true
                        })
                      //  log.debug('else:Create new ', 'Create new newRecCroosRef ' + newRecCroosRef)
                        log.audit('newRecCroosRef', newRecCroosRef)
                        if (newRecCroosRef) {
                            record.submitFields({
                                type: objs.recordType,
                                id: objs.id,
                                values: {
                                    custrecord_sdb_item_croos_ref: newRecCroosRef,
                                    custrecord_sdb_create_from_mr: true
                                }
                            })
                        }
                    }

                } catch (e) {
                    log.error({
                        title: 'ERROR reduce',
                        details: 'ERROR ' + JSON.stringify(e)
                    })
                }
            },

            summarize: function (context) {
                try {
                    log.audit({ title: 'context summarize', details: context });
                    context.output.iterator().each(function (key, value) {
                        return true;
                    });
                } catch (e) {
                    log.error({
                        title: 'summarize',
                        details: 'ERROR ' + JSON.stringify(e)
                    })
                }
            }

        }

        function itemCrossReferences(item, sapCode, upcCode, crossRef) {
            try {

                var filter = [["internalid", "anyof", crossRef]];
                if (!crossRef) {
                    filter = [
                        ["custrecord_sps_cxref_item", "anyof", item],
                        "AND",
                        [["custrecord_sps_cxref_pn0", "is", sapCode], "OR", ["custrecord_sps_cxref_upc", "is", upcCode]]
                    ]
                }

                var customrecord_sps_cxrefSearchObj = search.create({
                    type: "customrecord_sps_cxref",
                    filters: filter,
                    columns:
                        []
                });
                var searchResultCount = customrecord_sps_cxrefSearchObj.runPaged().count;

                log.debug("crossRef result count", searchResultCount);
                var rcdId = '';
                customrecord_sps_cxrefSearchObj.run().each(function (result) {
                    rcdId = result.id
                    return false;
                });
                log.debug('Update crossRef :', rcdId);

                if (rcdId) {
                    var rec = record.load({
                        type: 'customrecord_sps_cxref',
                        id: rcdId,
                        isDynamic: true,

                    })
                    var customer = rec.getValue({
                        fieldId: 'custrecord_sps_cxref_customer'
                    });

                    rec.setValue({
                        fieldId: 'custrecord_sps_cxref_pn0',
                        value: sapCode,
                    })
                    rec.setValue({
                        fieldId: 'custrecord_sps_cxref_upc',
                        value: upcCode,
                    })
                    rec.setValue({
                        fieldId: 'custrecord_sps_cxref_customer',
                        value: customer || "",
                    })
                    rec.save({
                        ignoreMandatoryFields: true
                    })
                }
                return rcdId
            } catch (error) {
                log.error({
                    title: 'itemCrossReferences',
                    details: 'ERROR ' + error
                })
            }
        }


    });


