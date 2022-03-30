/**
 * 
 */

//TEST for FedEx
//Script Level Preference Value
/**
 * var acctPass = '0IrK7Y2v9O6AXRhgDEWnFPI3A'; 
 * var acctKey = 'WEg5wQXMUdV6uN0y';
 * var acctNum = '510087500'; 
 * var acctMeter = '118684135'; 
 * var acctLangCode = 'en'; 
 * var acctIntegratorId = '123'; 
 * var fedExEndPoint = 'https://wsbeta.fedex.com:443/web-services';
 */

//PRODUCTION for FedEx
//Script Level Preference Value
/**
 * Account 121916908 
 * var acctPass = 'mogwGeuQxFIb6ZhKBuYgq8uvz'; 
 * var acctKey = 'D0DVyEP4aPmW5Kc6';
 * var acctNum = '121916908'; 
 * var acctMeter = '108275441'; 
 * 
 * Account 283121712 
 * var acctPass = 'Kk9S8VpIJqELKOtklYxdUwjde'; 
 * var acctKey = '6g32VthFF11BMnxO';
 * var acctNum = '283121712'; 
 * var acctMeter = '108285243'; 
 * 
 * var acctLangCode = 'en'; 
 * var acctIntegratorId = '123'; 
 * var fedExEndPoint = 'https://ws.fedex.com:443/web-services';

 */


var fedexStatusMap={
	'DL':'3', // Delivered
	'IT':'1', // In Transit
	'OC':'19', // Shipment information sent to FedEx
	'AP':'19', // At Pick Up
	'PU':'19', // Picked up
	'AR':'1', // Arrived at FedEx Location
	'FD':'1', // At FedEx destination facility
	'SF':'1', //At Destination Sorting facility
	'DP':'1', //Departed destination facility
	'OD':'1', //On FedEx vehicle for delivery
	'CC':'1', //International released
	'DE':'18', //Delivery Exception
	'SE':'18', //Shipment Exception
	'CD':'2', //Clearnce Delayed
	'CA':'18' //Shipment cancelled by sender
};

