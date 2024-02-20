/**
 * Module Description
 *
 * Version    Date              Author           Remarks
 * 1.00       7 December 2020   Jeffrey Bajit
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function scheduled(type) {
	var retAuthRecordID =
		nlapiGetContext().getSetting('SCRIPT', 'custscriptretauth_dzattach_recordid');
	var retAuthRecordType =
		nlapiGetContext().getSetting('SCRIPT', 'custscriptretauth_dzattach_recordtype');

	var retAuthRecord = nlapiLoadRecord(retAuthRecordType , retAuthRecordID);
	var folderFileSearch = GetFolderIdAndFileIds(retAuthRecord.getFieldValue('custbodygd_retauthfilefoldername')) || [];
	var folderId = folderFileSearch.length > 0 ? folderFileSearch[0].getId() : 0;

	for (var i = 0; i < folderFileSearch.length; i++) {
	    var fileId = folderFileSearch[i].getValue('internalid', 'file');

        if (nlapiGetContext().getRemainingUsage() < 50) nlapiYieldScript();
        
        var file;
        try {
            file = nlapiLoadFile(fileId);
        } catch (error) {
            nlapiLogExecution('ERROR', 'Failed to Load file fileId: ' + fileId, error);
            continue;
        }
        // The name was stored in the description to avoid files overwriting
        // eachother in the temp folder. Set the name and clear the description.
        file.setName(file.getDescription());
        file.setDescription('');
        file.setFolder(folderId);

        // Check for a naming conflict/duplicate file.
        var conflictResult = CheckForFileNameConflict(
            file.getName(), file.getFolder(), file.getSize());

        if (conflictResult) {
            // There is a file with the same name but different contents so
            // rename this file.
            RecurseToPreventNameConflict(file, file.getName());

            fileId = nlapiSubmitFile(file);
        } else {
            // There is no duplicate file, save the file like normal.
            fileId = nlapiSubmitFile(file);
        }

        nlapiAttachRecord('file', fileId, retAuthRecordType, retAuthRecordID);
	}
}

/**
 * Add ' - Copy' if the file names are the same with an existing file.
 * 
 * @param file
 * @param folderName
 * @returns
 */
function RecurseToPreventNameConflict(file, fileName) {
	fileName = fileName.split('.');
	fileName[fileName.length - 2] = fileName[fileName.length - 2] + ' - Copy';
	file.setName(fileName.join('.'));
	fileName = file.getName();
	var conflictResult = CheckForFileNameConflict(fileName, file.getFolder(), file.getSize());
	if (conflictResult == true)
		RecurseToPreventNameConflict(file, fileName);
}

/**
 * Runs a search to get all the file IDs in the folder.
 * 
 * @param folderName
 * @returns
 */
function GetFolderIdAndFileIds(folderName) {
    if (folderName != '') {
        var existingFolders = nlapiSearchRecord('folder', null,
                new nlobjSearchFilter('name', null, 'is',
                    folderName), [ new nlobjSearchColumn('internalid', 'file', null) ]) || [];

        return existingFolders;
    } else {
        return [];
    }
}

/**
 * Checks to make sure there aren't any name conflicts.
 * 
 * @param fileName
 * @param folderId
 * @param fileSize
 * @returns {Boolean}
 */
function CheckForFileNameConflict(fileName, folderId, fileSize) {
	var filters = new Array();
	filters[filters.length] = new nlobjSearchFilter('internalid', null, 'is', [folderId]);
	filters[filters.length] = new nlobjSearchFilter('name', 'file', 'is', [fileName]);

	var cols = [ 
		new nlobjSearchColumn('internalid', null, null),
		new nlobjSearchColumn('documentsize', 'file', null)
	];

	var results = nlapiSearchRecord('folder', null, filters, cols);

	// Return true if there's a naming conflict, else false
	return (results != null && results.length != 0);
}