// noinspection JSVoidFunctionReturnValueUsed

/**
 * Module Description
 *
 * Version Date Author Remarks 1.0.0 May 27 2016 ekarmanov (BSD) Initial version
 * of scripts after architecture review and redesign
 *
 *
 * This scheduled script pulls OK to Pay invoices from Coupa into NetSuite
 *
 * It contains main business logic. Takes invoices data in XML format by calling
 * Coupa's web service. If response contains data, then it will be processed,
 * otherwise message about empty response will be sent to administrator.
 *
 * ------------------------------------------------------- Change history:
 *
 * June 06 2016 ekarmanov(BSD)  - Fix for calculation of total value
 * June 07 2016 akuznetsov(BSD) - Source code formatting, script functions reorganization
 * June 21 2016 akuznetsov(BSD) - Call to getNontaxable fixed in getAdjLineAmount
 * March 28 2017 akuznetsov(BSD) - Added processing of two new fields:
 *                                 custbody_date_on_invoice into submitRecord function
 *                                 custcol_coupa_po_number into fillExpenses and setHeaderChargesAsExpenseLine function
 * April 06 2017 akuznetsov(BSD) - Add concatenation of PO line number to custcol_coupa_po_number
 * -------------------------------------------------------
 *
 * @requires Invoice_Scheduled_LibraryScript.js <- Supplementary functions
 *
 */
var context = nlapiGetContext();
var envType = context.getEnvironment() === 'PRODUCTION' ? 'prod' : 'sb';
var coupaURL = context.getSetting('SCRIPT', 'custscript_coupa_oidc_client_url_' + envType);

/**
 * Main entry point of the script
 */
function scheduled() {
  var headers = getAPIHeader('text/xml');

  initializeLibrary();
  processApprovedInvoices(coupaURL, headers);
  checkAndProcessVoidInvoices(coupaURL, headers);
  sendExecutionReport();
}

/**
 * Call to Coupa service and call to parsing function
 *
 * @param purl - Coupa's server address
 * @param headers - HTTP headers with bearer token
 */
function processApprovedInvoices(purl, headers) {
  var response = callCoupa(buildURL(purl), headers);
  if (response !== "") {
    parseResponse(response, 1, headers);
  }
}

/**
 * Checks if Void invoices flag is set and if it does then it will download and
 * process voided invoices
 *
 * @param purl - Coupa's server address
 * @param headers - HTTP headers with bearer token
 */
function checkAndProcessVoidInvoices(purl, headers) {
  // check for exported and now voided invoices
  var enable_support_void = context.getSetting(
    "SCRIPT",
    "custscript_supportvoid"
  ); // by default not supported

  if (!enable_support_void) {
    enable_support_void = 0;
  }
  if (enable_support_void === 1) {
    var url = purl + "/api/invoices?exported=false&status=voided";
    var fromDate = context.getSetting("SCRIPT", "custscript_frominvdate");
    if (fromDate) {
      url =
        url +
        "&invoice-date[gt_or_eq]=" +
        convertNetsuiteDateToCoupaDate(fromDate);
    }
    var toInvDateVoid = context.getSetting("SCRIPT", "custscript_toinvdate");
    if (toInvDateVoid) {
      url =
        url +
        "&invoice-date[lt_or_eq]=" +
        convertNetsuiteDateToCoupaDate(toInvDateVoid);
    }
    var responseVoid = callCoupa(url, headers);
    if (responseVoid !== "") {
      parseResponse(responseVoid, 2);
    } else {
      nlapiLogExecution("AUDIT", "Zero voided Coupa Invoices to process");
    }
  }
}

/**
 * Builds up URL based on script's parameters
 *
 * @param purl -
 *            Coupa's server address
 * @returns URL containing all necessary parameters
 */
function buildURL(purl) {
  //var url = purl + "/api/invoices/47169"; super helful for debugging a single bill/credit uncomment this url and comment the entire code afer this until nlapiLogExecution
  var url = purl + "/api/invoices?exported=false&status=approved"; //comment this url for debugging mode
  if (context.getSetting("SCRIPT", "custscript_use_updatedat_date") === "T") {
    var fromUpdateDate = context.getSetting(
      "SCRIPT",
      "custscript_from_updatedat_date"
    );
    if (fromUpdateDate) {
      url =
        url +
        "&updated-at[gt_or_eq]=" +
        convertNetsuiteDateToCoupaDate(fromUpdateDate);
    }
    var toUpdateDate = context.getSetting(
      "SCRIPT",
      "custscript_to_updatedat_date"
    );
    if (toUpdateDate) {
      url =
        url +
        "&updated-at[lt_or_eq]=" +
        convertNetsuiteDateToCoupaDate(toUpdateDate);
    }
  } else {
    var fromInvDate = context.getSetting("SCRIPT", "custscript_frominvdate");
    if (fromInvDate) {
      url =
        url +
        "&invoice-date[gt_or_eq]=" +
        convertNetsuiteDateToCoupaDate(fromInvDate);
    }
    var toInvDate = context.getSetting("SCRIPT", "custscript_toinvdate");
    if (toInvDate) {
      url =
        url +
        "&invoice-date[lt_or_eq]=" +
        convertNetsuiteDateToCoupaDate(toInvDate);
    }
  }
  var limit = context.getSetting("SCRIPT", "custscript_limit");
  if (limit) {
    url = url + "&limit=" + limit;
  }

  var dynamicAccounting = context.getSetting(
    "SCRIPT",
    "custscript_dynamicaccts"
  );
  if (dynamicAccounting == "T") {
    // query for dynamic CoA
    url = url + "&account-type[id]=2";
  } else {
    // query for old CoA
    url = url + "&account-type[id]=1";
  }
  nlapiLogExecution("DEBUG", "Coupa Invoice Request URL", url);

  return url;
}

/**
 * Performs actual call to a Coupa service and returns response object if call
 * was successful
 *
 * @param url
 * @param headers
 * @returns {String}
 */
function callCoupa(url, headers) {
  var response = "";
  try {
    response = nlapiRequestURL(url, null, headers);
  } catch (error) {
    response = "";
    if (error instanceof nlobjError) {
      var errordetails;
      var errorcode = error.getCode();
      if (errorcode === "SSS_REQUEST_TIME_EXCEEDED") {
        errordetails =
          "Connection closed because it has exceed the time out period (NetSuite has not received a response after 5 seconds on initial connection or after 45 seconds on the request).";
      } else {
        errordetails = error.getDetails() + ".";
      }

      nlapiLogExecution(
        "ERROR",
        "Processing Error - Unable to do Coupa request api call to export Invoices",
        "Error Code = " + errorcode + " Error Description = " + errordetails
      );
      nlapiSendEmail(
        106223954,
        context.getSetting("SCRIPT", "custscript_emailaddr_notifications"),
        context.getSetting("SCRIPT", "custscript_acccountname") +
          " Invoice Integration:Processing Error - Unable to do Coupa request api call to export Invoices",
        "Error Code = " + errorcode + " Error Description = " + errordetails
      );
    }
  }
  return response;
}

// Changes XML to JSON (For debugging resonses)
function xmlToJson(xml) {
  // Create the return object
  var obj = {};

  if (xml.nodeType == 1) {
    // element
    // do attributes
    if (xml.attributes.length > 0) {
      obj["@attributes"] = {};
      for (var j = 0; j < xml.attributes.length; j++) {
        var attribute = xml.attributes.item(j);
        obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
      }
    }
  } else if (xml.nodeType == 3) {
    // text
    obj = xml.nodeValue;
  }

  // do children
  if (xml.hasChildNodes()) {
    for (var i = 0; i < xml.childNodes.length; i++) {
      var item = xml.childNodes.item(i);
      var nodeName = item.nodeName;
      if (typeof obj[nodeName] == "undefined") {
        obj[nodeName] = xmlToJson(item);
      } else {
        if (typeof obj[nodeName].push == "undefined") {
          var old = obj[nodeName];
          obj[nodeName] = [];
          obj[nodeName].push(old);
        }
        obj[nodeName].push(xmlToJson(item));
      }
    }
  }
  return obj;
}

/**
 * Parses response body and processes invoices one by one
 *
 * @param response
 * @param state
 * @param headers
 */
