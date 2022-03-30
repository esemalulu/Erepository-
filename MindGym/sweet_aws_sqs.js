var AWS = AWS || {};
AWS.SQS = AWS.SQS || {};

(function () {

  /**
   * Amazon SQS Client class
   *
   * @param {String} accessKey  Your AWS access key
   * @param {String} secretKey  Your AWS secret key
   * @param {Boolean} ssl  Use SSL for transaction [default: true]
   * @return {Void}
   */
  var Client = function(accessKey, secretKey, ssl) {
    this.accessKey = accessKey;
    this.secretKey = secretKey;
    this.ssl = ssl || true;
    this.host = 'queue.amazonaws.com';
    
    /**
     * Create a queue
     *
     * @param {String} queueName  The name of the queue to create
     * @param {Integer} visibilityTimeout  The visibility timeout for the new queue [default: 30]
     * @throws {Exception}
     * @return {String} queueUrl
     */
    this.createQueue = function(queueName, visibilityTimeout) {
      var parameters = new Array();
      parameters['QueueName'] = queueName;
      
      if (visibilityTimeout > 0) {
        parameters['DefaultVisibilityTimeout'] = visibilityTimeout;
      }
      
      var response = this.sendRequest('CreateQueue', '', parameters);
      
      if (response.getCode() != 200) {
        throw nlapiCreateError('AWS_SQS_ERROR_CREATEQUEUE', 'AWS error (' + response.getCode() + ') ' + response.getBody());
      }
      
      var xml = nlapiStringToXML(response.getBody());
      var queueUrl = xml.firstChild.firstChild.firstChild.firstChild.nodeValue; // TODO: Fix this when Xpath functions are working.
      return queueUrl;
    }
    
    /**
     * Delete a queue
     *
     * @param {String} queueUrl  The queue (url) to delete
     * @throws {Exception}
     * @return {Void}
     */
    this.deleteQueue = function(queueUrl) {
      var response = this.sendRequest('DeleteQueue', queueUrl);
      
      if (response.getCode() != 200) {
        throw nlapiCreateError('AWS_SQS_ERROR_DELETEQUEUE', 'AWS error (' + response.getCode() + ') ' + response.getBody());
      }
    }
    
    /**
     * Get a list of queues
     *
     * @param {String} prefix  Only return queues starting with this string [optional]
     * @throws {Exception}
     * @return {Array}
     */
    this.listQueues = function(prefix) {
      var parameters = new Array();
      
      if (prefix) {
        parameters['QueueNamePrefix'] = prefix;
      }
      
      var response = request.getResponse('ListQueues', '', parameters);
      
      if (response.getCode() != 200) {
        throw nlapiCreateError('AWS_SQS_ERROR_LISTQUEUES', 'AWS error (' + response.getCode() + ') ' + response.getBody());
      }
      
      // TODO
    }
    
    /**
     * Get queue attributes
     *
     * @param {String} queueUrl  The queue for which to retrieve attributes
     * @param {String} attribute  Which attribute to retrieve [default: 'All']
     * @throws {Exception}
     * @return {Array}
     */
    this.getQueueAttributes = function(queueUrl, attribute) {
      var parameters = new Array();
      attribute = attribute || 'All';
      parameters['AttributeName'] = attribute;
      
      var response = this.sendRequest('GetQueueAttributes', queueUrl, parameters);
      
      if (response.getCode() != 200) {
        throw nlapiCreateError('AWS_SQS_ERROR_GETQUEUEATTRIBUTES', 'AWS error (' + response.getCode() + ') ' + response.getBody());
      }
      
      // TODO
    }
    
    /**
     * Set queue attributes
     *
     * @param {String} queueUrl
     * @param {String} attribute
     * @param {String} value
     * @throws {Exception}
     * @return {Void}
     */
    this.setQueueAttributes = function(queueUrl, attribute, value) {
      var parameters = new Array();
      parameters['Attribute.Name'] = attribute;
      parameters['Attribute.Value'] = value;
      
      var response = this.sendRequest('SetQueueAttributes', queueUrl, parameters);
      
      if (response.getCode() != 200) {
        throw nlapiCreateError('AWS_SQS_ERROR_SETQUEUEATTRIBUTES', 'AWS error (' + response.getCode() + ') ' + response.getBody());
      }
      
      // TODO
    }
    
    /**
     * Send message to queue
     *
     * @param {String} queueUrl The queue which will receive the message
     * @param {String} message The body of the message to send
     * @throws {Exception}
     * @return {Object}
     */
    this.sendMessage = function(queueUrl, message) {
      var parameters = new Array();
      parameters['MessageBody'] = message;
      
      var response = this.sendRequest('SendMessage', queueUrl, parameters);
      
      if (response.getCode() != 200) {
        throw nlapiCreateError('AWS_SQS_ERROR_SENDMESSAGE', 'AWS error (' + response.getCode() + ') ' + response.getBody());
      }
      
      var returnObj = new Object();
      var xml = response.getBody();
      returnObj.MD5OfMessageBody = xml.match(/<MD5OfMessageBody>(.+)<\/MD5OfMessageBody>/)[1];
      returnObj.MessageId = xml.match(/<MessageId>(.+)<\/MessageId>/)[1];
      return returnObj;
    }
    
    /**
     * Receive message from queue
     *
     * @param {String}  queueUrl  The queue for which to retrieve attributes
     * @param {Integer} numMessages  The maximum number of messages to retrieve
     * @param {Integer} visibilityTimeout  The visibility timeout of the retrieved message
     * @throws {Exception}
     * @return {Array}
     */
    this.receiveMessage = function(queueUrl, numMessages, visibilityTimeout) {
      var parameters = new Array();
    
      if (numMessages) {
        parameters['MaxNumberOfMessages'] = numMessages;
      }
      
      if (visibilityTimeout) {
        parameters['VisibilityTimeout'] = visibilityTimeout;
      }
      
      var response = this.sendRequest('ReceiveMessage', queueUrl, parameters);
      
      if (response.getCode() != 200) {
        throw nlapiCreateError('AWS_SQS_ERROR_RECEIVEMESSAGE', 'AWS error (' + response.getCode() + ') ' + response.getBody());
      }
      
      // TODO
    }
    
    /**
     * Delete a message from a queue
     *
     * @param {String} queueUrl  The queue containing the message to delete
     * @param {String} receiptHandle  The request handle (message id) of the message to delete
     * @throws {Exception}
     * @return {Void}
     */
    this.deleteMessage = function(queueUrl, receiptHandle) {
      var parameters = new Array();
      parameters['ReceiptHandle'] = receiptHandle;
      
      var response = this.sendRequest('DeleteMessage', queueUrl, parameters);
      
      if (response.getCode() != 200) {
        throw nlapiCreateError('AWS_SQS_ERROR_DELETEMESSAGE', 'AWS error (' + response.getCode() + ') ' + response.getBody());
      }
      
      // TODO
    }
    
    /**
     * Generate the auth string using Hmac-SHA256
     *
     * @param {String} message  Message to sign
     * @return {String}
     */
    this.getSignature = function(message) {
      return b64_hmac_sha256(this.secretKey, message);
    }
    
    /**
     * Send request
     *
     * @param {String} action  The AWS action
     * @param {String} queueUrl  The queueUrl, if any
     * @param {Array} parameters   Array of request parameters [optional]
     * @return {Object}
     */
    this.sendRequest = function(action, queueUrl, parameters) {
      var parameters = parameters || new Array();
      parameters['Action'] = action;
      parameters['AWSAccessKeyId'] = this.accessKey;
      parameters['Timestamp'] = iso_timestamp();
      parameters['Version'] = '2009-02-01';
      parameters['SignatureVersion'] = '2';
      parameters['SignatureMethod'] = 'HmacSHA256';
      
      // Build query string
      var params = new Array();
      for (key in parameters) {
        params.push(key + '=' + rawurlencode(parameters[key]));
      }
      sort(params, 'SORT_STRING');
      var query = params.join('&');
      
      // Create signature
      var message = "GET\n" + this.host + "\n/" + queueUrl + "\n" + query;
      query = query + '&Signature=' + rawurlencode(this.getSignature(message));
      
      // Create url
      var url = (this.ssl ? 'https://' : 'http://') + this.host + '/' + queueUrl + '?' + query;
      
      // Send request
      var response = nlapiRequestURL(url);
      
      return response;
    }
  }
  
  AWS.SQS.Client = Client;
})();
