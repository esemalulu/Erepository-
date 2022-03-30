/**
 * Original Author: joe.son@audaxium.com on Date: 3/8/2013
 * Updated on Date: 4/16/2016 elijah@audaxium.com
 * Client level scripts that provides helper functions to Opportunity Configurator. (AUX-CS- Quote Line Config Helper)
 * Script record is created so that it can be applied programmatically from the Suitelet 
 * but IT IS NEVER DEPLOYED (AUX-CS- Quote Line Config Helper)
 * 
 * Modified by joe.son@audaxium.com
 * Desc:
 *   Suitelet will allow MindGym user to MASS ADD items to new quote.
 *   They currently add multiple lines of same items and it takes time to do this.
 *   allow the user to select an item based on the Item Platform and Item Booking Type drop downs.  
 *   A quantity of how many items are to be added to the quote will also be entered by the user.  
 *   If the following item options are populated, the information will be added to the items:  
 *   city, date, time, approx time, state, country and course
 * 
 */

var nsform = null;
function ItemConfigurator(req, res){

	nsform = nlapiCreateForm('Quote Builder', true);
	nsform.setScript('customscript_ax_cs_quote_line_sl_helper');
	
	//add message display 
	var msgFld = nsform.addField('custpage_procmsg', 'textarea', '', null, null);
	msgFld.setLayoutType('outsideabove');
	msgFld.setDisplayType('inline');

	var jbTypeSelection = req.getParameter('custpage_type')?req.getParameter('custpage_type'):'',
		jbPlatSelection = req.getParameter('custpage_plat')?req.getParameter('custpage_plat'):'',
		lvlSelection = req.getParameterValues('custpage_items')?req.getParameterValues('custpage_items'):'',
		lvlQty = req.getParameter('custpage_lvloneqty')?req.getParameter('custpage_lvloneqty'):'',
		odate = req.getParameter('custpage_date')?req.getParameter('custpage_date'):'',
		oaptime = req.getParameter('custpage_aprxtime')?req.getParameter('custpage_aprxtime'):'',
		otime = req.getParameter('custpage_time')?req.getParameter('custpage_time'):'',
		ocourse = req.getParameter('custpage_course')?req.getParameter('custpage_course'):'',
		ocity = req.getParameter('custpage_city')?req.getParameter('custpage_city'):'',
		ozip = req.getParameter('custpage_postal')?req.getParameter('custpage_postal'):'',
		ostate = req.getParameter('custpage_state')?req.getParameter('custpage_state'):'',
		ocountry = req.getParameter('custpage_country')?req.getParameter('custpage_country'):'',
				
		clientCurrency = req.getParameter('currency')?req.getParameter('currency'):'',
		clientSubsidiary = req.getParameter('subsidiary')?req.getParameter('subsidiary'):'',

		cusInternalId = req.getParameter('clientid')?req.getParameter('clientid'):'',		
		clientName = req.getParameter('clientname')?req.getParameter('clientname'):'',
		
		subsidiaryCurrency = req.getParameter('subscurrency')?req.getParameter('subscurrency'):'';
						
	try 
	{
		
		//Look up subsidiary currency here
		if (!subsidiaryCurrency && clientSubsidiary)
		{
			subsidiaryCurrency = nlapiLookupField('subsidiary', clientSubsidiary, 'currency');
		}
		
		//add result grouping
		nsform.addFieldGroup('custpage_a', 'Configuration');
		
		//search for All items that has value for Item Booking Type and Platform Type
		//	Will look for Service and None Inventory Items ONLY
		var itmflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
		              new nlobjSearchFilter('type', null, 'anyof', ['Service','NonInvtPart']),
		              new nlobjSearchFilter('custitem_itm_bookingtype', null, 'noneof', '@NONE@'),
		              new nlobjSearchFilter('custitem_item_type2', null, 'noneof', '@NONE@')],
			itmcol = [new nlobjSearchColumn('internalid',null,'group'),
			          new nlobjSearchColumn('internalid','transaction','count'),
			          new nlobjSearchColumn('itemid',null,'group').setSort(),
			          new nlobjSearchColumn('custitem_itm_bookingtype',null,'group').setSort(), //Item Booking Type
			          new nlobjSearchColumn('custitem_item_type2',null,'group')], //Item Platform
			itmrs = nlapiSearchRecord('item', null, itmflt, itmcol);

		//Build JSON object to reference so that the page doesn't refresh or run extra search
			//JSON object containing all Unique Booking Type
		var bTypeJson = {},
			//JSON object containing all Unique Platforms
			bPlatJson = {},
			//JSON object containing list of Platforms by Type
			platByTypeJson = {},
			//JSON object containing list of Items by Type-Platform
			itemsByTpJson = {};
		
		for(var i=0; itmrs && i < itmrs.length; i++) 
		{
			var bTypeId = itmrs[i].getValue('custitem_itm_bookingtype',null,'group'),
				bTypeText = itmrs[i].getText('custitem_itm_bookingtype',null,'group'),
				bPlatId = itmrs[i].getValue('custitem_item_type2',null,'group'),
				bPlatText = itmrs[i].getText('custitem_item_type2',null,'group'),
				itemid = itmrs[i].getValue('internalid',null,'group');
				itemtext = itmrs[i].getValue('itemid',null,'group');
				itemCount = itmrs[i].getValue('internalid', 'transaction','count');
			
			//Populate JSON objects
			bTypeJson[bTypeId] = bTypeText;
			bPlatJson[bPlatId] = bPlatText;
			
			//Populate platByTypeJson
			if (!platByTypeJson[bTypeId])
			{
				platByTypeJson[bTypeId] = [];
			}
			//Add in unique Platform IDs
			if (!platByTypeJson[bTypeId].contains(bPlatId))
			{
				platByTypeJson[bTypeId].push(bPlatId);	
			}
			
			//Populate itemsByTpJson object
			//	KEY is [Type ID]-[Platform ID]
			var tpKey = bTypeId+'-'+bPlatId;
			if (!itemsByTpJson[tpKey])
			{
				itemsByTpJson[tpKey] = [];
			}
			//Create Item Object {[ID]:[Display]} and add to JSON
			itemsByTpJson[tpKey].push({
				'id':itemid,
				'name':itemtext+' ('+itemCount+' Used)'
			});
			
		}
		
		//hidden field that captures stringified version of jsonItemByJbType object
		var strJsonValFld = nsform.addField('custpage_jsonval','inlinehtml','', null,null);
		strJsonValFld.setDefaultValue(
			'<script language="javascript">'+
			'var bTypeJson = '+JSON.stringify(bTypeJson)+';'+
			'var bPlatJson = '+JSON.stringify(bPlatJson)+';'+
			'var platByTypeJson = '+JSON.stringify(platByTypeJson)+';'+
			'var itemsByTpJson = '+JSON.stringify(itemsByTpJson)+';'+
			'</script>'
		);
		
		if (req.getMethod()=='GET')
		{
			nsform.addSubmitButton('Create List of Items');
		}
		
		//Search Options
		nsform.addFieldGroup('grpa', 'Filter Options', null);			
		//Column A ---------------------
		
		//Client Id
		var clientIdFld = nsform.addField('clientid','text','Client ID', null, 'grpa');
		clientIdFld.setDefaultValue(cusInternalId);
		clientIdFld.setDisplayType('hidden');
					
		//Client Name
		var cliNameFld = nsform.addField('clientname','text','Client Name', null, 'grpa');
		cliNameFld.setDefaultValue(clientName);
		cliNameFld.setDisplayType('inline');
		cliNameFld.setBreakType('startcol');
		if (req.getMethod()=='POST')
		{
			cliNameFld.setDisplayType('hidden');
		}
		
		//Client Currency
		var cliCurFld = nsform.addField('currency','select','Client Currency','currency','grpa');
		cliCurFld.setDefaultValue(clientCurrency);
		cliCurFld.setDisplayType('disabled');
		if (req.getMethod()=='POST')
		{
			cliCurFld.setDisplayType('hidden');
		}
		
		var cliSubsFld = nsform.addField('subsidiary','select','Client Subsidiary','subsidiary','grpa');
		cliSubsFld.setDefaultValue(clientSubsidiary);
		cliSubsFld.setDisplayType('hidden');
		
		var cliSubsCurFld = nsform.addField('subscurrency','select','Subsidiary Currency','currency','grpa');
		cliSubsCurFld.setDefaultValue(subsidiaryCurrency);
		cliSubsCurFld.setDisplayType('disabled');
		if (req.getMethod()=='POST')
		{
			cliSubsCurFld.setDisplayType('hidden');
		}
		
		//Type
		var typefld = nsform.addField('custpage_type','select','Item Booking Type', null,'grpa');
		typefld.setMandatory(true);
		typefld.addSelectOption('','',true);
		//Loop through bTypeJson 
		for (t in bTypeJson)
		{
			typefld.addSelectOption(t, bTypeJson[t], false);
		}
		typefld.setDefaultValue(jbTypeSelection);
		if (req.getMethod()=='POST')
		{
			typefld.setDisplayType('hidden');
		}
		
		//Platform
		var platfld = nsform.addField('custpage_plat','select','Item Platform', null,'grpa');
		platfld.setMandatory(true);
		platfld.addSelectOption('','',true);
		//Loop through bTypeJson if jbPlatSelection is set
		if (jbPlatSelection && jbTypeSelection)
		{
			for (var p=0; p < platByTypeJson[jbTypeSelection].length; p+=1)
			{
				platfld.addSelectOption(
					platByTypeJson[jbTypeSelection][p], 
					bPlatJson[platByTypeJson[jbTypeSelection][p]],
					false
				);
			}
		}
		platfld.setDefaultValue(jbPlatSelection);
		if (req.getMethod()=='POST')
		{
			platfld.setDisplayType('hidden');
		}
				
		var lvlOneQtyFld = nsform.addField('custpage_lvloneqty', 'integer', 'Lines to Add',null, 'grpa');
		lvlOneQtyFld.setMandatory(true);
		lvlOneQtyFld.setDisplaySize(15);
		lvlOneQtyFld.setDefaultValue(lvlQty);
		if (req.getMethod()=='POST')
		{
			lvlOneQtyFld.setDisplayType('hidden');
		}
		
		//Item List
		var itemFld = nsform.addField('custpage_items', 'multiselect', 'Item List', null, 'grpa');
		itemFld.setMandatory(true);
		itemFld.setDisplaySize(370, 7);
		if (req.getMethod()=='POST')
		{
			itemFld.setDisplayType('hidden');
		}
				
		//insert and build item list ONLY if jbTypeSelection is set
		if (jbTypeSelection && jbPlatSelection) {
			
			var itemKey = jbTypeSelection+'-'+jbPlatSelection;
			
			//At this point, assume there are Items 
			for (var it=0; it < itemsByTpJson[itemKey].length; it+=1) 
			{
				var setItemSelected = false;
				if (lvlSelection.contains(itemsByTpJson[itemKey][it].id)) {
					setItemSelected = true;
				} 
				itemFld.addSelectOption(
					itemsByTpJson[itemKey][it].id, 
					itemsByTpJson[itemKey][it].name, 
					setItemSelected
				);
			}
		}
		
		var itemHelpFld = nsform.addField('custpage_itemhelp','inlinehtml','',null,'grpa');
		itemHelpFld.setDefaultValue(
			'<span style="font-size: 10px;">'+
			'* Number of item usage based on transactions.<br/><br/>'+
			'</span>'
		);
		if (req.getMethod()=='POST')
		{
			itemHelpFld.setDisplayType('hidden');
		}
		
		//Column B ----------------------
		//Date
		var itemOption1 = nsform.addField('custpage_date', 'date', 'Date', null,'grpa');
		itemOption1.setDisplaySize(25);
		itemOption1.setBreakType('startcol');
		itemOption1.setDefaultValue(odate);
		if (req.getMethod()=='POST')
		{
			itemOption1.setDisplayType('hidden');
		}
		
		itemOption2 = nsform.addField('custpage_aprxtime', 'select', 'Approx Time', 'customlist_approx_time', 'grpa'); 
		itemOption2.setDefaultValue(oaptime);
		if (req.getMethod()=='POST')
		{
			itemOption2.setDisplayType('hidden');
		}
		
		var itemOption3 = nsform.addField('custpage_time', 'timeofday', 'Time', null,'grpa');
		itemOption3.setDisplaySize(25);
		itemOption3.setDefaultValue(otime);
		if (req.getMethod()=='POST')
		{
			itemOption3.setDisplayType('hidden');
		}
		
		var itemOption4 = nsform.addField('custpage_course', 'select', 'Course', 'customrecord_course', 'grpa');
		itemOption4.setDefaultValue(ocourse);
		if (req.getMethod()=='POST')
		{
			itemOption4.setDisplayType('hidden');
		}
		
		var itemOption5 = nsform.addField('custpage_city', 'text', 'City', null,'grpa');
		itemOption5.setDisplaySize(25);
		itemOption5.setDefaultValue(ocity);
		if (req.getMethod()=='POST')
		{
			itemOption5.setDisplayType('hidden');
		}
		
		var itemOption6 = nsform.addField('custpage_postal', 'text', 'Postal Code', null,'grpa');
		itemOption6.setDisplaySize(25);
		itemOption6.setDefaultValue(ozip);
		if (req.getMethod()=='POST')
		{
			itemOption6.setDisplayType('hidden');
		}
		
		var itemOption7 = nsform.addField('custpage_state', 'select', 'State', 'customrecord_state','grpa');
		itemOption7.setDefaultValue(ostate);
		if (req.getMethod()=='POST')
		{
			itemOption7.setDisplayType('hidden');
		}
		
		var itemOption8 = nsform.addField('custpage_country', 'select', 'Country', 'customrecord_country','grpa');
		itemOption8.setDefaultValue(ocountry);
		if (req.getMethod()=='POST')
		{
			itemOption8.setDisplayType('hidden');
		}


		
		if (req.getMethod()=='POST')
		{
			//add close button by default once it's submitted
			//add set to Opportunity button
			nsform.addButton('custpage_setbtn','Add to Transaction','addToTransaction(false);');			
			//May 24 2016 - Request to add Add to Transaction (Chronological)
			nsform.addButton('custpage_chrobtn','Add to Transaction (Chronological)', 'addToTransaction(true);');			
			nsform.addButton('custpage_goback','Back to Item Filter', 'backtoItemFlt();');		
			nsform.addButton('custpage_closebtn', 'Cancel/Close', 'CancelClose();');
					
			var arSubsItems = [];	
			var itemList = nsform.addSubList('custpage_itemlist','list','Items to add to Quote');
			
			var itemInternalId = itemList.addField('item_internalid','text','Item Internal ID');
			itemInternalId.setDisplayType('hidden');		
			
			itemList.addField('item_itemid', 'text','Item Name', null);
			itemList.addField('item_price','currency','Price', null).setDisplayType('entry');
			itemList.addField('item_date', 'date','Date', null).setDisplayType('entry');			
			itemList.addField('item_aptime', 'select','Approx Time', 'customlist_approx_time');
			itemList.addField('item_time', 'timeofday','Time',null).setDisplayType('entry');
			
			//var courseSublistFld = itemList.addField('item_course', 'select','Course', null); 			
			itemList.addField('item_course', 'select','Course', 'customrecord_course');			
			
			itemList.addField('item_city','text','City', null).setDisplayType('entry');
			itemList.addField('item_zip','text','Postal Code', null).setDisplayType('entry');
			itemList.addField('item_state','select','State','customrecord_state');
			itemList.addField('item_country','select','Country','customrecord_country');			
			var newLine = 1;
			
			var arAll = arSubsItems.concat(lvlSelection);
			
			log('debug','arAll',arAll);
						

						

//------------------------------------------------------------------------------------------------------------------------------------------------
						
			//Apr 19 2016 - Add in Filtered drop down of all courses by Item Selection
			//May 5 2016 - Requested Change to add following course records:
			//				- Course has Items selected AND Is Custom From Item is FALSE
			//					OR
			//				- Is Custom From Item is TRUE AND Client Name is IN Client Value From 		
			//					In order to do this, we Need to first Grab ALL Active Is Custom is TRUE 
			//					Then loop through each to see if there is a match 
			
/*			var crflt = [new nlobjSearchFilter('isinactive', null,'is','F'),
			             new nlobjSearchFilter('custrecord_course_item', null, 'anyof', arAll),
			             new nlobjSearchFilter('custrecord_course_iscustom', null, 'is', 'F')],
			             
				crcol = [new nlobjSearchColumn('internalid'),
				         new nlobjSearchColumn('name').setSort()],
				crrs = nlapiSearchRecord('customrecord_course', null, crflt, crcol),
				courseIdList = [],
				courseListJson = {};
			
			//1. Loop through each result from crrs and add to courseIdList and courseListJson objects
			for (var cr=0; crrs && cr < crrs.length; cr+=1)
			{
				courseIdList.push(crrs[cr].getValue('internalid'));
				courseListJson[crrs[cr].getValue('internalid')] = crrs[cr].getValue('name');
			}
			
			log('debug','courseListJson',JSON.stringify(courseListJson));
			
			
			
			
			
			//May 5 2016 - Run search to grab ALL course with Custom=T
			var cnflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
			             new nlobjSearchFilter('custrecord_course_iscustom', null, 'is', 'T'),
			             new nlobjSearchFilter('custrecord_course_clientname', null, 'isnotempty','')],
				cncol = [new nlobjSearchColumn('internalid'),
				         new nlobjSearchColumn('name'),
				         new nlobjSearchColumn('custrecord_course_clientname')],
				cnrsea = nlapiCreateSearch('customrecord_course', cnflt, cncol),
				rIndex = 0,
				rMax = 1000,
				tempRs = null;
			
			var cnrs = cnrsea.runSearch();
			do
			{
				tempRs = cnrs.getResults(rIndex, rIndex + rMax);
			    
				for(var t=0; tempRs && t < tempRs.length; t+=1)
				{
					//Need to go through each result and check if course 
					//clientname exists in clientName from Quote
					var courseClientName = tempRs[t].getValue('custrecord_course_clientname');
					if (clientName.indexOf(courseClientName) > -1 && !courseIdList.contains(tempRs[t].getValue('internalid')))
					{
						//log('debug', 'Course Client Name // Quote Client', courseClientName+' // '+clientName);						
						courseIdList.push(tempRs[t].getValue('internalid'));
						courseListJson[tempRs[t].getValue('internalid')] = tempRs[t].getValue('name');
						
					}
					
				}
				
				rIndex = rIndex + rMax;
			}
			while(tempRs.length >= rMax);
		
		

/*		
			//Populate courseSublistFld column drop down
			courseSublistFld.addSelectOption('', '', true);
			for (var crl in courseListJson)
			{
				courseSublistFld.addSelectOption(crl, courseListJson[crl], false);
			}
*/



//------------------------------------------------------------------------------------------------------------------------------------------------	


		
			//Apr. 19 2016 - Need to build out JSON of Item pricing by currency defintion.
			//				 It will look for price value in following order
			//					1. Price by Client Currency
			//					2. Price by Clients' subsidiary currency
			//					3. All else fail. just grab Base Price of item
			/**
			 * priceJson structure
			 * priceJson = {
			 * 		'itemID':{
			 * 			'[currencid]:xx.xx,
			 * 			...
			 * 		},
			 * 		...
			 * }
			 */			 
			 //Load the customer record to see if they have custom "Item Pricing" 
			var custRec = nlapiLoadRecord('customer', cusInternalId);
			var	itempricingsJson = {};
			for ( var k = 1; k <= custRec.getLineItemCount('itempricing'); k++)
			{
				
				var ipItem = custRec.getLineItemValue('itempricing', 'item', k),
					ipCurrency = custRec.getLineItemValue('itempricing', 'currency', k),
					ipUnitPrice = custRec.getLineItemValue('itempricing', 'price', k);
					
					if (!itempricingsJson[ipItem])
					{
						itempricingsJson[ipItem] = {};
					}
					
					//Addin currency based price
					itempricingsJson[ipItem][ipCurrency] = ipUnitPrice;	
				
			}
		 		 
			var priceJson = {},
			priceflt = [new nlobjSearchFilter('internalid', null, 'anyof', arAll),
						new nlobjSearchFilter('isinactive', null, 'is', 'F'),
						new nlobjSearchFilter('pricelevel','pricing', 'anyof',['1','@NONE@'])], //Look for base price only. NONE of the discounts							
			pricecol = [new nlobjSearchColumn('currency','pricing'),
						new nlobjSearchColumn('unitprice','pricing'),
						new nlobjSearchColumn('item','pricing')],
			pricers = nlapiSearchRecord('item', null, priceflt, pricecol);

				//Loop through and build the priceJson object by Item
				for (var pr=0; pricers && pr < pricers.length; pr+=1)
				{
					
					var prItem = pricers[pr].getValue('item','pricing'),
						prCurrency = pricers[pr].getValue('currency','pricing'),
						prUnitPrice = pricers[pr].getValue('unitprice','pricing');
					
					if (!priceJson[prItem])
					{
						priceJson[prItem] = {};
					}
					
					//Addin currency based price
					priceJson[prItem][prCurrency] = prUnitPrice;
				}				
						
			//search for information 
			var ritemsFlt = [new nlobjSearchFilter('internalid', null, 'anyof', arAll)],
				ritemsCol = [new nlobjSearchColumn('itemid'),
			                 new nlobjSearchColumn('baseprice')],  
				ritemsRslt = nlapiSearchRecord('item', null, ritemsFlt, ritemsCol);
				
	
			for (var r=0; r < ritemsRslt.length; r++) 					
			{	

				var itemPriceValue = '';
						
				for (var j=0; j < lvlQty; j++)
				{
					//Price Value based on following flow
					//	1. Client Currency value
					//	2. Client Subsidiary Currency Value
					//	3. Base price of item

					itemPriceValue = (priceJson[ritemsRslt[r].getId()][clientCurrency]?priceJson[ritemsRslt[r].getId()][clientCurrency]:0.0);					
					//itemPriceValue = (ritemsRslt[r].getValue('baseprice')?ritemsRslt[r].getValue('baseprice'):0.0);
													
					if (priceJson[ritemsRslt[r].getId()] && !itempricingsJson[ritemsRslt[r].getId()])
					{
						//Check to see if there is different value for client currency for this item
						if (priceJson[ritemsRslt[r].getId()][clientCurrency])
						{
							itemPriceValue = priceJson[ritemsRslt[r].getId()][clientCurrency];							
						}
						//if ont client currency, Check to see if there is different value for clients' Subsidiary currency for this item
						else if (priceJson[ritemsRslt[r].getId()][subsidiaryCurrency])
						{
							itemPriceValue = priceJson[ritemsRslt[r].getId()][subsidiaryCurrency];
						}
						
						//other wise default to base price
					}	
					//Nov 26, 2016 - ELI - Updated so that Customer "Item Pricing"
					else if (itempricingsJson[ritemsRslt[r].getId()][clientCurrency])
					{
						itemPriceValue = itempricingsJson[ritemsRslt[r].getId()][clientCurrency];								  
					}
													
					itemList.setLineItemValue('item_internalid', newLine, ritemsRslt[r].getId());			
					itemList.setLineItemValue('item_itemid', newLine, ritemsRslt[r].getValue('itemid'));					
					itemList.setLineItemValue('item_price', newLine, itemPriceValue);										
					itemList.setLineItemValue('item_date', newLine, odate);
					itemList.setLineItemValue('item_aptime', newLine, oaptime);
					itemList.setLineItemValue('item_time', newLine, otime);
					itemList.setLineItemValue('item_course', newLine, ocourse);
					itemList.setLineItemValue('item_city', newLine, ocity);
					itemList.setLineItemValue('item_zip', newLine, ozip);
					itemList.setLineItemValue('item_state', newLine, ostate);
					itemList.setLineItemValue('item_country', newLine, ocountry);
					newLine++;
				}
		
			}
		}								
	
	} 
	catch (oppConfigErr) 
	{
		log('error','Generate Quote Configurator Error', getErrText(oppConfigErr));
		
		msgFld.setDefaultValue(getErrText(oppConfigErr));
	}
	
	res.writePage(nsform);
	
		
}
