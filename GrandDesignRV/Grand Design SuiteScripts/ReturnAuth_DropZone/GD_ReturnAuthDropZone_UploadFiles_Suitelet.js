/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/email', 'N/encode', 'N/file', 'N/record', 'N/runtime', 'N/search'],
/**
 * @param {email} email
 * @param {encode} encode
 * @param {file} file
 * @param {record} record
 * @param {runtime} runtime
 */
function(email, encode, file, record, runtime, search) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    function onRequest(context) {
        // From the file's name, determine the file.Type and whether NetSuite will
        // need to decode the file.
        var requestBody = JSON.parse(context.request.body)
        var fileInfo = FileTypeLookup(requestBody.fileName);
        var fileType = fileInfo.type;
        var decodeBase64Data = fileInfo.decodeBase64Data;
        var folderName = context.request.parameters['foldername'];
        // This is a script deployment parameter that must be set in the company general preferences.  The parent folder internal Id of the RGA must be set here for this code to work.
        var parentFolderId = runtime.getCurrentScript().getParameter({
            name: 'custscriptgd_rgadropzoneparentfolder'
        });

        var folderId = 0;
        var existingFolderSearch = GetFolderIdAndFileIds(folderName) || [];
        if (existingFolderSearch.length > 0)
            folderId = existingFolderSearch[0].id;
        
        var folder = null;
        
        if (folderId == 0) {
            folder = record.create({
                type: record.Type.FOLDER
            });
            folder.setValue('name', folderName);
            folder.setValue('parent', parentFolderId);
            folderId = folder.save();
        }

        try {
            var contents = requestBody.base64Data;
            if (decodeBase64Data)
            {
                contents = encode.convert({
                    string: contents,
                    inputEncoding: encode.Encoding.BASE_64,
                    outputEncoding: encode.Encoding.UTF_8
                });
            }

            var netSuiteFileData = {
                name: requestBody.fileName + runtime.getCurrentUser().id + ' - ' + new Date().getTime(),
                description: requestBody.fileName,
                fileType: fileType,
                contents: contents,
                encoding: file.Encoding.UTF8,
                folder: folderId
            };

            var uploadedFile = file.create(netSuiteFileData);

            var failed = false;
            var fileId = uploadedFile.save().toString();
        } catch (error) {
            failed = true;
            log.error('Failed to save file', JSON.stringify(netSuiteFileData));
            email.send({
                author: runtime.getCurrentUser().id,
                recipients: 'jeffrb@solution-source.net',
                subject: 'Failed to Upload File',
                body: netSuiteFileData ? JSON.stringify(netSuiteFileData) : JSON.stringify({
                    name: 'temp - ' + runtime.getCurrentUser().id + ' - ' + new Date().getTime(),
                    description: requestBody.fileName,
                    fileType: fileType,
                    encoding: file.Encoding.UTF8,
                    folder: tempFolder,
                    contents: contents,
                }),
            });

            context.response.write('error');
        }

        if (!failed)
            context.response.write(fileId);
    }

    function FileTypeLookup(fileName) {
        var extension = fileName.split('.').pop().toLowerCase();

        switch (extension) {
            case 'dwg': case 'dwf': case 'dxf': case 'dwt': case 'plt':
                return { type: file.Type.AUTOCAD, decodeBase64Data: false };
            case 'bmp':
                return { type: file.Type.BMPIMAGE, decodeBase64Data: false };
            case 'csv':
                return { type: file.Type.CSV, decodeBase64Data: true };
            case 'xls': case 'xlsx':
                return { type: file.Type.EXCEL, decodeBase64Data: false };
            case 'swf':
                return { type: file.Type.FLASH, decodeBase64Data: false };
            case 'gif':
                return { type: file.Type.GIFIMAGE, decodeBase64Data: false };
            case 'gz':
                return { type: file.Type.GZIP, decodeBase64Data: false };
            case 'ico': case 'icon':
                return { type: file.Type.ICON, decodeBase64Data: false };
            case 'jpg': case 'jpeg':
                return { type: file.Type.JPGIMAGE, decodeBase64Data: false };
            case 'eml': case 'msg':
                return { type: file.Type.MESSAGERFC, decodeBase64Data: false };
            case 'mp3':
                return { type: file.Type.MP3, decodeBase64Data: false };
            case 'mpg': case 'mpeg':
                return { type: file.Type.MPEGMOVIE, decodeBase64Data: false };
            case 'pdf':
                return { type: file.Type.PDF, decodeBase64Data: false };
            case 'pjpeg':
                return { type: file.Type.PJPGIMAGE, decodeBase64Data: false };
            case 'png':
                return { type: file.Type.PNGIMAGE, decodeBase64Data: false };
            case 'ps': case 'eps':
                return { type: file.Type.POSTSCRIPT, decodeBase64Data: false };
            case 'ppt': case 'pptx':
                return { type: file.Type.POWERPOINT, decodeBase64Data: false };
            case 'mpp':
                return { type: file.Type.MSPROJECT, decodeBase64Data: false };
            case 'mov':
                return { type: file.Type.QUICKTIME, decodeBase64Data: false };
            case 'sms':
                return { type: file.Type.SMS, decodeBase64Data: false };
            case 'tif': case 'tiff':
                return { type: file.Type.TIFFIMAGE, decodeBase64Data: false };
            case 'vsd': case 'vsdX':
                return { type: file.Type.VISIO, decodeBase64Data: false };
            case 'doc': case 'dot': case 'docx':
                return { type: file.Type.WORD, decodeBase64Data: false };
            case 'zip':
                return { type: file.Type.ZIP, decodeBase64Data: false };
            default:
                return { type: file.Type.PLAINTEXT, decodeBase64Data: true };
        }
    }
    
    /**
     * Runs a search to get all the file IDs in the folder.
     * 
     * @param folderName
     * @returns
     */
    function GetFolderIdAndFileIds(folderName) {
        var existingFolder = search.create({
            type: search.Type.FOLDER,
            filters: [['name', 'is', folderName]],
            columns: ['file.internalid']
        }).run().getRange({
            start: 0,
            end: 1000
        }) || [];

        if (existingFolder.length > 0)
            return existingFolder;
        else
            return [];
    }

    return {
        onRequest: onRequest
    };
    
});
