/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function quoteGenTester(req, res) {

	//Javline Quote US
	var xmltemplateid = '1380778';
	
	var tempfile = nlapiLoadFile(xmltemplateid);
	
	log('debug','xml value',tempfile.getValue());
	
	var file = nlapiXMLToPDF(tempfile.getValue());
	res.setContentType('PDF','helloworld.pdf');
	res.write( file.getValue() );   
	
}
