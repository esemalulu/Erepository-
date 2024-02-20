/**
 * The KO object model for the Claim Operation Lines sublist for Warranty 2.0
 * 
 * Version    Date            Author           Remarks
 * 1.00       3 Dec 2020      Jeffrey Bajit
 *
 */

function GD_ReturnAuth_ViewModel() {
    /** STATICS AND OBSERVABLES */
    var self = this;

    self.portal = nlapiGetFieldValue('custpage_portal') == 'true';
    self.fileInfo = JSON.parse(nlapiGetFieldValue('custpage_fileinfo'));

    /** INITIALIZE */
    //When the view model is initialized, create the static lists from NetSuite. Then initialize the KO lists with what's in the NS sublists.
    self.initialize = function () {
        // We set the maxFilesize field, which will show a message in
        // the DropZone as soon as an offending file has been added,
        // but we'll still need to check later that the user didn't
        // ignore the message, as the file will still be added to the
        // dropzone.files array that we are using.
        self.dropzone = new Dropzone("#returnauthdropzone", {
            autoProcessQueue: false,
            addRemoveLinks: true,
            maxFilesize: 10, //MB
            previewTemplate: "<div class=\"dz-preview dz-file-preview\">\r\n\t<div class=\"dz-image\"><img data-dz-thumbnail=\"\"><\/div>\r\n\t<div class=\"dz-details\">\r\n\t<div class=\"dz-size\"><span data-dz-size=\"\"><strong><\/strong><\/span><\/div>\r\n\t<div class=\"dz-filename\"><span data-dz-name=\"\"><\/span><\/div>\r\n<\/div>\r\n<div class=\"dz-error-message\"><span data-dz-errormessage=\"\"><\/span><\/div>\r\n<div class=\"dz-success-mark\">",
        });
    };
    
    //Closes the popup and remove the selected popup operation line
    self.attachFiles = function() {
        var myDropzone = Dropzone.forElement("#returnauthdropzone");
        if (myDropzone != null && myDropzone.files.length > 0) {
            // Start uploading any queued files
            var link = nlapiResolveURL(
                'SUITELET',
                'customscriptgd_returnauthdropzoneupload',
                'customdeploygd_returnauthdropzoneupload'
            );
            
            var folderName = nlapiGetFieldValue('custbodygd_retauthfilefoldername') || '';

            if (folderName == '') {
                folderName = new Date().getTime();
                nlapiSetFieldValue('custbodygd_retauthfilefoldername', folderName);
            }
            // TODO Show a spinner or some indication that the files are uploading.
            showSpinner(true);

            // The FileReader in this function is asynchronous, so this is a recursive
            // function that takes the files to upload (from the Dropzone) and the
            // current opline and uploads the files in the background and adds the
            // file ids to the fileids field of the operation line as they upload.
            nlapiSetFieldValue('custpage_filesdirty', 'T');
            
            UploadFiles(myDropzone.files, folderName, link);
        }
        
        return true;
    };
}

/**
 * Name: document.ready()
 * Description: Page event that fires after the DOM is initialized.  Sets up all the event bindings 
 * and jQuery widget initializations
 * @returns {void} 
 */
$( document ).ready(function() {
    var retrunAuthViewModel = new GD_ReturnAuth_ViewModel();
    retrunAuthViewModel.initialize();
    ko.applyBindings(retrunAuthViewModel);
}); 
ss$ = jQuery.noConflict(true); //This needs to be outside of document.ready() for the sortable list to load.

// Uploads file attachments for Op Lines
function UploadFiles(files, folderName, link) {
    if (files.length == 0) {
        showSpinner(false);

        return;
    }

    var currentFile = files.shift();

    var fr = new FileReader();
    fr.onload = function(e) {
        //Send the File to NetSuite.
        var requestData = {
            fileName: currentFile.name,
            base64Data: e.target.result.replace(/^data:.*base64,/i, '')
        };

        ss$.ajax({
            type: "POST",
            url: link + "&foldername=" + folderName,
            dataType: "text",
            contentType: "application/json; charset=utf-8",
            async: false,
            data: JSON.stringify(requestData),
            success: function(data) {
                UploadFiles(files, folderName, link);
            },
            error: function (textStatus, errorThrown) {
                console.log(textStatus);
                console.log(errorThrown);
                // TODO Have an error appear
          }
        });
    };
    //Read the file as a Data URL string. This will call the onload function when complete. 
    fr.readAsDataURL(currentFile);
}

/**
 * Show a spinner overlay.
 * @param isShow
 * @param message
 */
function showSpinner(isShow, message){
    var x = document.getElementById("ss-spinner-overlay");
    if(x != null) {
        if(isShow){
            document.getElementById('ss-spinner-maintext').textContent = message ? message : 'Working...';
            x.style.display = "block";
        }
        else {
            x.style.display = "none";
        }
    }
}

/**
 * Decodes an HTML-encoded string by using a textarea DOM element.
 * Decodes things like &amp; and &lt;
 * 
 * @param encodedString
 * @returns String
 */
function decodeEntities(encodedString) {
    var textArea = document.createElement('textarea');
    textArea.innerHTML = encodedString;
    return textArea.value;
}

/**
 * Converts a maybe-number, maybe-string to definitely a number.
 * @param value
 * @returns Number
 */
function ConvertNSFieldToFloat(value) {
    if (value == null || value == '')
        return 0;
    else 
        return parseFloat(value);
}

/**
 * Converts specified value to a XML-safe string. Returns empty string if a null value is passed in.
 * @param value
 * @returns String
 */
function ConvertNSFieldToString(value) {
    if (value == null)
        return '';
    else 
        return nlapiEscapeXML(value);
}

//Given a number or a string, returns a decimal rounded to the number of places passed in the second parameter.
//If no second parameter is passed, the result is rounded to 2 places.
function RoundCurrency(value, places) {
    if(!value || isNaN(value))
        value = 0;

    if(places == null) places = 2;
    
    //turn it into a float with the correct number of decimal places
    return parseFloat(value).toFixed(places);
}