function parseResponse(response, state, headers) {
  if (response.getCode() == "200") {
    /*
     * Code snippet for saving response into file,
     * uncomment in SB if required
     */
    /*var oFile = nlapiCreateFile('CoupaResp.xml','PLAINTEXT',response.getBody());
      oFile.setFolder(2242419);
      nlapiSubmitFile(oFile);
      */

    var responseXML = nlapiStringToXML(response.getBody());

    //debug response
    //var jsonText = JSON.stringify(xmlToJson(responseXML));
    //nlapiSendEmail(195305908, 547036, 'testing ns coupa integration XML', jsonText);
    //end debug response

    //CM Debugging XML Response.body
    // var jsonText = JSON.stringify(xmlToJson(responseXML));
    // nlapiSendEmail(
    //   220482054,
    //   220482054,
    //   "testing ns coupa integration XML",
    //   jsonText
    // );
    var invoiceNode = nlapiSelectNode(responseXML, "invoice-headers"); // helpful while debugging comment this line
    var invoiceHeaderNodes = new Array();
    invoiceHeaderNodes = nlapiSelectNodes(invoiceNode, "invoice-header"); // comment this line to debug and uncomment the line below
    //invoiceHeaderNodes = nlapiSelectNodes(responseXML, "invoice-header"); //uncomment
    setInvoicesCount(invoiceHeaderNodes.length);
    var invoiceexists, creditexists;
    for (var i = 0; i < invoiceHeaderNodes.length; i++) {
      var tranid = nlapiSelectValue(invoiceHeaderNodes[i], "invoice-number");
      nlapiLogExecution("DEBUG", "tranid", tranid);
      var externalid = nlapiSelectValue(invoiceHeaderNodes[i], "id");
      var entityid = nlapiSelectValue(invoiceHeaderNodes[i], "supplier/number");

      if (!nlapiSelectValue(invoiceHeaderNodes[i], "supplier/number")) {
        nlapiLogExecution(
          "DEBUG",
          "Cannot create Vendor Bill as Supplier Number not populated in Coupa",
          "Invoice Number = " +
            tranid +
            " Vendor = " +
            nlapiSelectValue(invoiceHeaderNodes[i], "supplier/name") +
            " Coupa Invoice Id = " +
            externalid
        );

        nlapiSendEmail(
          106223954,
          context.getSetting("SCRIPT", "custscript_emailaddr_notifications"),
          context.getSetting("SCRIPT", "custscript_acccountname") +
            " Invoice Integration:Processing Error - Cannot create Vendor Bill as Supplier Number not populated in Coupa",
          "Invoice Number = " +
            tranid +
            " Vendor = " +
            nlapiSelectValue(invoiceHeaderNodes[i], "supplier/name")
        );

        continue;
      } else if (!nlapiSelectValue(invoiceHeaderNodes[i], "payment-channel")) {
        nlapiLogExecution(
          "DEBUG",
          "Cannot create Vendor Bill as Payment Channel not populated in Coupa",
          "Invoice Number = " +
            tranid +
            " Vendor = " +
            nlapiSelectValue(invoiceHeaderNodes[i], "supplier/name") +
            " Coupa Invoice Id = " +
            externalid
        );

        nlapiSendEmail(
          106223954,
          context.getSetting("SCRIPT", "custscript_emailaddr_notifications"),
          context.getSetting("SCRIPT", "custscript_acccountname") +
            " Invoice Integration:Processing Error - Cannot create Vendor Bill as Payment Channel not populated in Coupa",
          "Invoice Number = " +
            tranid +
            " Vendor = " +
            nlapiSelectValue(invoiceHeaderNodes[i], "supplier/name")
        );
      }
      nlapiLogExecution(
        "DEBUG",
        "Processing Coupa Invoice",
        "Invoice Number = " +
          tranid +
          " Vendor = " +
          nlapiSelectValue(invoiceHeaderNodes[i], "supplier/name") +
          " Coupa Invoice Id = " +
          externalid
      );

      invoiceexists = isVendorBillExists(tranid, externalid, entityid);
      nlapiLogExecution("DEBUG", "invoiceexists", invoiceexists);
      creditexists = isVendorCreditExists(tranid, externalid, entityid);
      if (
        invoiceexists === "false" &&
        creditexists === "false" &&
        state === 1
      ) {
        createVendorBillOrCredit(invoiceHeaderNodes[i]);
      } else if (
        (invoiceexists != "false" || creditexists != "false") &&
        state === 1
      ) {
        nlapiLogExecution(
          "DEBUG",
          "Transaction Exists in NS",
          "invoice exists: " +
            invoiceexists +
            ", credit exists: " +
            creditexists
        );
        updateVendorBillOrCredit(
          invoiceHeaderNodes[i],
          invoiceexists,
          creditexists
        );
      } else {
        nlapiLogExecution(
          "DEBUG",
          "Cannot create Vendor " +
            (invoiceexists !== "false" ? "Bill" : "Credit") +
            " as it already exists in Netsuite",
          "Invoice Number = " +
            tranid +
            " Vendor = " +
            nlapiSelectValue(invoiceHeaderNodes[i], "supplier/name") +
            " Coupa Invoice Id = " +
            externalid +
            " Netsuite Vendor Bill id = " +
            invoiceexists
        );
      }
      if (
        (invoiceexists !== "false" || creditexists !== "false") &&
        state === 2
      ) {
        VoidVendorBill(
          invoiceHeaderNodes[i],
          invoiceexists !== "false" ? invoiceexists : creditexists
        );
      } else {
        //				nlapiLogExecution('DEBUG',
        //						'Invoice does not exist in Netsuite',
        //						'Invoice Number = '
        //								+ tranid
        //								+ ' Vendor = '
        //								+ nlapiSelectValue(invoiceHeaderNodes[i],
        //										'supplier/name')
        //								+ ' Coupa Invoice Id = ' + externalid);
      }
    }
  }
}

/**
 * Identifies type of invoice and creates appropriate document - Vendor Bill or
 * Vendor Credit
 *
 * @param invoice
 */
function createVendorBillOrCredit(invoice) {
  var bill = false;
  var credit = false;
  var invoicetotal = 0;
  var dtVendorCredit = "vendorcredit";
  var dtVendorBill = "vendorbill";
  var invoiceLine;
  invoiceLine = nlapiSelectNode(invoice, "invoice-lines");
  var invoiceLineNodes = new Array();
  invoiceLineNodes = nlapiSelectNodes(invoiceLine, "invoice-line");

  // by default option is 2 - meaning that only one document should be created
  var creditMemoOption = 2;
  var invoiceXmlTotal;
  // Initial calculations for further business logic
  for (var x = 0; x < invoiceLineNodes.length; x++) {
    invoiceXmlTotal = parseFloat(
      nlapiSelectValue(invoiceLineNodes[x], "total")
    );
    invoicetotal = invoicetotal + invoiceXmlTotal;

    // Get type of possible docs if creditMemoOption will be set to 1
    if (invoiceXmlTotal < 0) {
      credit = true;
    } else {
      bill = true;
    }
  }

  /**
   * This parameter with value = 1 can switch BL to create two documents
   * instead of one. Depending on positive or negative amount of invoice line
   * there can be situation when two documents will be created, for example:
   * invoice contains three lines - one with negative amount and two with
   * positive in that case if custscript_creditmemooption will be set as 1,
   * two documents can be created
   *
   * NOTE ! This parameter is not used in current RAPID7's instance
   */
  var paramCreditMemoOption = context.getSetting(
    "SCRIPT",
    "custscript_creditmemooption"
  );
  if (paramCreditMemoOption) {
    creditMemoOption = paramCreditMemoOption;
  }

  /**
   * Look for document type checking
   *
   * NOTE ! This parameter is not used in current RAPID7's instance
   */
  var documentType = context.getSetting("SCRIPT", "custscript_documenttype");
  if (documentType && documentType === "T") {
    var invoiceType = nlapiSelectValue(invoice, "document-type");

    if (invoiceType === "Credit Note") {
      /**
       * Strictly set to create Vendor Credit not looking at invoice total
       * amount
       */
      credit = true;
      bill = false;
      creditMemoOption = 1;
    }
  }

  /**
   * OLD release - not so good programming style
   */
  // if (creditMemoOption == 1) {
  // if (bill == true)
  // CreateVendorBill(invoice);
  // if (credit == true)
  // CreateVendorCredit(invoice);
  // } else if (creditMemoOption == 2) {
  // if (invoicetotal >= 0) {
  // // nlapiLogExecution('DEBUG', 'creating vendor bill ', 'amount = ' +
  // // invoicetotal );
  // CreateVendorBill(invoice);
  // } else {
  // // nlapiLogExecution('DEBUG', 'creating vendor credit ', 'amount =
  // // '+ invoicetotal );
  // CreateVendorCredit(invoice);
  // }
  // }
  /**
   * New implementation
   */
  switch (creditMemoOption) {
    case 1: {
      /**
       * Two documents can be created depending on script's parameters
       *
       * NOTE ! This code is unreachable in current RAPID7's instance since
       * creditMemoOption never set to 1
       */
      if (bill === true) {
        createDocument(invoice, dtVendorBill);
      }
      if (credit === true) {
        createDocument(invoice, dtVendorCredit);
      }
      break;
    }
    case 2: {
      createDocument(invoice, invoicetotal > 0 ? dtVendorBill : dtVendorCredit);
      break;
    }
    default: {
      break;
    }
  }
}

/**
 * When Invoice was imported successfully this function will call Coupa's
 * service to indicate Invoice as Exported, so it will not be processed in
 * future
 */
function setInvoiceAsExported(id) {
  var headers = getAPIHeader('text/xml');

  var url =
    coupaURL + "/api/invoices/" + id;
  var postData =
    "<?xml version='1.0' encoding='UTF-8'?><invoice-header><exported type='boolean'>true</exported></invoice-header>";
  var response = "";
  var iTimeOutCnt = 0;
  // loop start
  for (var k = 0; k < 1; k++) {
    // try start
    try {
      response = nlapiRequestURL(url, postData, headers, "PUT");
    } catch (error) {
      if (error instanceof nlobjError) {
        var errordetails;
        errorcode = error.getCode();
        switch (errorcode) {
          case "SSS_REQUEST_TIME_EXCEEDED":
            if (iTimeOutCnt > 2) {
              errordetails =
                "Connection closed because it has exceed the time out period (NetSuite has not received a response after 5 seconds on initial connection or after 45 seconds on the request). tried to establish connection 3 times and still failed. Please contact Technical Support.";
              exit = true;
              break;
            } else {
              errordetails =
                "Connection closed because it has exceed the time out period (NetSuite has not received a response after 5 seconds on initial connection or after 45 seconds on the request). retrying to establish a connection.";
              iTimeOutCnt = iTimeOutCnt + 1;
              k = 0;
              break;
            }
          default:
            errordetails = error.getDetails() + ".";
            exit = true;
            break;
        }
        nlapiLogExecution(
          "ERROR",
          "Processing Error - Unable to set export flag",
          " Coupa Invoice Id = " +
            id +
            " Error code:" +
            errorcode +
            "Error description:" +
            errordetails
        );
        nlapiSendEmail(
          106223954,
          context.getSetting("SCRIPT", "custscript_emailaddr_notifications"),
          context.getSetting("SCRIPT", "custscript_acccountname") +
            " Invoice Integration:Processing Error - Unable to set export flag",
          "Unable to set export flag - Coupa Invoice Id = " +
            id +
            " Error code:" +
            errorcode +
            "Error description:" +
            errordetails
        );
      }
    } // catch end
  } // loop end
  if (response.getCode() != "200") {
    nlapiLogExecution(
      "ERROR",
      "Processing Error - Unable to set export flag",
      " Coupa Invoice Id = " + id
    );
    nlapiSendEmail(
      106223954,
      context.getSetting("SCRIPT", "custscript_emailaddr_notifications"),
      context.getSetting("SCRIPT", "custscript_acccountname") +
        " Invoice Integration:Processing Error - Unable to set export flag",
      "Unable to set export flag - Coupa Invoice Id = " + id
    );
  }
}

/**
 * Performs actual document creation based on document type
 *
 * @param invoice -
 *            Invoice Node from XML
 * @param documentType -
 *            document type, can be vendorbill or vendorcredit
 */
