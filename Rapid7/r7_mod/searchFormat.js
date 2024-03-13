/**
 * Utility useful for destructuring assignments for N/search searchResults
 *
 * search.run().getRange(start,end) will return a list, where each index is a row
 * search.run().each(result =>{}) will return a single row
 *
 * @NApiVersion 2.1
 */
define([],

    () => {

        /**
         * SearchResult values only, no text or column names.
         * getRange() returns [[1,2], [3,4] ...]
         * each() returns [1, 2]
         */
        const valuesOnly = (searchResults) => {
            return resultsGenerator(searchResults, [], (results, value) => {
                results.push(extractValue(value));
            });
        }

        /**
         * SearchResult value and text, no column names.
         * getRange() returns [[{value:1, text:'First'},{value:2, text:'Second'}], ...]
         * each() returns [{value:1, text:'First'},{value:2, text:'Second'}]
         */
        const textAndValues = (searchResults) => {
            return resultsGenerator(searchResults, [], (results, value) => {
                results.push({value: extractValue(value), text: extractText(value)});
            });
        }

        /**
         * SearchResult value and column name, no text value.
         * getRange() returns [[{column1: 1, column2: 2}], [{column3: 3, column4: 4}]]
         * each() returns [{column1: 1, column2: 2}]
         */
        const columnsAndValues = (searchResults) => {
            return resultsGenerator(searchResults, {}, (results, value, searchColumn) => {
                results[searchColumn] = extractValue(value);
            });
        }

        /**
         * SearchResult value, text and column name.
         * getRange() returns [[{column1: {value:1, text:'First'}, column2: {value:2, text:'Second'}}],...]
         * each() returns [{column1: {value:1, text:'First'}, column2: {value:2, text:'Second'}}]
         */
        const columnsTextAndValues = (searchResults) => {
            return resultsGenerator(searchResults, {}, (results, value, searchColumn) => {
                results[searchColumn] = {value: extractValue(value), text: extractText(value)}
            });
        }

        /**
         * isArray is true when getResults is true, so we return all results at once
         * when false, we know we're just returning a single row
         */
        function resultsGenerator(searchResults, resultObj, pushMethod) {
            return isArray(searchResults) ? iterateSearchResults(searchResults, resultObj, pushMethod) : getResult(searchResults, resultObj, pushMethod);
        }

        /**
         * Gets values for all the rows in searchResults
         */

        function iterateSearchResults(searchResults, resultObj, pushMethod) {
            let results = [];
            for (const row of searchResults) {
                results.push(getResult(row, resultObj, pushMethod));
            }
            return results;
        }

        /**
         * For the given row, get the column values. IsArray is used to check if a column is a list/record, because
         * they're in an object in an array (for some reason). If we're returning column names, then resultObj is an object,
         * else its an array.
         */
        const getResult = (row, resultObj, pushMethod) => {
            const values = row.getAllValues();
            const cleanResultObj = isArray(resultObj) ? Object.assign([], resultObj) : Object.assign({}, resultObj);
            for (const searchColumn of Object.keys(values)) {
                const value = isArray(values[searchColumn]) ? values[searchColumn][0] : values[searchColumn];
                pushMethod(cleanResultObj, value, searchColumn);
            }
            return cleanResultObj;
        }

        const extractValue = valueObj => {
            return valueObj instanceof Object ? valueObj.value : valueObj;
        }

        const extractText = textObj => {
            return textObj instanceof Object ? textObj.text : textObj;
        }

        const isArray = searchResults => {
            return searchResults instanceof Array;
        }

        return {valuesOnly, textAndValues, columnsAndValues, columnsTextAndValues}

    });
