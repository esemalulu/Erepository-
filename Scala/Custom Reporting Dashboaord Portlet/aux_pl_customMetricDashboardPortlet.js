

function customMetricDashboardPortlet(portlet, column) {
	portlet.setTitle('Campaign Metrics');
	
	
	var slUrl=nlapiResolveURL('SUITELET','customscript_ax_sl_campmetricdashboard','customdeploy_ax_sl_campmetricdashboard')+'&ifrmcntnr=T';
	var iFrameHtml="<iframe src='"+slUrl+"' id='campaignFrameView' width='100%' height='800px' name='campaignFrameView' marginheight='0' marginwidth='0' frameborder='0'></iframe>";
	
	/**
	var clientJavaScript="var elFrame = document.getElementById(\'frameView"+portletWindow+"\');"+
						 "var newDocSel = document.getElementById(\'pubDocList"+portletWindow+"\');"+
						 "var selectedValue = newDocSel.options[newDocSel.selectedIndex].value;"+
						 "if (!selectedValue) { alert(\'Please Select Document to View\'); return;} elFrame.src=\'"+slUrl+"\'+selectedValue;";
	var portletFormHtml = '<div style="padding: 3px">'+
						  '		Source URL: '+htmlPubDocDropDown+' &nbsp; '+
						  '		<input type="button" style="padding: 2px" name="changeframe'+portletWindow+'" id="changeframe'+portletWindow+'" value="View Doc" onclick="'+clientJavaScript+'"/><br/><br/>'+
						  '</div>';
	
	
	portletFormHtml += iFrameHtml;
	*/
	

	
	portlet.setHtml(iFrameHtml);
	
}