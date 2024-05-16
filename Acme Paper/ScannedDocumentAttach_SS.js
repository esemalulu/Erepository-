
var REC_SCANNED_DOCUMENT = 'customrecord_scanned_document'; 
var FLD_SD_RECORD_TYPE = 'custrecord_sd_record_type'; 
var FLD_SD_RECORD_NUMBER = 'custrecord_sd_record_number'; 
var FLD_SD_FILE_ID = 'custrecord_sd_file_id'; 
var FLD_SD_ATTACHED = 'custrecord_sd_attached'; 

/**
* @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
* @returns {Void}
*/
function attachDocScheduled(type) {
    var aDocuments = getDocuments();
    var idTrans, sTransType;
    
    aDocuments.forEach(function(oDoc){
        try {
            if(oDoc.record_type == 'invoice')
                sTransType = 'CustInvc';
            else
                sTransType = null;

            idTrans = getTransactionId(oDoc.record_number, sTransType);
            if(idTrans) {
                nlapiAttachRecord('file', oDoc.file_id, oDoc.record_type, idTrans);
                nlapiSubmitField(REC_SCANNED_DOCUMENT, oDoc.id, FLD_SD_ATTACHED, 'T');
                nlapiLogExecution('AUDIT', 'File Attached', 'Record Num: '+oDoc.record_number+'; File Id: '+oDoc.file_id);
            }

        } catch (err) {
            var errMessage = err;
            if(err instanceof nlobjError)
            {
                errMessage = errMessage + ' ' + err.getDetails();
            }
            nlapiLogExecution('AUDIT', 'Error', 'Record Num: '+oDoc.record_number+'; File Id: '+oDoc.file_id+'; Error: '+errMessage);
        }
    });
}

  
function getDocuments() { 
    var aColSearch = []; 
    var aFltSearch = []; 
    var aReturn = []; 
    var aResult; 
  
    aColSearch.push(new nlobjSearchColumn(FLD_SD_RECORD_TYPE)); 
    aColSearch.push(new nlobjSearchColumn(FLD_SD_RECORD_NUMBER)); 
    aColSearch.push(new nlobjSearchColumn(FLD_SD_FILE_ID)); 
    aColSearch.push(new nlobjSearchColumn(FLD_SD_ATTACHED)); 
    aColSearch.push(new nlobjSearchColumn('created').setSort()); 
  
    aFltSearch.push(new nlobjSearchFilter(FLD_SD_ATTACHED,'null','is','F')); 
    aFltSearch.push(new nlobjSearchFilter(FLD_SD_FILE_ID,'null','isnotempty')); 
    aFltSearch.push(new nlobjSearchFilter(FLD_SD_RECORD_NUMBER,'null','isnotempty')); 
    aFltSearch.push(new nlobjSearchFilter(FLD_SD_RECORD_TYPE,'null','isnotempty')); 
 
    aResult = nlapiSearchRecord(REC_SCANNED_DOCUMENT, null, aFltSearch, aColSearch); 
 
 	if(typeof aResult !== 'undefined' && aResult) {
    	aResult.forEach(function(oItem) { 
        	aReturn.push({ 
                id: oItem.getId(),
            	record_type: oItem.getValue(FLD_SD_RECORD_TYPE), 
            	record_number: oItem.getValue(FLD_SD_RECORD_NUMBER), 
            	file_id: parseInt(oItem.getValue(FLD_SD_FILE_ID)), 
            	attached: oItem.getValue(FLD_SD_ATTACHED), 
            	date_created: oItem.getValue('created'), 
        	}); 
    	}); 
    }
    return aReturn; 
}

  
function getTransactionId(sTransNumber, sTransType) 
{ 
    var aColSearch = []; 
    var aFltSearch = []; 
    var sId = null; 
    var aResult; 
  
    aColSearch.push(new nlobjSearchColumn('internalid')); 
  
    if(sTransNumber) {
        aFltSearch.push(new nlobjSearchFilter('numbertext','null','is',sTransNumber)); 
        aFltSearch.push(new nlobjSearchFilter('mainline','null','is','T')); 

        if(sTransType)
            aFltSearch.push(new nlobjSearchFilter('type','null','is',sTransType)); 

        aResult = nlapiSearchRecord('transaction', null, aFltSearch, aColSearch); 

        if(typeof aResult !== 'undefined' && aResult) {
            aResult.forEach(function(oItem) { 
                sId = oItem.getId();
            }); 
        }
    }
    return sId; 
} 