define(['N/error',
        'N/search', 
        'N/format',
        'N/file',
        'N/email',
        'N/https',
        'N/http',
        '/SuiteScripts/CongrueIT Customizations/UTILITY_LIB',
        '/SuiteScripts/CongrueIT Customizations/CUST_DATE_LIB'],

function(error, search, format, file, email, https, http, custUtil, custDate) 
{
   /**
    * Helper function that returns JSON object of File Trx Type to
    * field mapping.
    */
	function getMapping(_filetrxtype)
	{
		var stageMap={
			'revenue':{
				'recid':'customrecord_skz_revtrxstaging',
				'statusfld':'custrecord_skzr_status',
				'syncfilefld':'custrecord_skzr_syncfile',
				'detailfld':'custrecord_skzr_syncdetail',
				'origfld':'custrecord_skzr_origrowvalue',
				'mappedflds':
				{
					'0':{
						'fldid':'custrecord_skzr_custrxid', //Customer Transaction ID
						'label':'Customer Transaction ID'
					},
					'1':{
						'fldid':'custrecord_skzr_trxdate', //Trx Date
						'label':'Transaction Date'
					},
					'2':{
						'fldid':'custrecord_skzr_custtrxtype', //Transaction Type
						'label':'Transaction Type'
					},
					'3':{
						'fldid':'custrecord_skzr_custpayid', //Payment ID
						'label':'Payment ID'
					},
					'4':{
						'fldid':'custrecord_skzr_pmttype', //Payment Type
						'label':'Payment Type'
					},
					'5':{
						'fldid':'custrecord_skzr_servtype', //Service Type
						'label':'Service Type'
					},
					'6':{
						'fldid':'custrecord_skzr_amount', //Amount
						'label':'Amount'
					},
					'7':{
						'fldid':'custrecord_skzr_discamt', //Discount amount
						'label':'Discount Amount'
					}
				}
			},
			'vendor':{
				'recid':'customrecord_skz_vendortrxstaging',
				'statusfld':'custrecord_skzv_status',
				'syncfilefld':'custrecord_skzv_syncfile',
				'detailfld':'custrecord_skzv_syncdetail',
				'nsvendorfld':'custrecord_skzv_nsvendorref',
				'origfld':'custrecord_skzv_origrowvalue',
				'mappedflds':
				{
					'0':{
						'fldid':'custrecord_skzv_vendortrxid', //Vendor Transaction ID
						'label':'Vendor Transaction ID'
					},
					'1':{
						'fldid':'custrecord_skzv_custtrxid', //Customer Transaction ID
						'label':'Customer Transaction ID'
					},
					'2':{
						'fldid':'custrecord_skzv_vendorname', //Vendor Name from Skoozi
						'label':'Vendor Name'
					},
					'3':{
						'fldid':'custrecord_skzv_vendorid', //Vendor ID from Skoozi (NS Internal ID)
						'label':'Vendor ID'
					},
					'4':{
						'fldid':'custrecord_skzv_vendortype', //Vendor Type
						'label':'Vendor Type'
					},
					'5':{
						'fldid':'custrecord_skzv_trxdate', //Transaction Date
						'label':'Transaction Date'
					},
					'6':{
						'fldid':'custrecord_skzv_servtype', //Service Type
						'label':'Service Type'
					},
					'7':{
						'fldid':'custrecord_skzv_servdesc', // Service Desc
						'label':'Service Description'
					},
					'8':{
						'fldid':'custrecord_skzv_amount', //Amount
						'label':'Amount'
					}
				}
			}
		};
		
		if (!_filetrxtype)
		{
			return null;
		}
		
		return stageMap[_filetrxtype];
		
	}
	
	/**
	 * Helper function that takes JSON parameter and process failed validation records.
	 * function will return string value of what to do next.
	 * FailedValidation
	 * 		This value will tell the calling function to reschedule the script
	 * 		to go through and mark everything failed
	 * 		When this status is returned, email notification has been sent with
	 * 		failed row CSV attached		
	 * 
	 * SuccessValidation 
	 * 		This value will tell the calling function to Queue up Final Processor 
	 * 		to generate either journal or vendor bill file
	 * 
	 * 	@params paramJson
	 *  {
	 *  	type:'transaction type revenue or vendor',
	 *  	file:'internal id of the file being processed',
	 *  	filename:'Name of the file',
	 *  	findstatus: 'status to look for'
	 *  	notifyemail: 'email to notify',
	 *  	cc: PARAM_NOTIFICATION 
	 *  }
	 *
	 */
	function procFailedVal(paramJson)
	{
		log.debug('procFailedVal Called','Util function called');
		//default return value to success
		var returnVal = 'SuccessValidation',
			//Grab stage record mapping JSON object
			stageMapJson = getMapping(paramJson.type);
		
		//log.debug('stageMapJson',JSON.stringify(stageMapJson));
		
		//Build CSV Header
		var csvHeader = '"Failed Reason","Original Row Data",',
			csvBody = '',
			searchCols = [stageMapJson.detailfld, //0 Status Detail
				          stageMapJson.origfld]; //1 Original Sent in Data
		//loop through field mappings and build the columns.
		//	first two will always be detail and orig 
		for (var fc in stageMapJson.mappedflds)
		{
			searchCols.push(stageMapJson.mappedflds[fc].fldid);
			
			//log.debug('adding new flds', stageMapJson.mappedflds[fc].fldid);
			
			//build out csvHeader
			csvHeader += '"'+stageMapJson.mappedflds[fc].label+'",';
		}
		csvHeader = csvHeader.substr(0, (csvHeader.length-1)) + '\n';
		
		//log.debug('csvHeader',csvHeader);
		
		//Lets search to see if anything failed.
		//	This one we run while loop to grab ALL failed rows
		var failedValSearch = search.create({
				'type':stageMapJson.recid,
				'filters':[
				           	[stageMapJson.syncfilefld, search.Operator.ANYOF, paramJson.file],
				           	'and',
				           	[stageMapJson.statusfld, search.Operator.ANYOF, paramJson.findstatus],
				           	'and',
				           	[stageMapJson.detailfld, search.Operator.ISNOTEMPTY, '']
				          ],
				'columns':searchCols
			});
		
		var rsCount = 0,
			startIndex = 0, 
			endIndex = 1000;
		//log.debug('starting dowhile','starting');
		//We loop through EVERY result using do/while loop.
		//	JUST in case there are more than 1000 failed results
		do
		{
			var tempRs = failedValSearch.run().getRange({
				'start':startIndex,
				'end':endIndex
			});
		
			rsCount = tempRs.length;
			if (!rsCount)
			{
				rsCount = 0;
			}
			log.debug('--- Failed Run Count', rsCount);
		
			//Loop and build openPoJson object
			for (var i=0; i < rsCount; i+=1)
			{
				//First two index 0 and 1 will always be detail(0) and original row (1)
				csvBody += '"'+tempRs[i].getValue({'name':stageMapJson.detailfld})+'",'+
						   '"'+tempRs[i].getValue({'name':stageMapJson.origfld})+'",';
				
				//Now we loop through mappedflds and add to csv body
				for (var fc in stageMapJson.mappedflds)
				{
					//build out tempCsvBody 
					csvBody += '"'+tempRs[i].getValue({'name':stageMapJson.mappedflds[fc].fldid})+'",';
				}
				csvBody = csvBody.substr(0, (csvBody.length - 1))+'\n';
			}
			
			//Update start and end Index
			startIndex = endIndex;
			endIndex = startIndex + 1000;
		}
		while(rsCount == 1000);
		
		//if csvBody has a value, send an email and set return value to failed
		if (csvBody)
		{
			//log.debug('has validation failures', 'has validation failures');
			//log.debug('csvBody',csvBody);
			
			//Build a CSV file to send to Skoozi and internal dev team
			var csvFile = file.create({
				'name':'FailedVal_for_'+paramJson.filename+'.csv',
				'fileType':file.Type.CSV,
				'contents':csvHeader+csvBody
			});
			
			//Generate an email to skoozi
			email.send({
				'author':-5,
				'recipients':paramJson.notifyemail,
				'cc':[paramJson.cc],
				'subject':'Failed Validation for '+paramJson.filename,
				'body':'Validation failed for '+paramJson.filename+'<br/><br/>'+
					   'Attached CSV contains list of rows that failed. NONE of the rows passed in are processed.',
				'attachments':[csvFile],
				//Below is for testing in Sandbox.
				//	Attaching it to CC record for now
				'relatedRecords':{
					'entityId':paramJson.cc
				}
			});
			
			returnVal = 'FailedValidation';
			
			
		}
		
		return returnVal;
	}
	
	/**
	 * Helper function that returns JSON formatted list of 
	 * SKZ-Payment Type mapping.
	 * Record ID: customrecord_skz_paymenttypes
	 * name, custrecord_skzpt_skoozival, internalid
	 */
	function getPaymentTypeJson() 
	{
		//Assume there can NEVER be more than 1000 payment types
		var pmtSearch = search.create({
        	'type':'customrecord_skz_paymenttypes',
        	'filters':[
        	           	['isinactive','is',false]
        	          ],
        	'columns':['internalid', //0
        	           'name', //1
        	           'custrecord_skzpt_skoozival'] //2
        }),
        allPmtCols = pmtSearch.columns,
        pmtrs = pmtSearch.run().getRange({
        	'start':0,
        	'end':1000
        });
    	
		if (pmtrs.length <= 0)
		{
			throw error.create({
    			'name':'NO_PAYMENT_TYPE_ERROR',
    			'message':'Unable to get list of SKZ-Payment Type to be used for Skoozi sync',
    			'notifyOff':true
    		});
		}
        
		//WE got the list, build the json and return
		/**
		 * [skoozi value]:{
		 * 	'id':'internalid',
		 *  'name':'netsuite name'
		 * }
		 */
		var pmtJson = {};
		for (var p=0; p < pmtrs.length; p+=1)
		{
			pmtJson[pmtrs[p].getValue(allPmtCols[2])]={
				'id':pmtrs[p].getValue(allPmtCols[0]),
				'name':pmtrs[p].getValue(allPmtCols[1])
			};
		}
		
		return pmtJson;
	}
	
	/**
	 * Helper function that returns JSON formatted list of 
	 * SKZ-Customer Trx Type mapping.
	 * Record ID: customrecord_skz_custtrxtype
	 * name, custrecord_skzctt_skoozival, internalid
	 */
	function getCustomerTrxTypeJson() 
	{
		//Assume there can NEVER be more than 1000 customer transaction types
		var ctrxSearch = search.create({
        	'type':'customrecord_skz_custtrxtype',
        	'filters':[
        	           	['isinactive','is',false]
        	          ],
        	'columns':['internalid', //0
        	           'name', //1
        	           'custrecord_skzctt_skoozival'] //2
        }),
        allCtrxCols = ctrxSearch.columns,
        ctrxrs = ctrxSearch.run().getRange({
        	'start':0,
        	'end':1000
        });
    	
		if (ctrxrs.length <= 0)
		{
			throw error.create({
    			'name':'NO_CUSTOMER_TRX_TYPE_ERROR',
    			'message':'Unable to get list of SKZ-Customer Trx Type to be used for Skoozi sync',
    			'notifyOff':true
    		});
		}
        
		//WE got the list, build the json and return
		/**
		 * [skoozi value]:{
		 * 	'id':'internalid',
		 *  'name':'netsuite name'
		 * }
		 */
		var ctrxJson = {};
		for (var c=0; c < ctrxrs.length; c+=1)
		{
			ctrxJson[ctrxrs[c].getValue(allCtrxCols[2])]={
				'id':ctrxrs[c].getValue(allCtrxCols[0]),
				'name':ctrxrs[c].getValue(allCtrxCols[1])
			};
		}
		
		return ctrxJson;
	}
	
	/**
	 * Helper function that returns JSON formatted list of 
	 * SKZ-Service Type mapping.
	 * Record ID: customrecord_skz_servtypes
	 * name, custrecord_skzctt_skoozival, internalid
	 */
	function getServiceTypeJson() 
	{
		//Assume there can NEVER be more than 1000 customer transaction types
		var servSearch = search.create({
        	'type':'customrecord_skz_servtypes',
        	'filters':[
        	           	['isinactive','is',false]
        	          ],
        	'columns':['internalid', //0
        	           'name', //1
        	           'custrecord_skzst_skoozival'] //2
        }),
        allServCols = servSearch.columns,
        servrs = servSearch.run().getRange({
        	'start':0,
        	'end':1000
        });
    	
		if (servrs.length <= 0)
		{
			throw error.create({
    			'name':'NO_SERVICE_TYPE_ERROR',
    			'message':'Unable to get list of SKZ-Service Type to be used for Skoozi sync',
    			'notifyOff':true
    		});
		}
        
		//WE got the list, build the json and return
		/**
		 * [skoozi value]:{
		 * 	'id':'internalid',
		 *  'name':'netsuite name'
		 * }
		 */
		var servJson = {};
		for (var s=0; s < servrs.length; s+=1)
		{
			servJson[servrs[s].getValue(allServCols[2])]={
				'id':servrs[s].getValue(allServCols[0]),
				'name':servrs[s].getValue(allServCols[1])
			};
		}
		
		return servJson;
	}
	
	/**
	 * Helper function that returns JSON formatted list of 
	 * SKZ-Talent Type mapping.
	 * Record ID: customrecord_skz_talenttype
	 * name, custrecord_skztt_skoozival, internalid
	 */
	function getTalentTypeJson()
	{
		//Assume there can NEVER be more than 1000 customer transaction types
		var talSearch = search.create({
        	'type':'customrecord_skz_talenttype',
        	'filters':[
        	           	['isinactive','is',false]
        	          ],
        	'columns':['internalid', //0
        	           'name', //1
        	           'custrecord_skztt_skoozival'] //2
        }),
        allTalCols = talSearch.columns,
        talrs = talSearch.run().getRange({
        	'start':0,
        	'end':1000
        });
    	
		if (talrs.length <= 0)
		{
			throw error.create({
    			'name':'NO_TALENT_TYPE_ERROR',
    			'message':'Unable to get list of SKZ-Talent Type to be used for Skoozi sync',
    			'notifyOff':true
    		});
		}
        
		//WE got the list, build the json and return
		/**
		 * [skoozi value]:{
		 * 	'id':'internalid',
		 *  'name':'netsuite name'
		 * }
		 */
		var talentJson = {};
		for (var t=0; t < talrs.length; t+=1)
		{
			talentJson[talrs[t].getValue(allTalCols[2])]={
				'id':talrs[t].getValue(allTalCols[0]),
				'name':talrs[t].getValue(allTalCols[1])
			};
		}
		
		return talentJson;
	}
	
	/**
	 * Takes single parameter; name of the sync file.
	 * If it returns Success, it will return true for status.
	 * otherwise, it returns false as status with message
	 */
	function sendSuccessNotice(_fileName, _isSandbox)
	{
		var skooziSuccessUrl = 'https://ap1.skooziapp.com/Skoozi/netsuite/netsuite-success-callback.php?fileName='+_fileName,
			skzRes = null;
		
		//If the Environment is Sandbox, uses DEV URL
		if (_isSandbox)
		{
			skooziSuccessUrl = 'http://dev.skoozi.apppartner.com/Skoozi/netsuite/netsuite-success-callback.php?fileName='+_fileName;
			skzRes = http.get({
				'url':skooziSuccessUrl
			});
		}
		else
		{
			skzRes = https.get({
				'url':skooziSuccessUrl
			});
		}
		
		log.audit('Sending Success URL', skooziSuccessUrl);
		
		if (skzRes.code == '200' && skzRes.body == 'Success')
		{
			return {
				'status':true,
				'message':''
			};
		}
		else
		{
			return {
				'status':false,
				'message':'Error with CODE '+skzRes.code+' with response message of '+skzRes.body
			};
		}
	}
	
	/**
	 * Below return statement contains list of all functions return.
	 * KEY will be used to call the functions
	 */
    return {
    	'getPaymentTypeJson': getPaymentTypeJson,
    	'getCustomerTrxTypeJson':getCustomerTrxTypeJson,
    	'getServiceTypeJson':getServiceTypeJson,
    	'getTalentTypeJson':getTalentTypeJson,
    	'getMapping':getMapping,
    	'procFailedVal':procFailedVal,
    	'sendSuccessNotice':sendSuccessNotice
    };
    
});
