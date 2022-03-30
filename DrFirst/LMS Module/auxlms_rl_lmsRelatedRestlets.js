/**
 * @param datain
 * 
 * {
 * 		"lastsynceddate":YYYY-MM-DD HH:MM24	
 * }
 */
function sampleRestlet(datain) 
{
	var robj = {
		"success":true,
		"detail":"Requested Data Parameter is: "+JSON.stringify(datain)
	};
	
	return robj;
}

/**
 * Purpose of this RESTLet is to allow Rcopia to see if there are any delta process currently
 * Both parameters are required 
 * datain.filename
 * datain.action = status or retry
 */
function getDeltaProcStatus(datain)
{

	var robj = {
			"success":true,
			"error":"",
			"detail":{
				"queuestatus":"",
				"queuedetail":"",
				"queuepof":"",
				"total":0,
				"error":0,
				"pending":0,
				"success":0
			}
		},
		ACTION_STATUS = 'status',
		ACTION_RETRY = 'retry';
	
	try
	{
		log('debug','datain',JSON.stringify(datain));
		
		//1. Make sure filename parameter is passed in
		if (!datain.filename)
		{
			log('error','Missing required filename parameter');
			robj.success = false;
			robj.error = 'Missing Required filename parameter';
			
			return robj;
		}
		
		//2. Make sure action parameter is passed in 
		//	status or retry
		if (!datain.action)
		{
			log('error','Missing required action parameter');
			robj.success = false;
			robj.error = 'Missing required action parameter. action can be "'+ACTION_STATUS+'" or "'+ACTION_RETRY+'"';
			
			return robj;
		}
		
		//3. If action is passed in, make sure values are status or retry
		if (datain.action && 
			(datain.action != ACTION_STATUS && datain.status != ACTION_RETRY))
		{
			log('error','Invalid action parameter');
			robj.success = false;
			robj.error = 'Invalid action parameter. action can be "'+ACTION_STATUS+'" or "'+ACTION_RETRY+'"';
			
			return robj;
		}
		
		//4. Search for File ID in NetSuite 
		var expFileFlt = [
		                  	['file.name','is', datain.filename]
		                 ],
			fileCol = [new nlobjSearchColumn('internalid','file').setSort(true),
		               new nlobjSearchColumn('name','file')],
		    fileRs = nlapiSearchRecord('folder',null,expFileFlt, fileCol),
		    matchedFileId = '';
		
		//IF No results are found, this is an error
		if (!fileRs)
		{
			log('error','No Matching Rcopia Delta file found');
			robj.success = false;
			robj.error = 'Invalid File Name. No matching Rcopia Delta file found in NetSuite with name '+datain.filename;
			
			return robj;
		}
		
		//At this point, we can assume file was found
		matchedFileId = fileRs[0].getValue('internalid','file');
		
		log('debug','file match',matchedFileId);
		
		if (datain.action == ACTION_STATUS)
		{
			//------------------ Rcopia requesting "status" of the job ---------------------------------------------------
			var qflt = [new nlobjSearchFilter('isinactive',null,'is','F'),
			            new nlobjSearchFilter('custrecord_lmsq_fileref',null,'anyof',matchedFileId)],
				qcol = [new nlobjSearchColumn('internalid'),
				        new nlobjSearchColumn('custrecord_lmsq_procstatus'),
				        new nlobjSearchColumn('custrecord_lmsq_procdetail'),
				        new nlobjSearchColumn('custrecord_lmsq_pof'),
				        new nlobjSearchColumn('custrecord_lmsq_numtotalstagedrecs'),
				        new nlobjSearchColumn('custrecord_lmsq_numsuccess'),
				        new nlobjSearchColumn('custrecord_lmsq_numfailed'),
				        new nlobjSearchColumn('custrecord_lmsq_numunprocessed')],
				qrs = nlapiSearchRecord('customrecord_lmsqueue', null, qflt, qcol);
			
			if (!qrs)
			{
				//IF there are no queue record for this file, it means it has NOT been queue up for processing
				robj.success = true;
				robj.error = '';
				robj.detail.queuestatus = 'Pending';
				robj.detail.queuedetail = 'File is PENDING Process by NetSuite';
			}
			else
			{
				//Return values
				robj.success = true;
				robj.error = '';
				robj.detail.queuestatus = qrs[0].getText('custrecord_lmsq_procstatus');
				robj.detail.queuedetail = (qrs[0].getValue('custrecord_lmsq_procdetail')?qrs[0].getValue('custrecord_lmsq_procdetail'):'');
				robj.detail.queuepof = (qrs[0].getValue('custrecord_lmsq_pof')?qrs[0].getValue('custrecord_lmsq_pof'):'');
				robj.detail.total = (qrs[0].getValue('custrecord_lmsq_numtotalstagedrecs')?qrs[0].getValue('custrecord_lmsq_numtotalstagedrecs'):0);
				robj.detail.error = (qrs[0].getValue('custrecord_lmsq_numfailed')?qrs[0].getValue('custrecord_lmsq_numfailed'):0);
				robj.detail.pending = (qrs[0].getValue('custrecord_lmsq_numunprocessed')?qrs[0].getValue('custrecord_lmsq_numunprocessed'):0);
				robj.detail.success = (qrs[0].getValue('custrecord_lmsq_numsuccess')?qrs[0].getValue('custrecord_lmsq_numsuccess'):0);
			}
			
		}
		else
		{
			//------------------ Rcopia requesting "retry" of the job ---------------------------------------------------
			
			
			
		}
		
		
		return robj;
		
	}
	catch (pserr)
	{
		robj.success = false;
		robj.detail = 'Error getting process status // '+getErrText(pserr);
	}
	
	return robj;
	
}

