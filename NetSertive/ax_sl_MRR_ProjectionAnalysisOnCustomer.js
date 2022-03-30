/**
 * Suitelet to be displayed on Customer record to show projection against actual mrr to future
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

function mrrProjectionAnalysis(req, res){
	
	var nsform = nlapiCreateForm('MRR Projection Analysis', true);
	var customerId = '';
	if (req && req.getParameter('customerid')) {
		customerId = req.getParameter('customerid');
	}
	//error message if any
	var msgfld = nsform.addField('custpage_msg', 'inlinehtml', '', null, null);
	
	try {
		
		//json object holding actual MRR value
		var actjson = {};
		
		//bring out Actual MRR for this customer
		var actflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
		              new nlobjSearchFilter('custrecord_abmrr_customer', null, 'anyof',customerId),
		              new nlobjSearchFilter('custrecord_abmrr_subs_status', null, 'noneof','2')];
		var actcol = [new nlobjSearchColumn('internalid'),
		              new nlobjSearchColumn('custrecord_abmrr_item'),
		              new nlobjSearchColumn('custrecord_abmrr_linevalue'),
		              new nlobjSearchColumn('custrecord_abmrr_techlinevalue'),
		              new nlobjSearchColumn('custrecord_abmrr_terminationdt')];

		var actrs = nlapiSearchRecord('customrecord_ax_baseline_mrr', null, actflt, actcol);
		for (var a=0; actrs && a < actrs.length; a++) {
			var amrrId = actrs[a].getValue('internalid');
			actjson[amrrId] = {
				'itemname':actrs[a].getText('custrecord_abmrr_item'),
				'itemid':actrs[a].getValue('custrecord_abmrr_item'),
				'itemvalue':actrs[a].getValue('custrecord_abmrr_linevalue'),
				'itemtechvalue':actrs[a].getValue('custrecord_abmrr_techlinevalue'),
				'projectedvalue':0,
				'projectedvaluedisplay':'',
				'projectedtechvalue':0,
				'projectedtechvaluedisplay':'',
				'projection':'',
				'terminatedate':actrs[a].getValue('custrecord_abmrr_terminationdt')
			};			
		}
		
		//bring out Project MRR for this customer.
		//Recalculate Projected Baseline for Customer
		//get ALL Active OPEN Possible Opportunities Historical MRR for Customer that are in the FUTURE date
		
		//unmapped new item projections
		var projson = {};
		
		var strToday = nlapiDateToString(new Date());
		var hisflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
		              new nlobjSearchFilter('custrecord_hbmrr_customer', null, 'anyof',customerId),
		              new nlobjSearchFilter('custrecord_hbmrr_historytype', null, 'anyof',paramHistPossibleId),
		              new nlobjSearchFilter('custrecord_hbmrr_poexpclosedt', null, 'onorafter', strToday),
		              new nlobjSearchFilter('custrecord_hbmrr_projection', null, 'noneof', paramPrjTerminationId)];
		
		//Include Status of 13 - Customer Won as one of open status.
		//When Opp is turned to SO, it will have value of 13
		openOppStatusIds.push('13');
		hisflt.push(new nlobjSearchFilter('entitystatus','custrecord_hbmrr_opportunity', 'anyof',openOppStatusIds));
		
		var hiscol = [new nlobjSearchColumn('custrecord_hbmrr_item'),
		              new nlobjSearchColumn('custrecord_hbmrr_abmrr_ref'),
		              new nlobjSearchColumn('custrecord_hbmrr_linevalue'),
		              new nlobjSearchColumn('custrecord_hbmrr_techlinevalue')];
		
		var hisrs = nlapiSearchRecord('customrecord_ax_historybaseline_mrr', null, hisflt, hiscol);
		log('debug','history searched','');
		//loop through each history possibles.
		for (var h=0; hisrs && h < hisrs.length; h++) {
			log('debug','proj',hisrs.length);
			//loop through each history possibles and match up against existing actual.
			//IF actual isn't mapp, this means, it's net new item 
			//	- NetNew Items will get added into actjson with new[itemId]
			var abmrrRefId = hisrs[h].getValue('custrecord_hbmrr_abmrr_ref');
			//if possible is linked to current actual and actual item matches possible item update projection
			if (abmrrRefId && 
				actjson[abmrrRefId] && 
				actjson[abmrrRefId].itemid == hisrs[h].getValue('custrecord_hbmrr_item')) {
				//update projection 
				//2/24/2016 - Add in technical values
				var prjVal = parseFloat(actjson[abmrrRefId].projectedvalue) + parseFloat(hisrs[h].getValue('custrecord_hbmrr_linevalue')),
					prjTechVal = parseFloat(actjson[abmrrRefId].projectedtechvalue) + parseFloat(hisrs[h].getValue('custrecord_hbmrr_techlinevalue'));
				actjson[abmrrRefId].projectedvalue = prjVal;
				actjson[abmrrRefId].projectedvaluedisplay = prjVal;
				
				actjson[abmrrRefId].projectedtechvalue = prjTechVal;
				actjson[abmrrRefId].projectedtechvaluedisplay = prjTechVal;
			} else {
				//Add to projson object as Net New Item
				var proid = 'new'+hisrs[h].getValue('custrecord_hbmrr_item');
				log('debug','proid',proid);
				if (!projson[proid]) {
					projson[proid] = {
						'itemname':hisrs[h].getText('custrecord_hbmrr_item'),
						'itemvalue':hisrs[h].getValue('custrecord_hbmrr_linevalue'),
						'itemtechvalue':hisrs[h].getValue('custrecord_hbmrr_techlinevalue')
					};
				} else {
					projson[proid].itemvalue = parseFloat(projson[proid].itemvalue) + parseFloat(hisrs[h].getValue('custrecord_hbmrr_linevalue'));
					projson[proid].itemtechvalue = parseFloat(projson[proid].itemvalue) + parseFloat(hisrs[h].getValue('custrecord_hbmrr_techlinevalue'));
				}
			}
		}
		
		var trendUrl = nlapiResolveURL('SUITELET', 'customscript_ns_ax_sl_mrr_trend_mktseg', 'customdeploy_ns_ax_sl_mrr_trend_mktseg', 'VIEW')+'&hidenav=T&custpage_custid='+customerId;
		var html = '<a href="'+trendUrl+'" target="_blank">View Trend for This Account</a><br/><br/>'+
				   '<table border="1" cellpadding="2" cellspacing="0" width="500px" style="font-size: 11px">'+
				   '<tr>'+
				   '<td><b>Actual MRR Item</b></td>'+
				   '<td><b>Actual Value</b></td>'+
				   '<td><b>Projected Value</b></td>'+
				   '<td><b>Technical Actual Value</b></td>'+
				   '<td><b>Technical Projected Value</b></td>'+
				   '<td><b>Projection</b></td>'+
				   '<tr>';
		
		for (var am in actjson) {
			
			var projectionDetail = 'Neutral';
			
			if (actjson[am].terminatedate) {
				projectionDetail = 'Termination';
			} else {
				if (actjson[am].projectedvaluedisplay) {
					if (parseFloat(actjson[am].projectedvaluedisplay) > parseFloat(actjson[am].itemvalue)) {
						projectionDetail = 'Upgrade';
					} else if (parseFloat(actjson[am].projectedvaluedisplay) < parseFloat(actjson[am].itemvalue)) {
						projectionDetail = 'Downgrade';
					}
				}
			}
			
			log('debug','prjv',actjson[am].projectedvaluedisplay);
			html += '<tr>'+
					'<td>'+actjson[am].itemname+'</td>'+
					'<td>'+nlapiFormatCurrency(actjson[am].itemvalue)+'</td>'+
					'<td>'+((!actjson[am].projectedvaluedisplay || actjson[am].terminatedate)?' - ':nlapiFormatCurrency(actjson[am].projectedvaluedisplay))+'</td>'+
					'<td>'+nlapiFormatCurrency(actjson[am].itemtechvalue)+'</td>'+
					'<td>'+((!actjson[am].projectedtechvaluedisplay || actjson[am].terminatedate)?' - ':nlapiFormatCurrency(actjson[am].projectedtechvaluedisplay))+'</td>'+
					'<td>'+projectionDetail+'</td>'+
					'<tr>';
		}
		
		//loop through net new possibilities
		for (var pm in projson) {
			log('debug','pm',pm);
			html += '<tr>'+
					'<td>'+projson[pm].itemname+'</td>'+
					'<td> - </td>'+
					'<td>'+nlapiFormatCurrency(projson[pm].itemvalue)+'</td>'+
					'<td> - </td>'+
					'<td>'+nlapiFormatCurrency(projson[pm].itemtechvalue)+'</td>'+
					'<td>New</td>'+
					'<tr>';
		}
		
		html += '</table>';
		
		
		//add it to msgfld
		msgfld.setDefaultValue(html);
		if (!customerId) {
			throw nlapiCreateError('MRRERR_NOCUSTOMER', 'No Customer ID is required to create this view', false);
		}
		
		
	} catch (mrrrptuierr) {
		log('error','SL Error',getErrText(mrrrptuierr));
		msgfld.setDefaultValue(getErrText(mrrrptuierr));
		
		nlapiSendEmail(-5, primeNotifer, 'Error ax_sl_MRR_ProjectionAnalysisOnCustomer.js', 'Customer Internal ID: '+customerId+'<br/>'+getErrText(mrrrptuierr), ccNotifier, null, null, null);
		
		
	}
	
	res.writePage(nsform);

}
