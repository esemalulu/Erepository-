/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
define(["N/log", "N/file", "N/encode"], function (log, file, encode)
{

    function onRequest(context)
    {
        log.debug("context", context);
        if (context.request.method != "POST") return;

        try
        {
            const parameters = JSON.parse(context.request.body);

            const filesToUploadBase64 = parameters?.files || null;
            if (!filesToUploadBase64 || filesToUploadBase64.length < 1)
            {
                context.response.write(jsonResponse("Please upload file", true));
                return;
            }

            filesToUploadBase64.forEach(fileBase =>
            {
                const fileDecoded = encode.convert({
                    string: fileBase.content,
                    inputEncoding: encode.Encoding.BASE_64,
                    outputEncoding: encode.Encoding.UTF_8
                });

                const fileToSave = file.create({
                    name: fileBase?.title,
                    fileType: file.Type.PLAINTEXT,
                    contents: fileDecoded,
                    folder: 771,
                })

                fileToSave.save();
            });

            context.response.write(jsonResponse("All files have been successfully uploaded."));
        }
        catch (e)
        {
            context.response.write(jsonResponse("Something went wrong", true));
            log.error("error", e);
        }
    }

    //-------------------------------AUXILIAR FUNCTIONS-----------------------------------
    function jsonResponse(message, error = false, data = null)
    {
        return JSON.stringify({ message: message, error: error, data: data });
    }



    return {
        onRequest: onRequest
    }
});

