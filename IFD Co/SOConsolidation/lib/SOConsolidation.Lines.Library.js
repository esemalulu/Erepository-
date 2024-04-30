define([
    '../thirdparty/underscore'
], function LinesLibrary(
    _
) {
    return {
        getLines: function getLines(salesOrders) {
            var allLines = _.flatten(_.pluck(salesOrders, 'lines'), 1);
            var groupedLines = _.groupBy(allLines, function groupByLine(line) {
                return line.item + '|' +
                    (line.custcol_ifd_subitemindicator ? 'T' : 'F') + '|' +
                    (line.custcol_ifd_price_override ? 'T' : 'F') + '|' +
                    (line.price);
            });

            var finalLines = _.map(_.values(groupedLines), function (linesToConsolidate) {
                var masterSOItemLine = _.findWhere(linesToConsolidate, { isMaster: true });
                var otherLines = _.where(linesToConsolidate, { isMaster: false });
                var finalMaster = masterSOItemLine || otherLines[0];

                var newQuantity = _.reduce(linesToConsolidate, function (memo, l) {
                    return memo + parseInt(l.quantity || 0, 10);
                }, 0);

                return _.extend(
                    JSON.parse(JSON.stringify(finalMaster)),
                    {
                        isNew: !finalMaster.isMaster,
                        isUpdated: finalMaster.isMaster && finalMaster.quantity !== newQuantity,
                        quantity: newQuantity,
                        lineuniquekey: finalMaster.isMaster ? finalMaster.lineuniquekey : undefined
                    }
                );
            });

            return finalLines;
        }
    };
});
