/*
 * @author efagone
 */

function closeWindow(){
	
    window.opener = top;
    window.close();
	
}

function popUpWindow(url, width, height){
	var params = '';
	
	if (width != null && width != '' && height != null && height != '') {
		var left = (screen.width - width) / 2;
		var top = (screen.height - height) / 2;
		params += 'width=' + width + ', height=' + height;
		params += ', menubar=no';
		params += ', status=no';
	}
	
	newwin = window.open(url, null, params);
	
	if (window.focus) {
		newwin.focus();
	}
	return false;
}

function replaceWindow(url){
	
	window.location = url;

	return false;
}

