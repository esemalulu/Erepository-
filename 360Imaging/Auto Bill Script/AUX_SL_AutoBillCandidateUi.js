/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       27 Nov 2013     AnJoe
 *
 */

var ctx = nlapiGetContext();
var paramTerm = ctx.getSetting('SCRIPT','custscript_autobill_term');

 
/**
 * Mod Req: 1/17/2014
 * - Tool should search for Sales order.
 * - Selected Sales order should be turned to Invoice AND CC payment generated from Invoice.
 *   SO search Criteria
 *   	- Sales Orders that are not closed or cancelled
		- Track Status (custom field) = ‘Completed’
		- Billing Terms = ‘Auto’
		- Customer has a default CC on Customer record 
 */
var nsform = nlapiCreateForm('Auto Billable Sales Order Selection', false);

/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function autoBillUserInterface(req, res){

	nsform.setScript('customscript_ax_cs_autobill_ui_helper');
	
	//error message
	var errmsg = nsform.addField('custpage_err','inlinehtml','',null,null);
	errmsg.setLayoutType('outsideabove', 'startrow');
	
	try {
		
		
		var soStartDate = req.getParameter('custpage_invdate');
		var soEndDate = req.getParameter('custpage_sodateend');
		var soBillOnly = req.getParameter('custpage_onlyshowbilling');
		
		if (req.getMethod() == 'POST') {
			var invIdsProc = req.getParameter('custpage_invids');
			//nlapiGetContext().getUser();
			
			var params = new Array();
			params['custscript_autobproc_invid'] = invIdsProc
			params['custscript_autobproc_notif'] = ctx.getUser();
			nlapiScheduleScript('customscript_ax_ss_autobill_proc', 'customdeploy_ax_ss_autobill_proc', params);
			
			//redirect user to this page
			nlapiSetRedirectURL('SUITELET', ctx.getScriptId(), ctx.getDeploymentId(), false, null);
			
		} else {
		
			nsform.addButton('custpage_updsearch', 'Update Search Results', 'refreshResults()');
			var rangehelp = nsform.addField('custpage_daterangehelp', 'inlinehtml', '', null, null);
			rangehelp.setLayoutType('outsideabove','startrow');
			rangehelp.setDisplayType('inline');
			rangehelp.setDefaultValue('<b>To search for Sales Orders created in certain date range, <i>SO Created Date</i> is used as Start Date and '+
									  '<i>SO Created Date - Range End Date</i> is used as End Date.<br/>'+
									  'Singular Date search DO NOT provide any value for End Date field</b><br/><br/>'+
									  'Sales Order with Status of <b>Pending Billing</b> or <b>Partially Billed</b> can be Invoiced.');
			
			var procStatus = 'Available to Process';
			var canProc = true;
			//Script Instance Search for Unscheduled Clear SS
			var sdcflt = [new nlobjSearchFilter('scriptid', 'scriptdeployment', 'is','customdeploy_ax_ss_autobill_proc'),
			              new nlobjSearchFilter('status', null, 'noneof','COMPLETE')];
			
			var sdcol = [new nlobjSearchColumn('status'),
			             new nlobjSearchColumn('startdate').setSort(true)];
		
			var sdcrs = nlapiSearchRecord('scheduledscriptinstance', null, sdcflt, sdcol);
			if (sdcrs && sdcrs.length > 0) {
				
				if (procStatus!='Failed') {
					canProc = false;
					procStatus = 'Unavailable to Process: '+sdcrs[0].getValue('status');
				}
			}
			
			nsform.addFieldGroup('custpage_flt', 'Sales Order Search Criteria', null);
			
			var onlybillfld = nsform.addField('custpage_onlyshowbilling','checkbox','Only Show Billable SO', null, 'custpage_flt');
			onlybillfld.setDefaultValue(soBillOnly);
			
			var invdate = nsform.addField('custpage_invdate', 'date', 'SO Created Date', null, 'custpage_flt');
			invdate.setBreakType('startcol');
			invdate.setMandatory(true);
			//default date to today
			invdate.setDefaultValue(nlapiDateToString(new Date()));
			if (soStartDate) {
				invdate.setDefaultValue(soStartDate);
			} else {
				soStartDate = nlapiDateToString(new Date());
			}
			
			//SO Created Date Range End Date
			var soEndDateFld = nsform.addField('custpage_sodateend','date','SO Created Date -  Range End Date', null, 'custpage_flt');
			if (soEndDate) {
				soEndDateFld.setDefaultValue(soEndDate);
			}
			
			var terms = nsform.addField('custpage_terms','select', 'Terms', 'term','custpage_flt');
			terms.setMandatory(true);
			terms.setBreakType('startcol');
			terms.setDefaultValue(paramTerm);
			terms.setDisplayType('inline');
			
			var procstatusfd = nsform.addField('custpage_procst','text','Process Status',null,'custpage_flt');
			procstatusfd.setBreakType('startcol');
			procstatusfd.setDefaultValue(procStatus);
			procstatusfd.setDisplayType('inline');
			
			//hidden inv ids
			var invIds = nsform.addField('custpage_invids','longtext','inv ids', null, 'custpage_flt');
			invIds.setDisplayType('hidden');
			invIds.setMandatory(true);
			
			//grab all available invoices
			//Mod 12/23/2013 - Term should be coming from invoice, not customer
			//Mod 1/17/2014 - look for sales order
			var iflt = [new nlobjSearchFilter('type', null, 'anyof',['SalesOrd']),
			            new nlobjSearchFilter('mainline', null, 'is','F'),
			            new nlobjSearchFilter('cctype','customer','anyof',['3','4','5','6','7']),
			            new nlobjSearchFilter('ccdefault','customer','is','T'),
			            new nlobjSearchFilter('custbody_track_status', null, 'anyof','17'),
			            new nlobjSearchFilter('terms',null,'anyof',paramTerm),
			            new nlobjSearchFilter('taxline',null,'is','F'),
			            new nlobjSearchFilter('shipping',null,'is','F'),
			            new nlobjSearchFilter('cogs',null,'is','F')];
			
			//new nlobjSearchFilter('datecreated', null, 'within','today')
			//add in date based on user selection
			//soStartDate
			//soEndDate
			
			if (soBillOnly == 'T') {
				iflt.push(new nlobjSearchFilter('status', null, 'anyof',['SalesOrd:E','SalesOrd:F']));
			} else {
				iflt.push(new nlobjSearchFilter('status', null, 'noneof',['SalesOrd:C','SalesOrd:H']));
			}
			
			if (soStartDate && soEndDate) {
				iflt.push(new nlobjSearchFilter('datecreated', null, 'within', soStartDate, soEndDate));
			} else {
				//assume at this point only start date is provided
				iflt.push(new nlobjSearchFilter('datecreated', null, 'on', soStartDate));
			}
			
			var icol = [new nlobjSearchColumn('internalid', null, 'group'),
			            new nlobjSearchColumn('status', null, 'group'),
			            new nlobjSearchColumn('billingtransaction', null, 'group'),
			            new nlobjSearchColumn('recordtype','billingTransaction','group'),
			            new nlobjSearchColumn('status','billingTransaction','group'),
			            new nlobjSearchColumn('tranid', null, 'group'),
			            new nlobjSearchColumn('custbody2', null, 'group'), //Order Status
			            new nlobjSearchColumn('custbody_printing_status', null, 'group'), //Guide Status
			            new nlobjSearchColumn('trandate', null, 'max').setSort(true), //Tran Date
			            new nlobjSearchColumn('datecreated', null, 'group'),
			            new nlobjSearchColumn('internalid','customer', 'group'),
			            new nlobjSearchColumn('entityid','customer', 'group'),
			            new nlobjSearchColumn('amount', null, 'sum'),
			            new nlobjSearchColumn('ccinternalid','customer', 'max'),
			            new nlobjSearchColumn('ccnumber','customer', 'group'),
			            new nlobjSearchColumn('cctype','customer', 'max'),
			            new nlobjSearchColumn('ccholdername','customer', 'group'),
			            new nlobjSearchColumn('ccexpdate','customer', 'max')];
			
			var irs = nlapiSearchRecord('transaction', null, iflt, icol);
			
			var invlist = nsform.addSubList('custpage_invlist','list','Qualified Sales Order List');
			invlist.addMarkAllButtons();
			invlist.setHelpText('Please note following Process Limitations:<ul><li>Up to <b>1000 Matching Sales Order</b> will be shown</li><li>You can only process <b>20 Sales Orders at a time</b></li></ul>');
			if (irs && irs.length > 0) {
				
				if (canProc) {
					nsform.addSubmitButton('Process Auto Billing');
				}
				
				invlist.addField('invsl_sel', 'checkbox','Process');
				invlist.addField('invsl_anote','textarea','Note').setDisplayType('inline');
				invlist.addField('invsl_id', 'text','SO Internal ID').setDisplayType('hidden');
				invlist.addField('invsl_trxdate', 'text','SO Date');
				invlist.addField('invsl_trxcdate', 'text','SO Created');
				invlist.addField('invsl_trxid', 'text','SO Number');
				invlist.addField('invsl_sost', 'text','SO Status');
				invlist.addField('invsl_sostid','text','SO Status ID').setDisplayType('hidden');
				invlist.addField('invsl_billtrx','textarea','Billed Invoice').setDisplayType('inline');
				invlist.addField('invsl_ordst', 'text','Order Status');
				invlist.addField('invsl_guidest', 'text','Guide Status');
				invlist.addField('invsl_customer', 'text','Customer');
				invlist.addField('invsl_customerid', 'text','Customer Internal ID').setDisplayType('hidden');
				//invlist.addField('invsl_amt', 'currency','SO Amount');
				invlist.addField('invsl_ccvalid', 'text','CC Valid');
				invlist.addField('invsl_disablesel', 'text','Disable Selection').setDisplayType('hidden');
				invlist.addField('invsl_ccid', 'text','CC Internal ID').setDisplayType('hidden');
				invlist.addField('invsl_ccnum', 'text','CC Number');
				invlist.addField('invsl_cctype', 'text','CC Type');
				invlist.addField('invsl_ccholder', 'text','CC Holder');
				invlist.addField('invsl_ccexp', 'text','CC Expiration');
				
				var clinenum =1;
				var soid = '';
				var soinv = {};
				for (var c=0; c < irs.length; c++) {
					
					
					if (soid == irs[c].getValue('internalid',null,'group')) {
						
						//add on to invoice list
						soinv[soid]['list'].push({
													"id":irs[c].getValue('billingtransaction',null,'group'),
													"name":irs[c].getText('billingtransaction',null,'group'),
													"type":irs[c].getValue('recordtype','billingTransaction','group'),
													"status":irs[c].getValue('status','billingTransaction','group')
												});
						var invtxt = '';
						for (var iv=0; iv < soinv[soid]['list'].length; iv++) {
							if (soinv[soid]['list'][iv].type && soinv[soid]['list'][iv].type.indexOf('None') < 0) {
								invtxt += '<a href="'+nlapiResolveURL('RECORD', soinv[soid]['list'][iv].type, soinv[soid]['list'][iv].id, 'VIEW')+'" target="_blank">'+
										  'View '+soinv[soid]['list'][iv].name+' ('+soinv[soid]['list'][iv].status+')</a><br/>';
							}
						}
						invlist.setLineItemValue('invsl_billtrx',soinv[soid]['line'], invtxt);
						
					} else {
						soid = irs[c].getValue('internalid',null,'group');
						soinv[soid] = {"line":clinenum, "list":new Array()};
						soinv[soid]['list'].push({
													"id":irs[c].getValue('billingtransaction',null,'group'),
													"name":irs[c].getText('billingtransaction',null,'group'),
													"type":irs[c].getValue('recordtype','billingTransaction','group'),
													"status":irs[c].getValue('status','billingTransaction','group')
												});
						var expDateStr = irs[c].getValue('ccexpdate','customer','max');
						var expDateObj = new Date(parseInt(expDateStr.split('/')[0])+'/1/'+expDateStr.split('/')[1]);
						var expLastDayDateObj = nlapiAddDays(nlapiAddMonths(expDateObj, 1), -1);
						
						var isExpired = false;
						if (new Date() > expLastDayDateObj) {
							isExpired = true;
						}
						
						//invsl_anote
						var procNotes = '';
						var disableSel = false;
						if (irs[c].getValue('status',null,'group') !='SalesOrd:E' && irs[c].getValue('status',null,'group') !='SalesOrd:F') {
							disableSel = true;
							if (irs[c].getValue('status',null,'group') =='SalesOrd:G') {
								procNotes = '<span style="color:red"><b>SO Already Billed</b></span>';
							} else {
								procNotes = '<span style="color:red"><b>SO NOT in Billing Status</b></span>';
							}
						} else if (isExpired) {
							disableSel = true;
							procNotes = '<span style="color:red"><b>Default CC Expired</b><br/>';
						} 
						
						invlist.setLineItemValue('invsl_anote',clinenum, procNotes);
						
						var invLink = '';
						if (irs[c].getValue('recordtype','billingTransaction','group') && irs[c].getValue('recordtype','billingTransaction','group').indexOf('None') < 0) {
							invLink = '<a href="'+nlapiResolveURL('RECORD',
																  irs[c].getValue('recordtype','billingTransaction','group'),
																  irs[c].getValue('billingtransaction',null,'group'),
																  'VIEW')+'" target="_blank">'+
																  'View '+irs[c].getText('billingtransaction',null,'group')+' ('+irs[c].getValue('status','billingTransaction','group')+')</a><br/>';
						}
						
						
						invlist.setLineItemValue('invsl_billtrx',clinenum, irs[c].getText('billingtransaction',null,'group'));
						
						invlist.setLineItemValue('invsl_trxdate', clinenum, irs[c].getValue('trandate', null, 'max'));
						invlist.setLineItemValue('invsl_trxcdate', clinenum, irs[c].getValue('datecreated', null, 'group'));
						invlist.setLineItemValue('invsl_sost', clinenum, irs[c].getText('status',null,'group'));
						invlist.setLineItemValue('invsl_sostid', clinenum, irs[c].getValue('status',null,'group'));
						invlist.setLineItemValue('invsl_ordst', clinenum, irs[c].getText('custbody2',null,'group'));
						invlist.setLineItemValue('invsl_guidest', clinenum, irs[c].getText('custbody_printing_status',null,'group'));
						
						invlist.setLineItemValue('invsl_id', clinenum, irs[c].getValue('internalid',null,'group'));
						
						var soLink = '<a href="'+nlapiResolveURL('RECORD', 'salesorder', irs[c].getValue('internalid',null,'group'), 'VIEW')+'" target="_blank">View '+irs[c].getValue('tranid',null,'group')+'</a>';
						
						invlist.setLineItemValue('invsl_trxid', clinenum,soLink);
						invlist.setLineItemValue('invsl_customer', clinenum, irs[c].getValue('entityid','customer','group'));
						invlist.setLineItemValue('invsl_customerid', clinenum, irs[c].getValue('internalid','customer','group'));
						invlist.setLineItemValue('invsl_amt', clinenum, irs[c].getValue('amount',null,'sum'));
						invlist.setLineItemValue('invsl_ccvalid', clinenum, (isExpired?'<span style="color:red"><b>Expired</b></span>':'<span style="color:green"><b>Valid</b></span>'));
						invlist.setLineItemValue('invsl_disablesel', clinenum, disableSel);
						invlist.setLineItemValue('invsl_ccid', clinenum, irs[c].getValue('ccinternalid','customer','max'));
						invlist.setLineItemValue('invsl_ccnum', clinenum, irs[c].getValue('ccnumber','customer','group'));
						invlist.setLineItemValue('invsl_cctype', clinenum, irs[c].getText('cctype','customer','max'));
						invlist.setLineItemValue('invsl_ccholder', clinenum, irs[c].getValue('ccholdername','customer','group'));
						invlist.setLineItemValue('invsl_ccexp', clinenum, irs[c].getValue('ccexpdate','customer','max'));
						clinenum++;
					}
				}
			}
		}
		
	} catch (aberr) {
		log('error','Error with Auto Bill UI', getErrText(aberr));
		nlapiCreateError('ABERR-UI', getErrText(aberr), false);
		
		errmsg.setDefaultValue('<span style="color: red"><b>'+getErrText(aberr)+'</b></span><br/>');
		
	}
	
	res.writePage(nsform);	
			
}
