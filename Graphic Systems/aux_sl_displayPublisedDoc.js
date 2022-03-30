/**
 * 
 * @param req
 * @param res
 */
var ctx = nlapiGetContext();
var pubDocId='';
var docObj = new Object();
var empid = ctx.getUser();
var portletWindow='';

function displayDoc(req, res) {
	pubDocId = req.getParameter('usrsel');
	portletWindow = req.getParameter('portletwin');
	
	if (!pubDocId) {
		res.write('Please Provide User Selectioni');
		return;
	}
	
	LoadUserSelection();
	
	saveUserSelection();
	
	if (!docObj.interactive) {
		//not an interactive content forward to URL
		res.write("<iframe src='"+docObj.staticurl+"' id='frameView' width='100%' height='100%' scrolling='no' marginheight='0' marginwidth='0' name='File View' frameborder='0'></iframe>");
	} else {
		//build suitelet to display interactive content
		docObj.intercontent=strGlobalReplace(docObj.intercontent,'&lt;','<');
		docObj.intercontent=strGlobalReplace(docObj.intercontent,'&gt;','>');
		res.write(docObj.intercontent);
	}
	
}

function strGlobalReplace(_fullString, _searchChar, _replaceChar) {
	var jsrs = new RegExp(_searchChar, "g");
	
	return _fullString.replace(jsrs,_replaceChar);
}

function LoadUserSelection() {
	var flds = ['custrecord_pdc_is_interactive','custrecord_pdc_statis_doc_url','custrecord_pdc_interactive_doc_txt'];
	var vals = nlapiLookupField('customrecord_pub_doc_config', pubDocId,flds);
	
	docObj.interactive=(vals['custrecord_pdc_is_interactive']=='T')?true:false;
	docObj.staticurl = vals['custrecord_pdc_statis_doc_url'];
	docObj.intercontent = vals['custrecord_pdc_interactive_doc_txt'];
	nlapiLogExecution('debug','testing',docObj.intercontent);
}

function saveUserSelection() {
	//search to see if this user's portlet window selection exists.
	var dt = new Date();
	var strToday = (dt.getMonth()+1)+'/'+dt.getDate()+'/'+dt.getFullYear();
	//search cache record
	var flt = [new nlobjSearchFilter('custrecord_pdec_employee_id',null,'anyof',empid),
	           new nlobjSearchFilter('custrecord_pdec_portlet_window',null,'is',portletWindow)];
	var col = [new nlobjSearchColumn('internalid')];
	var rslt = nlapiSearchRecord('customrecord_pub_doc_employee_cache',null,flt,col);
	if (rslt && rslt.length > 0) {
		//update
		var flds = ['custrecord_pdec_pdc_id','custrecord_pdec_accessed_date'];
		var vals = [pubDocId,strToday];
		
		nlapiSubmitField('customrecord_pub_doc_employee_cache',rslt[0].getValue('internalid'),flds,vals);
	} else {
		//insert
		var rec = nlapiCreateRecord('customrecord_pub_doc_employee_cache');
		rec.setFieldValue('custrecord_pdec_employee_id',empid);
		rec.setFieldValue('custrecord_pdec_portlet_window',portletWindow);
		rec.setFieldValue('custrecord_pdec_pdc_id',pubDocId);
		rec.setFieldValue('custrecord_pdec_accessed_date',strToday);
		nlapiSubmitRecord(rec);
	}
}