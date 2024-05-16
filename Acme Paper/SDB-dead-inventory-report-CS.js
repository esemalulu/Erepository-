/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */
define([], function ()
{

    function fieldChanged(context)
    {
        try{
            const fieldId = context.fieldId;
    
            // Sales functionality
            if (fieldId == "custpage_sales_date_from")
            {
                var salesDate = context.currentRecord.getValue("custpage_sales_date_from");
                console.log('info',`${salesDate} ${getFormattedDate(salesDate)}`)
                if (!salesDate) salesDate = "none";
                else salesDate = getFormattedDate(salesDate);
                const paramName = "salesDateFrom";
                const paramValue = salesDate;
                addParamToUrl([{paramName,paramValue}]);
            }
    
            if (fieldId == "custpage_sales_date_to")
            {
                var salesDateTo = context.currentRecord.getValue("custpage_sales_date_to");
                if (!salesDateTo) salesDateTo = new Date();
                const paramName = "salesDateTo";
                const paramValue = getFormattedDate(salesDateTo);
                addParamToUrl([{paramName,paramValue}]);
            }
    
            if (fieldId == "custpage_transaction_type")
            {
                let transactionType = context.currentRecord.getValue("custpage_transaction_type");
                const array = [
                    {   
                        paramName: "transactionType",
                        paramValue: transactionType
                    },
                    {   
                        paramName: "page",
                        paramValue: 1
                    }
                ]
                addParamToUrl(array);
            }

            if (fieldId == "custpage_gotopage_select")
            {
                let pageNum = context.currentRecord.getValue("custpage_gotopage_select");
                if (!pageNum) pageNum = 1;
                const paramName = "page";
                const paramValue = pageNum;
                addParamToUrl([{paramName,paramValue}]);
            }

            if (fieldId == "custpage_qty_backordered")
            {
                let qtyBack = context.currentRecord.getValue("custpage_qty_backordered");
                const paramName = "qtyback";
                const paramValue = qtyBack;
                addParamToUrl([{paramName,paramValue}]);
            }


        }catch(e) {
            console.log('ERROR IN fieldChanged',e)
        }

    }

    // ------------------- AUXILIAR FUNCTIONS ---------------------------

    function addParamToUrl(params)
    {
        try{
            var url = window.location.href;
    
            var urlObject = new URL(url);
    
            var searchParams = urlObject.searchParams;
    
            
            params.forEach(obj => {
                var urlParam = searchParams.get(obj.paramName);
        
                if (urlParam) searchParams.delete(obj.paramName);
                searchParams.set(obj.paramName, obj.paramValue);
            })
    
            top.window.onbeforeunload = null;
            window.location.href = urlObject.toString();
        }catch(e) {
            console.log('ERROR IN addParamToUrl',e)
        }
    }

    function getFormattedDate(currentDate)
    {
        try{
            var year = currentDate.getFullYear();
            var month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
            var day = currentDate.getDate().toString().padStart(2, '0');
    
            var formattedDate = `${month}-${day}-${year}`;
            return formattedDate;

        }catch(e) {
            console.log('ERROR IN getFormattedDate',e)
        }
    }


    return {
        fieldChanged,
    }
});