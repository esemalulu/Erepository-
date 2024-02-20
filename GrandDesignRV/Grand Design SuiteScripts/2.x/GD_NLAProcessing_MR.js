/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/query', 'N/record', 'N/runtime', './GD_Common.js'],
    /**
 * @param{query} query
 * @param{record} record
 * @param{runtime} runtime
 * @param{GD_Common} GD_Common
 */
    (query, record, runtime, GD_Common) => {
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
            let currentScript = runtime.getCurrentScript();
            let itemObj = {
                id: currentScript.getParameter({name: 'custscriptgd_nla_itemid'}),
                custitemgd_nlareplacementitem: currentScript.getParameter({name: 'custscriptgd_nla_replacement'}),
                itemtype: currentScript.getParameter({name: 'custscriptgd_nla_itemtype'}),
                storedetaileddescription: currentScript.getParameter({name: 'custscriptgd_nla_description'})
            };

            try {
                nlaReplacement = getNLAReplacementItem(itemObj);
            } catch (err) {
                log.error('error finding NLA Replacement', err);
                return;
            }

            itemObj.custitemgd_nlareplacementitem = nlaReplacement.id;

            let suiteQLString = "SELECT"
            + " id,"
            + " '" + nlaReplacement.id + "' AS custitemgd_nlareplacementitem,"
            + " itemtype,"
            + " storedetaileddescription"
            + " FROM item"
            + " WHERE"
            + " isonline = 'T'"
            + " AND isinactive = 'F'"
            + " AND custitemgd_isnla = 'T'"
            + " AND custitemgd_nlareplacementitem = " + itemObj.id;
            let items = [itemObj];
            query.runSuiteQLPaged({query: suiteQLString, pageSize: 1000}).iterator().each(function (pagedData) {
                let page = pagedData.value;
                if (page.data) {
                    items = items.concat(page.data.asMappedResults());
                }
                return true;
            });
            return items;
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
            let item = JSON.parse(mapContext.value);
            
            let domain = GD_Common.getSCDomain();
            let nlaReplacementURL = domain + '/product/' + item.custitemgd_nlareplacementitem;
            let updatedDescription = updateDescription(item.storedetaileddescription, nlaReplacementURL);

            let currentDate = new Date();
            let dateString = (currentDate.getMonth() + 1) + '/' + currentDate.getDate() + '/' + currentDate.getFullYear();
            try {
                record.submitFields({
                    type: GD_Common.convertItemType(item.itemtype),
                    id: item.id,
                    values: {
                        'custitemgd_nlareplacementitem': item.custitemgd_nlareplacementitem,
                        'storedetaileddescription': updatedDescription,
                        'custitemgd_nlalastupdated': dateString
                    }
                });
            } catch (err) {
                log.error('error submitting fields', err);
            }
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
         * Recursive function to find the NLA Replacement Item at the end of the replacement list.
         * 
         * @param {Object} item - contains the item id, the current replacement id, and the type of the current item.
         * @returns {string} the item id of the replacement item.
         */
        const getNLAReplacementItem = (item) => {
            if (item.custitemgd_nlareplacementitem) {
                let fields = ['id', 'custitemgd_nlareplacementitem', 'itemtype'];
                let replacement = GD_Common.queryLookupFields('item', item.custitemgd_nlareplacementitem, fields);
                if (replacement.custitemgd_nlareplacementitem) {
                    try {
                        return getNLAReplacementItem(replacement);
                    } catch (err) {
                        log.error('error recurring', err);
                        return replacement;
                    }
                } else {
                    return replacement;
                }
            }
            return item;
        }

        const updateDescription = (description, nlaReplacementURL) => {
            nlaReplacementURL = '<a href="' + nlaReplacementURL + '">Replacement Item</a>';
            let replacementDescription = '';
            if (!description || !description.includes('<!-- Replacement Message Start -->')) {
                replacementDescription = '<!-- Replacement Message Start --><b>'
                + 'This item is no longer available. Please see its '
                + '<!-- Replacement URL Start -->' + nlaReplacementURL
                + '<!-- Replacement URL End --></b><br /><br /><!-- Replacement Message End -->';
                if (description) {
                    replacementDescription += description;
                }
            } else {
                let regex = /(?<=<!-- Replacement URL Start -->)(.*)(?=<!-- Replacement URL End -->)/;
                replacementDescription = description.replace(regex, nlaReplacementURL);
            }
            return replacementDescription;
        }

        return {
            getInputData,
            map,
            //reduce,
            //summarize
        }

    });
