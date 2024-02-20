/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/https', 'N/url', 'N/search', 'N/runtime', 'N/error'],

  function(record, https, url, search, runtime, error) {

    /**
     * Function called upon sending a GET request to the RESTlet.
     *
     * @param {Object} requestParams - Parameters from HTTP request URL; parameters will be passed into function as an Object (for all supported content types)
     * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
     * @since 2015.1
     */
    function doGet(requestParams) {

      //Do a Search of all units that meet the following requirements
      /*
          1.  VIN Number matches the VIN Number passed in the requestParams
          2.  Date Completed is not blank
      */
      var isSuccess = true;
      var dataResultsArray = new Array();
      try {

        var customrecordrvsunitSearchObj = search.create({
          type: "customrecordrvsunit",
          filters:
          [
             ["name","is",requestParams.id],
             "AND",
             ["custrecordunit_datecompleted","isnotempty",""]
          ],
          columns:
          [
             search.createColumn({
                name: "name",
                sort: search.Sort.ASC,
                label: "Name"
             }),
             search.createColumn({name: "custrecordunit_series", label: "Series"}),
             search.createColumn({name: "custrecordunit_model", label: "Model"}),
             search.createColumn({name: "custrecordunit_modelyear", label: "Model Year"}),
             search.createColumn({name: "custrecordunit_datecompleted", label: "Date Completed"}),
             search.createColumn({name: "internalid", label: "Internal ID"})
          ]
       });
       var searchResultCount = customrecordrvsunitSearchObj.runPaged().count;
       //log.debug("customrecordrvsunitSearchObj result count",searchResultCount);
       customrecordrvsunitSearchObj.run().each(function(result){
          // .run().each has a limit of 4,000 results
          log.debug("customrecordrvsunitSearchObj result",JSON.stringify(result));

          var dataResults = new Object();
          var unitId = result.getValue("internalid") || '';
          dataResults.vinNumber = result.getValue("name") || '';
          dataResults.series = result.getText("custrecordunit_series") || '';
          dataResults.model = result.getText("custrecordunit_model") || '';
          dataResults.modelYear = result.getText("custrecordunit_modelyear") || '';
          dataResults.dateCompleted = result.getValue("custrecordunit_datecompleted") || '';

          //get any Recalls
          var recallObj = new Object;
          var recallArray = new Array;

          var customrecordrvs_recallunitSearchObj = search.create({
            type: "customrecordrvs_recallunit",
            filters:
            [
               ["custrecordrecallunit_unit","anyof",unitId]
            ],
            columns:
            [
               search.createColumn({name: "custrecordrecallunit_recallcode", label: "Recall Code"}),
               search.createColumn({name: "custrecordrecallunit_unit", label: "Unit"}),
               search.createColumn({name: "custrecordrecallunit_date", label: "Date Added"}),
               search.createColumn({name: "custrecordrecallunit_status", label: "Status"})
            ]
         });
         var searchResultCount = customrecordrvs_recallunitSearchObj.runPaged().count;
         //log.debug("customrecordrvs_recallunitSearchObj result count",searchResultCount);
         customrecordrvs_recallunitSearchObj.run().each(function(result){
            // .run().each has a limit of 4,000 results
            //log.debug("customrecordrvs_recallunitSearchObj result",JSON.stringify(result));

            recallObj.recallCode = result.getText("custrecordrecallunit_recallcode");
            recallObj.unit = result.getText("custrecordrecallunit_unit");
            recallObj.date = result.getValue("custrecordrecallunit_date");
            recallObj.status = result.getValue("custrecordrecallunit_status");
            recallArray.push(JSON.stringify(recallObj));
            recallObj = {};
            return true;
         });



          dataResults.recalls = recallArray;
          dataResultsArray.push(dataResults);
          return true;
        });
      } catch (ex) {
        errorMessage = ex;
        log.debug("errorMessage", errorMessage);
        isSuccess = false
      }
      return JSON.stringify(dataResultsArray);
    }


    /**
     * Function called upon sending a PUT request to the RESTlet.
     *
     * @param {string | Object} requestBody - The HTTP request body; request body will be passed into function as a string when request Content-Type is 'text/plain'
     * or parsed into an Object when request Content-Type is 'application/json' (in which case the body must be a valid JSON)
     * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
     * @since 2015.2
     */
    function doPut(requestBody) {

    }


    /**
     * Function called upon sending a POST request to the RESTlet.
     *
     * @param {string | Object} requestBody - The HTTP request body; request body will be passed into function as a string when request Content-Type is 'text/plain'
     * or parsed into an Object when request Content-Type is 'application/json' (in which case the body must be a valid JSON)
     * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
     * @since 2015.2
     */
    function doPost(requestBody) {

    }

    /**
     * Function called upon sending a DELETE request to the RESTlet.
     *
     * @param {Object} requestParams - Parameters from HTTP request URL; parameters will be passed into function as an Object (for all supported content types)
     * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
     * @since 2015.2
     */
    function doDelete(requestParams) {

    }

    return {
      'get': doGet,
      //put: doPut,
      //post: doPost,
      //'delete': doDelete
    };

  });