/**
 * Based on lastsynceddate, function will return all License (User) records with last modified date after specified date.
 * @param datain
 * 
 * {
 * 		"lastsynceddate":YYYY-MM-DD HH:MM24,
 * 		"lastsynceddateto:YYYY-MM-DD HH:MM24, //NEW Parameter to allow Rcopia to look for data within date/time parameter
 * 		"lastindex":xxxx //This is the LAST NetSuite internal ID from list of delta sent back. Client should ping back with to see if there are any OTHER records to process
 * }
 * 
 * @return robj
 * {
		"success":true,
		"detail":"",
		"size":0,
		"delta":[
					{
						"internalId":xxx, //NetSuite Primary Key
						"externalId":xxx, //Rcopia Primary Key
						"isInactive":true or false, //NetSuite identification whether record is inactive or not
						...
					},
				]
	}
 */
function getDeltaUserLicense(datain) 
{
	var robj = {
		"success":true,
		"detail":"",
		"size":0,
		"delta":[]
	};
	
	var valobj = initValidation(datain);
	if (!valobj.isvalid)
	{
		robj.success = false;
		robj.detail = valobj.detail;
		return robj;
	}
	
	//All is well, execute search and return value
	try 
	{
		datain.lastsynceddate = validateAndFormatDateTime(datain.lastsynceddate);
		log('debug','last synced modified', datain.lastsynceddate);
		
		var uflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
		            new nlobjSearchFilter('lastmodified', null, 'after', datain.lastsynceddate),
		            //10/22/2015 - Added to ensure ONLY the primary loction User License is returned to RCOPIA
		            new nlobjSearchFilter('custrecord_lmslc_primarylocation', null, 'is','T'),
		            //11/16/2015 - ONLY return those updates done by UI
		            new nlobjSearchFilter('custrecord_lmslc_uiupdatedt', null, 'is', 'T')];
		if (datain.lastindex) 
		{
			//Grab additional records
			uflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', datain.lastindex));
		}
		
		if (datain.lastsynceddateto)
		{
			datain.lastsynceddateto = validateAndFormatDateTime(datain.lastsynceddateto);
			log('debug','last sync to', datain.lastsynceddateto);
			uflt.push(new nlobjSearchFilter('lastmodified', null, 'onorbefore', datain.lastsynceddateto));
		}
		
		var ucol = [
		            new nlobjSearchColumn('internalid').setSort(true), //Sort it in Internal ID DESC order.
		            new nlobjSearchColumn('custrecord_lmslc_externalid'), //rcopiaId
		            new nlobjSearchColumn('custrecord_lmslc_userid'), //userId
		            new nlobjSearchColumn('custrecord_lmsp_externalid', 'custrecord_lmslc_practice'), //practiceExternalId
		            new nlobjSearchColumn('custrecord_lmsl_externalid', 'custrecord_lmslc_location'), //locationRcopiaId (Combined)
		            new nlobjSearchColumn('custrecord_lmsct_externalid', 'custrecord_lmslc_contract'), //contractRcopiaId Added 8/7/2015
		            new nlobjSearchColumn('custrecord_lmsl_locationid', 'custrecord_lmslc_location'), //locationId (numerical ID),
		            new nlobjSearchColumn('custrecord_lms_enablecode','custrecord_lmslc_enablereason'), //licenseEnableReason (text) Added 8/7/2015 //Return Code instead (10/7/2015)
		            new nlobjSearchColumn('custrecord_lms_lossreasoncode','custrecord_lmslc_lossreason'), //licenseLossReason (text) Added 8/7/2015 //Return Code instead (10/7/2015)
		            new nlobjSearchColumn('lastmodified'), //lastModifiedDate Added 8/7/2015
		            new nlobjSearchColumn('created'), //createdDate Added 8/7/2015
		            new nlobjSearchColumn('custrecord_lmslc_username'), //userName
		            new nlobjSearchColumn('custrecord_lmslc_status'), //activeStatus (select)
		            new nlobjSearchColumn('custrecord_lmslc_licensetype'), //accountType (select)
		            new nlobjSearchColumn('custrecord_lmslc_firstname'), //userFirstName
		            new nlobjSearchColumn('custrecord_lmslc_lastname'), //userLastName
		            new nlobjSearchColumn('custrecord_lmslc_email'), //userEmail
		            new nlobjSearchColumn('custrecord_lmslc_startdt'), //entitlementStartDate
		            new nlobjSearchColumn('custrecord_lmslc_enddt'), //entitlementEndDate
		            new nlobjSearchColumn('custrecord_lmslc_rx1date'), //entitlementRx1Date (Used as First Rx Date)
		            new nlobjSearchColumn('custrecord_lmslc_medlicnum'), //medLicenseNumber
		            new nlobjSearchColumn('custrecord_lmslc_usersuffix'), //userSuffix
		            new nlobjSearchColumn('custrecord_lmslc_userprefix'), //userPrefix
		            new nlobjSearchColumn('custrecord_lmslc_dea'), //userDea
		            new nlobjSearchColumn('custrecord_lmslc_isdemo'), //isDemoAccount (true || false)
		            new nlobjSearchColumn('custrecord_lmslc_npi'), //userNpi (select)
		            new nlobjSearchColumn('custrecord_lmslc_accessregion'), //accessRegion (select)
		            new nlobjSearchColumn('custrecord_lmslc_usercountry'), //userCountry (select)
		            new nlobjSearchColumn('custrecord_lmslc_useraddr1'), //userAddress1
		            new nlobjSearchColumn('custrecord_lmslc_useraddr2'), //userAddress2
		            new nlobjSearchColumn('custrecord_lmslc_userstatedd'), //userState (select)
		            new nlobjSearchColumn('custrecord_lmslc_usercity'), //userCity
		            new nlobjSearchColumn('custrecord_lmslc_userzip'), //userzip
		            new nlobjSearchColumn('custrecord_lmslc_userenableddate'), //userEnabledDate
		            new nlobjSearchColumn('custrecord_lmslc_userphone'), //userPhone
		            new nlobjSearchColumn('custrecord_lmslc_userfax'), //userFax
		            new nlobjSearchColumn('custrecord_lmslc_userastrxdate'), //userLastRxDate
		            new nlobjSearchColumn('custrecord_lmslc_muuser'), //isUserMuUser (true || false)
		            new nlobjSearchColumn('custrecord_lmslc_specialty'), //userSpecialty (select)
		            new nlobjSearchColumn('custrecord_lmslc_promocode'), //userPromoCode (select)
		            new nlobjSearchColumn('custrecord_lmslc_userlastlogindate'), //Last Login Date
		            new nlobjSearchColumn('custrecord_lmslc_istest'), //isTest (check box)
		            new nlobjSearchColumn('custrecord_lmslc_isdeleted') //isDeleted (check box)
		            
		            ];
		
		var urs = nlapiSearchRecord('customrecord_lmslic', null, uflt, ucol);
		
		log('debug','search completed','completed');
		
		if (!urs || (urs && urs.length <= 0))
		{
			robj.success = true;
			robj.detail = "No delta results found with last modified date after "+datain.lastsynceddate;
		}
		else
		{
			robj.size = urs.length;
			
			log('debug','running loop','loop running');
			
			for (var i=0; i < urs.length; i+=1)
			{
				var muUserVal = urs[i].getValue('custrecord_lmslc_muuser');
				if (muUserVal)
				{
					muUserVal = muUserVal.toLowerCase();
				}
				
				if (!muUserVal || muUserVal=='n' || muUserVal=='f')
				{
					muUserVal = 'n';
				}
				else if (muUserVal=='y' || muUserVal=='T')
				{
					muUserVal = 'y';
				}
				
				//4/11/2016 - Request to reformat all phone and fax numbers to ONLY contain 10 digit numbers.
				var uModPhone = (urs[i].getValue('custrecord_lmslc_userphone')?urs[i].getValue('custrecord_lmslc_userphone'):''),
					uModFax = (urs[i].getValue('custrecord_lmslc_userfax')?urs[i].getValue('custrecord_lmslc_userfax'):'');
				
				//4/14/2016 - Seth request to revert back and NOT remove formatting.
				//			  This broke Rcopia
				/**
				if (uModPhone)
				{
					uModPhone = strGlobalReplace(uModPhone, ' ', '');
					uModPhone = strGlobalReplace(uModPhone, '-', '');
					uModPhone = strGlobalReplace(uModPhone, '\\(', '');
					uModPhone = strGlobalReplace(uModPhone, '\\)', '');
				}
				
				if (uModFax)
				{
					uModFax = strGlobalReplace(uModFax, ' ', '');
					uModFax = strGlobalReplace(uModFax, '-', '');
					uModFax = strGlobalReplace(uModFax, '\\(', '');
					uModFax = strGlobalReplace(uModFax, '\\)', '');
				}
				*/
				
				var dobj = {
					'netsuiteId':urs[i].getValue('internalid'),
					'rcopiaId':(urs[i].getValue('custrecord_lmslc_externalid')?urs[i].getValue('custrecord_lmslc_externalid'):''), //Combined ID
					'userId':(urs[i].getValue('custrecord_lmslc_userid')?urs[i].getValue('custrecord_lmslc_userid'):''),
					'practiceId':(urs[i].getValue('custrecord_lmsp_externalid', 'custrecord_lmslc_practice')?urs[i].getValue('custrecord_lmsp_externalid', 'custrecord_lmslc_practice'):''),
					'locationId':(urs[i].getValue('custrecord_lmsl_locationid', 'custrecord_lmslc_location')?urs[i].getValue('custrecord_lmsl_locationid', 'custrecord_lmslc_location'):''),
					'contractId':(urs[i].getValue('custrecord_lmsct_externalid', 'custrecord_lmslc_contract')?urs[i].getValue('custrecord_lmsct_externalid', 'custrecord_lmslc_contract'):''),
					'locationRcopiaId':(urs[i].getValue('custrecord_lmsl_externalid', 'custrecord_lmslc_location')?urs[i].getValue('custrecord_lmsl_externalid', 'custrecord_lmslc_location'):''),
					'enableReason':(urs[i].getValue('custrecord_lms_enablecode','custrecord_lmslc_enablereason')?urs[i].getValue('custrecord_lms_enablecode','custrecord_lmslc_enablereason'):''),
					'lossReason':(urs[i].getValue('custrecord_lms_lossreasoncode','custrecord_lmslc_lossreason')?urs[i].getValue('custrecord_lms_lossreasoncode','custrecord_lmslc_lossreason'):''),
					'nsModifiedDate':urs[i].getValue('lastmodified'),
					'nsCreatedDate':urs[i].getValue('created'),
					'userName':(urs[i].getValue('custrecord_lmslc_username')?urs[i].getValue('custrecord_lmslc_username'):''),
					'activityStatus':(urs[i].getText('custrecord_lmslc_status')?urs[i].getText('custrecord_lmslc_status'):''),
					'accountType':(urs[i].getText('custrecord_lmslc_licensetype')?urs[i].getText('custrecord_lmslc_licensetype'):''),
					'firstName':(urs[i].getValue('custrecord_lmslc_firstname')?urs[i].getValue('custrecord_lmslc_firstname'):''),
					'lastName':(urs[i].getValue('custrecord_lmslc_lastname')?urs[i].getValue('custrecord_lmslc_lastname'):''),
					'userEmail':(urs[i].getValue('custrecord_lmslc_email')?urs[i].getValue('custrecord_lmslc_email'):''),
					'startDate':(urs[i].getValue('custrecord_lmslc_startdt')?urs[i].getValue('custrecord_lmslc_startdt'):''),
					'endDate':(urs[i].getValue('custrecord_lmslc_enddt')?urs[i].getValue('custrecord_lmslc_enddt'):''),
					'firstRx1Date':(urs[i].getValue('custrecord_lmslc_rx1date')?urs[i].getValue('custrecord_lmslc_rx1date'):''),
					'medLicenseNumber':(urs[i].getValue('custrecord_lmslc_medlicnum')?urs[i].getValue('custrecord_lmslc_medlicnum'):''),
					'suffix':(urs[i].getValue('custrecord_lmslc_usersuffix')?urs[i].getValue('custrecord_lmslc_usersuffix'):''),
					'prefix':(urs[i].getValue('custrecord_lmslc_userprefix')?urs[i].getValue('custrecord_lmslc_userprefix'):''),
					'dea':(urs[i].getValue('custrecord_lmslc_dea')?urs[i].getValue('custrecord_lmslc_dea'):''),
					'demoAccount':(urs[i].getValue('custrecord_lmslc_isdemo')?urs[i].getValue('custrecord_lmslc_isdemo'):''),
					'npi':(urs[i].getText('custrecord_lmslc_npi')?urs[i].getText('custrecord_lmslc_npi'):''),
					'region':(urs[i].getText('custrecord_lmslc_accessregion')?urs[i].getText('custrecord_lmslc_accessregion'):''),
					'address1':(urs[i].getValue('custrecord_lmslc_useraddr1')?urs[i].getValue('custrecord_lmslc_useraddr1'):''),
					'address2':(urs[i].getValue('custrecord_lmslc_useraddr2')?urs[i].getValue('custrecord_lmslc_useraddr2'):''),
					'state':(urs[i].getText('custrecord_lmslc_userstatedd')?usStateList[urs[i].getText('custrecord_lmslc_userstatedd')]:''),
					'city':(urs[i].getValue('custrecord_lmslc_usercity')?urs[i].getValue('custrecord_lmslc_usercity'):''),
					'zip':(urs[i].getValue('custrecord_lmslc_userzip')?urs[i].getValue('custrecord_lmslc_userzip'):''),
					'enabledDate':(urs[i].getValue('custrecord_lmslc_userenableddate')?urs[i].getValue('custrecord_lmslc_userenableddate'):''),
					'phone':uModPhone,
					'fax':uModFax,
					'lastRxDate':(urs[i].getValue('custrecord_lmslc_userastrxdate')?urs[i].getValue('custrecord_lmslc_userastrxdate'):''),
					'muUser':muUserVal,
					'specialty':(urs[i].getText('custrecord_lmslc_specialty')?urs[i].getText('custrecord_lmslc_specialty'):''),
					'promoCode':(urs[i].getValue('custrecord_lmslc_promocode')?urs[i].getValue('custrecord_lmslc_promocode'):''),
					'lastLoginDate':(urs[i].getValue('custrecord_lmslc_userlastlogindate')?urs[i].getValue('custrecord_lmslc_userlastlogindate'):''),
					'isTest':(urs[i].getValue('custrecord_lmslc_istest')=='T'?'y':'n'),
					'isDeleted':(urs[i].getValue('custrecord_lmslc_isdeleted')=='T'?'y':'n'),
				};
				
				//convert the delimiter
				if (dobj.specialty)
				{
					dobj.specialty = strGlobalReplace(dobj.specialty, ',', '|');
					//log('debug','specialty',dobj.specialty);
				}
				
				robj.delta.push(dobj);
				
				log('debug','i - phone and fax',i+' // '+dobj.phone+' // '+dobj.fax);
			}
			
			var lastIndexText = '';
			if (datain.lastindex)
			{
				lastIndexText = ' and last index value of '+datain.lastindex;
			}
			robj.detail = 'Successfully found '+urs.length+' records with modified date after ' + datain.lastsynceddate + lastIndexText;
		}
	}
	catch (searcherr)
	{
		log('error','Error getting License (user) Delta', getErrText(searcherr)+' // Last Synced Date: '+datain.lastsynceddate+' //Last Index: '+datain.lastindex);
		robj.success = false;
		robj.detail = 'Error getting License (user) Delta ('+datain.lastsynceddate+'): '+getErrText(searcherr);
	}
	
	log('debug','returning data','returning');
	
	return robj;
}

