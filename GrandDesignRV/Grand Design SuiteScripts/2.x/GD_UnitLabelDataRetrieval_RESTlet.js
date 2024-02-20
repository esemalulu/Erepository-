/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 *
 * This is a function that was pulled out of the Weight Label Printing RESTlet file that contained several RESTlets.
 * The original function name was GetLabelPrintingUnitInfoBySerialNumber: Returns json array object of units for label printing based on the specified Serial Number(s) or VIN
 */
define(['N/search', 'N/format', 'N/record', 'SuiteScripts/SSLib/2.x/SSLib_Util', './GD_Common.js'],

    (search, format, record, SSLib_Util, GD_Common) => {
        /**
         * Defines the function that is executed when a GET request is sent to a RESTlet.
         * @param {Object} requestParams - Parameters from HTTP request URL; parameters passed as an Object (for all supported content types)
         * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an Object when request Content-Type is 'application/json' or 'application/xml'
         * @since 2015.2
         *
         * Returns json array object of units for label printing based on the specified Serial Number(s)
         */
        const get = (requestParams) => {

            // Initialize the array to hold the object data in JSON format for every unit retrieved
            var unitObjectsJSONArray = new Array();

            if (requestParams) {

                var filters = [];


                if (requestParams.vinNumber && requestParams.vinNumber != '') {

					// Create a VIN Search Filter
					let vinSearchFilter = search.createFilter({
						name: 		'name',
						operator: 	search.Operator.CONTAINS,
						values: 	requestParams.vinNumber
					});

					// Push the VIN Search Filter into the filter array
					filters.push(vinSearchFilter);

                } else if (requestParams.fromSerialNumber && GD_Common.trim(requestParams.fromSerialNumber) != '') {
					
					var fromSerialNumber = requestParams.fromSerialNumber;
					var trimmedFromSerialNumber = parseInt(fromSerialNumber.substring(fromSerialNumber.length - 5));

					// Both start and end serial numbers are set.
					if (requestParams.toSerialNumber && GD_Common.trim(requestParams.toSerialNumber) != '') {

						// Create a fromSerialNumber Search Filter
						let fromSerialNumberSearchFilter = search.createFilter({
							name: 		'formulanumeric',
							formula: 	'TO_NUMBER({custrecordunit_serialnumber})',
							operator: 	search.Operator.GREATERTHANOREQUALTO,
							values: 	parseInt(GD_Common.trim(requestParams.fromSerialNumber))
						});

						// Push the fromSerialNumber Search Filter into the filter array
						filters.push(fromSerialNumberSearchFilter);

						// Create a toSerialNumber Search Filter
						let toSerialNumberSearchFilter = search.createFilter({
							name: 		'formulanumeric',
							formula: 	'TO_NUMBER({custrecordunit_serialnumber})',
							operator: 	search.Operator.LESSTHANOREQUALTO,
							values: 	parseInt(GD_Common.trim(requestParams.toSerialNumber))
						});

						// Push the fromSerialNumber Search Filter into the filter array
						filters.push(toSerialNumberSearchFilter);

					} else {

						// If we only get start serial number, filter by one serial number
						// Create a fromSerialNumber Search Filter
						let fromSerialNumberSearchFilter = search.createFilter({
							name: 		'formulatext',
							operator: 	search.Operator.CONTAINS,
							values: 	trimmedFromSerialNumber,
							formula: 	'TO_CHAR({custrecordunit_serialnumber})'
						});

						// Push the fromSerialNumber Search Filter into the filter array
						filters.push(fromSerialNumberSearchFilter);

					}
				}

				// If at least one filter was defined
				if (filters.length > 0) {
					// Gets company info using suitelet that is available without login.
					// We use this workaround because NS doesn't allow roles that don't have
					// admin priviledges to see company information and our Restlet user is not admin.
					var companyInfo 	= GD_Common.getCompanyInfoJSON();
					var companyName 	= companyInfo.name;
					var companyAddress1 = companyInfo.address1;
					var companyCity 	= companyInfo.city;
					var companyState 	= companyInfo.state;
					var companyZip 		= companyInfo.zip;

					// Create the Search for Units that need labels
					var unitsSearch = search.create({
						type: "customrecordrvsunit",

						filters:
						[
							["isinactive","is","F"],
							"AND",
							["custrecordgd_unit_department.internalidnumber","equalto","2"],
							"AND", 
							["custrecordunit_actualofflinedate","isnotempty",""]
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

							search.createColumn({
								name: 'custitemrvs_uvwminweight',
								join: 'custrecordunit_model'
							}),

							search.createColumn({
								name: 'custitemrvs_uvwmaxweight',
								join: 'custrecordunit_model'
							}),

							search.createColumn({
								name: 'custitemrvsmodelextlength',
								join: 'custrecordunit_model'
							}),

							"custrecordunit_dealer",
							"custrecordunit_tire",
							"custrecordunit_psi",
							"custrecordunit_actualofflinedate",
							"custrecordunit_gvwrlbs",
							"custrecordgd_unit_gawrrearaxle",
							"custrecordgd_unit_gawrfrontaxle",
							"custrecordunit_gawrsingleaxle",
							"custrecordunit_gawrallaxles",
							"custrecordunit_rim",
							"custrecordunit_typeofvehicle",
							"custrecordunit_freshwatercapacity",
							"custrecordunit_uvw",
							"custrecordunit_lpgasweight",
							"custrecordunit_waterheatercapacity",
							"custrecordgd_unit_numseatpos_total",
							"custrecordgd_unit_numseatpos_front",
							"custrecordgd_unit_numseatpos_rear"
						]
					});

					// Dereference filters and columns from the existing search
					var existingSearchFilters = unitsSearch.filters;

					// Add the newly defined search filters to the dereferenced filters pointer
					filters.forEach(function(filter) {
						existingSearchFilters.push(filter);
					});

					// Kick-off the Paged Search
					var pagedUnitSearchResults = unitsSearch.runPaged();

					// Pull the data by page
					pagedUnitSearchResults.pageRanges.forEach(function(pageRange) {

						// Pull a specific page
						var page = pagedUnitSearchResults.fetch({index: pageRange.index});

						// Kick-off processing per page
						page.data.forEach(function(result){

							// ==== Process each the result ====

							// Initialize the Unit Object to be populated
							var unitObject = {};

							// ==== Pull the data from the record being processed ====

							// ---- Ship To Country Data ----
							var dealerID = result.getValue('custrecordunit_dealer');

							var dealerRecord = record.load({
								type: 		record.Type.CUSTOMER,
								id: 		dealerID,
								isDynamic:	true
							});

							var defaultShippingAddressIndex = dealerRecord.findSublistLineWithValue({
								sublistId: 	'addressbook',
								fieldId: 	'defaultshipping',
								value: 		'T'
							});

							if (defaultShippingAddressIndex != -1){

								dealerRecord.selectLine({
									sublistId: 	'addressbook',
									line: 		defaultShippingAddressIndex
								});

								var addressBook = dealerRecord.getCurrentSublistSubrecord({
									sublistId: 'addressbook',
									fieldId: 'addressbookaddress'
								});

								var shipToCountry = addressBook.getValue('country');
							
							}

							// ---- Seating Capacity Data ----
							var seatingCapacityTotal 	= result.getValue('custrecordgd_unit_numseatpos_total');
							var seatingCapacityRear 	= result.getValue('custrecordgd_unit_numseatpos_rear');
							var seatingCapacityFront 	= result.getValue('custrecordgd_unit_numseatpos_front');

							var seatingCapacityTotalMassKg = seatingCapacityTotal * 68;

							// Tire Data
							var tireSize 	= result.getValue('custrecordunit_tire');
							var psi 		= parseInt(result.getValue('custrecordunit_psi'));
							var kpa 		= Math.round(SSLib_Util.convertPSIToKPA(psi));
							var rims 		= result.getValue('custrecordunit_rim');

							// Formatting Dates
							var mfgDateFull = result.getValue('custrecordunit_actualofflinedate');
							var mfgDate = '';
							if (mfgDateFull != null && mfgDateFull != '') {
								// Parse the date string
								var rawDateObject = format.parse({
									value: mfgDateFull,
									type: format.Type.DATE
								});

								// Properly assign the formatted date
								var year = ("" + rawDateObject.getFullYear()).substr(2, 2); // Extract the last two characters of the year
								var month = rawDateObject.getMonth() + 1;
								if (month < 10) {
									month = '0' + month; // Adding leading zero if month is a single digit
								}

								var mfgDate = month + '/' + year;
							}

							// GVWR
							var gvwrLb = parseInt(result.getValue('custrecordunit_gvwrlbs'));
							var gvwrKg = Math.round(SSLib_Util.convertLbToKG(gvwrLb));

							// ---- GAWR ----
							var gawrRearLb = parseInt(result.getValue('custrecordgd_unit_gawrrearaxle'));
							var gawrRearKg = Math.round(SSLib_Util.convertLbToKG(gawrRearLb));

							var gawrFrontLb = parseInt(result.getValue('custrecordgd_unit_gawrfrontaxle'));
							var gawrFrontKg = Math.round(SSLib_Util.convertLbToKG(gawrFrontLb));

							// ---- GAWR Null Checks
							gawrFrontLb = isNaN(gawrFrontLb) ? 0 : gawrFrontLb;
							gawrFrontKg = isNaN(gawrFrontKg) ? 0 : gawrFrontKg;
							gawrRearLb = isNaN(gawrRearLb) ? 0 : gawrRearLb;
							gawrRearKg = isNaN(gawrRearKg) ? 0 : gawrRearKg;
							
							// Trailer Type
							var trailerType 		= result.getText('custrecordunit_typeofvehicle');
							var singleOrDualAxle 	= 'SINGLE';

							// UVW and Water Capacity
							var uvwLb 					= parseInt(result.getValue('custrecordunit_uvw'));
							var freshWaterCapacityGal 	= parseInt(result.getValue('custrecordunit_freshwatercapacity'));
							var lpGasCapacityLb 		= parseInt(result.getValue('custrecordunit_lpgasweight'));
							var waterHeaterCapacityGal 	= parseInt(result.getValue('custrecordunit_waterheatercapacity'));
							var waterHeaterCapacityLb 	= SSLib_Util.convertGalToLb(waterHeaterCapacityGal);

							// Cargo Capacity
							var cargoCapacityLb = Math.round(gvwrLb - uvwLb - lpGasCapacityLb); // freshWaterCapacityLb - waterHeaterCapacityLb
							var cargoCapacityKg = Math.round(SSLib_Util.convertLbToKG(cargoCapacityLb));
							var waterCapacityLB = Math.round(SSLib_Util.convertGalToLb(freshWaterCapacityGal) + waterHeaterCapacityLb);
							var waterCapacityKG = Math.round(SSLib_Util.convertLbToKG(waterCapacityLB));

							// UVW Min & Max Weight
							var uvwMinWeightLb = parseInt(result.getValue({ name: 'custitemrvs_uvwminweight', join: 'custrecordunit_model' }));
							var uvwMaxWeightLb = parseInt(result.getValue({ name: 'custitemrvs_uvwmaxweight', join: 'custrecordunit_model' }));

							// UVW, Min & Max null-check
							uvwLb			= isNaN(uvwLb) ? 0 : uvwLb;
							uvwMinWeightLb 	= isNaN(uvwMinWeightLb) ? 0 : uvwMinWeightLb;
							uvwMaxWeightLb 	= isNaN(uvwMaxWeightLb) ? 0 : uvwMaxWeightLb;
							
							// Cargo Capacity null-check
							cargoCapacityLb = isNaN(cargoCapacityLb) ? 0 : cargoCapacityLb;
							cargoCapacityKg = isNaN(cargoCapacityKg) ? 0 : cargoCapacityKg;

							// UVW Min & Max Metric
							var uvwMaxWeightKg = Math.round(SSLib_Util.convertLbToKG(uvwMaxWeightLb));
							var uvwMinWeightKg = Math.round(SSLib_Util.convertLbToKG(uvwMinWeightLb));

							// Trailer Length
							// Pulling Ext. Length per Grand Design's request since they use RVS version.
							var extLength = result.getValue({ name: 'custitemrvsmodelextlength', join: 'custrecordunit_model'});
							var overallLengthStr = '';
							if (extLength != '') {
								overallLengthStr = 'Recreational vehicle overall length ' + extLength + ' as manufactured.';
							}

							// Set the pulled data on the Unit Object
							unitObject['InternalId'] 			= result.id;
							unitObject['VIN'] 					= result.getValue('name');
							unitObject['SerialNumber'] 			= result.getValue('custrecordunit_serialnumber');
							unitObject['Model'] 				= result.getValue({name: 'itemid', join: 'CUSTRECORDUNIT_MODEL'});
							unitObject['unitSeatCapacity'] 		= seatingCapacityTotal;
							unitObject['unitSeatCapacityFront'] = seatingCapacityFront;
							unitObject['unitSeatCapacityRear'] 	= seatingCapacityRear;
							unitObject['SeatingCapacityMassKG']	= seatingCapacityTotalMassKg;
							unitObject['Rims'] 					= rims;
							unitObject['FrontSize'] 			= tireSize;
							unitObject['FrontPSI'] 				= psi;
							unitObject['FrontKPA'] 				= kpa;
							unitObject['RearSize'] 				= tireSize;
							unitObject['RearPSI'] 				= psi;
							unitObject['RearKPA'] 				= kpa;
							unitObject['SpareSize'] 			= tireSize;
							unitObject['SparePSI'] 				= psi;
							unitObject['SpareKPA'] 				= kpa;
							unitObject['HasSpare'] 				= true;
							unitObject['CompanyLine1'] 			= companyName;
							unitObject['CompanyLine2'] 			= companyAddress1;
							unitObject['CompanyLine3'] 			= companyCity + ', ' + companyState + ' ' + companyZip;
							unitObject['shipTo']				= shipToCountry;
							unitObject['ManufactureDate'] 		= mfgDate;
							unitObject['GVWR_LB'] 				= gvwrLb;
							unitObject['GVWR_KG'] 				= gvwrKg;
							unitObject['GAWR_LB']				= gawrFrontLb;
							unitObject['GAWR_KG']				= gawrFrontKg;
							unitObject['RearGAWR_LB']			= gawrRearLb;
							unitObject['RearGAWR_KG']			= gawrRearKg;
							unitObject['UVW_LB'] 				= uvwLb;
							unitObject['UVW_KG'] 				= Math.round(SSLib_Util.convertLbToKG(uvwLb));
							unitObject['TrailerType'] 			= trailerType;
							unitObject['SingleOrDualAxle'] 		= singleOrDualAxle;
							unitObject['CargoCapacityLB'] 		= cargoCapacityLb;
							unitObject['CargoCapacityKG'] 		= cargoCapacityKg;
							unitObject['WaterCapacityLB'] 		= waterCapacityLB;
							unitObject['WaterCapacityKG'] 		= waterCapacityKG;
							unitObject['UVWMINWEIGHT_LB'] 		= uvwMinWeightLb;
							unitObject['UVWMINWEIGHT_KG'] 		= uvwMinWeightKg;
							unitObject['UVWMAXWEIGHT_LB'] 		= uvwMaxWeightLb;
							unitObject['UVWMAXWEIGHT_KG'] 		= uvwMaxWeightKg;
							unitObject['RvOverallLength'] 		= overallLengthStr;

							// Push the Unit Object into the Unit Object Array
							unitObjectsJSONArray.push(unitObject);
						});
					});

				}

            }

			return unitObjectsJSONArray;

        }

        return {get}

    }
);