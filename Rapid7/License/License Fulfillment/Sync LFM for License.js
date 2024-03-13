/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 * author: ngrigoriev
 * Date: 06.08.2019
 * Version: 1.0
 */
                                 
      
define(['N/record','N/runtime','N/search'],

 /**
* @param {record} record
* @param {runtime} runtime
* @param {search} search
*/
    function(record, runtime, search) {

        /**
         * Definition of the Scheduled script trigger point.
         * @param {Object} context
         * @param {string} context.type - The context in which the script is executed. It is one of the values from the context.InvocationType enum.
         * @Since 2015.2
         */
        function execute(context){
            var currentScript = runtime.getCurrentScript();
            var licenseType = currentScript.getParameter({name:'custscript_licensetype'});
            var licenseId = currentScript.getParameter({name:'custscript_licenseid'});
            var licenseFields = mapFields(licenseType);
            var licenseProductKey = search.lookupFields({type:licenseFields.licenseRecordName, id:licenseId, columns:[licenseFields.licenseProductKeyField]})['custrecordr7nxproductkey'];

            var listOfLFM = getListOfLFM(licenseFields, licenseId, licenseProductKey);
            listOfLFM.forEach(function(value) {
                log.debug('processing LFM ',value);
                var valuesObj = {};
                valuesObj[licenseFields.LFMKeyField] = licenseProductKey;
                record.submitFields({
                    type:licenseFields.LFMRecordName,
                    id:value,
                    values:valuesObj
                });
            });
            log.debug('Processed list of LFMs', listOfLFM);
        }

        function getListOfLFM(licenseFields, licenseId, licenseProductKey){
            var listOfLFMs = [];
            var filters = [];
            filters.push(search.createFilter({name: licenseFields.LFMFieldName, operator: search.Operator.ANYOF, values:licenseId}));
            filters.push(search.createFilter({name: licenseFields.LFMKeyField, operator: search.Operator.ISNOT, values:licenseProductKey}));
            search.create({type:'customrecordr7licensefeaturemanagement', filters:filters}).run().each(
                function(result){
                    listOfLFMs.push(result.id);
                    return true;
                });
            return listOfLFMs;
        }

        function mapFields(licenseType){
            var licenseFieldMap = {
                'Nexpose': {
                    licenseRecordName: 'customrecordr7nexposelicensing',
                    LFMRecordName: 'customrecordr7licensefeaturemanagement',
                    LFMFieldName: 'custrecordr7licfmnexposelicense',
                    LFMKeyField:'custrecordr7licfmproductkey',
                    licenseProductKeyField: 'custrecordr7nxproductkey'
                }
            };
            return licenseFieldMap[licenseType];
        }


        return {
            execute: execute
        }
    }
);