/**
 * Based on lastsynceddate, function will return all Location Info records with last modified date after specified date.
 * @param datain
 * 
 * {
 * 		"lastsynceddate":YYYY-MM-DD HH:MM24,
 *		"lastsynceddateto:YYYY-MM-DD HH:MM24, //NEW Parameter to allow Rcopia to look for data within date/time parameter
 * 		"lastindex":xxxx //This is the LAST NetSuite internal ID from list of delta sent back. Client should ping back with to see if there are any OTHER records to process
 * }
 * 
 * @return robj
 * {
		"success":true,
		"detail":"",
		"size":0,
		"delta":[
					{
						"internalId":xxx, //NetSuite Primary Key
						"externalId":xxx, //Rcopia Primary Key
						"isInactive":true or false, //NetSuite identification whether record is inactive or not
						...
					},
				]
	}
 */
function getDeltaLocation(datain) 
{
	var robj = {
		"success":true,
		"detail":"",
		"size":0,
		"delta":[]
	};
	
	var valobj = initValidation(datain);
	if (!valobj.isvalid)
	{
		robj.success = false;
		robj.detail = valobj.detail;
		return robj;
	}
	
	//All is well, execute search and return value
	try 
	{
		datain.lastsynceddate = validateAndFormatDateTime(datain.lastsynceddate);
		log('debug','last synced modified', datain.lastsynceddate);
		
		var lflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
		            new nlobjSearchFilter('lastmodified', null, 'after', datain.lastsynceddate),
		            //11/16/2015 - Return ONLY changes done by UI
		            new nlobjSearchFilter('custrecord_lmsl_uiupdateddt',null, 'is','T')];
		
		if (datain.lastindex) 
		{
			//Grab additional records
			lflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', datain.lastindex));
		}
		
		if (datain.lastsynceddateto)
		{
			datain.lastsynceddateto = validateAndFormatDateTime(datain.lastsynceddateto);
			lflt.push(new nlobjSearchFilter('lastmodified', null, 'onorbefore', datain.lastsynceddateto));
		}
		
		var lcol = [
		            new nlobjSearchColumn('internalid').setSort(true), //Sort it in Internal ID DESC order.
		            new nlobjSearchColumn('custrecord_lmsl_externalid'), //RcopiaID
		            new nlobjSearchColumn('custrecord_lmsl_accessregion'), //accessRegion (select)
		            new nlobjSearchColumn('name'), //locationName
		            new nlobjSearchColumn('lastmodified'), //Added 8/7/2015
		            new nlobjSearchColumn('created'), //Added 8/7/2015
		            new nlobjSearchColumn('custrecord_lmsp_externalid', 'custrecord_lmsl_practice'), //practiceExternalId
		            new nlobjSearchColumn('custrecord_lmsl_locationid'), //Location ID
		            new nlobjSearchColumn('custrecord_lmsl_addr1'), //practiceAddress1 
		            new nlobjSearchColumn('custrecord_lmsl_addr2'), //practiceAddress2
		            new nlobjSearchColumn('custrecord_lmsl_city'), //practiceCity
		            new nlobjSearchColumn('custrecord_lmsl_state'), //practiceState (select)
		            new nlobjSearchColumn('custrecord_lmsl_zip'), //practiceZip
		            new nlobjSearchColumn('custrecord_lmsl_country'), //practiceCountry
		            new nlobjSearchColumn('custrecord_lmsl_phone'), //practicePhone
		            new nlobjSearchColumn('custrecord_lmsl_fax'), //practiceFax
		            new nlobjSearchColumn('custrecord_lmsl_istest'), //isTest
		            new nlobjSearchColumn('custrecord_lmsl_isdeleted') //isDeleted
		            ];
		
		var lrs = nlapiSearchRecord('customrecord_lmsl', null, lflt, lcol);
		if (!lrs || (lrs && lrs.length <= 0))
		{
			robj.success = true;
			robj.detail = "No delta results found with last modified date after "+datain.lastsynceddate;
		}
		else
		{
			robj.size = lrs.length;
			
			for (var i=0; i < lrs.length; i+=1)
			{
				//4/11/2016 - Request to reformat all phone and fax numbers to ONLY contain 10 digit numbers.
				var loModPhone = (lrs[i].getValue('custrecord_lmsl_phone')?lrs[i].getValue('custrecord_lmsl_phone'):''),
					loModFax = (lrs[i].getValue('custrecord_lmsl_fax')?lrs[i].getValue('custrecord_lmsl_fax'):'');
				
				//4/14/2016 - Seth request to revert back and NOT remove formatting.
				//			  This broke Rcopia
				/**
				if (loModPhone)
				{
					loModPhone = strGlobalReplace(loModPhone, ' ', '');
					loModPhone = strGlobalReplace(loModPhone, '-', '');
					loModPhone = strGlobalReplace(loModPhone, '\\(', '');
					loModPhone = strGlobalReplace(loModPhone, '\\)', '');
				}
				
				if (loModFax)
				{
					loModFax = strGlobalReplace(loModFax, ' ', '');
					loModFax = strGlobalReplace(loModFax, '-', '');
					loModFax = strGlobalReplace(loModFax, '\\(', '');
					loModFax = strGlobalReplace(loModFax, '\\)', '');
				}
				*/
				
				var dobj = {
					'name':(lrs[i].getValue('name')?lrs[i].getValue('name'):''),
					'netsuiteId':lrs[i].getValue('internalid'),
					'rcopiaId':(lrs[i].getValue('custrecord_lmsl_externalid')?lrs[i].getValue('custrecord_lmsl_externalid'):''),
					'practiceId':(lrs[i].getValue('custrecord_lmsp_externalid', 'custrecord_lmsl_practice')?lrs[i].getValue('custrecord_lmsp_externalid', 'custrecord_lmsl_practice'):''),
					'locationId':(lrs[i].getValue('custrecord_lmsl_locationid')?lrs[i].getValue('custrecord_lmsl_locationid'):''),
					'nsModifiedDate':lrs[i].getValue('lastmodified'),
					'nsCreatedDate':lrs[i].getValue('created'),
					'address1':(lrs[i].getValue('custrecord_lmsl_addr1')?lrs[i].getValue('custrecord_lmsl_addr1'):''),
					'address2':(lrs[i].getValue('custrecord_lmsl_addr2')?lrs[i].getValue('custrecord_lmsl_addr2'):''),
					'city':(lrs[i].getValue('custrecord_lmsl_city')?lrs[i].getValue('custrecord_lmsl_city'):''),
					'state':(lrs[i].getText('custrecord_lmsl_state')?usStateList[lrs[i].getText('custrecord_lmsl_state')]:''),
					'zip':(lrs[i].getValue('custrecord_lmsl_zip')?lrs[i].getValue('custrecord_lmsl_zip'):''),
					'region':(lrs[i].getText('custrecord_lmsl_accessregion')?lrs[i].getText('custrecord_lmsl_accessregion'):''),
					'phone':loModPhone,
					'fax':loModFax,
					'isTest':(lrs[i].getValue('custrecord_lmsl_istest')=='T'?'y':'n'),
					'isDeleted':(lrs[i].getValue('custrecord_lmsl_isdeleted')=='T'?'y':'n')
				};
				
				robj.delta.push(dobj);
			}
			
			var lastIndexText = '';
			if (datain.lastindex)
			{
				lastIndexText = ' and last index value of '+datain.lastindex;
			}
			
			robj.detail = 'Successfully found '+lrs.length+' records with modified date after '+datain.lastsynceddate + lastIndexText;
		}
	}
	catch (searcherr)
	{
		log('error','Error getting Location Delta', getErrText(searcherr)+' // Last Synced Date: '+datain.lastsynceddate+' //Last Index: '+datain.lastindex);
		robj.success = false;
		robj.detail = 'Error getting Location Delta ('+datain.lastsynceddate+'): '+getErrText(searcherr);
	}
	
	return robj;
}

