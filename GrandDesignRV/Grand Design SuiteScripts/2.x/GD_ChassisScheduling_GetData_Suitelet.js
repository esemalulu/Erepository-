/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/query', './GD_Constants.js'],
    /**
 * @param{query} query
 */
    (query, GD_Constants) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            var locationId = scriptContext.request.parameters["custpage_location"];
            var seriesId = scriptContext.request.parameters["custpage_series"] || '';
            var modelId = scriptContext.request.parameters["custpage_model"] || '';

            // Build the Data object
            let allData = {};

            // Check if for active processing records that are not Complete for this Location
            let activeProcessingRecord = false;
            let procRecQuery =  `SELECT TOP 1
                                    custrecordgd_chassissched_status,
                                    id
                                FROM 
                                    customrecordgd_chassissched_procrec
                                WHERE
                                    custrecordgd_chassissched_status != ${GD_Constants.GD_CHASSISSCHEDULINGSTATUS_COMPLETEERRORS} 
                                        AND custrecordgd_chassissched_status != ${GD_Constants.GD_CHASSISSCHEDULINGSTATUS_COMPLETE}
                                    AND custrecordgd_chassissched_location = ${locationId}`; 
            
            let procRecResultSet = query.runSuiteQL({query: procRecQuery}).asMappedResults();
            if (procRecResultSet.length > 0) {
                allData['activeProcRec'] = true;
                activeProcessingRecord = true;
            } 
            else
                allData['activeProcRec'] = false;

            // If there's no active processing record, then get the Data
            if (!activeProcessingRecord) {
                // ** SCHEDULED UNITS QUERY ** //
                let unitsQuery = `SELECT 
                                    unit.id as unit_id,
                                    unit.name as unit_name,
                                    BUILTIN.DF(transaction.entity) as transaction_dealer,
                                    BUILTIN.DF(unit.custrecordunit_series) as unit_series,
                                    BUILTIN.DF(unit.custrecordunit_model) as unit_model,
                                    BUILTIN.DF(unit.custrecordunit_decor) as unit_decor,
                                    unit.custrecordunit_onlinedate as unit_onlinedate,
                                    unit.custrecordunit_offlinedate as unit_offlinedate,
                                    transaction.custbodygd_chassisitem as chassis_itemid,
                                    BUILTIN.DF(transaction.custbodygd_chassisitem) as chassis_itemname,
                                    unit.custrecordgd_unit_chassisinvnum as unit_chassisinvnum,
                                    transaction.id as salesorderid
                                FROM
                                    customrecordrvsunit as unit 
                                    LEFT JOIN transaction on transaction.id = unit .custrecordunit_salesorder 
                                WHERE
                                    custrecordunit_status = ${GD_Constants.GD_UNITPRODUCTIONSTATUS_SCHEDULED}
                                    AND custrecordgd_unit_chassisinvnum IS EMPTY
                                    AND custrecordgd_unit_department = ${GD_Constants.GD_DEPARTMENT_MOTORHOME}
                                    AND custrecordunit_location = ${locationId}`;

                // If the user selected a Series or Model, add the conditions to the Query
                if (seriesId != '') 
                    unitsQuery += ` AND custrecordunit_series = ${seriesId}`;
                if (modelId != '')
                    unitsQuery += ` AND custrecordunit_model = ${modelId}`;

                var unitsResultSet = query.runSuiteQL({query: unitsQuery}).asMappedResults();
                allData['units'] = unitsResultSet;

                // ** INVENTORY NUMBER QUERY ** //
                let inventoryNumberQuery = `SELECT
                                                invNum.id,
                                                invNum.item,
                                                invNum.inventorynumber,
                                                invLoc.quantityAvailable,
                                                invLoc.location
                                            FROM
                                                inventoryNumber as invNum,
                                                InventoryNumberLocation as invLoc
                                            WHERE
                                                invNum.id = invLoc.inventorynumber
                                                AND invLoc.quantityAvailable > 0 
                                                AND invLoc.location = ${locationId}`;
                var inventoryNumberResultSet = query.runSuiteQL({query: inventoryNumberQuery}).asMappedResults();
                allData['inventorynumbers'] = inventoryNumberResultSet;
            }

            // Return the data
            log.debug('allData', JSON.stringify(allData));
            scriptContext.response.write(JSON.stringify(allData));
        }

        return {onRequest}

    });
