var AWS = AWS || {};
AWS.S3 = AWS.S3 || {};

(function () {

  /**
   * Amazon S3 Client class
   *
   * @param {String} accessKey  Your AWS access key
   * @param {String} secretKey  Your AWS secret key
   * @return {Void}
   */
  var Client = function(accessKey, secretKey) {
    this.accessKey = accessKey;
    this.secretKey = secretKey;
    this.host = 's3.amazonaws.com';
    this.endpoint = 'soap'
    
    /**
     * Add object to bucket
     *
     * @param {String} bucket
     * @param {String} key
     * @param {String} data
     * @throws {Object}
     * @return {Void}
     */
    this.putObjectInline = function(bucket, key, data) {
      
      var timestamp = iso_timestamp();
      var operation = 'PutObjectInline';
      var signature = b64_hmac_sha1(this.secretKey, 'AmazonS3' + operation + timestamp);
      
      var parameters = new Array(); 
      parameters['Bucket'] = bucket;
      parameters['Key'] = key;
      parameters['Data'] = rstr2b64(data);
      parameters['ContentLength'] = data.length;
      parameters['AWSAccessKeyId'] = this.accessKey;
      parameters['Timestamp'] = timestamp;
      parameters['Signature'] = signature;
      
      var response = this._sendRequest('PutObjectInline', parameters);
      
      if (response.getCode() != 200) {
        throw nlapiCreateError('AWS_S3_ERROR_PUTOBJECTINLINE', 'AWS error (' + response.getCode() + ') ' + response.getBody());
      }
    }
    
    /**
     * Helper function to send SOAP request
     *
     * @params {String} operation  Name of AWS operation
     * @params {Array} parameters  Array of request parameters
     * @return {Object} nlapiResponse
     */
    this._sendRequest = function(operation, parameters) {
    
      // Create url
      var url = 'https://' + this.host + '/' + this.endpoint;
      
      // Build request headers
      var headers = new Array();
      headers['SOAPAction'] = '';
      headers['Content-Type'] = 'text/xml;charset=UTF-8';
      
      // Build request body
      var xml = new Array(); 
      xml.push('<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns="http://s3.amazonaws.com/doc/2006-03-01/">');
      xml.push('   <soapenv:Header/>');
      xml.push('   <soapenv:Body>');
      xml.push('      <ns:' + operation + '>');
      
      for (key in parameters) {
        xml.push('         <ns:' + key + '>' + parameters[key] + '</ns:' + key + '>');
      }
      
      xml.push('      </ns:' + operation + '>');
      xml.push('   </soapenv:Body>');
      xml.push('</soapenv:Envelope>');
      xml = xml.join('\n')
      
      // Send request
      return nlapiRequestURL(url, xml, headers); 
    }
  }
  
  AWS.S3.Client = Client;
})();
