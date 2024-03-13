/**
 * @NApiVersion 2.0
 * @NScriptType plugintypeimpl
 */
define(['N/format','N/search','N/runtime'],
        function(format, search, runtime) {
            /*
             * @param (String) - string to be checked for empty 
             * @returns (boolean) - true or false
             */
            function isEmpty(str) {
                if (str!==undefined && str !== null && str !== '' && typeof str === 'string') {
                    str = str.replace(/\s/g, '');
                }
                return (str===undefined || str === null || str === '' || str.length === 0);
            }
            /*
             * Convert string into netsuite date object 
             * @param (string) stringDate - string with date in mm/dd/yyyy format 
             * @returns (date) - returns netsuite date object
             */
            function stringToDate(stringDate) {
                return format.format({
                    value: stringDate,
                    type: format.Type.DATE
                });
            }
            
            /**
             * Convert NS date string into ISO Date format
             * 
             * @param (string) - string value of NetSuite's date
             * @returns (string)
             */
            function nsDateToISODateString(sval){
                function correctLessThanTen(val) {
                    return val < 10 ? '0' + val : '' + val;
                }

                var dval = format.parse({
                    value : sval,
                    type : format.Type.DATE
                });
                var convertedString = '';
                try {
                    var y = dval.getFullYear();
                    var m = correctLessThanTen((dval.getMonth() + 1));
                    var d = correctLessThanTen(dval.getDate());
                    var h = correctLessThanTen(dval.getHours());
                    var n = correctLessThanTen(dval.getMinutes());
                    var s = correctLessThanTen(dval.getSeconds());
                    var z = dval.getTimezoneOffset();
                    var zs = (z < 0 ? '-' : '+') + correctLessThanTen((z / 60)) + ':' + correctLessThanTen((z % 60));
                    convertedString = y + '-' + m + '-' + d + 'T' + h + ':' + n + ':' + s + zs;
                }
                catch (ex) {
                    convertedString = JSON.stringify(dval);
                }
                return convertedString;
            }
            
            /**
             * Check if given value is undefined, null or empty string
             * 
             * @param {any}
             *                value
             * @returns {Boolean}
             */
            function isNullOrEmpty(value) {
                return (value === undefined || value === null || value === '');
            }

            /**
             * Get the value from any NS record type by looking at certain field and return value from desired field
             * 
             * @param {type} recordType
             * @param {type} fieldsToLookAt
             * @param {type} values
             * @param {type} fieldToReturn
             * @returns {unresolved} */
            function getValueByFieldNameAndSearchValues (recordType, fieldsToLookAt, values, fieldToReturn) {
                var result = null;
                var filters = [];
                if (isNullOrEmpty(fieldsToLookAt)) {
                    throw error.create({
                        name : 'INVALID_PARAMETER',
                        message : 'Empty list of Fields to look at have being passed. Please check.'
                    });
                }
                if (isNullOrEmpty(values)) {
                    throw error.create({
                        name : 'INVALID_PARAMETER',
                        message : 'Empty list of Values to look at have being passed. Please check.'
                    });
                }
                if (fieldsToLookAt.length !== values.length) {
                    throw error.create({
                        name : 'INVALID_PARAMETER',
                        message : 'Fields to look at and Values arrays must be consistent. '
                            + 'Number of elements must be the same. Please check.'
                    });
                }
                for (var i = 0; i < fieldsToLookAt.length; i++) {
                    filters.push(search.createFilter({
                        name : fieldsToLookAt[i],
                        operator : search.Operator.ANY,
                        value : values[i]
                    }));
                }
                var lsearch = search.create({
                    type : recordType,
                    filters : filters,
                    columns : [ {
                        name : fieldToReturn
                    } ]
                });
                var results = lsearch.run();
                if (!isNullOrEmpty(results)) {
                    try {
                        results.each(function(res){
                            result = res.getValue(fieldToReturn);
                        });
                    }
                    catch (ex) {
                        result = null;
                    }
                }
                return result;
            }
            

            /**
             * Supplementary function to return System's endpoint
             * 
             * @returns
             */
            function getSystemEndPoint() {
                return 'https://663271.app.netsuite.com';
            }
            
            return{
                isEmpty: isEmpty,
                isNullOrEmpty: isNullOrEmpty,
                stringToDate: stringToDate,
                nsDateToISODateString: nsDateToISODateString,
                getValueByFieldNameAndSearchValues:getValueByFieldNameAndSearchValues,
                getSystemEndPoint:getSystemEndPoint
            };
        });
