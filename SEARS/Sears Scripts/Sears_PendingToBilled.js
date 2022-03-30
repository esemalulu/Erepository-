/**
 * @NApiVersion 2.x
 * @NModuleScope Public
 * @NScriptType ScheduledScript
 */

define (['N/record' , 'N/search' , 'N/runtime' , 'N/http' , './NSUtil' , 'N/error', 'N/file'] ,
    function ( record , search , runtime , http , util , error, file ) {

        var logTitle = "Pending to Billed";

        var EndPoint = {};

        EndPoint.execute = function ( context ) {
            log.audit(logTitle, "****START****");
            var scriptObj = runtime.getCurrentScript();
            var searchId = scriptObj.getParameter({name: 'custscript1'});
            log.debug(logTitle, "Search ID:"+searchId);
            var orderSearch = search.load({
                    id: searchId
            });
            var orderSearchResults = orderSearch.run();
            log.debug(logTitle, JSON.stringify(orderSearchResults));
            orderSearchResults.each(function(result) {
            try {
                var orderId = result.getValue({ name:'internalid'});
                log.debug(logTitle, "Order Id:"+orderId);
                var orderObj = record.load({type:'salesorder', id: orderId});

                var cashSaleObj = record.transform({
                    fromType : record.Type.SALES_ORDER,
                    fromId : orderId,
                    toType : record.Type.CASH_SALE,
                    isDynamic : true
                });
                var cashSaleId = cashSaleObj.save();
                log.debug(logTitle, "Created Cash Sale\'s Internal Id:"+cashSaleId);
                return true;
            }
            catch (e) {
                log.debug(logTitle, "ERROR:"+e);
                return true;
            }
            });
            log.audit(logTitle, "****FINISHED****");
            return true;
        };

        return EndPoint;
    });
