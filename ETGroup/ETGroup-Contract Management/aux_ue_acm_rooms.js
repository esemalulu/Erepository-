/**
 * Author: js@Audaxium
 * User event deployed for ACM Rooms to allow filtering of Customers and Sites based on Those Customers WITH Sites ONLY
 * 
 */

function acmRoomsBeforeLoad(type, form, request) {
	if ( (type == 'create' || type == 'edit') && ctx.getExecutionContext()=='userinterface') {
		//search for list of ALL customers WITH Sites
		var scflt = [new nlobjSearchFilter('isinactive', null, 'is','F')];
		var sccol = [new nlobjSearchColumn('custrecord_customerowner', null, 'group')];
		var scrslt = nlapiSearchRecord('customrecord_acm_site_ref', null, scflt, sccol);
		
		var jsonList = form.addField('custpage_hiddensitecustlist','inlinehtml','');
		//add a button that shows all customers that has Sites assigned
		if (scrslt && scrslt.length > 0) {
			
			var strJson = '<script language="javascript">var jlist = {';
			for (var i=0; i < scrslt.length; i++) {
				strJson += '"'+scrslt[i].getValue('custrecord_customerowner', null, 'group')+'":"'+scrslt[i].getText('custrecord_customerowner', null, 'group')+'"';
				if (scrslt.length != (i+1)) {
					strJson += ',';
				}
			}
			strJson += '};</script>';
			
			jsonList.setDefaultValue(strJson);
			
			//add link
			//custrecord_acmr_site
			var helperLink = form.addField('custpage_helperbutton','inlinehtml','');
			helperLink.setDefaultValue('<a href="#" onclick="showSiteCustomerHelper();"><b>Customers with Site Assigned</b></a>');
			form.insertField(helperLink, 'custrecord_acmr_site');
			
		}
	}
	
	//create custom sublist to view Support Cases linked to THIS room
	if ( (type == 'edit' || type == 'view')  && ctx.getExecutionContext()=='userinterface') {
		
		//add custom tab
		form.addTab('custpage_relations','Related Support Cases and Contracts');
		
		
		
		var roomid = nlapiGetRecordId();
		log('debug','roomid',roomid);
		//Search ACM Contract Item Support Case record 
		//Filter based on Contract Item Room ID is THIS room ID
		var cflt = [new nlobjSearchFilter('custrecord_acmci_locatedroom', 'CUSTRECORD_ACMCISC_CONTRACTITEM','is',roomid)];
		var ccol = [new nlobjSearchColumn('custrecord_acmcisc_supportcase').setSort(true), //linked support case
		            new nlobjSearchColumn('casenumber','CUSTRECORD_ACMCISC_SUPPORTCASE'), //case number
		            new nlobjSearchColumn('stage','CUSTRECORD_ACMCISC_SUPPORTCASE'), //case stage
		            new nlobjSearchColumn('status','CUSTRECORD_ACMCISC_SUPPORTCASE'), //case status
		            new nlobjSearchColumn('title','CUSTRECORD_ACMCISC_SUPPORTCASE'), //case title
		            new nlobjSearchColumn('assigned','CUSTRECORD_ACMCISC_SUPPORTCASE'), //case assigned
		            new nlobjSearchColumn('custrecord_contractitem','CUSTRECORD_ACMCISC_CONTRACTITEM'), //contracted item
		            new nlobjSearchColumn('custrecord_acmci_serialnumber','CUSTRECORD_ACMCISC_CONTRACTITEM'), //contract item serial num
		            new nlobjSearchColumn('custrecord_acmci_salesorders','CUSTRECORD_ACMCISC_CONTRACTITEM'), //linked sales order
		            new nlobjSearchColumn('custrecord_acmci_item_status','CUSTRECORD_ACMCISC_CONTRACTITEM')]; //contract item status
		var crslt = nlapiSearchRecord('customrecord_acm_contractitem_case', null, cflt, ccol);
		
		//add custom sublist
		var caselist = form.addSubList('custpage_linkedcases','list','Related Support Cases', 'custpage_relations');
		caselist.setHelpText('&nbsp; List of support cases linked to this room');
		
		caselist.addField('custpage_lc_viewcase','textarea','View Case',null);
		caselist.addField('custpage_lc_cnumber','text','Case Number',null);
		caselist.addField('custpage_lc_ctitle','text','Case Title',null);
		caselist.addField('custpage_lc_cstagestatus','text','Case Stage/Status',null);
		caselist.addField('custpage_lc_cassigned','text','Case Assigned',null);
		caselist.addField('custpage_lc_citem','text','Item',null);
		caselist.addField('custpage_lc_citemser','text','Item Serial Number',null);
		
		var line = 1;
		for (var c=0; crslt && c < crslt.length; c++) {
			var supportCaseLink = '<a target="_blank" href="https://system.netsuite.com'+nlapiResolveURL('RECORD', 'supportcase', crslt[c].getValue('custrecord_acmcisc_supportcase'), 'VIEW')+'">View Case</a>';
			var casestgstu = crslt[c].getText('stage','CUSTRECORD_ACMCISC_SUPPORTCASE') +'/'+crslt[c].getText('status','CUSTRECORD_ACMCISC_SUPPORTCASE');
			
			caselist.setLineItemValue('custpage_lc_viewcase', line, supportCaseLink);
			caselist.setLineItemValue('custpage_lc_cnumber', line, crslt[c].getValue('casenumber','CUSTRECORD_ACMCISC_SUPPORTCASE'));
			caselist.setLineItemValue('custpage_lc_ctitle', line,  crslt[c].getText('custrecord_acmcisc_supportcase'));
			caselist.setLineItemValue('custpage_lc_cstagestatus', line, casestgstu);
			caselist.setLineItemValue('custpage_lc_cassigned', line, crslt[c].getText('assigned','CUSTRECORD_ACMCISC_SUPPORTCASE'));
			caselist.setLineItemValue('custpage_lc_citem', line, crslt[c].getText('custrecord_contractitem','CUSTRECORD_ACMCISC_CONTRACTITEM'));
			caselist.setLineItemValue('custpage_lc_citemser', line, crslt[c].getValue('custrecord_acmci_serialnumber','CUSTRECORD_ACMCISC_CONTRACTITEM'));
			
			line++;
		}
		
		//search ACM Contract Item for list of contracts for THIS room
		//Filter based on Contract Item Room ID is THIS room ID
		var tflt = [new nlobjSearchFilter('custrecord_acmci_locatedroom', null,'is',roomid)];
		var tcol = [new nlobjSearchColumn('custrecord_itemcontractid').setSort(true), //linked contract
		            new nlobjSearchColumn('custrecord_contracttype','CUSTRECORD_ITEMCONTRACTID'), //type
		            new nlobjSearchColumn('name','CUSTRECORD_ITEMCONTRACTID'), //name
		            new nlobjSearchColumn('custrecord_acmch_status','CUSTRECORD_ITEMCONTRACTID'), //contract status
		            new nlobjSearchColumn('custrecord_acmch_contractlevel','CUSTRECORD_ITEMCONTRACTID'), //level
		            new nlobjSearchColumn('custrecord_acmch_startdate','CUSTRECORD_ITEMCONTRACTID'), //start
		            new nlobjSearchColumn('custrecord_acmch_enddate','CUSTRECORD_ITEMCONTRACTID'), //end
		            new nlobjSearchColumn('custrecord_acmch_daystoexpire','CUSTRECORD_ITEMCONTRACTID'), //expire in days
		            new nlobjSearchColumn('custrecord_acmch_terms','CUSTRECORD_ITEMCONTRACTID'), //terms
		            new nlobjSearchColumn('custrecord_acmch_transaction','CUSTRECORD_ITEMCONTRACTID')]; //linked transactions
		var trslt = nlapiSearchRecord('customrecord_acm_contractitem', null, tflt, tcol);
		//add custom sublist
		var ttlist = form.addSubList('custpage_linkedct','list','Related Contracts', 'custpage_relations');
		ttlist.setHelpText('&nbsp; List of Contracts linked to this room');
		
		ttlist.addField('custpage_lct_viewct','textarea','View Contract',null);
		ttlist.addField('custpage_lct_cname','text','Name',null);
		ttlist.addField('custpage_lct_clevel','text','Level',null);
		ttlist.addField('custpage_lct_cterm','text','Term',null);
		ttlist.addField('custpage_lct_cstatus','text','Status',null);
		ttlist.addField('custpage_lct_crange','text','Range',null);
		//ttlist.addField('custpage_lct_ctrxes','text','Transactions',null);
		
		var tline = 1;
		var displayedContracts = new Array();
		for (var t=0; trslt && t < trslt.length; t++) {
			
			if (trslt[t].getValue('custrecord_itemcontractid') && !displayedContracts.contains(trslt[t].getValue('custrecord_itemcontractid'))) {
				displayedContracts.push(trslt[t].getValue('custrecord_itemcontractid'));
			
				var contractLink = '<a target="_blank" href="https://system.netsuite.com'+nlapiResolveURL('RECORD', 'customrecord_acm_contractheader', trslt[t].getValue('custrecord_itemcontractid'), 'VIEW')+'">View Contract</a>';
				var startd = trslt[t].getValue('custrecord_acmch_startdate','CUSTRECORD_ITEMCONTRACTID')?trslt[t].getValue('custrecord_acmch_startdate','CUSTRECORD_ITEMCONTRACTID'):'N/A';
				var endd = trslt[t].getText('custrecord_acmch_enddate','CUSTRECORD_ITEMCONTRACTID')?trslt[t].getText('custrecord_acmch_enddate','CUSTRECORD_ITEMCONTRACTID'):'N/A';
				var expiryd = trslt[t].getValue('custrecord_acmch_daystoexpire','CUSTRECORD_ITEMCONTRACTID')?trslt[t].getValue('custrecord_acmch_daystoexpire','CUSTRECORD_ITEMCONTRACTID'):'N/A';
				var crangetext = startd +' - '+endd+
								 ' Expire in <b>'+expiryd+'</b> day(s)';
				
				ttlist.setLineItemValue('custpage_lct_viewct', tline, contractLink);
				ttlist.setLineItemValue('custpage_lct_cname', tline, trslt[t].getValue('name','CUSTRECORD_ITEMCONTRACTID'));
				ttlist.setLineItemValue('custpage_lct_clevel', tline,  trslt[t].getText('custrecord_acmch_contractlevel','CUSTRECORD_ITEMCONTRACTID'));
				ttlist.setLineItemValue('custpage_lct_cterm', tline, trslt[t].getText('custrecord_acmch_terms','CUSTRECORD_ITEMCONTRACTID'));
				ttlist.setLineItemValue('custpage_lct_cstatus', tline, trslt[t].getText('custrecord_acmch_status','CUSTRECORD_ITEMCONTRACTID'));
				ttlist.setLineItemValue('custpage_lct_crange', tline, crangetext);
				//ttlist.setLineItemValue('custpage_lct_ctrxes', line, crslt[c].getValue('custrecord_acmci_serialnumber','CUSTRECORD_ACMCISC_CONTRACTITEM'));
				
				tline++;
			}
			
			
		}
		
		
		
		
	}
	
	
}

