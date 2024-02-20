/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */
define(["N/record", "N/search"], /**
 * @param {record} record
 */
function (record, search) {
  /**
   * Function called upon sending a GET request to the RESTlet.
   *
   * @param {Object} requestParams - Parameters from HTTP request URL; parameters will be passed into function as an Object (for all supported content types)
   * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
   * @since 2015.1
   */
  function GD_Force5_DealerDataPullREST_Get(requestParams) {}

  /**
   * Function called upon sending a PUT request to the RESTlet.
   *
   * @param {string | Object} requestBody - The HTTP request body; request body will be passed into function as a string when request Content-Type is 'text/plain'
   * or parsed into an Object when request Content-Type is 'application/json' (in which case the body must be a valid JSON)
   * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
   * @since 2015.2
   */
  function GD_Force5_DealerDataPullREST_Put(requestBody) {
    return null;
  }

  /**
   * Function called upon sending a POST request to the RESTlet.
   *
   * @param {string | Object} requestBody - The HTTP request body; request body will be passed into function as a string when request Content-Type is 'text/plain'
   * or parsed into an Object when request Content-Type is 'application/json' (in which case the body must be a valid JSON)
   * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
   * @since 2015.2
   */
  function GD_Force5_DealerDataPullREST_Post(requestBody) {
    // Get the Dealers created or Updated between the date and time range provided.
    if (requestBody != null) {
      var isSuccess = true;

      var errorMessage = "";
      try {
        var dealerInfoJSONArray = new Array();
        var dealerInfoJSON = new Object();
        // Search over the Dealer and Sales Reps by Dealer to populate the Dealer JSON
        var customerSearchObj = search.create({
          type: "customer",
          filters: [
            [
                ["custentityrvsdealertype", "anyof", 10], //dealer type
                "AND",
                ["lastmodifieddate","onOrAfter", convertUnixTimeStampToDateTime(requestBody.startDate)],
                "AND",
                ["lastmodifieddate","onOrBefore", convertUnixTimeStampToDateTime(requestBody.endDate)],
            ],
          ],
          columns: [
            search.createColumn({
              name: "internalid",
              label: "Internal ID",
            }),
            search.createColumn({
              name: "entityid",
              sort: search.Sort.ASC,
              label: "ID",
            }),
            search.createColumn({
              name: "companyname",
              label: "Name",
            }),
            search.createColumn({
              name: "contact",
              label: "Primary Contact",
            }),
            search.createColumn({
              name: "email",
              label: "Email",
            }),
            search.createColumn({
              name: "countrycode",
              label: "Country Code",
            }),
            search.createColumn({
              name: "custentitygd_dlrlocaddress1",
              label: "GD Dealer Locator Address 1",
            }),
            search.createColumn({
              name: "custentitygd_dlrlocaddress2",
              label: "GD Dealer Locator Address 2",
            }),
            search.createColumn({
              name: "custentitygd_dlrloccity",
              label: "GD Dealer Locator City",
            }),
            search.createColumn({
              name: "custentitygd_dlrloccountryabbreviation",
              label: "GD Dealer Locator Country Abbreviation",
            }),
            search.createColumn({
              name: "custentitygd_dlrlocphone",
              label: "GD Dealer Locator Phone",
            }),
            search.createColumn({
              name: "custentitygd_dlrlocstateabbreviation",
              label: "GD Dealer Locator State Abbreviation",
            }),
            search.createColumn({
              name: "custentitygd_dlrloczipcode",
              label: "GD Dealer Locator Zip Code",
            }),
            search.createColumn({
              name: "lastmodifieddate",
              label: "Last Modified",
            }),
            search.createColumn({
              name: "isinactive",
              label: "Inactive",
            }),
            search.createColumn({
              name: "internalid",
              join: "parentCustomer",
              label: "Group ID",
            }),
            search.createColumn({
              name: "companyname",
              join: "parentCustomer",
              label: "Group Name",
            }),
          ],
        });
        var searchResultCount = customerSearchObj.runPaged().count;
        log.debug("customerSearchObj result count", searchResultCount);
        customerSearchObj.run().each(function (result) {
          // .run().each has a limit of 4,000 results
          //log.debug("customerSearchObj result", JSON.stringify(result));

          // get dealer Sales Reps by series
          var saleRepObj = new Object();
          var saleRepArry = new Array();

          var customrecordrvs_salesrepbyseriesSearchObj = search.create({
            type: "customrecordrvs_salesrepbyseries",
            filters: [
              [
                "custrecordrvs_salesrepbyseries_dealer",
                "anyof",
                result.getValue("internalid"),
              ],
            ],
            columns: [
              search.createColumn({
                name: "custrecordrvs_salesrepbyseries_dealer",
                label: "Dealer",
              }),
              search.createColumn({
                name: "custrecordrvs_salesrepbyseries_salesrep",
                label: "Sales Rep",
              }),
              search.createColumn({
                name: "custrecordrvs_salesrepbyseries_series",
                label: "Series",
              }),
            ],
          });
          var searchResultCount =
            customrecordrvs_salesrepbyseriesSearchObj.runPaged().count;
          //log.debug("customrecordrvs_salesrepbyseriesSearchObj result count", searchResultCount);
          customrecordrvs_salesrepbyseriesSearchObj
            .run()
            .each(function (result) {
              // .run().each has a limit of 4,000 results
              saleRepObj.Rep =
                result.getText("custrecordrvs_salesrepbyseries_salesrep") || "";
              saleRepObj.Series =
                result.getText("custrecordrvs_salesrepbyseries_series") || "";

              saleRepArry.push(JSON.stringify(saleRepObj));
              saleRepObj = {};

              return true;
            });

          //create JSON data
          var dealerJSON = "";
          dealerJSON = [
            {
              "internal ID": result.getValue("internalid") || "",
              "Group ID":
                result.getValue({
                  name: "internalid",
                  join: "parentCustomer",
                }) || "",
              "Group Name":
                result.getValue({
                  name: "companyname",
                  join: "parentCustomer",
                }) || "",
              "Company Name": result.getValue("companyname") || "",
              "Primary Contact": result.getText("contact") || "",
              Email: result.getValue("email") || "",
              "Country Code":
                result.getValue("countrycode") ||
                result.getValue("custentitygd_dlrloccity") ||
                "",
              "GD Dealer Locator Address 1":
                result.getValue("custentitygd_dlrlocaddress1") || "",
              "GD Dealer Locator Address 2":
                result.getValue("custentitygd_dlrlocaddress2") || "",
              "GD Dealer Locator City":
                result.getValue("custentitygd_dlrloccity") || "",
              "GD Dealer Locator Country Abbreviation":
                result.getValue("custentitygd_dlrloccountryabbreviation") || "",
              "GD Dealer Locator Phone":
                result.getValue("custentitygd_dlrlocphone") || "",
              "GD Dealer Locator State Abbreviation":
                result.getValue("custentitygd_dlrlocstateabbreviation") || "",
              "GD Dealer Locator Zip Code":
                result.getValue("custentitygd_dlrloczipcode") || "",
              "Sales Rep by Series": saleRepArry || "",
              "Last Modified": result.getValue("lastmodifieddate") || "",
              Inactive: result.getValue("isinactive") == "true" ? true : false,
            },
          ];

          //log.debug("dealerJSON", JSON.stringify(dealerJSON));

          dealerInfoJSONArray.push(dealerJSON);
          dealerJSON = {};

          return true;
        });
      } catch (ex) {
        errorMessage = ex;
        isSuccess = false;
      }
      return isSuccess
        ? { status: "Success", data: dealerInfoJSONArray }
        : { status: "Failure:", error: errorMessage };
    }
    return { status: "Failure: No Records Found" };
  }

  /**
   * Function called upon sending a DELETE request to the RESTlet.
   *
   * @param {Object} requestParams - Parameters from HTTP request URL; parameters will be passed into function as an Object (for all supported content types)
   * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
   * @since 2015.2
   */
  function GD_Force5_DealerDataPullREST_Delete(requestParams) {
    return null;
  }
  /**
   * Convert unixTimeStamp to dateTime format.
   */
  function convertUnixTimeStampToDateTime(unixTimeStamp) {
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

    // Display date time in MM/dd/yyyy h:m:s format
    var convdataTime =
      month +
      "/" +
      day +
      "/" +
      year +
      " " +
      hours +
      ":" +
      minutes.substr(-2) +
      " " +
      amOrPm;

    return convdataTime;
  }

  return {
    get: GD_Force5_DealerDataPullREST_Get,
    put: GD_Force5_DealerDataPullREST_Put,
    post: GD_Force5_DealerDataPullREST_Post,
    delete: GD_Force5_DealerDataPullREST_Delete,
  };
});
