/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(["N/currentRecord", "N/runtime", "N/search", "N/email", "N/http"], function (
  currentRecord,
  runtime,
  search,
  email,
  http
) {
  function pageInit(ctx) {}
  function sendPOemail() {
    let myRecord = currentRecord.get();
    const stSuiteletLinkParam = runtime.getCurrentScript().getParameter({
      name: "custscript_suiteletlink1",
    });
    const record_id = myRecord.id;
    const fieldLookUp = search.lookupFields({
      type: search.Type.PURCHASE_ORDER,
      id: record_id,
      columns: ["tranid", "custbody_cust_primary_email", "entity"],
    });
    const po_number = fieldLookUp.tranid;
    let vendor_email = fieldLookUp.custbody_cust_primary_email;

    if (!vendor_email) {
      vendor_email = search.lookupFields({
        type: search.Type.VENDOR,
        id: fieldLookUp.entity,
        columns: ["email"],
      });
      if (!vendor_email.email) return;
      const suiteletURL = `${stSuiteletLinkParam}&record_id=${record_id}&po_number=${fieldLookUp.tranid}&email=${vendor_email.email}`;

      http.get({
        url: suiteletURL,
      });
      // window.open(suiteletURL);
    } else {
      const suiteletURL = `${stSuiteletLinkParam}&record_id=${record_id}&po_number=${po_number}&email=${vendor_email}`;
      http.get({
        url: suiteletURL,
      });
    }
  }
  function printCustomPDF() {
    let myRecord = currentRecord.get();
    const stSuiteletLinkParam = runtime.getCurrentScript().getParameter({
      name: "custscript_suiteletlink1",
    });
    const record_id = myRecord.id;
    const fieldLookUp = search.lookupFields({
      type: search.Type.PURCHASE_ORDER,
      id: record_id,
      columns: ["tranid"],
    });
    const suiteletURL = `${stSuiteletLinkParam}&record_id=${record_id}&po_number=${fieldLookUp.tranid}`;

    window.open(suiteletURL);
  }
  return {
    sendPOemail: sendPOemail,
    pageInit: pageInit,
    printCustomPDF: printCustomPDF,
  };
});