/**
 * Based on lastsynceddate, function will return all Practice Info records with last modified date after specified date.
 * @param datain
 * 
 * {
 * 		"lastsynceddate":YYYY-MM-DD HH:MM24,
 * 		"lastsynceddateto:YYYY-MM-DD HH:MM24, //NEW Parameter to allow Rcopia to look for data within date/time parameter
 * 		"lastindex":xxxx //This is the LAST NetSuite internal ID from list of delta sent back. Client should ping back with to see if there are any OTHER records to process
 * }
 * 
 * @return robj
 * {
		"success":true,
		"detail":"",
		"size":0,
		"delta":[
					{
						"internalId":xxx, //NetSuite Primary Key
						"externalId":xxx, //Rcopia Primary Key
						"isInactive":true or false, //NetSuite identification whether record is inactive or not
						...
					},
				]
	}
 */
function getDeltaPractice(datain) 
{
	var robj = {
		"success":true,
		"detail":"",
		"size":0,
		"delta":[]
	};
	
	var valobj = initValidation(datain);
	if (!valobj.isvalid)
	{
		robj.success = false;
		robj.detail = valobj.detail;
		return robj;
	}
	
	//All is well, execute search and return value
	try 
	{
		datain.lastsynceddate = validateAndFormatDateTime(datain.lastsynceddate);
		log('debug','last synced modified', datain.lastsynceddate);
		
		var pflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
		            new nlobjSearchFilter('lastmodified', null, 'after', datain.lastsynceddate),
		            //11/16/2015 - Return ONLY changes done by UI
		            new nlobjSearchFilter('custrecord_lmsp_uiupdateddt',null, 'is','T')];
		if (datain.lastindex) 
		{
			//Grab additional records
			pflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', datain.lastindex));
		}
		
		if (datain.lastsynceddateto)
		{
			datain.lastsynceddateto = validateAndFormatDateTime(datain.lastsynceddateto);
			pflt.push(new nlobjSearchFilter('lastmodified', null, 'onorbefore', datain.lastsynceddateto));
		}
		
		var pcol = [
		            new nlobjSearchColumn('internalid').setSort(true), //Sort it in Internal ID DESC order.
		            new nlobjSearchColumn('name'), //practiceName
		            new nlobjSearchColumn('lastmodified'), //Added 8/7/2015
		            new nlobjSearchColumn('created'), //Added 8/7/2015
		            new nlobjSearchColumn('custrecord_lmsp_externalid'), //externalId
		            new nlobjSearchColumn('custrecord_lmsct_externalid', 'custrecord_lmsp_contract'), //contractExternalId
		            new nlobjSearchColumn('custrecord_lmsp_addr1'), //practiceAddress1 
		            new nlobjSearchColumn('custrecord_lmsp_addr2'), //practiceAddress2
		            new nlobjSearchColumn('custrecord_lmsp_city'), //practiceCity
		            new nlobjSearchColumn('custrecord_lmsp_state'), //practiceState (select)
		            new nlobjSearchColumn('custrecord_lmsp_zip'), //practiceZip
		            new nlobjSearchColumn('custrecord_lmsp_billtype'), //billingType (select)
		            new nlobjSearchColumn('custrecord_lmsp_accessregion'), //accessRegion (select)
		            new nlobjSearchColumn('custrecord_lmsp_phone'), //practicePhone
		            new nlobjSearchColumn('custrecord_lmsp_fax'), //practiceFax
		            new nlobjSearchColumn('custrecord_lmsp_username'), //userName
		            new nlobjSearchColumn('custrecord_lmsp_activestatus'), // active status
		            new nlobjSearchColumn('custrecord_lmsp_istest') //Is Test Account
		            ];
		
		var prs = nlapiSearchRecord('customrecord_lmsp', null, pflt, pcol);
		if (!prs || (prs && prs.length <= 0))
		{
			robj.success = true;
			robj.detail = "No delta results found with last modified date after "+datain.lastsynceddate;
		}
		else
		{
			robj.size = prs.length;
			
			for (var i=0; i < prs.length; i+=1)
			{
				//4/11/2016 - Request to reformat all phone and fax numbers to ONLY contain 10 digit numbers.
				var prModPhone = (prs[i].getValue('custrecord_lmsp_phone')?prs[i].getValue('custrecord_lmsp_phone'):''),
					prModFax = (prs[i].getValue('custrecord_lmsp_fax')?prs[i].getValue('custrecord_lmsp_fax'):'');
				
				//4/14/2016 - Seth request to revert back and NOT remove formatting.
				//			  This broke Rcopia
				/**
				if (prModPhone)
				{
					prModPhone = strGlobalReplace(prModPhone, ' ', '');
					prModPhone = strGlobalReplace(prModPhone, '-', '');
					prModPhone = strGlobalReplace(prModPhone, '\\(', '');
					prModPhone = strGlobalReplace(prModPhone, '\\)', '');
				}
				
				if (prModFax)
				{
					prModFax = strGlobalReplace(prModFax, ' ', '');
					prModFax = strGlobalReplace(prModFax, '-', '');
					prModFax = strGlobalReplace(prModFax, '\\(', '');
					prModFax = strGlobalReplace(prModFax, '\\)', '');
				}
				*/
				
				var dobj = {
					'name':(prs[i].getValue('name')?prs[i].getValue('name'):''),
					'netsuiteId':prs[i].getValue('internalid'),
					'nsModifiedDate':prs[i].getValue('lastmodified'),
					'nsCreatedDate':prs[i].getValue('created'),
					'rcopiaId':(prs[i].getValue('custrecord_lmsp_externalid')?prs[i].getValue('custrecord_lmsp_externalid'):''),
					'contractId':(prs[i].getValue('custrecord_lmsct_externalid', 'custrecord_lmsp_contract')?prs[i].getValue('custrecord_lmsct_externalid', 'custrecord_lmsp_contract'):''),
					'address1':(prs[i].getValue('custrecord_lmsp_addr1')?prs[i].getValue('custrecord_lmsp_addr1'):''),
					'address2':(prs[i].getValue('custrecord_lmsp_addr2')?prs[i].getValue('custrecord_lmsp_addr2'):''),
					'city':(prs[i].getValue('custrecord_lmsp_city')?prs[i].getValue('custrecord_lmsp_city'):''),
					'state':(prs[i].getText('custrecord_lmsp_state')?usStateList[prs[i].getText('custrecord_lmsp_state')]:''),
					'zip':(prs[i].getValue('custrecord_lmsp_zip')?prs[i].getValue('custrecord_lmsp_zip'):''),
					'billingType':(prs[i].getText('custrecord_lmsp_billtype')?prs[i].getText('custrecord_lmsp_billtype'):''),
					'practiceRegion':(prs[i].getText('custrecord_lmsp_accessregion')?prs[i].getText('custrecord_lmsp_accessregion'):''),
					'phone':prModPhone,
					'fax':prModFax,
					'userName':(prs[i].getValue('custrecord_lmsp_username')?prs[i].getValue('custrecord_lmsp_username'):''),
					'practiceActiveStatus':(prs[i].getValue('custrecord_lmsp_activestatus')?prs[i].getText('custrecord_lmsp_activestatus'):''),
					'isTest':(prs[i].getValue('custrecord_lmsp_istest')=='T'?'y':'n')
				};
				
				robj.delta.push(dobj);
			}
			
			var lastIndexText = '';
			if (datain.lastindex)
			{
				lastIndexText = ' and last index value of '+datain.lastindex;
			}
			
			robj.detail = 'Successfully found '+prs.length+' records with modified date after '+datain.lastsynceddate + lastIndexText;
		}
	}
	catch (searcherr)
	{
		log('error','Error getting Practice Delta', getErrText(searcherr)+' // Last Synced Date: '+datain.lastsynceddate+' //Last Index: '+datain.lastindex);
		robj.success = false;
		robj.detail = 'Error getting Practice Delta ('+datain.lastsynceddate+'): '+getErrText(searcherr);
	}
	
	return robj;
}

