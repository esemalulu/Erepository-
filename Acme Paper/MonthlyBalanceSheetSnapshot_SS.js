/**
 * This script takes a snapshot of the balance sheet.
 * 
 */

var REC_MBS = 'customrecord_monthly_bal_sheet_snap';
var FLD_MBS_MONTH = 'custrecord_mbss_month';
var FLD_MBS_YEAR = 'custrecord_mbss_year';
var FLD_MBS_ACCOUNT = 'custrecord_mbss_account';
var FLD_MBS_AMOUNT = 'custrecord_mbss_amount';
var FLD_MBS_DATETIME = 'custrecord_mbss_datetime';

var SPARAM_SAVED_SEARCH_ID = 'custscript_mbs_saved_search_id';
var HC_HOUR_DIFF_NY_CA = 3;

/**
 *@NApiVersion 2.x
 *@NScriptType ScheduledScript
 */
define(['N/search', 'N/record', 'N/log', 'N/format', 'N/runtime'], function(search, record, log, format, runtime) {
    
    function getData() {
        var aReturn = [];
        var oSearch;
        var oTemp;
        var hasAccount = false;
        var hasFormulaCurrency = false;
        var sSSId = runtime.getCurrentScript().getParameter({
            name : SPARAM_SAVED_SEARCH_ID
        });
        
        oSearch = search.load({
            id: sSSId
        });
        
        if(oSearch && oSearch.columns && oSearch.columns.length > 0) {
            oSearch.columns.forEach(function(oColumn){
                if(oColumn.name == 'account')
                    hasAccount = true;
                if(oColumn.name == 'formulacurrency')
                    hasFormulaCurrency = true;
            });
        }
        
        if(hasAccount == false) {
            log.error({
                title: 'Saved Search ID: '+sSSId,
                details: 'No account column available in the saved search result.'
            });
            return false;
        }
        if(hasFormulaCurrency == false) {
            log.error({
                title: 'Saved Search ID: '+sSSId,
                details: 'No formulacurrency column available in the saved search result.'
            });
            return false;
        }
        
        var aPagedData = oSearch.runPaged({pageSize : 1000});
        for(var i=0; i < aPagedData.pageRanges.length; i++ ) {
            var aCurrentPage = aPagedData.fetch(i);
            aCurrentPage.data.forEach( function(oItem) {
                oTemp = {
                    account: oItem.getValue({
                        name: 'account',
                        summary: 'GROUP'
                    }),
                    amount: oItem.getValue({
                        name: 'formulacurrency',
                        summary: 'SUM'
                    })
                };
                
                aReturn.push(oTemp);
            });
        }
                                      
        return aReturn;
    }
    
    function deleteCurrentData(idMonth, sYear) 
    { 
        var oSearch;
        
        oSearch = search.create({
            type: REC_MBS,
            columns: [
                'internalid'
            ],
            filters: [{
                name: FLD_MBS_MONTH,
                operator: 'is',
                values: idMonth,
            },
            {
                name: FLD_MBS_YEAR,
                operator: 'is',
                values: sYear,
            }]
        });
        
        var aPagedData = oSearch.runPaged({pageSize : 1000});
        for(var i=0; i < aPagedData.pageRanges.length; i++ ) {
            var aCurrentPage = aPagedData.fetch(i);
            aCurrentPage.data.forEach( function(oItem) {
                record.delete({
                   type: REC_MBS,
                   id: oItem.getValue('internalid'),
                });
            });
        }
    }
    
    function createMBS(oData, idMonth, sYear) {
        var idMBS = null;
        
        try {
            var recMBS = record.create({
                type: REC_MBS,
                isDynamic: true
            });

            recMBS.setValue({fieldId: FLD_MBS_MONTH,value: idMonth});
            recMBS.setValue({fieldId: FLD_MBS_YEAR,value: sYear});
            recMBS.setValue({fieldId: FLD_MBS_ACCOUNT,value: oData.account});
            recMBS.setValue({fieldId: FLD_MBS_AMOUNT,value: oData.amount});

            idMBS = recMBS.save({            
                ignoreMandatoryFields: true  
            });
        } catch(e) {
            log.error({
                title: 'Error in creating snapshot.',
                details: e.message
            });
        }
        
        return idMBS;
    }
    
    function getCurrentDateTime() {
        var dDate = new Date();
        //return new Date(dDate.toLocaleString('en-US', {timeZone: HC_ACCOUNT_TIMEZONE}));
        return new Date(dDate.setTime(dDate.getTime() + (HC_HOUR_DIFF_NY_CA*60*60*1000)));
    }

    function execute(context) {
        var aData = getData();
        var dCurrentDateitme = getCurrentDateTime();
        var idMonth = dCurrentDateitme.getMonth()+1;
        var sYear = dCurrentDateitme.getFullYear();
        var nCount = 0;
        
        log.audit({
            title: '- Start -',
            details: 'Current Datetime: '+[dCurrentDateitme.getMonth()+1,dCurrentDateitme.getDate(),dCurrentDateitme.getFullYear()].join('/')+' '+[dCurrentDateitme.getHours(),dCurrentDateitme.getMinutes(),dCurrentDateitme.getSeconds()].join(':')
        });
        
        if(aData && aData.length > 0) {
            //delete
            deleteCurrentData(idMonth, sYear);

            //add
            aData.forEach(function(oData, nIndex){
                if(createMBS(oData, idMonth, sYear)) {
                    nCount++;
                }
            });
        }

        log.audit({
            title: '- End -',
            details: 'Snapshot Lines: '+nCount+' out of '+aData.length+'.'
        });
    }
    
    return {
        execute: execute
    };
});