function createDocument(invoice, documentType) {
  var record;
  if (documentType === "vendorbill") {
    record = createVendorBillRecord(invoice, record);
  } else if (documentType === "vendorcredit") {
    var customFormId = getCustomFormId(invoice, 'credit');
    nlapiLogExecution('debug', 'customCreditFormId', JSON.stringify(customFormId));

    var createOptions = { recordmode: 'dynamic' };
    if (customFormId) {
      createOptions.customform = customFormId;
    }

    nlapiLogExecution('debug', 'createOptions', JSON.stringify(createOptions));
    record = nlapiCreateRecord('vendorcredit', createOptions);
  }
  var lineleveltaxation = "false";
  lineleveltaxation = nlapiSelectValue(invoice, "line-level-taxation");

  var supplierNode = nlapiSelectNode(invoice, "supplier");

  if (nlapiSelectValue(supplierNode, "number")) {
    try {
      record.setFieldValue("entity", nlapiSelectValue(supplierNode, "number"));
    } catch (e) {
      record.setFieldText("entity", nlapiSelectValue(supplierNode, "name"));
    }
  } else {
    // try setting supplier name instead on id
    record.setFieldText("entity", nlapiSelectValue(supplierNode, "name"));
  }

  var paymentChannel = nlapiSelectValue(invoice, "payment-channel");

  if (paymentChannel && documentType == "vendorbill") {
    if (paymentChannel === "erp") {
      record.setFieldValue("paymenthold", "F");
    } else if (paymentChannel === "coupapay_invoice_payment") {
      record.setFieldValue("paymenthold", "T");
    }
  }

  var shippingamount = parseFloat(nlapiSelectValue(invoice, "shipping-amount"));
  var handlingamount = parseFloat(nlapiSelectValue(invoice, "handling-amount"));
  var taxamount = parseFloat(nlapiSelectValue(invoice, "tax-amount"));
  var miscamount = parseFloat(nlapiSelectValue(invoice, "misc-amount"));
  var headersValues = getHeadersTotals(
    documentType,
    shippingamount,
    handlingamount,
    miscamount,
    taxamount,
    lineleveltaxation
  );
  var headercharges;
  if (documentType === "vendorbill") {
    headercharges = headersValues.headercharges;
  }
  var totalheadercharges = headersValues.totalheadercharges;
  var totalheaderchargesNoTax = headersValues.totalheaderchargesNoTax;
  var invoiceLine = nlapiSelectNode(invoice, "invoice-lines");
  var invoiceLineNodes = new Array();
  invoiceLineNodes = nlapiSelectNodes(invoiceLine, "invoice-line");
  //nlapiLogExecution('DEBUG', 'invoiceLineNodes',invoiceLineNodes);
  var invoiceTax = nlapiSelectNode(invoice, "tax-lines");
  var invoiceTaxLineNodes = new Array();
  invoiceTaxLineNodes = nlapiSelectNodes(invoiceTax, "tax-line");

  var totals = getTotalAmounts(totalheadercharges, invoiceLineNodes);
  var totalamount = totals.totalamount;
  var taxabletotalamount = totals.taxabletotalamount;
  var totalheaderamount = totals.totalheaderamount;

  //	nlapiLogExecution('DEBUG', 'Other Charges', 'Shipping = ' + shippingamount
  //			+ ' Handling = ' + handlingamount + ' Taxamount = ' + taxamount
  //			+ ' miscamount = ' + miscamount + ' totalheadercharges = '
  //			+ totalheadercharges + ' totalheaderamount = ' + totalheaderamount
  //			+ ' totalamount = ' + totalamount);

  var totalcalcamount = 0;
  if (
    mainLoop(
      documentType,
      invoiceLineNodes,
      invoiceTaxLineNodes,
      record,
      totalheaderamount,
      taxabletotalamount,
      totalheadercharges,
      totalheaderchargesNoTax,
      invoice,
      supplierNode,
      lineleveltaxation,
      totalcalcamount,
      headercharges
    )
  ) {
    submitRecord(record, documentType, invoice, supplierNode);
  }
}

/**
 * Fills in additional fields data, submit's record to database and calls
 * setInvoiceAsExported to mark Invoice as exported
 *
 * @param record
 * @param documentType
 * @param invoice
 * @param supplierNode
 */
function submitRecord(record, documentType, invoice, supplierNode) {
  try {
    var lineTypeCount;
    var linetype;
    if (documentType === "vendorbill") {
      lineTypeCount = "custscript_customfield_header_count";
      linetype = "custscript_custfieldheader";
      record.setFieldValue(
        "externalid",
        "Coupa-VendorBill " + nlapiSelectValue(invoice, "id")
      );
      var paymentTermNode = nlapiSelectNode(invoice, "payment-term");
      var terms;
      if (paymentTermNode) {
        terms = getNetsuiteTermId(nlapiSelectValue(paymentTermNode, "code"));
      } else terms = getNetsuiteTermId("Net 30");
      record.setFieldValue("terms", terms);
      // add link back to invoice in Coupa
      var coupaInvoiceLink = context.getSetting(
        "SCRIPT",
        "custscript_coupainvoice_link_field"
      );
      if (coupaInvoiceLink) {
        record.setFieldValue(
          coupaInvoiceLink,
          coupaURL +
            "/invoices/" +
            nlapiSelectValue(invoice, "id")
        );
      }

      // add link back to invoiceimagescan in Coupa
      var coupaInvoiceImage = context.getSetting(
        "SCRIPT",
        "custscript_coupainvoiceimage_link_field"
      );
      var imagescan = nlapiSelectValue(invoice, "image-scan");
      if (coupaInvoiceImage && imagescan) {
        // first get the correct url
        imagescan = imagescan.split("/");
        var imagescanurl =
          coupaURL +
          "/invoice/" +
          nlapiSelectValue(invoice, "id") +
          "/image_scan/" +
          imagescan[5];
        record.setFieldValue(coupaInvoiceImage, imagescanurl);
      }
    } else if (documentType === "vendorcredit") {
      lineTypeCount = "custscript_customfield_crdt_header_count";
      linetype = "custscript_custfield_crdt_header";
      record.setFieldValue(
        "externalid",
        "Coupa-VendorCredit-" + nlapiSelectValue(invoice, "id")
      );
    }

    record.setFieldValue(
      "trandate",
      convertCoupaDateToNetSuiteDate(nlapiSelectValue(invoice, "invoice-date"))
    );

    var sDateOnInvoice = nlapiSelectValue(invoice, "date-printed-on-invoice");
    if (
      sDateOnInvoice !== undefined &&
      sDateOnInvoice !== null &&
      sDateOnInvoice !== ""
    ) {
      record.setFieldValue(
        "custbody_date_on_invoice",
        convertCoupaDateToNetSuiteDate(sDateOnInvoice)
      );
    } else {
      nlapiLogExecution(
        "AUDIT",
        "submitRecord",
        "Document with ID = " +
          nlapiSelectValue(invoice, "id") +
          ". Date printed on invoice is empty."
      );
    }

    var curr = getNetsuiteCurrency(
      "currency",
      nlapiSelectValue(invoice, "currency/code")
    );
    record.setFieldValue("currency", curr);

    var actPayableNum = context.getSetting(
      "SCRIPT",
      "custscript_actpayablenum"
    );
    if (actPayableNum) {
      var apAccountId = getNetsuiteAccountId(actPayableNum);
      if (apAccountId != "INVALID_ACCOUNT")
        record.setFieldValue("account", apAccountId);
    }
    var today = new Date();
    var postingPeriod =
      getMonthShortName(today.getMonth()) + " " + today.getFullYear();
    var cutoffday = 5;
    cutoffday = context.getSetting("SCRIPT", "custscript_cutoffdate");
    if (today.getDate() < cutoffday) {
      var nDate = nlapiSelectValue(invoice, "invoice-date").split("T");
      var datesplit = nDate[0].split("-");
      var Nyear = datesplit[0];
      // var Nday = datesplit[2];
      var Nmonth = datesplit[1] - 1;

      if (today.getFullYear() > Nyear) {
        if (today.getMonth() == 0)
          postingPeriod =
            getMonthShortName("11") + " " + (today.getFullYear() - 1);
        else
          postingPeriod =
            getMonthShortName(today.getMonth() - 1) + " " + today.getFullYear();
      }
      if (Nmonth < today.getMonth() && Nyear == today.getFullYear()) {
        postingPeriod =
          getMonthShortName(today.getMonth() - 1) + " " + today.getFullYear();
      }
    }
    var postingPeriodId = getAccoutingPeriodNetsuiteId(
      "accountingperiod",
      postingPeriod
    );
    record.setFieldValue("postingperiod", postingPeriodId);
    record.setFieldValue("tranid", nlapiSelectValue(invoice, "invoice-number"));
    record.setFieldText("approvalstatus", "Approved");
    var headerCount = context.getSetting("SCRIPT", lineTypeCount);
    if (headerCount) {
      for (var y = 1; y <= headerCount; y++) {
        var headerFields = context.getSetting("SCRIPT", linetype + y);
        if (headerFields) {
          var custfield;
          var valuetoinsert = "None";
          var textOrValue;
          if (headerFields.split(":")) {
            custfield = headerFields.split(":");

            if (custfield[4]) {
              valuetoinsert = custfield[4];
            } else {
              if (nlapiSelectValue(invoice, custfield[0])) {
                valuetoinsert = nlapiSelectValue(invoice, custfield[0]);
              }
              if (custfield[2] && nlapiSelectValue(invoice, custfield[0])) {
                if (custfield[2] == "Date") {
                  valuetoinsert = convertCoupaDateToNetSuiteDate(
                    nlapiSelectValue(invoice, custfield[0])
                  );
                }
                if (custfield[2] == "Lookup") {
                  valuetoinsert = nlapiSelectValue(
                    invoice,
                    custfield[0] + "/external-ref-num"
                  );
                }
              }
            }

            textOrValue = "Text";
            if (custfield[3]) {
              textOrValue = custfield[3];
            }
            //						nlapiLogExecution('DEBUG', 'Credit Header CustomField'
            //								+ ' ' + y, " custfield0 = " + custfield[0]
            //								+ " custfield1 = " + custfield[1]
            //								+ " custfield2 = " + custfield[2]
            //								+ " custfield3 = " + custfield[3]
            //								+ " valuetoinsert = " + valuetoinsert);

            if (valuetoinsert && valuetoinsert != "None") {
              if (textOrValue == "Text") {
                record.setFieldText(custfield[1], valuetoinsert);
              } else {
                record.setFieldValue(custfield[1], valuetoinsert);
              }
            }
          }
        }
      }
    }

    var comparison = getTransactionComparison(invoice, record);
    if (comparison.hasDifference && !comparison.exceedsThreshold) {
      addAdjustmentLine(record, comparison.difference);
    }

    var transactionId = nlapiSubmitRecord(record, false, true);

    if (comparison.hasDifference && comparison.exceedsThreshold) {
      sendThresholdEmailNotification(record, transactionId, comparison);
    }

    countSuccesInvoices(1);
    setInvoiceAsExported(nlapiSelectValue(invoice, "id"));
  } catch (e) {
    logErrorMessage(
      nlapiSelectValue(invoice, "invoice-number"),
      nlapiSelectValue(supplierNode, "name"),
      documentType,
      e
    );
  }
}

