function printPackingSlip(request, response)
{
	//retrieve the record id passed to the Suitelet
	var recId = request.getParameter('id');

	//load the record
	var recNIT = nlapiLoadRecord('customrecord_ps_noninv_lctrnsfr', recId);

	//check the number of line items
	//var lineCount = recNIT.getLineItemCount('custpage_itemlist');
	var itemArry = JSON.parse(recNIT.getFieldValue('custrecord_ps_lctrnsfr_itemobj'));

	//create a table to present the line items
	var strName = "<table width=\"100\%\">";
	strName += "<tr style=\"background-color:#D3D3D3;\">";
	strName += "<td width=\"47\%\"><b>Item</b></td>";
  	strName += "<td width=\"15\%\" align=\"left\"><b>NOTES</b></td>";
	strName += "<td width=\"10\%\" align=\"center\"><b>UPC</b></td>";
	strName += "<td width=\"8\%\" align=\"center\"><b>Qty</b></td>";
	strName += "<td width=\"5\%\" align=\"center\"><b>Unit</b></td>"
	strName += "<td width=\"15\%\" align=\"center\"><b>Department</b></td>";
	strName += "</tr>";

	//iterate through each item
	//for (var x = 1; x <= lineCount; x++)
    for (x = 0; x < itemArry.length; x++)   
	{
		strName += "<tr style=\"font-size:95%;\"><td>";

		// note the use of nlapiEscapeXML to escape any special characters, 
		// such as an ampersand (&) in any of the item names
		//strName += nlapiEscapeXML(recNIT.getLineItemText('item', 'item', x));
      	strName += itemArry[x].obj_itemid+' '+itemArry[x].obj_desc; 
		strName += "</td>";

		strName += "<td>";
		if(!itemArry[x].obj_notes){ strName += '';} else{strName += itemArry[x].obj_notes;}
		strName += "</td>";

		strName += "<td align=\"center\">";
		strName += itemArry[x].obj_upc;
		strName += "</td>";

		strName += "<td align=\"center\">";
		strName += itemArry[x].obj_qtyrequested;
		strName += "</td>";

		strName += "<td align=\"center\">";
		strName += itemArry[x].obj_units;
		strName += "</td>";

		strName += "<td align=\"center\">";
		strName += itemArry[x].obj_dept;
		strName += "</td></tr>";

	}
	strName += "</table>";

	// build up BFO-compliant XML using well-formed HTML
	var xml = "<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">\n";
	xml += "<pdf>\n<body font-size=\"10\">\n<h3>"+recNIT.getFieldValue('name')+"</h3>\n";
	xml += "<p>"+recNIT.getFieldValue('custrecord_ps_lctrnsfr_date')+"</p>";
  	xml += "<p>"+recNIT.getFieldText('custrecord_ps_lctrnsfr_sourcesub')+"</p>";
  	xml += "<p>"+recNIT.getFieldText('custrecord_ps_lctrnsfr_sourcloc')+"</p>";  
  	xml += "<p>"+recNIT.getFieldText('custrecord_ps_lctrnsfr_destnsub')+"</p>";
  	xml += "<p>"+recNIT.getFieldText('custrecord_ps_lctrnsfr_destnloc')+"</p>"; 
  	xml += "<p>"+recNIT.getFieldText('custrecord_ps_lctrnsfr_destnloc_i')+"</p>";   

	xml += strName;
	xml += "</body>\n</pdf>";

	// run the BFO library to convert the xml document to a PDF 
	var file = nlapiXMLToPDF( xml );

	// set content type, file name, and content-disposition (inline means display in browser)
	response.setContentType('PDF', recNIT.getFieldValue('name')+'.pdf', 'inline');

	// write response to the client
	response.write( file.getValue() );   
}



