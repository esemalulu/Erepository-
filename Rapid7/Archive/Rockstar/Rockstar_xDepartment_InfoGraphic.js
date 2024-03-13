/**
 * 
 * Module Description
 * 
 * Author	mburstein
 * Version	1.00
 * Date		11 Jul 2013
 * 
 * @record
 * @script
 * @scriptlink <a href=""></a>      
 *
 */

/**
 * @param {nlobjPortlet} portletObj Current portlet object
 * @param {Number} column Column position index: 1 = left, 2 = middle, 3 = right
 * @returns {Void}
 */
function createRockstarInfoGraphic(portletObj, column){
	portlet.setTitle('Rockstar X-Department InfoGraphic');
	var content = '';
	content += '<canvas id="myCanvas" width="700" height="700" style="border:1px solid #000000;"' +
	'margin="0"></canvas>';
	content += '<p>testing motha fucka</p>';
		var context = document.getElementById("myCanvas");
		alert(context);
	//createInfoGraphicRevolver(context);	
	portlet.setHtml(content);
	portlet.setScript('customscriptr7infographic_revolver');
	
	// Get the canvas context
	
}
