/**
 *
 * This script was provided by Starling Solutions.
 *
 * Provides a UI to upload and validate excel spreadsheets prior to import into Netsuite.
 *
 *  Version     Date            Author              Ticket         Remarks
 ***********************************************************************************************************************
 *  1.0         13 Oct 2020     Kassim Izuagbe      STP-146        Initial Version
 ***********************************************************************************************************************
 */

let NEW_FILE        = null; //Holds the actual file that the user has submitted to be validated.
let FILE_NAME       = null; //The name of the file to be saved back to the user's computer.
let WORKBOOK        = null; //Holds the workbook data.  When the user clicks validate, this data is sent through validation.
let SUITELET_URL    = window.parent.document.location.href; //The same suitelet that displays the interface also handles the validation/creation.

//Init the page with the add checkbox pre-selected.
document.getElementById('add').checked = true;


/**
 * Runs when the user drops a file into the data import box.
 *
 * @param {Object} e - The event object passed by the DOM 
 */
function dropHandler (e) {

    // Prevent file from being opened (which is the default behaviour)
    e.stopPropagation();
    e.preventDefault();

    let dropZoneStyle             = document.getElementById('drop_zone').style;
    dropZoneStyle.backgroundColor = 'white';
    dropZoneStyle.color           = 'black';
    getFileFromEvent(e);

}


document.getElementById('drop_zone').addEventListener('drop', dropHandler, false);
document.getElementById('choose_file').addEventListener('click', ()=>{document.getElementById('select_file').click()}, false);


/**
 * When the user is dragging the file over the import box, this function fires.
 *
 * @param {Object} e - The event object passed by the DOM
 */
function dragOverHandler (e) {

    let dropZoneStyle             = document.getElementById('drop_zone').style;
    dropZoneStyle.backgroundColor = 'whitesmoke';
    dropZoneStyle.color           = '#0097e6';
    e.preventDefault();

}

/**
 * When drag stops, put the box back to normal.
 *
 * @param {Object} e - The event object passed by the DOM
 */
function dragEnd (e) {

    let dropZoneStyle             = document.getElementById('drop_zone').style;
    dropZoneStyle.backgroundColor = 'white';
    dropZoneStyle.color           = 'black';
    e.preventDefault();

}

/**
 * When drag stops, put the box back to normal.
 *
 * @param {Object} e - The event object passed by the DOM
 */
function dragLeave (e) {

    let dropZoneStyle             = document.getElementById('drop_zone').style;
    dropZoneStyle.backgroundColor = 'white';
    dropZoneStyle.color           = 'black';
    e.preventDefault();

}


/**
 * Displays file size and, upon clicking the submit button, runs the parsing function below
 * @param {Object} - files - The file that was attached, if one was provided
 */
function updateSize ( file ) {

    let inputSize = file.size / 1000000;

    // Main function that opens the file picker and runs the parsing function when the submit button is clicked

    document.getElementById('file_name').innerText = `${ FILE_NAME } (${inputSize.toFixed(2)} MB)` ;

}

document.getElementById('upload').addEventListener('click', submitFile, false);
document.getElementById('listFiles').addEventListener('click', listFiles, false);
document.getElementById('validate').addEventListener('click', processXLSX, false);
document.getElementById('select_file').addEventListener('change', getFileFromFinder, false);
document.getElementById('interface').width = window.parent.innerWidth - 100;


/**
 * Parses the (.XLS(X)) file checks to see if any validation errors have occurred. If not, it will display the submit button.  If
 * errors are found, it will download a marked up file to the user's computer to be fixed and re-uploaded.
 * @param workbook
 * @returns {string}
 */
