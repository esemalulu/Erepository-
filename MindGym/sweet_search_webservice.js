/**
 * @require sweet_user.js
 * @require sweet_yui_json.js 
 */

/**
 * Search Web service
 *
 * @method sweet_suitlet
 * @param {Object} request
 * @param {Object} response
 */
function sweet_suitelet(request, response) {
  try {
    var records = new Array;
    var action = request.getParameter('action');
    var debug = request.getParameter('debug');
    debug = debug ? true : false;
    
    if (YAHOO.lang.isString(action)) {
      switch (action.toLowerCase()) {
        case 'search':
          records = search(request);
          break;
      }
    }
    
    response.write(toJson(records));
    
  } catch (e) {
  
    // Write error to screen
    if (e instanceof nlobjError) {
      response.write('Error: ' + e.getCode() + '\n' + e.getDetails());
    }
    response.write('Error: ' + e.toString());
  }
}

/**
 * Encode object using JSON
 *
 * @param {Object}
 * @return {String}
 */
function toJson(obj) {
  str = YAHOO.lang.JSON.stringify(obj);
  str = str.replace(/>"</, '>\"<'); // Fix YUI JSON bug
  return str;
}

/**
 * Convert request parameter to array
 *
 * @param {String} name  Request parameter
 * @return {Array}
 */
function convertParameterToArray(name) {
  var parameter = request.getParameter(name);
  parameter = parameter ? parameter.split(',') : new Array();
  return parameter;
}

/**
 * Get the TMG token from the request
 *
 * @param {String} name  Request parameter
 * @return {String} token
 */
function getToken(name) {
  var parameter = request.getParameter(name);
  
  if (!parameter) {
    throw nlapiCreateError('SWEET_WEBSERVICE_ERROR', 'Token is required.');
  }
  
  return parameter;
}

/**
 * Return value in array if key exists else return default value
 *
 * @param {Array} arr
 * @param {String} key
 * @param {Mixed} default
 * @return {Mixed}
 */
function ifset(arr, key, d) {
  return (key in arr ? arr[key] : d);
}

/**
 * Sanitize email address
 *
 * @param {String} recordType
 * @param {String} recordId
 * @param {String} email
 * @param {String} column_name
 * @return {String}
 */
function sanitize_email(recordType, recordId, email, column_name) {
  nlapiLogExecution('DEBUG', 'Begin', 'recordType : ' + recordType + ' recordId ' + recordId + ' email ' + email);  
  
  try {
    if (email == "@staging.com"){
      var record = rest_getRecord(recordType, recordId);
      record.setFieldValue(column_name, '');
      nlapiSubmitRecord(record);
    }
    
    if (email.indexOf("@staging.com") == "-1" && email != '') {
      email = email.replace("@", ".");
      email = email.concat("@staging.com");
      
      var record = rest_getRecord(recordType, recordId);
      
      if (record != null) {
        record.setFieldValue(column_name, email);
        //update the record in netsuite        
        nlapiSubmitRecord(record);
      }
    }
  } catch(e) {
    nlapiLogExecution('DEBUG', 'Begin', 'error occured private : ' + e.toString());
  }

  return email;
}

/*
 * Update the two extra columns in the contact record
 *
 * @param {String} recordType
 * @param {String} recordId
 * @return {Void}
 */
function sanitize_extra_columns(recordType, recordId) {
  var record = rest_getRecord(recordType, recordId);
  
  var info = 'record type : ' + recordType;
  info += ' record id : ' + recordId;
  info += ' record : ' + record;
  
  nlapiLogExecution('DEBUG', 'Begin', info);
  
  var custentity_clifrm_email = record.custentity_clifrm_email; //getValue("custentity_clifrm_email", null, null);
  var custentity_clifrm_billemail = record.custentity_clifrm_billemail; //getValue("custentity_clifrm_billemail", null, null);
  
  info = ' custentity_clifrm_email : ' + custentity_clifrm_email;
  info += ' custentity_clifrm_billemail : ' + custentity_clifrm_billemail;
  
  nlapiLogExecution('DEBUG', 'Begin', info);
  
  sanitize_email(recordType, recordId, custentity_clifrm_email, "custentity_clifrm_email");
  sanitize_email(recordType, recordId, custentity_clifrm_billemail, "custentity_clifrm_billemail");  
}

/**
 * Get record by id
 *
 * @param {String} recordType
 * @param {String} recordId
 * @return {nlapiRecord}
 */
function rest_getRecord(recordType, recordId) {
  try {
    var record = nlapiLoadRecord(recordType, recordId);
  } catch (e) {
    throw e;
  }
  
  return record;
}

/**
 * Search
 *
 * @method search
 * @param {Object}
 */
function search(request) {
  var records = new Array;
  
  var recordType = request.getParameter('type');
  if (!recordType) {
    throw nlapiCreateError('SWEET_WEBSERVICE_ERROR', 'Record type is required.');
  }
  
  var scriptId = request.getParameter('id');
  scriptId = scriptId || null;
  
  var filterName     = convertParameterToArray('fn');
  var filterJoin     = convertParameterToArray('fj');
  var filterOperator = convertParameterToArray('fo');
  var filterValue1   = convertParameterToArray('f1');
  var filterValue2   = convertParameterToArray('f2');
  var columnName     = convertParameterToArray('cn');
  var columnJoin     = convertParameterToArray('cj');
  var columnSummary  = convertParameterToArray('cs');  
  var token          = getToken('token');
  
  // Build filters
  var filters = new Array();
  var i = 0, n = filterName.length;
  for (; i < n; i++) {
    var name = filterName[i];
    var join = ifset(filterJoin, i, null);
    var operator = ifset(filterOperator, i, null);
    if (!operator) {
      throw nlapiCreateError('SWEET_WEBSERVICE_ERROR', 'Filter operator is required.');
    }
    var value1 = ifset(filterValue1, i, null);
    var value2 = ifset(filterValue2, i, null);
    
    switch (operator.toLowerCase()) {
      case 'anyof':
        value1 = value1 ? value1.split(':') : value1;
        break;
    }
    
    nlapiLogExecution('DEBUG', 'Info',  'script=' + scriptId + ', name=' + name + ', join=' + join + ', operator=' + operator + ', value1=' + value1 + ', value2=' + value2);
    filters.push(new nlobjSearchFilter(name, join, operator, value1, value2));
  }
  
  // Build columns
  var columns = new Array();
  var i = 0, n = columnName.length;
  for (; i < n; i++) {
    var name = columnName[i];
    var join = ifset(columnJoin, i, null);
    var summary = ifset(columnSummary, i, null);
    columns.push(new nlobjSearchColumn(name, join, summary));
  }
  
  // Perform search
  var results = nlapiSearchRecord(recordType, scriptId, filters, columns);
  
  if (!results) {
    results = new Array();
  }
  
  // Convert results to objects
  var i = 0, n = results.length;
  for (; i < n; i++) {
    var record = new Object();
    record.action = 'search';
    record.timestamp = new Date().getTime();
    record.record_id = results[i].getId();
    record.record_type = results[i].getRecordType();
    record.fields = new Object();
    
    var j = 0, m = columnName.length;
    var sample = null;
    for (; j < m; j++) {
      var name = columnName[j];
      var join = ifset(columnJoin, j, null);
      var summary = ifset(columnSummary, j, null);
      var value = results[i].getValue(name, join, summary);
    
      // Sanitize email
      /*
      if (name == "email" || name == "custentity_clifrm_email" || name == "custentity_clifrm_billemail") {
        value = sanitize_email(record.record_type, record.record_id, value, name);
      }
      */
        
      /*if(recordType == "contact") {
        sanitize_extra_columns(record.record_type, record.record_id);
      }*/
      
      var attribute = name;
      if (join) {
        attribute = attribute + '_' + join;
      }
      if (summary) {
        attribute = attribute + '_' + summary;
      }
      
      var evalStr = "record.fields." + attribute + "=value";
      eval(evalStr);
      
      switch (name) {
        case 'datecreated':
        case 'created':
          sample = value;
      }
    }
    
    // Store user date/time preferences
    if (sample) {
      record.user_dateformat = user_dateformat();
      record.user_timeformat = user_timeformat(sample);
    }
    
    // Add record to list
    records.push(record);
  }
  
  // Add token
  var tokenObj = new Object();
  tokenObj.token = token
  records.push(tokenObj);
  
  return records;
}