/**
 * Based on lastsynceddate, function will return all Contact records with last modified date after specified date.
 * @param datain
 * 
 * {
 * 		"lastsynceddate":YYYY-MM-DD HH:MM24 or MM/DD/YYYY HH:MM am/pm
 * 		"lastsynceddateto:YYYY-MM-DD HH:MM24, //NEW Parameter to allow Rcopia to look for data within date/time parameter
 * 		"lastindex":xxxx //This is the LAST NetSuite internal ID from list of delta sent back. Client should ping back with to see if there are any OTHER records to process
 * }
 * 
 * @return robj
 * {
		"success":true,
		"detail":"",
		"size":0,
		"delta":[
					{
						"name":xxx, //Contract name
						"netsuiteId":xxx, //NetSuite Primary Key
						"rcopiaId":xxx, //Rcopia Primary Key
						"activeStatus":[Possible values are A, D, V, X, I], 
						"accessDefaultRegion":xxx, //Rcopia acces region text value
						"availableRegions":"xxx,xxx,xxx", //Comma separated list of access regions
						"manager":xxxx, //Name of Contract Manager
						"type":xxx, //Text value of contract type
						"userName":xxx, //Contract user name
						"startDate":mm/dd/YYYY, //Contract start date
						"endDate":mm/dd/YYYY, //Contract end date
						"firstName":xxxx, //Contract contact first name
						"lastName":xxxx, //Contract contact last name
						"email":xxx@xxx.com //Contract contact email
					},
				]
	}
 */
