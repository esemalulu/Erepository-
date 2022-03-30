// 
/**
 * HTML portlet tht displays the contents of Suitlet on users dashboard
 * @param portlet
 * @param column
 */

var ctx = nlapiGetContext();
var empid = ctx.getUser();
var roleid = ctx.getRole();
var htmlPubDocDropDown='';
var cachedDoc = '';
var userDefault='';
//identifies unique portlet window value passed in by Portlet script parameter
var portletWindow=ctx.getSetting('SCRIPT', 'custscript_protlet_window');
var slUrl=nlapiResolveURL('SUITELET','customscript_sl_pub_doc_req_handle','customdeploy_pub_doc_req_handler')+'&portletwin='+portletWindow+'&usrsel=';

function pubDocFileView(portlet, column) {
	portlet.setTitle('Published Document Viewer '+portletWindow);
	initDropDown();
	var iFrameHtml="<iframe src='"+userDefault+"' id='frameView"+portletWindow+"' width='100%' height='400px' name='File View "+portletWindow+"' marginheight='0' marginwidth='0' frameborder='0'></iframe>";
	
	var clientJavaScript="var elFrame = document.getElementById(\'frameView"+portletWindow+"\');"+
						 "var newDocSel = document.getElementById(\'pubDocList"+portletWindow+"\');"+
						 "var selectedValue = newDocSel.options[newDocSel.selectedIndex].value;"+
						 "if (!selectedValue) { alert(\'Please Select Document to View\'); return;} elFrame.src=\'"+slUrl+"\'+selectedValue;";
	
	var portletFormHtml = '<div style="padding: 3px">'+
						  '		Source URL: '+htmlPubDocDropDown+' &nbsp; '+
						  '		<input type="button" style="padding: 2px" name="changeframe'+portletWindow+'" id="changeframe'+portletWindow+'" value="View Doc" onclick="'+clientJavaScript+'"/><br/><br/>'+
						  '</div>';
	
	portletFormHtml += iFrameHtml;
	
	
	portlet.setHtml(portletFormHtml);
	
}

function initDropDown() {
	setCachedDoc();
	
	var flt = [new nlobjSearchFilter('custrecord_pdc_access_role',null,'anyof',roleid)];
	var col = [new nlobjSearchColumn('internalid'),
	           new nlobjSearchColumn('name'),
	           new nlobjSearchColumn('custrecord_pdc_publisher')];
	var list = nlapiSearchRecord('customrecord_pub_doc_config',null,flt,col);
	
	//build html
	htmlPubDocDropDown='<select id="pubDocList'+portletWindow+'" name="pubDocList'+portletWindow+'">#OPTIONS#</select>';
	var options = '<option value=""/>... Select Document</option>';
	for (var i=0; list && i < list.length; i++) {
		var value = list[i].getValue('internalid');
		var text = list[i].getText('custrecord_pdc_publisher')+' - '+list[i].getValue('name');
		var selectedTxt = (value==cachedDoc)?' selected':'';
		
		options += '<option value="'+value+'"'+selectedTxt+'>'+text+'</option>';
	}
	htmlPubDocDropDown = htmlPubDocDropDown.replace('#OPTIONS#',options);
}

/**
 * Search Published Doc Employee Cache to see if
 * THIS employee has a document set before
 */
function setCachedDoc() {
	//customrecord_pub_doc_employee_cache  
	var flt = [new nlobjSearchFilter('custrecord_pdec_employee_id',null,'anyof',empid),
	           new nlobjSearchFilter('custrecord_pdec_portlet_window',null,'is',portletWindow)];
	var col = [new nlobjSearchColumn('custrecord_pdec_pdc_id')];
	
	var rslt = nlapiSearchRecord('customrecord_pub_doc_employee_cache',null,flt,col);
	if (rslt && rslt.length > 0) {
		cachedDoc = rslt[0].getValue('custrecord_pdec_pdc_id');
		userDefault = slUrl+cachedDoc;
	}
}

