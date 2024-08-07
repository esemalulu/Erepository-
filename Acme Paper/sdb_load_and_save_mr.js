/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 */
define(["N/search", "N/record", "N/log"], function (search, record, log) {
    function getInputData() {
        try {
            return [2694014,2697091,2699717,2700117,2699620,2700219,2700021,2699823,2700221,2701219,2701717,2702117,2702517,2702522,2703317,2702718,2702720,2702822,2705623,2706922,2706624,2707323,2708621,2709122,2710621,2710923,2711022,2711523,2710928,2709426,2709640,2711724,2711725,2711927,2709531,2712621,2712823,2713322,2713423,2715224,2714727,2714728,2715527,2715236,2716631,2716936,2718032,2719145,2719150,2719553,2719555,2721995,2722997,2721577,2723508,2722095,2726944,2729699,2729704,2732370,2733172,2732674,2732174,2734968,2735370,2735375,2737369,2737868,2737570,2738868,2739568,2738874,2738879,2739074,2738885,2739178,2739182,2741369,2741570,2741572,2740975,2741375,2741377,2741275,2740988,2741083,2740991,2743370,2740992,2741087,2742976,2741192,2743571,2744670,2745770,2745870,2744873,2754017,2754651,2755251,2755352,2754755,2756855,2757355,2756858,2757757,2756864,2756867,2757558,2759354,2759355,2759656,2760956,2761356,2760861,2761459,2760864,2761063,2761262,2763056,2763756,2763558,2764857,2765371,2766456,2767460,2767958,2767764,2768460,2768362,2768464,2769758,2770360,2770658,2771157,2770860,2770663,2770761,2771267,2770765,2773657,2774460,2775457,2775660,2776882,2778773,2782027,2782836,2783326,2784026,2784028,2784130,2785695,2785896,2786000,2786098,2786199,2787995,2788098,2788296,2788100,2787799,2788000,2788499,2788203,2788111,2788402,2789295,2789795,2788600,2792196,2792397,2792198,2792300,2794096,2794397,2794902,2795200,2795804,2796697,2797197,2797497,2798098,2798303,2798499,2798802,2799801,2798907,2798504,2800799,2800801,2800200,2802098,2801599,2802599,2802100,2803502,2803400,2806000,2808163,2808744,2810330,2811134,2812248,2814601,2815300,2814704,2814508,2815004,2814512,2814905,2817000,2817400,2818203,2818306,2819008,2819408,2817306,2819914,2822112,2822612,2822114,2821813,2822016,2824113,2824312,2824114,2824215,2824015,2825312,2830852,2862892];
            // return search.load({
            //     id: 'customsearch_sdb_inv_update_with_mr',
            // })
        }
        catch (error) {
            log.error('getInputData() ERROR', error);
        }

    }

    function map(context) {
        try {
            var value = JSON.parse(context.value);
            // var internalId = value.values["GROUP(internalid)"].value;
            var internalId = value;
            context.write({
                key: internalId,
                value: internalId
            });
        }
        catch (error) {
            log.error('map() ERROR', error);
        }

    }

    function reduce(context) {
        try {
            var values = context.values;
            var internalId = values[0];

            var loadedRecord = record.load({
                type: 'invoice',
                id: internalId,
                isDynamic: true,
            });
            // var customerNetworkNumber = loadedRecord.getValue('custbody_sps_st_addresslocationnumber');
            // if(customerNetworkNumber.length < 7){
            //     loadedRecord.setValue('custbody_sps_st_addresslocationnumber', '');
            // }
            // var customerNetworkNumber = loadedRecord.getValue('custbody_sps_st_addresslocationnumber');
            // if(customerNetworkNumber.length < 7){
            //     loadedRecord.setValue('custbody_sps_st_addresslocationnumber', '');
            // }
            // editItemLineLevel(loadedRecord);
            loadedRecord.setValue({
                fieldId: 'custbodyintegrationstatus',
                value: 1,
            });
            // loadedRecord.setValue({
            //     fieldId: 'custbodyintegrationstatus',
            //     value: 1,
            // });
            var idSave = loadedRecord.save({
                ignoreMandatoryFields: true
            });
            log.debug('idSave', idSave)

        } catch (error) {
            log.error("reduce() ERROR", error);
        }

    }
    /**
     * Remove the SAP Prefix if any and fix rate and UoM for the FuelCharge item
     */
    function editItemLineLevel(loadedRecord) {
        try {
            var lineCount = loadedRecord.getLineCount({
                sublistId: 'item'
            });
            var entityId = loadedRecord.getValue("entity");
            var entityLookUpFields = search.lookupFields({
                type: search.Type.CUSTOMER,
                id: entityId,
                columns: "entityid"
            });
            var entityId = loadedRecord.getValue("entity");
            var entityLookUpFields = search.lookupFields({
                type: search.Type.CUSTOMER,
                id: entityId,
                columns: "entityid"
            });
            for (var i = 0; i < lineCount; i++) {
                loadedRecord.selectLine({
                    sublistId: 'item',
                    line: i
                });
                var editLine = false;
                var BPN = loadedRecord.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_sps_bpn',
                });
                var item = loadedRecord.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                });
                var amount = loadedRecord.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'amount',
                });
                var prefVendorName = loadedRecord.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_sdb_pref_vendor_name'
                });

                if (prefVendorName == entityLookUpFields["entityid"]) {
                    loadedRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_sdb_pref_vendor_name',
                        value: '',
                    });
                }
                var prefVendorName = loadedRecord.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_sdb_pref_vendor_name'
                });

                if (prefVendorName == entityLookUpFields["entityid"]) {
                    loadedRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_sdb_pref_vendor_name',
                        value: '',
                    });
                }

                var pattern = /SAP/;
                if (pattern.test(BPN)) {
                    BPN = BPN.slice(3);
                    loadedRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_sps_bpn',
                        value: BPN
                    });
                    editLine = true;
                }


                if (item == 101912) { //IF fuelcharge item
                    var UoM = loadedRecord.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'units',
                    });
                    var itemRate = loadedRecord.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'rate',
                    });
                    if (!UoM || !itemRate) {
                        loadedRecord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'units',
                            value: 127
                        });
                        loadedRecord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantity',
                            value: 1,
                        });
                        loadedRecord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'rate',
                            value: amount,
                        });
                        log.debug("editItemLineLevel() rate loaded is: ", loadedRecord.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'rate'
                        }));
                        editLine = true;
                    }
                }
                loadedRecord.commitLine({
                    sublistId: 'item',
                });
            }
        } catch (error) {
            log.error("editItemLineLevel() ERROR", error);
        }
    }

    function summarize(summary) {

    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});
