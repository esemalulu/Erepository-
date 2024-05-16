/**
 * @NApiVersion 2.x
 * @NScriptType clientScript
 * @NModuleScope Public
 */

define(["N/search", "N/record"], function (search, record) {
  function pageInit(type) {
    console.log('executed');
    const table_heading = document.querySelector('[data-label="Residential Address"]');
    const table_lines = document.querySelectorAll('[data-ns-tooltip="RESIDENTIAL ADDRESS"]');
    if (table_heading) {
      table_heading.style.display = "none";
    }
    if (table_lines) {
      Array.from(table_lines).forEach(
         function(el) {
          el.style.display = "none";
        }
      );
    }

  
  }
  return {
    pageInit: pageInit,
  };
});
