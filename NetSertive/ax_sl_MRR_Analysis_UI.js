/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       21 Mar 2014     AnJoe
 *
 */

var openOppStatusIds = nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_openstatusids').split(',');
//Loop through each status ID and trim any empty spaces
for (var os=0; openOppStatusIds && os < openOppStatusIds.length; os++) {
	openOppStatusIds[os] = strTrim(openOppStatusIds[os]);
}
var primeNotifer = nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_primenotif');
var ccNotifier = null;
if (nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_ccnotif')) {
	ccNotifier = nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_ccnotif').split(',');
}

var paramPrjNewId = nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_prjnew');
var paramPrjNeutralId = nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_prjnet');
var paramPrjUpId = nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_prjup');
var paramPrjDownId = nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_prjdown');
var paramPrjTerminationId = nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_prjterm');

var paramHistPossibleId = nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_histpossible');
var paramHistActualId = nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_histactual');

var paramSubStatusRenewedId = nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_substrenew');
var paramSubStatusTerminateId = nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_substtermin');

/**
 * @param {nlobjRequest} req Request object
 * @param {nlobjResponse} res Response object
 * @returns {Void} Any output is written via response object
 */


var customerId = '';
var hideNav = false;

var curDate = new Date();

function mrrAnalysis(req, res){

	customerId = req.getParameter('custpage_custflt');
	if (req.getParameter('hidenav') == 'T') {
		hideNav = true;
	}
	
	var paramFromDt = '1/1/'+curDate.getFullYear();
	if (req.getParameter('custpage_fromdate')) {
		paramFromDt = req.getParameter('custpage_fromdate');
	}
	var paramToDt = '12/31/'+curDate.getFullYear();
	if (req.getParameter('custpage_todate')) {
		paramToDt = req.getParameter('custpage_todate');
	}
	
	//create form
	var nsform = nlapiCreateForm('MRR Trend Analysis Report Viewer', hideNav);
	
	try {
		
		//grab data for filtering
		
		//customers who are on Actual MRR table who are not inactive
		//{
		//	"id":"xx",
		//	"name":"xx"
		//}
		var amcustomers = new Array();
		var arCustomerIds = new Array();
		//MRR Items Actual MRR table who are not inactive
		//{
		//	"id":"xx",
		//	"name":"xx"
		//}
		var amitems = new Array();
		var arItemIds = new Array();
		
		var aflt = [new nlobjSearchFilter('isinactive', null, 'is','F')];
		
		var ccol = [new nlobjSearchColumn('custrecord_abmrr_customer', null, 'group')];
		var crs = nlapiSearchRecord('customrecord_ax_baseline_mrr', null, aflt, ccol);
		for (var c=0; crs && c < crs.length; c++) {
			var cobj = new Object();
			cobj.id = crs[c].getValue('custrecord_abmrr_customer', null, 'group');
			cobj.name = crs[c].getText('custrecord_abmrr_customer', null, 'group');
			amcustomers.push(cobj);
			arCustomerIds.push(cobj.id);
		}
		//search history
		var chflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F')];
		if (arCustomerIds.length > 0) {
			chflt.push(new nlobjSearchFilter('custrecord_hbmrr_customer', null, 'noneof', arCustomerIds));
		}
		var chcol = [new nlobjSearchColumn('custrecord_hbmrr_customer', null, 'group')];
		var chrs = nlapiSearchRecord('customrecord_ax_historybaseline_mrr', null, chflt, chcol);
		for (var c=0; chrs && c < chrs.length; c++) {
			var cobj = new Object();
			cobj.id = chrs[c].getValue('custrecord_hbmrr_customer', null, 'group');
			cobj.name = chrs[c].getText('custrecord_hbmrr_customer', null, 'group');
			amcustomers.push(cobj);
			arCustomerIds.push(cobj.id);
		}
		
		var ihflt = [new nlobjSearchFilter('isinactive', null, 'is', 'F')];
		if (arItemIds.length > 0) {
			ihflt.push(new nlobjSearchFilter('custrecord_hbmrr_item', null, 'noneof', arItemIds));
		}
		var ihcol = [new nlobjSearchColumn('custrecord_hbmrr_item', null, 'group')];
		var ihrs = nlapiSearchRecord('customrecord_ax_historybaseline_mrr', null, ihflt, ihcol);
		for (var i=0; ihrs && i < ihrs.length; i++) {
			var iobj = new Object();
			iobj.id = ihrs[i].getValue('custrecord_hbmrr_item', null, 'group');
			iobj.name = ihrs[i].getText('custrecord_hbmrr_item', null, 'group');
			amitems.push(iobj);
			arItemIds.push(iobj.id);
		}
		
		//Add Filter options ----------------------------------------
		nsform.addFieldGroup('custpage_a', 'Filter Options', null);

		var customerDd = nsform.addField('custpage_custflt', 'select','Customer/Prospect', null, 'custpage_a');
		customerDd.setBreakType('startcol');
		customerDd.addSelectOption('', '', true);
		for (var co=0; co < amcustomers.length; co++) {
			customerDd.addSelectOption(amcustomers[co].id, amcustomers[co].name);
		}
		customerDd.setDefaultValue(customerId);
		
		//ITEM Filter
		var itemDd = nsform.addField('custpage_itemflt', 'select','Item', null, 'custpage_a');
		itemDd.setBreakType('startcol');
		itemDd.addSelectOption('', '', true);
		for (var io=0; io < amitems.length; io++) {
			itemDd.addSelectOption(amitems[io].id, amitems[io].name);
		}
		//itemDd.setDefaultValue();
		
		var dateFilterDd = nsform.addField('custpage_dateflt', 'select', 'Date Filter', null, 'custpage_a');
		dateFilterDd.addSelectOption('', '', true);
		//loop through nsDateRange JSON to build option values
		//dt = Filter Text
		//nsDateRange[dt].nsvar = Variable to pass in to netsuite client function
		//nsDateRange[dt].desc = Date Filter Definition
		//nsDateRange[dt].type = single or range. 
		for (var dt in nsDateRange) {
			dateFilterDd.addSelectOption(nsDateRange[dt].nsvar, dt, false);
		}
		dateFilterDd.setBreakType('startcol');
		
		//From Range date
		var fromDateFld = nsform.addField('custpage_fromdate','date','From', null, 'custpage_a');
		fromDateFld.setDefaultValue(paramFromDt);
		
		//To Range date
		var toDateFld = nsform.addField('custpage_todate','date','To', null, 'custpage_a');
		toDateFld.setDefaultValue(paramToDt);
		
		//-------------------------Date Range Search---------------------------------------------------------
		var actualTrendByItem = {
			"maxdate":{},
			"item":{}
		};
		var possibleTrendByItem = {};
		var trendByItemUniqueItems = {};
		var acatItemCols = '';
		var arRptDates = new Array();
		var arRptDateJson = {};
		
		var iflt = [new nlobjSearchFilter('isinactive', null, 'is','F')];
		var icol = [new nlobjSearchColumn('custrecord_hbmrr_item', null, 'group').setSort()];
		var iirs = nlapiSearchRecord('customrecord_ax_historybaseline_mrr', null, iflt, icol);
		for (var ai=0; iirs && ai < iirs.length; ai++) {
			var aiitemid = iirs[ai].getValue('custrecord_hbmrr_item', null, 'group');
			var aiitemname = iirs[ai].getText('custrecord_hbmrr_item', null, 'group');
			
			if (!trendByItemUniqueItems[aiitemid]) {
				trendByItemUniqueItems[aiitemid] = aiitemname;
				acatItemCols += "aidata.addColumn('number','"+aiitemname+"');"+
								"aidata.addColumn({type:'boolean',role:'certainty'});";
			}
		}
		
		log('debug','from/to',paramFromDt+'//'+paramToDt);
		
		var aiflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
		             new nlobjSearchFilter('custrecord_hbmrr_historytype', null, 'anyof',paramHistActualId)];
		if (paramFromDt && paramToDt) {
			aiflt.push(new nlobjSearchFilter('custrecord_hbmrr_acctualrptdate', null, 'within', paramFromDt, paramToDt));
		}
		
		if (customerId) {
			aiflt.push(new nlobjSearchFilter('custrecord_hbmrr_customer', null, 'anyof', customerId));
		}
		
		var aicol = [new nlobjSearchColumn('custrecord_hbmrr_acctualrptdate', null, 'group').setSort(),
		             new nlobjSearchColumn('custrecord_hbmrr_item', null, 'group'),
		             new nlobjSearchColumn('custrecord_hbmrr_linevalue', null, 'sum')];
		
		var airs = nlapiSearchRecord('customrecord_ax_historybaseline_mrr', null, aiflt, aicol);
		var acatData = '';
		
		//get terminations
		var tiflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
		             new nlobjSearchFilter('custrecord_hbmrr_projection', null, 'anyof',paramPrjTerminationId)];
		
		if (paramFromDt && paramToDt) {
			tiflt.push(new nlobjSearchFilter('custrecord_hbmrr_rptdate', null, 'within', paramFromDt, paramToDt));
		}
		
		if (customerId) {
			tiflt.push(new nlobjSearchFilter('custrecord_hbmrr_customer', null, 'anyof', customerId));
		}
		
		
		//get termination
		var ticol = [new nlobjSearchColumn('custrecord_hbmrr_rptdate', null, 'group').setSort(),
		             new nlobjSearchColumn('custrecord_hbmrr_item', null, 'group'),
		             new nlobjSearchColumn('custrecord_hbmrr_linevalue', null, 'sum')];
		
		var tirs = nlapiSearchRecord('customrecord_ax_historybaseline_mrr', null, tiflt, ticol);
		
		for (var ai=0; tirs && ai < tirs.length; ai++) {
			if (!arRptDateJson[tirs[ai].getValue('custrecord_hbmrr_rptdate', null, 'group')]) {
				arRptDates.push(tirs[ai].getValue('custrecord_hbmrr_rptdate', null, 'group'));
				arRptDateJson[tirs[ai].getValue('custrecord_hbmrr_rptdate', null, 'group')]=tirs[ai].getValue('custrecord_hbmrr_rptdate', null, 'group');
			}
		}
		
		var terminationTrendByItem = {};
		for (var pi=0; tirs && pi < tirs.length; pi++) {
			
			var rptDate = tirs[pi].getValue('custrecord_hbmrr_rptdate', null, 'group');
			var aiitemid = tirs[pi].getValue('custrecord_hbmrr_item', null, 'group');
			var aiitemname = tirs[pi].getText('custrecord_hbmrr_item', null, 'group');
			var aiitemvalue = tirs[pi].getValue('custrecord_hbmrr_linevalue', null, 'sum');
			
			if (!terminationTrendByItem[rptDate]) {
				terminationTrendByItem[rptDate] = {
					"tiitems":{}
				};
			}
			
			if (!terminationTrendByItem[rptDate]['tiitems'][aiitemid]) {
				terminationTrendByItem[rptDate]['tiitems'][aiitemid] = {
					"name":aiitemname,
					"value":aiitemvalue
				};
			}
			
		}
		
		//get projections
		var piflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
		             new nlobjSearchFilter('custrecord_hbmrr_historytype', null, 'anyof',paramHistPossibleId)];
		
		if (paramFromDt && paramToDt) {
			piflt.push(new nlobjSearchFilter('custrecord_hbmrr_rptdate', null, 'within', paramFromDt, paramToDt));
		}
		
		if (customerId) {
			piflt.push(new nlobjSearchFilter('custrecord_hbmrr_customer', null, 'anyof', customerId));
		}
		
		
		var picol = [new nlobjSearchColumn('custrecord_hbmrr_rptdate', null, 'group').setSort(),
		             new nlobjSearchColumn('custrecord_hbmrr_item', null, 'group'),
		             new nlobjSearchColumn('custrecord_hbmrr_linevalue', null, 'sum')];
		
		var pirs = nlapiSearchRecord('customrecord_ax_historybaseline_mrr', null, piflt, picol);
		
		for (var ai=0; pirs && ai < pirs.length; ai++) {
			if (!arRptDateJson[pirs[ai].getValue('custrecord_hbmrr_rptdate', null, 'group')]) {
				arRptDates.push(pirs[ai].getValue('custrecord_hbmrr_rptdate', null, 'group'));
				arRptDateJson[pirs[ai].getValue('custrecord_hbmrr_rptdate', null, 'group')]=pirs[ai].getValue('custrecord_hbmrr_rptdate', null, 'group');
			}
		}
		
		for (var pi=0; pirs && pi < pirs.length; pi++) {
			
			var rptDate = pirs[pi].getValue('custrecord_hbmrr_rptdate', null, 'group');
			var aiitemid = pirs[pi].getValue('custrecord_hbmrr_item', null, 'group');
			var aiitemname = pirs[pi].getText('custrecord_hbmrr_item', null, 'group');
			var aiitemvalue = pirs[pi].getValue('custrecord_hbmrr_linevalue', null, 'sum');
			
			if (!possibleTrendByItem[rptDate]) {
				possibleTrendByItem[rptDate] = {
					"piitems":{}
				};
			}
			
			if (!possibleTrendByItem[rptDate]['piitems'][aiitemid]) {
				possibleTrendByItem[rptDate]['piitems'][aiitemid] = {
					"name":aiitemname,
					"value":aiitemvalue
				};
			} else {
				possibleTrendByItem[rptDate]['piitems'][aiitemid].value = parseFloat(possibleTrendByItem[rptDate]['piitems'][aiitemid].value) + parseFloat(aiitemvalue); 
			}
			
		}
		
		nsform.addSubTab('custpage_actualtrend', 'Actual MRR By Items', null);
		if (airs && airs.length > 0) {
			
			for (var ai=0; airs && ai < airs.length; ai++) {
				if (!arRptDateJson[airs[ai].getValue('custrecord_hbmrr_acctualrptdate', null, 'group')]) {
					arRptDates.push(airs[ai].getValue('custrecord_hbmrr_acctualrptdate', null, 'group'));
					arRptDateJson[airs[ai].getValue('custrecord_hbmrr_acctualrptdate', null, 'group')]=airs[ai].getValue('custrecord_hbmrr_acctualrptdate', null, 'group');
				}
			}
			
			arRptDates.sort(function(a, b) {return new Date(a)-new Date(b);});
			
			for (var sa=0; sa < arRptDates.length; sa++) {
				if (!actualTrendByItem['item'][arRptDates[sa]]) {
					actualTrendByItem['item'][arRptDates[sa]] = {
							"aiitems":{}
					};
				}
			}
			
			for (var ai=0; airs && ai < airs.length; ai++) {
				var rptDate = airs[ai].getValue('custrecord_hbmrr_acctualrptdate', null, 'group');
				var aiitemid = airs[ai].getValue('custrecord_hbmrr_item', null, 'group');
				var aiitemname = airs[ai].getText('custrecord_hbmrr_item', null, 'group');
				var aiitemvalue = airs[ai].getValue('custrecord_hbmrr_linevalue', null, 'sum');
				
				actualTrendByItem['maxdate'][aiitemid] = rptDate;
				
				if (!actualTrendByItem['item'][rptDate]['aiitems'][aiitemid]) {
					actualTrendByItem['item'][rptDate]['aiitems'][aiitemid] = {
						"name":aiitemname,
						"value":aiitemvalue
					};
				} else {
					actualTrendByItem['item'][rptDate]['aiitems'][aiitemid].value = parseFloat(actualTrendByItem['item'][rptDate]['aiitems'][aiitemid].value) + parseFloat(aiitemvalue);
				}
				
			}
		
			
			var acatgraphc = nsform.addField('custpage_actualgrh', 'inlinehtml', '', null, 'custpage_actualtrend');
			var acatHtml  = "<script type='text/javascript' src='https://www.google.com/jsapi'></script><script type='text/javascript'>"+
							"google.load('visualization', '1', {packages:['corechart']});"+
							"google.setOnLoadCallback(drawAcatChart);"+
							"function drawAcatChart() {"+
							"var aidata = new google.visualization.DataTable();"+
							"aidata.addColumn('string','Fulfilled Month');"+
							acatItemCols;
			//add columns of items
			
			var preValues = {};
			for (var a in actualTrendByItem['item']) {
				acatData += "aidata.addRow(['"+a+"', ";
				for (var ui in trendByItemUniqueItems) {
					
					if (actualTrendByItem['item'][a]['aiitems'][ui]) {
						//exists, add value
						acatData += parseFloat(actualTrendByItem['item'][a]['aiitems'][ui].value).toFixed(2)+",true,";
						preValues[ui] = parseFloat(actualTrendByItem['item'][a]['aiitems'][ui].value).toFixed(2);
					} else {
						log('debug','max date for '+ui,actualTrendByItem['maxdate'][ui]);
						if (possibleTrendByItem[a] && possibleTrendByItem[a]['piitems'][ui]) {
							acatData += parseFloat(possibleTrendByItem[a]['piitems'][ui].value).toFixed(2)+",false,";
							preValues[ui] = parseFloat(possibleTrendByItem[a]['piitems'][ui].value).toFixed(2);
						} else if (terminationTrendByItem[a] && terminationTrendByItem[a]['tiitems'][ui]) {
							acatData += "0,false,";
							preValues[ui] = 0;
							
						} else if (preValues[ui]) {
							if (actualTrendByItem['maxdate'][ui] && new Date(actualTrendByItem['maxdate'][ui]) > new Date(a)) {
								acatData += preValues[ui]+",true,";
							} else {
								acatData += preValues[ui]+",false,";
							}
							
						} else {
							acatData += "null,false,";
						}
						
												
					}
				}
				
				acatData = acatData.substring(0, (acatData.length - 1))+"]);";
				
			}
			
			acatHtml += acatData+
						   "var acatoption = {chartArea: {left: 150, top: 10}, title: 'Test', tooltip: {isHtml: true}, pointSize: 8, legend: {textStyle: {fontSize: 11}}, hAxis: {title: 'Actual Month'}, vAxis: {title: 'Actual Sales'}, width: 1100, height: 500};"+
						   "var acatchart = new google.visualization.LineChart(document.getElementById('acatchart_div'));"+
						   "acatchart.draw(aidata, acatoption);"+
		      			   "}"+
		      			   "</script>"+
		      			   "<div id='acatchart_div' style='width: 1100px; height: 600px;'></div>";
		    acatgraphc.setDefaultValue(acatHtml);
		}
		
		
		
	} catch (mrrrptuierr) {
		log('error','trend sl err',getErrText(mrrrptuierr));
	}
	
	res.writePage(nsform);

}

