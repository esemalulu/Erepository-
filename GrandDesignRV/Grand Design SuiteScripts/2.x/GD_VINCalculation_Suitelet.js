/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/redirect', 'N/query', 'N/config', 'N/record', './GD_Constants', './GD_VINCalc_Plugin'],
    
    (serverWidget, redirect, query, config, record, constants, GD_VINCalc_Plugin) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {

        /*
        * Creates a calculate VIN form with a display of the VIN after it has been generated and four fields to generate the VIN. 
        * There is a series, model and location field that allows you to select the appropriate value. The production sequence number 
        * is optional. If there is no entry in the product sequence number, the VIN will be created as if it were the next production
        * unit.
        * 
        * This is a 2.1 conversion of 1.0 VIN Calculation Suitelet Script. Since the script was lightweight, we did not include the 'step' design 
        * 
        */
            // Define Request
            var request = scriptContext.request;
            var response = scriptContext.response;

            if (request.method == 'GET')
            {
                let form = serverWidget.createForm({
                    title: 'Calculate VIN'
                });

                var vinnum = toString(request.parameters.custpage_vin);
                if (vinnum.length > 0)
                {
                    // VIN number Field Group
                    let vinNumFieldGroup = form.addFieldGroup({
                        id:     'custpage_vinfg',
                        label:  'VIN'
                    })

                    // VIN number
                    let vinNumField = form.addField({
                        id:             'custpage_vinnum',
                        label:          'VIN Number',
                        container:      'custpage_vinfg',
                        type:           serverWidget.FieldType.TEXT
                    }).defaultValue = request.parameters['custpage_vinnum'];
                    
                }
                
                /*
                * Adds the correct fields to calculate the VIN and organizes them into a single column. Creates a generate VIN button at the top of the page for 
                * submitting the information.
                */		
                // A group to hold the main fields
                let mainFieldGroup = form.addFieldGroup({
                    id:     'custpage_mainfg',
                    label:  'Select values below to generate the VIN. If the Production Sequence Number is left blank, the VIN will be calculated as if it were the next production unit.'
                });

                // Series field
                var seriesField = form.addField({
                    id:                 'custpage_series',
                    label:              'Series',
                    container:          'custpage_mainfg',
                    type:               'select',
                    source:             'customrecordrvsseries'
                });

                // Model fields are a bit more complicated than the other ones because you have to source in the correct custom item type
                var modelField = form.addField({
                    id:                 'custpage_model',
                    label:              'Model',  
                    container:          'custpage_mainfg',
                    type:               'select'
                });

                // Add in an option for no selection for the model and set that as our first value
                modelField.addSelectOption({
                    value:      '',
                    text:       '',
                    selected:   true
                });
        
                // Query and run the model options to add into the Model select field
                var modelQuery = "SELECT id, itemid " +
                    "FROM item " +
                    "WHERE custitemrvsdiscontinuedmodel = 'F' AND isinactive = 'F' AND custitemrvsitemtype = "+ constants.GD_ITEM_TYPE_MODEL;
                
                var modelResults = query.runSuiteQL({ query: modelQuery });
        
                // Add in our model options to the select field
                try{
                    // Loop through the results of model query and add them as select options if they exist
                    if (modelResults.results[0].values[0] != null)
                    {
                        for (var i=0; i<modelResults.results.length; i++)
                        {
                            // Add the values to the list
                            modelField.addSelectOption({
                                value:      modelResults.results[i].values[0], 
                                text:       modelResults.results[i].values[1],
                                selected:   false
                            });
                        }
                    }
                } catch (error) {
                    // Log out the error if something went wrong
                    log.error({
                        title: 'Error while loading in custom item type for Model selection field',
                        details: error
                    });
                }
            
                // LocationField sourcing is also weird like ModelField, so bear with more try/catch code here
                var locationField = form.addField({
                    id:                 'custpage_locationid',
                    label:              'Plant of Manufacturing',
                    container:          'custpage_mainfg',
                    type:               'select'
                });

                // Add in an option for no selection for the location and set that as our first value
                locationField.addSelectOption({
                    value:      '',
                    text:       '',
                    selected:   true
                });
        
                // Query and run the location options to add into the LocationField select field 
                var locationQuery   = "SELECT location.id, location.name FROM location"; 
                var locationResults = query.runSuiteQL({ query: locationQuery });
        
                // Add in our location options to the select field
                try{
                    // Loop through the results of location query and add them as select options if they exist
                    if (locationResults.results[0].values[0] != null)
                    {
                        for (var i=0; i<locationResults.results.length; i++)
                        {
                            // Add the values to the list
                            locationField.addSelectOption({
                                value:      locationResults.results[i].values[0], 
                                text:       locationResults.results[i].values[1],
                                selected:   false
                            });
                        }
                    }
                } catch (error) {
                    // Log out the error if something went wrong
                    log.error({
                        title:      'Error while loading in custom item type for Plant of Manufacturing selection field',
                        details:    error
                    });
                }

                // --- The rest of the fields on the form ---

                var modelYearField = form.addField({
                    id:                 'custpage_modelyear',
                    label:              'Model Year',
                    container:          'custpage_mainfg',
                    type:               'select',
                    source:             'customrecordrvsmodelyearcodes'
                });

                let prodSeqField = form.addField({
                    id:             'custpage_prodseq',
                    label:          'Production Sequence Number',
                    container:      'custpage_mainfg',
                    type:           serverWidget.FieldType.TEXT
                });
                
                // Setting all the necessary fields as mandatory
                seriesField.isMandatory         = true;
                modelField.isMandatory          = true;
                modelYearField.isMandatory      = true;
                locationField.isMandatory       = true;

                form.addSubmitButton({
                    label: 'Generate Motorhome VIN'
                });
                
                response.writePage(form);
            }
            
            // Loads in the records for the selection lists 
            else 
            {
                // Gather all the parameters from the request
                var seriesId                = request.parameters['custpage_series'];
                var modelId                 = request.parameters['custpage_model'];
                var locationId              = request.parameters['custpage_locationid'];
                var modelYear               = request.parameters['custpage_modelyear'];
                var sequence                = request.parameters['custpage_prodseq'];
                
                // Load the records from the passed IDs
                var model                   = record.load({type: 'assemblyitem', id: modelId});
                var series                  = record.load({type: 'customrecordrvsseries', id: seriesId});
                
                // Retrieves the series VIN code
                var seriesCode              = series.getValue('custrecordseries_vincode');

                // Model Length Code
                var modelLength             = Math.round(parseFloat(model.getValue('custitemrvsextlengthdecimal')));

                // Model Year Code
                var modelYearVINCodeQuery   = 'SELECT custrecordmodelyear_vincode FROM customrecordrvsmodelyearcodes WHERE id = ' + modelYear;
                var modelYearVINCodeResults = query.runSuiteQL({query: modelYearVINCodeQuery}).asMappedResults();
                var modelYearVINCode        = modelYearVINCodeResults[0].custrecordmodelyear_vincode;

                // Location & Line Codes
                var location                = record.load({type: 'location', id: locationId});
                var locationVINCode         = location.getValue('custrecordrvslocation_vincode');
                var lineVINCode             = location.getValue('custrecordrvslocation_linevincode');
                
                // Get the department to vary the type of VIN calculation by
                var department              = series.getValue('custrecordgdseries_type');

                // Get the sequence if it's not already set.
                if (sequence.length == 0)
                {   
                    // Load the sequence number record id from preferences
                    var companyPreferences      = config.load({type: config.Type.COMPANY_PREFERENCES});
                    var sequenceNumberRecordId  = companyPreferences.getValue('custscriptproductionsequencenumberrecord');

                    // Query and load up the value of the sequence number
                    var sequenceNumberQuery     = `SELECT custrecordproductseqnum_nextprodseqnum FROM customrecordrvsproductionnumbersequence WHERE id = ${sequenceNumberRecordId}`;
                    var sequence                = query.runSuiteQL(sequenceNumberQuery).asMappedResults()[0].custrecordproductseqnum_nextprodseqnum; 
                }
                
                // Pad the production sequence number to be 5 digits
                var productionSeqNumber = pad(sequence, 5);

                // Call the appropriate VIN calculation code and assign an actual vin to the output
                if (department == constants.GD_DEPARTMENT_TOWABLES) {
                    
                    // --- Towable Only Calculations ---

                    // WMID
                    var WMID = GD_VINCalc_Plugin.GetWMID();

                    // Vehicle Type Code 
                    var vehicleTypeId               = model.getValue('custitemrvsmodeltype');
                    var vehicleTypeCodeQuery        = 'SELECT custrecordvehicletype_vincode FROM customrecordrvsvehicletype WHERE id = ' + vehicleTypeId;
                    var vehicleTypeCodeResults      = query.runSuiteQL({query: vehicleTypeCodeQuery}).asMappedResults();
                    var vehicleTypeCode             = vehicleTypeCodeResults[0].custrecordvehicletype_vincode;
                    
                    // Axle Config Code
                    var axleConfigId                = model.getValue('custitemrvsmodelaxleconfiguration');
                    var axleConfigVINCodeQuery      = 'SELECT custrecordaxleconfiguration_vincode FROM customrecordrvsaxleconfiguration WHERE id = '+ axleConfigId;
                    var axleConfigVINCodeResults    = query.runSuiteQL({query: axleConfigVINCodeQuery}).asMappedResults();
                    var axleConfigVINCode           = axleConfigVINCodeResults[0].custrecordaxleconfiguration_vincode;

                    // Calculate the VIN
                    var vin = GD_VINCalc_Plugin.CalculateVINNumber(productionSeqNumber, WMID, vehicleTypeCode, seriesCode, modelLength, axleConfigVINCode, modelYearVINCode, locationVINCode, lineVINCode);

                    log.audit({
                        title: 'Values/Codes passed/received from the Towable VINCalc',
                        details:    'VIN Number: '              + vin + ', ' +
                                    'WMID: '                    + WMID + ', ' + 
                                    'Vehicle Type Code: '       + vehicleTypeCode + ', ' +
                                    'Series Code: '             + seriesCode + ', ' +
                                    'Model Length: '            + modelLength + ', ' + 
                                    'Line VIN Code: '           + lineVINCode + ', ' +
                                    'Axle Configuration: '      + axleConfigVINCode + ', ' + 
                                    'Model Year: '              + modelYearVINCode + ', ' + 
                                    'Location/Plant: '          + locationVINCode + ', ' +
                                    'Production Seq Number: '   + productionSeqNumber
                    });

                } else if (department == constants.GD_DEPARTMENT_MOTORHOME) {
                    
                    // --- Motorhome Only Calculations ---

                    // Chassis Type
                    var chassisTypeId           = model.getValue('custitemgd_chassismfg');
                    var chassisTypeCodeQuery    = 'SELECT custrecordgd_chassismfg_serialcode FROM customrecordgd_chassismanufacturers WHERE id = ' + chassisTypeId;
                    var chassisTypeCodeResults  = query.runSuiteQL({query: chassisTypeCodeQuery}).asMappedResults();
                    var chassisTypeCode         = chassisTypeCodeResults[0].custrecordgd_chassismfg_serialcode;    
                    
                    // Engine Configuration	
                    var engineConfigurationId           = model.getValue('custitemgd_engineconfig');
                    var engineConfigurationCodeQuery    = 'SELECT custrecordgd_engineconfig_sncode FROM customrecordgd_engineconfigurations WHERE id = ' + engineConfigurationId;
                    var engineConfigurationCodeResults  = query.runSuiteQL({query: engineConfigurationCodeQuery}).asMappedResults();
                    var engineConfigurationCode         = engineConfigurationCodeResults[0].custrecordgd_engineconfig_sncode;    
                    
                    // Chassis GVWR
                    var chassisGVWRId           = model.getValue('custitemgd_gvwrweight');
                    var chassisGVWRCodeQuery    = 'SELECT custrecordgd_gvwr_code FROM customrecordgd_chassisgvwr WHERE id = ' + chassisGVWRId;
                    var chassisGVWRCodeResults  = query.runSuiteQL({query: chassisGVWRCodeQuery}).asMappedResults();
                    var chassisGVWRCode         = chassisGVWRCodeResults[0].custrecordgd_gvwr_code;    

                    // Calculate the VIN
                    var vin = GD_VINCalc_Plugin.CalculateVINNumberMotorhome(chassisTypeCode, seriesCode, modelLength, engineConfigurationCode, chassisGVWRCode, modelYearVINCode, locationVINCode, lineVINCode, productionSeqNumber);
                    
                    log.audit({
                        title: 'Values/Codes passed/received from the Motorhome VINCalc',
                        details:    'VIN Number: '              + vin + ', ' +
                                    'Chassis Type Code '        + chassisTypeCode + ', ' +
                                    'Series Code: '             + seriesCode + ', ' +
                                    'Model Length: '            + modelLength + ', ' + 
                                    'Engine Configuration: '    + engineConfigurationCode + ', ' +
                                    'Chassis GVWR: '            + chassisGVWRCode + ', ' +
                                    'Model Year: '              + modelYearVINCode + ', ' + 
                                    'Location/Plant: '          + locationVINCode + ', ' +
                                    'Plant Line: '              + lineVINCode + ', ' +
                                    'Production Seq Number: '   + productionSeqNumber
                    })
                }

                // Redirects to this suitelet with params to reset the values
                redirect.toSuitelet({
                    scriptId:       'customscriptgd_vincalc_suitelet',
                    deploymentId:   'customdeploygd_vincalc_suitelet',
                    parameters: {
                        'custpage_vinnum':             vin
                        // 'custpage_series':          series,
                        // 'custpage_model':           modelId,
                        // 'custpage_modelyear':       modelYear,
                        // 'custpage_prodseq':         productionSeqNumber
                    }
                });
            }

            // ==== Helper Functions ====
            
            /**
             * Name: pad
             * Description: Pad the given string with 0's.
             * Use: pad helper method.
             */
            function pad(number, length) {
                var str = '' + number;
                while (str.length < length) {
                    str = '0' + str;
                }
            
                return str;
            };

        }

        return {onRequest}

    });
