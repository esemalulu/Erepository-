/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       21 Mar 2014     AnJoe
 *
 *Market Segment Field:
 *Audaxium = custentity2aux
 *Netsertive = custentity2
 *
 *List_MarketSetment List:
 *Audaxium = customlist_7aux
 *Netsertive = customlist7
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

var paramMarketSegmentListId = nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_mslistid');
var paramMarketSegmentFieldId = nlapiGetContext().getSetting('SCRIPT', 'custscript_ns_ax_param_msfldid');

/**
 * @param {nlobjRequest} req Request object
 * @param {nlobjResponse} res Response object
 * @returns {Void} Any output is written via response object
 */


var hideNav = false;

var curDate = new Date();

function mrrAnalysis(req, res){

	if (req.getParameter('hidenav') == 'T') {
		hideNav = true;
	}
	
	var paramCustomer = '';
	if (req.getParameter('custpage_custid')) {
		paramCustomer = req.getParameter('custpage_custid');
	}
	
	var paramMkSegId = '';
	if (req.getParameter('custpage_mkseg')) {
		paramMkSegId = req.getParameter('custpage_mkseg');
	}
	
	var paramFromDt = '1/1/'+curDate.getFullYear();
	if (req.getParameter('custpage_fromdate')) {
		paramFromDt = req.getParameter('custpage_fromdate');
	}
	var paramToDt = '12/31/'+curDate.getFullYear();
	if (req.getParameter('custpage_todate')) {
		paramToDt = req.getParameter('custpage_todate');
	}

	if (req.getParameter('showdata')=='T') {
		
		var gflt = [new nlobjSearchFilter('isinactive', null, 'is','F')];
		//Add in filter optionis
		if (paramMkSegId) {
			
			gflt.push(new nlobjSearchFilter(paramMarketSegmentFieldId, 'custrecord_hbmrr_customer','anyof', paramMkSegId));
		}
		
		if (paramCustomer) {
			gflt.push(new nlobjSearchFilter('custrecord_hbmrr_customer', null, 'anyof',paramCustomer));
		}
		
		if (paramFromDt && paramToDt) {
			gflt.push(new nlobjSearchFilter('custrecord_hbmrr_rptdate', null, 'within', paramFromDt, paramToDt));
		}

		var gcol = [new nlobjSearchColumn('custrecord_hbmrr_rptdate', null, 'group').setSort(),
		            new nlobjSearchColumn('custrecord_hbmrr_acctualrptdate', null, 'group'),
		            new nlobjSearchColumn(paramMarketSegmentFieldId, 'custrecord_hbmrr_customer', 'group'),
		            new nlobjSearchColumn('custrecord_hbmrr_historytype', null, 'group'),
		            new nlobjSearchColumn('custrecord_hbmrr_linevalue', null, 'sum')];
		
		//create search
		var ss = nlapiCreateSearch('customrecord_ax_historybaseline_mrr', gflt, gcol);
		ss.setRedirectURLToSearchResults();

	}
	
	
	//create form
	var nsform = nlapiCreateForm('MRR Trend Analysis Report Viewer', hideNav);
	nsform.setScript('customscript_ns_ax_cs_trendslhelper');
	//add hidden fields used by client script:
	var hidSlStId = nsform.addField('custpage_slstid', 'text', '', null, null);
	hidSlStId.setDisplayType('hidden');
	hidSlStId.setDefaultValue(nlapiGetContext().getScriptId());
	
	var hidSlDpId = nsform.addField('custpage_sldpid', 'text', '', null, null);
	hidSlDpId.setDisplayType('hidden');
	hidSlDpId.setDefaultValue(nlapiGetContext().getDeploymentId());
	
	//custpage_custid
	var hidCustId = nsform.addField('custpage_custid', 'text', '', null, null);
	hidCustId.setDisplayType('hidden');
	hidCustId.setDefaultValue(paramCustomer);
	
	try {
		
		//grab data for filtering
		
		//get list of Market Segments
		var mkflt = [new nlobjSearchFilter('isinactive', null, 'is','F')];
		var mkcol = [new nlobjSearchColumn('name').setSort()];
		var mkrs = nlapiSearchRecord(paramMarketSegmentListId, null, mkflt, mkcol);
		
		//intro
		var intro = nsform.addField('custpage_intro','inlinehtml','',null,null);
		intro.setLayoutType('startrow');
		intro.setDefaultValue('Trend Analysis across customers and items by Market Segments<br/><br/><b>Date range will always be set to 1st day of selected month/year</b>');
		
		//Add Filter options ----------------------------------------
		nsform.addFieldGroup('custpage_a', 'Filter Options', null);

		var mkDd = nsform.addField('custpage_mkseg','select','Market Segment', null, 'custpage_a');
		mkDd.setBreakType('startcol');
		mkDd.addSelectOption('', 'All', true);
		//add none
		mkDd.addSelectOption('@NONE@','- None -', false);
		for (var mk=0; mkrs && mk < mkrs.length; mk++) {
			mkDd.addSelectOption(mkrs[mk].getId(), mkrs[mk].getValue('name'));
		}
		mkDd.setDefaultValue(paramMkSegId);
		
		//From Range date
		var fromDateFld = nsform.addField('custpage_fromdate','date','From', null, 'custpage_a');
		fromDateFld.setDefaultValue(paramFromDt);
		fromDateFld.setBreakType('startcol');
		
		//To Range date
		var toDateFld = nsform.addField('custpage_todate','date','To', null, 'custpage_a');
		toDateFld.setDefaultValue(paramToDt);		
		
		//----------------------------- Search ----------------------------------
		var gflt = [new nlobjSearchFilter('isinactive', null, 'is','F')];
		//Add in filter optionis
		if (paramMkSegId) {
			
			gflt.push(new nlobjSearchFilter(paramMarketSegmentFieldId, 'custrecord_hbmrr_customer','anyof', paramMkSegId));
		}
		
		if (paramCustomer) {
			gflt.push(new nlobjSearchFilter('custrecord_hbmrr_customer', null, 'anyof',paramCustomer));
		}
		
		if (paramFromDt && paramToDt) {
			gflt.push(new nlobjSearchFilter('custrecord_hbmrr_rptdate', null, 'within', paramFromDt, paramToDt));
		}

		var gcol = [new nlobjSearchColumn('custrecord_hbmrr_rptdate', null, 'group').setSort(),
		            new nlobjSearchColumn('custrecord_hbmrr_acctualrptdate', null, 'group'),
		            new nlobjSearchColumn(paramMarketSegmentFieldId, 'custrecord_hbmrr_customer', 'group'),
		            new nlobjSearchColumn('custrecord_hbmrr_historytype', null, 'group'),
		            new nlobjSearchColumn('custrecord_hbmrr_linevalue', null, 'sum')];
		
		var grs = nlapiSearchRecord('customrecord_ax_historybaseline_mrr', null, gflt, gcol);

		nsform.addSubTab('custpage_actualtrend', 'Visual Graph', null);
		var acatgraphc = nsform.addField('custpage_actualgrh', 'inlinehtml', '', null, 'custpage_actualtrend');
		
		if (grs && grs.length > 0) {
			
			//add view data button
			nsform.addButton('custpage_data', 'View/Export Data', 'openDataPage()');
			
			
			
			log('debug','grs.length',grs.length);
			//get unique segments
			var mktSegs = {};
			//get segments actuals
			var mktSegActualMaxDate = {};
			
			//set maxdate as the last record of the search result.
			//Since the result is ordered in rptdate ASC order, last one will have highest historical rpt date.
			var maxdate = new Date(grs[(grs.length - 1)].getValue('custrecord_hbmrr_rptdate', null, 'group'));
			
			for (var g=0; g < grs.length; g++) {
				
				var segid = grs[g].getValue(paramMarketSegmentFieldId, 'custrecord_hbmrr_customer', 'group');
				if (!segid) {
					segid = '-1';
				}
				var segtext = grs[g].getText(paramMarketSegmentFieldId, 'custrecord_hbmrr_customer', 'group');
				
				mktSegs[segid] = segtext;
				
				//set actual date by segment
				if (grs[g].getValue('custrecord_hbmrr_historytype', null, 'group') == paramHistActualId) {
					var histActualRptDate = new Date(grs[g].getValue('custrecord_hbmrr_acctualrptdate', null, 'group'));
					mktSegActualMaxDate[segid] = histActualRptDate;
					
					//see if this actual date is AFTER currenct maxdate.
					//if so, set the maxdate as actual max date
					if (maxdate < histActualRptDate) {
						maxdate = histActualRptDate;
					}
				}				
			}
						
			//get Max and Min Reporting Dates and initialize graphjson
			var mindate = new Date(grs[0].getValue('custrecord_hbmrr_rptdate', null, 'group'));
			
		
			log('debug','after setting min // max dates',mindate+' // '+maxdate);
			
			/*
			while (rptdate <= maxdate) {
				graphjson[nlapiDateToString(rptdate)]={};
				
				//loop through each unique segments and initialize segments by rptdate
				for (var seg in mktSegs) {
					graphjson[nlapiDateToString(rptdate)][seg] = {
						'segmenttext':mktSegs[seg],
						'actual':-1,
						'possible':-1
					};
				}
				
				rptdate = nlapiAddMonths(rptdate, 1);
			}
			*/
			
			
			var pjson = {};
			var ajson = {};
			
			//loop through search result and apply values to graphjson
			for (var g=0; g < grs.length; g++) {
				
				var amt = grs[g].getValue('custrecord_hbmrr_linevalue', null, 'sum');
				var pdt = grs[g].getValue('custrecord_hbmrr_rptdate', null, 'group');
				var adt = grs[g].getValue('custrecord_hbmrr_acctualrptdate', null, 'group');
				var type = grs[g].getValue('custrecord_hbmrr_historytype', null, 'group');
				var seg = grs[g].getValue(paramMarketSegmentFieldId, 'custrecord_hbmrr_customer', 'group');
				var segText = grs[g].getText(paramMarketSegmentFieldId, 'custrecord_hbmrr_customer', 'group');
				//var grptype = 'possible';
				//var grpdt = pdt;
				if (!seg) {
					seg = '-1';
				}
				
				
				
				if (type == paramHistActualId) {
					//Actual Value
					
					if (!ajson[adt]) {
						ajson[adt] = {};
					}
					
					var cumulativeAmt = 0;
					
					if (!ajson[adt][seg]) {
						ajson[adt][seg] = {};
					} else {
						cumulativeAmt = parseFloat(ajson[adt][seg].value);
					}
					
					ajson[adt][seg]['segtext'] = segText;
					ajson[adt][seg]['value'] = parseFloat(amt)+cumulativeAmt;
					
				} else {
					//Possible
					
					if (!pjson[pdt]) {
						pjson[pdt] = {};
					}
					
					var pcumulativeAmt = 0;
					
					if (!pjson[pdt][seg]) {
						pjson[pdt][seg] = {};
					} else {
						pcumulativeAmt = parseFloat(pjson[pdt][seg].value);
					}
					
					pjson[pdt][seg]['segtext'] = segText;
					pjson[pdt][seg]['value'] = parseFloat(amt) + pcumulativeAmt;
				}
			}
			
			
			var acatItemCols = '';
			for (var sg in mktSegs) {
				acatItemCols += "aidata.addColumn('number','"+mktSegs[sg]+"');"+
								"aidata.addColumn({type:'boolean',role:'certainty'});";
			}
			
			
			var acatHtml  = "<script type='text/javascript' src='https://www.google.com/jsapi'></script><script type='text/javascript'>"+
							"google.load('visualization', '1', {packages:['corechart']});"+
							"google.setOnLoadCallback(drawAcatChart);"+
							"function drawAcatChart() {"+
							"var aidata = new google.visualization.DataTable();"+
							//"aidata.addColumn('date','Report Month/Year');"+
							"aidata.addColumn('string','Report Month/Year');"+
							acatItemCols;
			
			//while from min to Max report date
			//acatData += "aidata.addRow(['"+a+"', ";
			
			var acatData = '';
			
			var tdate = mindate;		
			var prdate = null;
			log('debug','tdate',tdate);
			log('debug','dates',mindate+' // '+maxdate);
			
			log('debug','ajson', JSON.stringify(ajson));
			log('debug','pjson', JSON.stringify(pjson));
			
			while (tdate <= maxdate) {
				
				var stdate = nlapiDateToString(tdate);
				log('debug','stdate',stdate);
				if (ajson[stdate] || pjson[stdate]) {
					
					//acatData += "aidata.addRow([new Date('"+stdate+"'),";
					acatData += "aidata.addRow(['"+stdate+"',";
					
					//loop through unique segments and append data
					for (var sg in mktSegs) {
						
						if (ajson[stdate] && ajson[stdate][sg]) {
							acatData += parseFloat(ajson[stdate][sg].value)+",true,";
							
						} else if (prdate && ajson[nlapiDateToString(prdate)] && ajson[nlapiDateToString(prdate)][sg]) {
							log('debug','seg max'+sg,mktSegActualMaxDate[sg]);
							log('debug','tdate',tdate);
							
							if (mktSegActualMaxDate[sg] && tdate <= new Date(mktSegActualMaxDate[sg])) {
								
								//if current rpt date is on or before Max actual report date for the segment,
								//	use previous amount as Actual
								acatData += parseFloat(ajson[nlapiDateToString(prdate)][sg].value)+",true,";
							} else if (pjson[stdate] && pjson[stdate][sg]) {
								
								//if prevoius actual is after max actual,
								//	check to see if there is possible for report month
								
								acatData += parseFloat(pjson[stdate][sg].value)+",false,";
							} else {
								
								//other wise, use prevoius actual as projection
								
								acatData += parseFloat(ajson[nlapiDateToString(prdate)][sg].value)+",false,";
							}
						} else { 
							if (pjson[stdate] && pjson[stdate][sg]) {
								acatData += parseFloat(pjson[stdate][sg].value)+",false,";
							} else if (prdate && pjson[nlapiDateToString(prdate)] && pjson[nlapiDateToString(prdate)][sg]) {
								acatData += parseFloat(pjson[nlapiDateToString(prdate)][sg].value)+",false,";
							} else {
								acatData += "null,false,";
							}
						}
					}
					
					acatData = acatData.substring(0, (acatData.length - 1))+"]);";
					prdate = tdate;
				}
				tdate = nlapiAddMonths(tdate, 1);
			}
			
			acatHtml += acatData+
					   "var acatoption = {chartArea: {left: 150, top: 10}, title: 'Test', tooltip: {isHtml: true}, pointSize: 8, legend: {textStyle: {fontSize: 11}}, hAxis: {title: 'Actual Month'}, vAxis: {title: 'Actual Sales'}, width: 1100, height: 500};"+
					   "var acatchart = new google.visualization.LineChart(document.getElementById('acatchart_div'));"+
					   "acatchart.draw(aidata, acatoption);"+
					   "}"+
					   "</script>"+
					   "<div id='acatchart_div' style='width: 1100px; height: 600px;'></div>";
			
			acatgraphc.setDefaultValue(acatHtml);
			
		} else {
			acatgraphc.setDefaultValue('<i>No Data found. Try another Segment and/or date range</i>');
		}
		
	} catch (mrrrptuierr) {
		log('error','trend sl err',getErrText(mrrrptuierr));
		nlapiSendEmail(-5, primeNotifer, 'Error ax_sl_MRR_MarketSegmentAnalysis_UI.js', getErrText(mrrrptuierr), ccNotifier, null, null, null);
	}
	
	res.writePage(nsform);

}

