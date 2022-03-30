/**
 * Copyright (c) 2020
 * AppWrap Inc
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of AppWrap Inc. ("Confidential Information").
 * You shall not disclose such Confidential Information and shall use it only in accordance with the terms of the
 * license agreement you entered into with AppWrap Inc.
 *
 * Script Name: AppWrap | UE Auto Approve Allocation JE
 *
 * Script Description:
 * This script checks if the created JE is from an Allocation Schedule.  If it is, set status to Approved.
 *
 *     |---------------------------------------------------------------------------------------------------------------------------------------|
 *     | Author                      | Date          | Version       | Comments                                                                |
 *     |-----------------------------|---------------|---------------|-------------------------------------------------------------------------|
 *     | Gerrom V. Infante           | Apr 04 2020   | 1.0           | Initial Version                                                         |
 *     |---------------------------------------------------------------------------------------------------------------------------------------|
 *
 * Deployed:
 *
 *     |------------------------------|
 *     | Record        | Id           |
 *     |---------------|--------------|
 *     | Journal Entry | journalentry |
 *     |------------------------------|
 *
 * Script Parameters
 *
 *     |-----------------------------------------------------------------------------------------------------------------------------------|
 *     | ID                          | Type               | Description                                                                    |
 *     |-----------------------------|--------------------|--------------------------------------------------------------------------------|
 *     |                             |                    |                                                                                |
 *     |-----------------------------------------------------------------------------------------------------------------------------------|
 *
 */
define(["N/record"], function(NsRecord) {
  /**
   * Module Description...
   *
   * @exports XXX
   *
   *
   * @NApiVersion 2.x
   * @NModuleScope SameAccount
   * @NScriptType UserEventScript
   */
  var exports = {};

  /**
   * <code>afterSubmit</code> event handler
   *
   * @governance XXX
   *
   * @param context
   * 		{Object}
   *
   * @param context.newRecord
   * 		{record} The new record being submitted
   * @param context.oldRecord
   * 		{record} The old record before it was modified
   * @param context.type
   * 		{UserEventType} The action type that triggered this event
   *
   * @return {void}
   *
   * @static
   * @function afterSubmit
   */
  function afterSubmit(context) {
    log.audit({
      title: "afterSubmit",
      details:
        "==================== AFTER SUBMIT EVENT START ===================="
    });

    // exit if record is being deleted
		if (context.type === "delete") {
			return true;
		}

    // load the record
    var JournalEntry = NsRecord.load({
      type: NsRecord.Type.JOURNAL_ENTRY,
      id: context.newRecord.id
    });

    // check if there is a value in the "Created From Allocation" field
    var FromAllocation = JournalEntry.getValue({
      fieldId: "parentexpensealloc"
    });
    log.debug({
      title: "beforeSubmit",
      details: ["FromAllocation:", FromAllocation].join("")
    });

    // if field is empty do nothing
    if (isEmpty(FromAllocation) === false) {
      // make the JE approved
      JournalEntry.setValue({ fieldId: "approvalstatus", value: "2" });
      JournalEntry.save();
    }

    log.audit({
      title: "afterSubmit",
      details:
        "==================== AFTER SUBMIT EVENT END ===================="
    });
  }

  exports.afterSubmit = afterSubmit;
  return exports;
  //======================= Globals and Utility Functions ===========================================
  /**
   * This function checks if the string or array is empty.
   *
   * @param  {string|array|object}  stValue The value that will be checked.
   * @return {Boolean}         True is the value is empty, false if otherwise.
   */
  function isEmpty(stValue) {
    switch (true) {
      case isString(stValue) === true:
        return isBlank(stValue) || (!stValue || 0 === stValue.length);
      case isArray(stValue) === true:
        return stValue.length === 0;
      case nullUndefined(stValue) === true:
        return true;
      case isObject(stValue) === true:
        return isObjectEmpty(stValue);
      default:
        return false;
    }
  }
  /**
   * This function checks if the passed value is Null or Undefined.
   *
   * @param  {String|Number|Array}  value The value that will be checked.
   * @return {Boolean}       True if value is null or undefined, false if otherwise.
   */
  function nullUndefined(value) {
    if (value === null) {
      return true;
    }
    return value === undefined;
  }
  function isArray(value) {
    return value && typeof value === "object" && value.constructor === Array;
  }
  function isObject(value) {
    return !!value && value.constructor === Object;
  }
  function isObjectEmpty(obj) {
    var k;
    for (k in obj) {
      // even if its not own property I'd still call it non-empty
      return false;
    }
    return true;
  }
  function isString(value) {
    return typeof value === "string" || value instanceof String;
  }
  function isBlank(str) {
    return !str || /^\s*$/.test(str);
  }
});
