/**
 * Author: joe.son@audaxium.com
 * Date: 3/6/2013
 * Desc:
 * Configurator that allows user to select one of Subs. Renewal or training item and add all related sub items into opportunity.
 * IMPORTANT NOTE:
 * This Suitelet makes use of saved search to allow most flexibility.
 * Saved Search: Opportunity/Quote Config 1st Level-Use by Script (customsearch_oppqte_config_1stlvlitems)
 * Department MUST be part of result set. 
 *  
 */

var nsform = null;
function SoftwareTrainingPkgConfigurator(req, res){
	nsform = nlapiCreateForm('Software Package Item Configurator', true);
	nsform.setScript('customscript_ax_cs_opp_line_sl_helper');
	
	//add message display 
	var msgFld = nsform.addField('custpage_procmsg', 'textarea', '', null, null);
	msgFld.setLayoutType('outsideabove');
	msgFld.setDisplayType('inline');

	var deptSelection = req.getParameter('custpage_deptflt')?req.getParameter('custpage_deptflt'):'';
	var lvlSelection = req.getParameterValues('custpage_lvloneitem')?req.getParameterValues('custpage_lvloneitem'):'';
	log('debug','lvlSelection',lvlSelection);
	var lvlQty = req.getParameter('custpage_lvloneqty')?req.getParameter('custpage_lvloneqty'):'';
	
	try {
		nsform.addSubmitButton('Search All Related Items');
		
		//add result grouping
		nsform.addFieldGroup('custpage_a', 'Configuration');
		
		//search for level one items
		//item type of Inventory, Non Inventory AND
		//item class of Software (1) AND
		//itemid (Name) does NOT contain "upgrade"
		var lvlOneRslt = nlapiSearchRecord('item', 'customsearch_oppqte_config_1stlvlitems',null, null);
		/**
		 * jsonItemByDept will build out json list of items by department.
		 * Result of this json will be strigified into hidden Suitelet Field 
		 * so that Suitelets' client helper function can dynamically rebuild item list
		 * when department is changed
		 * [dept]:{
		 *  depttext:[depttextvalue],
		 * 	items:{
		 *   [itemid]:[item text]
		 *  },...
		 * }
		 */
		var jsonItemByDept = {};
		for(var i=0; lvlOneRslt && i < lvlOneRslt.length; i++) {
			var deptid = lvlOneRslt[i].getValue('department');
			var depttext = lvlOneRslt[i].getText('department');
			var itemid = lvlOneRslt[i].getId();
			var itemtext = '('+lvlOneRslt[i].getValue('itemid')+') '+lvlOneRslt[i].getValue('displayname');
			
			if (!jsonItemByDept[deptid]) {
				jsonItemByDept[deptid]={};
				jsonItemByDept[deptid]['items']={};
			}
			jsonItemByDept[deptid]['depttext']=depttext;
			//check to see if itemid exists in items sub json object
			if (!jsonItemByDept[deptid]['items'][itemid]) {
				jsonItemByDept[deptid]['items'][itemid]=itemtext;
			}
		}
		
		//hidden field that captures stringified version of jsonItemByDept object
		var strJsonValFld = nsform.addField('custpage_jsonval','longtext','', null, 'custpage_a');
		strJsonValFld.setDefaultValue(JSON.stringify(jsonItemByDept));
		strJsonValFld.setDisplayType('hidden');
		
		var deptFilterFld = nsform.addField('custpage_deptflt','select','Item Department: ', null, 'custpage_a');
		deptFilterFld.addSelectOption('', '', true);
		deptFilterFld.setMandatory(true);
		
		var lvlOneItemFld = nsform.addField('custpage_lvloneitem', 'multiselect', 'Software/Training Item: ', null, 'custpage_a');
		lvlOneItemFld.addSelectOption('', '', false);	
		lvlOneItemFld.setMandatory(true);
		lvlOneItemFld.setDisplaySize(475, 12);  // Updated April-20-2013 by Gama.  width from 350 to 475, height from 10 to 12
		
		//loop through jsonItemByDept object and build values
		for (var d in jsonItemByDept) {
			//identify if it option should be selected based on user selection
			var setDeptSelected = false;
			if (deptSelection == d) {
				setDeptSelected = true;
			}
			deptFilterFld.addSelectOption(d, jsonItemByDept[d]['depttext'], setDeptSelected);
		}
		
		//insert and build item list ONLY if deptSelection is set
		if (deptSelection) {
			var jsonItems = jsonItemByDept[deptSelection]['items'];
			for (var t in jsonItems) {
				var setItemSelected = false;
				if (lvlSelection.contains(t)) {
					setItemSelected = true;
				} 
				lvlOneItemFld.addSelectOption(t, jsonItems[t], setItemSelected);
			}
		}
		
		var lvlOneQtyFld = nsform.addField('custpage_lvloneqty', 'integer', 'Quantity to add: ',null, 'custpage_a');
		lvlOneQtyFld.setMandatory(true);
		lvlOneQtyFld.setDefaultValue(lvlQty);
		lvlOneQtyFld.setDisplaySize(15);
		
		if (req.getMethod() == 'POST') {
			//add close button by default once it's submitted
			//add set to Opportunity button
			nsform.addButton('custpage_setbtn','Add to Transaction','addToTransaction();');
			
			nsform.addButton('custpage_closebtn', 'Cancel/Close', 'CancelClose();');
			
			//lookup selected items' related training and subscription items
			var relFlt = [new nlobjSearchFilter('internalid', null, 'anyof', lvlSelection)];
			var relCol = [new nlobjSearchColumn('custitem_relatedsubscriptions'),
			              new nlobjSearchColumn('custitem_relatedtraining'),
			              new nlobjSearchColumn('itemid'),
			              new nlobjSearchColumn('displayname'),
			              new nlobjSearchColumn('department'),
			              new nlobjSearchColumn('class')];
			var relRslt = nlapiSearchRecord('item', null, relFlt, relCol);
			
			//add result grouping
			nsform.addFieldGroup('custpage_rsltgroup', 'Related Items');
			
			/**
			var rsltmsg = nsform.addField('custpage_rsltmsg', 'textarea', '', null, 'custpage_rsltgroup');
			rsltmsg.setBreakType('startcol');
			rsltmsg.setDisplayType('inline');
			*/
			var arSubsItems = new Array();
			var arTrainingItems = new Array();
			
			//assume there is atleast one result returned 
			/**
			var submittedLvlOneSelectionText = relRslt[0].getValue('itemid')+':'+relRslt[0].getValue('displayname');
			if (!relRslt[0].getValue('custitem_relatedsubscriptions') && !relRslt[0].getValue('custitem_relatedtraining')) {
				rsltmsg.setDefaultValue('<b><span style="color:red">Related Training and Subscription items are not set '+
										'for <i>'+submittedLvlOneSelectionText+'</span></b>');
			} else {
				rsltmsg.setDefaultValue('<b><span style="color:green">Qty of related Training and/or Subscription items are set '+
										'to equal number of high level item being added</span></b>');
			*/
			for (var r=0; r < relRslt.length; r++) {
				log('debug','subs fld',relRslt[r].getValue('custitem_relatedsubscriptions'));
				log('debug','train fld',relRslt[r].getValue('custitem_relatedtraining'));
				
				if (relRslt[r].getValue('custitem_relatedsubscriptions')) {
					var relSubs = relRslt[r].getValue('custitem_relatedsubscriptions').split(',');
					for (var tr=0; tr < relSubs.length; tr++) {
						arSubsItems.push(relSubs[tr]);
					}
					log('debug','Subs item',arSubsItems.length);
				}
				
				if (relRslt[r].getValue('custitem_relatedtraining')) {
					var resTrains = relRslt[r].getValue('custitem_relatedtraining').split(',');
					for (var tt=0; tt < resTrains.length; tt++) {
						arTrainingItems.push(resTrains[tt]);
					}
					log('debug','Train item', arTrainingItems.length);
				}
			}
			
			
			//add sublist of returned items
			//display search result in sublist
			var itemList = nsform.addSubList('custpage_itemlist','list','Items to add to Opportunity');
			itemList.addMarkAllButtons();
			itemList.addRefreshButton();
			
			//has results; display them to users 
			itemList.addField('item_select', 'checkbox','Select');
			var itemInternalId = itemList.addField('item_internalid','text','Item Internal ID');
			itemInternalId.setDisplayType('hidden');
			itemList.addField('item_type', 'text','Type');
			itemList.addField('item_itemid', 'text','Item Name');
			itemList.addField('item_displayname', 'text', 'Display Name');
			var qtyIntCol = itemList.addField('item_qty', 'integer', 'Qty to add');
			qtyIntCol.setDisplayType('entry');
			qtyIntCol.setDisplaySize(3);
			itemList.addField('item_dept','select','Item Department','department');
			itemList.addField('item_class','select','Item Class','classification');
			
			var newLine = 1;
			
			if (arSubsItems.length > 0 || arTrainingItems.length > 0 || lvlSelection.length > 0) {
				var arAll = arSubsItems.concat(arTrainingItems).concat(lvlSelection);
				log('debug','arAll',arAll.length);
				
				//search for information 
				var ritemsFlt = [new nlobjSearchFilter('internalid', null, 'anyof', arAll)];
				var ritemsCol = [new nlobjSearchColumn('itemid'),
				                 new nlobjSearchColumn('displayname'),
				                 new nlobjSearchColumn('department'),
				                 new nlobjSearchColumn('class'),
				                 new nlobjSearchColumn('custitem_configuratorsortorder').setSort()];  // Updated April-25-2013 by Gama.  Added the sort order field
				var ritemsRslt = nlapiSearchRecord('item', null, ritemsFlt, ritemsCol);
				log('debug','ritems size', ritemsRslt.length);
				for (var r=0; r < ritemsRslt.length; r++) {
					var rtype = '';
					if (arTrainingItems.contains(ritemsRslt[r].getId())) {
						rtype = 'Related Training';
					} else if (lvlSelection.contains(ritemsRslt[r].getId())) {
						rtype = 'First Level Item';
					} else if (arSubsItems.contains(ritemsRslt[r].getId())) {
						rtype = 'Related Subscription';
					}
					// Add option for rtype = 'Other Related Item'  // Updated April-25-2013 by Gama.
					
					itemList.setLineItemValue('item_internalid', newLine, ritemsRslt[r].getId());
					itemList.setLineItemValue('item_type', newLine,rtype);
					itemList.setLineItemValue('item_itemid', newLine, ritemsRslt[r].getValue('itemid'));
					itemList.setLineItemValue('item_displayname',newLine, ritemsRslt[r].getValue('displayname'));
					itemList.setLineItemValue('item_qty', newLine,lvlQty);
					itemList.setLineItemValue('item_dept', newLine, ritemsRslt[r].getValue('department'));
					itemList.setLineItemValue('item_class', newLine, ritemsRslt[r].getValue('class'));
					
					newLine++;
					
				}
				
			}
			
		}
		
		res.writePage(nsform);
	} catch (oppConfigErr) {
		log('error','Generate Opp Configurator Error', getErrText(oppConfigErr));
	}
	
	
	
	
	
}
