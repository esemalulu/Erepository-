/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/file', 'N/query'],

(file, query) => {

    const TERM_COLUMN_1 = 'terms';
    const TERM_COLUMN_2 = 'terms_1';
    const UOM_COLUMN_1 = 'units';
    const UOM_COLUMN_2 = 'units_1';
    const TRANSACTION_COLUMN = 'previousdoc';
    const ITEM_COLUMN = 'item';
    const ITEM_COLUMN_1 = 'item_1';
    const ITEM_TYPE_COLUMN = 'itemtype';
    const ACCOUNT_COLUMN = 'account';
    const WGO_DATASET_ID = 'custdatasetgd_wgodataset';
    const CSV_COLUMN_DELIMITER = '|';
    const CSV_EXPORT_FOLDER = 47676219;

    /**
     * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
     * @param {Object} inputContext
     * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
     *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
     * @param {Object} inputContext.ObjectRef - Object that references the input data
     * @typedef {Object} ObjectRef
     * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
     * @property {string} ObjectRef.type - Type of the record instance that contains the input data
     * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
     * @since 2015.2
     */

    const getInputData = (inputContext) => {
        // * Get all the lookup dictionaries that don't need any filtering here.
        let uomLookup = getUOMNames();
        let accountLookup = getAccountNames();
        let termsLookup = getTermNames();
        let itemTypeLookup = getItemTypeNames()

        // * There are hundreds of thousands of transactions to look up, which is not feasible for a dictionary.
        // * So instead we keep track of all internal IDs of transactions we encounter while parsing the dataset.
        let transactionDict = {};
        let itemDict = {};

        // * Load a query based on the Supply Chain dataset.
        let exportQuery = query.load({id: WGO_DATASET_ID});

        // * There are over 290,000 lines in this dataset, so we need to process it in pages.
        let pagedResults = exportQuery.runPaged({
            pageSize: 500
        });

        let labels, aliases;

        let rawData = [];

        let curAlias, curRow;

        // * We need to track the index of the transaction and item columns, so we can update the values in that column later.
        let transactionIndex = -1;
        let firstItemIndex = -1;
        let secondItemIndex = -1;

        // * Loop through each page and process all its results.
        for (var i = 0; i < pagedResults.pageRanges.length; i++) {
            try {
                let page = pagedResults.fetch(i);

                // * On the first page, grab the aliases and labels of the columns for this dataset.
                if (i === 0) {
                    labels = getColumnLabels(page.data.columns);
                    aliases = getColumnAliases(page.data.columns);

                    // * We need to track the index of the column containing internal IDs of transactions.
                    transactionIndex = aliases.indexOf(TRANSACTION_COLUMN);
                    firstItemIndex = aliases.indexOf(ITEM_COLUMN);
                    secondItemIndex = aliases.indexOf(ITEM_COLUMN_1);
                }

                // * For each result in a page, we need to convert it into a array of values.
                page.data.asMappedResults().forEach(function (result) {
                    // * Reset our row.
                    curRow = [];

                    // * For each column, pull its value from the current result.
                    // * If the value is the internal ID of a record (that displays as text in the UI dataset), 
                    // * we need to retrieve its text representation from the corresponding dictionary.
                    for (var k = 0; k < aliases.length; k++) {
                        curAlias = aliases[k];
                        curValue = result[curAlias];

                        // * Two columns store the internal ID of a UOM.
                        if (curAlias == UOM_COLUMN_1 || curAlias == UOM_COLUMN_2) {
                            curValue = uomLookup[curValue];
                        }
                        // * Two columns store the internal ID of a Term.
                        else if (curAlias == TERM_COLUMN_1 || curAlias == TERM_COLUMN_2) {
                            curValue = termsLookup[curValue];
                        }
                        // * Only one column stores the internal ID of an Account.
                        else if (curAlias == ACCOUNT_COLUMN) {
                            curValue = accountLookup[curValue];
                        }
                        // * Only one column stores the internal ID of an Item Type.
                        else if (curAlias == ITEM_TYPE_COLUMN) {
                            curValue = itemTypeLookup[curValue];
                        }
                        // * Only one column stores the internal ID of a Transaction.
                        // * For this, we just want to make sure our dictionary has recorded this internal ID.
                        else if (curAlias == TRANSACTION_COLUMN) {
                            transactionDict[curValue] = 1;
                        }
                        // * Two columns store the internal ID of Items.
                        // * For this, we just want to make sure our dictionary has recorded this internal ID.
                        else if (curAlias == ITEM_COLUMN || curAlias == ITEM_COLUMN_1) {
                            itemDict[curValue] = 1;
                        }

                        curRow.push(curValue);
                    }

                    // * Push our completed row into our array of raw data.
                    rawData.push(curRow);
                    return true;
                });
            }
            catch (error) {
                log.error('Error retrieving data point # ' + (i + 1), JSON.stringify(error));
            }
        }

        // * Retrieve an array of all the internal IDs of transactions and items appearing in the dataset.
        // * We used an object for tracking, so this array should only have unique values.
        let transactionIds = Object.keys(transactionDict);
        let itemIds = Object.keys(itemDict);

        // * For the given array of internal IDs of Transactions, retrieve the display name for each Transaction.
        let transactionLookup = getTransactionNames(transactionIds);
        // * For the given array of internal IDs of Items, retrieve the display name for each Item.
        let itemLookup = getItemNames(itemIds);

        // * Loop back through our raw data (make sure to start at index 1, as index 0 contains the header).
        // * Update the value of the transaction column with that Transaction's display name instead of its internal ID.
        // * Update the value of the item columns with that Item's display name instead of its internal ID.
        for (var i = 0; i < rawData.length; i++) {
            curRow = rawData[i];
            // * Don't try to update a column if it isn't defined.
            if (transactionIndex !== -1) {
                curValue = curRow[transactionIndex];
                curRow[transactionIndex] = transactionLookup[curValue];
            }
            if (firstItemIndex !== -1) {
                curValue = curRow[firstItemIndex];
                curRow[firstItemIndex] = itemLookup[curValue];
            }
            if (secondItemIndex !== -1) {
                curValue = curRow[secondItemIndex];
                curRow[secondItemIndex] = itemLookup[curValue];
            }
        }

        // * Files have a size limit of 10MB, and 30,000 rows covers about 7 to 8 MB, so divide our data into pages.
        let pagedFileData = paginate(rawData, 30000);

        // * Some of the values in our CSV will contain commas, so we define a custom delimiter here.
        let fileContents = 'sep=' + CSV_COLUMN_DELIMITER + '\n';
        let currentPage;

        // * For each page, generate a CSV file.
        // * For each row, join its values by our custom delimiter.
        // * Append the string representation of our row as a new line in our fileContents string.
        for (var i = 0; i < pagedFileData.length; i++) {
            currentPage = pagedFileData[i];
            fileContents = 'sep=' + CSV_COLUMN_DELIMITER + '\n';

            curRow = labels.join(CSV_COLUMN_DELIMITER)
            fileContents += curRow + '\n';

            for (var j = 0; j < currentPage.length; j++) {
                curRow = currentPage[j].join(CSV_COLUMN_DELIMITER);
                fileContents += curRow + '\n';
            }

            // * Create a CSV file for the dataset.
            createCSVFile(fileContents, 'Supply Chain Export - Page # ' + (i + 1) + ' - ' + getDateAndTimeString() + '.csv');
        }

        return [];
    }

    /**
     * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
     * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
     * context.
     * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
     *     is provided automatically based on the results of the getInputData stage.
     * @param {Iterator} mapContext.errors - Serialized errors that were thrown during previous attempts to execute the map
     *     function on the current key-value pair
     * @param {number} mapContext.executionNo - Number of times the map function has been executed on the current key-value
     *     pair
     * @param {boolean} mapContext.isRestarted - Indicates whether the current invocation of this function is the first
     *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
     * @param {string} mapContext.key - Key to be processed during the map stage
     * @param {string} mapContext.value - Value to be processed during the map stage
     * @since 2015.2
     */

    const map = (mapContext) => {

    }

    /**
     * Defines the function that is executed when the reduce entry point is triggered. This entry point is triggered
     * automatically when the associated map stage is complete. This function is applied to each group in the provided context.
     * @param {Object} reduceContext - Data collection containing the groups to process in the reduce stage. This parameter is
     *     provided automatically based on the results of the map stage.
     * @param {Iterator} reduceContext.errors - Serialized errors that were thrown during previous attempts to execute the
     *     reduce function on the current group
     * @param {number} reduceContext.executionNo - Number of times the reduce function has been executed on the current group
     * @param {boolean} reduceContext.isRestarted - Indicates whether the current invocation of this function is the first
     *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
     * @param {string} reduceContext.key - Key to be processed during the reduce stage
     * @param {List<String>} reduceContext.values - All values associated with a unique key that was passed to the reduce stage
     *     for processing
     * @since 2015.2
     */
    const reduce = (reduceContext) => {

    }


    /**
     * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
     * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
     * @param {Object} summaryContext - Statistics about the execution of a map/reduce script
     * @param {number} summaryContext.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
     *     script
     * @param {Date} summaryContext.dateCreated - The date and time when the map/reduce script began running
     * @param {boolean} summaryContext.isRestarted - Indicates whether the current invocation of this function is the first
     *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
     * @param {Iterator} summaryContext.output - Serialized keys and values that were saved as output during the reduce stage
     * @param {number} summaryContext.seconds - Total seconds elapsed when running the map/reduce script
     * @param {number} summaryContext.usage - Total number of governance usage units consumed when running the map/reduce
     *     script
     * @param {number} summaryContext.yields - Total number of yields when running the map/reduce script
     * @param {Object} summaryContext.inputSummary - Statistics about the input stage
     * @param {Object} summaryContext.mapSummary - Statistics about the map stage
     * @param {Object} summaryContext.reduceSummary - Statistics about the reduce stage
     * @since 2015.2
     */
    const summarize = (summaryContext) => {

    }

    /**
     * Retrieve the labels of all columns in a query.Page object.
     * 
     * @param {Array} columns - Array of column objects from a query.Page object.
     * 
     * @returns {Array} - Array of the labels of columns in query.Page object.
     */
    const getColumnLabels = (columns) => {
        let labels = [];

        for (var i = 0; i < columns.length; i++)
            labels.push(columns[i].label);

        return labels;
    }

    /**
     * Retrieve the aliases of all columns in a query.Page object.
     * 
     * @param {Array} columns - Array of column objects from a query.Page object.
     * 
     * @returns {Array} - Array of the aliases of columns in query.Page object.
     */
    const getColumnAliases = (columns) => {
        let aliases = [];

        for (var i = 0; i < columns.length; i++)
            aliases.push(columns[i].alias);

        return aliases;
    }

    /**
     * Generate a dictionary that allows looking up the name of a Transaction based on its internal ID.
     * 
     * @param {Array} - Array of Transaction record internal IDs.
     * 
     * @returns {Object} - Dictionary of Transaction names indexed by internal ID.
     */
    const getTransactionNames = (ids) => {
        // * Initialize our dictionary to store Transaction names.
        let names = {};

        // * Convert our array of Transaction internal IDs (which can have over 6,000 elements)
        // * into a paged version, so we can perform incremental queries.
        let pagedIds = paginate(ids, 500);

        // * For each page of internal IDs, perform a query for the Transaction names and update our dictionary.
        for (var i = 0; i < pagedIds.length; i++)
            names = updateTransactionNames(pagedIds[i], names);

        return names;
    }

    /**
     * Find the names of a subset of Transactions, update a dictionary of Transaction names indexed by internal ID.
     * 
     * @param {Array} ids - Array of internal IDs of Transaction records.
     * @param {Object} names - Dictionary of Transaction names indexed by internal ID.
     */
    const updateTransactionNames = (ids, names) => {
        // * Convert our array of internal IDs into a string we can use in our SuiteQL condition.
        let idString = '(' + ids.join(',') + ')';

        let sqlString = "SELECT " +
            "transaction.trandisplayname AS name, " +
            "transaction.id " +
        "FROM " +
            "transaction " +
        "WHERE " +
            "transaction.id IN " + idString;

        let resultSet = query.runSuiteQL({query: sqlString}).asMappedResults();

        // * For each result, map the internal ID of a Transaction with its display name.
        for (var i = 0; i < resultSet.length; i++)
            names[resultSet[i].id] = resultSet[i].name;

        return names;
    }

    /**
     * Generate a dictionary that allows looking up the name of an Item based on its internal ID.
     * 
     * @param {Array} - Array of Item record internal IDs.
     * 
     * @returns {Object} - Dictionary of Item names indexed by internal ID.
     */
    const getItemNames = (ids) => {
        // * Initialize our dictionary to store Item names.
        let names = {};

        // * Convert our array of Item internal IDs (which can have over 6,000 elements)
        // * into a paged version, so we can perform incremental queries.
        let pagedIds = paginate(ids, 500);

        // * For each page of internal IDs, perform a query for the Item names and update our dictionary.
        for (var i = 0; i < pagedIds.length; i++)
            names = updateItemNames(pagedIds[i], names);

        return names;
    }
    
    /**
     * Find the names of a subset of Items, update a dictionary of Item names indexed by internal ID.
     * 
     * @param {Array} ids - Array of internal IDs of Item records.
     * @param {Object} names - Dictionary of Item names indexed by internal ID.
     */
    const updateItemNames = (ids, names) => {
        // * Convert our array of internal IDs into a string we can use in our SuiteQL condition.
        let idString = '(' + ids.join(',') + ')';

        let sqlString = "SELECT " +
            "item.itemid AS name, " +
            "item.id " +
        "FROM " +
            "item " +
        "WHERE " +
            "item.id IN " + idString;

        let resultSet = query.runSuiteQL({query: sqlString}).asMappedResults();

        // * For each result, map the internal ID of an Item with its display name.
        for (var i = 0; i < resultSet.length; i++)
            names[resultSet[i].id] = resultSet[i].name;

        return names;
    }

    /**
     * Generates a paged version of an array.
     * 
     * @param {Array} array - Array that needs to be paginated.
     * @param {Integer} size - Size of pages in our new paged array.
     * 
     * @returns {Array} - Array of arrays, where each child array (except maybe the last) has a fixed length.
     */
    const paginate = (array, size) => {
        return array.reduce((pagedArray, value, index) => {
            let pageIndex = Math.floor(index / size);
            let page = pagedArray[pageIndex] || (pagedArray[pageIndex] = []);
            page.push(value);

            return pagedArray;
        }, [])
    }

    /**
     * Generate a dictionary that allows looking up the name of an Account based on its internal ID.
     * 
     * @returns {Object} - Dictionary of Account names indexed by internal ID.
     */
    const getAccountNames = () => {
        let sqlString = "SELECT " +
            "account.accountsearchdisplayname AS name, " +
            "account.id " +
        "FROM " +
            "account";

        let resultSet = query.runSuiteQL({query: sqlString}).asMappedResults();

        let names = {};

        // * For each result, map the internal ID of an Account with its display name.
        for (var i = 0; i < resultSet.length; i++)
            names[resultSet[i].id] = resultSet[i].name;

        return names;
    }

    /**
     * Generate a dictionary that allows looking up the name of a Term based on its internal ID.
     * 
     * @returns {Object} - Dictionary of Term names, indexed by internal ID.
     */
    const getTermNames = () => {
        let sqlString = "SELECT " +
            "term.name, " +
            "term.id " +
        "FROM " +
            "term";

        let resultSet = query.runSuiteQL({query: sqlString}).asMappedResults();

        let names = {};

        // * For each result, map the internal ID of a Term with its name.
        for (var i = 0; i < resultSet.length; i++)
            names[resultSet[i].id] = resultSet[i].name;

        return names;
    }

    /**
     * Generate a dictionary that allows looking up the name of an Item Type based on its internal ID.
     * 
     * @returns {Object} - Dictionary of Item Type names, indexed by internal ID.
     */
    const getItemTypeNames = () => {
        let sqlString = "SELECT " +
            "itemtype.name, " +
            "itemtype.id " +
        "FROM " +
            "itemtype";

        let resultSet = query.runSuiteQL({query: sqlString}).asMappedResults();

        let names = {};

        // * For each result, map the internal ID of an Item Type with its name.
        for (var i = 0; i < resultSet.length; i++)
            names[resultSet[i].id] = resultSet[i].name;

        return names;
    }

    /**
     * Generate a dictionary that allows looking up the name of a UOM based on its internal ID.
     * 
     * @returns {Object} - Dictionary of UOM names, indexed by internal ID.
     */
    const getUOMNames = () => {
        let sqlString = "SELECT " +
            "unitstypeuom.unitname AS name, " +
            "unitstypeuom.internalid AS id " +
        "FROM " +
            "unitstypeuom";

        let resultSet = query.runSuiteQL({query: sqlString}).asMappedResults();

        let names = {};

        // * For each result, map the internal ID of a UOM with its name.
        for (var i = 0; i < resultSet.length; i++)
            names[resultSet[i].id] = resultSet[i].name;

        return names;
    }

    /**
     * For a given string of file content, create a CSV File in the File Cabinet.
     * 
     * @param {String} contents - String representing the contents of a CSV file.
     * @param {String} filename - String representing the name of a CSV file to create.
     * 
     * @returns {Integer} - Internal ID of the created CSV file.
     */
    const createCSVFile = (contents, filename) => {
        // * Create a file and include the current date and time as a string to make the filename unique.
        let csvFile = file.create({
            name: filename,
            fileType: file.Type.CSV,
            contents: contents,
            description: 'Exported dataset',
            folder: CSV_EXPORT_FOLDER
        });

        const fileId = csvFile.save();

        return fileId;
    }

    /**
     * Get a string representation of the current date and time.
     * 
     * @returns {String} - String representing the current date and time in the format of MM/DD/YYYY HH:MM:SS
     */
    const getDateAndTimeString = () => {
        var d = new Date(); 
        return (d.getMonth() + 1) + "/" + d.getDate() + "/" + d.getFullYear() + " " + d.getHours() + ":" + d.getMinutes() + ":"  + d.getSeconds();
    }

    return {getInputData, map, reduce, summarize}
});