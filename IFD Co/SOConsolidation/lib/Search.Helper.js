define([
    './Utils'
], function SearchHelper(
    Utils
) {
    var SEARCH_LINES_PAGE_SIZE = 1000;

    return {
        getAll: function getAll(searchObject, lineMapperFn) {
            var lines = [];
            var pagedData = searchObject.runPaged({
                pageSize: SEARCH_LINES_PAGE_SIZE
            });
            pagedData.pageRanges.forEach(function eachPage(r) {
                var currentPageResults = pagedData.fetch({
                    index: r.index
                });
                currentPageResults.data.forEach(function eachRow(row) {
                    lines.push(lineMapperFn(row));
                    return true;
                });
            });
            return lines;
        },
        prependFilters: function prependFilters(searchObject, newFilters) {
            var filters = searchObject.filterExpression || [];
            var finalFilters;
            if (filters.length > 0) {
                finalFilters = newFilters.concat(['AND'], searchObject.filterExpression);
            } else {
                finalFilters = newFilters;
            }
            searchObject.filterExpression = finalFilters;
        },
        getConsolidationKeyFilters: function getConsolidationKeyFilters(key) {
            var poFilter;
            var newFilters;
            if (key.otherrefnum) {
                poFilter = ['poastext', 'is', Utils.normalizeOtherRefNum(key.otherrefnum)];
            } else {
                poFilter = ['poastext', 'isempty', ''];
            }
            newFilters = [
                ['entity', 'anyof', key.entity],
                'AND',
                poFilter,
                'AND',
                ['shipdate', 'on', key.shipdate]
            ];
            return newFilters;
        }
    };
});
