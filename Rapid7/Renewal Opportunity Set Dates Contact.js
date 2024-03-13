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

            try{
                let oppRecID = scriptContext.newRecord.id;
                let oppRec = record.load({
                    type: record.Type.OPPORTUNITY,
                    id: oppRecID,
                    isDynamic: true
                });

                const title = oppRec.getValue({fieldId: 'title'});
                log.debug('title',title);

                if(title.includes('Renewal')){
                    const lineCount =oppRec.getLineCount({sublistId: 'item'});
                    log.debug('lineCount',lineCount);

                    let startDate;
                    let endDate;
                    let created_ra;
                    let contact;

                    for(let i=0;i<lineCount;i++){

                        let currLineItemType= oppRec.getSublistValue({sublistId: 'item' , fieldId: 'itemtype', line: i});
                        log.debug('currLineItemType',currLineItemType);

                        if(currLineItemType == 'Group'){

                            log.debug('Group Item Type found');

                            startDate = oppRec.getSublistValue({sublistId: 'item' , fieldId: 'custcolr7startdate', line: i});
                            endDate = oppRec.getSublistValue({sublistId: 'item' , fieldId: 'custcolr7enddate', line: i});
                            created_ra = oppRec.getSublistValue({sublistId: 'item' , fieldId: 'custcolr7createdfromra', line: i});
                            contact = oppRec.getSublistValue({sublistId: 'item' , fieldId: 'custcolr7translinecontact', line: i});

                            log.debug('startDate',startDate);
                            log.debug('endDate',endDate);
                            log.debug('created_ra',created_ra);
                            log.debug('contact',contact);
                        }
                        if(currLineItemType == 'EndGroup'){
                            log.debug('EndGroup Item Type found');
                            for (let x = i - 1; x >= 1; x--) {
                                let itemtype= oppRec.getSublistValue({sublistId: 'item' , fieldId: 'itemtype', line: x});
                                if (itemtype != 'Group' && itemtype != 'EndGroup') {
                                    oppRec.selectLine({sublistId:'item', line: x});

                                    let currentStartDate = oppRec.getCurrentSublistValue({sublistId: 'item', fieldId: 'custcolr7startdate', value: startDate});
                                    if(!currentStartDate){
                                        log.debug('Empty startDate',startDate);
                                        oppRec.setCurrentSublistValue({sublistId: 'item', fieldId: 'custcolr7startdate', value: startDate});
                                    }

                                    let currentEndDate = oppRec.getCurrentSublistValue({sublistId: 'item', fieldId: 'custcolr7enddate', value: startDate});
                                    if(!currentEndDate){
                                        log.debug('Empty endDate',endDate);
                                        oppRec.setCurrentSublistValue({sublistId: 'item', fieldId: 'custcolr7enddate', value: endDate});
                                    }

                                    let currentCreated_RA = oppRec.getCurrentSublistValue({sublistId: 'item', fieldId: 'custcolr7createdfromra', value: startDate});
                                    if(!currentCreated_RA){
                                        log.debug('Empty created_ra',created_ra);
                                        oppRec.setCurrentSublistValue({sublistId: 'item', fieldId: 'custcolr7createdfromra', value: created_ra});
                                    }

                                    let currentContact = oppRec.getCurrentSublistValue({sublistId: 'item', fieldId: 'custcolr7translinecontact', value: startDate});
                                    if(!currentContact){
                                        log.debug('Empty contact',contact);
                                        oppRec.setCurrentSublistValue({sublistId: 'item', fieldId: 'custcolr7translinecontact', value: contact});
                                    }

                                    oppRec.commitLine({sublistId:'item'});

                                }else{
                                    break;
                                }
                            }
                        }
                    }

                    const id = oppRec.save();
                    log.debug('id',id);   
                }
                

            }catch (ex){
                log.error('afterSubmit', ex)
            }
        }

        return {afterSubmit}

    });