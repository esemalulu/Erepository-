/**
 * @NApiVersion 2.x
 * @NScriptType plugintypeimpl
 */
define(['N/query', 'N/record', 'N/config', './GD_Constants'],
/**
 * @param {query} query
 * @param {record} record
 * @param {config} config
 * @param {constants} constants
 */
function(query, record, config, constants) {

    /**
     * This function operates as the driver for setting the VIN for a record. this is a significantly modified
     * converted plugin from a 1.0 script titled VinCalculations.js. Much of the code is 
     * just converted 1.0 code; however, functionality to split Motorhome and Towable units' VIN calculations 
     * has been added.
     * @param {unitId} unitId 
     * @param {sequenceNumber} sequenceNumber 
     */
    function setVinCalculations(unitId, sequenceNumber){
        try{
                
            // Load the values that are used for both Towable and Motorhome calculations first
            var unit        = record.load({type: 'customrecordrvsunit', id: unitId});
            var modelId     = unit.getValue('custrecordunit_model');
            var model       = record.load({type: 'assemblyitem', id: modelId});
            var seriesId    = unit.getValue('custrecordunit_series');
            var series      = record.load({type: 'customrecordrvsseries', id: seriesId});

            // Series Code
            var seriesCode                  = series.getValue('custrecordseries_vincode');

            // Model Length Code
            var modelLength                 = Math.round(parseFloat(model.getValue('custitemrvsextlengthdecimal')));
    
            // Model Year Code
            var modelYearId                 = model.getValue('custitemrvsmodelyear');
            var modelYearVINCodeQuery       = 'SELECT custrecordmodelyear_vincode FROM customrecordrvsmodelyearcodes WHERE id = ' + modelYearId;
            var modelYearVINCodeResults     = query.runSuiteQL({query: modelYearVINCodeQuery}).asMappedResults();
            var modelYearVINCode            = modelYearVINCodeResults[0].custrecordmodelyear_vincode;
            
            // Location & Line Codes
            var locationId                  = unit.getValue('custrecordunit_location');
            var location                    = record.load({type: 'location', id: locationId});
            var locationVINCode             = location.getValue('custrecordrvslocation_vincode');
            var locationLineVINCode         = location.getValue('custrecordrvslocation_linevincode');

            // Get the department to vary the type of VIN calculation by
            var department                  = series.getValue('custrecordgdseries_type');

            if (department == constants.GD_DEPARTMENT_TOWABLES) {
                
                // --- Towable Only Calculations ---

                // WMID
                var WMID = GetWMID();

                // Vehicle Type Code
                var vehicleTypeId           = model.getValue('custitemrvsmodeltype');
                var vehicleTypeCodeQuery    = 'SELECT custrecordvehicletype_vincode FROM customrecordrvsvehicletype WHERE id = ' + vehicleTypeId;
                var vehicleTypeCodeResults  = query.runSuiteQL({query: vehicleTypeCodeQuery}).asMappedResults();
                var vehicleTypeCode         = vehicleTypeCodeResults[0].custrecordvehicletype_vincode;    

                // Axle Config Code
                var axleConfigId                = model.getValue('custitemrvsmodelaxleconfiguration');
                var axleConfigVINCodeQuery      = 'SELECT custrecordaxleconfiguration_vincode FROM customrecordrvsaxleconfiguration WHERE id = '+ axleConfigId;
                var axleConfigVINCodeResults    = query.runSuiteQL({query: axleConfigVINCodeQuery}).asMappedResults();
                var axleConfigVINCode           = axleConfigVINCodeResults[0].custrecordaxleconfiguration_vincode;    

                // Calculate the VIN
                var vin = CalculateVINNumber(sequenceNumber, WMID, vehicleTypeCode, seriesCode, modelLength, axleConfigVINCode, modelYearVINCode, locationVINCode, locationLineVINCode);

                // Stringify Sequence Number
                var productionSeqNumberString = sequenceNumber + '';

                // Reload the record to set the VIN
                unit = record.load({type: 'customrecordrvsunit', id: unitId});

                // Set the appropriate values
                unit.setValue('name', vin);
                unit.setValue('custrecordunit_serialnumber', productionSeqNumberString);
                unit.setValue('custrecordunit_calculatevinnumber', false);
                unit.setValue('custrecordvinwascalculated', true);

                unit.save();

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
                var vin = CalculateVINNumberMotorhome(chassisTypeCode, seriesCode, modelLength, engineConfigurationCode, chassisGVWRCode, modelYearVINCode, locationVINCode, locationLineVINCode, sequenceNumber);
                
                // Reload the record to set the VIN on Serial Number Field
                unit = record.load({type: 'customrecordrvsunit', id: unitId});
                
                // Serial gets set to vin instead of serial number now
                unit.setValue('custrecordunit_serialnumber', vin);

                // Set the rest of the values necessary
                unit.setValue('custrecordunit_calculatevinnumber', false);
                unit.setValue('custrecordvinwascalculated', true);

                unit.save();

            }

        }catch(err){
            var unit = record.load({type: 'customrecordrvsunit', id: unitId});
            var msg = 'Unit ' + unit.getValue('name') + ' failed to have its VIN calculated.\r\nError message:\r\n' + err;
            throw err;
        }

    };

    /**
     * Returns the WMID from the company preference script parameter
     * @return (string)wmid
     */
    function GetWMID()
    {
        var companyPreferences = config.load({type: config.Type.COMPANY_PREFERENCES}); 
        companyPreferences.getValue('custscriptrvswmid'); 
        return companyPreferences.getValue('custscriptrvswmid'); 	
    };

/**
 * Calculates a VIN number for Towable Units, given the parameters.
 * Code is converted from a 1.0 script. Left all major notes in for reference 
 * and left most variables the same
 * 
 * @returns {String} VIN number.
 */
 function CalculateVINNumber(productionSeqNumber, WMID, vehicleTypeCode, seriesCode, modelLength, axleConfigVINCode, modelYearVINCode, locationVINCode, lineVINCode)
 {
     // calculate the check digit
     // example below:
     // POS	1	2	3	4	5	6	7	8	9	10	  11  12   13  14  15   16   17
     //		5   X   M   T   J   3   6   2   4    B     5   0    0   5   3    1    4 --VIN-
     // 
     //		5   7   4   3   1   3   6   2   __   2     5   0    0   5   3    1    4   --{TABLE III ASSIGNED VALUES}
     //	X	8   7   6   5   4   3   2  10        9     8   7    6   5   4    3    2   --{TABLE IV POSITION & WEIGHT FACTOR}
     //  ____________________________________________________________________________
     // 		40+ 49+ 24+ 15+ 4+  9+  12+20+  0+   18+   40+ 0+   0+  25+ 12+  3+   8	  = 	279/11 = 25 - 4/11			
 
     /*
        Division remainder = Check digit
 
         This example remainder is 1 insert @ position 1.
         For remainder values > 10 check digit @ position 9 of Vin is X
         
         1. Assign to each number in the VIN its actual mathematical value and assign to each letter the value specified 
             in table III.
         
         2. Multiply the assigned value for each character in the VIN by the position weight factor specified in table IV.
         
         3. Add the resulting products and divide the total by 11.
         
         4. The numerical remainder is the check digit, if the remainder is 10 the letter X shall be used to designate 
              the check digit.  The correct numerical value zero through 0 (0-9) or letter X shall appear in the VIN 
              position nine.
      */
     
    //  var assignedValsCols = new Array();
    //  assignedValsCols[0] = new nlobjSearchColumn('custrecordvinassignedvalues_letter');
    //  assignedValsCols[1] = new nlobjSearchColumn('custrecordvinassignedvalues_value');
    
    //  var vinAssignedValuesResults = nlapiSearchRecord('customrecordrvsvinassignedvalues', null, null, assignedValsCols);
    var vinAssignedValuesQuery = 'SELECT custrecordvinassignedvalues_letter, custrecordvinassignedvalues_value, FROM customrecordrvsvinassignedvalues';
    var vinAssignedValuesResults = query.runSuiteQL({query: vinAssignedValuesQuery}).asMappedResults();

    
    //  var weightFactorCols = new Array();
    //  weightFactorCols[0] = new nlobjSearchColumn('custrecordweightfactor_position');
    //  weightFactorCols[1] = new nlobjSearchColumn('custrecordweightfactor_weightfactor');
     
    //  var weightFactorResults = nlapiSearchRecord('customrecordrvsvinposandweightfactor', null, null, weightFactorCols);
    var weightFactorQuery = 'SELECT custrecordweightfactor_position, custrecordweightfactor_weightfactor, FROM customrecordrvsvinposandweightfactor';
    var weightFactorResults = query.runSuiteQL({query: weightFactorQuery}).asMappedResults();

     // first three are the WMI ... assumes that the WMI is always 3 characters, which it should be
     var wmid1 = WMID[0];
     var wmid2 = WMID[1];
     var wmid3 = WMID[2];
 
     // if the id is a number, then that's the value ... if not, then get the assigned value based on the letter
     var pos1Value = parseInt(wmid1);
     if (isNaN(pos1Value))
     {
         pos1Value = GetVINAssignedValue(wmid1, vinAssignedValuesResults);
     }
     
     var pos2Value = parseInt(wmid2);
     if (isNaN(pos2Value))
     {
         pos2Value = GetVINAssignedValue(wmid2, vinAssignedValuesResults);
     }
     
     var pos3Value = parseInt(wmid3);
     if (isNaN(pos3Value))
     {
         pos3Value = GetVINAssignedValue(wmid3, vinAssignedValuesResults);
     }
     
     // vehicle type
     var pos4Value = GetVINAssignedValue(vehicleTypeCode, vinAssignedValuesResults);
     
     // series
     var pos5Value = GetVINAssignedValue(seriesCode, vinAssignedValuesResults);
     
     // length
     var pos6Value = (modelLength + '').charAt(0);
     var pos7Value = (modelLength + '').charAt(1);
     
     // axle configuration	
     var pos8Value = axleConfigVINCode; 	
     
     // model code
     var pos10Value = GetVINAssignedValue(modelYearVINCode, vinAssignedValuesResults);
     
     // location
     var pos11Value = parseInt(locationVINCode);
     if (isNaN(pos11Value))
     {
         pos11Value = GetVINAssignedValue(locationVINCode, vinAssignedValuesResults);
     }
     
     // line vin
     var pos12Value = parseInt(lineVINCode);
     if (isNaN(pos12Value))
     {
         pos12Value = GetVINAssignedValue(lineVINCode, vinAssignedValuesResults);
     }
     
     // seq number
     var pos13Value = productionSeqNumber.charAt(0);
     var pos14Value = productionSeqNumber.charAt(1);
     var pos15Value = productionSeqNumber.charAt(2);
     var pos16Value = productionSeqNumber.charAt(3);
     var pos17Value = productionSeqNumber.charAt(4);
     
     // get the weight factors
     var pos1WeightFactor = GetWeightFactor(1, weightFactorResults);
     var pos2WeightFactor = GetWeightFactor(2, weightFactorResults);
     var pos3WeightFactor = GetWeightFactor(3, weightFactorResults);
     var pos4WeightFactor = GetWeightFactor(4, weightFactorResults);
     var pos5WeightFactor = GetWeightFactor(5, weightFactorResults);
     var pos6WeightFactor = GetWeightFactor(6, weightFactorResults);
     var pos7WeightFactor = GetWeightFactor(7, weightFactorResults);
     var pos8WeightFactor = GetWeightFactor(8, weightFactorResults);
     var pos10WeightFactor = GetWeightFactor(10, weightFactorResults);
     var pos11WeightFactor = GetWeightFactor(11, weightFactorResults);
     var pos12WeightFactor = GetWeightFactor(12, weightFactorResults);
     var pos13WeightFactor = GetWeightFactor(13, weightFactorResults);
     var pos14WeightFactor = GetWeightFactor(14, weightFactorResults);
     var pos15WeightFactor = GetWeightFactor(15, weightFactorResults);
     var pos16WeightFactor = GetWeightFactor(16, weightFactorResults);
     var pos17WeightFactor = GetWeightFactor(17, weightFactorResults);
     
     // multiply the weight factors
     var pos1Total = parseInt(pos1Value) * pos1WeightFactor;
     var pos2Total = parseInt(pos2Value) * pos2WeightFactor;
     var pos3Total = parseInt(pos3Value) * pos3WeightFactor;
     var pos4Total = parseInt(pos4Value) * pos4WeightFactor;
     var pos5Total = parseInt(pos5Value) * pos5WeightFactor;
     var pos6Total = parseInt(pos6Value) * pos6WeightFactor;
     var pos7Total = parseInt(pos7Value) * pos7WeightFactor;
     var pos8Total = parseInt(pos8Value) * pos8WeightFactor;
     var pos10Total = parseInt(pos10Value) * pos10WeightFactor;
     var pos11Total = parseInt(pos11Value) * pos11WeightFactor;
     var pos12Total = parseInt(pos12Value) * pos12WeightFactor;
     var pos13Total = parseInt(pos13Value) * pos13WeightFactor;
     var pos14Total = parseInt(pos14Value) * pos14WeightFactor;
     var pos15Total = parseInt(pos15Value) * pos15WeightFactor;
     var pos16Total = parseInt(pos16Value) * pos16WeightFactor;
     var pos17Total = parseInt(pos17Value) * pos17WeightFactor;
     
     // total everything up and divide by 11
     var posTotal = pos1Total + pos2Total + pos3Total + pos4Total + pos5Total + 
         pos6Total + pos7Total + pos8Total + pos10Total + pos11Total + pos12Total + 
         pos13Total + pos14Total + pos15Total + pos16Total + pos17Total;
     
     log.debug('Check Digit (Value)', 
             ' pos1Value: ' + pos1Value + 
             ' pos2Value: ' + pos2Value + 
             ' pos3Value: ' + pos3Value + 
             ' pos4Value: ' + pos4Value + 
             ' pos5Value: ' + pos5Value + 
             ' pos6Value: ' + pos6Value + 
             ' pos7Value: ' + pos7Value + 
             ' pos8Value: ' + pos8Value + 
             ' pos10Value: ' + pos10Value + 
             ' pos11Value: ' + pos11Value + 
             ' pos12Value: ' + pos12Value + 
             ' pos13Value: ' + pos13Value + 
             ' pos14Value: ' + pos14Value + 
             ' pos15Value: ' + pos15Value + 
             ' pos16Value: ' + pos16Value + 
             ' pos17Value: ' + pos17Value);
     
     log.debug('Check Digit (Total)', 
             ' pos1Total: ' + pos1Total + 
             ' pos2Total: ' + pos2Total + 
             ' pos3Total: ' + pos3Total + 
             ' pos4Total: ' + pos4Total + 
             ' pos5Total: ' + pos5Total + 
             ' pos6Total: ' + pos6Total + 
             ' pos7Total: ' + pos7Total + 
             ' pos8Total: ' + pos8Total + 
             ' pos10Total: ' + pos10Total + 
             ' pos11Total: ' + pos11Total + 
             ' pos12Total: ' + pos12Total + 
             ' pos13Total: ' + pos13Total + 
             ' pos14Total: ' + pos14Total + 
             ' pos15Total: ' + pos15Total + 
             ' pos16Total: ' + pos16Total + 
             ' pos17Total: ' + pos17Total);
         
     // get the remainder of the total position divided by 11	
     var posRemainder = posTotal % 11;
     
     // if the remainder is 10, then the check digit is "X"
     // otherwise it is the remainder
     var checkDigit = posRemainder;
     if (posRemainder == 10)
         checkDigit = "X";
         
     // take everything and create the VIN
     var vin = 
         WMID + '' + 
         vehicleTypeCode + '' + 
         seriesCode + '' + 
         modelLength + '' + 
         axleConfigVINCode + '' + 
         checkDigit + '' + 
         modelYearVINCode + '' + 
         locationVINCode + '' + 
         lineVINCode + '' +
         productionSeqNumber + '';
     
     return vin;
 }

/**
 * Calculates a VIN number for Motorhome Units, given the parameters.
 * 
 * @returns {String} VIN number.
 */
function CalculateVINNumberMotorhome(chassisType, seriesCode, modelLength, engineConfigurationVINCode, chassisGVWRVINCode, modelYearVINCode, locationVINCode, lineVINCode, productionSeqNumber)
{
    var vin = 
        chassisType + '' + 
        seriesCode + '' + 
        modelLength + '' + 
        engineConfigurationVINCode + '' + 
        chassisGVWRVINCode + '' +
        modelYearVINCode + '' + 
        locationVINCode + '' + 
        lineVINCode + '' +
        productionSeqNumber + '';

    return vin;
}

    /**
     * Name: GetVINAssignedValue
     * Description: Get the assigned VIN value based on the later and the results.
     * Use: GetVINAssignedValue helper method.
     */
    function GetVINAssignedValue(letter, vinAssignedValuesResults)
    {
        for (var i = 0; i < vinAssignedValuesResults.length; i++) 
        {
            if (vinAssignedValuesResults[i].custrecordvinassignedvalues_letter == letter)
            {
                return vinAssignedValuesResults[i].custrecordvinassignedvalues_value;
            }
        }
        return letter;
    }

    /**
     * Name: GetWeightFactor
     * Description: Get the weight factor given the position and the results.
     * Use: GetWeightFactor helper method.
     */
    function GetWeightFactor(position, weightFactorResults)
    {
        for (var i = 0; i < weightFactorResults.length; i++) 
        {
            if (weightFactorResults[i].custrecordweightfactor_position == position)
            {
                return parseInt(weightFactorResults[i].custrecordweightfactor_weightfactor);
            }
        }
        return position;
    }


    return {
        CalculateVINNumberMotorhome: CalculateVINNumberMotorhome,
        CalculateVINNumber: CalculateVINNumber,
        setVinCalculations: setVinCalculations,
        GetWMID:            GetWMID
    };
    
});