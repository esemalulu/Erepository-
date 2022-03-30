/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/email', 
        'N/error', 
        'N/format', 
        'N/http', 
        'N/record', 
        'N/search', 
        'N/task',
        'N/runtime',
        '/SuiteScripts/Audaxium Customization/CUST_DATE_LIB',
        '/SuiteScripts/Audaxium Customization/UTILITY_LIB',
        '/SuiteScripts/Audaxium Customization/LAC License Manager/BA_SYNC_HELPER'],
/**
 * @param {email} email
 * @param {error} error
 * @param {format} format
 * @param {http} http
 * @param {record} record
 * @param {search} search
 * @param {task} task
 */
function(email, error, format, http, record, search, task, runtime, custDate, custUtil, basyncUtil) 
{
   
    /**
     * This scheduled script will run every 15 min. and attempt to process queued up 
     * item fulfillment with Bridge Application. Bridge App. is Tricerat internally built 
     * REST API Handler that interacts with TLM or LAC
     *
     * @param {Object} context
     * @param {string} context.type - 
     * 			The context in which the script is executed. 
     * 			It is one of the values from the scriptContext.InvocationType enum.
     * @Since 2015.2
     */
    function executeSync(context) 
    {
    	var paramLastProcId = runtime.getCurrentScript().getParameter('custscript_sb422_lastprocid'),
    		//paramCompleteNotifier - Company Level Parameter
    		paramCompleteNotifier = runtime.getCurrentScript().getParameter('custscript_sb422_compnotifier'),
    		//Error Notifier - Default to Alan
    		paramErrorNotifier = '2',
    		CHECKLOG_PROCESSED = '1',
    		//Below values coming from Order Type custom list (customlist_order_type)
    		//TODO: Need to check if it is the same in Production
    		CONTRACT_NEW = '1',
    		CONTRACT_UPSELL = '3',
    		CONTRACT_RENEW = '2',
    		CONTRACT_DOWNSELL = '13',
    		//Below values coming from Item Category cust list (customlist_item_category_list)
    		//Below items
    		LIC_PERP_CAT = '1',
    		LIC_TERM_CAT = '2',
    		LIC_MAINT_NEW = '3',
    		LIC_MAINT_RENEW = '4';
    	
    	    //authentication info into BridgeApp
    	var bridgeAppInfo ={
    		'APIBaseURL':'http://216.50.172.18',
    		'AuthTokenAPIPath':'/oauth/token',
    		'LicenseAPIPath':'/licensing/orders',
    		'AuthTokenAPIClientID':'jgfVlgzKGm3cNxEZ',
    		'AuthTokenAPIClientSecret':'cc5c09ee702bbb520e5ebe28e43278814a88ee9e',
    	};
    	
    	//Build out the search against Queue Record and return it
    	//	First in First Out Order
    	var qflt = [
    	            	//Sync status of Pending or NULL
    	            	//Item Fulfillment Reference IS SET
    	            	//Sales Order Reference IS SET
    	            	['custrecord_ltsq_syncstatus', search.Operator.ANYOF, ['1','@NONE@']],
    	            	'AND',
    	            	['custrecord_ltsq_ifrec', search.Operator.NONEOF, ['@NONE@']],
    	            	'AND',
    	            	['custrecord_ltsq_salesorder', search.Operator.NONEOF, ['@NONE@']],
    	            	//TESTING
    	            	//'AND',
    	            	//['internalid', search.Operator.ANYOF, ['108']]
    	           ],
    		qcol = [
    		        search.createColumn({
    		        	'name':'internalid',
    		        	'sort':search.Sort.ASC
    				}), //0 Internal ID 
    				'custrecord_ltsq_ifrec', //1 Item Fulfillment Reference
    				'custrecord_ltsq_salesorder', //2 Sales Order Reference
    				'custrecord_ltsq_integrationid', //3 Integration ID
    				'custrecord_ltsq_genlicenses', //4 Generated Licenses (Multi-Select)
    				'custrecord_ltsq_origcontract', //5 Linked OG Contract
    				'custrecord_ltsq_linkedrenewcontract', //6 Linked Renewal Contract
    				'custrecord_ltsq_syncstatus', //7 Integration Status
    				'custrecord_ltsq_responsejson', //8 Integration Response
    				'custrecord_ltsq_integrationstatus', //9 Integration Status pending, processed, processing
    				'custrecord_ltsq_syncsystem'
    			   ];
    	
    	//if paramLastProcId is passed in during script reschedule
    	//	Return only those queue where internal id is greater than
    	//	last processed ID
    	if (paramLastProcId)
    	{
    		qflt.push('AND');
    		qflt.push(['internalidnumber',search.Operator.GREATERTHAN, paramLastProcId]);
    	}
    	
    	var qsObj = search.create({
			'type':'customrecord_ax_lactlm_sync_queue',
			'filters':qflt,
			'columns':qcol
		}),
		//grab all columns
		qAllCols = qsObj.columns,
		//Grab all 1000 that needs to run
		qrs = qsObj.run().getRange({
			'start':0,
			'end':1000
		});
	
		log.error('size',qrs.length);
		
		var procLog='';
		
		//2. Loop through each record and reveiw results and see what's going on
		for (var i=0; i < qrs.length; i+=1)
		{
	    	//build JSON object of queue for easy reference
			var qJson = {
				'id':qrs[i].getValue(qAllCols[0]),
				'ifrecid':qrs[i].getValue(qAllCols[1]),
				'ifrectext':qrs[i].getText(qAllCols[1]),
				'sorecid':qrs[i].getValue(qAllCols[2]),
				'sorectext':qrs[i].getText(qAllCols[2]),
				'rwcontract':qrs[i].getValue(qAllCols[6]),
				'ogcontract':qrs[i].getValue(qAllCols[5]),
				'isrwog':false,
				'customerid':'',
				'licenseids':qrs[i].getValue(qAllCols[4]),
				'integrationid':qrs[i].getValue(qAllCols[3]),
				'syncstatus':qrs[i].getValue(qAllCols[7]),
				'syncstatustext':qrs[i].getText(qAllCols[7]),
				'integrationresponse':qrs[i].getValue(qAllCols[8]),
				'integrationstatus':qrs[i].getValue(qAllCols[9]), //Value from BridgeApp
				'syncsystem':qrs[i].getValue(qAllCols[10]), //Sync System. TLM or LAC
				'ifrec':null,
				'sorec':null,
				'cicomplete':false,
				'senderroremail':false,
				'errordetail':'',
				//9/8/2016 - Add in company level preference for statement email
				'newtemplateid':runtime.getCurrentScript().getParameter('custscript_sb422_contractnewtempid'),
				'renewtemplateid':runtime.getCurrentScript().getParameter('custscript_sb422_contractrenewtempid'),
				'upselltemplateid':runtime.getCurrentScript().getParameter('custscript_sb422_contractupselltempid'),
				'licqtyfldid':runtime.getCurrentScript().getParameter('custscript_sb422_licenseqtyfldid'),
				'defaultsalesrep':runtime.getCurrentScript().getParameter('custscript_sb422_defsalesrepfrom')
			};
			
			//A. First thing we are going to do is to see if the Sales Order in question has been processed
			//	 for Contract Item Creation.  
			//		- We check Check Log Status field (custbody_check_log_status) on Sales Order.
			//			If this field is marked as Processed, we know it's done. 
			//		- Value of this field is coming from Check Log Status custom list (customlist_check_log_status)
			//			Value of Processed: 
			qJson.sorec = record.load({
				'type':record.Type.SALES_ORDER,
				'id':qJson.sorecid
			});
			
			//Set customer Internal ID from sales order
			//	This should always reference End User 
			qJson.customerid = qJson.sorec.getValue({
				'fieldId':'custbody_end_user'
			});
			
			//Set contract linked to Sales Order as renewal contract
			qJson.rwcontract = qJson.sorec.getValue({
				'fieldId':'custbody_contract_name'
			});
			
			log.error('before starting - qJson', JSON.stringify(qJson));
			
			//Grab the value of Check Log Status and see if it's finished processing Contract Item creation
			if (qJson.sorec.getValue({'fieldId':'custbody_check_log_status'}) == CHECKLOG_PROCESSED)
			{
				qJson.cicomplete = true;
			}
			else
			{
				//If it is NOT marked as complete, we need to see if the Contract Item script is running at the moment
				//	If there is one running, Move to Next
				//	Other wise, kick it off and move to next
	    		var waitSearch = search.create({
					'type':search.Type.SCHEDULED_SCRIPT_INSTANCE,
					'filters':[
					           	['status', search.Operator.NONEOF, ['CANCELED','COMPLETE','FAILED']],
					           	'AND',
					           	['script.scriptid', search.Operator.IS, 'customscript_swe_create_contract_items']
					          ],
					'columns':[
					           	search.createColumn({
					           		'name':'datecreated',
					           		'sort':search.Sort.ASC
								}), //0 Date Created - Sort ASC
								'status' //1 Queue ID
							  ]
					}),
					//Get the result. 
					//	We assume here that there can NEVER be more than 1000 failed queues
					waitrs = waitSearch.run().getRange({
						'start':0,
						'end':3
					});
	    		
	    		if (!waitrs || (waitrs && waitrs.length <= 0))
	    		{
	    			//There isn't one running, manually kick it off
	    			var ciSchSctTask = task.create({
						'taskType':task.TaskType.SCHEDULED_SCRIPT
					});
	    			ciSchSctTask.scriptId = 'customscript_swe_create_contract_items';
	    			ciSchSctTask.deploymentId = null;
					ciSchSctTask.submit();
					
					log.audit(
						'Queue ID '+qJson.id+' is Kicking off Contract Item Process',
						'SO // IF ('+qJson.sorecid+' // '+qJson.ifrecid+') Missing Contract Items. Queuing up contract item process for now'
					);
	    		}
			}
			
			//B. ONLY Move forward with Processing if cicomplete is marked as true
			//	 Contract Item MUST ALL be created. before License syncing can happen. 
			//	 If cicomplete isn't true at this point, process would have kicked off the process
			//	 	and this queued record will get picked up next time it runs.
			if (qJson.cicomplete)
			{
				log.error('Contract Items created', 'All Set. Lets start processing');
				
				//At this point, Load up Item Fulfillment and Customer Record
				qJson.ifrec = record.load({
					'type':record.Type.ITEM_FULFILLMENT,
					'id':qJson.ifrecid
				});
				
				qJson.customerrec = record.load({
					'type':record.Type.CUSTOMER,
					'id':qJson.customerid
				});
					
				//C. ----------------------- CORE PROCESS ----------------------------------------------
				//Let's grab original Contract info. 
				var ogContractLookUp = search.lookupFields({
					'type':'customrecord_contracts',
					'id':qJson.rwcontract,
					'columns':['custrecord_swe_original_contract']
				});
				
				if (ogContractLookUp.custrecord_swe_original_contract.length > 0)
				{
					qJson.ogcontract = ogContractLookUp.custrecord_swe_original_contract[0].value;
				}
				else
				{
					//If there are no value associated with Original Contract, 
					//	This means THIS contract IS the OG contract
					qJson.ogcontract = qJson.rwcontract;
					qJson.isrwog = true;
				}
				
				//GRAB LIST OF ALL Contract Items associated with THIS Contract
				//	IMPORTANT: Renewal Contract is Same as THIS Contract. 
				var allRwcJson = {},
					//We grab and build JSON object with list of info that needs to be sent to BridgeApp
					requestJson = {
						'customer':
						{
							'name':'',
							'phone':'',
							'street':'',
							'city':'',
							'state':'',
							'postalCode':'',
							'country':'',
							'netsuiteid':'',
							//Contacts is an array of JSON object
							//{'name':'', 'email':''}
							'contacts':[]
						},
						//items is an array of JSON object
						//	- serialNumbers is an array of serial numbers
						//{'productCode':'', 'quantity':0, 'serialNumbers:[]}
						'items':[]
					};
				
				//Build customerInfoJson object with necessary address info
				requestJson.customer.name = qJson.customerrec.getValue({
					'fieldId':'entityid'
				});
				
				requestJson.customer.phone = qJson.customerrec.getValue({
					'fieldId':'phone'
				});
				
				requestJson.customer.street = qJson.customerrec.getValue({
					'fieldId':'billaddr1'
				});
				
				requestJson.customer.city = qJson.customerrec.getValue({
					'fieldId':'billcity'
				});
				
				requestJson.customer.state = qJson.customerrec.getValue({
					'fieldId':'billstate'
				});
				
				requestJson.customer.postalCode = qJson.customerrec.getValue({
					'fieldId':'billzip'
				});
				
				requestJson.customer.country = qJson.customerrec.getValue({
					'fieldId':'billcountry'
				});
				
				requestJson.customer.netsuiteid = qJson.customerid;
				
				/**
				 * 9/12/2016 -
				 * ALAN Said, we don't need contacts. 
				 * 
				//Loop through contactroles sublist and grab list of contacts
				var ctcount = qJson.customerrec.getLineCount({
					'sublistId':'contactroles'
				});
				
				//loop through the sublist of contractroles and build requestJson.contacts array
				for (var ct=0; ct < ctcount; ct+=1)
				{
					var ctName = qJson.customerrec.getSublistValue({
							'sublistId':'contactroles',
							'fieldId':'contactname',
							'line':ct
						}),
						ctEmail = qJson.customerrec.getSublistValue({
							'sublistId':'contactroles',
							'fieldId':'email',
							'line':ct
						}); 
					
					requestJson.customer.contacts.push({
						'name':ctName,
						'email':ctEmail
					});
				}
				*/
				
				log.error('requestJson', JSON.stringify(requestJson));
				
				//Let's grab list of ALL Contract Items associated with THIS RW Contract 
				//8/9/2016 -
				//This should be against THIS Contract + THIS Sales Order.
				//	In the case of Upsell, it is going to return EVERY OTHER Contract Item
				//	even if it has NOTHING to do with this Transaction.
				var rwcSearch = search.create({
						'type':'customrecord_contract_item',
						'filters':[
						           	['isinactive',search.Operator.IS, 'F'],
						           	'AND',
						           	['custrecord_ci_contract_id', search.Operator.ANYOF, qJson.rwcontract],
						           	'AND',
						           	['custrecord_ci_original_transaction', search.Operator.ANYOF, qJson.sorecid],
						           	'AND',
						           	['custrecord_ci_original_transaction.mainline', search.Operator.IS, true]
						          ],
						'columns':[
						           'internalid', //0
						           'custrecord_ci_item', //1 item
						           'custrecord_ci_renew_with', //2 renew with item
						           'custrecord_ci_quantity', //3 contract item Qty
						           'custrecord_afa_license2renew', //4 linked License
						           search.createColumn({
						        	   'name':'custitem1',
						        	   'join':'custrecord_ci_item'
						           }), //5 Reference to perpetual Item
						           search.createColumn({
						        	   'name':'custitem_prodcode',
						        	   'join':'custrecord_ci_item'
						           }), //6 Reference to Product Code (perpetual items will have this)
						           search.createColumn({
						        	   'name':'custitem_item_category',
						        	   'join':'custrecord_ci_item'
						           }), //7 Reference to Item Category
						           'custrecord_ci_original_transaction', //8 original sales order from contract item
						           search.createColumn({
						        	   'name':'custbody_swe_contract_end_date',
						        	   'join':'custrecord_ci_original_transaction'
						           }), //9 Contract End Date
						           //9/16/2016 
						           //	Need to bring out custitem_xformationitem value of the item
						           //If Sandbox is refreshed after 9/22/2016 below mapping is NOT NEEDED
									//Sandbox: custitem_xformationitem
									//Production: custitem_afa_xformationitem
						           search.createColumn({
						        	   'name':'custitem_afa_xformationitem',
						        	   'join':'custrecord_ci_item'
						           }) //10 X-Forma Value which identifies LAC item
						          ]
					}),
					rwcAllCols = rwcSearch.columns,
					//Grab All. Assume there are no more than 1000 licenses
					//	Associated with this RW Contract
					rwcrs = rwcSearch.run().getRange({
						'start':0,
						'end':1000
					});
				//build out allRwcJson Object
				for (var rwci=0; rwcrs && rwci < rwcrs.length; rwci+=1)
				{
					//log.error('rwcrs size', rwcrs.length);
					allRwcJson[rwcrs[rwci].getValue(rwcAllCols[0])] = {
						'item':rwcrs[rwci].getValue(rwcAllCols[1]),
						'renewitem':rwcrs[rwci].getValue(rwcAllCols[2]),
						'qty':rwcrs[rwci].getValue(rwcAllCols[3]),
						'license':rwcrs[rwci].getValue(rwcAllCols[4]),
						'perpitem':rwcrs[rwci].getValue(rwcAllCols[5]),
						'prodcode':rwcrs[rwci].getValue(rwcAllCols[6]),
						'itemcat':rwcrs[rwci].getValue(rwcAllCols[7]),
						'ctsoid':rwcrs[rwci].getValue(rwcAllCols[8]),
						'ctenddate':rwcrs[rwci].getValue(rwcAllCols[9]),
						'islacitem':rwcrs[rwci].getValue(rwcAllCols[10])
					};
				}
				
				// 1. Grab list of ALL Licenses associated with Original Contract.
				//		- We grab list of ALL Licenses associated with OG Contract. This will be used
				//			to find matching license if contract item does NOT have license value set
				// 2. Grab list of ALL Contract Items for Original Contract.
				//		- OG contract Items are needed to identify list of perpetual items
				//		  and their product code
				
				var allLicJson = {},
					allOgcJson = {};
				
				//1. Let's grab list of ALL Licenses associated with OG Contract 
				var licSearch = search.create({
						'type':'customrecord_licenses',
						'filters':[
						           	['isinactive',search.Operator.IS, 'F'],
						           	'AND',
						          //If Sandbox is refreshed after 9/22/2016 below mapping is NOT NEEDED
									//Sandbox: custrecord_tri_original_contract_lf
									//Production: custrecord_og_contract
						           	['custrecord_og_contract', search.Operator.ANYOF, qJson.ogcontract]
						          ],
						'columns':[
						           'internalid', //0
						           'custrecord_serialnumber', //1 Serial Number
						           'custrecord_license_itemref', //2 License Item Ref
						           qJson.licqtyfldid, //3 License Qty,
						           
						           //If Sandbox is refreshed after 9/22/2016 below mapping is NOT NEEDED
									//Sandbox: custitem_xformationitem
									//Production: custitem_afa_xformationitem
						           search.createColumn({
						        	   'name':'custitem_afa_xformationitem',
						        	   'join':'custrecord_license_itemref'
						           }) //4
						          ]
					}),
					licAllCols = licSearch.columns,
					//Grab All. Assume there are no more than 1000 licenses
					//	Associated with this OG Contract
					licrs = licSearch.run().getRange({
						'start':0,
						'end':1000
					});
				//1a. build out allLicJson Object
				for (var li=0; licrs && li < licrs.length; li+=1)
				{
					allLicJson[licrs[li].getValue(licAllCols[0])] = {
						'serialnumber':licrs[li].getValue(licAllCols[1]),
						'item':licrs[li].getValue(licAllCols[2]),
						'qty':licrs[li].getValue(licAllCols[3]),
						//9/16/2016
						//Add in identification of LAC items.
						//	 we ONLY sync it back to Contract Item if it is LAC
						'islacitem':licrs[li].getValue(licAllCols[4])
					};
				}
				
				//2. Let's grab list of ALL Contract Items associated with THIS OG Contract 
				var ogcSearch = search.create({
						'type':'customrecord_contract_item',
						'filters':[
						           	['isinactive',search.Operator.IS, 'F'],
						           	'AND',
						           	['custrecord_ci_contract_id', search.Operator.ANYOF, qJson.ogcontract]
						          ],
						'columns':[
						           'internalid', //0
						           'custrecord_ci_item', //1 item
						           'custrecord_ci_renew_with', //2 renew with item
						           'custrecord_ci_quantity', //3 contract item Qty
						           'custrecord_afa_license2renew', //4 linked License
						           search.createColumn({
						        	   'name':'custitem1',
						        	   'join':'custrecord_ci_item'
						           }), //5 Reference to perpetual Item
						           search.createColumn({
						        	   'name':'custitem_prodcode',
						        	   'join':'custrecord_ci_item'
						           }), //6 Reference to Product Code (perpetual items will have this)
						           search.createColumn({
						        	   'name':'custitem_item_category',
						        	   'join':'custrecord_ci_item'
						           }), //7 Reference to Item Category
						           //9/16/2016 
						           //	Need to bring out custitem_xformationitem value of the item
						           //If Sandbox is refreshed after 9/22/2016 below mapping is NOT NEEDED
									//Sandbox: custitem_xformationitem
									//Production: custitem_afa_xformationitem
						           search.createColumn({
						        	   'name':'custitem_afa_xformationitem',
						        	   'join':'custrecord_ci_item'
						           }) //8 X-Forma Value which identifies LAC item
						          ]
					}),
					ogcAllCols = ogcSearch.columns,
					//Grab All. Assume there are no more than 1000 licenses
					//	Associated with this OG Contract
					ogcrs = ogcSearch.run().getRange({
						'start':0,
						'end':1000
					});
				//2a. build out allOgcJson Object
				for (var ogci=0; ogcrs && ogci < ogcrs.length; ogci+=1)
				{
					allOgcJson[ogcrs[ogci].getValue(ogcAllCols[0])] = {
						'item':ogcrs[ogci].getValue(ogcAllCols[1]),
						'renewitem':ogcrs[ogci].getValue(ogcAllCols[2]),
						'qty':ogcrs[ogci].getValue(ogcAllCols[3]),
						'license':ogcrs[ogci].getValue(ogcAllCols[4]),
						'perpitem':ogcrs[ogci].getValue(ogcAllCols[5]),
						'prodcode':ogcrs[ogci].getValue(ogcAllCols[6]),
						'itemcat':ogcrs[ogci].getValue(ogcAllCols[7]),
						'islacitem':ogcrs[ogci].getValue(ogcAllCols[8])
					};
				}
				
				//3. We need to link up RWC Contract Items with proper Licenses and build up prodcode
				//Loop through allRwcJson objects
				//allRwcJson key/value
				//[Contract Itek ID]:
				//{
				//	item:'',
				//	renewitem:'',
				//	qty:'',
				//	license:'',
				//	perpitem:'',
				//	prodcode:'',
				//	itemcat:'',
				//	ctsoid:'',
				//	ctenddate:''
				//}
				
				//rwcProdCodes is meant to hold perpitem to prod code
				//	This can happen for upsell where new product code is added
				//	on to THIS renewal/upsell contract that does not exist in 
				//	OG Contract.
				var rwcProdCodes = {};
				for (var rci in allRwcJson)
				{
					if (allRwcJson[rci].prodcode)
					{
						//If it has prodcode, this means the item is perp or term item
						//	Key is item ID of perp/term item 
						//	value is the prod code.
						rwcProdCodes[allRwcJson[rci].item] = allRwcJson[rci].prodcode;
					}
				}
				
				log.error('rwcProdCodes', JSON.stringify(rwcProdCodes));
				
				for (var rci in allRwcJson)
				{
					//For each of THIS Contract Items,
					// ONLY IF license is missing
					//	We need to find matching licenses
					if (!allRwcJson[rci].license)
					{
						//ONLY attempt to sync up contract Item and License if syncsystem is LAC
						if (qJson.syncsystem == 'TLM')
						{
							log.error('Skip License to Contract Item Link Up', 'Contract Item '+rci+' is TLM. Skip Link');
							continue;
						}
						
						for (var ali in allLicJson)
						{
							
							log.error(ali+' islacitem check', allLicJson[ali].islacitem);
							//ONLY do this if the item on the license is LAC
							//	This is because for Renewal there could be mixed bags
							if (allLicJson[ali].islacitem)
							{
								//We look for matching License where This Contract items' perpitem == License item
								//OR
								//If license Item equals to RWC Item meaning the RWC is the PERP or TERM item
								if (allLicJson[ali].item == allRwcJson[rci].perpitem ||
									allLicJson[ali].item == allRwcJson[rci].item)
								{
									//Update JSON object so that contract item is now mapped to license
									allRwcJson[rci].license = ali;
									
									//Update the Contract Item record with Associated License
									record.submitFields({
										'type':'customrecord_contract_item',
										'id':rci,
										'values':{
											'custrecord_afa_license2renew':ali
										},
										'options':{
											'enablesourcing':true,
											'ignoreMandatoryFields':true
										}
									});
									//Exit out of allLicJson loop
									break;
								}
							}
						}
					}//end check to see if we need to map out licenses
					//log.error('RWC Contract Item '+rci, 'Linked to License '+allRwcJson[rci].license);
					
					//For each of THIS Contract Items,
					// ONLY If prodcode is missing,
					//	We need to find matching prodcode
					if (!allRwcJson[rci].prodcode)
					{
						//First Look to see if we can grab it from rwcProdCodes JSON object.
						if (allRwcJson[rci].perpitem && rwcProdCodes[allRwcJson[rci].perpitem])
						{
							allRwcJson[rci].prodcode = rwcProdCodes[allRwcJson[rci].perpitem];
						}
						else
						{
							//Since Perpetual Item will hold value for
							//	prodcode, we go through all OG Contract Items
							//	to find THIS Contract Items perpitem and grab prod code
							for (var aog in allOgcJson)
							{
								log.error('og item to perpitem', allOgcJson[aog].item +' // '+ allRwcJson[rci].perpitem);
								if (allOgcJson[aog].item == allRwcJson[rci].perpitem)
								{
									log.error('found it', 'found prod code '+allOgcJson[aog].prodcode);
									allRwcJson[rci].prodcode = allOgcJson[aog].prodcode;
									
									break;
								}
								
							}
						}
						
						//9/17/2016
						//Found a bug where it IS possible the OG Contract May not contain
						//	perpetual item that can be referenced back for Product Code.
						//	Here we do final check to make sure we HAVE product code association.
						if (!allRwcJson[rci].prodcode)
						{
							//lookup prod code aginst perp item record.
							//allRwcJson[rci].perpitem
							var prdcodeSearch = search.create({
									'type':search.Type.ITEM,
									'filters':[
									            ['isinactive', search.Operator.IS, false],
									            'AND',
									           	['internalid', search.Operator.ANYOF, allRwcJson[rci].perpitem]
									          ],
									'columns':[
									           'custitem_prodcode', //0
									          ]
									}),
								prdcodeAllCols = prdcodeSearch.columns,
								prdcodecrs = prdcodeSearch.run().getRange({
									'start':0,
									'end':1
								});
						
							//if there are NO Result or no value returned, throw an error
							if (!prdcodecrs || (prdcodecrs && prdcodecrs.length == 0))
							{
								throw error.create({
									'name':'LIC_RENEW_MISSING_INFO',
									'message':'Unable to find Perpetual Item ('+allRwcJson[rci].perpitem+') Product Code '+
											  'via Item Search for Renewal Contract Item ID '+rnwnew,
									'notifyOff':true
								});
							}
							
							if (!prdcodecrs[0].getValue(prdcodeAllCols[0]))
							{
								throw error.create({
									'name':'LIC_RENEW_MISSING_INFO',
									'message':'Perpetual Item Product Code '+
											  'via Item Search failed for Renewal Contract Item ID '+rnwnew+
											  '. Item ID ('+allRwcJson[rci].perpitem+') is missing Product Code Value.',
									'notifyOff':true
								});
							}
							
							//At this point, we set the value
							allRwcJson[rci].prodcode = prdcodecrs[0].getValue(prdcodeAllCols[0]);
							
							log.error('Prod Code set via Search', allRwcJson[rci].prodcode+' set via Item search');
						}
						
					}
					//log.error('RWC Contract Item '+rci, 'Prod Code '+allRwcJson[rci].prodcode);
				}//End mapping License Record
				
				log.error('all License', JSON.stringify(allLicJson));
				log.error('all OG ContractItems', JSON.stringify(allOgcJson));
				log.error('all RW ContractItems', JSON.stringify(allRwcJson));
				
				//D. --------------- Sync and/or Link Process ------------
				
				//Let's grab Token to use from BridgeApp
				var accessToken = '',
					authTokenResponseBodyString = '',
					authRequestCode = '',
					authTokenResponseBody = '';
				
				//Request Token to use
				
				var authTokenResponse = http.post({
					'url':bridgeAppInfo.APIBaseURL + bridgeAppInfo.AuthTokenAPIPath,
					'body':{
						   		'grant_type':'client_credentials',
								'client_id':bridgeAppInfo.AuthTokenAPIClientID,
								'client_secret':bridgeAppInfo.AuthTokenAPIClientSecret
						   },
					'headers':{'Content-Type':'application/x-www-form-urlencoded'}
				});
				
				try
				{
					authTokenResponseBodyString = authTokenResponse.body,
					authRequestCode = authTokenResponse.code;
				    log.error('getAuthToken', 'authTokenResponseBodyString: ' + authTokenResponseBodyString);
				    authTokenResponseBody = JSON.parse(authTokenResponse.body);
	
				    if (authTokenResponseBody)
				    {
				    	accessToken = authTokenResponseBody.access_token;
				    }
				}
				catch (acctkerr)
				{
					if (!authRequestCode)
					{
						authRequestCode = 'ERROR';
					}
					
					authTokenResponseBodyString += 'Error occured while attempting to process: '+custUtil.getErrDetail(acctkerr);
				}
				
				
			    //Make sure we are able to grab access token. 
			    //	Other wise, Update the Queue as error
			    if (!accessToken)
			    {
			    	log.error('Unable to get Token', 'Access token request failed: '+authTokenResponseBodyString);
			    	record.submitFields({
			    		'type':'customrecord_ax_lactlm_sync_queue',
			    		'id':qJson.id,
			    		'values':{
			    			'custrecord_ltsq_syncstatus':'3', //Error status
			    			'custrecord_ltsq_syncprocdetail':'Unable to get Access Token // '+
			    											 'Code: '+authRequestCode+' // '+
			    											 'Body: '+authTokenResponseBodyString,
			    			'custrecord_ltsq_requestjson':JSON.stringify(requestJson),
			    			'custrecord_ltsq_origcontract':qJson.ogcontract,
			    			'custrecord_ltsq_linkedrenewcontract':qJson.rwcontract
			    		},
			    		'options':{
			    			'enablesourcing':true,
			    			'ignoreMandatoryFields':true
			    		}
			    	});
			    }
			    else
			    {
			    	//Access Token Granted, We need to go through and build Item part of requestJson object
			    	log.error('Access Token Granted', accessToken);
			    	
			    	//4. PREPARE License Records for Syncing
					// At this point, we have all existing Contract Items linked up with matching licenses if it exists
					//	UPSELL and NEW work the same while RENEWAL works differentl. 
			    	//We need more discussion on DOWNSELL needs to be discussed more in detail
						
					if (qJson.sorec.getValue({'fieldId':'custbody_order_type'}) == CONTRACT_RENEW)
					{
						//------------------------- RENEW -------------------------------------
						try
						{
							//If syncSystem is TLM, mark the queue as complete with skip note
							if (qJson.syncsystem == 'TLM')
							{
								//9/16/2016
								//Generate Email Even though we skip renewal sync
								//----------- need to send email here ---------------
								//Generate Renewal Statement Email to linked client 
								//	TLM Specific
								var tlmrenewSend = basyncUtil.sendStatementEmail(
										qJson, 
										null, 
										qJson.sorec.getValue({'fieldId':'custbody_order_type'})
									),
									tlmUpdVals = {
										'custrecord_ltsq_syncprocdetail':'Renewal Order Sync/Link SKIPPED but Generate Renewal TLM Renewal Email ',
						    			'custrecord_ltsq_origcontract':qJson.ogcontract,
						    			'custrecord_ltsq_linkedrenewcontract':qJson.rwcontract,
						    			'custrecord_ltsq_syncstatus':'2' //Success
									};
								
								if (!tlmrenewSend.status)
								{
									//Log it for now as error
									log.error('Error Sending TLM Renewal Statement Email', JSON.stringify(tlmrenewSend)+ ' // '+JSON.stringify(qJson));
									
									//Set the Status to Success with Warning since Email failed
									tlmUpdVals.custrecord_ltsq_syncstatus = '5' //Success with Warning
									tlmUpdVals.custrecord_ltsq_syncprocdetail = 'TLM License Renewal Sync SKIPPED but Statement Email Failed: '+tlmrenewSend.error;
								}
								
								record.submitFields({
						    		'type':'customrecord_ax_lactlm_sync_queue',
						    		'id':qJson.id,
						    		'values':tlmUpdVals,
						    		'options':{
						    			'enablesourcing':true,
						    			'ignoreMandatoryFields':true
						    		}
						    	});
								
								
							}
							else
							{
								var renewLicRequest = null;
								//We check to see if this was submitted before
								if (qJson.integrationid)
								{
									log.error('----- Existing Order ID for Renew Request ---', 'Request Status of Order ID '+qJson.integrationid);
									//If integration ID is set, and queue status is still pending, send a request to ask for details
									renewLicRequest = http.get({
										'url':bridgeAppInfo.APIBaseURL + bridgeAppInfo.LicenseAPIPath + '/' + qJson.integrationid,
										'headers': {'Content-Type':'application/json', 'Authorization':'Bearer ' + accessToken}
									});
									
								}
								else
								{
									log.error('----- Renew License Request ---', 'Request to Renew License');
									//1. For Renewal, at this point, allRwcJson MUST have ALL Prodcode and License information set.
									//	 IF NOT, it MUST throw Error
									//7/29/2016
									//	After discussion with Alan, downsell occurs when sales rep changes the qty on the renewal quote.
									//	When NS Contract Module processes these, it adds another Contract Item to the Rnewal Contract
									//	with negative value 
									//	In order to process these correctly, we need to first build the JSON object of prodcode to send
									//	with correct total qty.
									
									var renewpcjson = {};
									
									for (var rnwnew in allRwcJson)
									{
										//throw error if prodcode and license is missing
										//9/17/2016
										//	- For Renewal with Mixbag, we ONLY need to check below validation
										//	  for LAC items.  TLM items will not sync over.
										
										if (allRwcJson[rnwnew].islacitem)
										{
											if (!allRwcJson[rnwnew].prodcode || !allRwcJson[rnwnew].license)
											{
												throw error.create({
													'name':'LIC_RENEW_MISSING_INFO',
													'message':'Renewal Contract Item ID '+rnwnew+
															  'is missing Prodcode and/or Linked License. ',
													'notifyOff':true
												});
											}
											
											var rpcode = allRwcJson[rnwnew].prodcode,
												rqty = parseInt(allRwcJson[rnwnew].qty),
												rserialnum = allLicJson[allRwcJson[rnwnew].license].serialnumber;
											
											if (!renewpcjson[rpcode])
											{
												renewpcjson[rpcode] = {
													'qty':rqty,
													'serialnum':rserialnum,
													'expdate':allRwcJson[rnwnew].ctenddate,
													//9/16/2016
													//Add in identification of islacitem
													'islacitem':allRwcJson[rnwnew].islacitem
												};
											}
											else
											{
												//IF the prodcode already exists in the renewpcjson
												//	Add to the qty.
												//	For renewal, each line will always be unique prodcode
												//	ONLY when there is downsell there will be multiple lines with same prodcode
												//	Since the downsell will add - qty value, it will correctly calculate total
												renewpcjson[rpcode].qty = parseInt(renewpcjson[rpcode].qty) +
																		  rqty;
											}
										}
										
									}
									
									log.error('renewal json', JSON.stringify(renewpcjson));
									
									//Build the renewal request JSON object off of renewpcjson
									for (var rwp in renewpcjson)
									{
										//As long as we have the info, add it to items Array.
										//	for Renewal, we pass in Serial Number as well
										
										//9/16/2016
										//We ONLY Add in if the item is LAC item.
										//	with possible mixed bag renewal, we need to make sure 
										//	the bridge app doesn't get confused.
										//	Alan A. - CONFIRMED mixed back Order will ONLY happen in Renewal. 
										if (renewpcjson[rwp].islacitem)
										{
											requestJson.items.push({
												'productCode':rwp,
												'quantity':parseInt(renewpcjson[rwp].qty),
												'serialNumbers':[renewpcjson[rwp].serialnum],
												//8/10/2016 -
												//Alan requested to have contract end date be passed in at all times
												'expirationDate':renewpcjson[rwp].expdate
											});
										}
									}
									
									log.error('Renew Contract requestJson', JSON.stringify(requestJson));
									
									//testing
									//return;
									
									//2. Let's call BridgeApp to renew items with serial number
									renewLicRequest = http.post({
										'url':bridgeAppInfo.APIBaseURL + bridgeAppInfo.LicenseAPIPath,
										'body':JSON.stringify(requestJson),
										'headers': {'Content-Type':'application/json', 'Authorization':'Bearer ' + accessToken}
									});
										
									
								}
								
								//Review the response from Bridge App for NEW License Creation Request
								var renewLicResCode = renewLicRequest.code,
									renewLicResBody = renewLicRequest.body;
								
								if (renewLicResCode == '200' || renewLicResCode == '202')
								{
									//----------- Renewa. Core NetSuite Process ----------------------
									//At this point, we've got a reponse from Bridge App.  We review what the integration status and is and take action accordingly
									
									var renewLicResJson = JSON.stringify(renewLicResBody),
									    renewLicResJson = JSON.parse(renewLicResBody);
										
									
									//1. update qJson object with Integration related values
									//		This is so that we can update the queue record with this info later
									qJson.integrationid = renewLicResJson['_id'];
									qJson.integrationstatus = renewLicResJson['status'];
									qJson.integrationresponse = renewLicResBody;
									
									//2. Take action based on returned response
									if (qJson.integrationstatus == 'pending' || 
										qJson.integrationstatus == 'processing')
									{
										//This means BridgeApp is still processing the order submited
										//This is considered as Error Update the queue accordingly
										log.audit('BA is Still processing renewal request', qJson.integrationstatus);
										
										//basyncUtil.updateQueueForPending takes the parameters and updates the 
										//	queue record as pending/processing.  
										//	Function is defined in BA_SYNC_HELPER.js file
										basyncUtil.updateQueueForPending(qJson, requestJson, renewLicResBody, 'Renewal');
								    	
									}
									else if (qJson.integrationstatus == 'processed')
									{
										//--------------------- This is success. DO CORE RENEW LICENSE Processing ---------------------------
										//License information has now returned, 
										//	we go through and UPDATE the matching license record with Updated Entitlement End Date
										//	on a matched license.
									
										//0. UPDATE this queue with response information.
										//	THIS way, if we have to RE-RUN the process due to failure, 
										//	It will NOT go out and make another NEW request
										log.audit('Update Queue With BA Response Info', 'Update Queue ID '+qJson.id+' as check point');
										
										//basyncUtil.updateQueueForCp takes the parameters and updates the 
										//	queue record as Checkpoint.  
										//	Function is defined in BA_SYNC_HELPER.js file
										basyncUtil.updateQueueForCp(qJson, requestJson, renewLicResBody, 'Renewal');
										
								    	//For Renewal, we know for sure that what is returned from BA
								    	//	already exists in NetSuite as License
								    	//	We go through each returned Items and update the license 
								    	var allRenewLicenses = [];
								    	
								    	log.error('renewLicResJson.items size',renewLicResJson.items.length);
								    	
								    	for (var rbai=0; rbai < renewLicResJson.items.length; rbai+=1)
										{
											var rbajson = renewLicResJson.items[rbai];
											
											//Loop through ALL License Record and run update against matching license
											for (var rlic in allLicJson)
											{
												//As long as BA returned serial number matches the licenses serial number
												if (rbajson.serialNumbers[0] == allLicJson[rlic].serialnumber)
												{
													
													allRenewLicenses.push(rlic);
													
													var renewVersionVal = rbajson.order.Features[0].item[0].version;
													log.audit('Update License with New Entitlement End Date', 'Update License ID '+rlic+' with new Version value of '+renewVersionVal);
											    	
													//9/16/2017
													//Due to license qty field being different value
													//	this is parameterized.
													
													//If Sandbox is refreshed after 9/22/2016 below mapping is NOT NEEDED
													//Sandbox: custrecord_versionentitlementdate
													//Production: custrecord_version_entitle_date 
													
													var allSubVals = {};
													allSubVals[qJson.licqtyfldid] = parseInt(rbajson.quantity);
													allSubVals['custrecord_version_entitle_date'] = basyncUtil.lacDateToNsDate(renewVersionVal); 
													
													record.submitFields({
											    		'type':'customrecord_licenses',
											    		'id':rlic,
											    		'values':allSubVals,
											    		'options':{
											    			'enablesourcing':true,
											    			'ignoreMandatoryFields':true
											    		}
											    	});
												}
											}
										}
									    	
								    	//Process Renewal ALL DONE, Update the Queue Record
								    	
								    	//9/8/2016
										//	Generate Statement Email to linked client
										var renewSend = basyncUtil.sendStatementEmail(
											qJson, 
											allRenewLicenses, 
											qJson.sorec.getValue({'fieldId':'custbody_order_type'})
										);
								    	
										if (!renewSend.status)
										{
											//Log it for now as error
											log.error('Error Sending Statement Email (Renew)', JSON.stringify(renewSend)+ ' // '+JSON.stringify(qJson));
											
											//Set the Status to Success with Warning since Email failed
											qJson.syncstatus = 5;
											//Update qJson with proper value for reporting
											qJson.syncstatustext = 'Success with Warning';
											qJson.errordetail = 'License Sync Success but Statement Email Failed: '+renewSend.error;
										}
										else
										{
											qJson.syncstatus = 2;
											//Update qJson with proper value for reporting
											qJson.syncstatustext = 'Success';
										}
										
								    	//basyncUtil.updateQueueForSuccess takes the parameters and updates the 
										//	queue record as Success.  
										//	Function is defined in BA_SYNC_HELPER.js file
								    	basyncUtil.updateQueueForSuccess(qJson, requestJson, 'Renewal', allRenewLicenses);
								    	
										log.audit('Update Queue ALL DONE', 'Update Queue ID '+qJson.id+' as SUCCESS');
								    	
										
									}
									else
									{
										//This is considered as Error Update the queue accordingly
										log.error('Error with Renew License Response from BA', qJson.integrationstatus);
										
										qJson.senderroremail = true;
										qJson.errordetail = 'Renewal Order Unrecognized Integration Status Recieved. '+
															qJson.integrationstatus;
										
										//Update qJson with proper value for reporting
										qJson.syncstatustext = 'Error';
										
								    	record.submitFields({
								    		'type':'customrecord_ax_lactlm_sync_queue',
								    		'id':qJson.id,
								    		'values':{
								    			'custrecord_ltsq_syncstatus':'3', //Error status
								    			'custrecord_ltsq_syncprocdetail':'Renewal Unrecognized Integration Status. '+qJson.integrationstatus,
								    			'custrecord_ltsq_integrationid':qJson.integrationid,
								    			'custrecord_ltsq_requestjson':JSON.stringify(requestJson),
								    			'custrecord_ltsq_origcontract':qJson.ogcontract,
								    			'custrecord_ltsq_linkedrenewcontract':qJson.rwcontract,
								    			'custrecord_ltsq_integrationstatus':'error',
								    			'custrecord_ltsq_responsejson':renewLicResBody
								    		},
								    		'options':{
								    			'enablesourcing':true,
								    			'ignoreMandatoryFields':true
								    		}
								    	});
									}
										
								}
								else
								{
									//Something went wrong. Response code is NOT one of successful one
									//	Update the queue record as error
									log.error('Error with Renew Response from BA', renewLicResCode);
									
									qJson.senderroremail = true;
									qJson.errordetail = 'Renewal Order Error Integration Status Recieved. '+
														renewLicResCode;
									
									//Update qJson with proper value for reporting
									qJson.syncstatustext = 'Error';
									
							    	record.submitFields({
							    		'type':'customrecord_ax_lactlm_sync_queue',
							    		'id':qJson.id,
							    		'values':{
							    			'custrecord_ltsq_syncstatus':'3', //Error status
							    			'custrecord_ltsq_syncprocdetail':'Renewal Error code '+renewLicResCode+' return from bridge app',
							    			'custrecord_ltsq_requestjson':JSON.stringify(requestJson),
							    			'custrecord_ltsq_origcontract':qJson.ogcontract,
							    			'custrecord_ltsq_linkedrenewcontract':qJson.rwcontract,
							    			'custrecord_ltsq_integrationstatus':'error',
							    			'custrecord_ltsq_responsejson':renewLicResBody
							    		},
							    		'options':{
							    			'enablesourcing':true,
							    			'ignoreMandatoryFields':true
							    		}
							    	});
								}
								
							} //end check for sync system
						}
						catch(renewerr)
						{
							log.error('Error sending in Renewal Order', custUtil.getErrDetail(renewerr));
							
							qJson.senderroremail = true;
							qJson.errordetail = 'Renewal Order Unexpected NetSuite Error Occured<br/>'+
												custUtil.getErrDetailUi('renewerr');
							
							//Update qJson with proper value for reporting
							qJson.syncstatustext = 'Error';
							
					    	record.submitFields({
					    		'type':'customrecord_ax_lactlm_sync_queue',
					    		'id':qJson.id,
					    		'values':{
					    			'custrecord_ltsq_syncstatus':'3', //Error status
					    			'custrecord_ltsq_syncprocdetail':'Renewal Error: '+custUtil.getErrDetail(renewerr),
					    			'custrecord_ltsq_requestjson':JSON.stringify(requestJson),
					    			'custrecord_ltsq_origcontract':qJson.ogcontract,
					    			'custrecord_ltsq_linkedrenewcontract':qJson.rwcontract,
					    			'custrecord_ltsq_integrationid':qJson.integrationid,
					    			'custrecord_ltsq_integrationstatus':qJson.integrationstatus,
					    			'custrecord_ltsq_responsejson':qJson.integrationresponse
					    		},
					    		'options':{
					    			'enablesourcing':true,
					    			'ignoreMandatoryFields':true
					    		}
					    	});
						
						}
					}
					
					//------------------------- UPSELL and NEW -------------------------------------
					//For Upsell and New, we build the BA request object Item list in similarway.
					//	We build unique list of prodcode and its' total quantity for PERP or TERM Item Category 
					else if (qJson.sorec.getValue({'fieldId':'custbody_order_type'}) == CONTRACT_UPSELL ||
							 qJson.sorec.getValue({'fieldId':'custbody_order_type'}) == CONTRACT_NEW)
					{
						log.error('About to start Upsell/New','upsell/new');
						
						var actionTask = 'Upsell';
						if (qJson.sorec.getValue({'fieldId':'custbody_order_type'}) == CONTRACT_NEW)
						{
							actionTask = 'Create';
						}
						
						//1. We loop through all allRwcJson and build JSON of unique list of LIC_PERP_CAT or LIC_TERM_CAT
						//		Prodcode with total quantity and it's serialnumber(s) if available
						//[prodcode]:
						//{
						//	'upsellaction':create or update,
						//	'licenseid':'',
						//	'ctenddate':'', [Set from processing RwcJson ctenddate]
						//	'item':'', [Set from processing RwcJson item]
						//	'qty':0,
						//	'serial'[],
						//	'licqty':0,
						//	'isrwog':false [Set from THIS qJson]
						//		if rw contract (THIS Contract) IS the OG contract,
						//		we DO NOT add licqty to the total qty.
						//		if rw contract IS infact a new renewal contract the upsell is being applied to,
						//		we DO add licqty to the total qty.
						//	'ctitems':[] 
						//		array of contract items IDs 
						//}
						var upsellJson = {};
							
						for (var uwnew in allRwcJson)
						{
							var ctiProdCode = allRwcJson[uwnew].prodcode; 
								
							if(!upsellJson[ctiProdCode])
							{
								upsellJson[ctiProdCode] = {
									'upsellaction':'create',
									'ctenddate':allRwcJson[uwnew].ctenddate,
									'item':allRwcJson[uwnew].item,
									'islacitem':allRwcJson[uwnew].islacitem,
									'qty':0,
									'serial':[],
									'licqty':0,
									'isrwog':qJson.isrwog,
									'ctitems':[],
									'licenseid':''
								};
							}
								
							//Lets keep track of contract items IDs for this prodcode
							upsellJson[ctiProdCode].ctitems.push(uwnew);
								
							//We ONLY generate License for Perpetual or Term type item categories
							if (allRwcJson[uwnew].itemcat == LIC_PERP_CAT ||
								allRwcJson[uwnew].itemcat == LIC_TERM_CAT)
							{
								
								//Make sure we have product code to use on PERP or TERM Item
								if (!ctiProdCode)
								{
									throw error.create({
										'name':'NO_PRODCODE_ERR',
										'message':'Upsell Missing Product Code for Item ID '+allRwcJson[uwnew].item+' // '+
												  'Contract Item ID '+uwnew,
									    'notifyOff':true
									});
								}
								//Lets add to upsellJson qty
								//This is total quantity that is on the 
								//ONLY tally up the total if it's LAC
								//9/16/2016
								//BOTH will NEVER be syncsystem since Alan CONFIRMED BOTH can ONLY happen during renewal
								if (qJson.syncsystem == 'LAC')
								{
									upsellJson[ctiProdCode]['qty'] = parseInt(upsellJson[ctiProdCode]['qty']) +
									 								 parseInt(allRwcJson[uwnew].qty);
								}
								else
								{
									//For TLM, we only need to create the ones being added for Upsell
									upsellJson[ctiProdCode]['qty'] = parseInt(allRwcJson[uwnew].qty);
								}
								
								
								//If license exists for this prodcode, set licqty as license qty value
								var ctiLicId = allRwcJson[uwnew].license; 
								if (ctiLicId)
								{
									//it has matching license, change upsellaction to update
									upsellJson[ctiProdCode]['upsellaction'] = 'update';
									
									//Add license ID to this PROD
									upsellJson[ctiProdCode]['licenseid'] = ctiLicId;
									
									upsellJson[ctiProdCode]['licqty'] =  allLicJson[ctiLicId].qty;
									
									//Since it has matching license add to unique list of serial array
									if (upsellJson[ctiProdCode]['serial'].indexOf(allLicJson[ctiLicId].serialnumber) < 0)
									{
										upsellJson[ctiProdCode]['serial'].push(allLicJson[ctiLicId].serialnumber);
									}
								}
							}
						}
							
						//Let's go through and build Order JSON.
						//	Each element in upsellJson will be 
						//	items array
						
						for (var up in upsellJson)
						{
							//We ONLY Process if the value of up is set. 
							//	up is by product code
							if (up)
							{
								//Depending on what the syncsystem is, build the requestJson order item differently
								if (qJson.syncsystem == 'LAC')
								{
									//LAC build
									//calculate total qty
									//If Contract being processed is NOT the OG contract
									//	as in Upsell is being applied to actual renewal contract,
									//	we need to add linked license qty to total.
									//	if this was OG Contract, contract Items would have already 
									//	accounted for the license qty
									//Logic being taken out because we've made a change to 
									//	ONLY return Renewal contract item associated with THE SO in context.
									//if (!upsellJson[up].isrwog)
									//{
										upsellJson[up].qty = parseInt(upsellJson[up].qty) +
															 parseInt(upsellJson[up].licqty);
									//}
								}
								
								var orderItemjson = {
									'productCode':up,
									'quantity':upsellJson[up].qty,
									'expirationDate':upsellJson[up].ctenddate
								};
								
								//If there is serial numbers associated (Actual Upsell), add to the order item.
								//	if not, don't add it. 
								//	For TLM. This Will always be empty
								if (upsellJson[up].serial.length > 0)
								{
									orderItemjson['serialNumbers'] = upsellJson[up].serial;
								}
									
								//add this order item to requestJson.
								requestJson.items.push(orderItemjson);
							}
							
						}//End building request Order JSON
							
						log.error(actionTask+' request JSON', JSON.stringify(requestJson));
						log.error(actionTask+' Final version of upsellJson', JSON.stringify(upsellJson));
							
						//-------------- Ready to make request to BridgeApp for UPSELL ----------------------------
						try
						{
							var upsellLicRequest = null;
							//We check to see if this was submitted before
							if (qJson.integrationid)
							{
								log.error('----- Existing Order ID for '+actionTask+' Request ---', 'Request Status of Order ID '+qJson.integrationid);
								//If integration ID is set, and queue status is still pending, send a request to ask for details
								upsellLicRequest = http.get({
									'url':bridgeAppInfo.APIBaseURL + bridgeAppInfo.LicenseAPIPath + '/' + qJson.integrationid,
									'headers': {'Content-Type':'application/json', 'Authorization':'Bearer ' + accessToken}
								});
							}
							else
							{
								log.error('----- '+actionTask+' License Request ---', 'Request to '+actionTask+' License');
								//1. For upsell/create, at this point, we already built the requestJson with items elements.
								
								//2. Let's call BridgeApp to upsell items with and/or without serial numbers
								upsellLicRequest = http.post({
									'url':bridgeAppInfo.APIBaseURL + bridgeAppInfo.LicenseAPIPath,
									'body':JSON.stringify(requestJson),
									'headers': {'Content-Type':'application/json', 'Authorization':'Bearer ' + accessToken}
								});
							}
							
							//Review the response from Bridge App for NEW License Creation Request
							var upsellLicResCode = upsellLicRequest.code,
								upsellLicResBody = upsellLicRequest.body;
								
							if (upsellLicResCode == '200' || upsellLicResCode == '202')
							{
								//----------- upsell or create. Core NetSuite Process ----------------------
								//At this point, we've got a reponse from Bridge App.  We review what the integration status is and take action accordingly
								var upsellLicResJson = JSON.parse(upsellLicResBody);
									
								//1. update qJson object with Integration related values
								//		This is so that we can update the queue record with this info later
								qJson.integrationid = upsellLicResJson['_id'];
								qJson.integrationstatus = upsellLicResJson['status'];
								qJson.integrationresponse = upsellLicResBody;
								
								//2. Take action based on returned response
								if (qJson.integrationstatus == 'pending' || 
									qJson.integrationstatus == 'processing')
								{
									//This means BridgeApp is still processing the order submited
									//This is considered as Error Update the queue accordingly
									log.audit('BA is Still processing '+actionTask+' request', qJson.integrationstatus);
									
									//basyncUtil.updateQueueForPending takes the parameters and updates the 
									//	queue record as pending/processing.  
									//	Function is defined in BA_SYNC_HELPER.js file
									basyncUtil.updateQueueForPending(qJson, requestJson, upsellLicResBody, actionTask);
								}
								else if (qJson.integrationstatus == 'processed')
								{
									//--------------------- This is success. DO CORE RENEW LICENSE Processing ---------------------------
									//License information has now returned, 
									//
									//
									
									//0. UPDATE this queue with response information.
									//	THIS way, if we have to RE-RUN the process due to failure, 
									//	It will NOT go out and make another NEW request
									log.audit('Update Queue With BA Response Info', 'Update Queue ID '+qJson.id+' as check point');
										
									//basyncUtil.updateQueueForCp takes the parameters and updates the 
									//	queue record as Checkpoint.  
									//	Function is defined in BA_SYNC_HELPER.js file
									basyncUtil.updateQueueForCp(qJson, requestJson, upsellLicResBody, actionTask);
										
							    	//For Upsell, what is returned from BA could be 
							    	//An existing Licenses 
							    	//	OR 
							    	//NEW Licenses we need to create and properly link up.
							    	var allUpsellLicenses = [];
							    	for (var ubai=0; ubai < upsellLicResJson.items.length; ubai+=1)
									{
							    		//Process each returned license info from BA
										var ubajson = upsellLicResJson.items[ubai],
											//Grab matching upsellJson element using product code
											thisUpsJson = upsellJson[ubajson.productCode],
											//Upsell version value
											upsellVersionVal = '';
										
										//Process by TLL or TLM does NOT return this value
										if (qJson.syncsystem == 'LAC')
										{
											upsellVersionVal = ubajson.order.Features[0].item[0].version;
										}
										
										log.audit('Update License with '+actionTask+' Entitlement End Date', actionTask+' Version value of '+upsellVersionVal);
											
										//If the upsellaction is update, simply update the license ent. end date and qty
										//	If it's Update, we WILL have license ID against it
										if (thisUpsJson.upsellaction == 'update')
										{
											allUpsellLicenses.push(thisUpsJson.licenseid);
											
											log.error('lacDateToNs',basyncUtil.lacDateToNsDate(upsellVersionVal));
											
											//9/16/2017
											//Due to license qty field being different value
											//	this is parameterized.
											var updSubVals = {};
											updSubVals[qJson.licqtyfldid] = ubajson.quantity;
											//If Sandbox is refreshed after 9/22/2016 below mapping is NOT NEEDED
											//Sandbox: custrecord_versionentitlementdate
											//Production: custrecord_version_entitle_date 
											updSubVals['custrecord_version_entitle_date'] = basyncUtil.lacDateToNsDate(upsellVersionVal); 
											
											record.submitFields({
									    		'type':'customrecord_licenses',
									    		'id':thisUpsJson.licenseid,
									    		'values':updSubVals,
									    		'options':{
									    			'enablesourcing':true,
									    			'ignoreMandatoryFields':true
									    		}
									    	});
											
											log.error('updated','updated');
										}
										else
										{
											//This will be CREATE new license 
											//1. Create New
											//2. Add new license to allUpsellLicenses array
											//3. Update License for all contract items
											
											log.error('Upsell New License', 'Create New for '+qJson.syncsystem);
											
											//8/2/2016
											//Found out that TLL (TLM) returns the data differently.
											//For TLM, we need to NOT set the entitlement end date because it doesn't
											//	We also need to run loop against serialNumbers to create each licenses returned
											if (qJson.syncsystem == 'TLM')
											{
												log.error('total number of serial numbers', ubajson.serialNumbers.length);
												//For TLM, we run loop against serialNumber array 
												for (var ts=0; ts < ubajson.serialNumbers.length; ts+=1)
												{
													//This is TLM (TLL from BA) response
													//2. We Create the License record in NetSuite
													var newLicRec = record.create({
														'type':'customrecord_licenses',
														'isDynamic':true
													});
													//Go through and see license fields based on BA Response
													//Set product code returned from BA
													newLicRec.setValue({
														'fieldId':'custrecord_prodid',
														'value':ubajson.productCode,
														'ignoreFieldChange':true
													});
															
													//Set Original Contract as from qJson (This Queue)
													//If Sandbox is refreshed after 9/22/2016 below mapping is NOT NEEDED
													//Sandbox: custrecord_tri_original_contract_lf
													//Production: custrecord_og_contract
													newLicRec.setValue({
														'fieldId':'custrecord_og_contract',
														'value':qJson.ogcontract,
														'ignoreFieldChange':true
													});
														
													//Set issue date as CURRENT Date
													newLicRec.setValue({
														'fieldId':'custrecord_licenseissuedate',
														'value':new Date(),
														'ignoreFieldChange':true
													});
														
													//Set License End Date as Contract End Date from Linked CI Sales order
													
													
													//If Sandbox is refreshed after 9/22/2016 below mapping is NOT NEEDED
													//Sandbox: custrecord_licenseenddate
													//Production: custrecord_lic_end_date
													newLicRec.setValue({
														'fieldId':'custrecord_lic_end_date',
														'value':format.parse({
																	'type':format.Type.DATE,
																	'value':thisUpsJson.ctenddate
																}),
														'ignoreFieldChange':true
													});
														
													//Set Fulfillment Reference from Queue
													newLicRec.setValue({
														'fieldId':'custrecord_fulfillmentid',
														'value':qJson.ifrecid,
														'ignoreFieldChange':true
													});
														
													//Set Order Reference from Queue 
													newLicRec.setValue({
														'fieldId':'custrecord_ordref',
														'value':qJson.sorecid,
														'ignoreFieldChange':true
													});
														
													//Set Quantity from Linked Contract Item
													//for TLL since we are creating license for each count
													//	set the qty to 1
													newLicRec.setValue({
														'fieldId':qJson.licqtyfldid,
														'value':1,
														'ignoreFieldChange':true
													});
														
													//Set Item from Linked Contract Item 
													newLicRec.setValue({
														'fieldId':'custrecord_license_itemref',
														'value':thisUpsJson.item,
														'ignoreFieldChange':true
													});
													log.error('new lic', 'item set to '+thisUpsJson.item);	
													
													//Set End User from BA response Object
													newLicRec.setValue({
														'fieldId':'custrecord_license_end_user',
														'value':qJson.customerid,
														'ignoreFieldChange':true
													});
													log.error('new lic', 'customer set to ', qJson.customerid);
													
													//Set Serial Number from BA response Object
													newLicRec.setValue({
														'fieldId':'custrecord_serialnumber',
														'value':ubajson.serialNumbers[ts],
														'ignoreFieldChange':true
													});
														
													log.error('new lic', 'lic serial set to '+ubajson.serialNumbers[ts]);
													
													//Set Activation Code (Same as serial number) from BA response Object
													newLicRec.setValue({
														'fieldId':'custrecord_activationcode',
														'value':ubajson.serialNumbers[ts],
														'ignoreFieldChange':true
													});
														
													var tlmCreateLicRecId = newLicRec.save({
														'enableSourcing':true,
														'ignoreMandatoryFields':true
													});
													
													log.error('new lic created tlm','new lic for tlm id '+tlmCreateLicRecId);
													
													//2. add to allUpsellLicenses
													allUpsellLicenses.push(tlmCreateLicRecId);
													
												}//end Loop for each serial Numbers
											}
											else
											{
												//We check for existing license serial number and ONLY create new if 
												//	it does NOT exists.
												var dupSerialNsId = basyncUtil.searchSerialNumber(ubajson.serialNumbers[0]);
												if (dupSerialNsId)
												{
													log.error('Serial Number Exists', ubajson.serialNumbers[0]+' exists in the system');
													allUpsellLicenses.push(dupSerialNsId);
												}
												else
												{
													//No Dupe. Create it
													//This is LAC response
													//2. We Create the License record in NetSuite
													var newLicRec = record.create({
														'type':'customrecord_licenses',
														'isDynamic':true
													});
													//Go through and see license fields based on BA Response
													//Set product code returned from BA
													newLicRec.setValue({
														'fieldId':'custrecord_prodid',
														'value':ubajson.productCode,
														'ignoreFieldChange':true
													});
															
													//Set Original Contract as from qJson (This Queue)
													//If Sandbox is refreshed after 9/22/2016 below mapping is NOT NEEDED
													//Sandbox: custrecord_tri_original_contract_lf
													//Production: custrecord_og_contract
													newLicRec.setValue({
														'fieldId':'custrecord_og_contract',
														'value':qJson.ogcontract,
														'ignoreFieldChange':true
													});
														
													//Set issue date as CURRENT Date
													newLicRec.setValue({
														'fieldId':'custrecord_licenseissuedate',
														'value':new Date(),
														'ignoreFieldChange':true
													});
														
													//Set License End Date as Contract End Date from Linked CI Sales order
													//If Sandbox is refreshed after 9/22/2016 below mapping is NOT NEEDED
													//Sandbox: custrecord_licenseenddate
													//Production: custrecord_lic_end_date
													newLicRec.setValue({
														'fieldId':'custrecord_lic_end_date',
														'value':format.parse({
																	'type':format.Type.DATE,
																	'value':thisUpsJson.ctenddate
																}),
														'ignoreFieldChange':true
													});
														
													//Set Fulfillment Reference from Queue
													newLicRec.setValue({
														'fieldId':'custrecord_fulfillmentid',
														'value':qJson.ifrecid,
														'ignoreFieldChange':true
													});
														
													//Set Order Reference from Queue 
													newLicRec.setValue({
														'fieldId':'custrecord_ordref',
														'value':qJson.sorecid,
														'ignoreFieldChange':true
													});
														
													//Set Quantity from Linked Contract Item 
													newLicRec.setValue({
														'fieldId':qJson.licqtyfldid,
														'value':parseInt(ubajson.quantity),
														'ignoreFieldChange':true
													});
														
													//Set Item from Linked Contract Item 
													newLicRec.setValue({
														'fieldId':'custrecord_license_itemref',
														'value':thisUpsJson.item,
														'ignoreFieldChange':true
													});
													log.error('new lic', 'item set to '+thisUpsJson.item);	
													
													//Set End User from BA response Object
													newLicRec.setValue({
														'fieldId':'custrecord_license_end_user',
														'value':qJson.customerid,
														'ignoreFieldChange':true
													});
													log.error('new lic', 'customer set to ', qJson.customerid);
													
													//Set Entitlement End Date from BA response Object
													//This value is represented as version element.
													//	items[0] > orders > Features[0] > item[0] > version
													//	Format of the value is YYYY.MMDD
													if (upsellVersionVal)
													{
														//If Sandbox is refreshed after 9/22/2016 below mapping is NOT NEEDED
														//Sandbox: custrecord_versionentitlementdate
														//Production: custrecord_version_entitle_date 
														newLicRec.setValue({
															'fieldId':'custrecord_version_entitle_date',
															//basyncUtil.lacDateToNsDate converts LAC formatted Date String
															//	into JavaScript Date object.
															//	YYYY.MMDD gets turned into JavaScript Date Object
															'value':basyncUtil.lacDateToNsDate(upsellVersionVal),
											    			'ignoreFieldChange':true
														});
													}
													log.error('new lic', 'lic end date set to '+upsellVersionVal);
													
													//Set Serial Number from BA response Object
													newLicRec.setValue({
														'fieldId':'custrecord_serialnumber',
														'value':ubajson.serialNumbers[0],
														'ignoreFieldChange':true
													});
														
													log.error('new lic', 'lic serial set to '+ubajson.serialNumbers[0]);
													
													//Set Activation Code (Same as serial number) from BA response Object
													newLicRec.setValue({
														'fieldId':'custrecord_activationcode',
														'value':ubajson.serialNumbers[0],
														'ignoreFieldChange':true
													});
														
													var upsellLicRecId = newLicRec.save({
														'enableSourcing':true,
														'ignoreMandatoryFields':true
													});
													
													log.error('new lic created','new lic id '+upsellLicRecId);
													
													//2. add to allUpsellLicenses
													allUpsellLicenses.push(upsellLicRecId);
													
													//3. Update All Contracts associated with THIS Prodcode
													for (var uc=0; uc < thisUpsJson.ctitems.length; uc+=1)
													{
														//for LAC, we should only have one per product code
														log.error('Updating Contract Item '+thisUpsJson.ctitems[uc], 'License ID: '+upsellLicRecId);
														record.submitFields({
															'type':'customrecord_contract_item',
															'id':thisUpsJson.ctitems[uc],
															'values':{
																'custrecord_afa_license2renew':upsellLicRecId
															},
															'options':{
																'enablesourcing':true,
																'ignoreMandatoryFields':true
															}
														});
													}
												}
											} //End Check for TLM or LAC for license creation
											
										}//End check for update or create
									}//End loop for Bridge App Item Json
								    	
							    	//Process Upsell/Create ALL DONE, Update the Queue Record
							    	
							    	//9/8/2016
									//	Generate Statement Email to linked client
									var newUpSend = basyncUtil.sendStatementEmail(
										qJson, 
										allUpsellLicenses, 
										qJson.sorec.getValue({'fieldId':'custbody_order_type'})
									);
							    	
									if (!newUpSend.status)
									{
										//Log it for now as error
										log.error('Error Sending Statement Email (Upsell or New)', JSON.stringify(newUpSend)+ ' // '+JSON.stringify(qJson));
										
										//Set the Status to Success with Warning since Email failed
										qJson.syncstatus = 5;
										//Update qJson with proper value for reporting
										qJson.syncstatustext = 'Success with Warning';
										qJson.errordetail = 'License Sync Success but Statement Email Failed: '+newUpSend.error;
									}
									else
									{
										qJson.syncstatus = 2;
										//Update qJson with proper value for reporting
										qJson.syncstatustext = 'Success';
									}
									
									//basyncUtil.updateQueueForSuccess takes the parameters and updates the 
									//	queue record as Success.  
									//	Function is defined in BA_SYNC_HELPER.js file
									basyncUtil.updateQueueForSuccess(qJson, requestJson, actionTask, allUpsellLicenses);
									
									log.audit('Update Queue ALL DONE', 'Update Queue ID '+qJson.id+' as SUCCESS');
								}
								else
								{
									//This is considered as Error Update the queue accordingly
									log.error('Error with upsell License Response from BA', qJson.integrationstatus);
									
									qJson.senderroremail = true;
									qJson.errordetail = actionTask+' Order Unrecognized Integration Status Recieved. '+
														qJson.integrationstatus;
									
									//Update qJson with proper value for reporting
									qJson.syncstatustext = 'Error';
									
							    	record.submitFields({
							    		'type':'customrecord_ax_lactlm_sync_queue',
							    		'id':qJson.id,
							    		'values':{
							    			'custrecord_ltsq_syncstatus':'3', //Error status
							    			'custrecord_ltsq_syncprocdetail':'Upsell Unrecognized Integration Status. '+qJson.integrationstatus,
							    			'custrecord_ltsq_integrationid':qJson.integrationid,
							    			'custrecord_ltsq_requestjson':JSON.stringify(requestJson),
							    			'custrecord_ltsq_origcontract':qJson.ogcontract,
							    			'custrecord_ltsq_linkedrenewcontract':qJson.rwcontract,
							    			'custrecord_ltsq_integrationstatus':'error',
							    			'custrecord_ltsq_responsejson':upsellLicResBody
							    		},
							    		'options':{
							    			'enablesourcing':true,
							    			'ignoreMandatoryFields':true
							    		}
							    	});
								}
								
							}
							else
							{
								//Something went wrong. Response code is NOT one of successful one
								//	Update the queue record as error
								log.error('Error with upsell Response from BA', upsellLicResCode);
								
								qJson.senderroremail = true;
								qJson.errordetail = actionTask+' Order Error Integration code Recieved. '+
													upsellLicResCode;
								
								
								//Update qJson with proper value for reporting
								qJson.syncstatustext = 'Error';
								
						    	record.submitFields({
						    		'type':'customrecord_ax_lactlm_sync_queue',
						    		'id':qJson.id,
						    		'values':{
						    			'custrecord_ltsq_syncstatus':'3', //Error status
						    			'custrecord_ltsq_syncprocdetail':'Upsell Error code '+upsellLicResCode+' return from bridge app',
						    			'custrecord_ltsq_requestjson':JSON.stringify(requestJson),
						    			'custrecord_ltsq_origcontract':qJson.ogcontract,
						    			'custrecord_ltsq_linkedrenewcontract':qJson.rwcontract,
						    			'custrecord_ltsq_integrationstatus':'error',
						    			'custrecord_ltsq_responsejson':upsellLicResBody
						    		},
						    		'options':{
						    			'enablesourcing':true,
						    			'ignoreMandatoryFields':true
						    		}
						    	});
							}
							
						
						}
						catch(upsellerr)
						{
							log.error('Error sending in upsell Order', custUtil.getErrDetail(upsellerr));
							
							qJson.senderroremail = true;
							qJson.errordetail = actionTask+' Order Unexpected NetSuite Error<br/>'+
												custUtil.getErrDetailUi(upsellerr);
							
							//Update qJson with proper value for reporting
							qJson.syncstatustext = 'Error';
							
					    	record.submitFields({
					    		'type':'customrecord_ax_lactlm_sync_queue',
					    		'id':qJson.id,
					    		'values':{
					    			'custrecord_ltsq_syncstatus':'3', //Error status
					    			'custrecord_ltsq_syncprocdetail':'Upsell Error: '+custUtil.getErrDetail(upsellerr),
					    			'custrecord_ltsq_requestjson':JSON.stringify(requestJson),
					    			'custrecord_ltsq_origcontract':qJson.ogcontract,
					    			'custrecord_ltsq_linkedrenewcontract':qJson.rwcontract,
					    			'custrecord_ltsq_integrationid':qJson.integrationid,
					    			'custrecord_ltsq_integrationstatus':qJson.integrationstatus,
					    			'custrecord_ltsq_responsejson':qJson.integrationresponse
					    		},
					    		'options':{
					    			'enablesourcing':true,
					    			'ignoreMandatoryFields':true
					    		}
					    	});
						
						}
						//----------- End request to BA for UPSELL or Create ------------------
					}
			    }//End Access token check
				
			}//End qJson.cicomplete check
			
			//We need to generate Error email if processing of Queue resulted in error
			if (qJson.senderroremail)
			{
				//paramErrorNotifier
				email.send({
					'author':'-5',
					'recipients':paramErrorNotifier,
					'subject':'Error Occured while Processing License Sync',
					'body':'Error Occured while processing Sync Queue ID '+qJson.id+'<br/>'+
						   'Error Detail: <br/>'+
						   qJson.errordetail+'<br/><br/>'+
						   'You may set the Failed Queue back to Pending status to have it go again.'
				});
			}
			
			//Queue ID, Status, Error Detail, Fulfillment Text, Sales Order Text 
			procLog += '<tr>'+
					   '<td>'+qJson.id+'</td>'+
					   '<td>'+qJson.syncstatustext+'</td>'+
					   '<td>'+qJson.errordetail+'</td>'+
					   '<td>'+qJson.ifrectext+'</td>'+
					   '<td>'+qJson.sorectext+'</td>'+
					   '</tr>';
			
			//------------------------ Add in Reschedule logic here
    		//Set Percentage Complete fro Main loop
			var pctCompleted = Math.round(((i+1) / qrs.length) * 100);
    		runtime.getCurrentScript().percentComplete = pctCompleted;
			
			//When we see that script usage is running low, we reschedule it here
			if ( (i+1) == 1000 || runtime.getCurrentScript().getRemainingUsage() < 1000)
			{
				
				var schSctTask = task.create({
					'taskType':task.TaskType.SCHEDULED_SCRIPT
				});
				schSctTask.scriptId = runtime.getCurrentScript().id;
				schSctTask.deploymentId = runtime.getCurrentScript().deploymentId;
				schSctTask.params = {
	    			'custscript_sb422_lastprocid':qJson.id
	    		};
				schSctTask.submit();
				
				log.audit(
					'Queue ID '+qJson.id+' Rescheduled. ',
					'Rescheduled for additional processing'
				);
				
				break;
			}
	    }//End loop for queue record
		
		//if we have procLog send it to  paramCompleteNotifier
		if (procLog)
		{
			log.error('sending proc log','send proc log');
			procLog = '<table>'+
					  '<tr>'+
					  '<td>Queue ID</td>'+
					  '<td>Status</td>'+
					  '<td>Details</td>'+
					  '<td>Item Fulfillment</td>'+
					  '<td>Sales Order</td>'+
					  '</tr>'+
					  procLog+
					  '</table>';
			
			email.send({
				'author':'-5',
				'recipients':paramCompleteNotifier,
				//'recipients':'joe.son@audaxium.com',
				'subject':'Contract License Sync Queue Process Log',
				'body':procLog
			});
			
		}
		
		
		
    }
    
    return {
        execute: executeSync
    };
    
});
