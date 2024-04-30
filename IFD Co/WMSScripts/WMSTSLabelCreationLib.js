function WMSTSExternalLabelCreation(datain)
{
  
  try
  {
  
    if (datain.JSONfileid != null)
	{
      nlapiLogExecution('DEBUG', 'datain.OTids and datain.JSONfileid', 'datain.OTids = '+datain.OTids+' and datain.JSONfileid = '+datain.JSONfileid);
	  
	  /* Sudheer Pellakuru ::: Dt: 01/30/2018 - Getting the JSON file data that contains the Label information from DOcuments and Folders */
	  var lblJSONfile = nlapiLoadFile(datain.JSONfileid);
      var lblJSONURL = lblJSONfile.getURL();
	  var lblJSONtxt = lblJSONfile.getValue();
      nlapiLogExecution('DEBUG', 'lblJSONfile, lblJSONtxt and lblJSONURL','lblJSONfile = '+lblJSONfile+'; lblJSONtxt = '+lblJSONtxt+'; lblJSONURL = '+lblJSONURL);
	  
	  var lblJSON = JSON.parse(lblJSONtxt);
	  nlapiLogExecution('DEBUG', 'lblJSON.LabelDataSearch.SearchRecordType, lblJSON.LabelDataSearch.SavedSearch and lblJSON.LabelDataSearch.SearchFilters','lblJSON.LabelDataSearch.SearchRecordType = '+lblJSON.LabelDataSearch[0].SearchRecordType+'; lblJSON.LabelDataSearch.SavedSearch = '+lblJSON.LabelDataSearch[0].SavedSearch+'; lblJSON.LabelDataSearch.SearchFilters = '+lblJSON.LabelDataSearch[0].SearchFilters);
	  
	  nlapiLogExecution('DEBUG', 'lblJSON.LabelDataTarget.TargetRecordType and lblJSON.LabelDataTarget.TargetPrinterField','lblJSON.LabelDataTarget.TargetRecordType = '+lblJSON.LabelDataTarget[0].TargetRecordType+'; lblJSON.LabelDataTarget.TargetPrinterField = '+lblJSON.LabelDataTarget[0].TargetPrinterField);
	    
	  
	  nlapiLogExecution('DEBUG', 'lblJSON.PrinterDetails.PrinterRecordType, lblJSON.PrinterDetails.PrinterSearch, lblJSON.PrinterDetails.PrinterField, lblJSON.PrinterDetails.PrinterUserField , lblJSON.PrinterDetails.DefaultPrinter and lblJSON.PrinterDetails.PrinterFilter','lblJSON.PrinterDetails.PrinterRecordType = '+lblJSON.PrinterDetails[0].PrinterRecordType+'; lblJSON.PrinterDetails.PrinterSearch = '+lblJSON.PrinterDetails[0].PrinterSearch+'lblJSON.PrinterDetails.PrinterField = '+lblJSON.PrinterDetails[0].PrinterField+'lblJSON.PrinterDetails.PrinterUserField = '+lblJSON.PrinterDetails[0].PrinterUserField+'lblJSON.PrinterDetails.DefaultPrinter = '+lblJSON.PrinterDetails[0].DefaultPrinter+'; lblJSON.PrinterDetails.PrinterFilter = '+lblJSON.PrinterDetails[0].PrinterFilter);
	  
	  nlapiLogExecution('DEBUG', 'lblJSON.LabelFieldMap = ', lblJSON.LabelFieldMap);
	  
	  /* Sudheer Pellakuru ::: Dt: 01/30/2018 - End of Getting the JSON file data that contains the Label information from DOcuments and Folders */
	  
	  
	  /* Sudheer Pellakuru ::: Dt: 01/30/2018 - Creating the field map Source and Traget data from JSON file configuration */
	 
	  var recfieldarray = [];
	  for (var x=0; x<lblJSON.LabelFieldMap.length; x++)
	  {
		var rec =  lblJSON.LabelFieldMap[x].split('=');
		var src = rec[1];
		var tgt = rec[0];
		recfieldarray.push({"Source":src, "Target":tgt});
	  }

      nlapiLogExecution('DEBUG', 'recfieldarray = ', JSON.stringify(recfieldarray));
	 
      /* Sudheer Pellakuru ::: Dt: 01/30/2018 - End of Creating the field map Source and Traget data from JSON file configuration */
	 
	 /* Sudheer Pellakuru ::: Dt: 01/31/2018 - Retrieving the PrinterDetails data from JSON file configuration */
	 
	  var printfilters = [];
	  var printresults = [];
      if (lblJSON.PrinterDetails[0].PrinterRecordType != null)
	  {
		if (lblJSON.PrinterDetails[0].PrinterFilter != null)
		{
		printfilters.push(lblJSON.PrinterDetails[0].PrinterFilter);
		printfilters.push('AND');
	    }
		
		
		/*
		printfilters.push(['custrecord_wmsts_printer_labeltemplate', 'is', 'IFD Receiving Pallet Label'], 'AND', 
						 ['custrecord_wmsts_printer_tasktype', 'is','2']);
		printfilters.push('AND');
	    */
		printfilters.push([lblJSON.PrinterDetails[0].PrinterUserField,'anyof', ['@NONE@',datain.uid]]);
	    nlapiLogExecution('DEBUG', 'printfilters = ', JSON.stringify(printfilters));
	    
		var printColumns = new Array();
		printColumns[0] = new nlobjSearchColumn(lblJSON.PrinterDetails[0].PrinterField);
		printColumns[1] = new nlobjSearchColumn(lblJSON.PrinterDetails[0].PrinterUserField).setSort();
		var printresults = nlapiSearchRecord(lblJSON.PrinterDetails[0].PrinterRecordType, lblJSON.PrinterDetails[0].PrinterSearch, printfilters, printColumns);
		nlapiLogExecution('DEBUG', 'printresults = ', JSON.stringify(printresults));
	    
		if(printresults !=null && printresults !='')
		{
			var tgtPrinter=printresults[0].getValue(lblJSON.PrinterDetails[0].PrinterField);
		}
	  }
	  else
	  {
	    var tgtPrinter =	lblJSON.PrinterDetails[0].DefaultPrinter;
	  }		  
	 
	    nlapiLogExecution('DEBUG', 'tgtPrinter',tgtPrinter);
			
	 /* Sudheer Pellakuru ::: Dt: 01/31/2018 - End of Retrieving the PrinterDetails data from JSON file configuration */
	 
	 
	  var filters = [];
	  var results = [];
	
	  if (lblJSON.LabelDataSearch[0].SavedSearch != null && lblJSON.LabelDataSearch[0].SearchRecordType != null)
	  {
        if (lblJSON.LabelDataSearch[0].SearchFilters)
	    {
	      filters.push(lblJSON.LabelDataSearch[0].SearchFilters);
		  filters.push('AND');
	    }		  
	  
	    if (datain.OTids != null && datain.OTids.length>0)
        { 		  
	  	  filters.push(['internalid', 'anyof', datain.OTids]);
	    }	
	  
	    nlapiLogExecution('DEBUG', 'filters = ', JSON.stringify(filters));
	  
	    results = nlapiSearchRecord(lblJSON.LabelDataSearch[0].SearchRecordType, lblJSON.LabelDataSearch[0].SavedSearch, filters);
		
			// Search results
		var total = results ? results.length : 0;
		nlapiLogExecution('debug', lblJSON.LabelDataSearch[0].SavedSearch +'Search Results', 'Results=' + total);
		
		// No record found
		if (total == 0)
		{
			var error = 'Saved search ('+ lblJSON.LabelDataSearch[0].SavedSearch +') did not return any record.';
			nlapiLogExecution('error', lblJSON.LabelDataSearch[0].SavedSearch, error);
			throw nlapiCreateError('99999', lblJSON.LabelDataSearch[0].SavedSearch + ': ' + error);
		}	
		
		// Array items
		var arrTransactionData = [];
		
		// Search columns
		var columns = null;
		
		// Get results
		for (var i = 0; i < total; i++)
		{
			var result = results[i];
			var lblextdata = {};
			
			// Get columns
			columns = columns || result.getAllColumns();
			
			// Loop through columns
			if (columns && columns.length  > 0)
			{
				for (var j = 0; j < columns.length; j++)
				{
					var column = columns[j];
					var label =  column.getLabel() || column.getName();
					lblextdata[label] = result.getValue(column);
				}	
			}
		
            nlapiLogExecution('DEBUG', 'lblextdata = ', JSON.stringify(lblextdata));
	  		
			// Add each item row to main array
			arrTransactionData.push(lblextdata);
			
		}	

		nlapiLogExecution('debug', lblJSON.LabelDataSearch[0].SavedSearch, 'arrTransactionData=' + (arrTransactionData ? arrTransactionData.length : 0));
		
		var recId = nlapiCreateRecord(lblJSON.LabelDataTarget[0].TargetRecordType);
		
		for (var l=0; l<recfieldarray.length; l++)
		{
			nlapiLogExecution('DEBUG', 'search data ['+recfieldarray[l].Source+']', 'search data ['+recfieldarray[l].Source+'] = '+lblextdata[recfieldarray[l].Source]);
			nlapiLogExecution('DEBUG', 'Field name ['+recfieldarray[l].Target+']', 'Field name ['+recfieldarray[l].Target+'] = '+recfieldarray[l].Target);
			recId.setFieldValue(recfieldarray[l].Target, lblextdata[recfieldarray[l].Source]); 
       	}
		    recId.setFieldValue(lblJSON.LabelDataTarget[0].TargetPrinterField, tgtPrinter); 
		    var recWMSExternallabel = nlapiSubmitRecord(recId);
		    nlapiLogExecution('AUDIT', 'External Label record internal ID', 'WMS External Label record created with ID: ' + recWMSExternallabel);
		
	  }
	}
    return recWMSExternallabel;
  }
  catch (exp)
  {
    nlapiLogExecution('DEBUG', 'Error in Creating labeldata', 'Error in Creating labeldata = '+exp);
	
	return -1;
  } 
}

function WMSTSZebraLabelCreation(datain)
{
  
  try
  {
  
    if (datain.JSONfileid == null)
	{
       nlapiLogExecution('DEBUG', 'datain.JSONfileid = ', datain.JSONfileid);
	}
    return 0;
  }
  catch (exp)
  {
    return -1;
  } 
}
