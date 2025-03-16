/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/log', 'N/query', 'N/record', 'N/runtime','N/search'],
    /**
     * @param{log} log
     * @param{query} query
     * @param{record} record
     * @param{runtime} runtime
     * @param{message} message
     */
    (log, query, record, runtime,search) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {

        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {

        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {
            const objCurRec = scriptContext.newRecord;
            var boolNeedSave = false;
            var objCustRecord = record.load({
                type: objCurRec.type,
                id: objCurRec.id
            });
            var boolIsConsignment = objCustRecord.getValue('custentity_ns_incos_invcosflag');
            if(!boolIsConsignment){
                log.audit('Customer Consigment Check','Customer is not a consignment customer.');
                return;
            }
            var lineCount = objCustRecord.getLineCount({sublistId: 'addressbook'});
            for (var i = 0; i < lineCount; i++) {
                var addressSubrecord = objCustRecord.getSublistSubrecord({
                    sublistId: 'addressbook',
                    fieldId: 'addressbookaddress',
                    line: i
                });

                var boolIsConsignAddress = addressSubrecord.getValue('custrecord_consinv_addresschk');
                var intConsignLocation = addressSubrecord.getValue('custrecord_consinv_assignedloc');
                log.debug('boolIsConsignAddress', boolIsConsignAddress);
                log.debug('intConsignLocation', intConsignLocation);
                if(boolIsConsignAddress && !intConsignLocation){ // we need to creeate a new Location for this customer
                    try{
                        var objLocationRecord = record.create({
                            type: record.Type.LOCATION,
                            isDynamic: true
                        });
                        var strLocationName = 'CONS | ' + strMaker(objCustRecord.getValue('companyname')) + ' | ' + strMaker(addressSubrecord.getValue('addr1'));
                        objLocationRecord.setValue('name', strLocationName);
                        objLocationRecord.setValue('custrecord_ns_invcos_customer', objCustRecord.id);
                        objLocationRecord.setValue('locationtype', 2); // warehouse type location
                        objLocationRecord.setValue('makeinventoryavailable',true);
                        objLocationRecord.setValue('custrecord_ns_invcos_isconsig', true);
                        objLocationRecord.setValue('custrecord_ns_invcon_contact', addressSubrecord.getValue('custrecord_ns_invcon_add_cont'));
                        if(objLocationRecord.getField('subsidiary')){
                            objLocationRecord.setValue('subsidiary', objCustRecord.getValue('subsidiary')); // assuming the customer and location are in the same subsidiary
                        }

                        var getstate=addressSubrecord.getValue({fieldId: 'state'})
                        log.debug("State for the region is",getstate);
                        var stateSearch=search.load({
                            id: 'customsearch_state_search'
                        });
                        var stateFilters = stateSearch.filters;
                        var newstateFilter = search.createFilter({
                            name: 'shortname',
                            operator: search.Operator.IS,
                            values: getstate
                        });
                        stateFilters.push(newstateFilter);
                        var statesearchResult = stateSearch.run().getRange({
                            start: 0,
                            end: 1 // Assuming we need only the first result
                        });
                        if (statesearchResult.length > 0) {
                            // Extract the value of 'custrecord_location_region' from the search results
                            var stateinternalId = statesearchResult[0].getValue({ name: 'id' });
                            log.debug({
                                title: 'Internal Id is',
                                details: stateinternalId
                            });
                        } else {
                            log.error({
                                title: 'No Search Results',
                                details: 'No results found for the given location type.'
                            });
                        }

                        var savedSearch = search.load({
                            id: 'customsearch_region_search_2'
                        });

                        // Add a filter for the location type
                        var filters = savedSearch.filters;
                        var newFilter = search.createFilter({
                            name: 'custrecord_state',
                            operator: search.Operator.ANYOF,
                            values: stateinternalId
                        });
                        filters.push(newFilter);
                        var searchResult = savedSearch.run().getRange({
                            start: 0,
                            end: 1 // Assuming we need only the first result
                        });
                        if (searchResult.length > 0) {
                            // Extract the value of 'custrecord_location_region' from the search results
                            var locationRegion = searchResult[0].getValue({ name: 'custrecord_location_region' });
                            log.debug({
                                title: 'Location Region',
                                details: locationRegion
                            });
                        } else {
                            log.error({
                                title: 'No Search Results',
                                details: 'No results found for the given location type.'
                            });
                        }
                        objLocationRecord.setValue('parent',locationRegion);

                        var objLocationAddressSubrecord = objLocationRecord.getSubrecord({
                            fieldId: 'mainaddress' // Assuming 'mainaddress' is the field ID
                        });
                        objLocationAddressSubrecord.setValue('country', addressSubrecord.getValue('country'));
                        objLocationAddressSubrecord.setValue('state', addressSubrecord.getValue('state'));
                        objLocationAddressSubrecord.setValue('city', addressSubrecord.getValue('city'));
                        objLocationAddressSubrecord.setValue('zip', addressSubrecord.getValue('zip'));
                        objLocationAddressSubrecord.setValue('addr1', addressSubrecord.getValue('addr1'));
                        objLocationAddressSubrecord.setValue('addr2', addressSubrecord.getValue('addr2'));
                        objLocationAddressSubrecord.setValue('addr3', addressSubrecord.getValue('addr3'));
                        objLocationAddressSubrecord.setValue('addressee', addressSubrecord.getValue('addressee'));
                        objLocationAddressSubrecord.setValue('attention', addressSubrecord.getValue('attention'));
                        objLocationAddressSubrecord.setValue('phone', addressSubrecord.getValue('phone'));
                        objLocationAddressSubrecord.setValue('custrecord_consinv_addresschk', addressSubrecord.getValue('custrecord_consinv_addresschk'));
                        objLocationAddressSubrecord.setValue('custrecord_ns_invcon_add_cont', addressSubrecord.getValue('custrecord_ns_invcon_add_cont'));


                        // default the use of bins in consignment locations to unchecked.
                        objLocationRecord.setValue('usebins',false);
                        var intNewLocation = objLocationRecord.save();
                        if(intNewLocation){
                            log.debug('New Location Created', 'Name: ' + strLocationName + ' | ID: ' + intNewLocation);
                            addressSubrecord.setValue('custrecord_consinv_assignedloc', intNewLocation);
                            //  addressSubrecord.save();
                            boolNeedSave = true;
                        }else{
                            log.error('Error creating new location', 'Location record was not saved.');
                        }
                    }catch(e){
                        log.error('Error creating new location', e);
                    }


                }else if(! boolIsConsignAddress && intConsignLocation){ // we need to try to inactivate the location
                    try{
                        var objLocationRecord = record.load({
                            type: record.Type.LOCATION,
                            id: intConsignLocation
                        });
                        objLocationRecord.setValue('isinactive', true);
                        objLocationRecord.setValue('custrecord_ns_invcos_isconsig', false);
                        var intRecSaved = objLocationRecord.save();
                        if(intRecSaved){
                            //addressSubrecord.setValue('custrecord_consinv_assignedloc', null);
                            //boolNeedSave = true;
                            log.audit('Location Inactivated', 'Location ID: ' + intConsignLocation);
                        }

                    }catch(e){
                        log.error('Error inactivating location', e);
                    }
                }
            } // location loop

            if(boolNeedSave){
                objCustRecord.save();
            }
        }

        function strMaker(strInput){
            // if you want to modify the output of the location name, create more complex rules here
            return strInput.substring(0, 15).toUpperCase().replace(/ /g, "_");
        }

        return {beforeLoad, beforeSubmit, afterSubmit}

    });
