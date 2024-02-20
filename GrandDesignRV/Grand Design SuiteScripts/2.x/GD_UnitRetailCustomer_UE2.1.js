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
            Membership
            ConfigRec.ClientID|ConfigRec.ProgramID|?|customrecordrvsunitretailcustomer.custrecordunitretailcustomer_dealer|customrecordrvsunitretailcustomer.id|?|customrecordrvsunitretailcustomer.custrecordunitretailcustomer_lastname|customrecordrvsunitretailcustomer.custrecordunitretailcustomer_firstname|Concat(custrecordunitretailcustomer_address1 + custrecordunitretailcustomer_address2)|custrecordunitretailcustomer_city|custrecordunitretailcustomer_state|custrecordunitretailcustomer_zipcode|0|ConfigRec.TermsMonths|customrecordrvsunitretailcustomer.custrecordunitretailcustomer_retailsold|0|customrecordrvsunitretailcustomer.custrecordunitretailcustomer_unit|customrecordrvsunit.custrecordunit_modelyear|customrecordrvsunit.custrecordunit_series|customrecordrvsunit.custrecordunit_model|null|null|ConfigRec.AUX1|ConfigRec.AUX2|null|null|null|abbrevated(customrecordrvsunitretailcustomer.custrecordunitretailcustomer_country)|customrecordrvsunitretailcustomer.custrecordunitretailcustomer_phone|customrecordrvsunitretailcustomer.custrecordunitretailcustomer_email|N
            GDR|2B|A|1049 Lazydays|165894|N|Holmes|Warren|1517 43rd Ave Dr W|Palmetto|Florida|34221|0|12|20210511|0|573FM4433M1119261|2021|Momentum|MT381M-2021 381M|||RA|||||US|909-223-1157|

            There will be a checkbox on the Unit Sales Order that determins if the SFTP record will be generated.
            Add records will be generated for any newly created Retail Customers.
            Updates will be triggered by and edit and only generated if the comparied new data does not match the last SFTP record for that customer.
            Delete/Cancel records will be generated when a Retail customer is inactivated or Deleted.
            Resold Units - Need to find out how this is to be handled.
        */
        const afterSubmit = (scriptContext) => {
            log.debug('scriptContext', JSON.stringify(scriptContext));
            // Load the Configuration Record
            var config_SuiteQLStatement = `SELECT * FROM customrecordgd_saferide_config WHERE id = 1`;
            var config_ResultSet = query.runSuiteQL({
                query: config_SuiteQLStatement
            }).asMappedResults();
            log.debug('config_ResultSet', config_ResultSet);

            // Get required Fields in an array to be processed
            var custID = scriptContext.newRecord.getValue({
                fieldId: 'id'
            });
            log.debug('custID', custID);
            var unitRetailCust_SuiteQLStatement = `SELECT custrecordunit_dealer AS dealerID, CUSTOMRECORDRVSUNITRETAILCUSTOMER.custrecordunitretailcustomer_currentcust AS currentcust, CUSTOMRECORDRVSUNITRETAILCUSTOMER.id AS id, custrecordunitretailcustomer_lastname AS lastname, custrecordunitretailcustomer_firstname AS firstname, custrecordunitretailcustomer_address1 AS addr1, custrecordunitretailcustomer_address2 AS addr2, custrecordunitretailcustomer_city AS city, State.ShortName AS State, custrecordunitretailcustomer_zipcode AS zipcode, custrecordunitretailcustomer_retailsold AS restailsold, BUILTIN.DF(custrecordunitretailcustomer_unit) AS vin, BUILTIN.DF(custrecordunit_modelyear) AS modelyear, BUILTIN.DF(custrecordunit_series) AS series, BUILTIN.DF(custrecordunit_model) AS model, Country.ID AS country, custrecordunitretailcustomer_phone AS phone, custrecordunitretailcustomer_email AS email, (SELECT COUNT(memdoctransactiontemplateline.item) FROM memdoctransactiontemplateline WHERE memdoctransactiontemplateline.transaction = CUSTOMRECORDRVSUNIT.custrecordunit_salesorder AND memdoctransactiontemplateline.item in (${config_ResultSet[0].custrecordgd_saferide_optionidlist})) AS req_options FROM CUSTOMRECORDRVSUNITRETAILCUSTOMER, CUSTOMRECORDRVSUNIT, STATE, Country WHERE CUSTOMRECORDRVSUNITRETAILCUSTOMER.id = ${custID} AND CUSTOMRECORDRVSUNITRETAILCUSTOMER.custrecordgd_notorigowner = 'F' AND CUSTOMRECORDRVSUNITRETAILCUSTOMER.custrecordunitretailcustomer_unit = CUSTOMRECORDRVSUNIT.id AND CUSTOMRECORDRVSUNITRETAILCUSTOMER.custrecordunitretailcustomer_state = STATE.id AND CUSTOMRECORDRVSUNITRETAILCUSTOMER.custrecordunitretailcustomer_country = Country.uniquekey`;
            var unitRetailCust_ResultSet = query.runSuiteQL({
                query: unitRetailCust_SuiteQLStatement
            }).asMappedResults();
            log.debug('unitRetailCust_ResultSet', unitRetailCust_ResultSet);
            try {
                if (unitRetailCust_ResultSet[0].req_options > 0) {
                    let unitretailcust_VIN = unitRetailCust_ResultSet[0].vin || '';
                    if (unitretailcust_VIN != '' && unitretailcust_VIN != null) {
                        // Search for the RVS Member in the the SafeRide SFTP records
                        SuiteQLStatement = `SELECT custrecordgd_sftp_dealercode AS dealerID, custrecordgd_sftp_contractmembernumber AS id, custrecordgd_sftp_retaillastname AS lastname, custrecordgd_sftp_retailfirstname AS firstname, custrecordgd_sftp_address AS addr1, custrecordgd_sftp_city AS city, custrecordgd_sftp_state AS State, custrecordgd_sftp_zipcode AS zipcode, custrecordgd_sftp_startdate AS restailsold, BUILTIN.DF(custrecordgd_sftp_vin) AS vin, BUILTIN.DF(custrecordgd_sftp_vehicleyear) AS modelyear, BUILTIN.DF(custrecordgd_sftp_vehiclemake) AS series, BUILTIN.DF(custrecordgd_sftp_vehiclemodel) AS model, custrecordgd_sftp_country AS country, custrecordgd_sftp_phonenumber AS phone, custrecordgd_sftp_email AS email FROM customrecordgd_sftp_queue WHERE custrecordgd_sftp_type = 1 AND custrecordgd_sftp_vin = '${unitretailcust_VIN}' and isinactive = 'F' ORDER BY name DESC`;
                        var resultSet = query.runSuiteQL({
                            query: SuiteQLStatement
                        }).asMappedResults() || '';
                        //log.debug('resultSet', `VIN: ${unitRetailCust_ResultSet[0].vin} Length: ${Object.keys(resultSet).length} Values: ${JSON.stringify(resultSet)}, ${JSON.stringify(unitRetailCust_ResultSet)}`);

                        // Create the required Records based on Event Type
                        if (scriptContext.type == scriptContext.UserEventType.CREATE) {
                            if (Object.keys(resultSet).length) {
                                if (unitRetailCust_ResultSet[0].id != resultSet[0].id) {
                                    //log.debug('Delete new Cust', `${JSON.stringify(resultSet)}, ${JSON.stringify(config_ResultSet)}, 'D'`);
                                    createRecord(resultSet, config_ResultSet, 'D');
                                }
                            }
                            //log.debug('create new', `${JSON.stringify(unitRetailCust_ResultSet)}, ${JSON.stringify(config_ResultSet)}, 'A'`);
                            createRecord(unitRetailCust_ResultSet, config_ResultSet, 'A');
                        }
                        if (scriptContext.type == scriptContext.UserEventType.EDIT) {
                            if (Object.keys(resultSet).length) {
                                //If a record exists compair the required Fields and create an update record if needed
                                if (unitRetailCust_ResultSet[0].id != resultSet[0].id) {
                                    //log.debug('Delete change', `${JSON.stringify(resultSet)}, ${JSON.stringify(config_ResultSet)}, 'D'`);
                                    createRecord(resultSet, config_ResultSet, 'D');
                                    //log.debug('Create change', `${JSON.stringify(unitRetailCust_ResultSet)}, ${JSON.stringify(config_ResultSet)}, 'A'`);
                                    createRecord(unitRetailCust_ResultSet, config_ResultSet, 'A');
                                }
                                //log.debug('unitRetailCust_ResultSet[0].currentcust', `${unitRetailCust_ResultSet[0].currentcust}`);
                                if (unitRetailCust_ResultSet[0].currentcust == 'F') {
                                    //log.debug('Delete', `${JSON.stringify(unitRetailCust_ResultSet)}, ${JSON.stringify(config_ResultSet)}, 'D'`);
                                    createRecord(unitRetailCust_ResultSet, config_ResultSet, 'D');
                                } else {
                                    //log.debug('Change', `${JSON.stringify(unitRetailCust_ResultSet)}, ${JSON.stringify(config_ResultSet)}, 'C'`);
                                    createRecord(unitRetailCust_ResultSet, config_ResultSet, 'C');
                                }
                            }
                            if (!Object.keys(resultSet).length) {
                                // If no Results is found create and Add Record
                                //log.debug('Create missing', `${JSON.stringify(unitRetailCust_ResultSet)}, ${JSON.stringify(config_ResultSet)}, 'A'`);
                                createRecord(unitRetailCust_ResultSet, config_ResultSet, 'A');
                            }
                        }
                        if (scriptContext.type == scriptContext.UserEventType.DELETE) {
                            //log.debug('Delete', `${JSON.stringify(unitRetailCust_ResultSet)}, ${JSON.stringify(config_ResultSet)}, 'D'`);
                            createRecord(unitRetailCust_ResultSet, config_ResultSet, 'D');
                        }
                    }
                }
            } catch (err) {
                log.error('err', err);
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
        const createRecord = (unitRetailCust_Result, config_Result, transactioncode) => {
            //log.debug('createRecord', `${JSON.stringify(unitRetailCust_Result)}, ${JSON.stringify(config_Result)}, ${transactioncode}`);
            let sftpRecord = record.create({
                type: 'customrecordgd_sftp_queue',
                isDynamic: true
            });

            sftpRecord.setValue({
                fieldId: 'custrecordgd_sftp_type',
                value: '1'
            });
            sftpRecord.setValue({
                fieldId: 'custrecordgd_sftp_transactioncode',
                value: transactioncode
            });
            sftpRecord.setValue({
                fieldId: 'custrecordgd_sftp_formatversion',
                value: config_Result[0].name
            });
            sftpRecord.setValue({
                fieldId: 'custrecordgd_saferide_programid',
                value: config_Result[0].programid
            });
            sftpRecord.setValue({
                fieldId: 'custrecordgd_sftp_newused',
                value: 'N'
            });
            sftpRecord.setValue({
                fieldId: 'name',
                value: unitRetailCust_Result[0].id
            });
            sftpRecord.setValue({
                fieldId: 'altname',
                value: unitRetailCust_Result[0].id
            });
            sftpRecord.setValue({
                fieldId: 'custrecordgd_sftp_clientid',
                value: config_Result[0].custrecordgd_saferide_clientid
            });
            sftpRecord.setValue({
                fieldId: 'custrecordgd_sftp_dealercode',
                value: unitRetailCust_Result[0].dealerid
            });
            sftpRecord.setValue({
                fieldId: 'custrecordgd_sftp_prefaceddealercode',
                value: `${config_Result[0].custrecordgd_saferide_preface}${unitRetailCust_Result[0].dealerid}`
            });
            sftpRecord.setValue({
                fieldId: 'custrecordgd_sftp_contractmembernumber',
                value: unitRetailCust_Result[0].id
            });
            sftpRecord.setValue({
                fieldId: 'custrecordgd_sftp_prefacedmembernumb',
                value: `${config_Result[0].custrecordgd_saferide_preface}${unitRetailCust_Result[0].id}`
            });
            sftpRecord.setValue({ //Last name
                fieldId: 'custrecordgd_sftp_retaillastname',
                value: unitRetailCust_Result[0].lastname
            });
            sftpRecord.setValue({ //First Name
                fieldId: 'custrecordgd_sftp_retailfirstname',
                value: unitRetailCust_Result[0].firstname
            });
            var address = unitRetailCust_Result[0].addr1;
            if (unitRetailCust_Result[0].addr2) {
                address += ` ${unitRetailCust_Result[0].addr2}`;
            }
            sftpRecord.setValue({
                fieldId: 'custrecordgd_sftp_address',
                value: address
            });
            sftpRecord.setValue({
                fieldId: 'custrecordgd_sftp_city',
                value: unitRetailCust_Result[0].city
            });
            sftpRecord.setValue({
                fieldId: 'custrecordgd_sftp_state',
                value: unitRetailCust_Result[0].state
            });
            sftpRecord.setValue({
                fieldId: 'custrecordgd_sftp_zipcode',
                value: unitRetailCust_Result[0].zipcode
            });
            sftpRecord.setValue({
                fieldId: 'custrecordgd_sftp_phonenumber',
                value: unitRetailCust_Result[0].phone
            });
            sftpRecord.setValue({
                fieldId: 'custrecordgd_sftp_email',
                value: unitRetailCust_Result[0].email
            });
            sftpRecord.setValue({
                fieldId: 'custrecordgd_sftp_country',
                value: unitRetailCust_Result[0].country
            });
            sftpRecord.setValue({ //term months
                fieldId: 'custrecordgd_sftp_termmonths',
                value: config_Result[0].custrecordgd_saferide_terms
            });
            sftpRecord.setValue({ //start date FORMAT YYYYMMDD
                fieldId: 'custrecordgd_sftp_startdate',
                value: unitRetailCust_Result[0].restailsold
            });
            sftpRecord.setValue({ //start miles 0
                fieldId: 'custrecordgd_sftp_startmiles',
                value: '0'
            });
            sftpRecord.setValue({ //vin
                fieldId: 'custrecordgd_sftp_vin',
                value: unitRetailCust_Result[0].vin
            });
            sftpRecord.setValue({ //model year
                fieldId: 'custrecordgd_sftp_vehicleyear',
                value: unitRetailCust_Result[0].modelyear
            });
            sftpRecord.setValue({ //series
                fieldId: 'custrecordgd_sftp_vehiclemake',
                value: unitRetailCust_Result[0].series
            });
            sftpRecord.setValue({ //model
                fieldId: 'custrecordgd_sftp_vehiclemodel',
                value: unitRetailCust_Result[0].model
            });
            sftpRecord.setValue({ //AUX1
                fieldId: 'custrecordgd_sftp_aux1',
                value: config_Result[0].custrecordgd_saferide_aux1
            });
            sftpRecord.setValue({ //SFTP Status
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