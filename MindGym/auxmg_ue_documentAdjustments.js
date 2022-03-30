/**
 * Developed by Rehan Lakhani @ Audaxium
 */

function generateFolderStructure()
{
    var document = nlapiGetFieldValue('custrecord_cat_file');
    if(document)
    {
        var file = nlapiLoadFile(document);
        var fileURL = file.getURL();
        var fileLink = 'https://system.netsuite.com' + fileURL;
        var parentFolderID = 1091486;

        nlapiSubmitField('customrecord_courseattachment', nlapiGetRecordId(), 'custrecord_cat_url', fileLink);
        nlapiSubmitField('customrecord_courseattachment', nlapiGetRecordId(), 'custrecord_cat_name', file.getName());

        var courseID = nlapiGetFieldValue('custrecord_cat_doc');

        var sf = [ new nlobjSearchFilter('name', null, 'is', courseID.toString()) ];
        var sc = [ new nlobjSearchColumn('internalid') ];

        var resultSet = nlapiSearchRecord('folder', null, sf, sc);
        if(resultSet)
        {
            for(var i = 0; i < resultSet.length; i+=1)
            {
                var existingFolder = resultSet[i].getId();
                var folder = nlapiLoadRecord('folder', existingFolder);
                    folder.setFieldValue('parent', parentFolderID);
                nlapiSubmitRecord(folder,true,true);

                file.setFolder(existingFolder);
                file.setIsOnline(true);
                nlapiSubmitFile(file);
            }

        }
        else
        {
            var courseAttachFolder = nlapiCreateRecord('folder');
                courseAttachFolder.setFieldValue('parent', parentFolderID);
                courseAttachFolder.setFieldValue('name', courseID.toString());
            var folderID = nlapiSubmitRecord(courseAttachFolder, true, true);
            file.setIsOnline(true);
            file.setFolder(folderID);
            nlapiSubmitFile(file);
        }
    }

}