function getDeltaContracts(datain) 
{
	var robj = {
		"success":true,
		"detail":"",
		"size":0,
		"delta":[]
	};
	
	var valobj = initValidation(datain);
	if (!valobj.isvalid)
	{
		robj.success = false;
		robj.detail = valobj.detail;
		return robj;
	}
	
	//All is well, execute search and return value
	try 
	{
		datain.lastsynceddate = validateAndFormatDateTime(datain.lastsynceddate);
		log('debug','last synced modified', datain.lastsynceddate);
		
		var cflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
		            new nlobjSearchFilter('lastmodified', null, 'after', datain.lastsynceddate),
		            //11/16/2015 - Return ONLY changes done by UI
		            new nlobjSearchFilter('custrecord_lmsct_uiupdateddt',null, 'is','T')];
		if (datain.lastindex) 
		{
			//Grab additional records
			cflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', datain.lastindex));
		}
		
		if (datain.lastsynceddateto)
		{
			datain.lastsynceddateto = validateAndFormatDateTime(datain.lastsynceddateto);
			cflt.push(new nlobjSearchFilter('lastmodified', null, 'onorbefore', datain.lastsynceddateto));
		}
		
		var ccol = [
		            new nlobjSearchColumn('internalid').setSort(true), //Sort it in Internal ID DESC order.
		            new nlobjSearchColumn('name'), //contractName
		            new nlobjSearchColumn('lastmodified'), //Added 8/7/2015
		            new nlobjSearchColumn('created'), //Added 8/7/2015
		            new nlobjSearchColumn('custrecord_lmsct_externalid'), //externalId
		            new nlobjSearchColumn('custrecord_lmsct_availregions'), //available access regions (multi-select)
		            new nlobjSearchColumn('custrecord_lmsct_activestatus'), //contract active status (select)
		            new nlobjSearchColumn('custrecord_lmsct_accessregion'), //default accessRegion (select)
		            new nlobjSearchColumn('custrecord_lmsct_ctmanager'), //manager 
		            new nlobjSearchColumn('custrecord_lmsct_type'), //type (select)
		            new nlobjSearchColumn('custrecord_lmsct_username'), //userName
		            new nlobjSearchColumn('custrecord_lmsct_startdate'), //startDate
		            new nlobjSearchColumn('custrecord_lmsct_endate'), //endDate
		            new nlobjSearchColumn('custrecord_lmsct_contactfname'), //firstName
		            new nlobjSearchColumn('custrecord_lmsct_contactlname'), //lastName
		            new nlobjSearchColumn('custrecord_lmsct_contactemail'), //email
		            new nlobjSearchColumn('custrecord_lmsct_istest') //Is Test Account
		            ];
		
		var crs = nlapiSearchRecord('customrecord_lmsc', null, cflt, ccol);
		if (!crs || (crs && crs.length <= 0))
		{
			robj.success = true;
			robj.detail = "No delta results found with last modified date after "+datain.lastsynceddate;
		}
		else
		{
			robj.size = crs.length;
			
			for (var i=0; i < crs.length; i+=1)
			{
				var dobj = {
					'name':(crs[i].getValue('name')?crs[i].getValue('name'):''),
					'nsModifiedDate':crs[i].getValue('lastmodified'),
					'nsCreatedDate':crs[i].getValue('created'),
					'netsuiteId':crs[i].getValue('internalid'),
					'rcopiaId':(crs[i].getValue('custrecord_lmsct_externalid')?crs[i].getValue('custrecord_lmsct_externalid'):''),
					'activeStatus':(crs[i].getValue('custrecord_lmsct_activestatus')?crs[i].getText('custrecord_lmsct_activestatus'):''),
					'accessDefaultRegion':(crs[i].getText('custrecord_lmsct_accessregion')?crs[i].getText('custrecord_lmsct_accessregion'):''),
					//TODO: Need to check the value and have it return with | delimiter
					'availableRegions':(crs[i].getText('custrecord_lmsct_availregions')?crs[i].getText('custrecord_lmsct_availregions'):''), 
					'manager':(crs[i].getValue('custrecord_lmsct_ctmanager')?crs[i].getValue('custrecord_lmsct_ctmanager'):''),
					'type':(crs[i].getText('custrecord_lmsct_type')?crs[i].getText('custrecord_lmsct_type'):''),
					'userName':(crs[i].getValue('custrecord_lmsct_username')?crs[i].getValue('custrecord_lmsct_username'):''),
					'startDate':(crs[i].getValue('custrecord_lmsct_startdate')?crs[i].getValue('custrecord_lmsct_startdate'):''),
					'endDate':(crs[i].getValue('custrecord_lmsct_endate')?crs[i].getValue('custrecord_lmsct_endate'):''),
					'firstName':(crs[i].getValue('custrecord_lmsct_contactfname')?crs[i].getValue('custrecord_lmsct_contactfname'):''),
					'lastName':(crs[i].getValue('custrecord_lmsct_contactlname')?crs[i].getValue('custrecord_lmsct_contactlname'):''),
					'email':(crs[i].getValue('custrecord_lmsct_contactemail')?crs[i].getValue('custrecord_lmsct_contactemail'):''),
					'isTest':(crs[i].getValue('custrecord_lmsct_istest')=='T'?'y':'n')
				};
				
				//convert the delimiter
				if (dobj.availableRegions)
				{
					dobj.availableRegions = strGlobalReplace(dobj.availableRegions, ',', '|');
					log('debug','available Regions',dobj.availableRegions);
				}
				
				robj.delta.push(dobj);
			}
			
			var lastIndexText = '';
			if (datain.lastindex)
			{
				lastIndexText = ' and last index value of '+datain.lastindex;
			}
			
			robj.detail = 'Successfully found '+crs.length+' records with modified date after '+datain.lastsynceddate + lastIndexText;
		}
	}
	catch (searcherr)
	{
		log('error','Error getting Contract Delta', getErrText(searcherr)+' // Last Synced Date: '+datain.lastsynceddate+' //Last Index: '+datain.lastindex);
		robj.success = false;
		robj.detail = 'Error getting Contract Delta ('+datain.lastsynceddate+'): '+getErrText(searcherr);
	}
	
	return robj;
}

