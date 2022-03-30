define(['N/error', 
        'N/record', 
        'N/search',
        'N/email',
        'N/file',
        'N/xml',
        'N/render',
        '/SuiteScripts/Audaxium Customization/CUST_DATE_LIB',
        '/SuiteScripts/Audaxium Customization/UTILITY_LIB'],
/**
 * Series helper functions specific to Syncing of Item Fulfillment Contract/License with Bridge App.
 * All these function logics are used multiple times within the auxlac_ss2_syncItemFulfillmentWithBridgeApp.js
 * 
 * @param {error} error
 * @param {record} record
 * @param {search} search
 */
function(error, record, search, email, file, xml, render, custDate, custUtil) 
{

	/**
	 * @param {Object} _qJson
	 * 		- JSON object that holds ALL Processing related information. This JSON object
	 * 		  includes Customer ID, Item Fulfillment Id, Sales order ID, rwcontract Id and OG Contract ID
	 * 		  along with other helpful infos.
	 * @param {Object} _licIds
	 * 		- List of Internal IDs of ALL processed Licenses. This avoids need to run search
	 * @param {string} _orderType
	 * 		- Order Type 1=New, 2=Renew, 3=Upsell
	 * 
	 * @return {Object}
	 * 		- status, error
	 */
	function sendStatementEmail(_qJson, _licIds, _orderType)
	{
		var robj = {
			'status':true,
			'error':''
		};
		
		try
		{
			log.debug('send email started', _orderType);
			
			//We need to grab endUser and billToUser
			var sendToBillUserId = _qJson.sorec.getValue({
					'fieldId':'entity'
				}),
				fromSalesRepId = _qJson.sorec.getValue({
					'fieldId':'salesrep'
				}),
				soTranId = _qJson.sorec.getValue({
					'fieldId':'tranid'
				}),
				templateToUse = '',
				sendToContactId = _qJson.sorec.getValue({
					'fieldId':'custbody_tricerat_contactontrans'
				}),
				sendToContactEmail = _qJson.sorec.getValue({
					'fieldId':'custbody_tricerat_contactemail'
				});
			
			if (!sendToContactId || !sendToContactEmail)
			{
				//This is an error return as error
				robj.status = false;
				robj.error = 'Sales Order is missing Contact with Email Address to Send To';
				
				return robj;
			}
			
			//If sales rep is NOT set, send it from generic user defined in company preference
			if (!fromSalesRepId)
			{
				fromSalesRepId = _qJson.defaultsalesrep;
			}
			
			//Determine Template to Use
			if (_orderType == '1')
			{
				templateToUse = _qJson.newtemplateid;
			}
			else if (_orderType == '2')
			{
				templateToUse = _qJson.renewtemplateid;
			}
			else if (_orderType == '3')
			{
				templateToUse = _qJson.upselltemplateid;
			}
			
			log.debug('template',templateToUse);
			
			//Build email related variables
			var fileIds = [],
				fileObjs = [],
				attchRecords = {
					'transactionId':_qJson.sorecid,
					'entityId':sendToBillUserId
				},
				//Header is part of XML
				//where Columns headers are following IN ORDER
				//Quantity | Item Description | License Activation Code
				itemTrHtml = '';
			
			//9/16/2016
			// We need to make sure TLM items are included on the item list as well.
			// Since we are not syncing TLM Licenses with Contract Items, 
			// we source list of Contract Items directly from Renewal Contract
			// and only display qty and item sales description.
			if (_qJson.syncsystem == 'TLM' || _qJson.syncsystem == 'BOTH')
			{
				var activeCiSearch = search.create({
						'type':'customrecord_contract_item',
						'filters':[
						            ['custrecord_ci_contract_id', search.Operator.ANYOF, _qJson.rwcontract],
						            'and',
						           	//This filter makes sure we are grabbing contract items for TLM
						            //If Sandbox is refreshed after 9/22/2016 below mapping is NOT NEEDED
									//Sandbox: custitem_xformationitem
									//Production: custitem_afa_xformationitem
						           	['custrecord_ci_item.custitem_afa_xformationitem', search.Operator.IS, false],
						           	'and',
						           	['custrecord_ci_renewals_exclusion', search.Operator.IS, false]
						          ],
						'columns':[
						           'custrecord_ci_quantity', //0 qty
						           search.createColumn({
						        	   'name':'salesdescription',
						           	   'join':'custrecord_ci_item'
						           }), //1 display name
						           search.createColumn({
						        	   'name':'custitem_afa_20150721_installsetpdf',
						        	   'join':'custrecord_ci_item'
						           }), //2 instruction PDF
						           search.createColumn({
						        	   'name':'custitem_prodcode',
						        	   'join':'custrecord_ci_item'
						           }), //3 Product Code
						           search.createColumn({
						        	   'name':'custitem1',
						        	   'join':'custrecord_ci_item'
						           }), //4 Maint. Perpetual Item Ref. (Used when Product Code is Empty)
						           'custrecord_ci_item'// 5 THIS Item Record
						          ] 
					}),
					aciCols = activeCiSearch.columns,
					acirs = activeCiSearch.run().getRange({
						'start':0,
						'end':1000
					});
				
				log.debug('Ran aci search', acirs.length);
				
				//9/16/2016
				// For TLM Items, we ONLY want to display salesdescription of item which has Product Code 
				// Field Set.
				// For Upsell and New, we will always know what that item is.
				// for Renewal, this isn't known because the renewal item is used.
				// Each renewal item does have reference to perpetual item it's renewing for.
				// which HAS the Product code. 
				// The Process is:
				//    - Grab list of ALL Contract Item that Is NOT Renewal Exclusion.
				//    - Build Initial JSON object of TLM items to Display on the Email
				//    - If Row has Product Code, add to JSON
				//	  - If Row has NO Product Code 
				//			- If Perp Maint Item is NOT in JSON, add to JSON and add Item ID to lookup array
				//			- If Perp Maint Item IS in JSON. skip
				//	  - If Item Lookup Array is Not Empty, run search for those items to grab salesdescription
				
					//JSON to store ONLY those that should be shown in the email
				var displayJson = {},
					//Array to track of item IDs to lookup salesdescription against
					arItemLookup = [];
				for (var ac=0; ac < acirs.length; ac+=1)
				{
					var tqty = acirs[ac].getValue(aciCols[0]),
						tdesc = acirs[ac].getValue(aciCols[1]),
						tfile = acirs[ac].getValue(aciCols[2]),
						tpcode = acirs[ac].getValue(aciCols[3]),
						tpref = acirs[ac].getValue(aciCols[4]),
						titem = acirs[ac].getValue(aciCols[5]);
					log.debug('tpref', tpref);
					//Has Product Code
					if (tpcode)
					{
						displayJson[titem] = {
							'qty':tqty,
							'desc':tdesc,
							'file':tfile,
							'serial':[]
						};
					}
					else
					{
						//We check to see if tpref exists in displayJson
						//	if NOT, add in empty JSON and add to arItemLookup
						if (!displayJson[tpref])
						{
							displayJson[tpref] = {
								'qty':tqty,
								'desc':'',
								'file':'',
								'serial':[]
							};
							
							//Add to arItemLookup ONLY if it doesn't already exist
							if (arItemLookup.indexOf(tpref) == -1)
							{
								arItemLookup.push(tpref);
							}
						}
					}
				}//End loop for building displayJson
				
				log.debug('displayJson Check point', JSON.stringify(displayJson));
				
				//If arItemLookup array is NOT empty, we need to grab sales description and instruction for those.
				if (arItemLookup.length > 0)
				{
					var itemSearch = search.create({
						'type':search.Type.ITEM,
						'filters':[
						            ['internalid', search.Operator.ANYOF, arItemLookup],
						          ],
						'columns':[
						           'internalid', //0
						           'salesdescription', //1
						           'custitem_afa_20150721_installsetpdf' //2
						          ] 
					}),
					itemCols = itemSearch.columns,
					itemrs = itemSearch.run().getRange({
						'start':0,
						'end':1000
					});
					
					//Assume no more than 1000
					//	we now loop through and update displayJson with desc and file
					for (var it=0; itemrs && it < itemrs.length; it+=1)
					{
						displayJson[itemrs[it].getValue(itemCols[0])].desc = itemrs[it].getValue(itemCols[1]);
						displayJson[itemrs[it].getValue(itemCols[0])].file = itemrs[it].getValue(itemCols[2]);
					}
				}
				
				//9/21/2016
				//For TLM for CREATE or UPSELL, we need to grab matching License Keys.
				//	Since TLM we do not associate generate license record with contract item,
				//	based on perpetual item on the contract item to be displayed and sales order, we look up
				//	License List and match it up against item
				if (_orderType=='1' || _orderType=='3')
				{
					var tlSearch = search.create({
							'type':'customrecord_licenses',
							'filters':[
							            ['isinactive', search.Operator.IS, false],
							            'and',
							            ['custrecord_ordref', search.Operator.ANYOF, _qJson.sorecid]
							          ],
							'columns':[
							           'custrecord_serialnumber', //0
							           'custrecord_license_itemref'
							          ] 
						}),
						tlCols = tlSearch.columns,
						tlrs = tlSearch.run().getRange({
							'start':0,
							'end':1000
						});
					
					//loop through result and add to displayJson.serial array
					for (var t=0; tlrs && t < tlrs.length; t+=1)
					{
						var licItem = tlrs[t].getValue(tlCols[1]),
							licSerial = tlrs[t].getValue(tlCols[0]);
						
						if (displayJson[licItem] && displayJson[licItem].serial.indexOf(licSerial) == -1)
						{
							displayJson[licItem].serial.push(licSerial);
						}
					}
				}
				
				//We now loop through displayJson
				for (var d in displayJson)
				{
					var ciFileId = displayJson[d].file,
						ciQty = xml.escape({
									'xmlText':displayJson[d].qty
								 }),
						ciItemDesc = xml.escape({
										'xmlText':displayJson[d].desc
									  });
					
				
						//9/21/2016
						ciSerial = ' ';
					
					if (displayJson[d] && displayJson[d].serial.length > 0)
					{
						for (var sk=0; sk < displayJson[d].serial.length; sk+=1)
						{
							ciSerial += xml.escape({
											'xmlText':displayJson[d].serial[sk]
										});
							
							
							if ((sk+1) != displayJson[d].serial.length)
							{
								ciSerial += '<br/>';
							}
						}
					}
					
					//Check the file uniqueness. If Unique, Load the file and add to fileObjs array
					if (ciFileId && fileIds.indexOf(ciFileId) == -1)
					{
						fileIds.push(ciFileId);
						
						//Load the file and add to fileObjs array
						fileObjs.push(
							file.load({
								'id':ciFileId
							})
						);
					}
					
					//At this point, we build the eachRowValue table cell HTML
					itemTrHtml += '<tr style="padding-top: 2px; padding-bottom: 2px;">'+
								  '<td style="padding: 10px;" align="left" width = "45px" valign="top">'+
								  ciQty+
								  '</td>'+
								  '<td  style="border-left: 1px solid #000000; padding: 10px;" align="left" width = "200px" valign="top">'+
								  ciItemDesc+
								  '</td>'+
								  '<td  style="border-left: 1px solid #000000; padding: 10px;" align="left" width = "200px" valign="top">'+
								  ciSerial+
								  '</td>'+
								  '</tr>';
				}//End loop for adding TLM items
			}
			
			//ONLY Process below if the syncsystem is NOT TLM
			//	LAC or BOTH.
			//	If contract contains LAC items, we display list of ALL licenses associated with
			//	OG Contract
			if (_qJson.syncsystem != 'TLM')
			{
				//We now need to run a search against License Record to grab all necessary values.
				//Change. Run it against ogcontract 
				var licSearch = search.create({
						'type':'customrecord_licenses',
						'filters':[
						           	['isinactive', search.Operator.IS, false],
						           	'and',
						           	//['internalid', search.Operator.ANYOF, _licIds]
						           	//If Sandbox is refreshed after 9/22/2016 below mapping is NOT NEEDED
									//Sandbox: custrecord_tri_original_contract_lf
									//Production: custrecord_og_contract
						           	['custrecord_og_contract', search.Operator.ANYOF, _qJson.ogcontract]
						          ],
						'columns':[
						            'internalid', //0 - license record ID
						            'custrecord_serialnumber', //1 - Serial Number
						           	search.createColumn({
						           		'name':_qJson.licqtyfldid
						           	}), //2 - Licence Qty
						           	search.createColumn({
						           		'name':'salesdescription',
						           		'join':'custrecord_license_itemref'
						           	}), //3 - License item Sales Description
						           	search.createColumn({
						           		'name':'custitem_afa_20150721_installsetpdf',
						           		'join':'custrecord_license_itemref'
						           	}) //4 - PDF File to Send
						          ]
					}),
					licsCols = licSearch.columns,
				
					licrs = licSearch.run().getRange({
						'start':0,
						'end':1000
					});
				
				log.debug('search ran', licrs.length);
				
				//JSON Object to hold licenses that has Renewal Inclusion Not Checked (Via linked Contract Item)
				//ONLY Check this for Renewal and Upsell
				var licIncludeJson = {},
					allLicIds = [];
				if (_orderType=='2' || _orderType=='3')
				{
					//9/12/2016
					//ONLY for Renew or Upsell, we need to make sure the contract Item linked to the Licenses
					//	have Renewal Exclusion NOT CHECKED: custrecord_ci_renewals_exclusion != T
					
					//Loop through and grab ALL Licenses
					for (var allic=0; licrs && allic < licrs.length; allic+=1)
					{
						allLicIds.push(licrs[allic].getValue(licsCols[0]));
					}
					
					var activeLicSearch = search.create({
							'type':'customrecord_contract_item',
							'filters':[
							           	['custrecord_afa_license2renew', search.Operator.ANYOF, allLicIds],
							           	'and',
							           	['custrecord_ci_renewals_exclusion', search.Operator.IS, false]
							          ],
							'columns':['custrecord_afa_license2renew']
						}),
						alsCols = activeLicSearch.columns,
						alsrs = activeLicSearch.run().getRange({
							'start':0,
							'end':1000
						});
					
					for (var al=0; alsrs && al < alsrs.length; al+=1)
					{
						licIncludeJson[alsrs[al].getValue(alsCols[0])] = alsrs[al].getValue(alsCols[0]);
					}
					
				}
				
				log.debug('licIncludeJson', JSON.stringify(licIncludeJson));
				
				for (var lic=0; lic < licrs.length; lic+=1)
				{
					//log.debug('building html for ', licrs[lic].getValue(licsCols[3]));
					
					//For Renewal or Upsell, we ONLY include the license info if active.
					if (_orderType=='2' || _orderType=='3')
					{
						log.debug('Check Lic for Includsion', licrs[lic].getValue(licsCols[0]));
						
						if (!licIncludeJson[licrs[lic].getValue(licsCols[0])])
						{
							
							log.debug('License ID NOT in Active List', licrs[lic].getValue(licsCols[0])+' Not In '+JSON.stringify(licIncludeJson));
							continue;
						}
					}
					
					var rowFileId = licrs[lic].getValue(licsCols[4]),
						rowQty = xml.escape({
									'xmlText':licrs[lic].getValue(licsCols[2])
								 }),
						rowItemDesc = xml.escape({
										'xmlText':licrs[lic].getValue(licsCols[3])
									  }),
						rowSerialNum = xml.escape({
									   	  'xmlText':licrs[lic].getValue(licsCols[1])
									   });
						
					
					//Check the file uniqueness. If Unique, Load the file and add to fileObjs array
					if (rowFileId && fileIds.indexOf(rowFileId) == -1)
					{
						fileIds.push(rowFileId);
						
						//Load the file and add to fileObjs array
						fileObjs.push(
							file.load({
								'id':rowFileId
							})
						);
					}
					
					//At this point, we build the eachRowValue table cell HTML
					itemTrHtml += '<tr style="padding-top: 2px; padding-bottom: 2px;">'+
								  '<td style="padding: 10px;" align="left" width = "45px" >'+
								  rowQty+
								  '</td>'+
								  '<td  style="border-left: 1px solid #000000; padding: 10px;" align="left" width = "200px" >'+
								  rowItemDesc+
								  '</td>'+
								  '<td  style="border-left: 1px solid #000000; padding: 10px;" align="left" width = "200px" >'+
								  rowSerialNum+
								  '</td>'+
								  '</tr>';
								  
					log.debug('lic index '+lic, itemTrHtml);
				}
			}
			
			
			//if fileObjs is Empty, change to Null
			//10/10/2016
			//Alan requested not to include ANY attachment(s)
			//if order type is renewal
			if (_orderType == '2' || fileObjs.length == 0)
			{
				fileObjs = null;
			}
			
			//log.debug('fileObjs size', fileObjs.length);
			
			//At this Point, we are ready to build Email Content from XML Template
			var xmlTempVal = file.load({
					'id':templateToUse
				}).getContents();
			
			//Let's create render object
			var renderer = render.create();
			renderer.templateContent = xmlTempVal.replace('#ITEMLIST#', itemTrHtml);
			renderer.addRecord(
				'salesorder',
				_qJson.sorec
			);
			
			//Load and set Bill To User
			renderer.addRecord(
				'customer',
				record.load({
					'type':'customer',
					'id':sendToBillUserId
				})
			);
			
			var finalRenderedHtml = renderer.renderAsString();
			
			//Let's Generate Email and make sure we attach to Sales Order record
			//9/29/2016
			//Alan requested to BCC sales rep
			email.send({
				'author':fromSalesRepId,
				'recipients':sendToContactId,
				'subject':'Order Status: Order #'+soTranId+' has been Fulfilled',
				'body':finalRenderedHtml,
				'attachments':fileObjs,
				'relatedRecords':attchRecords,
				'bcc':[fromSalesRepId]
			});
			
			log.debug('Email Sent to Contact ID On SO'+sendToContactId, 'Attached To Sales Order '+_qJson.sorecid);
			
		}
		catch(emailerr)
		{
			robj.status = false;
			robj.error = 'Send Statement Error: '+custUtil.getErrDetail(emailerr);
		}
		
		log.debug('Send Statement Result', JSON.stringify(robj));
		
		return robj;
		
	}
	
	/**
	 * @param {string} _serialNumber
	 * 	- Serial Number to search in NetSuite. Each serial numbers are unique
	 *		and if it exists, it is assumed to return one. This function WILL return
	 *		JSON object of found serial number information
	 *
	 * @returns {string} internal ID of first matched license with THIS serial number.
	 * 
	 */
	function searchSerialNumber(_serialNumber)
	{
		log.debug('-- Helper Function called', 'searchSerialNumber called '+_serialNumber);
		
		if (!_serialNumber)
		{
			return '';
		}
		
		var duplicSearch = search.create({
			'type':'customrecord_licenses',
			'filters':[
			           	['isinactive', search.Operator.IS, false],
			           	'AND',
			           	['custrecord_serialnumber', search.Operator.IS, _serialNumber]
			          ],
			'columns':['internalid']
			}),
			allDupLicCols = duplicSearch.columns,
			//There should ONLY be ONE License per
			//	serial number
			duplicrs = duplicSearch.run().getRange({
				'start':0,
				'end':1
			});
		
		if (duplicrs && duplicrs.length > 0)
		{
			return duplicrs[0].getValue(allDupLicCols[0]);
		}
		
		return '';
	}
	
	/**
	 * This function looks at version Date (Renewal Date) 
	 * returned by LAC system into JavaScript Date Object.
	 * LAC returns the date value as YYYY.MMDD format.
	 * @param _itemVersionVal
	 * @returns {Date} Date Object
	 */
	function lacDateToNsDate(_itemVersionVal)
	{
		if (!_itemVersionVal)
		{
			return null;
		}
		
		var arItemVersion = _itemVersionVal.split('.'),
			yearVal = arItemVersion[0],
			monthVal = arItemVersion[1].substring(0,2),
			dayVal = arItemVersion[1].substring(2,4);
		
		return new Date(monthVal+'/'+dayVal+'/'+yearVal);
		
	}
	
	/**
	 * This function will update the queue as Pending/Processing since 
	 * Result did NOT come back right away from Bridge App.
	 * @param {Object} _qJson
	 * @param {Object} _requestJson
	 * @param {Object} _resBody
	 * @param {String} _task
	 * 		Upsell, Renewal or Create
	 */
	function updateQueueForPending(_qJson, _requestJson, _resBody, _task)
	{
		record.submitFields({
    		'type':'customrecord_ax_lactlm_sync_queue',
    		'id':_qJson.id,
    		'values':{
    			'custrecord_ltsq_syncprocdetail':_task+' Order still in progress. '+_qJson.integrationstatus,
    			'custrecord_ltsq_integrationid':_qJson.integrationid,
    			'custrecord_ltsq_requestjson':JSON.stringify(_requestJson),
    			'custrecord_ltsq_origcontract':_qJson.ogcontract,
    			'custrecord_ltsq_linkedrenewcontract':_qJson.rwcontract,
    			'custrecord_ltsq_integrationstatus':_qJson.integrationstatus,
    			'custrecord_ltsq_responsejson':_resBody
    		},
    		'options':{
    			'enablesourcing':true,
    			'ignoreMandatoryFields':true
    		}
    	});
		
		return true;
	}
	
	/**
	 * This function will update the queue as Success.
	 * @param {Object} _qJson
	 * @param {Object} _requestJson
	 * @param {String} _task,
	 * 		Upsell, Renewal or Create
	 * @param {Array} _allLic
	 * 		
	 */
	function updateQueueForSuccess(_qJson, _requestJson, _task, _allLic)
	{
		var detailMsg = _task+' Order Sync/Link Complete';
		if (_qJson.errordetail)
		{
			detailMsg = detailMsg + ' // '+_qJson.errordetail;
		}
		
		record.submitFields({
    		'type':'customrecord_ax_lactlm_sync_queue',
    		'id':_qJson.id,
    		'values':{
    			'custrecord_ltsq_syncprocdetail':detailMsg,
    			'custrecord_ltsq_integrationid':_qJson.integrationid,
    			'custrecord_ltsq_requestjson':JSON.stringify(_requestJson),
    			'custrecord_ltsq_origcontract':_qJson.ogcontract,
    			'custrecord_ltsq_linkedrenewcontract':_qJson.rwcontract,
    			'custrecord_ltsq_genlicenses':_allLic,
    			'custrecord_ltsq_syncstatus':_qJson.syncstatus, //2-Success or 5-Success with Warning (Email Issue)
    			'custrecord_ltsq_integrationstatus':_qJson.integrationstatus
    		},
    		'options':{
    			'enablesourcing':true,
    			'ignoreMandatoryFields':true
    		}
    	});
		
		return true;
	}
	
	/**
	 * This function will update the queue as Check point.
	 * @param {Object} _qJson
	 * @param {Object} _requestJson
	 * @param {Object} _resBody
	 * @param {String} _task
	 * 		Upsell, Renewal or Create
	 */
	function updateQueueForCp(_qJson, _requestJson, _resBody, _task)
	{
		record.submitFields({
    		'type':'customrecord_ax_lactlm_sync_queue',
    		'id':_qJson.id,
    		'values':{
    			'custrecord_ltsq_syncprocdetail':_task+' Order Check Point',
    			'custrecord_ltsq_integrationid':_qJson.integrationid,
    			'custrecord_ltsq_requestjson':JSON.stringify(_requestJson),
    			'custrecord_ltsq_origcontract':_qJson.ogcontract,
    			'custrecord_ltsq_linkedrenewcontract':_qJson.rwcontract,
    			'custrecord_ltsq_integrationstatus':_qJson.integrationstatus,
    			'custrecord_ltsq_responsejson':_resBody
    		},
    		'options':{
    			'enablesourcing':true,
    			'ignoreMandatoryFields':true
    		}
    	});
		
		return true;
	}
	
    return {
        'searchSerialNumber':searchSerialNumber,
        'lacDateToNsDate':lacDateToNsDate,
        'updateQueueForPending':updateQueueForPending,
        'updateQueueForSuccess':updateQueueForSuccess,
        'updateQueueForCp':updateQueueForCp,
        'sendStatementEmail':sendStatementEmail
    };
    
});
