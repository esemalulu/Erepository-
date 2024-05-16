/**
 *
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

define(["N/log", "N/search", "N/render"],
    function (log, search, render) {
        function onRequest(context) {
            try {
                var renderer = render.create();
                setSearch(renderer);
                renderer.setTemplateByScriptId("CUSTTMPL_151_5774630_994");
                context.response.writeFile(renderer.renderAsPdf(), true);
            } catch (e) {
                log.debug("ER", e);
            }
        }

        function setSearch(renderer) {
            var rs = search.load({ id: 'customsearch_sdb_orders_edits' });
            var runPageResult = rs.runPaged({
                pageSize: 1000,
            });
            var results = []
            runPageResult.pageRanges.forEach(page => {
                var pageRes = runPageResult.fetch({
                    index: page.index
                });
                pageRes.data.forEach(data => results.push(data))
            });
            log.debug("results.length", results.length)
            renderer.addSearchResults({
                templateName: 'orderEdits',
                searchResult: results
            });
        }

        return {
            onRequest: onRequest,
        };
    });