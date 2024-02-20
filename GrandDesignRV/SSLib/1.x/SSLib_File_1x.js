/**
 * File library for Solution Source accounts.
 * 
 * Version    Date            Author           Remarks
 * 1.00       23 Sep 2020     Jeffrey Bajit
 *
 */

var SSFileTypes = {
		PDF: '.pdf',
		EXCEL: '.xls'
};

/**
 * Returns a PDF file object from the HTML passed in.
 */
function GetPDFFileObjectFromHTML(html) {
    var xml = "<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">\n<pdf>" + html + "</pdf>";
    var file = nlapiXMLToPDF(xml);
    return file;
}

/**
 * Sets the return type and return contents of the context object to be a File object with the type specified.
 * Will use the fileContents to fill the file and the fileType needs to be one of the types in the enum at the top of this file.
 */
function PrintFileInSuitelet(request, response, fileName, fileContents, fileType) {
	var fileToDownload = null;
	if (fileType == SSFileTypes.PDF) {
		fileToDownload = getPDFFileObjectFromHTML(fileContents); 
		response.setContentType('PDF', fileName);
	}
	else if (fileType == SSFileTypes.EXCEL) {
	    fileToDownload = nlapiCreateFile(fileName, 'EXCEL', nlapiEncrypt(fileContents, 'base64'));
	    response.setContentType('EXCEL', fileName);
	}
	
	response.write(fileToDownload.getValue());
}