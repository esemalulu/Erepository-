/*
 * @author efagone
 */

function zc_openPopupCenter(pageURL, title, w, h){
	var left = (screen.width - w) / 2.25;
	var top = (screen.height - h) / 5; // for 25% - devide by 4  |  for 33% - devide by 3
	window.open(pageURL, title, 'toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=' + w + ', height=' + h + ', top=' + top + ', left=' + left);
}
	