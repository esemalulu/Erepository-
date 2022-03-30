/**
 * Author: Audaxium
 * Desc: Allows users to select contract items to attach to Support Case
*/

function contractItemConfigForSupport(req, res) {
	var contractHeaderId = req.getParameter('custpage_contractheader');
	var customerId = req.getParameter('custpage_customerid');
	var recordType = req.getParameter('custpage_rectype');
	var rooms = req.getParameterValues('custpage_rooms');
	var sites = req.getParameterValues('custpage_sites');
	var existingContractIds = req.getParameter('custpage_existing');
	
	var nsform = nlapiCreateForm('Contract Items on Support Case Assistance', true);
	//set script
	nsform.setScript('customscript_ax_cs_conitemconfig_helper');
	
	var procmsg = nsform.addField('custpage_procmsg', 'textarea', '', null, null);
	procmsg.setLayoutType('outsideabove');
	procmsg.setDisplayType('inline');
	
	try {
		
		var hiddenRecType = nsform.addField('custpage_rectype','text','',null,null);
		hiddenRecType.setDisplayType('hidden');
		hiddenRecType.setDefaultValue(recordType);
		
		var hiddenExistOnCase = nsform.addField('custpage_existing','textarea','',null,null);
		hiddenExistOnCase.setDefaultValue(existingContractIds);
		hiddenExistOnCase.setDisplayType('hidden');
		
		//group a
		nsform.addFieldGroup('custpage_grpa', 'Contract Info');
		
		var customerFld = nsform.addField('custpage_customerid', 'select', 'Customer: ', 'customer', 'custpage_grpa');
		customerFld.setMandatory(true);
		if (customerId) {
			
			//add submit button at this point
			if (contractHeaderId) {
				nsform.addSubmitButton('Search for Contracts Items');
			} else {
				nsform.addSubmitButton('Search for Contracts');
				nsform.addButton('custpage_gotocitem', 'Display Contract Items', 'goToContractItem()');
			}
			
			//set to selected
			customerFld.setDefaultValue(customerId);
			customerFld.setDisplayType('disabled');
			
			var contractHeaderFld = nsform.addField('custpage_contractheader','select','Contract: ',null, 'custpage_grpa');
			if (contractHeaderId) {
				contractHeaderFld.setMandatory(true);
			} else {
				//contract search step. disable it
				contractHeaderFld.setDisplayType('disabled');
			}
			contractHeaderFld.addSelectOption('', '', true);
			//search for contracts based on customer
			var chflt = [new nlobjSearchFilter('custrecord_acmch_customer', null, 'anyof', customerId)];
			
			if (rooms && rooms.length > 0) {
				log('debug','rooms',rooms);
				chflt.push(new nlobjSearchFilter('custrecord_siteroom', 'CUSTRECORD_CONTRACTROOM', 'anyof', rooms));
			}
			
			if (sites && sites.length > 0) {
				chflt.push(new nlobjSearchFilter('custrecord_acmch_sites', null, 'anyof', sites));
			}
			
			var chcol = [new nlobjSearchColumn('internalid', null, 'group'),
						 new nlobjSearchColumn('name', null, 'group'),
			             new nlobjSearchColumn('custrecord_acmch_sites', null, 'group'),
			             new nlobjSearchColumn('custrecord_acmch_status', null, 'group'),
			             new nlobjSearchColumn('custrecord_acmch_startdate', null, 'group'),
			             new nlobjSearchColumn('custrecord_acmch_enddate', null, 'group')];
			var chrslt = nlapiSearchRecord('customrecord_acm_contractheader', null, chflt, chcol);
			for (var ch=0; chrslt && ch < chrslt.length; ch++) {
				var contractOptionText = chrslt[ch].getValue('name', null, 'group');
				if (chrslt[ch].getValue('custrecord_acmch_status', null, 'group')) {
					contractOptionText += '('+chrslt[ch].getText('custrecord_acmch_status');
				}
				contractHeaderFld.addSelectOption(chrslt[ch].getValue('internalid', null, 'group'), contractOptionText, false);
			}
			contractHeaderFld.setBreakType('startcol');
			
			//additiona search filters
			nsform.addFieldGroup('custpage_grpb','Additional Search Filters');
			
			var roomsfld = nsform.addField('custpage_rooms','multiselect','Contract Rooms: ', null, 'custpage_grpb');
			roomsfld.addSelectOption('', '', false);
			
			var sitesfld = nsform.addField('custpage_sites','multiselect','Contract Sites: ', null, 'custpage_grpb');
			sitesfld.addSelectOption('', '', false);
			
			if (!contractHeaderId) {
				//MOD. Only display Rooms and Sites belonging to selected Customer
				
				var crflt = [new nlobjSearchFilter('custrecord_customersroom', null, 'anyof', customerId)];
				var crcol = [new nlobjSearchColumn('name'),
				             new nlobjSearchColumn('custrecord_acmr_site').setSort(true)];
				var croomrs = nlapiSearchRecord('customrecord_acm_room_ref', null, crflt, crcol);
				
				var csflt = [new nlobjSearchFilter('custrecord_customerowner', null, 'anyof', customerId)];
				var cscol = [new nlobjSearchColumn('name')];
				var csiters = nlapiSearchRecord('customrecord_acm_site_ref', null, csflt, cscol);
				
				for (var cr1=0; croomrs && cr1 < croomrs.length; cr1++) {
					roomsfld.addSelectOption(croomrs[cr1].getId(),
											 croomrs[cr1].getValue('name')+' ('+croomrs[cr1].getText('custrecord_acmr_site')+')', false);
				}
				
				for (var cs1=0; csiters && cs1 < csiters.length; cs1++) {
					sitesfld.addSelectOption(csiters[cs1].getId(),
											 csiters[cs1].getValue('name'), false);
				}
				
			}
			
			
			
			//Mod req: add ability to search for specific contracts
			if (!contractHeaderId) {
				var contractsSublist = nsform.addSubList('custpage_contractsublist', 'list', 'Contracts for Customer selected', null);
				contractsSublist.setHelpText('Below are list contracts for Customer selected. You can further your Contract search by providing Site and/or Room.');
				//select item checkbox
				contractsSublist.addField('ccs_selectcontract', 'checkbox', 'Set Contract', null);
				var ctid = contractsSublist.addField('ccs_ctid', 'text','',null);
				ctid.setDisplayType('hidden');
				contractsSublist.addField('ccs_contractname','text','Name',null);
				contractsSublist.addField('ccs_status','text','Status',null);
				contractsSublist.addField('ccs_site','text','Site',null);
				contractsSublist.addField('ccs_startdate','text','Start Date',null);
				contractsSublist.addField('ccs_enddate','text','End Date', null);

				var ccline = 1;
				for (var cc=0; chrslt && cc < chrslt.length; cc++) {
					contractsSublist.setLineItemValue('ccs_ctid', ccline, chrslt[cc].getValue('internalid', null, 'group'));
					contractsSublist.setLineItemValue('ccs_contractname', ccline, chrslt[cc].getValue('name', null, 'group'));
					contractsSublist.setLineItemValue('ccs_status', ccline, chrslt[cc].getText('custrecord_acmch_status', null, 'group'));
					contractsSublist.setLineItemValue('ccs_site', ccline, chrslt[cc].getText('custrecord_acmch_sites', null, 'group'));
					contractsSublist.setLineItemValue('ccs_startdate', ccline, chrslt[cc].getValue('custrecord_acmch_startdate', null, 'group'));
					contractsSublist.setLineItemValue('ccs_enddate', ccline, chrslt[cc].getValue('custrecord_acmch_enddate', null, 'group'));
					ccline++;
				}
			}
			
			
			
			if (contractHeaderId) {
				contractHeaderFld.setDefaultValue(contractHeaderId);
				//search for unique rooms and sites for This Contract Header
				var cirsflt = [new nlobjSearchFilter('custrecord_itemcontractid', null, 'anyof', contractHeaderId)];
				//search unique rooms for matching contract headers
				var circol = [new nlobjSearchColumn('custrecord_acmci_locatedroom', null, 'group')];
				//search unique sites for matching contract headers
				var ciscol = [new nlobjSearchColumn('custrecord_acmci_room_site', null, 'group')];
				
				var cirrslt = nlapiSearchRecord('customrecord_acm_contractitem', null, cirsflt, circol);
				var cisrslt = nlapiSearchRecord('customrecord_acm_contractitem', null, cirsflt, ciscol);
								
				for (var cir=0; cirrslt && cir < cirrslt.length; cir++) {
					roomsfld.addSelectOption(cirrslt[cir].getValue('custrecord_acmci_locatedroom', null, 'group'),
											 cirrslt[cir].getText('custrecord_acmci_locatedroom', null, 'group'), false);
				}
				
				for (var cis=0; cisrslt && cis < cisrslt.length; cis++) {
					sitesfld.addSelectOption(cisrslt[cis].getValue('custrecord_acmci_room_site', null, 'group'),
											 cisrslt[cis].getText('custrecord_acmci_room_site', null, 'group'), false);
				}
			}
		}
		
		if (customerId && contractHeaderId) {
			var onCaseAlready = new Array();
			if (existingContractIds) {
				onCaseAlready = existingContractIds.split(',');
			}
			//post does the search of all contract items that matches contract header and add contract item sublist
			if (recordType == 'supportcase') {
				//if it's called from supportcase, call add to sublist
				nsform.addButton('custpage_createcase', 'Add To Case', 'addToCaseSublist()');
			} else {
				//other wise, go to new case
				nsform.addButton('custpage_createcase', 'Create Case', 'redirectToCreateCase()');
			}
			
			
			var ciflt = [new nlobjSearchFilter('custrecord_itemcontractid', null, 'anyof', contractHeaderId)];
			//add in additional filters
			if (rooms && rooms.length > 0) {
				ciflt.push(new nlobjSearchFilter('custrecord_acmci_locatedroom', null, 'anyof', rooms));
			}
			
			if (sites && sites.length > 0) {
				ciflt.push(new nlobjSearchFilter('custrecord_acmci_room_site', null, 'anyof', sites));
			}
			
			var cicol = [new nlobjSearchColumn('custrecord_contractitem'),
			             new nlobjSearchColumn('custrecord_acmci_serialnumber'),
			             new nlobjSearchColumn('custrecord_acmci_item_status'),
			             new nlobjSearchColumn('custrecord_acmci_contractenddate'),
			             new nlobjSearchColumn('custrecord_acmci_servicelevel'),
			             new nlobjSearchColumn('custrecord_acmci_locatedroom'),
			             new nlobjSearchColumn('custrecord_acmci_room_site')];
			var cirslt = nlapiSearchRecord('customrecord_acm_contractitem', null, ciflt, cicol);
			
			var cItemSublist = nsform.addSubList('custpage_citemsublist', 'list', 'Contract Items to Add to Case', null);
			cItemSublist.setHelpText('If Contract Item already exists in the Case, It will NOT be available for selection.');
			cItemSublist.addMarkAllButtons();
			//select item checkbox
			cItemSublist.addField('cis_selectitem', 'checkbox', 'Add to Case', null);
			var cid = cItemSublist.addField('cis_citemid', 'text','',null);
			cid.setDisplayType('hidden');
			cItemSublist.addField('cis_item','text','Item',null);
			//cItemSublist.addField('cis_room','text','Located Room',null);
			//cItemSublist.addField('cis_site','text','Site',null);
			cItemSublist.addField('cis_item_status','text','Contract Item Status',null);
			cItemSublist.addField('cis_item_servicelvl','text','Contract Item Service Level', null);
			cItemSublist.addField('cis_item_contractend','text','Item Contract End Date', null);
			cItemSublist.addField('cis_item_serial','text','Item Serial #', null);
			
			var ciline = 1;
			for (var ci=0; cirslt && ci < cirslt.length; ci++) {
				//only show NEW ones
				log('debug','onCaseAlready', onCaseAlready);
				if (!onCaseAlready.contains(cirslt[ci].getId())) {
					cItemSublist.setLineItemValue('cis_citemid', ciline, cirslt[ci].getId());
					cItemSublist.setLineItemValue('cis_item', ciline, cirslt[ci].getText('custrecord_contractitem'));
					//cItemSublist.setLineItemValue('cis_room', ciline, cirslt[ci].getText('custrecord_acmci_locatedroom'));
					//cItemSublist.setLineItemValue('cis_site', ciline, cirslt[ci].getText('custrecord_acmci_room_site'));
					cItemSublist.setLineItemValue('cis_item_status', ciline, cirslt[ci].getText('custrecord_acmci_item_status'));
					cItemSublist.setLineItemValue('cis_item_servicelvl', ciline, cirslt[ci].getText('custrecord_acmci_servicelevel'));
					cItemSublist.setLineItemValue('cis_item_contractend', ciline, cirslt[ci].getValue('custrecord_acmci_contractenddate'));
					cItemSublist.setLineItemValue('cis_item_serial', ciline, cirslt[ci].getValue('custrecord_acmci_serialnumber'));
					ciline++;
				}
			}
			
		}
		
		
		
	} catch (cicerr) {
		log('debug','Error Contract Item Config',getErrText(cicerr));
		procmsg.setDefaultValue(getErrText(cicerr));
	}
	
	
	res.writePage(nsform);
}