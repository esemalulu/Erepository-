/**
 * @author Adam Ploof - aploof@veic.org
 * @date   08/06/2025
 * Script File:	veic_csv_helper.js
 * Script Name:	veic_csv_helper.js
 * Script Type:	Library
 * Description:	A utility module for parsing and writing CSV files.
 * 
 * @NApiVersion 2.1
 * @NModuleScope public
 * 
 * History:
 * Date       Author             Change Made
 * ---------------------------------------------------------------------
 * 08/06/25   Adam Ploof         File Creation
 * 09/04/25   Adam Ploof         Add writeCsv function
 * 09/15/25   Adam Ploof         Export helper functions, add unit tests,
 *                               API change: rename parseCsv --> readCsv
 */

/**
 * @typedef {Object<string, string | number | null> | Array<string | number | null>} CsvRow
 */

//@ts-ignore
define(['N/file'],
    /**
     * @typedef file
     * @typedef file.File
     * @typedef Csvfile NS file object (e.g. request.files[<idx>])
     * @param{file} file
     */
    (file) => {
        /**
         * Combine two arrays into an object using one for the keys and
         * the other for the values. Arrays must be of equal length.
         * 
         * @param {Array} keys 
         * @param {Array} vals 
         * @param {Object} out 
         */
        const zipObj = (keys, vals, out = {}) => {
            if (keys.length !== vals.length) {
                throw new Error("Keys and values arrays must be the same length");
            }

            keys.map((k, idx) => {
                out[k] = vals[idx];
            });

            return out;
        }


        /**
         * Join the elements of a row into a string. Wrap string values in double quotes.
         * 
         * @param {CsvRow} row 
         * @returns {string}
         */
        const safeJoinRow = (row) => {
            const vals = Array.isArray(row) ? row : Object.values(row);
            const safeVals = vals.map(v => {
                if (typeof v === 'string') {
                    return `"${v}"`;
                } else if (v === null) {
                    return '';
                }

                return v;
            });

            return safeVals.join(',');
        }

        /**
         * Parse a line in a CSV file and return an array of values.
         * 
         * Note that while it would be simple to just split the string on commas, this
         * doesn't account for the possibility of quoted values that contain commas. Because of this,
         * we need to parse a little more manually.
         * 
         * @param {string} row a single line a CSV file
         * @returns {Array}
         */
        const parseRow = (row) => {
            const transitions = {
                startVal: {
                    ',':     {nextState: 'startVal',        action: 'submitVal'},
                    '"':     {nextState: 'inQuotedVal',     action: null},
                    default: {nextState: 'inVal',           action: 'addToVal'}
                },
                inVal: {
                    ',':     {nextState: 'startVal',        action: 'submitVal'},
                    default: {nextState: 'inVal',           action: 'addToVal'}
                },
                inQuotedVal: {
                    '"':     {nextState: 'lookingForStart', action: null},
                    default: {nextState: 'inQuotedVal',     action: 'addToVal'}
                },
                lookingForStart: {
                    // It's possible to be in this state due to malformed quoted values, e.g. "My val"ue,
                    // If that happens, then an error will be thrown on zipping.
                    ',':     {nextState: 'startVal',         action: 'submitVal'},
                    default: {nextState: 'lookingForStart',  action: 'addToVal'}
                }
            };

            let currentState = 'startVal';
            const values = [];

            let val = '';
            for (let i = 0; i < row.length; i++) { 
                let trigger = 'default';
                let action = null;
                let nextState = null;

                const char = row.charAt(i);
                if (transitions[currentState].hasOwnProperty(char)) {
                    trigger = char;
                }

                action = transitions[currentState][trigger].action;
                if (action === 'addToVal') {
                    val += char;
                } else if (action === 'submitVal') {
                    values.push(String(val));
                    val = '';
                }

                nextState = transitions[currentState][trigger].nextState;
                if (nextState === null) {
                    throw new Error(`Undefined trigger: ${trigger} for state: ${currentState}`);
                }

                currentState = nextState;
            }

            // Clean up last column
            values.push(val);

            return values;
        }

        /**
         * Parse a CSV and return an object with the keys being the CSV headers
         * 
         * @param {Csvfile} csvFile a file.File object: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_4205693274.html#bridgehead_1543845180
         * @param {boolean} noHeaders true if CSV file does not have headers
         * @returns {CsvRow[]} If noHeaders is true, returns rows as an array of values, otherwise
         *                     returns rows as objects with the headers as the keys.
         */
        const readCsv = (csvFile, noHeaders = false) => {
            const iterator = csvFile.lines.iterator();
            let headers = null;
            if (!noHeaders) {
                iterator.each((line) => {
                    headers = parseRow(line.value);
                    return false;
                });
            }

            const rows = [];
            iterator.each((line) => {
                const vals = parseRow(line.value);
                if (noHeaders) {
                    rows.push(vals);
                } else {
                    rows.push(zipObj(headers, vals));
                }

                return true;
            });

            return rows;
        }

        /**
         * Create and write data to CSV file.
         * 
         * @param {string} filename
         * @param {CsvRow[]} data 
         * @returns {file.File}
         */
        const writeCsv = (filename, data) => {
            if (data.length === 0) {
                throw new Error('Unable to write CSV file, data is empty.');
            }

            let headers = [];
            if (!Array.isArray(data[0])) {
                headers = Object.keys(data[0]);
            }

            const filenameWithExt = filename.endsWith('.csv') ? filename : `${filename}.csv`;
            const csv = file.create({
                name: filenameWithExt,
                contents: headers.length > 0 ? safeJoinRow(headers) + '\n' : '',
                fileType: file.Type.CSV,
                encoding: file.Encoding.UTF_8
            });
            for (const row of data) {
                csv.appendLine({value: safeJoinRow(row)});
            }

            return csv;
        }

        return {parseRow, zipObj, safeJoinRow, readCsv, writeCsv}
    }
);
