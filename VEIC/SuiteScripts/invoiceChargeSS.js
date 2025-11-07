define(['N/search', 'N/format'], function(search, format) {
    function onRequest(context) {
        if (context.request.method === 'GET') {
            var mySearch = search.load({
                id: 'customsearchcharge_6'            
            });            
            var searchResults = [];
            mySearch.run().each(function(result) {
                searchResults.push({
                    internalid: result.getValue({name: 'internalid'}),
                    invoicenumber: result.getValue({name: 'tranid'}),
                    chargeid: result.getValue({name: 'chargeid'}),
                    date: format.format({value: result.getValue({name: 'date'}), type: format.Type.DATE}),
                    chargetype: result.getText({name: 'chargetype'}),
                    employee: result.getText({name: 'employee'}),
                    memo: result.getValue({name: 'memo'}),
                    billdate: format.format({value: result.getValue({name: 'billdate'}), type: format.Type.DATE}),
                    item: result.getText({name: 'item'}),
                    quantity: result.getValue({name: 'quantity'}),
                    rate: result.getValue({name: 'rate'}),
                    amount: result.getValue({name: 'amount'}),
                    projecttask: result.getText({name: 'projecttask'})
                });
                return true;
            });
            context.response.write(JSON.stringify(searchResults));
        }
    }
    return {
        onRequest: onRequest
    };
});