function getTransactionComparison(invoiceXml, transaction) {
  var threshold = Number(context.getSetting("SCRIPT", "custscript_discrepancy_threshold")) || 0;
  var coupaTotal = Math.abs(Number(nlapiSelectValue(invoiceXml, 'gross-total')));
  var netsuiteTotal = Number(transaction.getFieldValue('total'));
  var difference = Number((coupaTotal - netsuiteTotal).toFixed(2));

  nlapiLogExecution('debug', 'values', JSON.stringify([threshold, coupaTotal, netsuiteTotal, difference]));

  return {
    difference: difference,
    threshold: threshold,
    hasDifference: !!difference,
    exceedsThreshold: Math.abs(difference) > threshold
  };
}

function addAdjustmentLine(transaction, difference) {
  var account = transaction.getLineItemValue('expense', 'account', 1);
  var department = transaction.getLineItemValue('expense', 'department', 1);
  var location = transaction.getLineItemValue('expense', 'location', 1);

  transaction.selectNewLineItem('expense');
  transaction.setCurrentLineItemValue('expense', 'account', account);
  transaction.setCurrentLineItemValue('expense', 'department', department);
  transaction.setCurrentLineItemValue('expense', 'location', location);
  transaction.setCurrentLineItemValue('expense', 'memo', 'Adjustment for rounding');
  transaction.setCurrentLineItemValue('expense', 'amount', difference);

  transaction.commitLineItem('expense');
  nlapiLogExecution('debug', 'adjustment line', 'adjustment line added');
}

function sendThresholdEmailNotification(transaction, transactionId, comparison) {
  // Adding a try/catch here so an email failure doesn't trigger the catch higher up
  // which would indicate that creating the bill failed even though it was successfully
  // created at this point.
  try {
    var recipients = context.getSetting('SCRIPT', 'custscript_discrepancy_notif_email');
    if (!recipients) {
      return;
    }

    var documentNumber = transaction.getFieldValue('tranid');
    var netsuiteAdmin = 106223954;
    var subject = 'Invoice ' + documentNumber + ' Invoice Integration:Processing Error - Variance Threshold Violation';
    var records = { transaction: transactionId };

    var body = 'Vendor bill ' + documentNumber + ' from Coupa has a variance of ' + comparison.difference + ' which exceeds the ' +
        'defined threshold of ' + comparison.threshold;

    nlapiSendEmail(netsuiteAdmin, recipients, subject, body, null, null, records);
    nlapiLogExecution('debug', 'email sent', 'Threshold exceeded email sent to ' + recipients);
  } catch (ex) {
    nlapiLogExecution('error', 'Error sending email', 'Unable to send threshold violation email: ' + ex.message);
  }
}

/**
 * Creates VendorBill object of vendorbill record type
 *
 * @param invoice
 * @param record
 * @returns
 */
function createVendorBillRecord(invoice, record) {
    var customFormId = getCustomFormId(invoice);
    nlapiLogExecution('debug', 'customFormId', JSON.stringify(customFormId));

    var createOptions = { recordmode: 'dynamic' };
    if (customFormId) {
      createOptions.customform = customFormId;
    }

    return nlapiCreateRecord('vendorbill', createOptions);
}

function getCustomFormId(invoice, transactionType) {
  transactionType = transactionType || 'bill';
  var transactionFormConfigParameter = transactionType === 'bill'
      ? 'custscript_vendorbillformconfig'
      : 'custscript_vendorcreditformconfig';

  var transactionFormConfig = context.getSetting('SCRIPT', transactionFormConfigParameter);
  var subsidiaryNodeName = context.getSetting('SCRIPT', 'custscript_subsseg');

  // Get the Subsidiary ID from the account node on the first line item
  var subsidiaryId = nlapiSelectValue(invoice, 'invoice-lines/*[1]/account/' + subsidiaryNodeName);
  nlapiLogExecution('debug', 'subsidiaryId', JSON.stringify(subsidiaryId));

  // 'Rapid7' or 'DynRapid7'.  Should always be 'DynRapid7' now as 'Rapid7' should have been retired
  var accountingType = nlapiSelectValue(invoice, 'account-type/name');
  nlapiLogExecution('debug', 'accountingType', JSON.stringify(accountingType));

  // Convert the parameter value 'Rapid7-112:24-214' into an object { Rapid7: 112, '24': 214 }
  var vendorFormMap = transactionFormConfig.split(':').filter(Boolean).reduce(function(accumulator, formIdPair) {
        formIdPair = formIdPair.split('-');
        var formKey = formIdPair[0];
        var formId = formIdPair[1];

        accumulator[formKey] = formId;

        return accumulator;
      }, {});
  nlapiLogExecution('debug', 'vendorFormMap', JSON.stringify(vendorFormMap));
  nlapiLogExecution('debug', 'vendorFormMap[subsidiaryId]', JSON.stringify(vendorFormMap[subsidiaryId]));
  nlapiLogExecution('debug', 'vendorFormMap[accountingType]', JSON.stringify(vendorFormMap[accountingType]));

  return vendorFormMap[subsidiaryId] || vendorFormMap[accountingType];
}

/**
 * Peforms single step in a loop through all Invoice items
 *
 * @param documentType
 * @param invoiceLineNodes
 * @param invoiceTaxLineNodes
 * @param record
 * @param totalheaderamount
 * @param taxabletotalamount
 * @param totalheadercharges
 * @param invoice
 * @param supplierNode
 * @param lineleveltaxation
 * @param totalcalcamount
 * @param headercharges
 * @returns {Boolean}
 */
