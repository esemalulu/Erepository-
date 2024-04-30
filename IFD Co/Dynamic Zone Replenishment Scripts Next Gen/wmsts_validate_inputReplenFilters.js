/**
 *    Copyright � 2018, Oracle and/or its affiliates. All rights reserved.
 */

/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */

define(['N/query'],
    function (query) {
        function dopost(requestBody) {
            try {
                var params = requestBody.params;
                var replenismentDetails = {};

                log.debug('params', JSON.stringify(params));

                const mapResultsToColumns = (result, columns) => {//function to map query results 
                    let resultObj = {}
                    for (columnIndex in columns) {
                        resultObj[columns[columnIndex]] = result.values[columnIndex]
                    }
                    return resultObj
                }


                //Query to fetch the item details based on entered item name
                const itemcolumns = [
                    "itemid",
                    "id",
                    "upccode"
                ]
                const columns = [
                    "id"
                ]

                if (params.item) {

                    let entereditem = params.item.toString();
                    const myItemQuery = query.runSuiteQL({
                        query: "SELECT " + itemcolumns + " FROM item WHERE itemid =" + "'" + entereditem + "'" + " OR upccode =" + "'" + entereditem + "'"
                    });



                    const myItemQueryResults = myItemQuery.results.map(result => mapResultsToColumns(result, itemcolumns))
                    log.debug({
                        title: 'myItemQueryResults',
                        details: JSON.stringify(myItemQueryResults)
                    });
                    if (myItemQueryResults) {
                        replenismentDetails['itemid'] = myItemQueryResults[0].id;
                        replenismentDetails['itemName'] = myItemQueryResults[0].itemid;
                        if (myItemQueryResults[0].upccode)
                            replenismentDetails['itemUpc'] = myItemQueryResults[0].upccode;
                        replenismentDetails['errorMessage'] = "";
                        replenismentDetails['isValid'] = true;
                    } else {
                        replenismentDetails['errorMessage'] = "Entered Item is not valid";
                        replenismentDetails['isValid'] = false;
                    }
                }

                //Query to fetch bin details

                if (params.bin) {

                    let enteredBin = params.bin.toString();

                    const myBinQuery = query.runSuiteQL({
                        query: "SELECT " + columns + " FROM bin WHERE binnumber =" + "'" + enteredBin + "'"


                    });



                    const myBinQueryResults = myBinQuery.results.map(result => mapResultsToColumns(result, columns))
                    log.debug({
                        title: 'myBinQueryResults',
                        details: JSON.stringify(myBinQueryResults)
                    });
                    if (myBinQueryResults) {
                        replenismentDetails['binid'] = myBinQueryResults[0].id;
                        replenismentDetails['binName'] = enteredBin;

                        replenismentDetails['errorMessage'] = "";
                        replenismentDetails['isValid'] = true;
                    } else {
                        replenismentDetails['errorMessage'] = "Entered bin is not valid";
                        replenismentDetails['isValid'] = false;
                    }



                }

                // query to fetch zone details
                if (params.zone) {

                    let enteredZone = params.zone.toString();

                    const zoneQuery = query.runSuiteQL({
                        query: "SELECT " + columns + " FROM CUSTOMRECORD_WMSSE_ZONE WHERE name =" + "'" + enteredZone + "'"


                    });



                    const zoneQueryResults = zoneQuery.results.map(result => mapResultsToColumns(result, columns))
                    log.debug({
                        title: 'zoneQueryResults',
                        details: JSON.stringify(zoneQueryResults)
                    });
                    if (zoneQueryResults) {
                        replenismentDetails['zoneid'] = zoneQueryResults[0].id;
                        replenismentDetails['zonename'] = enteredZone;

                        replenismentDetails['errorMessage'] = "";
                        replenismentDetails['isValid'] = true;
                    } else {
                        replenismentDetails['errorMessage'] = "Entered bin is not valid";
                        replenismentDetails['isValid'] = false;
                    }



                }

            //Validating order priority
                if (params.orderPriority) {
                    replenismentDetails['orderPriority'] = params.orderPriority;

                }
            //validation replen report
                if (params.replenReport) {
                    replenismentDetails['replenReport'] = params.replenReport;

                }

            } catch (e) {
                replenismentDetails['errorMessage'] = e.toString();
                replenismentDetails['isValid'] = false;
            }

            log.debug('replenismentDetails', JSON.stringify(replenismentDetails));
            return replenismentDetails
        }
        return {
            post: dopost
        }

    });