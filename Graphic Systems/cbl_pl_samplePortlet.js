/**
 * HTML portlet tht displays the contents of Suitlet on users dashboard
 * @param portlet
 * @param column
 */

function iframeFileView(portlet, column) {
	portlet.setTitle('IFrame File/URL Viewer)');
	//https://pi.pardot.com/prospect/read/email/joe.son@exostar.com
	var iFrameHtml="<iframe src='' id='frameView'"+
	"width='100%' height='650px' name='File View'></iframe>";
	
	var clientJavaScript="var elFrame = document.getElementById(\'frameView\'); var newUrl = document.getElementById(\'newurltxt\').value; if (!newUrl) { alert(\'Please provide valid URL\'); return;} elFrame.src=newUrl;";
	
	var portletFormHtml = '<div style="padding: 3px">'+
						  'Source URL: <input type="text" id="newurltxt" name="newurltxt" value="" /> '+
						  '<input type="button" name="changeframe" id="changeframe" value="View URL" onclick="'+clientJavaScript+'"/>'+
						  iFrameHtml+'</div>';
	portlet.setHtml(portletFormHtml);
	
}