function processXLSX () {

    let userMessage             = document.getElementById('user_message');
    userMessage.style.display   = '';
    userMessage.style.color     = 'black';
    userMessage.innerText       = 'Validating Worksheet(s)...';

    let validation = runBasicValidation(WORKBOOK, FILE_NAME, (validationResults) => {

        let userMessage       = document.getElementById('user_message');

        if ( validationResults.errors ) {
            //Generate an error message to show the user.
            userMessage.style.display = '';
            userMessage.innerText     = validationResults.message;
            return;
        }
        else {

            //If no errors were found, show the submit button and let the user know to submit it.
            let submitButton = document.getElementById('upload');
            let listButton   = document.getElementById('listFiles');
            submitButton.style.display    = '';
            listButton.style.display    = '';

            userMessage.style.display    = '';
            userMessage.style.color      = 'black';
            userMessage.style.fontWeight = 'normal';
            userMessage.innerText        = validationResults.message;
        }

    });







    /* document.getElementById('output').innerhtml = '';
     workbook.SheetNames.forEach(function (sheetName) {
     let htmlOutput = XLSX.write(workbook, { sheet : sheetName, type : 'string', bookType : 'html' });
     document.getElementById('output').innerHTML += htmlOutput;
     });
     return ''; */
}

/**
 * When the user chooses a file, this reads the data and runs the validation on it as if they dragged/dropped it in.
 */
function getFileFromFinder () {
    // Displays/Updates file size
    let inputFile = this.files[0];
    let workbook  = null;
    let reader    = new FileReader();
    reader.onload = function () {

        let data     = new Uint8Array(this.result);
        let workbook = XLSX.read(data, { type : 'array', cellStyles : true });

        WORKBOOK = workbook; //Set the gloabl workbook based on this.

    };
    NEW_FILE     = reader.readAsArrayBuffer(inputFile);
    FILE_NAME    = inputFile.name;

    updateSize(inputFile);
}

/**
 * When the drops a file, this reads the data and runs the validation on it as if they dragged/dropped it in.
 */
function getFileFromEvent (e) {
    let files     = e.dataTransfer.files;
    let f         = files[0];
    let reader    = new FileReader();
    reader.onload = function (e) {

        let data     = new Uint8Array(e.target.result);
        let workbook = XLSX.read(data, { type : 'array', cellStyles : true });
        WORKBOOK     = workbook; //Set the global workbook variable based on this.

    };

    NEW_FILE        = reader.readAsArrayBuffer(f);
    FILE_NAME       = f.name;
    updateSize(f);
}

/**
 * Once the user has validated the excel file, this exports a csv text string to be saved into the file cabinet for processing
 */
function submitFile () {

    //Go through each sheet and export a string to be compiled into a CSV file in the file cabinet
    let promiseArray = [];
    let userMessage  = document.getElementById('user_message');

    userMessage.style.display    = '';
    userMessage.style.color      = 'black';
    userMessage.style.fontWeight = 'normal';
    userMessage.innerText        = 'Saving CSV Files. This page will refresh when complete. Do not navigate away from this page until complete.';

    WORKBOOK.SheetNames.forEach(( sheetName ) => {

        if ( sheetName.toLowerCase() != 'reserved' ) {
            let csvFile     = XLSX.utils.sheet_to_csv( WORKBOOK.Sheets[sheetName] );
            //Push all of the sendCsvData calls into an array and then resolve them synchronously.  This will ensure they stay in the right order.
            promiseArray.push( sendCsvData( csvFile, sheetName ) );
        }


    });

    Promise.all(promiseArray)
    .then((responses) => {

        let fileIds = [];
        let recTypes= [];
        let errors  = [];

        responses.forEach(function( fileInfo ) {
            if ( fileInfo.error ) {
                errors.push( fileInfo.error );
            }
            else {
                fileIds.push( fileInfo.fileId );
                recTypes.push(fileInfo.recordType.toLowerCase().split(' ')[0] );
            }
        });

        if ( errors.length ) {

            let errorList = '';

            // Create a list of any errors received.
            errors.forEach(function(error) {
               errorList += error + '<br />';
            });

            let userMessage                  = document.getElementById('user_message');
                userMessage.style.display    = '';
                userMessage.style.color      = 'red';
                userMessage.style.fontWeight = 'bold';
                userMessage.innerHTML        = 'The following errors occurred while sending the CSV data: <br />' + errorList;

            return; //End and do not refresh the page.
        }

        let isAdd      = document.getElementById('add').checked;
        let isUpdate   = document.getElementById('update').checked;
        let updateKey  = document.getElementById('foreignKeyUpdate').value;
        let manyToOne  = document.getElementById('manyToOne').checked;
        let foreignKey = document.getElementById('foreignKey').value;
        let dynamic    = document.getElementById('isDynamic').checked;
        let isSds      = document.getElementById('isSdsImport').checked;
        let sentKey    = foreignKey ? foreignKey : updateKey;

        let suiteletParams = '&action=importFiles';
        suiteletParams += '&add=' + isAdd;
        suiteletParams += '&update=' + isUpdate;
        suiteletParams += '&manyToOne=' + manyToOne;
        suiteletParams += '&foreignKey=' + sentKey;
        suiteletParams += '&fileIds=' + fileIds.join(',');
        suiteletParams += '&recTypes=' + recTypes.join(',');
        suiteletParams += '&isDynamic=' + dynamic;
        suiteletParams += '&isSdsImport=' + isSds;

        window.parent.location.replace(SUITELET_URL + suiteletParams);

    });

}