function mainLoop(
  documentType,
  invoiceLineNodes,
  invoiceTaxLineNodes,
  record,
  totalheaderamount,
  taxabletotalamount,
  totalheadercharges,
  totalheaderchargesNoTax,
  invoice,
  supplierNode,
  lineleveltaxation,
  totalcalcamount,
  headercharges
) {
  var sendTaxcode;
  sendTaxcode = context.getSetting("SCRIPT", "custscript_send_taxcode");
  for (var x = 0; x < invoiceLineNodes.length; x++) {
    if (x === 0) {
      if (nlapiSelectValue(invoiceLineNodes[x], "description"))
        record.setFieldValue(
          "memo",
          nlapiSelectValue(invoiceLineNodes[x], "description")
        );
    }
    var linetax = 0;
    if (documentType === "vendorbill") {
      if (sendTaxcode === "F") {
        linetax = parseFloat(
          nlapiSelectValue(invoiceLineNodes[x], "tax-amount")
        );
        if (linetax)
          totalheaderamount =
            parseFloat(totalheaderamount) + parseFloat(linetax);
      }
    } else if (documentType === "vendorcredit") {
      linetax = parseFloat(nlapiSelectValue(invoiceLineNodes[x], "tax-amount"));
      if (linetax)
        totalheaderamount = parseFloat(totalheaderamount) + parseFloat(linetax);
    }
    var invoicelineamount = parseFloat(
      nlapiSelectValue(invoiceLineNodes[x], "total")
    );
    if (
      !setAccountAllocations(
        documentType,
        record,
        invoiceLineNodes[x],
        linetax,
        taxabletotalamount,
        totalheadercharges,
        totalheaderchargesNoTax,
        invoicelineamount,
        x,
        totalheaderamount,
        lineleveltaxation,
        invoice,
        supplierNode,
        lineleveltaxation,
        totalcalcamount,
        headercharges
      )
    ) {
      return false;
    }
  }

  for (var x = 0; x < invoiceTaxLineNodes.length; x++) {
    if (
      !setTaxLines(
        documentType,
        record,
        invoiceTaxLineNodes[x],
        linetax,
        taxabletotalamount,
        totalheadercharges,
        totalheaderchargesNoTax,
        invoicelineamount,
        x,
        totalheaderamount,
        lineleveltaxation,
        invoice,
        supplierNode,
        lineleveltaxation,
        totalcalcamount,
        headercharges
      )
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Fills in item with data
 *
 * @param documentType
 * @param record
 * @param invoiceLineNodes
 * @param linetax
 * @param taxabletotalamount
 * @param totalheadercharges
 * @param invoicelineamount
 * @param x
 * @param totalheaderamount
 * @param lineleveltaxation
 * @param invoice
 * @param supplierNode
 * @param lineleveltaxation
 * @param totalcalcamount
 * @param headercharges
 * @returns {Boolean}
 */
function setAccountAllocations(
  documentType,
  record,
  invoiceLineNodes,
  linetax,
  taxabletotalamount,
  totalheadercharges,
  totalheaderchargesNoTax,
  invoicelineamount,
  x,
  totalheaderamount,
  lineleveltaxation,
  invoice,
  supplierNode,
  lineleveltaxation,
  totalcalcamount,
  headercharges
) {
  var dynamicAccounting = context.getSetting(
    "SCRIPT",
    "custscript_dynamicaccts"
  );
  dynamicAccounting = dynamicAccounting ? dynamicAccounting : "F";
  var actalloc = nlapiSelectNode(invoiceLineNodes, "account-allocations");
  var accountallocations = new Array();
  accountallocations = nlapiSelectNodes(actalloc, "account-allocation");
  var splitaccounting = accountallocations.length >= 1 ? true : false;

  //nlapiLogExecution('DEBUG', 'accountallocations',accountallocations);
  nlapiLogExecution("DEBUG", "splitaccounting", splitaccounting);

  var adjlineamount;
  var splitlinetax;
  if (splitaccounting) {
    for (var i = 0; i < accountallocations.length; i++) {
      var accountNode = nlapiSelectNode(accountallocations[i], "account");
      if (x === 0 && i === 0) {
        if (
          !setSubsidiary(
            record,
            accountNode,
            invoice,
            supplierNode,
            documentType
          )
        ) {
          return false;
        }
      }
      var lineamount = parseFloat(
        nlapiSelectValue(accountallocations[i], "amount")
      );
      var recordSubsidiary = record.getFieldValue("subsidiary");
      //check subsidiary. We don't add tax to line in non LLC, taxes are added in separate line
      nlapiLogExecution("DEBUG", "check Subsidiary", recordSubsidiary);
      var linecharge = (parseFloat(lineamount) / parseFloat(taxabletotalamount)) * totalheaderchargesNoTax;
      linetax = recordSubsidiary != 1 && recordSubsidiary != 19 ? 0 : linetax;
      if (linetax) {
        splitlinetax =
          (parseFloat(lineamount) / parseFloat(invoicelineamount)) * linetax;
      }
      var result = getAdjLineAmount(
        splitaccounting,
        record,
        documentType,
        linetax,
        lineamount,
        linecharge,
        splitlinetax,
        invoiceLineNodes,
        lineleveltaxation,
        totalheaderamount,
        invoicelineamount
      );
      adjlineamount = result.adjlineamount;
      totalheaderamount = result.totalheaderamount;
      if (
        !fillExpenses(
          documentType,
          record,
          accountNode,
          dynamicAccounting,
          invoice,
          supplierNode,
          lineleveltaxation,
          invoiceLineNodes,
          totalcalcamount,
          adjlineamount,
          accountallocations[i],
          totalheaderamount,
          x,
          i,
          linecharge
        )
      ) {
        return false;
      }
      if (documentType === "vendorbill") {
        if (
          headercharges &&
          context.getSetting("SCRIPT", "custscript_send_taxcode") &&
          context.getSetting("SCRIPT", "custscript_send_taxcode") == "T"
        ) {
          setHeaderChargesAsExpenseLine(
            record,
            invoice,
            invoiceLineNodes,
            linecharge.toFixed(2),
            nlapiSelectNode(accountallocations[i], "account"),
            true
          );
        }
      }
    }
  } else {
    var lineamount = parseFloat(nlapiSelectValue(invoiceLineNodes, "total"));
    var accountNode = nlapiSelectNode(invoiceLineNodes, "account");
    if (x === 0) {
      if (
        !setSubsidiary(record, accountNode, invoice, supplierNode, documentType)
      ) {
        return false;
      }
    }
    var recordSubsidiary = record.getFieldValue("subsidiary");
    //check subsidiary. We don't add tax to line in non LLC, taxes are added in separate line
    nlapiLogExecution("DEBUG", "check Subsidiary 2", recordSubsidiary);
    // var linecharge = (recordSubsidiary != 1 && recordSubsidiary != 19)?(parseFloat(lineamount) / parseFloat(taxabletotalamount))
    // 			* totalheaderchargesNoTax:(parseFloat(lineamount) / parseFloat(taxabletotalamount))
    // 			* totalheadercharges;
    // https://issues.corp.rapid7.com/browse/APPS-12245 fix (since taxes aparently are allocated with another process, we apply only non taxable non taxes (shipping, ect), regardless of the processes subsidiary)
    var linecharge =
      (parseFloat(lineamount) / parseFloat(taxabletotalamount)) *
      totalheaderchargesNoTax;

    linetax = recordSubsidiary != "1" && recordSubsidiary != "19" ? 0 : linetax;
    nlapiLogExecution("DEBUG", "linetax before get adjlineamount", linetax);
    var result = getAdjLineAmount(
      splitaccounting,
      record,
      documentType,
      linetax,
      lineamount,
      linecharge,
      splitlinetax,
      invoiceLineNodes,
      lineleveltaxation,
      totalheaderamount,
      invoicelineamount
    );
    adjlineamount = result.adjlineamount;
    totalheaderamount = result.totalheaderamount;
    //nlapiLogExecution('DEBUG', 'adjlineamount',adjlineamount);
    //nlapiLogExecution('DEBUG', 'totalheaderamount',totalheaderamount);
    if (
      !fillExpenses(
        documentType,
        record,
        accountNode,
        dynamicAccounting,
        invoice,
        supplierNode,
        lineleveltaxation,
        invoiceLineNodes,
        totalcalcamount,
        adjlineamount,
        null,
        totalheaderamount,
        x,
        null,
        linecharge
      )
    ) {
      return false;
    }
    if (documentType === "vendorbill") {
      if (
        headercharges &&
        context.getSetting("SCRIPT", "custscript_send_taxcode") &&
        context.getSetting("SCRIPT", "custscript_send_taxcode") == "T"
      ) {
        setHeaderChargesAsExpenseLine(
          record,
          invoice,
          invoiceLineNodes,
          linecharge.toFixed(2),
          nlapiSelectNode(accountallocations[i], "account"),
          false
        );
      }
    }
  }
  return true;
}

function allocateTaxeAcrossLines(
  vendorBillRecord,
  totalTax,
  supplierNode,
  documentType,
  invoice,
  totalheaderamount
) {
  try {
    if (documentType === "vendorbill" || documentType === "vendorcredit") {
      var countLines = vendorBillRecord.getLineItemCount("expense");
      nlapiLogExecution("DEBUG", "countLines!", countLines);

      for (var g = 1; g <= countLines; g++) {
        vendorBillRecord.selectLineItem("expense", g);
        var locId = vendorBillRecord.getCurrentLineItemValue(
          "expense",
          "location"
        );
        var taxTreatment = nlapiLookupField(
          "location",
          locId,
          "custrecord_allocation_vendor_bill_tax"
        );

        nlapiLogExecution(
          "DEBUG",
          locId + " taxTreatment " + taxTreatment,
          vendorBillRecord.getCurrentLineItemValue("expense", "amount")
        );

        //var amountLine;
        if (Number(totalTax) > 0 && taxTreatment == 1) {
          var amountOld = vendorBillRecord.getCurrentLineItemValue(
            "expense",
            "amount"
          );
          nlapiLogExecution("DEBUG", "amountOld", amountOld);
          var coefficient = Number(totalTax) / Number(totalheaderamount);
          var taxAddAmount = Number(amountOld) * Number(coefficient);
          var amountLine = Number(taxAddAmount) + Number(amountOld);
          nlapiLogExecution("DEBUG", "amount New", amountLine);
          vendorBillRecord.setCurrentLineItemValue(
            "expense",
            "amount",
            amountLine
          );
        }
        /*
				 else {
					amountLine = vendorBillRecord.getCurrentLineItemValue('expense', 'amount')
				}
				*/
        //nlapiLogExecution('DEBUG', 'amount New', amountLine);
        //vendorBillRecord.setCurrentLineItemValue('expense', 'amount', amountLine)
        vendorBillRecord.commitLineItem("expense");
      }
    }
  } catch (e) {
    logErrorMessage(
      nlapiSelectValue(invoice, "invoice-number"),
      nlapiSelectValue(supplierNode, "name"),
      documentType,
      e
    );
    return false;
  }
  return true;
}

function enterTaxtoVatAccount(
  record,
  taxAmount,
  supplierNode,
  documentType,
  invoice,
  recordSubsidiary
) {
  try {
    record.selectNewLineItem("expense");
    if (documentType === "vendorbill" || documentType === "vendorcredit") {
      var accountId = 644;
      var departmentId = 68;
      nlapiLogExecution("DEBUG", "recordSubsidiary", recordSubsidiary);
    
      var locationMapObj = {
        "1" : 1,
        "6" : 31,
        "7" : 27,
        "8" : 28,
        "9" : 32,
        "10": 29,
        "11": 33,
        "12": 30,
        "13": 36,
        "14": 44,
        "18": 58
      };
      var locationId = locationMapObj[recordSubsidiary];
      if(!locationId){
        var locationSearch = nlapiSearchRecord("location",null,
        [
           ["subsidiary","anyof",recordSubsidiary],
           "AND", 
           ["isinactive","is","F"]
        ], 
        [
           new nlobjSearchColumn("internalid").setSort(false), 
        ]
        );

        if(locationSearch){
          locationId = locationSearch[0].getValue("internalid");
        }
      }  
      
      nlapiLogExecution("DEBUG", "locationId", locationId);
      record.setCurrentLineItemValue("expense", "account", accountId);
      record.setCurrentLineItemValue("expense", "department", departmentId);
      record.setCurrentLineItemValue("expense", "location", locationId);
      record.setCurrentLineItemValue("expense", "amount", taxAmount);
      record.commitLineItem("expense");
    }
  } catch (e) {
    logErrorMessage(
      nlapiSelectValue(invoice, "invoice-number"),
      nlapiSelectValue(supplierNode, "name"),
      documentType,
      e
    );
    return false;
  }
  return true;
}

/**
 * Creates expense lines for tax lines if subsidiary is not R7 LCC
 *
 * @param documentType
 * @param record
 * @param invoiceLineNodes
 * @param linetax
 * @param taxabletotalamount
 * @param totalheadercharges
 * @param invoicelineamount
 * @param x
 * @param totalheaderamount
 * @param lineleveltaxation
 * @param invoice
 * @param supplierNode
 * @param lineleveltaxation
 * @param totalcalcamount
 * @param headercharges
 * @returns {Boolean}
 */
function setTaxLines(
  documentType,
  record,
  invoiceTaxLineNodes,
  linetax,
  taxabletotalamount,
  totalheadercharges,
  totalheaderchargesNoTax,
  invoicelineamount,
  x,
  totalheaderamount,
  lineleveltaxation,
  invoice,
  supplierNode,
  lineleveltaxation,
  totalcalcamount,
  headercharges
) {
  var taxAmount = Math.abs(nlapiSelectValue(invoiceTaxLineNodes, "amount"));
  var recordSubsidiary = record.getFieldValue("subsidiary");
  var usertotal = record.getFieldValue("usertotal");
  nlapiLogExecution("DEBUG", "setTaxLInes", JSON.stringify(record));
  nlapiLogExecution("DEBUG", "taxAmount", taxAmount);
  nlapiLogExecution(
    "DEBUG",
    "totalheaderamount",
    JSON.stringify(totalheaderamount)
  );
  nlapiLogExecution("DEBUG", "usertotal", usertotal);

  nlapiLogExecution("DEBUG", "subsidiary", record.getFieldValue("subsidiary"));
  nlapiLogExecution(
    "DEBUG",
    "setTaxLInes tax rate is",
    nlapiSelectValue(invoiceTaxLineNodes, "amount")
  );
  nlapiLogExecution("DEBUG", "documentType", documentType);
  nlapiLogExecution(
    "DEBUG",
    "taxabletotalamount",
    JSON.stringify(taxabletotalamount)
  );
  nlapiLogExecution(
    "DEBUG",
    "invoicelineamount",
    JSON.stringify(invoicelineamount)
  );
  nlapiLogExecution(
    "DEBUG",
    "totalcalcamount",
    JSON.stringify(totalcalcamount)
  );
  nlapiLogExecution(
    "DEBUG",
    "totalheadercharges",
    JSON.stringify(totalheadercharges)
  );
  nlapiLogExecution(
    "DEBUG",
    "totalheaderchargesNoTax",
    JSON.stringify(totalheaderchargesNoTax)
  );
  nlapiLogExecution("DEBUG", "record.expense", record.expense);

  try {
    if (
      usertotal &&
      documentType === "vendorbill" || documentType === "vendorcredit" &&
      Number(taxAmount) > 0 &&
      Number(usertotal) > 0
    ) {
      var countLine = record.getLineItemCount("expense");
      nlapiLogExecution("DEBUG", "countLine", countLine);

      var amountLinesAllocate = 0;
      var amountVATAccount14998 = 0;

      for (var g = 1; g <= countLine; g++) {
        record.selectLineItem("expense", g);
        var locationId = record.getCurrentLineItemValue("expense", "location");
        var typeTaxTreatment = nlapiLookupField(
          "location",
          locationId,
          "custrecord_allocation_vendor_bill_tax"
        );

        if (typeTaxTreatment && typeTaxTreatment == 1) {
          amountLinesAllocate =
            Number(amountLinesAllocate) +
            Number(record.getCurrentLineItemValue("expense", "amount"));
        } else if (typeTaxTreatment && typeTaxTreatment == 2) {
          amountVATAccount14998 =
            Number(amountVATAccount14998) +
            Number(record.getCurrentLineItemValue("expense", "amount"));
        }
      }
      nlapiLogExecution("DEBUG", "amountLinesAllocate", amountLinesAllocate);
      nlapiLogExecution(
        "DEBUG",
        "amountVATAccount14998",
        amountVATAccount14998
      );

      if (Number(amountLinesAllocate) > 0) {
        var coefficientTaxAllocate =
          (Number(amountLinesAllocate) * 100) / Number(usertotal); //Number(totalheaderamount)
        nlapiLogExecution(
          "DEBUG",
          "coefficientTaxAllocate",
          coefficientTaxAllocate
        );
        var taxForAllocation =
          (Number(coefficientTaxAllocate) / 100) * Number(taxAmount);
        nlapiLogExecution("DEBUG", "taxForAllocation", taxForAllocation);
        allocateTaxeAcrossLines(
          record,
          taxForAllocation,
          supplierNode,
          documentType,
          invoice,
          amountLinesAllocate
        );
      }

      if (Number(amountVATAccount14998) > 0) {
        var coefficientTaxVatAccount14988 =
          (amountVATAccount14998 * 100) / Number(usertotal); //Number(totalheaderamount)
        nlapiLogExecution(
          "DEBUG",
          "coefficientTaxVatAccount14988",
          coefficientTaxVatAccount14988
        );
        var taxForAccount14998 =
          (Number(coefficientTaxVatAccount14988) / 100) * Number(taxAmount);
        nlapiLogExecution("DEBUG", "taxForAccount14998", taxForAccount14998);
        enterTaxtoVatAccount(
          record,
          taxForAccount14998,
          supplierNode,
          documentType,
          invoice,
          recordSubsidiary
        );
      }
    }
  } catch (e) {
    logErrorMessage(
      nlapiSelectValue(invoice, "invoice-number"),
      nlapiSelectValue(supplierNode, "name"),
      documentType,
      e
    );
    return false;
  }
  return true;
}

/**
 * Creates new Expense Line Item and fills it with expenses data
 *
 * @param documentType
 * @param record
 * @param accountNode
 * @param dynamicAccounting
 * @param invoice
 * @param supplierNode
 * @param lineleveltaxation
 * @param invoiceLineNodes
 * @param totalcalcamount
 * @param adjlineamount
 * @param accountallocations
 * @param totalheaderamount
 * @param x
 * @param i
 * @param linecharge
 * @returns {Boolean}
 */
function fillExpenses(
  documentType,
  record,
  accountNode,
  dynamicAccounting,
  invoice,
  supplierNode,
  lineleveltaxation,
  invoiceLineNodes,
  totalcalcamount,
  adjlineamount,
  accountallocations,
  totalheaderamount,
  x,
  i,
  linecharge
) {
  try {
    record.selectNewLineItem("expense");
    if (documentType === "vendorbill") {
      setTax(record, lineleveltaxation, invoice, invoiceLineNodes);
    }
    var glactseg = context.getSetting("SCRIPT", "custscript_glactseg");
    if (glactseg) {
      var account;
      var accountnumber;
      var accountId;
      account = nlapiSelectValue(accountNode, glactseg).split(":");
      accountnumber = account[0];
      accountId =
        dynamicAccounting === "T"
          ? getNetsuiteAccountId(account)
          : getNetsuiteAccountId(accountnumber);

      if (accountId != "INVALID_ACCOUNT")
        record.setCurrentLineItemValue("expense", "account", accountId);
      else {
        logErrorMessage(
          nlapiSelectValue(invoice, "invoice-number"),
          nlapiSelectValue(supplierNode, "name"),
          documentType,
          "GL Account =" + accountnumber
        );

        return false;
      }
    }
    var deptseg = context.getSetting("SCRIPT", "custscript_deptseg");
    if (deptseg) {
      var dept = nlapiSelectValue(accountNode, deptseg).split(":");
      dynamicAccounting === "T"
        ? record.setCurrentLineItemValue("expense", "department", dept)
        : record.setCurrentLineItemValue("expense", "department", dept[1]);
    }
    var classeg = context.getSetting("SCRIPT", "custscript_classseg");
    if (classeg) {
      var clss = nlapiSelectValue(accountNode, classeg).split(":");
      dynamicAccounting === "T"
        ? record.setCurrentLineItemValue("expense", "class", clss)
        : record.setCurrentLineItemValue("expense", "class", clss[1]);
    }

    var locseg = context.getSetting("SCRIPT", "custscript_locseg");
    var loccust = context.getSetting("SCRIPT", "custscript_loccust");
    nlapiLogExecution("AUDIT", "custscript_locseg", locseg);
    nlapiLogExecution("AUDIT", "custscript_loccust", loccust);
    if (locseg) {
      var locId = nlapiSelectValue(accountNode, locseg).split(":");
      nlapiLogExecution("AUDIT", "Getting Location from XML", locId);
      dynamicAccounting === "T"
        ? record.setCurrentLineItemValue("expense", "location", locId)
        : record.setCurrentLineItemValue("expense", "location", locId[1]);
    } else if (loccust) {
      var locId = getNetsuiteId(
        "location",
        nlapiSelectValue(invoiceLineNodes, loccust)
      );
      if (locId != "INVALID_NAME")
        record.setCurrentLineItemValue("expense", "location", locId);
    }
    // check for Coupa order line
    var poheadernum = nlapiSelectValue(invoiceLineNodes, "order-header-num");
    var polinenum = nlapiSelectValue(invoiceLineNodes, "order-line-num");
    if (poheadernum && polinenum) {
      record.setCurrentLineItemValue(
        "expense",
        "custcol_coupaponum",
        poheadernum + "-" + polinenum
      );
    }
    record.setCurrentLineItemValue(
      "expense",
      "memo",
      nlapiSelectValue(invoiceLineNodes, "description")
    );
    record.setCurrentLineItemValue("expense", "isbillable", "T");

    var po_number = nlapiSelectValue(invoiceLineNodes, "po-number");
    var po_linenum = nlapiSelectValue(invoiceLineNodes, "order-line-num");
    var coupa_po_num_and_line = po_number + "-" + po_linenum;
    record.setCurrentLineItemValue(
      "expense",
      "custcol_coupa_po_number",
      coupa_po_num_and_line
    );

    if (i) {
      if (i === 0 && x === 0) {
        if (documentType === "vendorcredit") {
          totalcalcamount = parseFloat(adjlineamount);
        } else if (documentType === "vendorbill") {
          if (
            context.getSetting("SCRIPT", "custscript_send_taxcode") &&
            context.getSetting("SCRIPT", "custscript_send_taxcode") == "T"
          ) {
            totalcalcamount =
              parseFloat(adjlineamount) + parseFloat(linecharge);
          } else {
            totalcalcamount = parseFloat(adjlineamount);
          }
        }
      } else {
        if (documentType === "vendorcredit") {
          totalcalcamount =
            parseFloat(totalcalcamount) + parseFloat(adjlineamount);
        }
        if (documentType === "vendorbill") {
          if (
            context.getSetting("SCRIPT", "custscript_send_taxcode") &&
            context.getSetting("SCRIPT", "custscript_send_taxcode") == "T"
          ) {
            totalcalcamount =
              parseFloat(totalcalcamount) +
              parseFloat(adjlineamount) +
              parseFloat(linecharge);
          } else {
            totalcalcamount =
              parseFloat(totalcalcamount) + parseFloat(adjlineamount);
          }
        }
      }
      if (
        x == invoiceLineNodes.length - 1 &&
        i == accountallocations.length - 1
      ) {
        //				nlapiLogExecution('DEBUG', 'Total Header Amount = '
        //						+ totalheaderamount + ' Calculated Amount = '
        //						+ totalcalcamount);
        var roundingerror = totalheaderamount - totalcalcamount;

        if (roundingerror) {
          roundingerror = Math.round(parseFloat(roundingerror) * 100) / 100;
          if (documentType === "vendorcredit") {
            adjlineamount = parseFloat(adjlineamount) + roundingerror;
          } else if (documentType === "vendorbill") {
            if (
              context.getSetting("SCRIPT", "custscript_send_taxcode") &&
              context.getSetting("SCRIPT", "custscript_send_taxcode") == "T"
            ) {
              linecharge = linecharge + roundingerror;
            } else {
              adjlineamount = parseFloat(adjlineamount) + roundingerror;
            }
          }
        }
      }
    } else {
      if (x === 0) {
        if (documentType === "vendorcredit") {
          totalcalcamount = parseFloat(adjlineamount);
        } else if (documentType === "vendorbill") {
          if (
            context.getSetting("SCRIPT", "custscript_send_taxcode") &&
            context.getSetting("SCRIPT", "custscript_send_taxcode") == "T"
          ) {
            totalcalcamount =
              parseFloat(adjlineamount) + parseFloat(linecharge);
          } else {
            totalcalcamount = parseFloat(adjlineamount);
          }
        }
      } else {
        if (documentType === "vendorcredit") {
          totalcalcamount =
            parseFloat(totalcalcamount) + parseFloat(adjlineamount);
        } else if (documentType === "vendorbill") {
          if (
            context.getSetting("SCRIPT", "custscript_send_taxcode") &&
            context.getSetting("SCRIPT", "custscript_send_taxcode") == "T"
          ) {
            totalcalcamount =
              parseFloat(totalcalcamount) +
              parseFloat(adjlineamount) +
              parseFloat(linecharge);
          } else {
            totalcalcamount =
              parseFloat(totalcalcamount) + parseFloat(adjlineamount);
          }
        }
      }
      totalcalcamount = totalcalcamount.toFixed(2);
      if (x === invoiceLineNodes.length - 1) {
        var roundingerror = totalheaderamount - totalcalcamount;
        if (roundingerror) {
          roundingerror = Math.round(parseFloat(roundingerror) * 100) / 100;
          if (documentType === "vendorcredit") {
            adjlineamount = parseFloat(adjlineamount) + roundingerror;
          } else if (documentType === "vendorbill") {
            if (
              context.getSetting("SCRIPT", "custscript_send_taxcode") &&
              context.getSetting("SCRIPT", "custscript_send_taxcode") == "T"
            ) {
              linecharge = linecharge + roundingerror;
            } else {
              adjlineamount = parseFloat(adjlineamount) + roundingerror;
            }
          }
        }
      }
    }
    nlapiLogExecution("DEBUG", "adjlineamount", adjlineamount);
    record.setCurrentLineItemValue(
      "expense",
      "amount",
      Math.abs(parseFloat(adjlineamount))
    );
    // check for custom fields on line level
    var lineTypeCount;
    var linetype;
    if (documentType === "vendorbill") {
      lineTypeCount = "custscript_customfield_line_count";
      linetype = "custscript_custfieldline";
    } else if (documentType === "vendorcredit") {
      lineTypeCount = "custscript_customfield_crdt_line_count";
      linetype = "custscript_custfield_crdt_line";
    }
    var crdtLineCount = context.getSetting("SCRIPT", lineTypeCount);
    for (var y = 1; crdtLineCount && y <= crdtLineCount; y++) {
      var crdtLine = context.getSetting("SCRIPT", linetype + y);
      if (crdtLine) {
        var custfield;
        var valuetoinsert = "None";
        var textOrValue;
        custfield = context.getSetting("SCRIPT", linetype + y).split(":");
        if (custfield) {
          if (custfield[4]) {
            valuetoinsert = custfield[4];
          } else {
            if (nlapiSelectValue(invoiceLineNodes, custfield[0])) {
              valuetoinsert = nlapiSelectValue(invoiceLineNodes, custfield[0]);
            }
            //						nlapiLogExecution('DEBUG', 'Line Custom ' + y,
            //								'Coupa field = '
            //										+ nlapiSelectValue(invoiceLineNodes,
            //												custfield[0])
            //										+ ' ValuetoInsert = ' + valuetoinsert);
            if (
              custfield[2] &&
              nlapiSelectValue(invoiceLineNodes, custfield[0])
            ) {
              if (custfield[2] == "Date") {
                valuetoinsert = convertCoupaDateToNetSuiteDate(
                  nlapiSelectValue(invoiceLineNodes, custfield[0])
                );
                //								nlapiLogExecution('DEBUG',
                //										'Line Custom Inside coupatype = date'
                //												+ y, 'Coupa field = '
                //												+ nlapiSelectValue(
                //														invoiceLineNodes,
                //														custfield[0])
                //												+ ' ValuetoInsert = '
                //												+ valuetoinsert);
              }
              if (custfield[2] == "Lookup") {
                valuetoinsert = nlapiSelectValue(
                  invoiceLineNodes,
                  custfield[0] + "/external-ref-num"
                );
                //								nlapiLogExecution('DEBUG',
                //										'Line Custom Inside coupatype = lookup'
                //												+ y, 'Coupa field = '
                //												+ nlapiSelectValue(
                //														invoiceLineNodes,
                //														custfield[0])
                //												+ ' ValuetoInsert = '
                //												+ valuetoinsert);
              }
            }
          }
          textOrValue = "Text";
          if (custfield[3]) {
            textOrValue = custfield[3];
          }
          //					nlapiLogExecution('DEBUG', 'Line CustomField' + ' ' + y,
          //							" custfield0 = " + custfield[0] + " custfield1 = "
          //									+ custfield[1] + " custfield2 = "
          //									+ custfield[2] + " custfield3 = "
          //									+ custfield[3] + " valuetoinsert = "
          //									+ valuetoinsert);

          if (
            valuetoinsert != null &&
            valuetoinsert != undefined &&
            valuetoinsert != "None"
          ) {
            textOrValue === "Text"
              ? record.setCurrentLineItemText(
                  "expense",
                  custfield[1],
                  valuetoinsert
                )
              : record.setCurrentLineItemValue(
                  "expense",
                  custfield[1],
                  valuetoinsert
                );
          }
        }
      }
    }
    record.commitLineItem("expense");
  } catch (e) {
    logErrorMessage(
      nlapiSelectValue(invoice, "invoice-number"),
      nlapiSelectValue(supplierNode, "name"),
      documentType,
      e
    );
    return false;
  }
  return true;
}

/**
 * Fills in Tax data for Line Item
 *
 * @param record
 * @param lineleveltaxation
 * @param invoice
 * @param invoiceLineNodes
 */
function setTax(record, lineleveltaxation, invoice, invoiceLineNodes) {
  var sendTaxCode = context.getSetting("SCRIPT", "custscript_send_taxcode");
  if (sendTaxCode) {
    if (lineleveltaxation == "false") {
      var invoiceTaxCode = nlapiSelectValue(invoice, "tax-code/code");
      if (invoiceTaxCode) {
        var taxsplit = invoiceTaxCode.split(":");
        if (taxsplit[1]) {
          record.setCurrentLineItemValue("expense", "taxcode", taxsplit[1]);
        } else {
          nlapiLogExecution(
            "ERROR",
            "Processing Error - Invalid Header taxcode",
            "TaxCode =" +
              nlapiSelectValue(invoice, "tax-code/code") +
              " Invoice Number = " +
              nlapiSelectValue(invoice, "invoice-number")
          );
        }
      }
    } else {
      if (nlapiSelectValue(invoiceLineNodes, "tax-code/code")) {
        var taxsplit = nlapiSelectValue(
          invoiceLineNodes,
          "tax-code/code"
        ).split(":");
        if (taxsplit[1]) {
          record.setCurrentLineItemValue("expense", "taxcode", taxsplit[1]);
        } else {
          nlapiLogExecution(
            "ERROR",
            "Processing Error - Invalid taxcode",
            "TaxCode =" +
              nlapiSelectValue(invoiceLineNodes, "tax-code/code") +
              " Invoice Number = " +
              nlapiSelectValue(invoice, "invoice-number")
          );
        }
      }
    }
  }
}

/**
 * Set's Subsidiary for Invoice
 *
 * @param record
 * @param accountNode
 * @param invoice
 * @param supplierNode
 * @param documentType
 * @returns {Boolean}
 */
function setSubsidiary(
  record,
  accountNode,
  invoice,
  supplierNode,
  documentType
) {
  //	nlapiLogExecution('DEBUG', 'setSubsidiary',' -- begin ---');

  var dynamicAccounting = context.getSetting(
    "SCRIPT",
    "custscript_dynamicaccts"
  );
  dynamicAccounting = dynamicAccounting ? dynamicAccounting : "F";
  try {
    if (context.getSetting("SCRIPT", "custscript_subsseg")) {
      var subsidiaryId = nlapiSelectValue(
        accountNode,
        context.getSetting("SCRIPT", "custscript_subsseg")
      ).split(":");
      if (dynamicAccounting === "T") {
        nlapiLogExecution("DEBUG", "Setting subsidiary ID to", subsidiaryId);
        record.setFieldValue("subsidiary", subsidiaryId);
      } else {
        if (isNaN(subsidiaryId[0])) {
          nlapiLogExecution(
            "DEBUG",
            "Setting subsidiary ID to",
            subsidiaryId[1]
          );
          record.setFieldValue("subsidiary", subsidiaryId[1]);
        } else {
          nlapiLogExecution(
            "DEBUG",
            "Setting subsidiary ID to",
            subsidiaryId[0]
          );
          record.setFieldValue("subsidiary", subsidiaryId[0]);
        }
      }
    } else if (dynamicAccounting === "T") {
      var coaNode = nlapiSelectValue(accountNode, "account-type");
      var subsidiaryName = nlapiSelectValue(coaNode, "name");
      var subsidiaryID = getNetsuiteID("subsidiary", subsidiaryName);
      nlapiLogExecution(
        "DEBUG",
        "Setting subsidiary ID from COA name to",
        subsidiaryID
      );
      record.setFieldValue("subsidiary", subsidiaryID);
    }
  } catch (e) {
    logErrorMessage(
      nlapiSelectValue(invoice, "invoice-number"),
      nlapiSelectValue(supplierNode, "name"),
      documentType,
      e
    );
    nlapiLogExecution(
      "DEBUG",
      "setSubsidiary",
      " -- end with return false ---"
    );
    return false;
  }
  nlapiLogExecution("DEBUG", "setSubsidiary", " -- end with return true ---");
  return true;
}

/**
 * Calculates adjusted line amount
 *
 * @param splitaccounting
 * @param documentType
 * @param linetax
 * @param lineamount
 * @param linecharge
 * @param splitlinetax
 * @param invoiceLineNodes
 * @param lineleveltaxation
 * @param totalheaderamount
 * @param invoicelineamount
 * @returns object containing total header amount and adjusted line amount
 */
function getAdjLineAmount(
  splitaccounting,
  record,
  documentType,
  linetax,
  lineamount,
  linecharge,
  splitlinetax,
  invoiceLineNodes,
  lineleveltaxation,
  totalheaderamount,
  invoicelineamount
) {
  var adjlineamount = 0;
  var recordSubsidiary = record.getFieldValue("subsidiary");
  if (documentType === "vendorcredit") {
    if (linetax) {
      adjlineamount =
        parseFloat(lineamount) +
        parseFloat(linecharge) +
        parseFloat(splitlinetax);
    } else {
      adjlineamount = getNontaxable(lineamount, linecharge, invoiceLineNodes);
    }
  } else if (documentType === "vendorbill") {
    nlapiLogExecution(
      "DEBUG",
      "custscript_send_taxcode",
      nlapiGetContext().getSetting("SCRIPT", "custscript_send_taxcode")
    );
    if (
      nlapiGetContext().getSetting("SCRIPT", "custscript_send_taxcode") == "T"
    ) {
      nlapiLogExecution(
        "DEBUG",
        "tax-amount",
        nlapiSelectValue(invoiceLineNodes, "tax-amount")
      );
      if (nlapiSelectValue(invoiceLineNodes, "tax-amount")) {
        linetax = parseFloat(nlapiSelectValue(invoiceLineNodes, "tax-amount"));
        nlapiLogExecution("DEBUG", "get adj Line amount 2", "1");

        if (linetax && !splitaccounting) {
          totalheaderamount =
            parseFloat(totalheaderamount) + parseFloat(linetax);
          adjlineamount = parseFloat(lineamount) + parseFloat(linetax);
        } else if (linetax && splitaccounting) {
          splitlinetax =
            (parseFloat(lineamount) / parseFloat(invoicelineamount)) * linetax;
          totalheaderamount =
            parseFloat(totalheaderamount) + parseFloat(splitlinetax);
          adjlineamount = parseFloat(lineamount) + parseFloat(splitlinetax);
        }
      }
    } else {
      nlapiLogExecution("DEBUG", "linetax", linetax);
      nlapiLogExecution("DEBUG", "splitaccounting", splitaccounting);
      if (linetax && !splitaccounting) {
        adjlineamount =
          parseFloat(lineamount) + parseFloat(linecharge) + parseFloat(linetax);
      } else if (linetax && splitaccounting) {
        splitlinetax =
          (parseFloat(lineamount) / parseFloat(invoicelineamount)) * linetax;
        adjlineamount =
          parseFloat(lineamount) +
          parseFloat(linecharge) +
          parseFloat(splitlinetax);
      } else {
        nlapiLogExecution(
          "DEBUG",
          "get adj Line amount line amount",
          lineamount
        );
        nlapiLogExecution(
          "DEBUG",
          "get adj Line amount line linecharge",
          linecharge
        );
        // nlapiLogExecution('DEBUG', 'get adj Line amount line linetax', linetax);
        // nlapiLogExecution('DEBUG', 'get adj Line amount line invoiceLineNodes', nlapiXMLToString(invoiceLineNodes));

        adjlineamount = getNontaxable(lineamount, linecharge, invoiceLineNodes);

        // adjlineamount = lineamount
      }
    }
  }
  var result = {
    totalheaderamount: totalheaderamount,
    adjlineamount: adjlineamount.toFixed(2),
  };
  return result;
}

/**
 * Creates new line item of expense type and places charges from Invoice header
 * there
 *
 * @param record
 * @param invoice
 * @param invoiceline
 * @param linecharge
 * @param splitaccountNode
 * @param isSplit
 */
function setHeaderChargesAsExpenseLine(
  record,
  invoice,
  invoiceline,
  linecharge,
  splitaccountNode,
  isSplit
) {
  var accountNode;

  if (isSplit) {
    accountNode = splitaccountNode;
  } else {
    accountNode = nlapiSelectNode(invoiceline, "account");
  }
  record.selectNewLineItem("expense");
  if (context.getSetting("SCRIPT", "custscript_glactseg")) {
    var account;
    var accountnumber;
    var accountId;
    // var act;
    account = nlapiSelectValue(
      accountNode,
      context.getSetting("SCRIPT", "custscript_glactseg")
    ).split(":");
    // act = account[0].split(' ');
    accountnumber = account[0];
    if (dynamicAccounting == "T") {
      accountId = account;
    } else {
      accountId = getNetsuiteAccountId(accountnumber);
    }
    if (accountId != "INVALID_ACCOUNT") {
      record.setCurrentLineItemValue("expense", "account", accountId);
    } else {
      nlapiLogExecution(
        "ERROR",
        "Processing Error - Invalid GL account",
        "GL Account =" +
          accountnumber +
          " Invoice Number = " +
          nlapiSelectValue(invoice, "invoice-number") +
          " Supplier Name = " +
          nlapiSelectValue(invoice, "supplier/name")
      );
      nlapiSendEmail(
        106223954,
        context.getSetting("SCRIPT", "custscript_emailaddr_notifications"),
        context.getSetting("SCRIPT", "custscript_acccountname") +
          " Invoice Integration:Processing Error - Invalid GL account",
        "GL Account =" +
          accountnumber +
          " Invoice Number = " +
          nlapiSelectValue(invoice, "invoice-number") +
          " Supplier Name = " +
          nlapiSelectValue(invoice, "supplier/name")
      );
      return;
    }
  }

  if (context.getSetting("SCRIPT", "custscript_deptseg")) {
    var dept = nlapiSelectValue(
      accountNode,
      context.getSetting("SCRIPT", "custscript_deptseg")
    ).split(":");
    if (dynamicAccounting == "T") {
      record.setCurrentLineItemValue("expense", "department", dept);
    } else {
      record.setCurrentLineItemValue("expense", "department", dept[1]);
    }
  }

  if (context.getSetting("SCRIPT", "custscript_classseg")) {
    var clss = nlapiSelectValue(
      accountNode,
      context.getSetting("SCRIPT", "custscript_classseg")
    ).split(":");
    if (dynamicAccounting == "T") {
      record.setCurrentLineItemValue("expense", "class", clss);
    } else {
      record.setCurrentLineItemValue("expense", "class", clss[1]);
    }
  }

  if (context.getSetting("SCRIPT", "custscript_locseg")) {
    var locId = nlapiSelectValue(
      accountNode,
      context.getSetting("SCRIPT", "custscript_locseg")
    ).split(":");
    if (dynamicAccounting == "T") {
      record.setCurrentLineItemValue("expense", "location", locId);
    } else {
      record.setCurrentLineItemValue("expense", "location", locId[1]);
    }
  } else if (context.getSetting("SCRIPT", "custscript_loccust")) {
    var locId = getNetsuiteId(
      "location",
      nlapiSelectValue(
        invoiceline,
        context.getSetting("SCRIPT", "custscript_loccust")
      )
    );
    if (locId != "INVALID_NAME") {
      record.setCurrentLineItemValue("expense", "location", locId);
    }
  }

  /* check for Coupa order line */
  if (
    nlapiSelectValue(invoiceline, "order-header-num") &&
    nlapiSelectValue(invoiceline, "order-line-num")
  ) {
    var poheadernum = nlapiSelectValue(invoiceline, "order-header-num");
    var polinenum = nlapiSelectValue(invoiceline, "order-line-num");
    record.setCurrentLineItemValue(
      "expense",
      "custcol_coupaponum",
      poheadernum + "-" + polinenum
    );
  }

  var po_number = nlapiSelectValue(invoiceline, "po-number");
  var po_linenum = nlapiSelectValue(invoiceline, "order-line-num");
  var coupa_po_num_and_line = po_number + "-" + po_linenum;
  record.setCurrentLineItemValue(
    "expense",
    "custcol_coupa_po_number",
    coupa_po_num_and_line
  );

  record.setCurrentLineItemValue("expense", "amount", parseFloat(linecharge));
  if (isSplit) {
    record.setCurrentLineItemValue(
      "expense",
      "memo",
      "Header Charges for Split line: " +
        nlapiSelectValue(invoiceline, "description")
    );
  } else {
    record.setCurrentLineItemValue(
      "expense",
      "memo",
      "Header Charges for line: " + nlapiSelectValue(invoiceline, "description")
    );
  }
  record.setCurrentLineItemValue("expense", "isbillable", "T");
  // check for custom fields on line level
  if (context.getSetting("SCRIPT", "custscript_customfield_line_count")) {
    for (
      var y = 1;
      y <= context.getSetting("SCRIPT", "custscript_customfield_line_count");
      y++
    ) {
      if (context.getSetting("SCRIPT", "custscript_custfieldline" + y)) {
        var custfield;
        var valuetoinsert = null;
        var textOrValue;
        if (
          context
            .getSetting("SCRIPT", "custscript_custfieldline" + y)
            .split(":")
        ) {
          custfield = context
            .getSetting("SCRIPT", "custscript_custfieldline" + y)
            .split(":");

          if (custfield[4]) {
            valuetoinsert = custfield[4];
            //						nlapiLogExecution('DEBUG', 'Valuetoinsert = ',
            //								valuetoinsert);
          } else {
            if (nlapiSelectValue(invoiceline, custfield[0]))
              valuetoinsert = nlapiSelectValue(invoiceline, custfield[0]);

            //						nlapiLogExecution('DEBUG', 'Line Custom ' + y,
            //								'Coupa field = '
            //										+ nlapiSelectValue(invoiceline,
            //												custfield[0])
            //										+ ' ValuetoInsert = ' + valuetoinsert);

            if (custfield[2] && nlapiSelectValue(invoiceline, custfield[0])) {
              if (custfield[2] == "Date") {
                valuetoinsert = convertCoupaDateToNetSuiteDate(
                  nlapiSelectValue(invoiceline, custfield[0])
                );
                //								nlapiLogExecution('DEBUG',
                //										'Line Custom Inside coupatype = date'
                //												+ y, 'Coupa field = '
                //												+ nlapiSelectValue(invoiceline,
                //														custfield[0])
                //												+ ' ValuetoInsert = '
                //												+ valuetoinsert);
              }
              if (custfield[2] == "Lookup") {
                valuetoinsert = nlapiSelectValue(
                  invoiceline,
                  custfield[0] + "/external-ref-num"
                );
                //								nlapiLogExecution('DEBUG',
                //										'Line Custom Inside coupatype = lookup'
                //												+ y, 'Coupa field = '
                //												+ nlapiSelectValue(invoiceline,
                //														custfield[0])
                //												+ ' ValuetoInsert = '
                //												+ valuetoinsert);
              }
            }
          }

          textOrValue = "Text";
          if (custfield[3]) {
            textOrValue = custfield[3];
          }
          //					nlapiLogExecution('DEBUG', 'Line CustomField' + ' ' + y,
          //							" custfield0 = " + custfield[0] + " custfield1 = "
          //									+ custfield[1] + " custfield2 = "
          //									+ custfield[2] + " custfield3 = "
          //									+ custfield[3] + " valuetoinsert = "
          //									+ valuetoinsert);

          if (
            valuetoinsert != null &&
            valuetoinsert != undefined &&
            valuetoinsert != "None"
          ) {
            if (textOrValue == "Text") {
              record.setCurrentLineItemText(
                "expense",
                custfield[1],
                valuetoinsert
              );
            } else {
              record.setCurrentLineItemValue(
                "expense",
                custfield[1],
                valuetoinsert
              );
            }
          }
        }
      }
    }
  }
  record.commitLineItem("expense");
}

/**
 * Identifies existing vendor bill or credit, loads the record,
 * checks the current payment hold, if payment channel rules do not
 * match, then update the payment hold field.
 *
 * @param coupaInvoice
 * @param existingInvoiceId
 * @param existingCreditId
 */
function updateVendorBillOrCredit(
  coupaInvoice,
  existingInvoiceId,
  existingCreditId
) {
  var record;
  var documentType;
  try {
    if (existingInvoiceId) {
      documentType = "vendorbill";
      record = nlapiLoadRecord(documentType, existingInvoiceId);
    } else if (existingCreditId) {
      documentType = "vendorcredit";
      record = nlapiLoadRecord(documentType, existingCreditId);
    }

    var paymentChannel = nlapiSelectValue(coupaInvoice, "payment-channel");

    if (paymentChannel && documentType == "vendorbill") {
      if (paymentChannel === "erp") {
        record.setFieldValue("paymenthold", "F");
      } else if (paymentChannel === "coupapay_invoice_payment") {
        record.setFieldValue("paymenthold", "T");
      }
    }

    nlapiSubmitRecord(record);

    setInvoiceAsExported(nlapiSelectValue(coupaInvoice, "id"));
  } catch (e) {
    logErrorMessage(
      nlapiSelectValue(coupaInvoice, "invoice-number"),
      nlapiSelectValue(coupaInvoice, "supplier/name"),
      documentType,
      e
    );
  }
}
