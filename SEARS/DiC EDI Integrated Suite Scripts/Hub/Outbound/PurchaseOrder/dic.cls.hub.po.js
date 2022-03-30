/**
 * Copyright (c) 2016 DiCentral, Inc.
 * 1199 1199 NASA Parkway, Houston, TX 77058, USA
 *
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * DiCentral, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with DiCentral.
 *
 * 

 *
 * Version    Date            Author           Remarks
 * 1.00       01 Nov 2016     Vu Ton	   	   
 *
 */
/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['../../../Hub/dic.cs.hub.config.po',
        '../../../Com/Send2EDI/dic.cls.com.send2edi'
    
        ], DiCEDICLSPO);


function DiCEDICLSPO(diConfigPo,
					 diCLSUtilSend2EDI) {
    var _mod = {
    
    };
    
    	
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
     _mod.pageInit = function(scriptContext) {

    };

    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
     _mod.fieldChanged = function(scriptContext) {

    };

    /**
     * Function to be executed when field is slaved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     *
     * @since 2015.2
     */
    _mod.postSourcing=function(scriptContext) {

    };

    /**
     * Function to be executed after sublist is inserted, removed, or edited.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    _mod.sublistChanged=function(scriptContext) {

    };

    /**
     * Function to be executed after line is selected.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    _mod.lineInit=function(scriptContext) {

    };

    /**
     * Validation function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @returns {boolean} Return true if field is valid
     *
     * @since 2015.2
     */
    _mod.validateField =function(scriptContext) {

    };

    /**
     * Validation function to be executed when sublist line is committed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    _mod.validateLine = function(scriptContext) {

    };

    /**
     * Validation function to be executed when sublist line is inserted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    _mod.validateInsert = function(scriptContext) {

    };

    /**
     * Validation function to be executed when record is deleted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    _mod.validateDelete = function(scriptContext) {

    };

    /**
     * Validation function to be executed when record is saved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @returns {boolean} Return true if record is valid
     *
     * @since 2015.2
     */
    _mod.saveRecord=function(scriptContext) {

    };   
    
    
    _mod.sendERPTransaction = function(options){    	
    	diCLSUtilSend2EDI.send2DICEDI({mode: 'default',
    								   config: diConfigPo    					   
    		 						 });
    	    	    	
    };   
    
    _mod.sendERPTransaction2EDIFullflow = function(){
    	diCLSUtilSend2EDI.send2DICEDI({mode: 'fullflow',
			   config: diConfigPo			   
			 });    	
    };
    
    return {
        pageInit: _mod.pageInit,
        fieldChanged: _mod.fieldChanged,
        postSourcing: _mod.postSourcing,
        sublistChanged: _mod.sublistChanged,
        lineInit: _mod.lineInit,
        validateField: _mod.validateField,
        validateLine: _mod.validateLine,
        validateInsert: _mod.validateInsert,
        validateDelete: _mod.validateDelete,
        saveRecord: _mod.saveRecord,
        sendERPTransaction: _mod.sendERPTransaction,
        sendERPTransaction2EDIFullflow: _mod.sendERPTransaction2EDIFullflow
    };
    
};
