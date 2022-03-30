/**
 * Author: Audaxium
 * Record: ACM Rooms (customrecord_acm_room_ref  )
 */

function showSiteCustomerHelper() {
	myWindow = window.open('','','width=500,height=400');
	
	var windowContent = '<div style="font-family: arial; font-size: 13px; font-weight: bold">Customers with Site Assigned</div><br/>'+
						'<form>';
	for (var i in jlist) {
		windowContent +='<input type="button" style="font-family: arial; font-size: 11.5px;" value="Set Customer" onclick="window.opener.setCustomerFromHelper(\''+i+'\'); window.close();"/> '+
						'<span style="font-family: arial; font-size: 11.5px">'+jlist[i]+'</span><br/>';
	}
	windowContent +='</form>';
	
	myWindow.document.write(windowContent);
	myWindow.focus();
}

function setCustomerFromHelper(_id) {
	nlapiSetFieldValue('custrecord_customersroom', _id, true, true);
}