/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
 

function pdfAfterSubmit(type)
{
		
	if (nlapiGetContext().getExecutionContext()=='userinterface') 
	{	
	
		/**
		 * JS: 
		 * - If variables are to be accessed through out the sections of the code, declare it OUTside
		 *   Below three variables are local to if statement. JavaScript will allow this but this is bad practice
		 * 
		 * - USE Try/Catch especialy in User Event. When you catch the error, make sure notify people and log it
		 * 
		 * - Brain stormt the entire process of script. Does it need to fire for xedit? 
		 *   Does it have to be done in After Submit? Ask that question
		 *   
		 * - Loading record tht was JUST saved is bad practice. Use nlapiGetNewRecord() OR nlapiGetFieldValue()
		 * 	 consider using nlapiGetNewRecord()
		 * 
		 * - Tabbing 
		 *  
		 * - NEVER EVER assume search result has RESULT
		 *  
		 * - ALWAYS use Utility File
		 */

		
		if (type == 'create' || type == 'edit' )
		{	
			var booking = nlapiLoadRecord(nlapiGetRecordType(),nlapiGetRecordId());
			var BookingId = nlapiGetRecordId();	
			var mcCategory = nlapiGetFieldValue('custentity_bo_materialschecklist');
		}	
					
		if (type == 'create' )
		{
						
				try 
				{			
						if(mcCategory)
						{
							pdfCreation(booking,mcCategory);					
						}
				
				} 
				catch (e) 
				{
						 log('debug','Error Creating PDF File: Error' +getErrText(e));	
				}
			   		
		}	
		
		
		if (type == 'edit' )
		{
			
				var file_exists = true;
			
				if(mcCategory)
				{
										
					try 
					{
						var file = nlapiLoadFile('Materials Checklist/Booking:'+BookingId+'_Checklist.pdf');
						
						if (file)
						{					
							
							var fileID = file.getId();
							nlapiDeleteFile(fileID);		
							pdfCreation(booking,mcCategory);	
							
						}
						else if(!file)
						{		
							pdfCreation(booking,mcCategory);
						}
										
					} 
					catch (e) 
					{						
		                log('debug','Error Loading File: Error' +getErrText(e));				
						if (e.getCode()=="RCRD_DSNT_EXIST")
						{
						file_exists = false;
						}
					}
						
				}
		 
		} 	
		

	}


}




/**
 * 
 * @param booking
 * @param mcCategory
 */
function pdfCreation(booking,mcCategory)
{
	
	//If Booking(Job Type) is 	Face to face(11) or License(12) and the "Ship Date" under the  is Blank	
if( (nlapiGetFieldValue('jobtype') == 11 || nlapiGetFieldValue('jobtype') == 12) && 
	nlapiGetFieldValue('custentity_bo_packshippingdate') == '')
{
				
		var procmsg = '';
		var CONST_PDF_FOLDERID='773116';
		//Grab the customer ID from parent calling page
		var BookingId = nlapiGetRecordId();
		//Grab the record type from parent calling page
		var RecordType = nlapiGetRecordType();	
		var pdfTemplateFileId = '1132425';
		var pdfXml = nlapiLoadFile(pdfTemplateFileId).getValue();
                              				
		//Search the Materials Checklist record based on the field value under the Packs subtab
		var arrSearchFilters = [new nlobjSearchFilter('custrecord_mc_category', null, 'anyof', mcCategory)];				
		var arrSearchColumns = [new nlobjSearchColumn('custrecord_mc_material'),
		                        new nlobjSearchColumn('custrecord_mc_materialname'), 
		                        new nlobjSearchColumn('custrecord_mc_quantity'),
		                        new nlobjSearchColumn('custrecord_mc_isprintable')];    

		var msr = nlapiSearchRecord ('customrecord_materialschecklist', null, arrSearchFilters, arrSearchColumns );

		var allCols = msr[0].getAllColumns();
		var materialList = '';


				//Loop through each result and add in the Body
				for (var r=0; r < msr.length; r++) 
				{
						
							var eachRowValue = '';
						//Loop through each columns and add the value
						for (var h=0; h < allCols.length; h++) 
						{
	
								
							var rowValue = msr[r].getText(allCols[h]);
								
							if (!rowValue) 
							{
							rowValue = msr[r].getValue(allCols[h]);
							}
	
	
							if (rowValue == 'T')
							{
							rowValue = 'Yes';
							}else if (rowValue == 'F')
							{
							rowValue = 'No';
							}
	
	
							if (h < (allCols.length-3)) 
							{
	
							eachRowValue += '<td width = "49px" '+ 
							'style="background-color: #F1F1F1; '+
							'border-style: solid; '+
							'border-width: 0.5px; '+
							'border-color: #32EF01;">'+
							'</td>';
	
							eachRowValue += '<td>'+nlapiEscapeXML(rowValue)+'</td>';
	
							} 
							else if (h < (allCols.length-2)) 
							{
	
							eachRowValue += '<td width = "175px" '+
							'style="background-color: #F1F1F1;'+
							'border-style: solid; '+
							'border-width: 0.5px; '+
							'border-color: #32EF01;">'+
							nlapiEscapeXML(rowValue)+
							'</td>';
	
	
							} 
							else 
							{                    	                    	                    	                  
							eachRowValue += '<td width = "49px"></td>';
							eachRowValue += '<td width = "49px" align="center" '+
							'style="background-color: #F1F1F1;'+
							'border-style: solid; '+
							'border-width: 0.5px; '+
							'border-color: #32EF01;">'+
							nlapiEscapeXML(rowValue)+
							'</td>';
							}

							
						}
												
						materialList += '<tr style="padding-top: 2px; '+
						'padding-bottom: 2px;">'+
						eachRowValue+'</tr>';
	
				}
                   
				pdfXml = pdfXml.replace('#ITEMLIST#',materialList );                    
				var renderer = nlapiCreateTemplateRenderer();                    
				renderer.setTemplate(pdfXml);                    
				renderer.addRecord('job', booking);                                                     
				var renderPDF = renderer.renderToString();
															
				try 
				{
					//log('debug','pdfXml', pdfXml);
					//Generate PDF					
			        var BookingPdfFile = nlapiXMLToPDF(renderPDF);
                    var BookingPdfFileName = 'Booking:'+BookingId+'_Checklist.pdf';
			        BookingPdfFile.setFolder(CONST_PDF_FOLDERID);
			        BookingPdfFile.setName(BookingPdfFileName);
						
			
                    var PDFListFileId = nlapiSubmitFile(BookingPdfFile);
									
			        //Need to attach this file to the customer record.
			        nlapiAttachRecord('file', PDFListFileId, RecordType, BookingId);
										
				    procmsg = BookingPdfFileName+' generated successfully.';
						
				} 
				catch (e) 
				{
					log('debug','Error Generating PDF: Error' +getErrText(e));
						
				}
			
} 
	
}

