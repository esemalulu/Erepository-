/**
 * UI library file for Solution Source accounts.
 * 
 * Version    Date            Author           Remarks
 * 1.00       23 Sep 2020     Jeffrey Bajit
 *
 */

/**
 * Removes all lines from a sublist whose type is specified.
 * @param {Object} type
 */
function RemoveAllLinesInSublist(type) {
    var lineCount = nlapiGetLineItemCount(type);
    if(lineCount > 0) {
        for(var i = lineCount; i > 0; i--) {
            nlapiSelectLineItem(type, i);
            nlapiRemoveLineItem(type, i);
        }
    }
}

/** 
 * Disables this button on the form.
 * 
 * @param {nlobjForm} form 
 * @param {nlobjSublist} sublist
 * @param {String} buttonName 
 */
function DisableButton(form, sublist, buttonName) {
    if (sublist != null) {
        var button = sublist.getButton(buttonName);
        if (button != null)
            button.setDisabled(true);
    } else if (form != null) {
        var button = form.getButton(buttonName);
        if (button != null)
            button.setDisabled(true);
    }
}

/**
 * Disables a bunch of netsuite buttons for the specified form.
 * Buttons that are disabled by this method are: 
 * "Save & Copy", "Save & New", "Copy Previous", "Save & Print", "Reset", "New", "Make Copy", "Email", "Register"
 * "Print" unless enablePrintButton is set to true and "Save" button if disableSubmitButton is set to true.
 * We mainly use this function on dealer portal where dealers should not have access to these buttons.
 * @param form
 * @param enablePrintButton. Whether or not enable 'Print' button. By default, this button is disabled.
 * @param disableSubmitButton. Whether or not disable 'Submit' button. By default, this button is enabled.
 * @param enableNewButton. Whether or not enable 'New' button. By default, this button is disabled.
 */
function DisableNSButtons(form, enablePrintButton, disableSubmitButton, enableNewButton) {
    if(form != null) {
        //Hide NS buttons
        var btn = form.getButton('submitcopy');         
        if (btn != null)
               btn.setDisabled(true);
        
        btn = form.getButton('submitnew');       
        if (btn != null)
               btn.setDisabled(true);
        
        //Disable submit button if specified. By default this is not disabled.
        if(disableSubmitButton != null && disableSubmitButton != undefined && disableSubmitButton) {
            btn = form.getButton('submitter');       
            if (btn != null)
                   btn.setDisabled(true);
        }       
                
        btn = form.getButton('autofill'); //Copy Previous button
        if(btn != null)
            btn.setDisabled(true);
        
        btn = form.getButton('saveprint');
        if(btn != null)
            btn.setDisabled(true);
        
        btn = form.getButton('resetter');        
        if (btn != null)
               btn.setDisabled(true);
        
        if(enableNewButton == null || enableNewButton == undefined || !enableNewButton) {
            btn = form.getButton('new');             
            if (btn != null)
                   btn.setDisabled(true);       
        }
        
        btn = form.getButton('makecopy');        
        if (btn != null)
               btn.setDisabled(true);
        
        //Enable 'Print' button if specified. By default, this is not enabled.
        if(enablePrintButton == null || enablePrintButton == undefined || !enablePrintButton) {
            btn = form.getButton('print');           
            if (btn != null)
                   btn.setDisabled(true);       
        }
        
        btn = form.getButton('email');           
        if (btn != null)
               btn.setDisabled(true);
        
        btn = form.getButton('gotoregister');           
        if (btn != null)
               btn.setDisabled(true);
    }
}
