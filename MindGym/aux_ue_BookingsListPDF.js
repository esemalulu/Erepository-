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
		//When loading the record in both Edit and Creat mode both the Record Id and the value for the field
		if (type == 'create' || type == 'edit' )
		{	
			var booking = nlapiLoadRecord(nlapiGetRecordType(),nlapiGetRecordId());
			var BookingId = nlapiGetRecordId();	
			var mcCategory = nlapiGetFieldValue('custentity_bo_materialschecklist');
			var shipDate = nlapiGetFieldValue('custentity_bo_packshippingdate');
		}	
					
		if (type == 'create' )
		{						
			try 
			{			
				if(mcCategory && shipDate =='' )
				{
				pdfCreation(booking, mcCategory);				
				}				
			} 
			catch (e) 
			{
				log('ERROR','Error Creating PDF File: Error' +getErrText(e));	
			}
			   		
		}	
		
			
		if (type == 'edit' )
		{
									
			if(mcCategory)
			{
				var file_exists = true;
	
				try 
				{
					var file = nlapiLoadFile('Materials Checklist/Booking:'+BookingId+'_Checklist.pdf');			
				} 
				catch (e) 
				{						
		            log('ERROR','Error Loading File: Error' +getErrText(e));						              
					if (e.getCode()=="RCRD_DSNT_EXIST")
					{
						file_exists = false;
					}
				}
					
				if (file_exists)
				{							
					var fileID = file.getId();
					
					nlapiDeleteFile(fileID);					
					pdfCreation(booking, mcCategory);
				
				}						
				else 
				{							
					pdfCreation(booking, mcCategory);
				}

						
			}
		 
		} 	
		

	}


}





function pdfCreation(booking,mcCategory)
{
	
		
	//If Booking(Job Type) is 	Face to face(11) or License(12) and the "Ship Date" under the  is Blank	
	if( nlapiGetFieldValue('jobtype') == 11 || nlapiGetFieldValue('jobtype') == 12)
	{
		
		//nlapiLogExecution('ERROR', 'PDF CREATION FUNCTION ENTRY OF IF STATEMENT','');
		
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
								new nlobjSearchColumn('custrecord_mc_sets'),								
								new nlobjSearchColumn('custrecord_mc_quantity'),
								new nlobjSearchColumn('custrecord_materialslist_pagecount', 'custrecord_mc_material'),								
								new nlobjSearchColumn('custrecord_mc_isprintable'), 
								new nlobjSearchColumn('custrecord_mc_material'),
								new nlobjSearchColumn('custrecord_materialslist_uspapersize', 'custrecord_mc_material'),
								new nlobjSearchColumn('custrecord_materialslist_papersize', 'custrecord_mc_material'),
								new nlobjSearchColumn('custrecord_materialslist_finishedsize', 'custrecord_mc_material'),
								new nlobjSearchColumn('custrecord_materialslist_stock', 'custrecord_mc_material'),
								new nlobjSearchColumn('custrecord_materialslist_finish', 'custrecord_mc_material'),
								new nlobjSearchColumn('custrecord_materialslist_colours', 'custrecord_mc_material'),								
								new nlobjSearchColumn('custrecord_materialslist_specialinstruct', 'custrecord_mc_material')];
																
		var msr = nlapiSearchRecord ('customrecord_materialschecklist', null, arrSearchFilters, arrSearchColumns );
		
		if(msr)
		{
			var allCols = msr[0].getAllColumns();
			
			var materialList = '';
			var secondList = '';

		
			//Loop through each result and add in the Body
			for (var r=0; r < msr.length; r++) 
			{
							
				var eachRowValue = '';
				
				//Loop through each columns and add the value
				for (var h=0; h < allCols.length-8; h++) 
				{
											
					var rowValue = msr[r].getText(allCols[h]);
									
					if (!rowValue) 
					{
					rowValue = msr[r].getValue(allCols[h]);
					}
		
		
					if (rowValue == 'T')
					{
						rowValue = 'Yes';
					}
					else if (rowValue == 'F')
					{
						rowValue = 'No';
					}
		
		
		
		
		
					if (h < (allCols.length-13)) 
					{
		
						eachRowValue += '<td width = "45px" '+ 
						'style="background-color: #F1F1F1; '+
						'border-style: solid; '+
						'border-width: 0.5px; '+
						'border-color: #32EF01;">'+
						'</td>';	
						eachRowValue += '<td>'+nlapiEscapeXML(rowValue)+'</td>';
					} 
					else if (h < (allCols.length-12)) 
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
						eachRowValue += '<td width = "25px"></td>';
						eachRowValue += '<td width = "45px" align="center" '+
						'style="background-color: #F1F1F1;'+
						'border-style: solid; '+
						'border-width: 0.5px; '+
						'border-color: #32EF01;">'+
						nlapiEscapeXML(rowValue)+
						'</td>';
					}

		
										
				}
													
	
					materialList += '<tr style="padding-top: 2px; font-size: 10px;'+
					'padding-bottom: 2px;">'+
					eachRowValue+'</tr>';

		
				var endRowValue = '';		

				for (var h=6; h < allCols.length; h++) 
				{
					var rowValue = msr[r].getText(allCols[h]);
									
					if (!rowValue) 
					{
					rowValue = msr[r].getValue(allCols[h]);
					}
					
					if (h < (allCols.length-7)) 
					{
						endRowValue += '<td width = "100px" '+
						'style="background-color: #F1F1F1;'+
						'border-style: solid; '+
						'border-width: 0.5px; '+
						'border-color: #32EF01;">'+
						nlapiEscapeXML(rowValue)+
						'</td>';	
					}
					else
					{
						endRowValue += '<td width = "2px"></td>';
						endRowValue += '<td  align="center" '+
						'style="background-color: #F1F1F1;'+
						'border-style: solid; '+
						'border-width: 0.5px; '+
						'border-color: #32EF01;">'+
						nlapiEscapeXML(rowValue)+
						'</td>';							
					}
					

	
				}
					secondList += '<tr style="padding-top: 2px; font-size: 10px; '+
					'padding-bottom: 2px;">'+
					endRowValue+'</tr>';
					
					
			}
					
					   
			pdfXml = pdfXml.replace('#ITEMLIST#',materialList ); 
			pdfXml = pdfXml.replace('#LIST#',secondList );

			
			var renderer = nlapiCreateTemplateRenderer();                    
			renderer.setTemplate(pdfXml);                    
			renderer.addRecord('job', booking);                                                     
			var renderPDF = renderer.renderToString();
																
				try 
				{

					//Generate PDF					
					var BookingPdfFile = nlapiXMLToPDF(renderPDF);
					var BookingPdfFileName = 'Booking:'+BookingId+'_Checklist.pdf';
					BookingPdfFile.setFolder(CONST_PDF_FOLDERID);
					BookingPdfFile.setName(BookingPdfFileName);
						
					var PDFListFileId = nlapiSubmitFile(BookingPdfFile);
									
					//Need to attach this file to the customer record.
					nlapiAttachRecord('file', PDFListFileId, RecordType, BookingId);
										
					//return BookingPdfFile;
							
				} 
				catch (e) 
				{
					log('ERROR','Error Generating PDF: Error' +getErrText(e));							
				}
			
		}
		else
		{
			return ;
		}	
		
				
	}
 			
}