/**
 * Once the user has validated the excel file, this creates the CSV files and provides links to the user to view.
 */
function listFiles () {

    //Go through each sheet and export a string to be compiled into a CSV file in the file cabinet
    let promiseArray = [];
    let userMessage  = document.getElementById('user_message');

    userMessage.style.display    = '';
    userMessage.style.color      = 'black';
    userMessage.style.fontWeight = 'normal';
    userMessage.innerText        = 'Saving CSV Files. This list will be shown when complete. <br /> Do not navigate away from this page until complete.';

    WORKBOOK.SheetNames.forEach(( sheetName ) => {

        if ( sheetName.toLowerCase() != 'reserved' ) {
            let csvFile     = XLSX.utils.sheet_to_csv( WORKBOOK.Sheets[sheetName] );
            //Push all of the sendCsvData calls into an array and then resolve them synchronously.  This will ensure they stay in the right order.
            promiseArray.push( sendCsvData( csvFile, sheetName ) );
        }


    });

    Promise.all(promiseArray)
    .then((responses) => {

        let fileIds  = [];
        let recTypes = [];
        let errors   = [];

        responses.forEach(function( fileInfo ) {
            if ( fileInfo.error ) {
                errors.push( fileInfo.error );
            }
            else {
                fileIds.push( fileInfo.fileId );
                recTypes.push(fileInfo.recordType.toLowerCase().split(' ')[0] );
            }
        });

        if ( errors.length ) {

            let errorList = '';

            // Create a list of any errors received.
            errors.forEach(function(error) {
                errorList += error + '<br />';
            });

            let userMessage                  = document.getElementById('user_message');
            userMessage.style.display    = '';
            userMessage.style.color      = 'red';
            userMessage.style.fontWeight = 'bold';
            userMessage.innerHTML        = 'The following errors occurred while sending the CSV data: <br />' + errorList;

            return; //End and do not refresh the page.
        }

        //Generate links for the user to follow.
        let linkValues = fileIds.map((id) => `<li><a href = "https://tstdrv2268311.app.netsuite.com/app/common/media/mediaitem.nl?id=${id}">File id : ${id}</a></li>`);
        let linkList   = `<p>Files Generated</p><ul>`;
        linkValues.forEach(function(listItem) {
            linkList += listItem;
        })
        linkList += '</ul>';

        userMessage.innerHTML = linkList;

    });

}

async function sendCsvData( csvFile, index ) {

    let data = {
        action      : 'sendCsvData',
        fileName    : 'csvFile' + index + '.csv',
        csvString   : csvFile
    };


    let postOptions = {
        method: 'POST',
        headers: {
            // 'Content-Type': 'text/plain'
            'Content-Type': 'application/json'
            // 'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: JSON.stringify(data)
    };

    let response    = await fetch(SUITELET_URL, postOptions);
    let json        = await response.json();

    return json;

}