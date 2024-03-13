/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/log', 'N/record', 'N/search'],
    (log, record, search) => {

        const getInputData = (inputContext) => {
            try {
                const vendorSearchObj = search.create({
                   type: "vendor",
                   filters:
                   [
                      ["custentityr7_approval_status","noneof","1"]
                   ],
                   columns:
                   [
                      search.createColumn({name: "internalid"}),
                      search.createColumn({
                         name: "entityid",
                         sort: search.Sort.ASC,
                         label: "Name"
                      }),
                      search.createColumn({name: "isinactive"})
                   ]
                });
                var searchResultCount = vendorSearchObj.runPaged().count;
                log.debug("vendorSearchObj result count",searchResultCount);

                return vendorSearchObj;
            }catch (e) {
                log.error({ title: 'error occured on getInputData stage', details: e });
            }
        }

        const map = (mapContext) => {
            try{
                const contextValues = JSON.parse(mapContext.value);
                //log.debug('contextValues', contextValues);

                mapContext.write({
                    key: contextValues.id,
                    value: contextValues.values.isinactive
                });

            }catch (e) {
                log.error({ title: 'error occured on map stage', details: e });
            } 
        }

        const reduce = (reduceContext) => {
            try {
                //log.debug('reduceContext', reduceContext);
                let vendorId = reduceContext.key;
                let isInactive = reduceContext.values[0];
                log.debug('vendorId', vendorId);
                log.debug('isInactive', isInactive);

                const vendorRecObj = record.load({
                    type: record.Type.VENDOR,
                    id: vendorId,
                    isDynamic: true,
                });
                const achLineCount = vendorRecObj.getLineCount({
                    sublistId: 'achacct'
                });  
                log.debug('achLineCount',achLineCount);

                if(achLineCount>0){
                    if(isInactive == 'T'){
                        vendorId = setVendorActiveInactive(vendorId, false);
                    }
                    createACHDetails(vendorRecObj,vendorId,achLineCount);
                    if(isInactive == 'T'){
                        vendorId = setVendorActiveInactive(vendorId, true);
                    }
                }
            } catch (e) {
                log.error({ title: 'error occured on reduce stage', details: e });
            }
        }

        const summarize = (summaryContext) => {
            try {
                log.audit({
                    title: 'summary',
                    details: JSON.stringify(summaryContext),
                });
            } catch (e) {
                log.error({ title: 'error occured on summarize stage', details: e });
            }
        }

        function setVendorActiveInactive(vendorId, isInactive) {
            const vendorIdNew = record.submitFields({
                type: 'vendor',
                id: vendorId,
                values: {
                    'isinactive': isInactive
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            });
            //log.debug('setVendorActiveInactive vendorIdNew', vendorIdNew);
            return vendorIdNew;
        }

        function createACHDetails(vendorRecObj,vendorId,achLineCount) {
      
            for(let i=0;i<achLineCount;i++){
                const bankname = vendorRecObj.getSublistValue({sublistId: 'achacct',fieldId: 'bankname',line: i});
                //log.debug('bankname',bankname);
                const routingnumber = vendorRecObj.getSublistValue({sublistId: 'achacct',fieldId: 'routingnumber',line: i});
                //log.debug('routingnumber',routingnumber);
                const accountnumber = vendorRecObj.getSublistValue({sublistId: 'achacct',fieldId: 'accountnumber',line: i});
                //log.debug('accountnumber',accountnumber);
                const limit = vendorRecObj.getSublistValue({sublistId: 'achacct',fieldId: 'limit',line: i});
                //log.debug('limit',limit);
                const issavings = vendorRecObj.getSublistValue({sublistId: 'achacct',fieldId: 'issavings',line: i});
                //log.debug('issavings',issavings);
                const addenda = vendorRecObj.getSublistValue({sublistId: 'achacct',fieldId: 'addenda',line: i});
                //log.debug('addenda',addenda);
                const sendaddenda = vendorRecObj.getSublistValue({sublistId: 'achacct',fieldId: 'sendaddenda',line: i});
                //log.debug('sendaddenda',sendaddenda);
                const includetransaction = vendorRecObj.getSublistValue({sublistId: 'achacct',fieldId: 'includetransaction',line: i});
                //log.debug('includetransaction',includetransaction);
                const isinactive = vendorRecObj.getSublistValue({sublistId: 'achacct',fieldId: 'isinactive',line: i});
                //log.debug('isinactive',isinactive);
                const achRecObj = record.create({ type: 'customrecord_r7_ach_details' });
                achRecObj.setValue({fieldId: 'custrecord_r7_ach_vendor',value: vendorId});
                achRecObj.setValue({fieldId: 'custrecord_r7_ach_bankname',value: bankname});
                achRecObj.setValue({fieldId: 'custrecord_r7_ach_routingnumber',value: routingnumber});
                achRecObj.setValue({fieldId: 'custrecord_r7_ach_accountnumber',value: accountnumber});
                achRecObj.setValue({fieldId: 'custrecord_r7_ach_limit',value: limit});
                achRecObj.setValue({fieldId: 'custrecord_r7_ach_savingsaccount',value: issavings});
                achRecObj.setValue({fieldId: 'custrecord_r7_ach_addenda',value: addenda});
                achRecObj.setValue({fieldId: 'custrecord_r7_ach_sendaddenda',value: sendaddenda});
                achRecObj.setValue({fieldId: 'custrecord_r7_ach_include_transinaddenda',value: includetransaction});
                achRecObj.setValue({fieldId: 'custrecord_r7_ach_inactive',value: isinactive});

                const achDetailsId = achRecObj.save({enableSourcing: true,ignoreMandatoryFields: true});
                log.debug('achDetailsId',achDetailsId);
            }

        }

        return {getInputData, map, reduce, summarize}

    });