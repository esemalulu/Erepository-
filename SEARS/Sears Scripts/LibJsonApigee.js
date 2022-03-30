/**
  * @NModuleScope Public
 * @NApiVersion 2.x
 */

define(['./NSUtil', 'N/format', './oauthv2', 'N/https', 'N/file'],
/**
 * @param {Object} nsutil
 * @param {record} nrecord
 * @param {search} nsearch
 * @param {runtime} nruntime
 * @param {format} nformat
 * @param {runtime} nruntime
 */
function(nsutil, nformat, nsauth, https, file)
{
	
	var OBJ_API_APIGEE_REQ = {};
	var INT_SUCCESS = '200';
	
	var OBJ_REC_TYPE = 
	{
		'salesorder' : 'S',
		'creditmemo' : 'R',
		'cashrefund' : 'R',
		'returnauthorization' : 'R'
	}
	
	/**
	 * Send Request to Apigee
	 * @param objReq
	 * @param stAPI
	 * @param stLoyaltyId
	 * @returns objResponse
	 */
	OBJ_API_APIGEE_REQ.sendObjToURL = function(objReq, stAPI, stLoyaltyId, bSharedToken)
	{
		
		var stLogTitle = 'sendObjToURL';

		var stURL = 'https://initium-commerce-dev.apigee.net/loyalty-api/';
		if(!nsutil.isEmpty(stAPI))
		{
			stURL += stAPI;
		}

		log.debug(stLogTitle, 'stURL =' + stURL);
		log.debug(stLogTitle, 'objReq =' + JSON.stringify(objReq));
		
		var stMethod = "POST";
			
		var objHeaders = 
		{
			'Content-Type': 'application/json',
			'X-AUTH-HOST' : 'http://initium-commerce-dev.apigee.net',
			'X-AUTH-KEY' : 'ea92617729ec35583e82eb064c7ed40d4ae85ffd',
			'X-Identifier-Type' : 'LOYALTY_ID',
			'X-AUTH-USER' : stLoyaltyId,
			'Accept' : 'application/json'
		};
		
		if (bSharedToken)
		{
			objHeaders['X-Shared-Token'] = 'dev-shared-token';
		}
		
		log.debug(stLogTitle, 'objHeaders =' + JSON.stringify(objHeaders));

		
		var objResponse = https.request({
			method: stMethod,
			url: stURL,
			body: JSON.stringify(objReq),
			headers: objHeaders
		});
        
		log.debug(stLogTitle, 'objResponse =' + JSON.stringify(objResponse));

		return objResponse;
	
	}
	
	/**
	 * Return the current balance and redemabale balance for the requested user.
	 * @param stLoyaltyId
	 * @param stCCV
	 * @returns objResponse
	 */
	OBJ_API_APIGEE_REQ.getBalance = function(stLoyaltyId, stCCV)
	{
		var stAPI = 'balance';
		var objReq = {
			'verificationCode': stCCV
		} 

		var objResponse = this.sendObjToURL(objReq, stAPI, stLoyaltyId);

		return objResponse;
	
	}
	
	/**
	 * Immediately withdraw the requested points from the users account.
	 * @param stLoyaltyId
	 * @param stCCV
	 * @param stAmt
	 * @returns objResponse
	 */
	OBJ_API_APIGEE_REQ.burnPts = function(stLoyaltyId, stCCV, stAmt)
	{
		var stAPI = 'redemptions';
		var objReq = {
			'verificationCode': stCCV,
			'amount' : stAmt
		} 

		var objResponse = this.sendObjToURL(objReq, stAPI, stLoyaltyId);
		return objResponse;
		
	}

	/**
	 * Submit this activity on behalf of the identified user to calculate any benefit configured. 
	 * Benefit will be immediately available in the customer’s account upon successful execution.
	 * @param stLoyaltyId
	 * @param arrObjSalesLineItems
	 * @returns objResponse
	 */
	OBJ_API_APIGEE_REQ.earnPts = function(stLoyaltyId, arrObjSalesLineItems, stEventId)
	{
		var stLogTitle = 'earnPts';
	
		var stAPI = 'activities';
		var dNow = new Date();
		var stTimeStamp = dNow.getTime().toString();
		var stWhenPerformed = dNow.toISOString();
		var stCart = JSON.stringify({"saleLineItems" : arrObjSalesLineItems});
		
		log.debug(stLogTitle, 'dNow' + dNow + ' | stTimeStamp' + stTimeStamp + ' | stWhenPerformed' + stWhenPerformed + ' | stCart' + stCart );

		var objReq = {
				"action": "PURCHASE", 
				"channel": "FEED", 
				"eventId": stEventId, 
				"additionalData": [
				    { "name": "when_performed", "value": stWhenPerformed},
				    { "name": "location", "value": "Sears.ca"},
				    { "name": "searsChannel", "value": "Store" },
				    { "name": "json:cart", "value": stCart}
				]
		}

		var objResponse = this.sendObjToURL(objReq, stAPI, stLoyaltyId);
		return objResponse;
	}
	
	
	/**
	 * Reverse a previously applied transaction. 
	 * Rollback a previously applied Record Activity transaction. 
	 * This will create offsetting transactions to reverse previously applied points and create appropriate audit information. 
	 * This is a complete rollThe transaction id is from a previously successful redemption call.
	 * @param stTransactionId
	 * @param stLoyaltyId
	 * @returns objResponse
	 */
	OBJ_API_APIGEE_REQ.rollback = function(stLoyaltyId, stEventId)
	{
		var stLogTitle = 'reversePts';
	
		var stAPI = 'rollback';
		
		log.debug(stLogTitle, 'stEventId' + stEventId);
		
		var objReq = {
			'eventId': stEventId,
		} 

		var objResponse = this.sendObjToURL(objReq, stAPI, stLoyaltyId, false);
		return objResponse;
	}

	/**
	 * Reverse a previously applied transaction. 
	 * This will create an offsetting transaction and appropriate audit information. 
	 * The transaction id is from a previously successful redemption call.
	 * @param stTransactionId
	 * @param stLoyaltyId
	 * @returns objResponse
	 */
	OBJ_API_APIGEE_REQ.reversePts = function(stLoyaltyId, stTransactionId)
	{
		var stLogTitle = 'reversePts';
	
		var stAPI = 'reversals';
		
		log.debug(stLogTitle, 'stTransactionId' + stTransactionId);
		
		var objReq = {
			'transactionId': stTransactionId,
		} 

		var objResponse = this.sendObjToURL(objReq, stAPI, stLoyaltyId, true);
		return objResponse;
	}
	
	/**
	 * File Format to Reverse Earned Points
	 * @param objHeader
	 * @param objTrailer
	 * @returns objBodyOrder
	 * @returns arrObjBody
	 */
	OBJ_API_APIGEE_REQ.generateFile = function(objHeader, objTrailer, objBodyOrder, arrObjBody)
	{
		var stLogTitle = 'generateFile';
	
		var stContent = '';
		
		//Header
		stContent += 'H'; 
		stContent += 'SEARSCAT '; 
		stContent += 'ESI ';
		stContent += nsutil.addLeadingChar(objHeader['ESI-CURR-SEQ'], 4, '0');
		stContent += nsutil.addLeadingChar(objHeader['ESI-PREV-SEQ'], 4, '0');
		stContent += 'NETSUITE';
		stContent += nsutil.addLeadingChar(objHeader['ESI-PROC-DT'], 10, ' ');
		stContent += '\n';
		
		//Trailer
		stContent += 'T'; 
		stContent += 'SEARSCAT '; 
		stContent += 'ESI ';
		stContent += nsutil.addLeadingChar(objTrailer['ESI-CURR-SEQ'], 4, '0');
		stContent += nsutil.addLeadingChar(objTrailer['ESI-PREV-SEQ'], 4, '0');
		stContent += 'NETSUITE';
		stContent += nsutil.addLeadingChar(objTrailer['ESI-PROC-DT'], 10, ' ');
		stContent += nsutil.addLeadingChar(objTrailer['ESI-REC-CNT'], 8, ' ');
		stContent += '\n';
		
		//Order Line
		stContent += 'O';
		stContent += objBodyOrder['TRANS-TYPE'];
		stContent += nsutil.addLeadingChar(objBodyOrder['ORD-CUS-NO'], 9, '0');
		stContent += nsutil.addLeadingChar(objBodyOrder['SLS-NO'], 2, '0');
		stContent += nsutil.addLeadingChar(objBodyOrder['LYTY-NO'], 18, ' ');
		stContent += nsutil.addLeadingChar(objBodyOrder['CUS-ID-NO'], 10, ' ');
		stContent += nsutil.addLeadingChar(objBodyOrder['ORD-OTH-SYS-NO'], 5, ' ');
		stContent += nsutil.addLeadingChar(objBodyOrder['SH-EXD-DT'], 10, ' ');
		stContent += objBodyOrder['PY-CUS-ORD-CD'];
		stContent += objBodyOrder['CRA_TYP_CD'];
		stContent += objBodyOrder['SH-MET-CD'];
		stContent += objBodyOrder['ORD-GFT-FL'];
		stContent += nsutil.addLeadingChar(objBodyOrder['CUT-ITM-NO'], 2, ' ');
		stContent += nsutil.addLeadingChar(objBodyOrder['SRC-SL-CD'], 2, '0');
		stContent += '\n';
		
		//Loop Lines
		for(var intLine in arrObjBody)
		{
			var objBodyItem = arrObjBody[intLine];
			stContent += 'I';
			stContent += objBodyItem['TRANS-TYPE'];
			stContent += nsutil.addLeadingChar(objBodyItem['ORD-CUS-NO'], 9, '0');
			stContent += nsutil.addLeadingChar(objBodyItem['SLS-NO'], 2, '0');
			stContent += nsutil.addLeadingChar(objBodyItem['DP-CD'], 3, '0');
			stContent += nsutil.addLeadingChar(objBodyItem['ITM-NO'], 5, '0');
			stContent += nsutil.addLeadingChar(objBodyItem['ITM-DS'], 15, ' ');
			stContent += nsutil.addLeadingChar(objBodyItem['ITM-QT'], 2, ' ');
			stContent += nsutil.addLeadingChar(objBodyItem['ORD-LN-OTH-SYS-NO'], 5, ' ');
			stContent += nsutil.addLeadingChar(objBodyItem['SKU-CD'], 3, ' ');
			stContent += nsutil.addLeadingChar(objBodyItem['MED-CD'], 3, ' ');
			stContent += nsutil.addLeadingChar(objBodyItem['SLL-ITM-AM'], 9, ' ');
			stContent += nsutil.addLeadingChar(objBodyItem['DNT-APY-AM'], 9, ' ');
			stContent += nsutil.addLeadingChar(objBodyItem['CRG-TRP-AM'], 9, ' ');
			stContent += nsutil.addLeadingChar(objBodyItem['CRG-HDL-AM'], 9, ' ');
			stContent += nsutil.addLeadingChar(objBodyItem['CRG-DVR-AM'], 9, ' ');
			stContent += '\n';
		}
		 
		return stContent;
	}
	
	
	/**
	 * Reverse Earned Points
	 * @param stParamFolderId
	 * @param recOld
	 * @param stType
	 * @param stId
	 * @param stLoyaltyId
	 */
	OBJ_API_APIGEE_REQ.reverseEarnedPoints = function(stParamFolderId, recOld, stType, stId, stLoyaltyId)
	{
		var stLogTitle = 'reverseEarnedPoints';
		
		//Initialize
		var objHeader = {};
		var objTrailer = {};
		var objBodyOrder = {};
		var arrObjBody = [];
		var flTotalQty = 0;

		var stCustomer = recOld.getValue('entity');
		
		var intItemLenOld = recOld.getLineCount('item');
		
		var dToday = new Date();
		dToday.setHours(0, 0, 0, 0, 0);
		var stToday = dToday.getUTCFullYear() + '-' + dToday.getUTCMonth() + 1 + "-" + dToday.getUTCDate();
		log.debug(stLogTitle, 'stToday =' +stToday);
		
		//Body Item
		for (var intCtrOld = 0; intCtrOld < intItemLenOld; intCtrOld++)
		{
			var stItem = recOld.getSublistValue({
				sublistId: 'item',
				fieldId: 'item',
				line: intCtrOld
			});
			
			var stItemDesc = recOld.getSublistValue({
				sublistId: 'item',
				fieldId: 'description',
				line: intCtrOld
			});
			
			var stQty = recOld.getSublistValue({
				sublistId: 'item',
				fieldId: 'quantity',
				line: intCtrOld
			});
			
			var stAmt = recOld.getSublistValue({
				sublistId: 'item',
				fieldId: 'amount',
				line: intCtrOld
			});
			
			var stSKU = recOld.getSublistValue({
				sublistId: 'item',
				fieldId: 'custcol_sku_srcd',
				line: intCtrOld
			});
			
			flTotalQty += nsutil.forceFloat(stQty);
			
			objBodyItem = {};
			objBodyItem['TRANS-TYPE']  = OBJ_REC_TYPE[stType];
			objBodyItem['ORD-CUS-NO']  = stId;
			objBodyItem['SLS-NO']  = intCtrOld+1;
			objBodyItem['DP-CD']  = '';
			objBodyItem['ITM-NO']  = stItem;
			objBodyItem['ITM-DS']  = stItemDesc.substring(0, 15);
			objBodyItem['ITM-QT']  = stQty;
			objBodyItem['ORD-LN-OTH-SYS-NO']  = '';
			objBodyItem['SKU-CD']  = stSKU;
			objBodyItem['MED-CD']  = '';
			objBodyItem['SLL-ITM-AM']  = stAmt;
			objBodyItem['DNT-APY-AM']  = '';
			objBodyItem['CRG-HDL-AM']  = '';
			objBodyItem['CRG-TRP-AM']  = '';
			objBodyItem['CRG-DVR-AM']  = '';

			arrObjBody.push(objBodyItem);
		}
		
		//Header
		objHeader['ESI-CURR-SEQ']  = intItemLenOld;
		objHeader['ESI-PREV-SEQ']  = 0;
		objHeader['ESI-PROC-DT']  = stToday;
		
		//Trailing
		objTrailer['ESI-CURR-SEQ']  = intItemLenOld;
		objTrailer['ESI-PREV-SEQ']  = 0;
		objTrailer['ESI-PROC-DT']  = stToday;
		objTrailer['ESI-REC-CNT']  = intItemLenOld;
		
		//Body Order
		objBodyOrder['TRANS-TYPE'] = OBJ_REC_TYPE[stType];
		objBodyOrder['ORD-CUS-NO']  = stId;
		objBodyOrder['SLS-NO']  = intItemLenOld;
		objBodyOrder['LYTY-NO']  = stLoyaltyId;
		objBodyOrder['CUS-ID-NO']  = stCustomer;
		objBodyOrder['ORD-OTH-SYS-NO']  = '';
		objBodyOrder['SH-EXD-DT']  = '';
		objBodyOrder['PY-CUS-ORD-CD']  = '8';
		objBodyOrder['CRA_TYP_CD']  = '';
		objBodyOrder['SH-MET-CD']  = '1';
		objBodyOrder['ORD-GFT-FL']  = 'N';
		objBodyOrder['CUT-ITM-NO']  = flTotalQty;
		objBodyOrder['SRC-SL-CD']  = '1';
		
		log.debug(stLogTitle, 'objHeader ='+JSON.stringify(objHeader));
		log.debug(stLogTitle, 'objTrailer ='+JSON.stringify(objTrailer));
		log.debug(stLogTitle, 'objBodyOrder ='+JSON.stringify(objBodyOrder));
		log.debug(stLogTitle, 'arrObjBody ='+JSON.stringify(arrObjBody));
		
		var stContent = this.generateFile(objHeader, objTrailer, objBodyOrder, arrObjBody);
		
		var dNow = new Date();
		var stTimeStamp = dNow.getTime().toString();
		
		if(stType == 'creditmemo' || stType == 'cashrefund')
		{
			stId = recOld.getValue('createdfrom');
		}
		
		var objFile = file.create({
			name: stId+'_'+stTimeStamp+'.txt',
			fileType: file.Type.PLAINTEXT,
			contents: stContent
		});
		
		objFile.folder = stParamFolderId;
		var stFileId = objFile.save();
		
		log.debug(stLogTitle, 'Created stFileId = ' +stFileId);
	}
	
	return OBJ_API_APIGEE_REQ;
});