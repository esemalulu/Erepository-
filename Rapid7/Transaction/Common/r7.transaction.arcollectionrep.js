/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/log', 'N/search'],

    (record, log, search) => {

        const afterSubmit = (context) => {
                const { type, newRecord, UserEventType } = context;
                const { CREATE, EDIT } = UserEventType;
                if (type === CREATE || type === EDIT) {
                        try {
                                const billingResponibleParty =  newRecord.getValue({
                                        fieldId: 'custbodyr7billingresponsibleparty'
                                });
                                log.debug('billingResponibleParty', billingResponibleParty);

                                const customer = newRecord.getValue({
                                        fieldId: 'entity'
                                });
                                log.debug('customer', customer);

                                const partner = newRecord.getValue({
                                        fieldId: 'partner'
                                });
                                log.debug('partner', partner);

                                let arCollectionRep = '';
                                if(billingResponibleParty == 3){
                                        if(partner){
                                                arCollectionRep = search.lookupFields({
                                                        type: search.Type.PARTNER,
                                                        id: partner,
                                                        columns: ['custentityr7arcollectionrep']
                                                })['custentityr7arcollectionrep'];
                                                arCollectionRep = (arCollectionRep[0])? arCollectionRep[0]['value'] : '';
                                                log.debug('partner arCollectionRep', arCollectionRep);
                                        }
                                }else{
                                        arCollectionRep = search.lookupFields({
                                                type: search.Type.CUSTOMER,
                                                id: customer,
                                                columns: ['custentityr7arcollectionrep']
                                        })['custentityr7arcollectionrep'];
                                        arCollectionRep = (arCollectionRep[0])? arCollectionRep[0]['value'] : '';
                                        log.debug('customer arCollectionRep', arCollectionRep);
                                }
                                log.debug('arCollectionRep', arCollectionRep);

                                const transactionRec = record.load({
                                        type: newRecord.type,
                                        id: newRecord.id
                                });

                                transactionRec.setValue({
                                        fieldId: 'custbodyr7arcollectionrep',
                                        value: arCollectionRep
                                });

                                const transactionRecId = transactionRec.save({enableSourcing:true, ignoreMandatoryFields: true});
                                log.debug('transactionRecId', transactionRecId);

                        }catch (ex) {
                                log.error({ title: 'ERROR in afterSubmit', details: ex });
                        }
                }
        }

        return {afterSubmit}

    });
