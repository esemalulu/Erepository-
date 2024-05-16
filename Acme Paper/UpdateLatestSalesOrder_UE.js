var FLD_LATEST_ORDER = 'custbody_so_latestord'; 

var SCRIPT_SCHED_UPDATE_LAST_ITEMS = 'customscript_updatelastpurchaseitems_ss';
var DEPLOY_SCHED_UPDATE_LAST_ITEMS = 'customdeploy_updatelastpurchaseitems_ss';
var SPARAM_SELECTED_CUSTOMER = 'custscript_selected_customer';

var REC_ACME_OFFICIAL_HOLIDAYS = 'customrecord_acme_official_holidays'; 
var FLD_AOH_HOLIDAY_DATE = 'custrecord_aoh_holiday_date'; 


/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */
function updateShipDateBeforeSubmit(type){

}

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit,
 *                      approve, cancel, reject (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF only)
 *                      dropship, specialorder, orderitems (PO only) 
 *                      paybills (vendor payments)
 * @returns {Void}
 */
function updateLatestSOAfterSubmit(type){
    var aColSearch = []; 
    var aFltSearch = []; 
    var aReturn = []; 
    var aResult; 
    var oSchedScripParam = {};
    
    if(nlapiGetFieldValue('entity')) {
        aColSearch.push(new nlobjSearchColumn('entity',null,'GROUP')); 
        aColSearch.push(new nlobjSearchColumn('internalid',null,'MAX')); 

        aFltSearch.push(new nlobjSearchFilter('mainline','null','is','T')); 
        aFltSearch.push(new nlobjSearchFilter('type','null','anyof',['SalesOrd'])); 
        aFltSearch.push(new nlobjSearchFilter('name','null','is',nlapiGetFieldValue('entity'))); 

        aResult = nlapiSearchRecord('transaction', null, aFltSearch, aColSearch); 

        if(typeof aResult !== 'undefined' && aResult) {
            aResult.forEach(function(oItem) {
                setLastSO(oItem.getValue('entity',null,'GROUP'), oItem.getValue('internalid',null,'MAX'));
            }); 
        }
        
        oSchedScripParam[SPARAM_SELECTED_CUSTOMER] = nlapiGetFieldValue('entity');
        
        nlapiScheduleScript(
            SCRIPT_SCHED_UPDATE_LAST_ITEMS,
            DEPLOY_SCHED_UPDATE_LAST_ITEMS,
            oSchedScripParam
        );
    }
    
    //set ship date
    /*
    if(type == 'create') {
        //nlapiSubmitField(nlapiGetRecordType(),nlapiGetRecordId(),'startdate',getNextBusinessDay(nlapiGetFieldValue('trandate')));
        var recSO = nlapiLoadRecord(nlapiGetRecordType(),nlapiGetRecordId());
        recSO.setFieldValue('startdate',getNextBusinessDay(nlapiGetFieldValue('trandate')));
        nlapiSubmitRecord(recSO, false, true);
    }
    */
}

function setLastSO(idCustomer, idSO) {
    var aColSearch = []; 
    var aFltSearch = []; 
    var aResult; 
    var bAlreadyMarked = false;
  
    aColSearch.push(new nlobjSearchColumn('tranid')); 
    aColSearch.push(new nlobjSearchColumn(FLD_LATEST_ORDER)); 
  
    aFltSearch.push(new nlobjSearchFilter('mainline','null','is','T')); 
    aFltSearch.push(new nlobjSearchFilter('type','null','anyof',['SalesOrd'])); 
    aFltSearch.push(new nlobjSearchFilter('name','null','is',idCustomer)); 
    aFltSearch.push(new nlobjSearchFilter(FLD_LATEST_ORDER,'null','is','T')); 
 
    aResult = nlapiSearchRecord('transaction', null, aFltSearch, aColSearch); 
 
 	if(typeof aResult !== 'undefined' && aResult) {
    	aResult.forEach(function(oItem) {
            if(oItem.getId() == idSO) {
                bAlreadyMarked = true;
            } else {
                nlapiSubmitField('salesorder',oItem.getId(),FLD_LATEST_ORDER,'F');
            }
    	}); 
    }
        
    if(bAlreadyMarked == false) {
        nlapiSubmitField('salesorder',idSO,FLD_LATEST_ORDER,'T');
    }
}

function getNextBusinessDay(sDate) {
    var dDate = nlapiStringToDate(sDate);
    var aColSearch = []; 
    var aFltSearch = []; 
    var aHolidays = []; 
    var aResult; 
    var sReturn;
  
    aColSearch.push(new nlobjSearchColumn(FLD_AOH_HOLIDAY_DATE)); 
  
    aResult = nlapiSearchRecord(REC_ACME_OFFICIAL_HOLIDAYS, null, aFltSearch, aColSearch); 
 
 	if(typeof aResult !== 'undefined' && aResult) {
    	aResult.forEach(function(oItem) {
            aHolidays.push(oItem.getValue(FLD_AOH_HOLIDAY_DATE));
    	}); 
    }
    
    do {
        dDate.setDate(dDate.getDate() + 1);
        sReturn = nlapiDateToString(dDate);
    } while(aHolidays.indexOf(sReturn) >= 0 || dDate.getDay() == 6 || dDate.getDay() == 0);
    
    return sReturn;
}