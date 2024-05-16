
var SPARAM_FOLDER = 'custscript_scan_doc_folder';
var REC_SCANNED_DOC = 'customrecord_scanned_document';
var FLD_SD_RECORD_TYPE = 'custrecord_sd_record_type';
var FLD_SD_RECORD_NUM = 'custrecord_sd_record_number';
var FLD_SD_RECORD_FILE_ID = 'custrecord_sd_file_id';
/**
 * data - passed in object
 * switch - get file extension if there is one
 * nlapiCreateFile - create file in File Cabinet 
 * nlapiAttachRecord - attach file to record
 */

function storeAttachFile(data)
{
    var sRecordType = data.recordType
    var sRecordNumber = data.recordNumber;
    var idFolder = nlapiGetContext().getSetting('SCRIPT', SPARAM_FOLDER);
    var recScannedDoc;

    if(sRecordNumber && sRecordType == 'invoice')
    {
        try
        {
            var oFile = nlapiCreateFile(data.fileName, data.fileType, data.fileContent);
            oFile.setFolder(idFolder);
            
            var idFile = nlapiSubmitFile(oFile);
            
            recScannedDoc = nlapiCreateRecord(REC_SCANNED_DOC);
            recScannedDoc.setFieldValue(FLD_SD_RECORD_TYPE, sRecordType);
            recScannedDoc.setFieldValue(FLD_SD_RECORD_NUM, sRecordNumber);
            recScannedDoc.setFieldValue(FLD_SD_RECORD_FILE_ID, idFile);
            nlapiSubmitRecord(recScannedDoc);
            
            //nlapiAttachRecord('file', idFile, sRecordType, sRecordNumber);
            nlapiLogExecution('AUDIT', 'File Uploaded', idFile);
            return {success: true};
        }
        catch (err)
        {
            var errMessage = err;
            if(err instanceof nlobjError)
            {
                errMessage = errMessage + ' ' + err.getDetails();
            }
            nlapiLogExecution('AUDIT', 'Error', errMessage);
            return {error: errMessage};
        }
    }
}