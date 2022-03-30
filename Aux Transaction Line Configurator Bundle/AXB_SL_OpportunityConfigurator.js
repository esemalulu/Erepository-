/**
 * Author: joe.son@audaxium.com
 * Date: 3/3/2015
 * Desc:
 *  
 */
//Company Level Configuration Filter
var paramLaunchBtnLabel = nlapiGetContext().getSetting('SCRIPT', 'custscript_oppwiz_launchlabel');
var paramWizardLabel = nlapiGetContext().getSetting('SCRIPT', 'custscript_oppwiz_wizardlabel');
var paramTopLevelFilter = nlapiGetContext().getSetting('SCRIPT', 'custscript_oppwiz_toplvlfilter');

//TODO:
//MUST make sure Item search follows Subsidiary as well and NOT show item if it doesn't match customer sub

//Allow user to search against parent only as well. When there are NO related item, it won't proceed to search

//Keep adding to existing line istead of clearing the entire existing item list

var nsform = null;
function AxLineItemWizard(req, res){
	nsform = nlapiCreateForm(paramWizardLabel, true);
	nsform.setScript('customscript_ax_cs_opp_line_sl_helper');
	
	//add message display 
	var msgFld = nsform.addField('custpage_procmsg', 'textarea', '', null, null);
	msgFld.setLayoutType('outsideabove');
	msgFld.setDisplayType('inline');

	var filterSelection = req.getParameter('custpage_userflt') || '';
	var lvlSelection = req.getParameterValues('custpage_lvloneitem') || '';
	var lvlQty = req.getParameter('custpage_lvloneqty') || 1;
	
	try {
		//add result grouping
		nsform.addFieldGroup('custpage_a', 'Configuration');
		
		//Grab Top Level Filter option to before starting search
		var filterOption = nlapiLookupField('customrecord_ax_liwz_toplvlfilteroption', paramTopLevelFilter, ['name','custrecord_ax_liwz_refrec_internalid','custrecord_ax_liwz_refitemfld_internalid']);
		var filterOptionJson = {
			"record":filterOption.custrecord_ax_liwz_refrec_internalid,
			"field":filterOption.custrecord_ax_liwz_refitemfld_internalid,
			"name":filterOption.name
		};
		
		//search for level one items with custitem_ax_oppwizard_istoplevel checked
		var lvlflt = [new nlobjSearchFilter('custitem_ax_oppwizard_istoplevel', null, 'is','T'),
		              new nlobjSearchFilter('custitem_ax_oppwizard_relateditemjson', null, 'isnotempty',''),
		              new nlobjSearchFilter('isinactive', null, 'is', 'F'),
		              new nlobjSearchFilter(filterOptionJson.field, null, 'noneof', '@NONE@')];
		var lvlcol = [new nlobjSearchColumn('internalid'),
		              new nlobjSearchColumn('itemid'),
		              new nlobjSearchColumn('displayname'),
		              new nlobjSearchColumn('custitem_ax_oppwizard_relateditemjson'),
		              new nlobjSearchColumn(filterOptionJson.field)];
		var lvlOneRslt = nlapiSearchRecord('item', null, lvlflt, lvlcol);
		/**
		 * jsonItemByFilter will build out json list of items by company preference filter option.
		 * Result of this json will be strigified into hidden Suitelet Field 
		 * so that Suitelets' client helper function can dynamically rebuild item list
		 * when department is changed
		 * [filter]:{
		 *  filtertext:[filtertextvalue],
		 * 	items:{
		 *   [itemid]:{
		 *   	itemtext:[item text],
		 *   	relateditems:Array
		 *   },
		 *   ...
		 *  },
		 * }
		 */
		var jsonItemByFilter = {};
		for(var i=0; lvlOneRslt && i < lvlOneRslt.length; i++) {
			var fltid = lvlOneRslt[i].getValue(filterOptionJson.field);
			var flttext = lvlOneRslt[i].getText(filterOptionJson.field);
			var itemid = lvlOneRslt[i].getId();
			var itemtext = '('+lvlOneRslt[i].getValue('itemid')+') '+lvlOneRslt[i].getValue('displayname');
			if (!lvlOneRslt[i].getValue('displayname')) {
				itemtext = lvlOneRslt[i].getValue('itemid');
			}
			var relatedItems = lvlOneRslt[i].getValue('custitem_ax_oppwizard_relateditemjson').split(',');
			
			if (!jsonItemByFilter[fltid]) {
				jsonItemByFilter[fltid]={};
				jsonItemByFilter[fltid]['items']={};
			}
			jsonItemByFilter[fltid]['filtertext']=flttext;
			//check to see if itemid exists in items sub json object
			if (!jsonItemByFilter[fltid]['items'][itemid]) {
				jsonItemByFilter[fltid]['items'][itemid]={};
			}
			jsonItemByFilter[fltid]['items'][itemid]={
				'itemtext':itemtext,
				'relateditems':relatedItems
			};
		}
		
		var userFilterFld = nsform.addField('custpage_userflt','select','Item '+filterOptionJson.name+': ', filterOptionJson.record, 'custpage_a');
		userFilterFld.setMandatory(true);
		userFilterFld.setDefaultValue(filterSelection);
		userFilterFld.setBreakType('startcol');
		
		var lvlOneItemFld = nsform.addField('custpage_lvloneitem', 'multiselect', 'Top Level Item: ', null, 'custpage_a');
		//lvlOneItemFld.addSelectOption('', '', false);	
		lvlOneItemFld.setMandatory(true);
		lvlOneItemFld.setDisplaySize(250, 8); 
		
		//insert and build item list ONLY if deptSelection is set
		if (filterSelection) {
			var jsonItems = jsonItemByFilter[filterSelection]['items'];
			for (var t in jsonItems) {
				var setItemSelected = false;
				if (lvlSelection.contains(t)) {
					setItemSelected = true;
				} 
				lvlOneItemFld.addSelectOption(t, jsonItems[t].itemtext, setItemSelected);
			}
		}
		
		var lvlOneQtyFld = nsform.addField('custpage_lvloneqty', 'integer', 'Quantity to add: ',null, 'custpage_a');
		lvlOneQtyFld.setMandatory(true);
		lvlOneQtyFld.setDefaultValue(lvlQty);
		lvlOneQtyFld.setBreakType('startcol');
		

		//hidden field that captures stringified version of jsonItemByDept object
		var strJsonValFld = nsform.addField('custpage_jsonval','longtext','', null, null);
		strJsonValFld.setDefaultValue(JSON.stringify(jsonItemByFilter));
		strJsonValFld.setDisplayType('hidden');
		
		var strArrayAllItems = nsform.addField('custpage_allitems','longtext','',null,null);
		strArrayAllItems.setDisplayType('hidden');
		/*********************************************** POST ***********************************************************/
		if (req.getMethod() == 'POST') {
			//add close button by default once it's submitted
			//add set to Opportunity button
			nsform.addButton('custpage_setbtn','Add to Transaction','addToTransaction();');
			
			nsform.addButton('custpage_newseabtn','Search For New Items', 'searchForNew();');
			
			nsform.addButton('custpage_closebtn', 'Cancel/Close', 'CancelClose();');
			
			//Search for all items that was selected by the user 
			var allItemSelected = req.getParameter('custpage_allitems').split(',');
			var userSelectedFilterValue = req.getParameter('custpage_userflt');
			var relFlt = [new nlobjSearchFilter('internalid', null, 'anyof', allItemSelected)];
			              //new nlobjSearchFilter(filterOptionJson.field, null, 'anyof', userSelectedFilterValue)];
			
			var relCol = [new nlobjSearchColumn('internalid'),
			              new nlobjSearchColumn('itemid'),
			              new nlobjSearchColumn('displayname'),
			              new nlobjSearchColumn(filterOptionJson.field)];
			
			var relRslt = nlapiSearchRecord('item', null, relFlt, relCol);
			
			//add result grouping
			nsform.addFieldGroup('custpage_rsltgroup', 'Related Items');
			
			//add sublist of returned items
			//display search result in sublist
			var itemList = nsform.addSubList('custpage_itemlist','list','Items to add to Transaction');
			itemList.addMarkAllButtons();
			itemList.addRefreshButton();
			
			//has results; display them to users 
			itemList.addField('item_select', 'checkbox','Select');
			var itemInternalId = itemList.addField('item_internalid','text','Item Internal ID');
			itemInternalId.setDisplayType('hidden');
			itemList.addField('item_itemid', 'text','Item Name');
			itemList.addField('item_displayname', 'text', 'Display Name');
			var qtyIntCol = itemList.addField('item_qty', 'integer', 'Qty to add');
			qtyIntCol.setDisplayType('entry');
			qtyIntCol.setDisplaySize(3);
			
			var newLine = 1;
			
			for (var r=0; r < relRslt.length; r++) {
				itemList.setLineItemValue('item_internalid', newLine, relRslt[r].getId());
				itemList.setLineItemValue('item_itemid', newLine, relRslt[r].getValue('itemid'));
				itemList.setLineItemValue('item_displayname', newLine, relRslt[r].getValue('displayname'));
				itemList.setLineItemValue('item_qty', newLine,lvlQty);
				
				newLine++;
				
			}
		} else {
			//ONLY display Submit Search button ONLY when it's GET as in never been submitted to execute search
			nsform.addSubmitButton('Search All Related Items');
		}
		
		res.writePage(nsform);
	} catch (oppConfigErr) {
		axlog('error','Generate Opp Configurator Error', getErrText(oppConfigErr));
	}
	
	
	
	
	
}
