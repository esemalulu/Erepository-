/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/query', 'N/log', 'N/file'],

  (query, log, file) => {
    /**
     * Defines the function that is executed when a GET request is sent to a RESTlet.
     * @param {Object} requestParams - Parameters from HTTP request URL; parameters passed as an Object (for all supported
     *     content types)
     * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
     *     Object when request Content-Type is 'application/json' or 'application/xml'
     * @since 2015.2
     */
    const get = (requestParams) => {

    }

    /**
     * Defines the function that is executed when a PUT request is sent to a RESTlet.
     * @param {string | Object} requestBody - The HTTP request body; request body are passed as a string when request
     *     Content-Type is 'text/plain' or parsed into an Object when request Content-Type is 'application/json' (in which case
     *     the body must be a valid JSON)
     * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
     *     Object when request Content-Type is 'application/json' or 'application/xml'
     * @since 2015.2
     */
    const put = (requestBody) => {

    }

    /**
     * Defines the function that is executed when a POST request is sent to a RESTlet.
     * @param {string | Object} requestBody - The HTTP request body; request body is passed as a string when request
     *     Content-Type is 'text/plain' or parsed into an Object when request Content-Type is 'application/json' (in which case
     *     the body must be a valid JSON)
     * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
     *     Object when request Content-Type is 'application/json' or 'application/xml'
     * @since 2015.2
     */
    const post = (requestBody) => {
      //Do a Search of all units that meet the following requirements
      /*
        1.  Unit Shipping Status is: Shipped, and
        2.  Unit Ship Date is: Not Empty (i.e, unit has a ship date), and
        3.  Unit Warranty Registration Received Date is: Empty (i.e, unit has no warranty registration date)
      */
      if (requestBody != null) {
        log.debug('requestBody', JSON.stringify(requestBody));
        var isSuccess = true;
        var errorMessage = '';
        try {
          startDate = convertUnixTimeStampToDateTime(requestBody.startDate);
          endDate = convertUnixTimeStampToDateTime(requestBody.endDate);
          // DATE OVERRIDES
          //startDate = '1/1/2022';
          //endDate = '1/3/2022';
          log.audit('Date Range', `Start Date: ${startDate}, End Date: ${endDate}`);
          mainSuiteQL = `SELECT custrecordgd_ab_infieldinv_queue_data FROM CUSTOMRECORDGD_AB_INFIELDINV_QUEUE WHERE custrecordgd_ab_infieldinv_queue_shpdate >= '${startDate}' AND custrecordgd_ab_infieldinv_queue_shpdate <= '${endDate}' and isinactive = 'F'`;

          var data = [];
          var rawdata = [];
          var mainSuiteQLResult = query.runSuiteQLPaged({
            query: mainSuiteQL,
            pageSize: 1000
          }).iterator();
          // Fetch results using an iterator
          mainSuiteQLResult.each(function (pagedData) {
            rawdata = rawdata.concat(pagedData.value.data.asMappedResults());
            return true;
          });
          try{
            rawdata.forEach(custrecordgd_ab_infieldinv_queue_data => {
              innerData = custrecordgd_ab_infieldinv_queue_data.custrecordgd_ab_infieldinv_queue_data;
              try{
                innerData = JSON.parse(innerData);
              }catch (f){
                //log.error(`JSON ERROR`, f);
                log.error(`JSON ERROR innerData`, innerData);
                //innerData = innerData;
              }
              data = data.concat(innerData);
              return true;
            });
          }catch (feError){
            log.error(`Error at 74`, `rawdata.forEach(custrecordgd_ab_infieldinv_queue_data`)
          }
          //data = rawdata;
        } catch (ex) {
          log.error(`ex`, ex);
          errorMessage = ex;
          isSuccess = false;
        }
        return isSuccess ? {
          status: "Success",
          data: data
        } : {
          status: "Failure:",
          error: errorMessage
        };
      }
      return {
        status: "Failure: No Records Found"
      };
    }

    /**
     * Defines the function that is executed when a DELETE request is sent to a RESTlet.
     * @param {Object} requestParams - Parameters from HTTP request URL; parameters are passed as an Object (for all supported
     *     content types)
     * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
     *     Object when request Content-Type is 'application/json' or 'application/xml'
     * @since 2015.2
     */
    const doDelete = (requestParams) => {

    }

    /**
     * Convert unixTimeStamp to dateTime format.
     */
    const convertUnixTimeStampToDateTime = (unixTimeStamp) => {
      // Convert timeStamp to milliseconds
      var date = new Date(parseInt(unixTimeStamp) * 1000);
      // Year
      var year = date.getFullYear();
      // Month
      var month = date.getMonth() + 1;
      // Day
      var day = date.getDate();
      // Hours
      var hours = date.getHours();
      // Minutes
      var minutes = "0" + date.getMinutes();
      // Seconds
      var seconds = "0" + date.getSeconds();

      var amOrPm = "am";
      if (hours > 12) {
        hours -= 12;
        amOrPm = "pm";
      } else if (hours == 12) {
        amOrPm = "pm";
      }

      // Display date time in MM/dd/yyyy format
      var convdataTime =
        month +
        "/" +
        day +
        "/" +
        year;

      return convdataTime;
    }

    return {
      //get,
      //put,
      post,
      //delete: doDelete
    }

  });