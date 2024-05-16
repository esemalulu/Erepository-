/**
 * @NApiVersion 2.0
 * @NScriptType suitelet
 */
define(['N/search'], function(search) {
    function onRequest(context)
	{
        var sStartDate = (context.request.parameters['startdate']) 
							? context.request.parameters['startdate'] : null;
        var sEndDate = (context.request.parameters['enddate']) 
							? context.request.parameters['enddate'] : null;
        
		var aData = getData(sStartDate, sEndDate);

		context.response.write(JSON.stringify(aData));
	}
	
	function getData(sStartDate, sEndDate) 
	{
        var aColumns = [];
        var aFilters = [];
        var oTemp;
        var oSearch;
        var aAccounts = [];
        var aAccountIds = [];
        var aPostingPeriodIds = [];
        var oBeginning = {};
        var oMonthlyData = {};
        var oEnding = {};
        var aData = [];
        
        aColumns.push(search.createColumn({name: 'number', join: 'account', summary: search.Summary.GROUP, sort: search.Sort.ASC}));
        aColumns.push(search.createColumn({name: 'type', join: 'account', summary: search.Summary.GROUP}));
        aColumns.push(search.createColumn({name: 'account', summary: search.Summary.GROUP}));
        aColumns.push(search.createColumn({name: 'amount', summary: search.Summary.SUM}));
        aColumns.push(search.createColumn({
            name: 'formulanumeric', 
            formula: 'CASE WHEN {accountingperiod.enddate} < TO_DATE(\''+sStartDate+'\',\'MM/DD/YYYY\') THEN 0 ELSE {accountingperiod.internalid} END',
            summary: search.Summary.GROUP
        }));
          
        aFilters.push({
            name: 'internalid',
            join: 'account',
            operator: 'noneof',
            values: ['@NONE@']
        }); 
        aFilters.push({
            name: 'posting',
            operator: 'is',
            values: 'T'
        }); 
        aFilters.push({
            name: 'startdate',
            join: 'accountingperiod',
            operator: 'onorbefore',
            values: sEndDate
        });    

        oSearch = search.create({
            type: 'transaction',
            columns: aColumns,
            filters: aFilters
        });
        
        var aPagedData = oSearch.runPaged({pageSize : 1000});
        for(var i=0; i < aPagedData.pageRanges.length; i++ ) {
            var aCurrentPage = aPagedData.fetch(i);
            aCurrentPage.data.forEach( function(oItem) {
                oTemp = {
                    type: oItem.getText({name: 'type', join: 'account', summary: search.Summary.GROUP}),
                    account: oItem.getValue({name: 'account', summary: search.Summary.GROUP}),
                    account_name: oItem.getText({name: 'account', summary: search.Summary.GROUP}),
                    amount: oItem.getValue({name: 'amount', summary: search.Summary.SUM}),
                    postingperiod: parseInt(oItem.getValue({name: 'formulanumeric', summary: search.Summary.GROUP}))
                };
                
                oTemp.amount = !isNaN(parseFloat(oTemp.amount)) ? parseFloat(oTemp.amount) : 0;
                
                if(aAccountIds.indexOf(oTemp.account) == -1) {
                    aAccounts.push({
                        id: oTemp.account,
                        account_name: oTemp.account_name,
                        type: oTemp.type
                    });
                    aAccountIds.push(oTemp.account);
                }
                
                if(oTemp.postingperiod != 0 && aPostingPeriodIds.indexOf(oTemp.postingperiod) == -1) {
                    aPostingPeriodIds.push(oTemp.postingperiod);
                }
                
                aData.push(oTemp);
            });
        }
        
        oMonthlyData['beginning'] = {};
        aPostingPeriodIds.forEach(function(idPeriod){
            oMonthlyData[idPeriod] = {};
        });
        oMonthlyData['ending'] = {};
        
        aAccountIds.forEach(function(idAccount){
            oMonthlyData['beginning'][idAccount] = 0;
            oEnding[idAccount] = 0;
            aPostingPeriodIds.forEach(function(idPeriod){
                oMonthlyData[idPeriod][idAccount] = 0;
            });
            oMonthlyData['ending'][idAccount] = 0;
        });
        
        aData.forEach(function(oData){
            if(oData.postingperiod == 0) {
                oMonthlyData['beginning'][oData.account] = oData.amount;
                oMonthlyData['ending'][oData.account] = oData.amount;
            }
        });
        
        aData.forEach(function(oData){
            if(oData.postingperiod != 0) {
                oMonthlyData[oData.postingperiod][oData.account] = oData.amount;
                oMonthlyData['ending'][oData.account] += oData.amount;
            }
        });
        
        return {
            accounts: aAccounts,
            data: oMonthlyData,
        };
	} 
	
	return {
		onRequest: onRequest
	};
});