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
	var CourseId = ''; asomsaldmf	
	var course = null;
	var mcCategory = '';
	
	if (nlapiGetContext().getExecutionContext()=='userinterface') 
	{	
		
		
		if (type == 'create' || type == 'edit' )
		{	
			CourseId = nlapiGetRecordId();	
			course = nlapiLoadRecord(nlapiGetRecordType(),nlapiGetRecordId());
			mcCategory = course.getFieldValue('custrecord_course_materialschecklist');
		}	
					
		if (type == 'create' )
		{
						
				try 
				{			
						if(mcCategory)
						{
							pdfCreation(course, mcCategory);					
						}
				
				} 
				catch (e) 
				{
						 log('DEBUG','Error Creating PDF File: Error' +getErrText(e));	
						 
						 Generate Error email TO the user
						 nlapiGetUser();
						 
				}
			   		
		}	
		
		Add in error email gen to edit section as well
		if (type == 'edit' )
		{
			
				var file_exists = true;
			
				if(mcCategory)
				{
										
					try 
					{
						var file = nlapiLoadFile('Materials Checklist/Course_'+CourseId+'_Checklist.pdf');
						
						if (file)
						{					
							
							var fileID = file.getId();
							nlapiDeleteFile(fileID);		
							pdfCreation(course, mcCategory);	
							
						}
						else if(!file)
						{		
							pdfCreation(course, mcCategory);
						}
										
					} 
					catch (e) 
					{			
						logging needs to pass in proper paraemter: DOcumentation review for ELI.
						//can be debug, error, audit and so on and so on
						
		                log('debug','Error Loading File: Error ' +getErrText(e));	
					getErrText(e).indexOf(RECD...) > -1
						if (e.getCode()=="RCRD_DSNT_EXIST")
						{
						file_exists = false;
						}
					}
						
				}
		 
		} 	
		

	}


}





function pdfCreation(course, mcCategory)
{
	
	
	try 
	{	
					
		var procmsg = '';
		var CONST_PDF_FOLDERID='773116';
		//Grab the customer ID from parent calling page
		var CourseId = nlapiGetRecordId();
		//Grab the record type from parent calling page
		var RecordType = nlapiGetRecordType();	
		var pdfTemplateFileId = '1224027';
		var pdfXml = nlapiLoadFile(pdfTemplateFileId).getValue();
                              				
		//Search the Materials Checklist record based on the field value under the Packs subtab
		var arrSearchFilters = [new nlobjSearchFilter('custrecord_mc_category', null, 'anyof', mcCategory)];	//Addin field labels as comment			
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
				renderer.addRecord('customrecord_course', course);                                                     
				var renderPDF = renderer.renderToString();
															

				
			        var CoursePdfFile = nlapiXMLToPDF(renderPDF);
                    var CoursePdfFileName = 'Materials Checklist/Course_'+CourseId+'_Checklist.pdf';
                    CoursePdfFile.setFolder(CONST_PDF_FOLDERID);
                    CoursePdfFile.setName(CoursePdfFileName);
						
			
                    var PDFListFileId = nlapiSubmitFile(CoursePdfFile);
									
			        //Need to attach this file to the customer record.
			        nlapiAttachRecord('file', PDFListFileId, RecordType, CourseId);
														    
						
				} 
				catch (e) 
				{
					log('DEBUG','Error Generating PDF: Error' +getErrText(e));
					
					throw the error so that the parent can catch it and do something with it
						
				}
			
} 
	


