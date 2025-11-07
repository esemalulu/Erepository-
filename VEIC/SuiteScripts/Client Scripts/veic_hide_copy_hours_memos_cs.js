/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */

define([], function () {

  function pageInit(context) {

    setInterval(function () {
      try {
        var lbl = NS.jQuery('label:contains("Copy Hours and Memos")');
        if (lbl.length > 0) { 
          // If the checkbox is already checked, clear it.
          if (lbl.parent().find('span:first').attr('aria-checked') == 'true') {
            lbl.parent().find('span:first').trigger('click');
          }
          // Then, hide it
          lbl.parent().find("span:first").hide();
          // Replace the label's text and make it white. This way we maintain the line hight.
          //lbl.css("color", "white").text("");
          // Hide the label & checkbox
          lbl.parent().hide();
        }
      } catch (ex) {
        console.log(ex);
        log.error("Error", ex.message);
      }
    }, 75);

  }

  return {
    pageInit: pageInit
  }
});