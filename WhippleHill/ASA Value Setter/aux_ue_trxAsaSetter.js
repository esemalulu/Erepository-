/**
 * Author: json@audaxium.com
 * Date: 1/3/2013
 * Record: Opportunities, Estimates, Sales Order, Return Authorization
 * Desc:
 * User Event fired on before Submit and ONLY on Create and Edit to set ASA line value based on requirements
 */

var errSbj='', errMsg='', procSbj='', procMsg='';
function asaBeforeSubmit(type) {
	
	//var testModeCustomerIds = ['20159','15740'];
	
	if (type!='delete' && type!='xedit') {
		try {
			var ignoreItemType = ['Description','Discount','Subtotal','Item Group'];
			//TEST MODE
			/**
			if (!testModeCustomerIds.contains(nlapiGetFieldValue('entity'))) {
				log('debug','Test Mode',nlapiGetFieldValue('entity')+' is not one of '+testModeCustomerIds);
				return;
			}
			*/
			
			procMsg = 'LIVE Mode Email is sent out that captures calculation logic<br/><br/>'+
					  'Item Types Ignored: '+ignoreItemType+'<br/><br/>'+
					  'Processing '+nlapiGetRecordType()+' Action Type of: '+type+' Trx Number# '+nlapiGetFieldValue('tranid')+'<br/><br/>';
			
			var itemCnt = nlapiGetLineItemCount('item');
			var itemJson = {};
			var trxitemsWithLineNumber = new Array();
			var trxitems = new Array();
			if (itemCnt > 0) {
				//1. get list of all item ids
				for (var i=1; i <=itemCnt; i++) {
					//append 
					trxitemsWithLineNumber.push(nlapiGetLineItemValue('item','item',i)+'_'+i);
					
					if (!trxitems.contains(nlapiGetLineItemValue('item','item',i))) {
						trxitems.push(nlapiGetLineItemValue('item','item',i));
					}
					//else {
					//	log('error','WARNING - Same Item exists on the line','Same item exists on line '+i+' item: '+nlapiGetLineItemValue('item','item',i)+' ('+nlapiGetLineItemText('item','item',i)+')');
					//}
				}
				
				//2. search for items to get their type 
				//custitem_item_pricing_type
				//itemid
				//itemtype
				var itemFlt = [new nlobjSearchFilter('internalid', null, 'anyof', trxitems)];
				var itemCol = [new nlobjSearchColumn('internalid'),
				               new nlobjSearchColumn('custitem_item_pricing_type'),
				               new nlobjSearchColumn('itemid'),
				               new nlobjSearchColumn('type')];
				var itemRslt  = nlapiSearchRecord('item', null, itemFlt, itemCol);
				
				//3. populate itemJson
				for (var i=0; i < itemRslt.length; i++) {
					
					for (var ti=0; ti < trxitemsWithLineNumber.length; ti++) {
						
						var arItemLine = trxitemsWithLineNumber[ti].split('_');
						if (arItemLine[0] == itemRslt[i].getId()) {
							if (!itemJson[trxitemsWithLineNumber[ti]]) {
								itemJson[trxitemsWithLineNumber[ti]] = {};
							}
							itemJson[trxitemsWithLineNumber[ti]]['itemid'] = itemRslt[i].getId();
							itemJson[trxitemsWithLineNumber[ti]]['itemtypeid'] = itemRslt[i].getRecordType();
							itemJson[trxitemsWithLineNumber[ti]]['itemtypetext'] = itemRslt[i].getText('type');
							itemJson[trxitemsWithLineNumber[ti]]['pricingtypetext'] = itemRslt[i].getText('custitem_item_pricing_type');
							itemJson[trxitemsWithLineNumber[ti]]['itemtext'] = itemRslt[i].getValue('itemid');
							itemJson[trxitemsWithLineNumber[ti]]['process'] = true;
							itemJson[trxitemsWithLineNumber[ti]]['itemline'] = arItemLine[1];
							itemJson[trxitemsWithLineNumber[ti]]['listrate'] = nlapiGetLineItemValue('item','custcol_list_rate', arItemLine[1]);
							itemJson[trxitemsWithLineNumber[ti]]['qty'] = nlapiGetLineItemValue('item','quantity', arItemLine[1]);
							itemJson[trxitemsWithLineNumber[ti]]['amount'] = nlapiGetLineItemValue('item','amount', arItemLine[1]);
							itemJson[trxitemsWithLineNumber[ti]]['term'] = nlapiGetLineItemValue('item','custcol_swe_contract_item_term_months', arItemLine[1]);
							itemJson[trxitemsWithLineNumber[ti]]['termtext'] = '';
							if (itemJson[trxitemsWithLineNumber[ti]]['term'] && !isNaN(itemJson[trxitemsWithLineNumber[ti]]['term'])) {
								var termNumber = parseInt(itemJson[trxitemsWithLineNumber[ti]]['term']);
								//log('debug','termNumber', termNumber);
								if (termNumber > 12) {
									itemJson[trxitemsWithLineNumber[ti]]['termtext'] = 'Multi Year';
								} else if (termNumber < 12) {
									itemJson[trxitemsWithLineNumber[ti]]['termtext'] = 'Partial Year Prorated';
								} else {
									itemJson[trxitemsWithLineNumber[ti]]['termtext'] = 'One Year';
								}
							}
							itemJson[trxitemsWithLineNumber[ti]]['renewalex'] = nlapiGetLineItemValue('item','custcol_renewals_exclusion', arItemLine[1]);
							if (!nlapiGetLineItemValue('item','custcol_renewals_exclusion', arItemLine[1]) || nlapiGetLineItemValue('item','custcol_renewals_exclusion', arItemLine[1])=='F') {
								itemJson[trxitemsWithLineNumber[ti]]['renewalex'] = 'F';
							}
							itemJson[trxitemsWithLineNumber[ti]]['process'] = true;
							//log('debug','item type on line '+i,itemRslt[i].getText('type'));
							if (ignoreItemType.contains(itemRslt[i].getText('type'))) {
								//log('debug','item on line '+i, 'Ignore because it is '+itemRslt[i].getText('type'));
								itemJson[trxitemsWithLineNumber[ti]]['process'] = false;
							}
						}
					}//loop through trxitemsWithLineNumber;
				}// loop through each results
				
				//4. loop through itemJson
				
				var procLog = '';
				for (var item in itemJson) {
					log('debug','itemJson object - '+item, 'Line: '+itemJson[item].itemline + ' Item Type ('+itemJson[item].itemtypetext+') // process: '+itemJson[item].process);
					if (itemJson[item].process) {
						//altsalesamt
						var altSalesAmtValue = '';
						procLog += 'Item Line '+itemJson[item].itemline+' processing :<br/>';
						procLog += '[Pricing Type='+itemJson[item].pricingtypetext+', Renewal Exclusion='+itemJson[item].renewalex+' , Term='+itemJson[item].termtext+'('+itemJson[item].term+')<br/>';
						
						//check for 0 amount
						if (itemJson[item].amount && parseFloat(itemJson[item].amount)==0) {
							altSalesAmtValue = '0.0';
							procLog +='&nbsp; &nbsp; - ASA Value = set to 0.0 due to Amount being 0.0<br/>';
						} else if (itemJson[item].pricingtypetext == 'Monthly' && itemJson[item].renewalex == 'F') { 
							//&& (itemJson[item].termtext=='Multi Year' || itemJson[item].termtext=='Partial Year Prorated')) {
							
							procLog +='&nbsp; &nbsp; - Case 1 or 2 - Formula is the same<br/>'+
									  '&nbsp; &nbsp; - Calculate ASA using: ((List Rate) * Quantity) *12 or ((Amount) *12)<br/>'+
									  '&nbsp; &nbsp; - Quantity: '+itemJson[item].qty+', List Rate: '+itemJson[item].listrate+', Amount: '+itemJson[item].amount+'<br/>';
							if (itemJson[item].qty && itemJson[item].listrate) {
								altSalesAmtValue = ((parseInt(itemJson[item].qty) * parseFloat(itemJson[item].listrate)) * 12);
								procLog +='&nbsp; &nbsp; - ASA Value calculated as (qty * list rate) * 12 = '+altSalesAmtValue+'<br/>';
							} else if (itemJson[item].amount) {
								altSalesAmtValue = (parseFloat(itemJson[item].amount) * 12);
								procLog +='&nbsp; &nbsp; - ASA Value calculated as (amount) * 12= '+altSalesAmtValue+'<br/>';
							} else {
								altSalesAmtValue = '';
								procLog +='&nbsp; &nbsp; - ASA Value = Unable to calculate ASA due to missing values<br/>';
							}
						} else if (itemJson[item].pricingtypetext == 'Monthly' && itemJson[item].renewalex == 'T') {
							//&& itemJson[item].termtext=='Multi Year') {
						
							altSalesAmtValue = '0.0';
							procLog +='&nbsp; &nbsp; - Case 3<br/>'+
							  		  '&nbsp; &nbsp; - Calculate ASA using: Set as 0<br/>';
							
						} else if (itemJson[item].pricingtypetext != 'Monthly') {
							procLog +='&nbsp; &nbsp; - Case 4<br/>'+
					  		  		  '&nbsp; &nbsp; - Calculate ASA using: ((List Rate) * Quantity) or Amount<br/>'+
					  		  		  '&nbsp; &nbsp; - Quantity: '+itemJson[item].qty+', List Rate: '+itemJson[item].listrate+', Amount: '+itemJson[item].amount+'<br/>';
							if (itemJson[item].qty && itemJson[item].listrate) {
								altSalesAmtValue = (parseInt(itemJson[item].qty) * parseFloat(itemJson[item].listrate));
								procLog +='&nbsp; &nbsp; - ASA Value calculated as (parseInt(itemJson[item].qty) * parseFloat(itemJson[item].listrate)) = '+altSalesAmtValue+'<br/>';
							} else if (itemJson[item].amount) {
								altSalesAmtValue = (parseFloat(itemJson[item].amount));
								procLog +='&nbsp; &nbsp; - ASA Value calculated as (parseFloat(itemJson[item].amount)) = '+altSalesAmtValue+'<br/>';
							} else {
								altSalesAmtValue = '';
								procLog +='&nbsp; &nbsp; - ASA Value = Unable to calculate ASA due to missing values<br/>';
							}
						} else {
							altSalesAmtValue = '';
							procLog +='&nbsp; &nbsp; - Skip Calculation Does not match any Logic<br/>';
			  		  		  		  
						}
						
						if (altSalesAmtValue && itemJson[item].itemline && !isNaN(parseFloat(altSalesAmtValue))) {
							nlapiSetLineItemValue('item', 'altsalesamt', itemJson[item].itemline, parseFloat(altSalesAmtValue).toFixed(2));
						}
						
						procLog += '<br/><br/>';
						
					} else {
						procLog += 'Item Line '+itemJson[item].itemline+' marked as ignore<br/><br/>';
					}
				}
				procMsg += procLog;
			} else {
				procMsg += 'Nothing to Process. Item list is 0';
			}
			
			//testing send email to joe.son@audaxium.com and Audaxium Admin user
			procSbj = 'TESTING - WhippleHill ASA Setter - '+nlapiGetRecordType()+' Trx Ref#: '+nlapiGetFieldValue('tranid');
			//nlapiSendEmail(-5,'joe.son@audaxium.com,donb@whipplehill.com', procSbj, procMsg);
			
			
		} catch (asaerror) {
			log('error','Error ASA Setter', getErrText(asaerror));
			errSbj = 'Error while Processing '+nlapiGetRecordType()+' on '+type+' Trx Ref#: '+nlapiGetFieldValue('tranid');
			errMsg = nlapiGetRecordType()+ ' tranid: '+nlapiGetFieldValue('tranid')+'<br/><br/>'+
					 getErrText(asaerror);
			
			nlapiSendEmail(-5, 'joe.son@audaxium.com,donb@whipplehill.com',errSbj, errMsg);
		}
	}
}

