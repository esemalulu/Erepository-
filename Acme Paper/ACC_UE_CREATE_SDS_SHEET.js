function createInvoiceSDSSheet(type)
{
	try
	{
		//var type='create';
		var recId = nlapiGetRecordId(); //'40914';// '10973';67342;//
		var recType =  nlapiGetRecordType(); //'Invoice';			
		nlapiLogExecution("debug", "Type: " + type, 'recType: ' + recType+', recId: ' + recId);
		if(type=='create')
		{
			
			//Saved-SearchID=2396
			
			var searchResult = nlapiSearchRecord("invoice",null,
			[
			   ["type","anyof","CustInvc"], 
			   "AND", 
			   ["mainline","is","F"], 
			   "AND", 
			   ["shipping","is","F"], 
			   "AND", 
			   ["taxline","is","F"], 
			   "AND", 
			   ["item.custitem_printed_name","isnotempty",""], 
			   "AND", 
			   ["item.custitem_sds_fileid","isnotempty",""], 
			   "AND", 
			   ["custbody_aq_salesorder.custbody3","any",""], 
			   "AND", 
			   ["internalid","anyof",recId]
			], 
			[
			 
			   new nlobjSearchColumn("internalid"),
			   new nlobjSearchColumn("tranid"), 
			   new nlobjSearchColumn("createdfrom"), 			  
			   new nlobjSearchColumn("item").setSort(true), 
			   new nlobjSearchColumn("custitem_sds_fileid","item",null),
			   new nlobjSearchColumn("custitem_printed_name","item",null),
			   new nlobjSearchColumn("custbody3","CUSTBODY_AQ_SALESORDER",null),
			   new nlobjSearchColumn("custbody_aps_stop"),
			   new nlobjSearchColumn("customform")
			   
			]
			);
			
						
			var resultArr=[];
			
			if(!isEmpty(searchResult))
			{
				nlapiLogExecution('DEBUG', 'SDS SearchResult Count:'+searchResult.length, '');
				var prevItemId='';
				for(var i=0;i<searchResult.length;i++)
				{	
					var allCols = searchResult[i].getAllColumns();					
					var invId = searchResult[i].getValue(allCols[0]);	
					var soId = searchResult[i].getValue(allCols[2]);	
					var itemId = searchResult[i].getValue(allCols[3]);					
					var sdsFileId = searchResult[i].getValue(allCols[4]);
					var sdsName = searchResult[i].getValue(allCols[5]);
					//var isFirstInvoice= searchResult[i].getValue(allCols[6]);
					var stopNo= searchResult[i].getValue(allCols[7]);
					var custFormId = searchResult[i].getValue(allCols[8]);
					
					var isFirstInvoice = nlapiLookupField('salesorder', soId,'custbody3',false);

                    nlapiLogExecution('DEBUG', "itemId", itemId);
                    nlapiLogExecution('DEBUG', "prevItemId", prevItemId);
                    nlapiLogExecution('DEBUG', "isFirstInvoice", isFirstInvoice);
					
					if(itemId != prevItemId)
					{
						if(isFirstInvoice=='T')		//only allow for first Invoice w.r.t SalesOrderl  || 'F'
						{
							resultArr.push({										    
								invId:invId,
								soId: soId, 
								itemId: itemId,
								sdsFileId:sdsFileId,
								sdsName:sdsName,
								isFirstInvoice: isFirstInvoice,
								stopNo:	stopNo,
								custFormId:custFormId
								});
						}
					}
					
					prevItemId = itemId;
												   
				}				
				
			}
			
			var soId='', invId='', custFormId='';
			
			if(!isEmpty(resultArr))
			{
				soId = resultArr[0].soId;
				invId = resultArr[0].invId;
				custFormId= resultArr[0].custFormId;
				
				var isFolderExist = false;
				
				var folderId = '', folderName = '', parentFolderId='3179'; 
				
				var folderName = 'SDS_SHEET_'+getDateFormat();// Set folder naming format datewise
				    //nlapiLogExecution('DEBUG', 'folderName:'+folderName, '');
					
				var folderSearch = nlapiSearchRecord("folder",null,
				[
				   ["name","is",folderName]
				], 
				[
				   new nlobjSearchColumn("name").setSort(true), 
				   new nlobjSearchColumn("foldersize"), 
				   new nlobjSearchColumn("lastmodifieddate"), 
				   new nlobjSearchColumn("parent"), 
				   new nlobjSearchColumn("numfiles")
				]
				);
				
				if(!isEmpty(folderSearch))
				{
					 isFolderExist = true;
					 folderId = folderSearch[0].id;
					 folderName = folderSearch[0].getValue('name'); 
					 //nlapiLogExecution('DEBUG', 'existing folderId:'+folderId+', folderName:'+folderName, '');
				}
				else
				{
					//create a new folder					
					isFolderExist = false;
					var newFolder = nlapiCreateRecord('folder');
					if(newFolder)
					{  						
						newFolder.setFieldValue('parent', parentFolderId);    //  create parent level folder
						newFolder.setFieldValue('name', folderName);
						var folderId = nlapiSubmitRecord(newFolder,true);
						//nlapiLogExecution('DEBUG', 'new folder created', 'new folder ID: ' + folderId+', folderName: '+folderName);
					}
					
				}
				
				if(!isEmpty(folderId))
				{
										
					var xml = "<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">\n";
					xml += "<pdfset>";
					
					xml += "<pdf>";
					xml +=  getPrintPreview(invId, custFormId); //Get Invoice PDF Template
					xml += "</pdf>";
					
					var stopNo='';
					
					for(var k=0; k<resultArr.length; k++)
					{
						var invId = resultArr[k].invId;
						var sdsFileId = resultArr[k].sdsFileId;
						var itemId = resultArr[k].itemId;
						var stopNo = resultArr[k].stopNo; //'01';
						
						nlapiLogExecution('DEBUG', 'itemId:'+ itemId+', sdsFileId:'+sdsFileId, 'stopNo:'+stopNo);
						
						var fileURL = nlapiLoadFile(sdsFileId).getURL();
						var pdf_fileURL = nlapiEscapeXML(fileURL);
						xml += "<pdf src='"+ pdf_fileURL +"'/>";										
						
					}
					
					xml += "</pdfset>";	
					
					//stopNo ='01';// for testing
					
					if(!isEmpty(stopNo))
					{
						//Stop#_Inv#_ddmmyy.pdf
						var filePDF = nlapiXMLToPDF(xml);		
						var sdsFileName = stopNo+'_Inv#_'+invId+'.pdf';							
						filePDF.setName(sdsFileName);
						filePDF.setFolder(folderId);
						filePDF.setEncoding('UTF-8');	
						filePDF.setIsOnline(true);	//Set Available without login to true			
						var fileId = nlapiSubmitFile(filePDF);
						nlapiLogExecution('DEBUG', 'SDS PDF file created successfully', 'FileId:' + fileId+', subFolderID:'+folderId+' of parentFolderId:'+parentFolderId);
					}
				}
			}
			else
			{
				nlapiLogExecution("DEBUG", "Invoice Id:"+recId+" doesn't have any SDS Sheet!","");
			}
			
			//nlapiLogExecution('DEBUG', 'Folder Details!', ' isFolderExist:'+isFolderExist+', folderId: '+folderId+', folderName:'+folderName);
			
		}
	}
	catch(ex)
	{
		nlapiLogExecution('debug','Error On Page',ex.message);
	}
	
}

