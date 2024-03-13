/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/log', 'N/record'], (log, record) => {

        const afterSubmit = (context) => {
            try{
                updateAssociatedContacts(context);
            }catch (err){
                log.error('Error Occurred',err);
            }
            updateCompetitorsList(context);
        }

        const updateAssociatedContacts = (context) => {
            const {type, UserEventType, newRecord} = context;
            const {EDIT, CREATE, XEDIT} = UserEventType;

            let oppRecord = record.load({type: newRecord.type, id: newRecord.id});

            let nTesters = oppRecord.getValue({fieldId:'custbodyr7opptesters'});
            let nRecommenders = oppRecord.getValue({fieldId:'custbodyr7opprecommenders'});
            let nBuyers = oppRecord.getValue({fieldId:'custbodyr7oppbuyers'});

            //log.debug('Existing Values', 'Testers:' + nTesters+ '\nRecommenders:' + nRecommenders + '\nBuyers:'+ nBuyers);

            if((nTesters!=null && nTesters.length >=1)|| (nBuyers!=null && nBuyers.length>=1) || (nRecommenders!=null && nRecommenders.length>=1))
            {
                if(type === EDIT || type === CREATE || type === XEDIT){

                    let testers = oppRecord.getValue({fieldId:'custbodyr7opptesters'});
                    let recommenders = oppRecord.getValue({fieldId:'custbodyr7opprecommenders'});
                    let buyers = oppRecord.getValue({fieldId:'custbodyr7oppbuyers'});

                    let contactRoles = [];

                    for(let i=0;testers!=null && i<testers.length;i++){
                        contactRoles[testers[i]]=2; //Tester = 2
                    }
                    for(let i=0;recommenders!=null && i<recommenders.length;i++){
                        contactRoles[recommenders[i]]=4; // Recommender =4

                    }
                    for(let i=0;buyers!=null && i<buyers.length;i++){
                        contactRoles[buyers[i]]=1; //Buyer = 1
                    }

                    for(let contact in contactRoles){
                        log.debug('Contact:'+ contact, 'Role:'+ contactRoles[contact]);
                        let contactRecord = record.load({type: record.Type.CONTACT, id: contact});
                        let existingRole = contactRecord.getValue({fieldId: 'contactrole'});
                        log.debug('Existing Role of Contact ',existingRole);
                        if(existingRole ==null || existingRole.length <1){
                            contactRecord.setValue({fieldId: 'contactrole', value: contactRoles[contact]});
                            log.debug('Submitted Role field for contact '+ contact, contactRoles[contact]);
                            let id = contactRecord.save();
                            if(id){
                                log.debug('Submitted Role field for contact '+ contact, contactRoles[contact]);
                            }
                        }else{

                            log.debug('Did not overwrite existing Role of Contact '+ contact, contactRoles[contact]);
                        }

                    }
                }
            }
        }

        const updateCompetitorsList = (context) => {
            //let userObj = runtime.getCurrentUser();
            const {type, UserEventType, newRecord} = context;
            const {EDIT, CREATE, XEDIT} = UserEventType;

            if(type === EDIT || type === CREATE || type === XEDIT){
                let rec = record.load({type: newRecord.type, id: newRecord.id});
                log.debug('Partner value Coming IN', rec.getValue({fieldId:'partner'}));

                let oppWinner = rec.getValue({fieldId: 'custbodyr7oppwinner'});
                let oppWinnerIndex = 0;
                let competitors0 = rec.getValue({fieldId: 'custbodyr7opportunityevaluating'});
                let competitors = [];
                for (let ij = 0; competitors0 != null && ij < competitors0.length; ij++) {
                    competitors[competitors.length] = competitors0[ij];
                }

                //Clean oppWinner entries & re-set winner entry
                if (oppWinner != null && oppWinner !== '') {

                    log.debug('Opp winner is null', 'yup');

                    competitors[competitors.length] = oppWinner;
                    for (let i = 0; i < rec.getLineCount({sublistId: 'competitors'}); i++) {
                        let comp = rec.getSublistValue({sublistId: 'competitors', fieldId: 'competitor', line: i});
                        if (comp !== oppWinner) {
                            rec.setSublistValue({sublistId: 'competitors', fieldId: 'winner', line: i, value: false});
                        }
                        else
                        if (comp === oppWinner) {
                            rec.setSublistValue({sublistId: 'competitors', fieldId: 'winner', line: i, value: true});
                        }
                    }
                }
                else {
                    for (let i = 0; i < rec.getLineCount({sublistId: 'competitors'}); i++) {
                        rec.setSublistValue({sublistId: 'competitors', fieldId: 'winner', line: i, value: false});
                    }
                }

                log.debug('Partner Value now', rec.getValue({fieldId:'partner'}));

                if (competitors.length >= 1) {
                    let count = rec.getLineCount({sublistId: 'competitors'});
                    let existingCompetitors = [];
                    for (let i = 0; i < count; i++) {
                        existingCompetitors[rec.getSublistValue({sublistId: 'competitors', fieldId: 'competitor', line: i})] = 1;
                        if (rec.getSublistValue({sublistId: 'competitors', fieldId: 'competitor', line: i}) === oppWinner) {
                            oppWinnerIndex = i;
                        }
                    }
                    for (let i = 0; i < competitors.length; i++) {
                        let j = rec.getLineCount({sublistId: 'competitors'});
                        if (existingCompetitors[competitors[i]] !== 1) {
                            rec.insertLine({sublistId: 'competitors', line: j});
                            rec.setSublistValue({sublistId: 'competitors', fieldId: 'competitor', line: j, value: competitors[i]});
                            if (competitors[i] === oppWinner && oppWinner !== '') {
                                log.debug('Adding Winner Opp as a Competitor');
                                rec.setSublistValue({sublistId: 'competitors', fieldId: 'winner', line: j, value: true});
                            }
                        }
                    }
                }

                log.debug('Partner Value now', rec.getValue({fieldId:'partner'}));
                log.debug('Submitting Opp Record Again', 'yup');
                let id = rec.save();
                log.debug('Opp Record Id', id);
            }
        }

        return {afterSubmit}

    });