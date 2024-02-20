/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */
 define(['N/query', 'N/record', 'N/search'],
 /**
  * @param {query} query
  * @param {record} record
  */
 (query, record, search) => {
     /**
      * Function called upon sending a GET request to the RESTlet.
      *
      * @param {Object} requestParams - Parameters from HTTP request URL; parameters will be passed into function as an Object (for all supported content types)
      * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
      * @since 2015.1
      */
     const GD_DealerRegistrationDataPullREST_Get = (requestParams) => {
         
     }
 
     /**
      * Function called upon sending a PUT request to the RESTlet.
      *
      * @param {string | Object} requestBody - The HTTP request body; request body will be passed into function as a string when request Content-Type is 'text/plain'
      * or parsed into an Object when request Content-Type is 'application/json' (in which case the body must be a valid JSON)
      * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
      * @since 2015.2
      */
     const GD_DealerRegistrationDataPullREST_Put = (requestBody) => {
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
     const GD_DealerRegistrationDataPullREST_Post = (requestBody) => {
         // Get the Dealer Registrations created between the date and time range provided.
         if (requestBody != null) {
             // Get all contacts in the system so it can be used later for salesReps.
             var salesRepResults = new Object();
             var salesRepResultsData = search.create({
                 type: search.Type.CONTACT,
                 columns: [search.createColumn({name: 'entityid'})]
             }).runPaged({pageSize: 1000});
                         
             salesRepResultsData.pageRanges.forEach(function(pageRange){
                 salesRepResultsData.fetch({index: pageRange.index}).data.forEach(function(result){
                     salesRepResults['"' + result.id + '"'] =  result.getValue({name: 'entityid'});
                     return true;
                 });
             });
             
             // Get all state name/country name combination for the stateId included in the unit search..
             var stateRecordResults = new Object();
             search.create({
                 type: search.Type.STATE,
                 columns: [search.createColumn({name: 'shortname'}),
                           search.createColumn({name: 'country'})]
             }).run().each(function(result){
                 stateRecordResults['"' + result.id + '"'] =  {"shortname": result.getValue({name: 'entityid'}), "country": result.getValue({name: 'entityid'})};
                 return true;
             });
 
             var stateRecordObject = '';
             var salesRep1Name = '';
             var salesRepId = '';
             var salesRep2Name = '';
             var salesRep2Id = '';
             var isSuccess = true;
             
             var errorMessage = '';
             try {
                 var registrationInfoJSONArray = new Array();
                 var registrationInfoJSON = new Object();
                 // Get registration data.
                 var startDateString = convertUnixTimeStampToDateTime(requestBody.startDate);
                 var endDateString = convertUnixTimeStampToDateTime(requestBody.endDate);
                 log.debug('startDateString', startDateString);
                 log.debug('endDateString', endDateString);
                 var suiteQLString = 
                 `
                 SELECT 
                    customrecordrvsunit.custrecordunit_retailpurchaseddate AS custrecordunit_retailpurchaseddate, 
                    customrecordrvsunit.custrecordunit_serialnumber AS custrecordunit_serialnumber, 
                    BUILTIN.DF(customrecordrvsunit.custrecordunit_salesrep) AS custrecordunit_salesrep, 
                    customrecordrvsunit.name AS name, 
                    customrecordrvsunit.custrecordunit_series AS custrecordunit_series, 
                    customer.entitynumber AS entitynumber, 
                    customer.entityid AS entityid, 
                    customer.companyname AS companyname, 
                    customer.email AS email, 
                    entityaddress.addr1 AS addr1, 
                    entityaddress.addr2 AS addr2, 
                    entityaddress.city AS city, 
                    entityaddress.state AS state, 
                    entityaddress.zip AS zip, 
                    entityaddress.country AS country, 
                    entityaddress.addrphone AS addrphone, 
                    customer.fax AS fax, 
                    customer.salesrep AS salesrep, 
                    item.itemid AS itemid, 
                    BUILTIN.DF(item.custitemrvsmodelyear) AS custitemrvsmodelyear, 
                    item.displayname AS displayname, 
                    customrecordrvsunitretailcustomer.isinactive AS isinactive, 
                    customrecordrvsunitretailcustomer.id AS id, 
                    customrecordrvsunitretailcustomer.custrecordunitretailcustomer_firstname AS custrecordunitretailcustomer_firstname, 
                    customrecordrvsunitretailcustomer.custrecordunitretailcustomer_lastname AS custrecordunitretailcustomer_lastname, 
                    customrecordrvsunitretailcustomer.custrecordunitretailcustomer_title AS custrecordunitretailcustomer_title, 
                    customrecordrvsunitretailcustomer.custrecordunitretailcustomer_address1 AS custrecordunitretailcustomer_address1, 
                    customrecordrvsunitretailcustomer.custrecordunitretailcustomer_address2 AS custrecordunitretailcustomer_address2, 
                    customrecordrvsunitretailcustomer.custrecordunitretailcustomer_city AS custrecordunitretailcustomer_city, 
                    customrecordrvsunitretailcustomer.custrecordunitretailcustomer_country AS custrecordunitretailcustomer_country, 
                    customrecordrvsunitretailcustomer.custrecordunitretailcustomer_state AS custrecordunitretailcustomer_state, 
                    customrecordrvsunitretailcustomer.custrecordunitretailcustomer_zipcode AS custrecordunitretailcustomer_zipcode, 
                    customrecordrvsunitretailcustomer.custrecordunitretailcustomer_phone AS custrecordunitretailcustomer_phone, 
                    customrecordrvsunitretailcustomer.custrecordunitretailcustomer_cellphone AS custrecordunitretailcustomer_cellphone, 
                    customrecordrvsunitretailcustomer.custrecordunitretailcustomer_email AS custrecordunitretailcustomer_email, 
                    customrecordrvsunitretailcustomer.custrecordunitretailcustomer_retailsold AS custrecordunitretailcustomer_retailsold, 
                    customrecordrvsunitretailcustomer.custrecordunitretailcustomer_dealsalesrp AS custrecordunitretailcustomer_dealsalesrp, 
                    customrecordrvsunitretailcustomer.custrecordunitretailcustomer_dsalesrp2 AS custrecordunitretailcustomer_dsalesrp2, 
                    customrecordrvsunitretailcustomer.custrecordunitretailcustomer_registrcvd AS custrecordunitretailcustomer_registrcvd,
                    transaction.foreigntotal AS foreigntotal, 
                    transaction.transactionnumber AS transactionnumber, 
                    customrecordrvsseries.custrecordgd_aimbasebrandcode AS custrecordgd_aimbasebrandcode 
                    FROM 
                    customrecordrvsunit
                    JOIN customer  ON customrecordrvsunit.custrecordunit_dealer = customer.id
                    JOIN entityaddress ON customer .defaultshippingaddress = entityaddress.nkey
                    JOIN item ON  customrecordrvsunit .custrecordunit_model = item.id
                    JOIN customrecordrvsunitretailcustomer ON customrecordrvsunit.id = customrecordrvsunitretailcustomer .custrecordunitretailcustomer_unit 
                    RIGHT JOIN transaction ON customrecordrvsunit.custrecordunit_salesorder = transaction.id 
                    RIGHT JOIN customrecordrvsseries ON customrecordrvsunit.custrecordunit_series  = customrecordrvsseries.id
                    WHERE
                    customrecordrvsunitretailcustomer.created >= TO_DATE(
                        '${startDateString}', 'MM/DD/YYYY HH:MI AM'
                    ) 
                    AND customrecordrvsunitretailcustomer.created <= TO_DATE(
                        '${endDateString}', 'MM/DD/YYYY HH:MI AM'
                    )
                 `;

                 var registrationInfoResultsData = query.runSuiteQLPaged({query: suiteQLString, pageSize: 1000});
 
                 // var mappedResults = registrationInfoResultsData.asMappedResults();
                 // log.debug('mappedResults', JSON.stringify(mappedResults));
                 registrationInfoResultsData.iterator().each(function (pagedData) {
                     var page = pagedData.value;
                     if (page.data) {
                         page.data.asMappedResults().forEach(function (result) {
                             salesRep1Name = salesRepResults["'" + result['custrecordunitretailcustomer_dealsalesrp'] + "'"] || '';
                             salesRepId = result['custrecordunitretailcustomer_dealsalesrp'] || '';
     
                             salesRep2Name =  salesRepResults["'" + result['custrecordunitretailcustomer_dsalesrp2'] + "'"] || '';
                             salesRep2Id = result['custrecordunitretailcustomer_dsalesrp2'] || '';

                             registrationDate = result['custrecordunitretailcustomer_registrcvd'] || '';

                             stateRecordObject = stateRecordResults["'" + result['custrecordunitretailcustomer_state'] + "'"] || '';
 
                             registrationInfoJSON = {
                                 "IsActive" : true,
                                 "Action" : "A",                 //Required
                                 "SrvyType" : "A",                   //Required
                                 "IsUsed" : "0",
                                 "PurchaseDate" : (new Date(result['custrecordunitretailcustomer_retailsold'])).toJSON(),                    //Required
                                 "SerialNumber" : result['name'],                 //Required
                                 "Dealer" : {
                                     "DealerLocation" : "",
                                     "DealerNumber" : result['entitynumber'],                    //Required
                                     "Name" : (result['companyname'] || '').replace(/"/g, '\"').replace(/'/g, "\'"),                 //Required
                                     "Contact" : "",
                                     "Email" : result['email'],
                                     "Address1" : (result['addr1'] || '').replace(/"/g, '\"').replace(/'/g, "\'"),
                                     "Address2" : (result['addr2'] || '').replace(/"/g, '\"').replace(/'/g, "\'"),
                                     "City" : (result['city'] || '').replace(/"/g, '\"').replace(/'/g, "\'"),
                                     "State" : (result['state'] || '').replace(/"/g, '\"').replace(/'/g, "\'"),
                                     "PostalCode" : result['zip'],
                                     "CountryCode" : result['country'],
                                     "Phone" : result['addrphone'],
                                     "Fax" : result['fax'],
                                     "TollFree" : "",
                                     "District" : "",
                                     "Customs" : []
                                 },
                                 "Product" : {
                                     "Code" : (result['itemid'] || '').replace(/"/g, '\"').replace(/'/g, "\'"),                   //Required
                                     "ModelYear" : result['custitemrvsmodelyear'],
                                     "ModelName" : result['displayname'],
                                     "PlantCode" : "",
                                     "Brand" : result['custrecordgd_aimbasebrandcode'],
                                     "Category" : "",
                                     "Segment" : "",
                                     "Customs" : [
                                                     {
                                                         "FieldName" : "seriesId",
                                                         "FieldValue" : result['custrecordunit_series']
                                                     }
                                     ]
                                 },
                                 "Customer" : {
                                     "CustNumber" : result['internalid'],
                                     "FirstName" : (result['custrecordunitretailcustomer_firstname'] || '').replace(/"/g, '\"').replace(/'/g, "\'"),                 //Required
                                     "LastName" : (result['custrecordunitretailcustomer_lastname'] || '').replace(/"/g, '\"').replace(/'/g, "\'"),                   //Required
                                     "Title" : (result['custrecordunitretailcustomer_title'] || '').replace(/"/g, '\"').replace(/'/g, "\'"),
                                     "Address1" : (result['custrecordunitretailcustomer_address1'] || '').replace(/"/g, '\"').replace(/'/g, "\'"),                   //Required
                                     "Address2" : (result['custrecordunitretailcustomer_address2'] || '').replace(/"/g, '\"').replace(/'/g, "\'"),                   //Required
                                     "City" : (result['custrecordunitretailcustomer_city'] || '').replace(/"/g, '\"').replace(/'/g, "\'"),                   //Required
                                     "State" : stateRecordObject == '' ? '' : stateRecordObject.country.shortname,
                                     "PostalCode" : result['custrecordunitretailcustomer_zipcode'],                  //Required
                                     "CompanyYN" : "N",
                                     "CompanyName" : "",
                                     "CompanyTitle" : "",
                                     "County" : "",
                                     "CountryCode" : stateRecordObject == '' ? '' : stateRecordObject.country,                 //Required
                                     "HomePhone" : result['custrecordunitretailcustomer_phone'],                 //Required
                                     "MobilePhone" : result['custrecordunitretailcustomer_cellphone'],                   //Required
                                     "WorkPhone" : "",
                                     "Fax" : "",
                                     "Email" : result['custrecordunitretailcustomer_email'],                 //Required
                                     "LanguageCode" : "EN",
                                     "EmailRefused" : "0"
                                 },
                                 "Price" : result['foreigntotal'],
                                 "PriceCurrency" : "USD",
                                 "SalesID" : result['transactionnumber'],
                                 "StockNbr" : "",
                                 "RegistrationTypeCode" : "",
                                 "RegistrationSourceCode" : "",
                                 "Customs" : [{
                                         "FieldName" : "salesRepName",
                                         "FieldValue" : (result['custrecordunit_salesrep'] || '')//.replace(/"/g, '\"').replace(/'/g, "\'")
                                     }, {
                                         "FieldName" : "primaryDealerSalesRepName",
                                         "FieldValue" : (salesRep1Name || '')//.replace(/"/g, '\"').replace(/'/g, "\'")
                                     }, {
                                         "FieldName" : "primaryDealerSalesRepId",
                                         "FieldValue" : (salesRepId || '')//.replace(/"/g, '\"').replace(/'/g, "\'")
                                     }, {
                                         "FieldName" : "secondaryDealerSalesRepName",
                                         "FieldValue" : (salesRep2Name || '')//.replace(/"/g, '\"').replace(/'/g, "\'")
                                     }, {
                                         "FieldName" : "secondaryDealerSalesRepId",
                                         "FieldValue" : (salesRep2Id || '')//.replace(/"/g, '\"').replace(/'/g, "\'")
                                     }, {
                                        "FieldName" : "RegistrationDate",
                                        "FieldValue" : (registrationDate || '')
                                     }

                                 ]
                             };
 
                             registrationInfoJSONArray.push(registrationInfoJSON);
                             registrationInfoJSON = {};
 
                         });
                     }
                     return true;
                 });
             } catch (ex) {
                 log.error('error getting data', ex);
                 errorMessage = ex;
                 isSuccess = false;
             }
             return isSuccess ? {status: "Success", data: registrationInfoJSONArray} : {status: "Failure:", error: errorMessage};
         }
         return {status: "Failure: No Records Found"};
     }
 
     /**
      * Function called upon sending a DELETE request to the RESTlet.
      *
      * @param {Object} requestParams - Parameters from HTTP request URL; parameters will be passed into function as an Object (for all supported content types)
      * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
      * @since 2015.2
      */
     const GD_DealerRegistrationDataPullREST_Delete = (requestParams) => {
         return null;
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
         var hours = date.getHours(); //offset for timestamp from EST/EDT to PST/PDT
 
         // Minutes
         var minutes = "0" + date.getMinutes();
 
         // Seconds
         var seconds = "0" + date.getSeconds();
 
         var amOrPm = 'am';
         if (hours > 12) {
             hours -= 12;
             amOrPm = 'pm';
         } else if (hours == 12) {
             amOrPm = 'pm';
         }
         
         // Display date time in MM/dd/yyyy h:m:s format
         var convdataTime = month + '/' + day + '/' + year + ' ' + hours + ':' + minutes.substr(-2) + ' ' + amOrPm;;
 
         return convdataTime;
     }
 
     return {
         get: GD_DealerRegistrationDataPullREST_Get,
         put: GD_DealerRegistrationDataPullREST_Put,
         post: GD_DealerRegistrationDataPullREST_Post,
         'delete': GD_DealerRegistrationDataPullREST_Delete
     };
     
 });
 