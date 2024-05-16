/**
 * @NApiVersion 2.1
 * @NScriptType restlet
*/
define(["N/file", "N/encode", "N/runtime"], function (file, encode, runtime)
{
    return {
        post: function (context)
        {
            try
            {
                const body = context;
                const folderID = body.folder;

                const filesToUploadBase64 = body?.files || null;
                log.debug("filesToUploadBase64", filesToUploadBase64);

                let failedResponse, successResponse;

                if (!filesToUploadBase64 || filesToUploadBase64.length < 1)
                {
                    failedResponse = buildResponse("Please add files to upload", true);
                    return failedResponse;
                }

                const successResData = {
                    filesUploaded: []
                }

                filesToUploadBase64.forEach(fileBase =>
                {
                    const fileDecoded = encode.convert({
                        string: fileBase.content,
                        inputEncoding: encode.Encoding.BASE_64,
                        outputEncoding: encode.Encoding.UTF_8
                    });

                    log.debug('fileDecoded', fileDecoded);

                    const fileToSave = file.create({
                        name: fileBase.name,
                        fileType: file.Type.CSV,
                        contents: fileDecoded,
                        folder: folderID,
                    })

                    const fileId = fileToSave.save();
                    log.debug(`File Saved`, `File ${fileId} has been saved into folder ${folderID}`);

                    successResData.filesUploaded.push({
                        id: fileId,
                        name: fileBase.name
                    });
                });

                successResponse = buildResponse("All files have been successfully uploaded.", false, successResData);
                return successResponse;

            }
            catch (e)
            {
                log.error('ERROR', e);
                const failedResponse = buildResponse(e.message, true);
                context.response.writePage(failedResponse);
                return failedResponse;
            }
        }
    }

    //-------------------------------AUXILIAR FUNCTIONS-----------------------------------
    function buildResponse(message, error = false, data = null)
    {
        const res = {
            code: (error ? 400 : 200),
            status: (error ? "Fail" : "Success"),
            message,
            data,
        }
        log.debug('res', res);
        return JSON.stringify(res);
    }
});
