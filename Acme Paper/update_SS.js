var REC_TRANSACTION = 'transaction'; 
var FLD_CUSTBODY_ACC_ODOI_ROUTE_NO = 'custbody_acc_odoi_route_no'; 
var FLD_CUSTBODY_APS_STOP = 'custbody_aps_stop'; 
var FLD_CUSTBODY_DROPSHIP_ORDER = 'custbody_dropship_order'; 
  
function runScript(type) 
{ 
    var aColSearch = []; 
    var aFltSearch = []; 
    var aReturn = []; 
    var aResult; 
  
    aColSearch.push(new nlobjSearchColumn('type').setSort('ASC')); 
    aColSearch.push(new nlobjSearchColumn('trandate')); 
    aColSearch.push(new nlobjSearchColumn('startdate')); 
    aColSearch.push(new nlobjSearchColumn('tranid').setSort('DESC')); 
    aColSearch.push(new nlobjSearchColumn('mainname')); 
    aColSearch.push(new nlobjSearchColumn('total')); 
    aColSearch.push(new nlobjSearchColumn('memomain')); 
    aColSearch.push(new nlobjSearchColumn('statusref')); 
    aColSearch.push(new nlobjSearchColumn(FLD_CUSTBODY_ACC_ODOI_ROUTE_NO)); 
    aColSearch.push(new nlobjSearchColumn(FLD_CUSTBODY_APS_STOP)); 
    aColSearch.push(new nlobjSearchColumn('location')); 
    aColSearch.push(new nlobjSearchColumn('startdate')); 
    aColSearch.push(new nlobjSearchColumn('shipdate')); 
  
    aFltSearch.push(new nlobjSearchFilter('type','null','anyof',['SalesOrd'])); 
    aFltSearch.push(new nlobjSearchFilter('mainline','null','is','T')); 
    aFltSearch.push(new nlobjSearchFilter('status','null','anyof',['SalesOrd:B','SalesOrd:D'])); 
    aFltSearch.push(new nlobjSearchFilter('formulanumeric','null','equalto','1').setFormula('case when {shipmethod} = \'OUR TRUCK\' then 1 else 0 end')); 
    aFltSearch.push(new nlobjSearchFilter(FLD_CUSTBODY_ACC_ODOI_ROUTE_NO,'null','isempty')); 
    aFltSearch.push(new nlobjSearchFilter(FLD_CUSTBODY_DROPSHIP_ORDER,'null','is','F')); 
    aFltSearch.push(new nlobjSearchFilter('location','null','anyof',['@ALL@'])); 
    aFltSearch.push(new nlobjSearchFilter('mainname','null','anyof',['@ALL@'])); 
    aFltSearch.push(new nlobjSearchFilter('trandate','null','onorafter','08/03/2021')); 
 
    aResult = nlapiSearchRecord(REC_TRANSACTION, null, aFltSearch, aColSearch); 
 
 	if(typeof aResult !== 'undefined' && aResult) {
    	aResult.forEach(function(oItem) { 
            if(oItem.getValue('startdate') != '08/06/2021' && oItem.getValue('startdate') != '08/06/2021') {
                aReturn.push({ 
                    type: oItem.getValue('type'), 
                    date: oItem.getValue('trandate'), 
                    delivery_date: oItem.getValue('startdate'), 
                    document_number: oItem.getValue('tranid'), 
                    customer: oItem.getValue('mainname'), 
                    amount_transaction_total: oItem.getValue('total'), 
                    memo: oItem.getValue('memomain'), 
                    status: oItem.getValue('statusref'), 
                    omnitracs_route_no: oItem.getValue(FLD_CUSTBODY_ACC_ODOI_ROUTE_NO), 
                    stop: oItem.getValue(FLD_CUSTBODY_APS_STOP), 
                    warehouse: oItem.getValue('location'), 
                }); 
                try {
                    /*
                    var recSO = nlapiLoadRecord('salesorder',oItem.getId());
                    recSO.setFieldValue('startdate','08/06/2021');
                    recSO.setFieldValue('shipdate','08/06/2021');
                    nlapiSubmitRecord(recSO,true,true);
                    */
                    nlapiSubmitField('salesorder',oItem.getId(),['startdate','shipdate'],['08/06/2021','08/06/2021']);
                    nlapiLogExecution('DEBUG','SUCCESS: '+oItem.getId(),'Done');
                    //console.log(oItem.getId());
                } catch (e) {
                    nlapiLogExecution('DEBUG','ERROR: '+oItem.getId(),e.message);
                    //console.log('ERROR: '+oItem.getId()+' - '+e.message);
                }
            }
    	}); 
    }
    return aReturn; 
} 