/**
 * 2019 IT Rationale Inc. User may not copy, modify, distribute, or re-bundle or
 * otherwise make available this code
 *
 * This software is the confidential and proprietary information of ITRationale,
 * Inc. ("Confidential Information"). You shall not disclose such Confidential
 * Information and shall use it only in accordance with the terms of the license
 * agreement you entered into with ITRationale Inc.
 *
 *  Version    Date            	Author           Remarks
 * 	1.00       12 Oct 2019      Raffy Gaspay    Initial version. This suitelet will send an email to the customer contacts.
 *
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/log','N/file','N/email','N/redirect','N/render','N/url','N/record','N/search','N/runtime','N/format','./itr_ifd_lib_common.js'],
	function(log,file,email,redirect,render,url,record,search,runtime,format,common) {

		/**
		 * Definition of the Suitelet script trigger point.
		 *
		 * @param {Object} context
		 * @param {ServerRequest} context.request - Encapsulation of the incoming request
		 * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
		 * @Since 2015.2
		 */
		function onRequest(context) {
			var DEBUG_IDENTIFIER = 'onRequest';

			var request = context.request;
			var response = context.response;

			var recType = request.parameters.recType;
			var recId = parseInt(request.parameters.recId);
			try {
				log.debug(DEBUG_IDENTIFIER,'Record Type: ' + recType);
				log.debug(DEBUG_IDENTIFIER,'Record Id: ' + recId);

				var invEmailTemplate = common.getScriptParameter('custscript_sl_inv_email_template');
				var cmEmailTemplate = common.getScriptParameter('custscript_sl_cm_email_template');
				var poEmailTemplate = common.getScriptParameter('custscript_sl_po_email_template');
				var raEmailTemplate = common.getScriptParameter('custscript_sl_ra_email_template');
				var vcEmailTemplate = common.getScriptParameter('custscript_sl_vc_email_template');
				var authorInvCM = common.getScriptParameter('custscript_sl_author');
				var authorVC = common.getScriptParameter('custscript_sl_authorvc');
				var authorRA = common.getScriptParameter('custscript_sl_authorra');
				var emailAttachmentSearch = common.getScriptParameter('custscript_ifd_email_attachments_search');

				var VENDOR_CUSTOMER = common.getScriptParameter('custscript_sl_vend_customer');

				var EMAIL_TEMPLATE = '';
				var ENTITY_TYPE = '';
				var AUTHOR = '';

				switch (recType) {

					case 'invoice' :
						EMAIL_TEMPLATE = invEmailTemplate;
						ENTITY_TYPE = 'customer';
						AUTHOR = authorInvCM;

						break;

					case 'creditmemo' :
						EMAIL_TEMPLATE = cmEmailTemplate;
						ENTITY_TYPE = 'customer';
						AUTHOR = authorInvCM;
						break;

					case 'purchaseorder' :
						EMAIL_TEMPLATE = poEmailTemplate;
						ENTITY_TYPE = 'vendor';
						var userObj = runtime.getCurrentUser();

						var senderId = userObj.id;
						log.debug(DEBUG_IDENTIFIER,'Current User: ' + senderId);
						AUTHOR = senderId;
						break;

					case 'returnauthorization' :
						EMAIL_TEMPLATE = raEmailTemplate;
						ENTITY_TYPE = 'customer';
						AUTHOR = authorRA;
						break;

					case 'vendorcredit' :
						EMAIL_TEMPLATE = vcEmailTemplate;
						ENTITY_TYPE = 'vendor';
						AUTHOR = authorVC;
						break;

				}

				var objTranRec = record.load({
					type: recType,
					id: recId
				});

				var customFormId = objTranRec.getValue('customform');
				var strEmails = objTranRec.getValue('email');


				if (common.isNullOrEmpty(strEmails)){
					strEmails = objTranRec.getValue('custbody_itr_ifd_vb_vc_email');
				}
				var entityId = objTranRec.getValue('entity');

				var objCustRec = record.load({
					type: ENTITY_TYPE,
					id: entityId
				});

				var DSR = [];
				var salesRep = objCustRec.getValue('salesrep');
				var custCategory = objCustRec.getValue('category');

				if (VENDOR_CUSTOMER == custCategory){
					AUTHOR = authorVC;
				}

				if (!common.isNullOrEmpty(salesRep)){
					var salesRepEmail = search.lookupFields({
						type: search.Type.EMPLOYEE,
						id: salesRep,
						columns: 'email'
					}).email;

					if (!common.isNullOrEmpty(salesRepEmail)){
						DSR.push(salesRep);
					}
				}

				var emailTemp = render.mergeEmail({
					templateId: EMAIL_TEMPLATE,
					entity: null ,
					recipient: null,
					supportCaseId: null,
					transactionId: recId,
					customRecord: null
				});

				var subject = emailTemp.subject ;//+ ' ' +tranNumber ;
				var body = emailTemp.body;

				var tranPDF = [];

				var renderedPDF = render.transaction({
					entityId: recId,
					printMode: render.PrintMode.PDF,
					formId : parseInt(customFormId),
					inCustLocale: true
				});

				tranPDF.push(renderedPDF);

				var transactionAttachments = common.getTransactionAttachments(recId, emailAttachmentSearch);
				if (transactionAttachments && transactionAttachments.length > 0) {
					tranPDF = tranPDF.concat(transactionAttachments);
				}

				var emailParameters = {
					author: AUTHOR,
					recipients: strEmails,
					cc: (DSR.length > 0) ? DSR : null,
					subject: subject,
					body: body,
					attachments: tranPDF,
					relatedRecords: {
						entityId: entityId,
						transactionId : recId
					}
				};

				log.debug(DEBUG_IDENTIFIER,'Email Parameters : ' + JSON.stringify(emailParameters));
				email.send(emailParameters);

				log.debug(DEBUG_IDENTIFIER,'Email has been sent');

			}
			catch(ex) {
				var errorStr = 'Type: ' + ex.type + ' | ' +
					'Name: ' + ex.name +' | ' +
					'Error Message: ' + ex.message;
				log.audit('ERROR', 'error on ' + DEBUG_IDENTIFIER + ' function : ' + errorStr);
			}

			redirect.toRecord({
				type : recType,
				id : recId,
				isEditMode: false
			});
		}

		return {
			onRequest: onRequest
		};

	});