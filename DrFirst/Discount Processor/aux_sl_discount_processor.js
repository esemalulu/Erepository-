/**
 * Author: Audaxium
 * Desc: Suitelet to allow users to search for available discounts for each line items on the transaction
*/

function trxDiscountProcessor(req, res) {
	var itemCount = req.getParameter('custpage_itemcount');
	if (!itemCount) {
		itemCount = 0;
	}
	var slStage = req.getParameter('custpage_stage');
	if (!slStage) {
		slStage = 'default';
	}
	
	//create form
	var nsform = nlapiCreateForm('Discount Processor', true);
	//set script
	nsform.setScript('customscript_aux_cs_discproc_sl_helper');
	
	//stage hidden
	var hiddenStage = nsform.addField('custpage_stage','text','stage');
	hiddenStage.setDefaultValue(slStage);
	hiddenStage.setDisplayType('hidden');
	
	var dept = nsform.addField('custpage_dept', 'select', 'Department: ', 'department', null);
	dept.setMandatory(true);
	dept.setDisplayType('disabled');
	
	if (req.getMethod()=='GET') {
		
		var headerg = nsform.addField('custpage_headerg','inlinehtml','');
		headerg.setLayoutType('outsideabove');
		headerg.setDefaultValue('<b>Select items from list below to search for available discounts</b><br/><br/><i>D/A</i>: Discount already applied to this item<br/>'+
								'<i>N/A</i>: Item is Subtotal, Description or Discount type and will be ignored');
		
		nsform.addSubmitButton('Search Discounts');
		
		//item sublist
		var itemList = nsform.addSubList('custpage_itemlist', 'list', 'Items From Transaction', null);
		itemList.addField('custpage_il_selection', 'checkbox', 'Select', null);
		itemList.addField('custpage_il_item_type','text','Item Type',null).setDisplayType('entry');
		itemList.addField('custpage_il_item_disc','text','Discount Applied (D/A)',null).setDisplayType('entry');
		itemList.addField('custpage_il_itemid','text','Item ID',null).setDisplayType('hidden');
		itemList.addField('custpage_il_linenum','text','Line',null).setDisplayType('entry');
		itemList.addField('custpage_il_itemtext','text','Item',null).setDisplayType('entry');
		itemList.addField('custpage_il_item_qty','text','Qty',null).setDisplayType('entry');
		itemList.addField('custpage_il_item_amt','text','Amount',null).setDisplayType('entry');
		itemList.addField('custpage_il_item_term','text','Terms',null).setDisplayType('entry');
		itemList.addField('custpage_il_item_licstatusid','text','License Statusid',null).setDisplayType('hidden');
		itemList.addField('custpage_il_item_licstatustxt','text','License Status',null).setDisplayType('entry');
		
		itemList.setHelpText('&nbsp; &nbsp; Select Items you wish to apply discount to and click Search button.');
		
		for (var il=1; il <= itemCount; il++) {
			itemList.setLineItemValue('custpage_il_linenum', il, il);
		}
		
	} else {
		var ignoreType = ['Subtotal','Discount','Description'];
		
		hiddenStage.setDefaultValue('selectdisc');
		
		var setDiscountBtn = nsform.addButton('custpage_setdiscount', 'Set Discounts', 'setDiscountOnTrx()');
		
		var rDept = req.getParameter('custpage_dept');
		
		var arItems = new Array();
		var arLicSt = new Array();
		var lcount = req.getLineItemCount('custpage_itemlist');
		
		for (var j=1; j <=lcount; j++) {
			var canIgnore = false;
			if (req.getLineItemValue('custpage_itemlist','custpage_il_item_disc', j) || 
				ignoreType.contains(req.getLineItemValue('custpage_itemlist','custpage_il_item_type', j))) {
				
				canIgnore = true;
			}
			
			if (!canIgnore && req.getLineItemValue('custpage_itemlist','custpage_il_selection', j)=='T') {
				
				if (!arItems.contains(req.getLineItemValue('custpage_itemlist','custpage_il_itemid', j))) {
					
					arItems.push(req.getLineItemValue('custpage_itemlist','custpage_il_itemid', j));
				}
				
				if (!arLicSt.contains(req.getLineItemValue('custpage_itemlist','custpage_il_item_licstatusid', j))) {
					
					arLicSt.push(req.getLineItemValue('custpage_itemlist','custpage_il_item_licstatusid', j));
				}
			}
		}

		//search for all discount matching all items selected, department and license statuses for selected items
		var drslt = null;
		if (arItems.length > 0) {
			var dflt = [new nlobjSearchFilter('custrecord_dcd_eligible_dept', null, 'anyof', rDept),
			            new nlobjSearchFilter('custrecord_dcd_applied_items', null, 'anyof', arItems),
			            new nlobjSearchFilter('custrecord_dcd_license_status', null, 'anyof', arLicSt),
			            new nlobjSearchFilter('isinactive', null, 'is','F')];
			
			var dcol = [new nlobjSearchColumn('name'),
			            new nlobjSearchColumn('custrecord_dcd_applied_items'),
			            new nlobjSearchColumn('custrecord_dcd_license_status'),
			            new nlobjSearchColumn('custrecord_dcd_min_term'),
			            new nlobjSearchColumn('custrecord_dcd_max_term'),
			            new nlobjSearchColumn('custrecord_dcd_min_qty'),
			            new nlobjSearchColumn('custrecord_dcd_max_qty'),
			            new nlobjSearchColumn('custrecord_dcd_active_from'),
			            new nlobjSearchColumn('custrecord_dcd_active_to'),
			            new nlobjSearchColumn('custrecord_dcd_always_active'),
			            new nlobjSearchColumn('custrecord_dcd_rate')];
			drslt = nlapiSearchRecord('customrecord_aux_disccode_def', null, dflt, dcol);
		}
		
		var dmatrix = {};
		if (drslt && drslt.length > 0) {
			for (var d=0; d < drslt.length; d++) {
				
				var ita = drslt[d].getValue('custrecord_dcd_applied_items').split(',');
				for (var it=0; it < ita.length; it++) {
					if (!dmatrix[ita[it]]) {
						dmatrix[ita[it]]={};
						dmatrix[ita[it]]['discounts']=new Array();
					}
					
					var dobj = new Object();
					dobj.id = drslt[d].getId();
					dobj.name = drslt[d].getValue('name');
					dobj.statuses = drslt[d].getValue('custrecord_dcd_license_status').split(',');
					dobj.minterm = drslt[d].getValue('custrecord_dcd_min_term');
					dobj.maxterm = drslt[d].getValue('custrecord_dcd_max_term');
					dobj.minqty = drslt[d].getValue('custrecord_dcd_min_qty');
					dobj.maxqty = drslt[d].getValue('custrecord_dcd_max_qty');
					dobj.activefrom = drslt[d].getValue('custrecord_dcd_active_from');
					dobj.activeto = drslt[d].getValue('custrecord_dcd_active_to');
					dobj.alwaysactive = drslt[d].getValue('custrecord_dcd_always_active');
					dobj.rate = drslt[d].getValue('custrecord_dcd_rate');
					dmatrix[ita[it]]['discounts'].push(dobj);					
				}
			}
			//discount value matrix
			var hiddenDiscountValues = nsform.addField('custpage_test','longtext','');
			hiddenDiscountValues.setDefaultValue(JSON.stringify(dmatrix));
			hiddenDiscountValues.setDisplayType('hidden');
		}
		
		var ditemList = nsform.addSubList('custpage_ditemlist', 'list', 'Discounts for Selected Items From Transaction', null);
		ditemList.addField('custpage_dl_selection', 'checkbox', 'Select', null);		
		ditemList.addField('custpage_dl_itemid','text','Item ID',null).setDisplayType('hidden');
		ditemList.addField('custpage_dl_linenum','text','Line',null).setDisplayType('hidden');
		ditemList.addField('custpage_dl_item_detail','textarea','Item Detail',null).setDisplayType('inline');
		var discTextFld = ditemList.addField('custpage_dl_item_discount','text','Discount',null).setDisplayType('entry');
		discTextFld.setDisplaySize(25);
		ditemList.addField('custpage_dl_disc_id','text','Discount Selected',null).setDisplayType('hidden');
		
		ditemList.addField('custpage_dl_item_amount','text','Total Amount',null);
		ditemList.addField('custpage_dl_item_discountamt','text','Discounted Amount',null).setDisplayType('entry');
		ditemList.addField('custpage_dl_item_dlist','textarea','Applicable Discounts',null).setDisplayType('inline');
		
		ditemList.setHelpText('&nbsp; &nbsp; Select Discounts for each Items');
		
		var diline = 1;
		for (var j=1; j<=lcount; j++) {
			//only draw out those items that does not have discount already applied
			var canIgnore = false;
			if (req.getLineItemValue('custpage_itemlist','custpage_il_item_disc', j) || 
				ignoreType.contains(req.getLineItemValue('custpage_itemlist','custpage_il_item_type', j))) {
				
				canIgnore = true;
			}
			
			
			if (!canIgnore && req.getLineItemValue('custpage_itemlist','custpage_il_selection', j)=='T') {
				
				ditemList.setLineItemValue('custpage_dl_itemid', diline, req.getLineItemValue('custpage_itemlist', 'custpage_il_itemid', j));
				ditemList.setLineItemValue('custpage_dl_linenum', diline, req.getLineItemValue('custpage_itemlist', 'custpage_il_linenum', j));
				var itemid = req.getLineItemValue('custpage_itemlist', 'custpage_il_itemid', j);
				var qty = parseInt(req.getLineItemValue('custpage_itemlist', 'custpage_il_item_qty', j));
				var term = parseInt(req.getLineItemValue('custpage_itemlist', 'custpage_il_item_term', j));
				var lics = req.getLineItemValue('custpage_itemlist', 'custpage_il_item_licstatusid', j);
				var detail = '<b>Item Name</b>: '+req.getLineItemValue('custpage_itemlist', 'custpage_il_itemtext', j)+'<br/>'+
							 '<b>Quantity</b>: '+req.getLineItemValue('custpage_itemlist', 'custpage_il_item_qty', j)+'<br/>'+
							 '<b>Term</b>: '+req.getLineItemValue('custpage_itemlist', 'custpage_il_item_term', j)+'<br/>'+
							 '<b>License Status</b>: '+req.getLineItemValue('custpage_itemlist', 'custpage_il_item_licstatustxt', j);
				ditemList.setLineItemValue('custpage_dl_item_amount', diline, req.getLineItemValue('custpage_itemlist', 'custpage_il_item_amt', j));
				ditemList.setLineItemValue('custpage_dl_item_detail', diline, detail);
				ditemList.setLineItemValue('custpage_dl_item_discount', diline, '');
				ditemList.setLineItemValue('custpage_dl_item_discountamt', diline, req.getLineItemValue('custpage_itemlist', 'custpage_il_item_amt', j));
				
				//linenum:::id:::rate:::name
				var discHtml = '<input type="radio" name="line'+diline+'disc" id="line'+diline+'disc_-1" value="'+diline+':::-1:::0.0:::No Discount" onclick="setDiscountValue(this);"/> No Discount<br/>';
				if (dmatrix[itemid]) {
					var dar = dmatrix[itemid].discounts;
					for (var d=0; d < dar.length; d++) {
						var dlobj = dar[d];
						//check to make sure qty, terms are within the range and license match
						/**
						 * dobj.id = drslt[d].getId();
					dobj.name = drslt[d].getValue('name');
						 * dobj.statuses = drslt[d].getValue('custrecord_dcd_license_status').split(',');
					dobj.minterm = drslt[d].getValue('custrecord_dcd_min_term');
					dobj.maxterm = drslt[d].getValue('custrecord_dcd_max_term');
					dobj.minqty = drslt[d].getValue('custrecord_dcd_min_qty');
					dobj.maxqty = drslt[d].getValue('custrecord_dcd_max_qty');
					dobj.activefrom = drslt[d].getValue('custrecord_dcd_active_from');
					dobj.activeto = drslt[d].getValue('custrecord_dcd_active_to');
					dobj.alwaysactive = drslt[d].getValue('custrecord_dcd_always_active');
					dobj.rate = drslt[d].getValue('custrecord_dcd_rate');
						 */
						//need to compare from/to dates as well
						if ( (qty >= parseInt(dlobj.minqty) && qty <= parseInt(dlobj.maxqty)) &&
						     (term >= parseInt(dlobj.minterm) && term <= parseInt(dlobj.maxterm)) &&
						     (dlobj.statuses.contains(lics))) {
							
							//compare active dates
							var canUse = false;
							if (dlobj.alwaysactive == 'T') {
								canUse = true;
							} else {
								//compare dates
								if (dlobj.activefrom && dlobj.activeto) {
									try {
										var afrom = new Date(dlobj.activefrom).getTime();
										var ato = new Date(dlobj.activeto).getTime();
										var curDate = new Date();
										var now = new Date((curDate.getMonth()+1)+'/'+curDate.getDate()+'/'+curDate.getFullYear()).getTime();
										
										if (now >= afrom && now <=ato) {
											canUse = true;
										}
										
									} catch (daterangeerr) {
										log('error','Error calculating active time',getErrText(daterangeerr));
									}
								}
							}
							
							if (canUse) {
								var dlvalue = diline+':::'+dlobj.id+':::'+dlobj.rate+':::'+dlobj.name;
								discHtml += '<input type="radio" name="line'+diline+'disc" id="line'+diline+'disc_'+dlobj.id+'" value="'+dlvalue+'" onclick="setDiscountValue(this);"/>'+dlobj.name+' ('+dlobj.rate+')<br/>';
							}							
						}						
					}
				}
				
				ditemList.setLineItemValue('custpage_dl_item_dlist', diline, discHtml);
				diline++;
			}
		}
		
		
		
	}
	
	res.writePage(nsform);
}