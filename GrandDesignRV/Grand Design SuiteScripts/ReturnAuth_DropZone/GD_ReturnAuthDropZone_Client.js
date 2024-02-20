/**
 * Return Authorization Client-Side code for the Dealer Portal
 * 
 * SuiteScript 2.0 Client scripts are not supported in Site Builder,
 * 
 * 
 * Version    Date              Author           Remarks
 * 1.00       3 December 2020   Jeffrey Bajit
 *
 */


/**
 * 
 * @param type
 */
function GD_ReturnAuthDropZone_PageInit(type) {
    if(!GD_IsDealerLoggedIn()) return; // this script is portal only. 
    
    //Set dirty flag on the form so we don't get the "You didn't make any changes" popup when they click Save. 
    window.ischanged = true;
}

/**
 * Alerts the user if they try to save a record without operation lines or Approved Labor rate.
 * If Pre-Auth status is Approved, make sure that there is at least one approved operation line.
 * 
 * @returns {Boolean} True to continue save, false to abort save
 */
function GD_ReturnAuthDropZone_SaveRecord() {
    if(!GD_IsDealerLoggedIn()) return true; // this script is portal only. 

    nlapiSetFieldValue('custbodygd_retauthcreatedbycontact', nlapiGetContext().contact);

    return true; 
}

/**
 * Name: GD_ReturnAuthDropZone_FieldChanged
 * Description: sets the unit field if the GD Unit filter is set.
 * 
 * @returns {Boolean} True to continue save, false to abort save
 */
function GD_ReturnAuthDropZone_FieldChanged(type, name, linenum) {
    if (name == 'custbodygd_filteredportalunit') {
        var filteredUnitField = nlapiGetFieldValue('custbodygd_filteredportalunit') || '';
        if (filteredUnitField != '') {
            nlapiSetFieldValue('custbodyrvsunit', filteredUnitField);
        }
    }
}

/**
 * Uploads file attachments
 * 
 * @param files
 * @param folderName
 * @param link
 */
function CreateStringFilesArray(files, folderName, link) {
    if (files.length > 0) {
        var currentFile = files.shift();
        
        var fr = new FileReader();

        fr.onload = function(e) {
            var requestData = {
                fileName: currentFile.name,
                base64Data: e.target.result.replace(/^data:.*base64,/i, '')
            };
            
            var headers = {};
            headers['User-Agent-x'] = 'SuiteScript-Call';
            headers['Content-Type'] = 'application/json';
            
            var response123 = nlapiRequestURL(link + "&foldername=" + folderName, JSON.stringify(requestData), headers);
            
            CreateStringFilesArray(files, folderName, link);
        }
        
        fr.readAsDataURL(currentFile);
    }
}