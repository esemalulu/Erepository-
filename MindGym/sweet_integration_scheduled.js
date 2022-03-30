/**
 * System integration
 *
 * @param {String} action  User event type
 * @param {String} recordType  Record type
 * @param {String} recordId  Record id
 *
 */
var SWEET_DEBUG = false;

/**
 * SweetScriptScheduled Class
 *
 */
var SweetScriptScheduled = function() {

  /**
   * Class attributes
   */
  this.action = null;
  this.recordType = null;
  this.recordId = null;
  
  /**
   * Run script
   *
   * @return {Void}
   */
  this.run = function() {
    var context = nlapiGetContext();
    
    // Get script parameters
    this.action = context.getSetting('SCRIPT', 'custscript_action');
    if (!this.action) {
      nlapiCreateError('SWEET_INVALID_ARGUMENT', 'action parameter is required');
    }
    this.recordType = context.getSetting('SCRIPT', 'custscript_recordtype');
    if (!this.recordType) {
      nlapiCreateError('SWEET_INVALID_ARGUMENT', 'recordtype parameter is required');
    }
    this.recordId = context.getSetting('SCRIPT', 'custscript_recordid');
    if (!this.recordId) {
      nlapiCreateError('SWEET_INVALID_ARGUMENT', 'recordid parameter is required');
    }
    
    nlapiLogExecution('DEBUG', 'Params', 'action=' + this.action + ', recordType=' + this.recordType + ', recordId=' + this.recordId);
    
    var json = this.toJson(this.toObject());
    
    if (SWEET_DEBUG) {
      this.sendEmail(this.action, json);
    }
    
    this.sendAWS(json);
  }
  
  /**
   * Convert record to javascript object
   *
   * @return {Object}
   */
  this.toObject = function() {
    var obj = new Object();
    obj.action = this.action;
    obj.timestamp = new Date().getTime();
    
    if (this.action == 'delete') {
      obj.record_id = this.recordId;
      obj.record_type = this.recordType;
      return obj;
    }
    
    // Load the record
    do {
      var retry = false;
      
      try {
        var record = nlapiLoadRecord(this.recordType, this.recordId);
      } catch (e) {
        if (e instanceof nlobjError && e.getCode() == 'SSS_RECORD_TYPE_MISMATCH') {
          switch (this.recordType) {
            case 'lead':
              this.recordType = 'prospect';
              retry = true;
              break;
            case 'prospect':
              this.recordType = 'customer';
              retry = true;
              break;
            case 'customer':
              this.recordType = 'lead';
              retry = true;
              break;
          }
        }
      }
    } while (retry);
    
    obj.record_id = record.getId();
    obj.record_type = record.getRecordType();
    
    obj.fields = new Object();
    var fields = record.getAllFields();
    var i = 0, n = fields.length;
    var sample = null;
    for (;i < n; i++) {
      try {
        var key = fields[i];
        var value = record.getFieldValue(fields[i]);
        var str = "obj.fields." + key + " = value";
        eval(str);
        
        // Get datetime sample. Used for detecting time format.
        switch (key) {
          case 'datecreated':
          case 'lastmodifieddate':
          case 'created':
          case 'lastmodified':
            sample = value;
            break;
        }
      } catch (e) {
        nlapiLogExecution('DEBUG', 'key', key);
        nlapiLogExecution('DEBUG', 'value', value);
        nlapiLogExecution('DEBUG', 'eval', str);
        throw e;
      }
    }
    
    // Store user preferences for parsing fields
    obj.user_dateformat = user_dateformat();
    obj.user_timeformat = sample ? user_timeformat(sample) : '';

    return obj;
  }

  /**
   * Encode object using JSON
   *
   * @param {Object}
   * @return {String}
   */
  this.toJson = function(obj) {
    str = YAHOO.lang.JSON.stringify(obj);
    str = str.replace(/>"</, '>\"<'); // Fix YUI JSON bug
    return Utf8.encode(str);
  }

  /**
   * Send email
   *
   * @param {String} subject
   * @param {String} body
   * @return {Void}
   */
  this.sendEmail = function(subject, body) {
    var author = 2;
    var recipient = 2; 
    nlapiSendEmail(author, recipient, subject, body);
  }

  /**
   * Send data to AWS cloud
   *
   * @param {String} data
   * @return {Void}
   */
  this.sendAWS = function(data) {
    var accessKey = 'AKIAIF7EXOIN3YPNTYTA';
    var secretKey = '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';

    // Store serialised object in S3
    var s3 = new AWS.S3.Client(accessKey, secretKey);
    var bucket = 'themindgym-netsuite';
    var key = custom_timestamp() + '-' + Math.uuid().replace(/-/g, '');
    nlapiLogExecution('DEBUG', 's3.key', key);
    s3.putObjectInline(bucket, key, data);
    
    // Place new message in SQS
    var sqs = new AWS.SQS.Client(accessKey, secretKey);
    var queueUrl = 'themindgym-netsuite';
    var message = 'S3:' + key;
    var response = sqs.sendMessage(queueUrl, message)
    nlapiLogExecution('DEBUG', 'sqs.message_id', response.MessageId);  
  }
}

/**
 * Main
 *
 * @return {Void}
 */
function sweet_scheduled() {
  var script = new SweetScriptScheduled();
  script.run();
}
