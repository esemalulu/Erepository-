/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/email', 'N/search', 'N/runtime', 'N/record'],
    /**
     * @param {email} email
     * @param {search} search
     * @param {runtime} runtime
     * @param {record} record
     */
    function(email, search, runtime, record) {
        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function afterSubmit(scriptContext) {
            try{

                var recordObj = scriptContext.newRecord;
            var recordType = recordObj.type
            var recordId = recordObj.id
            log.debug({
                title: 'Script Run',
                details: recordType + ':' + recordId
            });

            var recStatus = recordObj.getValue({
                fieldId: 'approvalstatus'
            })
            if (recStatus != '2') {

                if (isEmpty(recordObj.getValue({
                        fieldId: 'custbody_dwave_justification'
                    }))) {
                    //continue
                    var poRecord = record.load({
                        type: recordType,
                        id: recordId,
                        isDynamic: false
                    });

                    //getLineItems
                    var lineitems = [];
                    var lineitemDetails = [];
                    var lineLength = poRecord.getLineCount({
                        sublistId: 'item'
                    })
                    for (var x = 0; x < lineLength; x++) {
                        
                        if (isEmpty(poRecord.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'linkedorder',
                                line: x
                            }))) {

                            var item = poRecord.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'item',
                                line: x
                            });
                            var qty = poRecord.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'quantity',
                                line: x
                            });
                            lineitems.push(item);
                            lineitemDetails.push({
                                id: item,
                                quantity: qty
                            });

                        } else {
                            //skip line
                        }
                    }

                    var jdata = searchJustification(lineitems)
                    // log.debug({
                    //     title: 'jdata1',
                    //     details: jdata
                    // })
                    //isEmpty(jdata) ? jdata = [] : jdata = jdata;
                    // log.debug({
                    //     title: 'jdata2',
                    //     details: jdata
                    // })

                    try{
                        var jdataMlength = jdata.mitems.length;
                    }
                    catch(e){
                        var jdataMlength = 0;
                    }
                    
                    if (jdataMlength > 0) {

                        var missing = [];
                        jdata.mitems.forEach(function(v, i) {
                            var itemdata = getItemDetails(v);
                            missing.push("Item:" + itemdata.itemname + " with Quantity: " + lineitemDetails.find(x => x.id === v).quantity + " ordered based on below Reorder point:" + itemdata.reorderpoint + "|Preffered stock level:" + itemdata.preferredstocklevel)
                        })
                        //lineitemDetails.find(x => x.id===jdata.mitems[0])

                    } else {
                        var missing = false
                    }

                    var justfield = ''

                    try{
                        var jdataJlength = jdata.just.length;
                    }
                    catch(e){
                        var jdataJlength = 0;
                    }
                    if (jdataJlength > 0) {

                        jdata.just.forEach(function(v, i) {
                            justfield = justfield + "Work Order: " + v.workorder + "|" + v.justfication + "\n"
                        })

                    }
                    
                    if (missing) {
                        // log.debug({
                        //     title: 'missing',
                        //     details: missing
                        // })
                        missing.forEach(function(v, i) {
                            justfield = justfield + v + "\n"
                        })
                    }

                    poRecord.setValue({
                        fieldId: 'custbody_dwave_justification',
                        value: justfield
                    });

                    try {
                        poRecord.save();
                    } catch (e) {
                        log.error({
                            title: 'Error Saving',
                            details: e
                        })
                    }

                } else {
                    //skip
                    log.debug({
                        title: 'Status',
                        details: 'Justification already populated'
                    })
                }

            } else {
                //skip
                log.debug({
                    title: 'Status',
                    details: 'Record already approved'
                })
            }

            }catch(e){
                log.debug({
                    title: 'First Error',
                    details: e
                })
            }
            


            function getItemDetails(paramId) {

                //lookup or search?
                var itemlookup = search.lookupFields({
                    type: search.Type.ITEM,
                    id: paramId,
                    columns: ['itemid', 'reorderpoint', 'preferredstocklevel']
                })

                var reorderpoint = 0;
                var preferredstocklevel = 0;

                isEmpty(itemlookup.reorderpoint) ? 'empty' : reorderpoint = itemlookup.reorderpoint;
                isEmpty(itemlookup.preferredstocklevel) ? 'empty' : preferredstocklevel = itemlookup.preferredstocklevel;

                return {
                    itemname: itemlookup.itemid,
                    reorderpoint: reorderpoint,
                    preferredstocklevel: preferredstocklevel
                }

            }

            function searchJustification(paramArr) {
                // log.debug({
                //     title: 'paramArr',
                //     details: paramArr
                // })
                
                var justificationArr = [];

                var workorderSearchObj = search.create({
                    type: "workorder",
                    filters: [
                        ["type", "anyof", "WorkOrd"],
                        "AND",
                        ["firmed", "is", "T"],
                        "AND",
                        ["status", "anyof", "WorkOrd:B", "WorkOrd:A"],
                        "AND",
                        ["item", "anyof", paramArr]
                    ],
                    columns: [
                        search.createColumn({
                            name: "item",
                            label: "Item"
                        }),
                        search.createColumn({
                            name: "custbody_dwave_justification",
                            label: "Justification"
                        }),
                        search.createColumn({
                            name: "transactionnumber",
                            label: "Transaction Number"
                        })
                    ]
                });

                var searchResultCount = workorderSearchObj.runPaged().count;

                if (searchResultCount > 0) {
                    workorderSearchObj.run().each(function(result) {
                        var item = result.getValue({
                            name: 'item',
                        });
                        var itemname = result.getText({
                            name: 'item',
                        });
                        var justfication = result.getValue({
                            name: 'custbody_dwave_justification',
                        });
                        var woNumber = result.getValue({
                            name: 'transactionnumber',
                        })

                        justificationArr.push({
                            itemname: itemname,
                            itemid: item,
                            workorder: woNumber,
                            justfication: isEmpty(justfication) ? 'No justification found' : justfication.toLowerCase()
                        })
                        
                        return true;
                    });

                    //check if item is in saved search
                    var missingitems = [];
                    paramArr.forEach(function(v, i) {
                        justificationArr.find(x => x.itemid === v) ? 'item exist' : missingitems.push(v)
                    })
                    //filter unique justification
                    const key = 'justfication';

                    const uniqueJustification = [...new Map(justificationArr.map(item => [item[key], item])).values()];
                    var returnObj = {
                        just: uniqueJustification,
                        mitems: missingitems
                    }
                    log.debug({
                        title:'returnObj',
                        details: returnObj
                    })
                    return returnObj
                } else {
                    return {
                        just: false,
                        mitems: paramArr
                    };
                }

            }
            //helpers
            function isEmpty(param) {
                if ((param == '') || (param == null) || (param == undefined) ||
                    (param.toString().charCodeAt() == 32)) {
                    return true;
                } else {
                    return false;
                }
            }

        }

        return {
            afterSubmit: afterSubmit
        };

    });