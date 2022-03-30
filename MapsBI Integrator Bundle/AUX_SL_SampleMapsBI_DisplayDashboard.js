/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       18 Oct 2013     AnJoe
 *
 */

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function showMapsBiDashboard(req, res){

	var showNsNav = false;
	//check to see if request is coming from custom portlet
	if (req.getParameter('shownav')=='Y') {
		showNsNav = true;
	}
	var nsform = nlapiCreateForm('Sample MapsBI Dashboard Display', showNsNav);
	var iframefld = nsform.addField('custpage_iframe', 'inlinehtml', '', null, null);
	
	var iframeSrc = 'https://www.mapsbi.com/Dashboard/Share/1197?southWest.Lat=-89.99961952006011&southWest.Lng=-180&northEast.Lat=89.99961952519773&northEast.Lng=180&zoom=0&startDate=May+12%2C+2009&endDate=Aug+07%2C+2013&width=1248&height=1648&filtersVisible=false&heatMapName=occurrences&heatMapFunction=sum&shareType=Embed';

	iframefld.setDefaultValue("<iframe frameborder='0' scrolling='no' src='"+iframeSrc+"' width='1523' height='1648'></iframe>");
	
	res.writePage(nsform);
	
}
