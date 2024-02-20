/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/currentRecord', 'N/error', 'N/log', 'N/query', 'N/record', 'N/recordContext'],
    /**
     * @param{currentRecord} currentRecord
     * @param{error} error
     * @param{log} log
     * @param{query} query
     * @param{record} record
     * @param{recordContext} recordContext
     */
    (currentRecord, error, log, query, record, recordContext) => {
        //#region CONSTANTS
        var RVSDEALER = 10;
        //#endregion

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
        /*
            Dealer - RVS Dealer Only
            ConfigRec.ClientID|ConfigRec.ProgramID|entityid|companyname|Addressbook(Default Shipping)addr1+addr2|city|state|zip|phone|country|?
            GDR249|2B|1049 Lazydays|Lazydays|390 S. Sylvania Avenue|Sturtevant|WI|53177|813-246-4999|US|A

            We will send historical Data for All Dealers.
            We will then send new Dealers as they are created.
            Updates to Dealers will be handled by comparing the last SFTP sent for that dealer.
            Deleted Dealer will generate a Delete/Cancel SFTP record.
        */
        const afterSubmit = (scriptContext) => {
            if (scriptContext.newRecord.getValue({
                    fieldId: 'custentityrvsdealertype'
                }) == RVSDEALER) {
                // Load the Configuration Record
                var config_SuiteQLStatement = `SELECT * FROM customrecordgd_saferide_config WHERE id = 1`;
                var config_ResultSet = query.runSuiteQL({
                    query: config_SuiteQLStatement
                }).asMappedResults();
                // Get the Dealer Default Shipping Address
                var address_SuiteQLStatement = `SELECT Customer.defaultshippingaddress, EntityAddress.addr1, EntityAddress.addr2, EntityAddress.addr3, EntityAddress.city, EntityAddress.country, EntityAddress.addrphone, EntityAddress.state, EntityAddress.zip FROM Customer, EntityAddress WHERE id = ${scriptContext.newRecord.getValue({fieldId: 'id'})} AND Customer.defaultshippingaddress = EntityAddress.nkey`;
                var address_ResultSet = query.runSuiteQL({
                    query: address_SuiteQLStatement
                }).asMappedResults();
                // Adds the Address lines 2 and 3 if Data is Present
                var sftpAddress = address_ResultSet[0].addr1;
                if (address_ResultSet[0].addr2) {
                    sftpAddress += `, ${address_ResultSet[0].addr2}`;
                }
                if (address_ResultSet[0].addr3) {
                    sftpAddress += `, ${address_ResultSet[0].addr3}`;
                }
                // Gets Script Context Fields
                var recordId = scriptContext.newRecord.getValue({
                    fieldId: 'id'
                });
                var companyName = scriptContext.newRecord.getValue({
                    fieldId: 'companyname'
                });

                // Create the required Records based on Event Type
                if (scriptContext.type == scriptContext.UserEventType.CREATE) {
                    createRecord(recordId, companyName, config_ResultSet, 'A', sftpAddress, address_ResultSet);
                }
                if (scriptContext.type == scriptContext.UserEventType.EDIT) {
                    // Search for the RVS Dealer in the the SafeRide SFTP records
                    SuiteQLStatement = `SELECT * FROM customrecordgd_sftp_queue WHERE custrecordgd_sftp_type = 2 AND custrecordgd_sftp_dealercode = '${recordId}' and isinactive = 'F' ORDER BY id DESC`;
                    var resultSet = query.runSuiteQL({
                        query: SuiteQLStatement
                    }).asMappedResults();
                    if (Object.keys(resultSet).length > 0) {
                        //If a record exists compair the required Fields and create an update record if needed
                        //If the Dealer Code or Dealer Name changes Create a Delete Record and an Add Record
                        log.debug('Delete and Add', recordId +' != '+ resultSet[0].altname + ' || ' + companyName + ' != ' + resultSet[0].custrecordgd_stfp_dealername)
                        if (recordId != resultSet[0].altname || companyName != resultSet[0].custrecordgd_stfp_dealername) {
                            createRecord(resultSet[0].altname, resultSet[0].custrecordgd_stfp_dealername, config_ResultSet, 'D', sftpAddress, address_ResultSet);
                            createRecord(recordId, companyName, config_ResultSet, 'A', sftpAddress, address_ResultSet);
                        }
                        if (sftpAddress != resultSet[0].custrecordgd_sftp_address || address_ResultSet[0].city != resultSet[0].custrecordgd_sftp_city || address_ResultSet[0].state != resultSet[0].custrecordgd_sftp_state || address_ResultSet[0].zip != resultSet[0].custrecordgd_sftp_zipcode || address_ResultSet[0].addrphone != resultSet[0].custrecordgd_sftp_phonenumber || address_ResultSet[0].country != resultSet[0].custrecordgd_sftp_country) {
                            createRecord(recordId, companyName, config_ResultSet, 'C', sftpAddress, address_ResultSet);
                        }
                    }
                    if (!Object.keys(resultSet).length) {
                        // If no Results is found create and Add Record
                        createRecord(recordId, companyName, config_ResultSet, 'A', sftpAddress, address_ResultSet);
                    }
                }
                if (scriptContext.type == scriptContext.UserEventType.DELETE) {
                    createRecord(recordId, companyName, config_ResultSet, 'D', sftpAddress, address_ResultSet);
                }
            }
        }

        /**
         * Helper Function for Creating the SFTP Processing Record
         * @param {String} recordId  - From the entityid
         * @param {String} companyName  - Pulled from the Company
         * @param {Object} config_Result - JSON from SuiteQL Result
         * @param {String} transactioncode - Transaction Code for processing
         * @param {String} Address  - Address 1, 2 and 3 lines
         * @param {Object} address_Result - JSON from SuiteQL Result
         * @since 2015.2
         */
        const createRecord = (recordId, companyName, config_Result, transactioncode, Address, address_Result) => {
            log.debug('createRecord', `${recordId}, ${companyName}, ${JSON.stringify(config_Result)}, ${transactioncode}, ${Address}, ${JSON.stringify(address_Result)}`);
            let sftpRecord = record.create({
                type: 'customrecordgd_sftp_queue',
                isDynamic: true
            });
            sftpRecord.setValue({
                fieldId: 'custrecordgd_sftp_type',
                value: '2'
            });
            sftpRecord.setValue({
                fieldId: 'name',
                value: recordId
            });
            sftpRecord.setValue({
                fieldId: 'altname',
                value: recordId
            });
            sftpRecord.setValue({
                fieldId: 'custrecordgd_sftp_clientid',
                value: config_Result[0].custrecordgd_saferide_clientid
            });
            sftpRecord.setValue({
                fieldId: 'custrecordgd_sftp_formatversion',
                value: config_Result[0].name
            });
            sftpRecord.setValue({
                fieldId: 'custrecordgd_sftp_dealercode',
                value: recordId
            });
            sftpRecord.setValue({
                fieldId: 'custrecordgd_sftp_prefaceddealercode',
                value: `${config_Result[0].custrecordgd_saferide_preface}${recordId}`
            });
            sftpRecord.setValue({
                fieldId: 'custrecordgd_stfp_dealername',
                value: companyName
            });
            sftpRecord.setValue({
                fieldId: 'custrecordgd_sftp_address',
                value: Address
            });
            sftpRecord.setValue({
                fieldId: 'custrecordgd_sftp_city',
                value: address_Result[0].city
            });
            sftpRecord.setValue({
                fieldId: 'custrecordgd_sftp_state',
                value: address_Result[0].state
            });
            sftpRecord.setValue({
                fieldId: 'custrecordgd_sftp_zipcode',
                value: address_Result[0].zip
            });
            sftpRecord.setValue({
                fieldId: 'custrecordgd_sftp_phonenumber',
                value: address_Result[0].addrphone
            });
            sftpRecord.setValue({
                fieldId: 'custrecordgd_sftp_country',
                value: address_Result[0].country
            });
            sftpRecord.setValue({
                fieldId: 'custrecordgd_sftp_transactioncode',
                value: transactioncode
            });
            sftpRecord.setValue({//SFTP Status
                fieldId: 'custrecordgd_sftp_status',
                value: `Pending`
            });
            sftpRecord.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });
        }

        return {
            beforeLoad,
            beforeSubmit,
            afterSubmit
        }

    });