function fedExDelStatusChecker()
{
	var paramJson = {
		'acctLangCode':'en',
		'acctPass':nlapiGetContext().getSetting('SCRIPT', 'custscript_367_fedexpass'),
		'acctKey':nlapiGetContext().getSetting('SCRIPT', 'custscript_367_fedexkey'),
		'acctNum':nlapiGetContext().getSetting('SCRIPT', 'custscript_367_fedexnumber'),
		'acctMeter':nlapiGetContext().getSetting('SCRIPT', 'custscript_367_fedexmeter'),
		'acctUkPass':nlapiGetContext().getSetting('SCRIPT', 'custscript_367_ukfedexpass'),
		'acctUkKey':nlapiGetContext().getSetting('SCRIPT', 'custscript_367_ukfedexkey'),
		'acctUkNum':nlapiGetContext().getSetting('SCRIPT', 'custscript_367_ukfedexnumber'),
		'acctUkMeter':nlapiGetContext().getSetting('SCRIPT', 'custscript_367_ukfedexmeter'),
		'acctIntegratorId':nlapiGetContext().getSetting('SCRIPT', 'custscript_367_fedexintid'),
		'fedExEndPoint':nlapiGetContext().getSetting('SCRIPT', 'custscript_367_fedexendpoint'),
	};
	
	// This is not required so grab it separately
	var paramLastProcId = nlapiGetContext().getSetting('SCRIPT', 'custscript_367_lastprocid');
	
	// if any of the parameters are missing, return error
	for (var params in paramJson)
	{
		if (!paramJson[params])
		{
			throw nlapiCreateError('FEDEX-ERR', 'Missing '+params+' as parameter to process FedEx Integration', false);
		}
	}
	
	//Process error
	var errorText = '';
	
	try 
	{
		log('debug','param values',JSON.stringify(paramJson));
		
		var fedexbookflt = [new nlobjSearchFilter('isinactive', null, 'is','F'),
		                    new nlobjSearchFilter('custentity_bo_packtracking_url2', null, 'is','fedex'),
		                    new nlobjSearchFilter('custentity_bo_packtracking', null, 'isnotempty',''),
		                    // 3 = Shipping - Delivered
		                    new nlobjSearchFilter('custentity_bo_packstatus', null, 'noneof',['3'])];
		
		if (paramLastProcId)
		{
			fedexbookflt.push(new nlobjSearchFilter('internalidnumber', null, 'lessthan', paramLastProcId));
		}
		
		var fedexbookcol = [new nlobjSearchColumn('internalid').setSort(true),
		                    new nlobjSearchColumn('entityid'),
		                    new nlobjSearchColumn('altname'),
		                    new nlobjSearchColumn('custentity_bo_packtracking')];
		
		var fedexrs = nlapiSearchRecord('job', null, fedexbookflt, fedexbookcol);
		
		for (var i=0; fedexrs && i < fedexrs.length; i+=1)
		{
			
			var pkgJson = {
				'success':true,
				'errormsg':'',
				'bookingid':fedexrs[i].getValue('internalid'),
				'entityid':fedexrs[i].getValue('entityid'),
				'pkgTrackNum':fedexrs[i].getValue('custentity_bo_packtracking'),
				'pkgFedExCode':'',
				'pkgFedExDesc':'',
				'pkgFedExTimestamp':'',
				'pkgNSCode':''
			};
			
			log('debug','Tracking Number', pkgJson.pkgTrackNum);
			
			try
			{
				var tracSoap = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v6="http://fedex.com/ws/track/v6">'+
				'<soapenv:Header/>'+
				'<soapenv:Body>'+
					'<v6:TrackRequest>'+
						'<v6:WebAuthenticationDetail>'+
							'<v6:UserCredential>'+
								'<v6:Key>'+paramJson.acctKey+'</v6:Key>'+
								'<v6:Password>'+paramJson.acctPass+'</v6:Password>'+
							'</v6:UserCredential>'+
						'</v6:WebAuthenticationDetail>'+
						'<v6:ClientDetail>'+
							'<v6:AccountNumber>'+paramJson.acctNum+'</v6:AccountNumber>'+
							'<v6:MeterNumber>'+paramJson.acctMeter+'</v6:MeterNumber>'+
							//'<v6:IntegratorId>'+paramJson.acctIntegratorId+'</v6:IntegratorId>'+  
							'<v6:Localization>'+
								'<v6:LanguageCode>'+paramJson.acctLangCode+'</v6:LanguageCode>'+  
							'</v6:Localization>'+
						'</v6:ClientDetail>'+  
						'<v6:Version>'+
							'<v6:ServiceId>trck</v6:ServiceId>'+
							'<v6:Major>6</v6:Major>'+
							'<v6:Intermediate>0</v6:Intermediate>'+
							'<v6:Minor>0</v6:Minor>'+
						'</v6:Version>'+  
						'<v6:PackageIdentifier>'+
							'<v6:Value>'+pkgJson.pkgTrackNum+'</v6:Value>'+
							'<v6:Type>TRACKING_NUMBER_OR_DOORTAG</v6:Type>'+
						'</v6:PackageIdentifier>'+
					'</v6:TrackRequest>'+
				'</soapenv:Body>'+
				'</soapenv:Envelope>';
				
				//paramJson.fedExEndPoint
				var fxres = nlapiRequestURL(paramJson.fedExEndPoint, tracSoap);
				
				log('debug','fxres code',fxres.getCode()+' // '+fxres.getBody());
				var resxml = nlapiStringToXML(fxres.getBody());

				//Check to see if Sync Caused an error
				if (nlapiSelectValue(resxml, '//nlapi:TrackReply/nlapi:Notifications/nlapi:Severity')=='ERROR')
				{
					log('debug','Attempting to Look up against UK','Running against UK');
					//If it Failed, Try it with UK Account
					var tracUkSoap = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v6="http://fedex.com/ws/track/v6">'+
					'<soapenv:Header/>'+
					'<soapenv:Body>'+
						'<v6:TrackRequest>'+
							'<v6:WebAuthenticationDetail>'+
								'<v6:UserCredential>'+
									'<v6:Key>'+paramJson.acctUkKey+'</v6:Key>'+
									'<v6:Password>'+paramJson.acctUkPass+'</v6:Password>'+
								'</v6:UserCredential>'+
							'</v6:WebAuthenticationDetail>'+
							'<v6:ClientDetail>'+
								'<v6:AccountNumber>'+paramJson.acctUkNum+'</v6:AccountNumber>'+
								'<v6:MeterNumber>'+paramJson.acctUkMeter+'</v6:MeterNumber>'+
								'<v6:IntegratorId>'+paramJson.acctIntegratorId+'</v6:IntegratorId>'+  
								'<v6:Localization>'+
									'<v6:LanguageCode>'+paramJson.acctLangCode+'</v6:LanguageCode>'+  
								'</v6:Localization>'+
							'</v6:ClientDetail>'+  
							'<v6:Version>'+
								'<v6:ServiceId>trck</v6:ServiceId>'+
								'<v6:Major>6</v6:Major>'+
								'<v6:Intermediate>0</v6:Intermediate>'+
								'<v6:Minor>0</v6:Minor>'+
							'</v6:Version>'+  
							'<v6:PackageIdentifier>'+
								'<v6:Value>'+pkgJson.pkgTrackNum+'</v6:Value>'+
								'<v6:Type>TRACKING_NUMBER_OR_DOORTAG</v6:Type>'+
							'</v6:PackageIdentifier>'+
						'</v6:TrackRequest>'+
					'</soapenv:Body>'+
					'</soapenv:Envelope>';
					
					log('debug','tracUkSoap',tracUkSoap);
					
					var fxukres = nlapiRequestURL(paramJson.fedExEndPoint, tracUkSoap);

					var resukxml = nlapiStringToXML(fxukres.getBody());

										log('debug','UK Look up Status Code',pkgJson.pkgFedExCode);
					
					//Check to see if Sync Caused an error
					if (nlapiSelectValue(resukxml, '//nlapi:TrackReply/nlapi:Notifications/nlapi:Severity')=='ERROR')
					{
						//If it Failed, Try it with UK Account
						pkgJson.pkgNSCode = '18';
						pkgJson.errormsg = 'UK Lookup Failed: '+nlapiSelectValue(resukxml, '//nlapi:TrackReply/nlapi:Notifications/nlapi:Message');
						pkgJson.success = false;
					}
					else
					{
						pkgJson.pkgFedExCode = nlapiSelectValue(resukxml, '//nlapi:StatusCode');
						pkgJson.pkgFedExDesc = nlapiSelectValue(resukxml, '//nlapi:StatusDescription');
						pkgJson.pkgFedExTimestamp = nlapiSelectValue(resukxml, '//nlapi:Events/nlapi:Timestamp');
						pkgJson.pkgNSCode = fedexStatusMap[pkgJson.pkgFedExCode];
					}
				}
				else
				{
					pkgJson.pkgFedExCode = nlapiSelectValue(resxml, '//nlapi:StatusCode');
					pkgJson.pkgFedExDesc = nlapiSelectValue(resxml, '//nlapi:StatusDescription');
					pkgJson.pkgFedExTimestamp = nlapiSelectValue(resxml, '//nlapi:Events/nlapi:Timestamp');
					pkgJson.pkgNSCode = fedexStatusMap[pkgJson.pkgFedExCode];

				}
				
			}
			catch (chkerr)
			{
				pkgJson.success = false;
				pkgJson.errormsg = getErrText(chkerr);
				pkgJson.pkgNSCode = '18';
				log('error','Error','Error processing booking id '+pkgJson.bookingid+' // '+getErrText(chkerr));
				
				errorText += '<li>'+
							 pkgJson.entityid+' ('+
							 pkgJson.bookingid+') Tracking #: '+pkgJson.pkgTrackNum+':<br/>'+
							 pkgJson.errormsg+
							 '</li>';
			}
			
			//Update the 
			var updfld = ['custentity_bo_packstatus',
			              'custentity_bo_packdeliverydate',
			              'custentity_bo_packdeliverydetails'];
			var delDate = '';
			var delDetail = 'FedEx Sync Status \n'+
						    'Code/Description: '+pkgJson.pkgFedExCode+'/'+pkgJson.pkgFedExDesc+'\n'+
						    'Event Timestamp: '+pkgJson.pkgFedExTimestamp;
			
			if (!pkgJson.success)
			{
				delDetail += '\n'+
							 'Sync Error: '+pkgJson.errormsg;
			}
			
			if (pkgJson.pkgFedExCode=='DL' && pkgJson.pkgFedExTimestamp)
			{
				var strDelDate = pkgJson.pkgFedExTimestamp.split('T')[0];
				//Fedex format is in 2015-08-10
				var arStrDelDate = strDelDate.split('-');
				delDate = nlapiDateToString(new Date(arStrDelDate[1]+'/'+arStrDelDate[2]+'/'+arStrDelDate[0]));
			}
			
			log('debug','delDate',delDate);
			
			var updval = [pkgJson.pkgNSCode,
			              delDate,
			              delDetail];
			
			nlapiSubmitField('job', pkgJson.bookingid, updfld, updval, false);
			
			log('debug','pkgJson',JSON.stringify(pkgJson));
			
			
			//Set % completed of script processing
			var pctCompleted = Math.round(((i+1) / fedexrs.length) * 100);
			nlapiGetContext().setPercentComplete(pctCompleted);
			
			if ((i+1)==1000 || ((i+1) < fedexrs.length && nlapiGetContext().getRemainingUsage() < 100)) 
			{
				//reschedule
				log('debug','Getting Rescheduled at', pkgJson.bookingid);
				var rparam = new Object();
				rparam['custscript_367_lastprocid'] = pkgJson.bookingid;
				nlapiScheduleScript(nlapiGetContext().getScriptId(), nlapiGetContext().getDeploymentId(), rparam);
				break;
			}	
			
		}
		
	}
	catch (procerr)
	{
		log('error','FedEx Process Error','Process Date: '+nlapiDateToString(new Date())+' // '+getErrText(procerr));
		
		errorText += '<li>Unexpected Error: '+getErrText(procerr)+'</li>';
		
	}
	
	//Generate Email
	if (errorText)
	{
		errorText = '<ul>'+errorText+'</ul>';
		
		nlapiSendEmail(-5,'mindgym@audaxium.com','FedEx Status Sync Error',errorText);
	}
}


