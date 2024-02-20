/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * 
 * This is a function that was pulled out of the Weight Label Printing RESTlet file that contained several RESTlets.
 * The original function name was UpdateUnitWeight:  * Updates unit weight given unit vin # and the weight to be set.
 */
define(['N/record', 'N/search', './GD_Constants.js', './GD_Common.js'],
    
    (record, search, GD_Constants, GD_Common) => {

        /**
         * Defines the function that is executed when a POST request is sent to a RESTlet.
         * @param {string | Object} requestBody - The HTTP request body; request body is passed as a string when request
         *     Content-Type is 'text/plain' or parsed into an Object when request Content-Type is 'application/json' (in which case
         *     the body must be a valid JSON)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
         *     Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         */
        const post = (requestBody) => {
            
            if (requestBody && requestBody.vin){

                // Declare and Initialize Weight Variables
                var weight = 0, leftFrontWeight = 0, leftRearWeight = 0, rightFrontWeight = 0, rightRearWeight = 0;

                // Pull the Left Front Weight from the Request Body
        		if (requestBody.leftFrontWeight && !isNaN(parseFloat(requestBody.leftFrontWeight))){
        			leftFrontWeight = parseFloat(requestBody.leftFrontWeight);
                };
    
                // Pull the Right Front Weight from the Request Body
        		if (requestBody.rightFrontWeight && !isNaN(parseFloat(requestBody.rightFrontWeight))){
        			rightFrontWeight = parseFloat(requestBody.rightFrontWeight);
                };

                // Pull the Left Rear Weight from the Request Body
        		if (requestBody.leftRearWeight && !isNaN(parseFloat(requestBody.leftRearWeight))){
        			leftRearWeight = parseFloat(requestBody.leftRearWeight);
                };
    
                // Pull the Right Rear Weight from the Request Body
        		if (requestBody.rightRearWeight && !isNaN(parseFloat(requestBody.rightRearWeight))){
        			rightRearWeight = parseFloat(requestBody.rightRearWeight);
                };

                // If weight is not provided, calculate it based on the other values received
                if (requestBody.weight && !isNaN(parseFloat(requestBody.weight))) {
                    weight = parseFloat(requestBody.weight)
                } else {
                    //\? Double check with Josh B to make sure that this is how the calculation is expected to happen
                    weight = leftFrontWeight + leftRearWeight + rightFrontWeight + rightRearWeight;
                };

                // //DEBUG:
                // log.debug({
                //     title:      "Weights Received",
                //     details:    "Net Weight: "  + weight            + ", " +
                //                 "Left Front: "  + leftFrontWeight   + ", " +
                //                 "Right Front: " + rightFrontWeight  + ", " + 
                //                 "Left Rear: "   + leftRearWeight    + ", " +
                //                 "Right Rear: "  + rightRearWeight   + " "
                // });

                // Declare and Initialize the filters variable
                var filters = [];

                // Create a VIN Search Filter
                let vinSearchFilter = search.createFilter({
                    name: 		'name',
                    operator: 	search.Operator.CONTAINS,
                    values: 	requestBody.vin
                });

                // Push the VIN Search Filter into the filter array
                filters.push(vinSearchFilter);

                // Create the Search for Units that need labels
                var unitsSearch = search.create({
                    type: "customrecordrvsunit",

                    filters:
                    [
                        ["isinactive","is","F"]
                    ],

                    columns:
                    [
                        search.createColumn({
                            name: "name",
                            sort: search.Sort.ASC
                        }),

                        "custrecordunit_serialnumber",

                        search.createColumn({
                            name: "itemid",
                            join: "CUSTRECORDUNIT_MODEL"
                        }),

                        search.createColumn({
                        name: "formulanumeric",
                            formula: "TO_NUMBER({custrecordunit_serialnumber})"
                        }),

                        "custrecordunit_tire",
                        "custrecordunit_psi",
                        "custrecordunit_actualofflinedate",
                        "custrecordunit_gvwrlbs",
                        "custrecordunit_gawrsingleaxle",
                        "custrecordunit_gawrallaxles",
                        "custrecordunit_rim",
                        "custrecordunit_typeofvehicle",
                        "custrecordunit_freshwatercapacity",
                        "custrecordunit_uvw",
                        "custrecordunit_lpgasweight",
                        "custrecordunit_waterheatercapacity"

                    ]
                });

                // Dereference filters and columns from the existing search
                var existingSearchFilters = unitsSearch.filters;

                // Add the newly defined search filters to the dereferenced filters pointer
                filters.forEach(function(filter) {
                    existingSearchFilters.push(filter);
                });

                unitsSearch.run().each(function(result) {
                    
                    // ==== VIN is unique: there should be only one record ====
                
                    // Sometimes a record might throw an error that would not necessarily indicate a real issue.
                    // To not have to hang up on these errors, we will catch the sepecific error that is thrown.
                    // If it's the type of error that should not interfere with the process, we will attempt until the maxTryCount is reached.
        			var maxTryCount = 1000;
        			var curTryCount = 0;

        			while(curTryCount < maxTryCount) {

        				// ---- We will update unit fields that are specified and also update production status to be completed and set completed date to be today's date. ----

                        // Define the fields that would be updated on the record as keys and values as values
                        var keyValuePairObject = {
                            'custrecordunit_actualshipweight'       : weight, 
                            'custrecordgd_unit_leftfrontweight'     : leftFrontWeight, 
                            'custrecordgd_unit_leftrearweight'      : leftRearWeight, 
                            'custrecordgd_unit_rightfrontweight'    : rightFrontWeight,
                            'custrecordgd_unit_rightrearweight'     : rightRearWeight,
                            'custrecordunit_status'                 : GD_Constants.GD_UNITPRODUCTIONSTATUS_COMPLETE, 
                            'custrecordunit_datecompleted'          : GD_Common.getTodaysDate(),
                            'custrecordunit_uvw'                    : weight, 
                            'custrecordrvs_weightdiscrepancyreason' : requestBody.weightDiscrepancyReason
                        };
        				
                        try {

                            // Submit the fields
                            var submittedRecordId = record.submitFields({
                                type:       result.recordType,
                                id:         result.id,
                                values:     keyValuePairObject,
                                options:    {
                                    enablesourcing: false
                                }
                            });
        				
                            // If we were successful, break the while loop
                            break;

        				} catch(err){
        		    		
                            // Catch and log the error
                            log.debug({
                                title:      'Error while setting the weight values on the record',
                                details:    JSON.stringify(err)
                            });
        		    		
                            // If the error is one of the type that we are expecting to not interfere with our process, retry
                            if (err.name == 'CUSTOM_RECORD_COLLISION' || err.name == 'RCRD_HAS_BEEN_CHANGED') {
                                curTryCount++;
        		    			continue;
                            }
        		    		
                            // If the error is not one of the palatable errors, throw it and halt
                            throw err;
        		    	}
        			}
                });
            }
        }

        return {post}

    }
);
