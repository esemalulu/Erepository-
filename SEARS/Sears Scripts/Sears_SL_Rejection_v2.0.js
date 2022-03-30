/**
 * Copyright (c) 1998-2016 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 */

/**
 * Module Description: Rejection Reason
 *
 * Version    Date            Author           Remarks
 * 1.00       01 June 2016     mjpascual	   initial
 */

/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */
define(['N/record', 'N/ui/serverWidget', 'N/runtime', 'N/redirect', './NSUtil', 'N/error'], function(record, serverWidget, runtime, redirect, NSUtil, error) {
	
	/**
	 * Process Rejection Record
	 * @param option
	 * @param stStatusRej
	 */
	function doSetRejectionRecord(option, stStatusRej)
	{
		var stLogTitle = 'suitelet_rejection.doSetRejectionRecord';
		log.debug(stLogTitle, 'Creating the form...');
		
		var stTranId = option.request.parameters.custpage_tranid;
		var stTranType = option.request.parameters.custpage_trantype;
		var stRejectionReason = option.request.parameters.custpage_rejection;
		
		log.debug(stLogTitle, 'stTranId = '+stTranId + ' | stTranType = '+stTranType + ' | stRejectionReason = '+stRejectionReason + ' | stStatusRej = '+stStatusRej);
		
		//Update Status
		var stRecId = record.submitFields({
		    type: stTranType,
		    id: stTranId,
		    values: {
		    	custentity_rejection_reason : stRejectionReason,
		    	custentity_approval_status : stStatusRej
		    },
		    options: {
		        enableSourcing: false,
		        ignoreMandatoryFields : true
		    }
		});
		

		log.debug(stLogTitle, 'updated stRecId = '+stRecId);
		
		//Redirect
		redirect.toRecord({
			type: stTranType,
			id: stTranId
		});
		
		log.debug(stLogTitle, 'Redirected..');
		
	}

	/**
	 * Show Rejection Page
	 * @option
	 */
	function showRejectionPage(option)
	{
		var stLogTitle = 'suitelet_rejection.showRejectionPage';
		log.debug(stLogTitle, 'Creating the form...');
		
		var stTranId = option.request.parameters.custpage_tranid;
		var stTranType = option.request.parameters.custpage_trantype;
		
		//Create Form
		var objForm = serverWidget.createForm({
			title: 'Rejection Reason',
			hideNavBar : true
		});
		
		//Rejection Reason
		var objFldRej = objForm.addField({
			id : 'custpage_rejection',
			type : serverWidget.FieldType.TEXTAREA,
			label : 'Rejection Reason'
		});
		objFldRej.isMandatory = true;
		
		//Action Field
		var objFldAction = objForm.addField({
			id : 'custpage_action',
			type : serverWidget.FieldType.TEXT,
			label : 'Process'
		});
		objFldAction.defaultValue = 'PROCESS';
		objFldAction.updateDisplayType({
			displayType : serverWidget.FieldDisplayType.HIDDEN
		});
		
		//Transaction Id
		var objFldTranId = objForm.addField({
			id : 'custpage_tranid',
			type : serverWidget.FieldType.TEXT,
			label : 'Process'
		});
		objFldTranId.defaultValue = stTranId;
		objFldTranId.updateDisplayType({
			displayType : serverWidget.FieldDisplayType.HIDDEN
		});
		
		//Transaction Tyoe
		var objFldTranType = objForm.addField({
			id : 'custpage_trantype',
			type : serverWidget.FieldType.TEXT,
			label : stTranType
		});
		objFldTranType.defaultValue = stTranType;
		objFldTranType.updateDisplayType({
			displayType : serverWidget.FieldDisplayType.HIDDEN
		});

		//Submit Button
		objForm.addSubmitButton({
			label : 'Reject'
		});
		
		return objForm;
	}
	
	/**
	 * Entry ->  Suitelet
	 * @param option
	 */
	function suitelet_rejection(option)
	{
		var stLogTitle = 'suitelet_rejection';
		log.debug(stLogTitle, '>> Entry Log <<');
		
		//Getters
		var stStatusRej = runtime.getCurrentScript().getParameter('custscript_sears_status_rej');

		if(NSUtil.isEmpty(stStatusRej))
		{
			throw error.create({
				name: 'MISSING_REQ_ARG',
				message: 'Script parameters should not be empty'
			});
		}
		
		try
		{
			//Getters
			var stAction = option.request.parameters.custpage_action;
			
			if (stAction == 'PROCESS')
			{
				doSetRejectionRecord(option, stStatusRej);
			}
			else
			{
				var objForm = showRejectionPage(option);
				option.response.writePage(objForm);
			}

		}
		catch (e)
		{
			if (e.message != undefined)
			{
				log.error('ERROR' , e.name + ' ' + e.message);
				throw e.name + ' ' + e.message;
			}
			else
			{
				log.error('ERROR', 'Unexpected Error' , e.toString()); 
				throw error.create({
					name: '99999',
					message: e.toString()
				});
			}
		}
		finally
		{
			log.debug(stLogTitle, '>> Exit Log <<');
		}

	}

	return{
		onRequest : suitelet_rejection
	};
});
