/**
 * @require sweet_user.js
 * @require sweet_yui_json.js 
 */

/**
 * RESTful API server
 *
 * @method sweet_suitlet
 * @param {nlapiRequest} request
 * @param {nlapiResponse} response
 */
function sweet_suitelet(request, response) {
  try {
    var records = new Array();
    var action = request.getParameter('action');
    var debug = request.getParameter('debug');
    debug = debug ? true : false;
    
    if (YAHOO.lang.isString(action)) {
      switch (action.toLowerCase()) {
        case 'index':
          response.write(rest_toJson(rest_index(request)));
          break;
        case 'show':
          response.write(rest_toJson(rest_show(request)));
          break;
        case 'create':
          response.write(rest_toJson(rest_create(request)));
          break;
        case 'update':
          response.write(rest_toJson(rest_update(request)));
          break;
        case 'destroy':
          response.write(rest_toJson(rest_destroy(request)));
          break;
      }
    }    
  } catch (e) {
    // Write error to screen
    if (e instanceof nlobjError) {
      response.write('Error: ' + e.getCode() + '\n' + e.getDetails());
    } else {
      response.write('Error: ' + e.toString());
    }
  }
}

/**
 * Encode object using JSON
 *
 * @param {Object}
 * @return {String}
 */
function rest_toJson(obj) {
  str = YAHOO.lang.JSON.stringify(obj);
  str = str.replace(/>"</, '>\"<'); // Fix YUI JSON bug
  return str;
}

/**
 * Show record
 *
 * @param {Object} nlapiRequest
 * @return {Object}
 */
function rest_show(request) {
  var recordType = request.getParameter('recordtype');
  if (!recordType) {
    throw nlapiCreateError('SWEET_WEBSERVICE_ERROR', 'Record type is required.');
  }
  var recordId = request.getParameter('recordid');
  if (!recordId) {
    throw nlapiCreateError('SWEET_WEBSERVICE_ERROR', 'Record id is required.');
  }
  return rest_toObject(rest_getRecord(recordType, recordId));
}

/**
 * Update record
 *
 * @param {nlapiRequest} request
 * @return {Object}
 */
function rest_update(request) {
  var recordType = request.getParameter('recordtype');
  if (!recordType) {
    throw nlapiCreateError('SWEET_WEBSERVICE_ERROR', 'Record type is required.');
  }
  var recordId = request.getParameter('recordid');
  if (!recordId) {
    throw nlapiCreateError('SWEET_WEBSERVICE_ERROR', 'Record id is required.');
  }
  
  var record = rest_getRecord(recordType, recordId);
  var fields = rest_getParameterFields(request);
  if (fields) {
    for (var field in fields) {
      record.setFieldValue(field, fields[field]);
    }
  }
  
  
  //If this is a coach record then update their address
  if (recordType == 'vendor') {
      record = coach_address_update(record, request);
  }
  
  nlapiSubmitRecord(record);
  return rest_toObject(rest_getRecord(recordType, recordId));
}

/**
 * Create new record
 *
 * @param {nlapiRequest} request
 * @return {Object}
 */
function rest_create(request) {
  var recordType = request.getParameter('recordtype');
  if (!recordType) {
    throw nlapiCreateError('SWEET_WEBSERVICE_ERROR', 'Record type is required.');
  }
  
  record = nlapiCreateRecord(recordType);
  var fields = rest_getParameterFields(request);
  if (fields) {
    for (var field in fields) {
      record.setFieldValue(field, fields[field]);
    }
  }
  
  var recordId = nlapiSubmitRecord(record);
  return rest_toObject(rest_getRecord(recordType, recordId));
}

/**
 * Destroy record
 *
 * @param {nlapiRequest} request
 * @return {Object}
 */
function rest_destroy(request) {
  var recordType = request.getParameter('recordtype');
  if (!recordType) {
    throw nlapiCreateError('SWEET_WEBSERVICE_ERROR', 'Record type is required.');
  }
  var recordId = request.getParameter('recordid');
  if (!recordId) {
    throw nlapiCreateError('SWEET_WEBSERVICE_ERROR', 'Record id is required.');
  }
  nlapiDeleteRecord(recordType, recordId);
  return true;
}

/**
 * Parse object fields from request
 *
 * POST request example:
 *   <input type="text" name="fields[first_name]" value="Andre" />
 *   <input type="text" name="fields[last_name]" value="Borgstrom" />
 *
 * @param {nlapiRequest} request
 * @return {Object}
 */
function rest_getParameterFields(request) {
  var fields = new Object();
  var params = request.getAllParameters();
  for (var param in params) {
    var matches = param.match(/^fields\[(\w+)\]$/);
    if (matches) {
      fields[matches[1]] = params[param];
    }
  }
  return fields;
}

/**
 * Get record by id
 *
 * @param {String} recordType
 * @param {String} recordId
 * @return {nlapiRecord}
 */
function rest_getRecord(recordType, recordId) {
  do {
    var retry = false;
    
    try {
      var record = nlapiLoadRecord(recordType, recordId);
    } catch (e) {
      if (e instanceof nlobjError && e.getCode() == 'SSS_RECORD_TYPE_MISMATCH') {
        switch (recordType) {
          case 'lead':
            recordType = 'prospect';
            retry = true;
            break;
          case 'prospect':
            recordType = 'customer';
            retry = true;
            break;
          case 'customer':
            recordType = 'lead';
            retry = true;
            break;
        }
      } else {
        throw e;
      }
    }
  } while (retry);
  
  return record;
}

/**
 * Convert record to javascript object
 *
 * @return {Object}
 */
function rest_toObject(record) {
  var obj = new Object();
  
  obj.record_id = record.getId();
  obj.record_type = record.getRecordType();
  
  obj.fields = new Object();
  var fields = record.getAllFields();
  var i = 0, n = fields.length;
  //var sample = null;
  for (;i < n; i++) {
    try {
      var key = fields[i];
      var value = record.getFieldValue(fields[i]);
      var str = "obj.fields." + key + " = value";
      eval(str);
      
      // Get datetime sample. Used for detecting time format.
      //switch (key) {
      //  case 'datecreated':
      //  case 'lastmodifieddate':
      //  case 'created':
      //  case 'lastmodified':
      //    sample = value;
      //    break;
      //}
    } catch (e) {
      nlapiLogExecution('DEBUG', 'key', key);
      nlapiLogExecution('DEBUG', 'value', value);
      nlapiLogExecution('DEBUG', 'eval', str);
      throw e;
    }
  }
  
  // Store user preferences for parsing fields
  //obj.user_dateformat = user_dateformat();
  //obj.user_timeformat = sample ? user_timeformat(sample) : '';

  return obj;
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
 * Index
 *
 * @method search
 * @param {Object} request
 * @param {Object}
 */
function rest_index(request) {
  var records = new Array;
  
  var recordType = request.getParameter('recordtype');
  if (!recordType) {
    throw nlapiCreateError('SWEET_WEBSERVICE_ERROR', 'Record type is required.');
  }
  
  var searchId = request.getParameter('searchid');
  if (!searchId) {
    throw nlapiCreateError('SWEET_WEBSERVICE_ERROR', 'Search id is required.');
  }
  
  // Perform search
  var results = nlapiSearchRecord(recordType, searchId);
  
  // Convert results to objects
  if (results) {
    var i = 0, n = results.length;
    for (; i < n; i++) {
      var record = new Object();
      record.action = 'search';
      record.timestamp = new Date().getTime();
      record.record_id = results[i].getId();
      record.record_type = results[i].getRecordType();
      record.fields = new Object();
      
      var columns = results[i].getAllColumns();
      var j = 0, m = columns.length;
      //var sample = null;
      for (; j < m; j++) {
        var name = columns[j].getName();
        var join = columns[j].getJoin() || null;
        var summary = columns[j].getSummary() || null;
        var value = results[i].getValue(name, join, summary);
        
        var attribute = name;
        if (join) {
          attribute = attribute + '_' + join;
        }
        if (summary) {
          attribute = attribute + '_' + summary;
        }
        
        var evalStr = "record.fields." + attribute + "=value";
        eval(evalStr);
        
        //switch (name) {
        //  case 'datecreated':
        //  case 'created':
        //    sample = value;
        //}
      }
      
      // Store user date/time preferences
      //if (sample) {
      //  record.user_dateformat = user_dateformat();
      //  record.user_timeformat = user_timeformat(sample);
      //}
      
      records.push(record);
    }
  } else {
    results = new Array();
  }
  
  return records;
}

/**
* Update coach address
*
* @param {nlapiRecord} record
* @param {Object} fields
* @return {nlapiRecord}
**/
function coach_address_update(record, request) {

    // Get the address fields
    var fields = rest_getCoachAddressParameterFields(request);    
    
    // If there is an exsting address record then load it, otherwise create one
    if (record.getLineItemCount('addressbook') == 0) {
        record.selectNewLineItem('addressbook');
    }
    else {
        record.selectLineItem('addressbook', 1);
    }
    
    // Loop through the address records and add each item
    if (fields) {
        for (var field in fields) {
        record.setCurrentLineItemValue('addressbook', field, fields[field]);
        }
    }
      
    // Save to the coach record
    record.commitLineItem('addressbook');

    return record;
}

/**
* Parse object fields from request
*
* POST request example:
*   <input type="text" name="fields[first_name]" value="Andre" />
*   <input type="text" name="fields[last_name]" value="Borgstrom" />
*
* @param {nlapiRequest} request
* @return {Object}
*/
function rest_getCoachAddressParameterFields(request) {
    var fields = new Object();
    var params = request.getAllParameters();
    for (var param in params) {
        var matches = param.match(/^addr_fields\[(\w+)\]$/);
        if (matches) {
            fields[matches[1]] = params[param];
        }
    }
    return fields;
}