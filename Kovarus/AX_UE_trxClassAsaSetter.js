/**
 * Author: json@audaxium.com
 * Date: 3/17/2013
 * Record: Opportunities, Estimates, Sales Order, Invoice
 * Mod Request: 3/27/2013
 * - Deploy for Purchase Order and Vendor Bills
 * Desc:
 * User Event fired on before Submit and ONLY on Create and Edit to set ASA and class line value based on requirements
 */

var errSbj='', errMsg='', procSbj='', procMsg='';
function asaClassBeforeSubmit(type) {
	
	if (type!='delete' && type!='xedit') {
		try {
			var itemcnt = nlapiGetLineItemCount('item');
			if (itemcnt > 0) {
				//loop process line item
				var itemJson = {};
				var itemIds = new Array();
				
				//gather all unique items in the line to do one search to get location, dept, and class
				for (var u=1; u <= itemcnt; u++) {
					//loop through itemIds and check for duplicate
					//log('debug','gathering item info','Line #: '+u+' // Item ID: '+nlapiGetLineItemValue('item','item',u));
					if (!itemIds.contains(nlapiGetLineItemValue('item','item',u))) {
						itemIds.push(nlapiGetLineItemValue('item','item',u));
					}
				}
				
				var hasItemSearchError = false;
				try {
					//populate itemJson object
					var itemflt = [new nlobjSearchFilter('internalid', null, 'anyof', itemIds)];
					var itemcol = [new nlobjSearchColumn('class'),
					               new nlobjSearchColumn('type')];
					var itemrslt = nlapiSearchRecord('item', null, itemflt, itemcol);
					
					for (var rj=0; rj < itemrslt.length; rj++) {
						var ritemid = itemrslt[rj].getId();
						if (!itemJson[ritemid]) {
							itemJson[ritemid]={};
						}
						itemJson[ritemid]['class'] = (itemrslt[rj].getValue('class')?itemrslt[rj].getValue('class'):'');
						itemJson[ritemid]['type'] = itemrslt[rj].getValue('type');
						
						//log('debug','adding class/type info','Item ID: '+ritemid+' == Class: '+itemJson[ritemid]['class']+' || type: '+itemJson[ritemid]['type']);
						
					}
					
				} catch (itemssearcherror) {
					hasItemSearchError = true;
					log('error','trx '+nlapiGetRecordType()+' // trxid: '+nlapiGetRecordId() ,
						'Item Search for '+itemIds+' failed: '+getErrText(itemssearcherror));
				}
				
				//proceed only when there are no item search error
				var ignoreItemType = ['Description','Subtotal'];
				if (!hasItemSearchError) {
					for (var j=1; j <= itemcnt; j++) {
						//loop through itemIds and set class values
						var pitemid = nlapiGetLineItemValue('item','item',j);
						
						if (itemJson[pitemid]) {
							log('debug','Processing class set','Line #: '+j+' // Item ID: '+pitemid);
							if (!ignoreItemType.contains(itemJson[pitemid]['type'])) {
								
								nlapiSelectLineItem('item', j);
								if (itemJson[pitemid]['class']) {
									nlapiSetCurrentLineItemValue('item', 'class', itemJson[pitemid]['class']);
								}
								//set ASA value for historical: ext price MINUST estimated Ext. Cost
								var estExtCost = nlapiGetCurrentLineItemValue('item','costestimate')?parseFloat(nlapiGetCurrentLineItemValue('item','costestimate')):0.0;
								var extPrice = nlapiGetCurrentLineItemValue('item','amount')?parseFloat(nlapiGetCurrentLineItemValue('item','amount')):0.0;
								
								altAsaAmt = extPrice-estExtCost;
								nlapiSetCurrentLineItemValue('item','altsalesamt', altAsaAmt);
								
								nlapiCommitLineItem('item');
							}
						}
					}
				}
			}
		} catch (beforeSubmitError) {
			log('error','Error setting ASA/Cass', nlapiGetRecordType()+' // '+nlapiGetRecordId()+' asa/class error: '+getErrText(beforeSubmitError));
			nlapiSendEmail('-5', 'Kovarus@audaxium.com,', 'Error occured while setting Class and ASA: '+type, 'Error occured on User Event for '+
						   nlapiGetRecordType()+ ' (Internal ID: '+nlapiGetRecordId()+') <br/><br/>Failure Msg: '+getErrText(beforeSubmitError));
		}
	}
}

