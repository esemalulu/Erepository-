/**
 * File library for Solution Source accounts.
 * @NApiVersion 2.x
 * @NModuleScope Public
 */
define(['N/file', 'N/render', 'N/encode'],

/**
 * @param {file} file
 * @param {render} render
 * @param {encode} encode
 */
function(file, render, encode) {
    
    var SSFileTypes = {
            PDF: '.pdf',
            EXCEL: '.xls'
    };
    
    /**
     * Returns a PDF file object from the HTML passed in.
     */
    function getPDFFileObjectFromHTML(html) {
        return render.xmlToPdf({
            xmlString: "<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">\n<pdf>" + html + "</pdf>"
        });
    }

    /**
     * Sets the return type and return contents of the context object to be a File object with the type specified.
     * Will use the fileContents to fill the file and the fileType needs to be one of the types in the enum at the top of this file.
     */
    function printFileInSuitelet(context, fileName, fileContents, fileType) {
        var fileToDownload = null;
        if (fileType == SSFileTypes.PDF) {
            fileToDownload = getPDFFileObjectFromHTML(fileContents); 
            fileToDownload.name = fileName;
        }
        else if (fileType == SSFileTypes.EXCEL) {
            fileToDownload = file.create({
                name: fileName,
                contents: encode.convert({
                    string: fileContents,
                    inputEncoding: encode.Encoding.UTF_8,
                    outputEncoding: encode.Encoding.BASE_64
                }),
                fileType: file.Type.EXCEL
            });
        }
        
        context.response.writeFile({
            file: fileToDownload,
            isInline: false
        });
    }
   
    return {
        SSFileTypes: SSFileTypes,
        getPDFFileObjectFromHTML: getPDFFileObjectFromHTML,
        printFileInSuitelet: printFileInSuitelet
    };
    
});
