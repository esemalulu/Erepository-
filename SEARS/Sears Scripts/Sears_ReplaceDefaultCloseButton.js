/* Sales Order Cancel/Close Order User Event(Server Script)
 * By Rajiv@mca140.com
 * Updated On: 27-Dec-2016
 */
//--------------primary logics
/*Adding tab & fields dynamically || request parameter added*/
function beforeLoadSalesOrder(type, form, request) {
    if(type == 'view'){
        if(hideCloseOrderButton(form)) {
            addCustomCloseOrderButtonWithListener(form);
        }
    }
}

//--------------secondary logics
/* hide the Close Order button*/
function hideCloseOrderButton(form){
    var button = form.getButton('closeremaining');

    if(button !== null && button !== undefined){ //Make sure that the button is not null
        button.setVisible(false);

        return true;
    }
    return false;
}

/* add anew button & listener*/
function addCustomCloseOrderButtonWithListener(form){
    form.setScript('customscript_replace_close_btn_exec'); // This should be the script id of your undeployed client side script
    form.addButton('custpage_closeremaining', 'Close Order', 'custom_close_remaining()');
  log("ADD BUTTON", "BUTTON ADDED");
}

/* logger*/
function log(name, message){
    nlapiLogExecution('DEBUG', name, message);
}
