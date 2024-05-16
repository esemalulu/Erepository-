/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 */

define(['N/search'], function (search) {

    function _get(context) {

        try {
            var searchResults = [];
            var resultsFromSearch = search.load({
                id: 'customsearch3380'
            });

            // ------ PAGINATION ------ //
            var itemsPerPage = 1000;
            var pagedSearch = resultsFromSearch.runPaged({ pageSize: itemsPerPage });
            var pageNumber = context.page ?? 0;

            var totalResults = resultsFromSearch.runPaged().count;
            var totalPage = Math.floor(totalResults / itemsPerPage);

            if (pageNumber > totalPage) {
                return JSON.stringify({
                    type: "error",
                    message: "There are no results for the specified page (" + pageNumber + ")."
                });
            }

            for (let index = 0; index <= totalPage; index++) {
                var thisPage = totalResults > 0 ? pagedSearch.fetch({ index: Number(index) }) : { data: [] };
                thisPage.data.forEach((result) => {
                    let dataToJSon = {};
                    dataToJSon[resultsFromSearch.columns[0].label] = result.getValue('id');
                    dataToJSon[resultsFromSearch.columns[1].label] = result.getValue('custrecord_extfile_link');
                    dataToJSon[resultsFromSearch.columns[2].label] = result.getValue('custrecord_extfile_filename');
                    dataToJSon[resultsFromSearch.columns[3].label] = {
                        'Value': result.getValue('custrecord_extfile_type_custlist'),
                        'Text': result.getText('custrecord_extfile_type_custlist')
                    };
                    dataToJSon[resultsFromSearch.columns[4].label] = result.getValue('custrecord_extend_preview_image');
                    dataToJSon[resultsFromSearch.columns[5].label] = result.getValue('custrecord_extend_files_thmbnail');
                    dataToJSon[resultsFromSearch.columns[6].label] = result.getValue('custrecord_extend_files_private_url');
                    dataToJSon[resultsFromSearch.columns[7].label] = result.getValue('custrecord_extend_files_thmb_prev_fol_id');
                    dataToJSon[resultsFromSearch.columns[8].label] = {
                        'Value': result.getValue('custrecord_extfile_inventory_item_pref'),
                        'Text': result.getText('custrecord_extfile_inventory_item_pref')
                    };
                    dataToJSon[resultsFromSearch.columns[9].label] = {
                        'Value': result.getValue('custrecord_extfile_inventory_item_pref'),
                        'Text': result.getValue('custrecord_extfile_inventory_item_pref')
                    };
                    searchResults.push(dataToJSon);
                    return true;
                });
            }

            log.debug("Total Results: ", searchResults.length);
            return JSON.stringify(searchResults);

        } catch (error) {
            log.error('error: ', error);
        }
    }

    return {
        get: _get,
    }
});