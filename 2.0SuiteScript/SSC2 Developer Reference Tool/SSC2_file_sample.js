/**
 * In NetSuite Debugger
 * 	require(['N/file']
 * 
 * In Normal Execution
 * 	define(['N/file']
 * 
 * This sample script is related specifically for N/file module. Includes reference to all ENUM related to this function.
 * _file represents module required/defined and passed in as object by NetSuite
 */
require(['N/file'],

function(_file) 
{
	/**
	 * --- RELATEd ENUM ---
	 * 
	 * _file.Encoding
	 * 		UTF8
	 * 		WINDOWS_1252
	 * 		ISO_8859_1
	 * 		GB18030
	 * 		SHIFT_JIS
	 * 		MAC_ROMAN
	 * 		GB2312
	 * 		BIG5
	 * 
	 * Sample: _file.Encoding.UTF8
	 */
	
	/**
	 * _file.Type
	 * 		AUTOCAD		JSON			RTF
	 * 		BMPIMAGE	MESSAGERFC		SMS
	 * 		CSV			MP3				STYLESHEET
	 * 		EXCEL		MPEGMOVIE		TAR
	 * 		FLASH		MSPROJECT		TIFFIMAGE
	 * 		FREEMARKER	PDF				VISIO
	 * 		GIFIMAGE	PJPGIMAGE		WEBAPPPAGE
	 * 		GZIP		PLAINTEXT		WEBAPPSCRIPT
	 * 		HTMLDOC		PNGIMAGE		WORD
	 * 		ICON		POSTSCRIPT		XMLDOC
	 * 		JAVASCRIPT	POWERPOINT		XSD
	 * 		JPGIMAGE	QUICKTIME		ZIP
	 * 
	 * Sample: _file.Type.PLAINTEXT
	 */
	
	//1. Create new file
	/**
	 * Options for creating file
	 * 		name
	 * 		fileType
	 * 		contents
	 * 		folder
	 */
	
	//SuiteScript 1.0
	//nlapiCreateFile
	var newFileObj = _file.create({
		'name':'SSC2_FileText.txt',
		'fileType':_file.Type.PLAINTEXT,
		'contents':'Testing 1 2 3',
		'folder':5525
	});
	
	//Set properties that CAN be set
	/**
	 * File object Properties
	 * 		description 
	 * 		encoding
	 * 		fileType
	 * 		folder 
	 * 		id
	 * 		isInactive
	 * 		isOnline
	 * 		isText
	 * 		name
	 * 		path
	 * 		size
	 * 		url
	 */
	//description
	newFileObj.description = 'Testing Description';
	
	//isOnline
	//	- When this is set, url property will return
	newFileObj.isOnline = true;
	
	
	//2. Save the file
	var newFileId = newFileObj.save();
	
	//3. Load the file via ID, this can be done via path as well
	/**
	 * Options for loading file
	 * 		id
	 * 			-or-
	 * 		path
	 */
	var loadFileObj = _file.load({
		'id':newFileId
	});
	
	log.debug('Loaded ID', loadFileObj.id);
	
	//4. Print out the contents
	log.debug('Sample Test',loadFileObj.getContents());
	
	//5. Grab list of Properties
	log.debug('description', loadFileObj.description);
	log.debug('encoding', loadFileObj.encoding);
	log.debug('fileType', loadFileObj.fileType);
	log.debug('folder', loadFileObj.folder);
	log.debug('id', loadFileObj.id);
	log.debug('isInactive', loadFileObj.isInactive);
	log.debug('isOnline', loadFileObj.isOnline);
	log.debug('isText', loadFileObj.isText);
	log.debug('name', loadFileObj.name);
	log.debug('path', loadFileObj.path);
	log.debug('size', loadFileObj.size);
	log.debug('url', loadFileObj.url);
	
	//6. Delete the file via ID
	/**
	 * Options for deleting file
	 * 		id
	 * 
	 * NOTE: due to some being JavaScript keyword, below IDE errors will occure. 
	 */
	_file.delete({
		'id':loadFileObj.id
	});
	log.debug('Delete','file deleted');
	
	//Depending on what script you are building,
	//	below section will return specific entry functions
    return {
    	
    };
    
});
