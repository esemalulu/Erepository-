/*
 * @author efagone
 * 
 */


/*
 * Creates a custom tab button (replaces existing inlinehtml field)
 *
 * @fieldId Internal ID of an existing inlinehtml field that exists on the record
 * 
 * @buttonScript Javascript you want the button to run
 */

function createNSTabButton(fieldId, buttonScript){

	var fldType = '';
	
	try {
		var fld = form.getField(fieldId);
		fldType = fld.getType();
		
		if (fldType == 'inlinehtml') {
			var buttonName = fld.getLabel();
			
			var html = '';
			html += '				<table id=\'tbl_' + fieldId + '\' cellpadding=0 cellspacing=0 border=0 style=\'margin-right:6px;cursor:hand;\'>';
			html += '				<tr id=\'tr_' + fieldId + '\' class=\'tabBnt\'>';
			html += '					<td id=\'tdleftcap_' + fieldId + '\'>';
			html += '						<img src=\'/images/nav/ns_x.gif\' class=\'bntLT\' border=0 height=\'50%\' width=10 /><img src=\'/images/nav/ns_x.gif\' class=\'bntLB\' border=0 height=\'50%\' width=10 />';
			html += '					</td>';
			html += '                   <TD id=\'tdbody_' + fieldId + '\' height=20 valign=\'top\' nowrap class=\'bntBgB\'>';
			html += '						<INPUT type=\'button\' style=\'\' class=\'rndbuttoninpt bntBgT\' value=\'' + buttonName + '\' id=\'' + fieldId + '\' name=\'' + fieldId + '\' onclick="' + buttonScript + ' return false;" onmousedown="this.setAttribute(\'_mousedown\',\'T\'); setButtonDown(true, true, this);" onmouseup="this.setAttribute(\'_mousedown\',\'F\'); setButtonDown(false, true, this);" onmouseout="if(this.getAttribute(\'_mousedown\')==\'T\') setButtonDown(false, true, this);" onmouseover="if(this.getAttribute(\'_mousedown\')==\'T\') setButtonDown(true, true, this);">';
			html += '					</TD>';
			html += '					<td id=\'tdrightcap_' + fieldId + '\'>';
			html += '						<img src=\'/images/nav/ns_x.gif\' height=\'50%\' class=\'bntRT\' border=0 width=10><img src=\'/images/nav/ns_x.gif\' height=\'50%\' class=\'bntRB\' border=0 width=10>';
			html += '					</td>';
			html += '               </tr>';
			html += '           	</table>';
			
			fld.setDefaultValue(html);
		}
		else {
			nlapiLogExecution('ERROR', 'Field for tab button is incorrect type.', fieldId + ' should be inlinehtml');
		}
	} 
	catch (e) {
		nlapiLogExecution('ERROR', 'Could not load field object', 'fieldId: ' + fieldId);
	}
	
}