function getPrintPreview(invId, custFormId)
{
	try
	{
		var recId = invId;//'10973';			
		var formId = custFormId;//'150';	
		var htmlStr ="";	
		var mode='HTML'; //PDF ,HTML
		var htmlbody = nlapiPrintRecord('TRANSACTION', recId, mode, {formnumber : formId}); //get html file of transaction record as in-line 
		var htmlbody = htmlbody.getValue();
		//nlapiLogExecution("debug", "SO Preview Page1 ", htmlbody);
		htmlStr = htmlbody.replace('<?xml version="1.0"?><!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">','');
		htmlStr = htmlStr.replace('<pdfset>','');
		htmlStr = htmlStr.replace('</pdfset>','');
		//nlapiLogExecution("debug", "SO Preview Page2 ", htmlStr);
		return htmlStr;
	}
	catch(ex)
	{
		nlapiLogExecution('ERROR','Error raised in getPrintPreview',  ex);
	}
}


/**
*Define methods to check empty object
*@param obj
*@return boolean 			
*/

 function isEmpty(stValue) 
 {
	if ((stValue == '') || (stValue == null) || (stValue == undefined)) {
		return true;
	}
	else {
		if (stValue instanceof String) {
			if ((stValue == '')) {
				return true;
			}
		}
		else if (stValue instanceof Array) {
			if (stValue.length == 0) {
				return true;
			}
		}
		return false;
	}
 }
 
 /**		
 *Mehod: Used to get Today's Date as per required date format     
 *@param (Object) null
 *@return string date
 */	
function getDateFormat() 
{
	var dd='', mm='', yyyy='';
	var date = new Date();
	//date.setDate(date.getDate()-0); //To set day before pls substract by 1
	
	dd = date.getDate();
	mm = parseInt(date.getMonth() + 1);
	yyyy = date.getFullYear();
	if(dd < 10) dd = '0'+ dd;
	if(mm < 10) mm = '0'+ mm;		
	var cpDate =  mm +''+ dd+''+ yyyy ; //MMDDYYYY format
	return cpDate;
}