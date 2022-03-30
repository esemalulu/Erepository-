/**
 * Copyright (c) 1998-2009 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 */

/**
* @projectDescription 	PSG Devt Utilities JavaScript library.
*
* @author	Noah Tumlos ntumlos@netsuite.com
* @author	Tony Faelga afaelga@netsuite.com
* @author	Carlo Ibarra cibarra@netsuite.com
* @author	Ems Ligon eligon@netsuite.com
* @author	Rozal Reese rreese@netsuite.com
* 
* @since	2009
* @version	2009.0 initial code
*/

var PSG;
if (!PSG) PSG = {};
if (!PSG.Library) PSG.Library = {};
if (!PSG.Library.FileUtils) PSG.Library.FileUtils = {};

PSG.Library.FileUtils.FILE   = 'file';
PSG.Library.FileUtils.FOLDER = 'folder';

/**
 * Create file cabinet Folder if not yet existing.
 * @param {Object} folderSuffix
 * @param {Object} rootFolder
 * @param {Object} outputFolder
 */
PSG.Library.FileUtils.createFileCabinetItem = function (childItemName, itemType, parentItemName) {
    var parentItem   = null;
    var parentItemId = null;
    var childItem    = null;
    var childItemId  = null;
    
    if (parentItemName) {
        parentItem = PSG.Library.FileUtils.getOrCreateFolder(parentItemName);
        parentItemId = parentItem.getId();
    }
    if (childItemName) {
        childItem = PSG.Library.FileUtils.getOrCreateFileCabinetItem(childItemName, itemType);
        if (parentItem && childItem) {
            childItem.setFieldValue('parent', parentItemId);
            childItemId = nlapiSubmitRecord(childItem);
        }
    }
	return childItemId;
}

/**
 * Search File by Name.
 * @param {Object} fileName
 */
PSG.Library.FileUtils.getFileCabinetItemId = function (fileCabinetItemName, itemType) {
    
	var filters       = [new nlobjSearchFilter('name', null, 'is', fileCabinetItemName)];
    var columns       = [new nlobjSearchColumn('internalid')];
	var searchResults = nlapiSearchRecord(itemType, null, filters, columns);

    var recId = null;
	if (searchResults) {
		recId = searchResults[0].getId();
        nlapiLogExecution('ERROR', 'getFileCabinetItem', 'recId :: ' + recId);
	}
	return recId;
}

PSG.Library.FileUtils.getFileId = function(fileName){
    return PSG.Library.FileUtils.getFileCabinetItemId(fileName, PSG.Library.FileUtils.FILE);
}

PSG.Library.FileUtils.getFolderId = function(folderName){
    return PSG.Library.FileUtils.getFileCabinetItemId(folderName, PSG.Library.FileUtils.FOLDER);
}

PSG.Library.FileUtils.getOrCreateFileCabinetItem = function (fileCabinetItemName, itemType) {
    var fileCabinetItem = PSG.Library.FileUtils.getFileCabinetItemId(fileCabinetItemName,itemType);
    if (!fileCabinetItem) {
        fileCabinetItem = nlapiCreateRecord(itemType);
            
        fileCabinetItem.setFieldValue('name', fileCabinetItemName);
        nlapiSubmitRecord(fileCabinetItem);        
    }
    return fileCabinetItem;   
}

PSG.Library.FileUtils.getOrCreateFile = function(fileName){
    return PSG.Library.FileUtils.getOrCreateFileCabinetItem(fileName, PSG.Library.FileUtils.FILE);
}

PSG.Library.FileUtils.getOrCreateFolder = function(folderName){
    return PSG.Library.FileUtils.getOrCreateFileCabinetItem(folderName, PSG.Library.FileUtils.FOLDER);
}

PSG.Library.FileUtils.createTextFile = function(parentFolderId, fileName, contentString) {
    var file = nlapiCreateFile(fileName, 'PLAINTEXT', contentString);        
    file.setFolder(parentFolderId);
    return nlapiSubmitFile(file);
}