/**
 * Module Description
 * 
 * Version Date Author Remarks 1.00 13 Aug 2015 CodeBoxLLC-1
 * 
 */

/**
 * @param {nlobjRequest}
 *            req Request object
 * @param {nlobjResponse}
 *            res Response object
 * @returns {Void} Any output is written via response object
 */
function deliveryIntegrationTester(req, res){

	var nsform = nlapiCreateForm('FedEx Delivery Integration Tester', false);
	
	nsform.addFieldGroup('custpage_grpa', 'Tracking Option', null);
	var trackNumFld = nsform.addField('custpage_trackingnumber', 'text', 'Tracking #: ', null, 'custpage_grpa');
	trackNumFld.setBreakType('startcol');
	trackNumFld.setMandatory(true);
	
	nsform.addSubmitButton('Lookup Info');
	
	// ------------ Display ------
	nsform.addFieldGroup('custpage_grpb', 'Ping Result', null);
	
	var rsxmlfld = nsform.addField('custpage_rsxml','textarea','XML', null, 'custpage_grpb');
	rsxmlfld.setBreakType('startcol');
	
	var rsfld = nsform.addField('custpage_rslt', 'inlinehtml', 'Result', null, 'custpage_grpb');
	rsfld.setBreakType('startcol');
	
	if (req.getMethod() == 'POST')
	{
		var restext = '';
		
		if (!req.getParameter('custpage_trackingnumber'))
		{
			restext = 'Must provide Tracking Number';
		}
		else
		{
			trackNumFld.setDefaultValue(req.getParameter('custpage_trackingnumber'));
						
			var pkgTrackNum = req.getParameter('custpage_trackingnumber');
			
			var paramJson = {
					'acctLangCode':'en',
					'acctPass':nlapiGetContext().getSetting('SCRIPT', 'custscript_367_fedexpass'),
					'acctKey':nlapiGetContext().getSetting('SCRIPT', 'custscript_367_fedexkey'),
					'acctNum':nlapiGetContext().getSetting('SCRIPT', 'custscript_367_fedexnumber'),
					'acctMeter':nlapiGetContext().getSetting('SCRIPT', 'custscript_367_fedexmeter'),
					'acctIntegratorId':nlapiGetContext().getSetting('SCRIPT', 'custscript_367_fedexintid'),
					'fedExEndPoint':nlapiGetContext().getSetting('SCRIPT', 'custscript_367_fedexendpoint'),
			};
			
			
			var tracSoap = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v6="http://fedex.com/ws/track/v6">'+
							'<soapenv:Header/>'+
							'<soapenv:Body>'+
								'<v6:TrackRequest>'+
									'<v6:WebAuthenticationDetail>'+
										'<v6:UserCredential>'+
											'<v6:Key>'+paramJson.acctKey+'</v6:Key>'+
											'<v6:Password>'+paramJson.acctPass+'</v6:Password>'+
										'</v6:UserCredential>'+
									'</v6:WebAuthenticationDetail>'+
									'<v6:ClientDetail>'+
										'<v6:AccountNumber>'+paramJson.acctNum+'</v6:AccountNumber>'+
										'<v6:MeterNumber>'+paramJson.acctMeter+'</v6:MeterNumber>'+
										'<v6:IntegratorId>'+paramJson.acctIntegratorId+'</v6:IntegratorId>'+  
										'<v6:Localization>'+
											'<v6:LanguageCode>'+paramJson.acctLangCode+'</v6:LanguageCode>'+  
										'</v6:Localization>'+
									'</v6:ClientDetail>'+  
									'<v6:Version>'+
										'<v6:ServiceId>trck</v6:ServiceId>'+
										'<v6:Major>6</v6:Major>'+
										'<v6:Intermediate>0</v6:Intermediate>'+
										'<v6:Minor>0</v6:Minor>'+
									'</v6:Version>'+  
									'<v6:PackageIdentifier>'+
										'<v6:Value>'+pkgTrackNum+'</v6:Value>'+
										'<v6:Type>TRACKING_NUMBER_OR_DOORTAG</v6:Type>'+
									'</v6:PackageIdentifier>'+
								'</v6:TrackRequest>'+
							'</soapenv:Body>'+
						'</soapenv:Envelope>';

			var fxres = nlapiRequestURL(paramJson.fedExEndPoint, tracSoap);
			
			
			rsxmlfld.setDefaultValue(fxres.getBody());
			
			var resxml = nlapiStringToXML(fxres.getBody());
			
			restext =  '<div style="font-size: 14px">'+
					   'Track Reply Code: '+nlapiSelectValue(resxml, '//v6:TrackReply/v6:Notifications/v6:Severity')+
					   '<br/><br/>'+
					   'Track Reply Message: '+nlapiSelectValue(resxml, '//v6:TrackReply/v6:Notifications/v6:Message')+
					   '<br/><br/>'+
					   'Status Code: '+nlapiSelectValue(resxml, '//v6:StatusCode')+
					   '<br/><br/>'+
					   'Status Desc: '+nlapiSelectValue(resxml, '//v6:StatusDescription')+
					   '<br/><br/>'+
					   'Event Time: '+nlapiSelectValue(resxml, '//v6:Events/v6:Timestamp')+
					   '<br/><br/>'+
					   'Event Desc: '+nlapiSelectValue(resxml, '//v6:Events/v6:EventDescription')+
					   '</div>';
		}
		
		// show result
		rsfld.setDefaultValue(restext);
	}
	
	res.writePage(nsform);
}
