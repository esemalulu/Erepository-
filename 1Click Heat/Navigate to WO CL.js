/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/ui/message', 'N/https', 'N/currentRecord', 'N/url'], function(message, https, currentRecord, url) {

  function handleButtonClick(suiteletUrl) {
    var loadingMessage = message.create({
      title: 'Stamping the Hyperlinks...',
      message: 'Please wait...',
      type: message.Type.INFORMATION
    });
    loadingMessage.show();

    window.location.href = suiteletUrl;

    setTimeout(function() {
      window.location.reload();
    }, 1000);
  }

  function pageInit(context) {
    console.log("Page Initialized.");
  }

  function saveRecord(context) {
    var record = currentRecord.get();
    return true;
  }

  return {
    handleButtonClick: handleButtonClick,
    pageInit: pageInit,
    saveRecord: saveRecord
  };

});