/**
 * Expects either MM/DD/YYYY HH:MM am/pm OR YYYY-MM-DD HH:MM24
 * THIS Function ASSUMES RESTlet User Preference is set up to below:
 * - Date Format: YYYY-MM-DD
 * - Time Format: HH:MM24
 * @param _val
 */
function validateAndFormatDateTime(_val)
{
	if (!_val)
	{
		return '';
	}
	
	if (_val.indexOf('am') > -1 || _val.indexOf('pm') > -1)
	{
		//This is in MM/DD/YYYY HH:MM am/pm format
		var dateObj = new Date(_val);
		return nlapiDateToString(dateObj, 'datetime');
	}
	
	//otherwise, assume this is passed in as YYYY-MM-DD HH:MM24 format
	return _val;
}

/**
 * Checks to make sure 1). Has value for lastsynceddate parameter and 2)value passed in can be safly converted to NetSuite formatted date object
 * @param datain
 * @returns {___anonymous1700_1738}
 * 
 */
function initValidation(datain)
{
	var valobj = {
		"isvalid":true,
		"detail":""
	};
	
	if (!datain.lastsynceddate)
	{
		valobj.detail = "lastsynceddate in YYYY-MM-DD HH:MM24 format is required.";
		valobj.isvalid = false;
		return valobj;
	}
	
	try 
	{
		//try to convert last sync date into date object
		nlapiStringToDate(datain.lastsynceddate);
	} 
	catch (dateerr)
	{
		valobj.detail = "Unable to convert lastsynceddate into NetSuite proper format: "+getErrText(dateerr);
		valobj.isvalid = false;
		return valobj;
	}
	
	return valobj;
}
