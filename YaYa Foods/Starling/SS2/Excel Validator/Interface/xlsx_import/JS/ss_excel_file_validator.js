/**
 *
 * This script was provided by Starling Solutions.
 *
 * Provides basic excel spreadsheet validation based on values set within the spreadsheet
 *
 *  Version     Date            Author              Ticket         Remarks
 ***********************************************************************************************************************
 *  1.0         13 Oct 2020     Kassim/Nick         STP-146        Initial Version
 ***********************************************************************************************************************
 */

let theValue;
let numberOfFails   = 0, numberOfPasses = 0;

let sheets          = {};
const avoidRows     = [10,11]; // These cells are not used the by this import. These are used in the "Validate" VB script on the sheet.
const mandatoryRow  = 6; //This is always the row that determines whether a column is mandatory or not.
const stringTypes   = ['String', 'Phone', 'Email' ]; //Types of cells that will need to be checked for length.

const ROW_DEFINITIONS = {
    FIELD_ID    : 2, // Contains the row's internal Netsuite Id
    SUBLIST     : 5, // Contains the sublist name if sublist values must be set - combine with field Id to set sublist values
    MANDATORY   : 6, // Whether or not a column's values are mandatory
    NUM_CHARS   : 7, // The maximum number of characters a field can use
    SEARCH_TYPE : 8, // If a search is necessary for a list evaluation, specifiy what kind of search is necessary here.
    FIELD_TYPE  : 9, // The type of field - String, Boolean, List, etc.
    LINKED      : 11, // Add a value here equal to one of the previous sheets' record type to disallow column values from validation
    DUPLICATE   : 12, // Whether or not duplcate values are allowed within this row.
    SEARCH_ID   : 13, // If a search is necessary for list validation, specify it's internal Netsuite Id here.
    HEADER      : 13  // The last row of the header section.  Only evaluate data below this row.
};

let VALIDATIONS     = []; //Hold promises for each sheet's list validation attempts

// Custom data construct designed to hold the information
const DATA_CONSTRUCT = {
    column          : null, // Currently a number, but might be changed to a letter later on;
    fieldId         : '',   // String
    fieldType       : '',   // String
    isMandatory     : null, // Boolean
    characterLimit  : 0,
    linked          : '',   //String
    allowDuplicates : null, // Boolean
    uniqueValues    : [],   //If a row does not allow duplicates, store its unique values to ensure no duplicates are found.
    rows            : []    // Length will be number of rows plus 1. Data will actually start from rows[12]; rows[0] to [11] will be empty/undefined.
};                          // However, I could later on add the data within DATA_CONSTRUCT to their respective rows within the array.
                            // But right now, I feel that would be redundant;

const ROW_CONSTRUCT = {
    // rowNum : num,
    value   : theValue, // theValue is just a placeholder;
    isValid : null      // Boolean
};

const VALIDATED_CELL  = {
    v : 'Validated', //Value
    w : 'Validated', //Text only value (for CSV)
    t : 's',     //Type - set to s for String
    c : [],      //Comments
    s : {
        patternType : 'solid', fgColor : { index : 11, rgb : '00FF00' },
        color : { rgb : '555555' } //Grey
    }    //Style to be applied.
};

const ERROR_OBJECT  = {
    v : 'ERROR', //Value
    w : 'ERROR', //Text only value (for CSV)
    t : 's',     //Type - set to s for String
    c : [],      //Comments
    s : { patternType : 'solid', fgColor : { index : 11, rgb : 'FF0000' } }    //Style to be applied.
};



/**
 * Validates the data within a .XLS(X) workbook and places the data in a construct within an object.
 * The data can be accessed using the corresponding fieldID as a key.
 * @param {Object} - workbook - The Excel file to be validated.
 * @param {String} - fileName - The name of the incoming file to be saved back to the user's computer if errors are found.
 * @returns {Number} - numberOfFails - The number of failed cells. If > 0, the submit button will not be shown.
 */
function runBasicValidation (workbook, fileName, callback ) {  // Function name subject to change
    let recordTypes = [];
    workbook.SheetNames.forEach(function (sheetName) {
        if ( sheetName.toLowerCase() == 'reserved' ) {
            return;
        }
        let columns     = {};
        let sheet       = workbook.Sheets[sheetName];
        let range       = XLSX.utils.decode_range(sheet['!ref']);
        let errorCol    = range.e.c; //Find the last column.  This is where the true/false bool will be displayed on rows.
        let recordText  = sheet[XLSX.utils.encode_cell({ c : 0, r : 0 })].v; //Get the record type for this sheet.
        if ( !recordText ) {
            return;
        }
        let recordType = recordText.toLowerCase().split(' ')[0];
        recordTypes.push(recordType); //Send this to the validation for lists.  Used to exclude checks on records that haven't been made.

        let list_lookup = {}; //Holds all list values to be matched against searches

        for (let theColumn = ( range.s.c ) + 1; theColumn <= range.e.c; ++theColumn) {
            sheet[XLSX.utils.encode_cell({ c : theColumn, r : 0 })] = VALIDATED_CELL; //Initializ all top rows to "Validated".  Errors will alter this.
            sheet[XLSX.utils.encode_cell({ c : theColumn, r : 2 })].t = 's';    // Set the data type of the row containing the fieldID to string;

            let fieldIdRaw  = sheet[XLSX.utils.encode_cell({ c : theColumn, r : 2 })].v;
            let numChars    = ( sheet[XLSX.utils.encode_cell({ c : theColumn, r : ROW_DEFINITIONS.NUM_CHARS })] && !isNaN( Number(sheet[XLSX.utils.encode_cell({ c : theColumn, r : ROW_DEFINITIONS.NUM_CHARS })].v )) ) ?
                           Number(sheet[XLSX.utils.encode_cell({ c : theColumn, r : ROW_DEFINITIONS.NUM_CHARS })].v) :
                           1000; //Find the number of characters allowed in cells in this column.

            if (!fieldIdRaw) {
                //Todo This should be handled in a different way.  If the column is after the errors, col, it just shouldn't be counted at all.
                console.log(`No fieldId on column ${theColumn} - Sheet ${sheetName}. If your spreadsheet shows a fieldId here, try deleting all columns to the right of your data.`);
                throw( 'No fieldId on column ' + theColumn  );
            }
            let pattern  = /[\r\n]/g; //Remove end of line characters from the received Excel field.
            let fieldId  = fieldIdRaw.replace(pattern, '');

            //If this column is mandatory, check to ensure that all field are populated.
            //If this column has duplicates, find out here.

            // Copy the data construct to our new object inside the columns object.
            columns[fieldId] = JSON.parse(JSON.stringify(DATA_CONSTRUCT));

            for (let theRow = range.s.r; theRow <= range.e.r; ++theRow) {

                let rowData = {};
                
                // Skip rows listed in avoidRows array
                if (avoidRows.includes(theRow) || theColumn == errorCol ) {
                    continue;
                }
                // Assign current cell address to the variable 'cell'
                let cell = sheet[XLSX.utils.encode_cell({ c : theColumn, r : theRow })];

                if ( ( !cell || !cell.w ) && columns[fieldId].isMandatory && theRow > ROW_DEFINITIONS.HEADER ) {

                   //Create an error object and assign it to this cell.
                    let cellError   = JSON.parse(JSON.stringify(ERROR_OBJECT));
                    let headerError = JSON.parse(JSON.stringify(ERROR_OBJECT));
                    sheet[XLSX.utils.encode_cell({ c : theColumn, r : theRow })] = cellError;
                    sheet[XLSX.utils.encode_cell({ c : theColumn, r : 0 })]      = headerError;
                    addErrorMessage(sheet, theColumn, 'Mandatory Field not populated. Please populate any highlighted fields and try again.' );
                    numberOfFails++;
                    continue;
                }
                else if ( !cell || !cell.w ) {
                    continue; //Just forego any further validation if the field isn't present and isn't mandatory.
                }

                let cellDataType = cell.t;

                columns[fieldId].column = theColumn;

                // Set the appropriate cell data type, then assign its value to the corresponding property.
                switch (theRow) {
                    case ROW_DEFINITIONS.FIELD_ID: {
                        cellDataType             = 's';               // String
                        columns[fieldId].fieldId = cell.v;
                        break;
                    }
                    case ROW_DEFINITIONS.MANDATORY: {
                        cellDataType                 = 'b';           // Boolean
                        columns[fieldId].isMandatory = cell.v == 'TRUE';
                        break;
                    }
                    case ROW_DEFINITIONS.NUM_CHARS: {
                        cellDataType                    = 'n';        // Number
                        columns[fieldId].characterLimit = cell.v;
                        break;
                    }
                    case ROW_DEFINITIONS.FIELD_TYPE: {
                        cellDataType               = 's';             // String
                        columns[fieldId].fieldType = cell.v;
                        break;
                    }
                    case ROW_DEFINITIONS.LINKED: {
                        cellDataType                     = 's';       // String
                        columns[fieldId].linked          = cell.v;
                        break;
                    }
                    case ROW_DEFINITIONS.DUPLICATE: {
                        cellDataType                     = 'b';       // Boolean
                        columns[fieldId].allowDuplicates = cell.v;
                        break;
                    }
                }
                /* Every row after row 11 contains customer information/data. This part grabs the data row by row then validates it.
                 *  The validity of the data is stored in the isValid property of the current row data construct, as defined at the top of this code;
                 */
                if (theRow > ROW_DEFINITIONS.HEADER) {
                    // Copy the row data construct to 'theRow' inside the rowData object.
                    rowData[theRow]       = JSON.parse(JSON.stringify(ROW_CONSTRUCT));
                    rowData[theRow].value = sheet[XLSX.utils.encode_cell({ c : theColumn, r : theRow })].v; // Assigns the value of the current cell to the value property of the current row data construct;

                    if ( !columns[fieldId].allowDuplicates ) {
                        if ( checkDuplicateValues( columns[fieldId].uniqueValues, rowData[theRow].value ) ) {
                            let cellError   = JSON.parse(JSON.stringify(ERROR_OBJECT));
                            let headerError = JSON.parse(JSON.stringify(ERROR_OBJECT));

                            //If there is a duplicate, add a comment to the cell to let the user know where it is.
                            sheet[XLSX.utils.encode_cell({ c : theColumn, r : theRow })].s = cellError.s;
                            sheet[XLSX.utils.encode_cell({ c : theColumn, r : 0 })]        = headerError;
                            addErrorMessage(sheet, theColumn, 'Duplicate Values are not valid in this column. Please fix any duplicates highlighted in this column.')
                            numberOfFails++;
                        }
                    }

                    columns[fieldId].rows[theRow] = rowData[theRow];
                    
                    let currentCell     = columns[fieldId].rows[theRow]; //Creates a nicer looking alias to reference our data.
                    let cellValidation  = { isValid : true, errors : [] };

                    // Perform validations here.
                    //If for some reason the column has no field type, we can't validate it.
                    if (!columns[fieldId].fieldType ) {
                    }
                    if (columns[fieldId].fieldType && columns[fieldId].fieldType.toLowerCase() == 'string') {
                        currentCell.value.t = 's';
                        validateString(currentCell.value, cellValidation);
                    }
                    if (columns[fieldId].fieldType && columns[fieldId].fieldType.toLowerCase() == 'boolean') {
                        currentCell.value.t = 'b';
                        validateBoolean(currentCell.value, cellValidation);
                        currentCell.value.w = currentCell.value == true ? 'true' : 'false';  //Sets the CSV value to lowercase true or false
                    }
                    if (columns[fieldId].fieldType && columns[fieldId].fieldType.toLowerCase() == 'phone') {
                        currentCell.value.t = 's';
                        validatePhone(currentCell.value, cellValidation);
                    }
                    if (columns[fieldId].fieldType && columns[fieldId].fieldType.toLowerCase() == 'numbers') {
                        currentCell.value.t = 'n';
                        validateInteger(currentCell.value, cellValidation);
                    }
                    if (columns[fieldId].fieldType && columns[fieldId].fieldType.toLowerCase() == 'decimal') {
                        currentCell.value.t = 'n';
                        validateFloat(currentCell.value, cellValidation);
                    }
                    if (columns[fieldId].fieldType && columns[fieldId].fieldType.toLowerCase() == 'email') {
                        currentCell.value.t = 's';
                        validateEmail(currentCell.value, cellValidation);
                    }
                    if (columns[fieldId].fieldType && columns[fieldId].fieldType.toLowerCase() == 'currency') {
                        currentCell.value.t = 's';  // Currency will be type string so the customer can add a dollar sign, if they want.
                        validateCurrency(currentCell.value, cellValidation);
                    }
                    if (columns[fieldId].fieldType && columns[fieldId].fieldType.toLowerCase() == 'percentage') {
                        currentCell.value.t = 's';
                        validatePercent(currentCell.value, cellValidation);
                    }
                    if (columns[fieldId].fieldType && columns[fieldId].fieldType.toLowerCase() == 'checkbox') {
                        currentCell.value.t = 'b';
                        validateCheckbox(currentCell.value, cellValidation);
                        currentCell.value.w = currentCell.value == true ? 'true' : 'false'; //Sets the CSV value to lowercase true or false

                    }
                    if (columns[fieldId].fieldType && columns[fieldId].fieldType.toLowerCase() == 'date') {
                        currentCell.value.t = 's';
                        valiDate(currentCell.value, cellValidation);
                    }
                    if (columns[fieldId].fieldType && columns[fieldId].fieldType.toLowerCase() == 'list') {
                        currentCell.value.t = 's';
                        addValueToLookup( sheet, theRow, theColumn, list_lookup, fieldId );
                    }

                    if ( stringTypes.includes(columns[fieldId].fieldType) ) {
                        //For certain types of cell, check to ensure the length of the string hasn't been exceeded.
                        checkCellLength( currentCell, cellValidation, numChars );

                    }

                    if ( cellValidation.errors.length ) {
                        let cellError   = JSON.parse(JSON.stringify(ERROR_OBJECT));
                        let headerError = JSON.parse(JSON.stringify(ERROR_OBJECT));
                        cellValidation.errors.forEach(function(errorMessage, index) {
                            if ( index === 0 ) {
                                sheet[XLSX.utils.encode_cell({ c : theColumn, r : theRow })].s = cellError.s;
                                addErrorMessage(sheet, theColumn, errorMessage);
                                // sheet[XLSX.utils.encode_cell({ c : theColumn, r : theRow })].c = [ { a : 'Starling Solutions', t : errorMessage } ];
                            }
                            else {
                                addErrorMessage(sheet, theColumn, errorMessage);
                                // sheet[XLSX.utils.encode_cell({ c : theColumn, r : theRow })].c.push( { a : 'Starling Solutions', t : errorMessage } );
                            }
                        });
                        let endRowError = JSON.parse(JSON.stringify(ERROR_OBJECT));
                        endRowError.t   = 'b';
                        endRowError.v   = true;
                        sheet[XLSX.utils.encode_cell({ c : errorCol, r : theRow })] = endRowError;
                    }

                }
            }
        }

        //Populate the lists and validate them here.
        console.log(list_lookup);
        VALIDATIONS.push( validateLists(list_lookup, recordType, sheetName, recordTypes )); //Add a task for each
        sheets[sheetName] = columns;
    });

    Promise.all(VALIDATIONS)
    .then((responses) => {

        responses.forEach(function(res) {

            console.log(res);

            let lookupList  = res.lookup;
            let sheetName   = res.sheetName;
            let sheet       = workbook.Sheets[sheetName];
            let range       = XLSX.utils.decode_range(sheet['!ref']);
            let errorCol    = range.e.c; //Find the last column.  This is where the true/false bool will be displayed on rows.
            let headerError = JSON.parse(JSON.stringify(ERROR_OBJECT));
            let endRowError = JSON.parse(JSON.stringify(ERROR_OBJECT));
            endRowError.t   = 'b';
            endRowError.v   = true;

            //For each value that is returned, write the internal id (if found) to the value's cell.
            Object.keys(lookupList).forEach(function(fieldId) {
                if ( lookupList[fieldId].error ) {
                    sheet[XLSX.utils.encode_cell({ c : errorCol, r : lookupList[fieldId].row })] = endRowError;
                    sheet[XLSX.utils.encode_cell({ c : lookupList[fieldId].column, r : 0 })] = headerError;
                    addErrorMessage( sheet, lookupList[fieldId].column, lookupList[fieldId].error );
                }

                //Loop through each value and each address and update the cell's "w" value OR highlight that cell if no id was provided.
                let listValues  = Object.keys(lookupList[fieldId].values);

                for ( let i=0; i < listValues.length; i++ ) {
                    let value = lookupList[fieldId].values[listValues[i]];

                    for ( let j=0; j < value.addresses.length; j++ ) {
                        if ( value.internalId ) {
                            sheet[value.addresses[j]].w = value.internalId;
                            continue;
                        }

                        if ( value.skipValidation ) {
                            continue; //This column is dependent on a column in a previous sheet. Don't throw an error for a null value.
                        }
                        //If no internal id is found, highlight the cell
                        sheet[value.addresses[j]].s = headerError.s;
                        numberOfFails++;
                    }
                }

            });



        });

    })
    .then(()=> {
        if ( numberOfFails > 0 ) {
            XLSX.writeFile(workbook, 'Errors - ' + fileName, {cellStyles : true});

            let args = { errors : numberOfFails, message : `Found ${numberOfFails} ${numberOfFails > 1 ? 'errors' : 'error'}. A file has been downloaded to your computer highlighting errors that prevent submission.  Please address these errors and resubmit.` };
            callback(args);
            return;
        }
        let args = { errors : null, message : 'Validation successful. Please submit your workbook for processing and import. You will be notified by email when complete.' }; //If we get here, the validation was successful and we can submit the file for processing.
        callback(args);
    })
    .catch((e) => {
        console.log(e);
        let args = { errors : numberOfFails, message : `Error reading file. Please check the console for error messages.` };
        callback(args);
        return;
    })

}


/**
 * Check for duplicates in a column where duplicates are not allowed
 * @param sheetsObject
 * @returns {boolean}
 */
function checkDuplicates (sheetsObject) {
    for (const sheet in sheetsObject) {
        let length = XLSX.utils.decode_range(sheet['!ref']).e.c;
        for (const col in sheet) {
            if (col.allowDuplicates == true) {
                continue;
            }
            else if (col.allowDuplicates == false) {
                for (let x = 11; x < length; ++x) {
                    let temp = col.rows[x];
                    for (let y = x + 1; y < length; ++y) {
                        if (temp == col.rows[y]) {
                            numberOfFails++;
                        }
                        else {
                            continue;
                        }
                    }
                }
            }
        }
    }
}

function checkDuplicateValues ( uniqueValues, value ) {

    let cleanValue = null;
    //If the values are strings, set them to lowercase, trim them, and remove whitespace to reduce errors.
    if ( typeof value == 'string' ) {
        cleanValue = value.toLowerCase().trim().replace(/\s/g, '');
    }
    else {
        cleanValue = value;
    }

    if ( uniqueValues.includes( cleanValue ) ) {
        return true;
    }

    //If there were no duplicates yet, push the clean value and try it again.
    uniqueValues.push( cleanValue );
    return false;


}

//Begin validation functions

/**
 * String validation function
 * @param thing
 * @returns {boolean}
 */
function validateString ( value, validationObj ) {

    try {
        let str = String(value);
    }
    catch(e) {
        numberOfFails++;
        validationObj.isValid = false; //Set the cell's isValid to false. This will let us know to format the string.
        validationObj.errors.push('Not a valid string.');
    }

}


/**
 * Boolean validation function
 * @param thing
 * @returns {boolean}
 */
function validateBoolean ( value, validationObj ) {

    if ( typeof value === 'string' ) {
        let isBool = String(value).toLowerCase().trim() == 'false' || String(value).toLowerCase().trim() == 'true';
        if ( isBool ){
            console.log('It\'s a bool!');
            return;
        }

    }

    if (( typeof value ) !== 'boolean' ) {
        numberOfFails++;
        validationObj.isValid = false; //Set the cell's isValid to false. This will let us know to format the string.
        validationObj.errors.push('Expected a boolean (true or false)');
    }
    else {

    }
}


/**
 * Integer validation function
 * @param thing
 * @returns {boolean}
 */
function validateInteger ( value, validationObj ) { // Argument name subject to change

    if ( !Number.isInteger( value ) ) {

        numberOfFails++;
        validationObj.isValid = false; //Set the cell's isValid to false. This will let us know to format the string.
        validationObj.errors.push('Integer fields may only contain whole numbers.');

    }

}


/**
 * Float/Decimal validation function
 * @param thing
 * @returns {boolean}
 */
function validateFloat ( value, validationObj ) {
    if ( isNaN(Number(value)) ) {

        numberOfFails++;
        validationObj.isValid = false; //Set the cell's isValid to false. This will let us know to format the string.
        validationObj.errors.push('Values in this columns must be numbers or decimal numbers.');

    }
}


/**
 * Email address validation function
 * @param thing
 * @returns {boolean}
 */
function validateEmail ( value, validationObj ) {

    // Derived from an existing regex on the internet
    const regExp = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    if ( !regExp.test( value ) ) {
        numberOfFails++;
        validationObj.isValid = false; //Set the cell's isValid to false. This will let us know to format the string.
        validationObj.errors.push('Not a valid email address.');
    }
}


/**
 * Percentage validation function
 * @param thing
 * @returns {boolean}
 */
function validatePercent ( value, validationObj ) {

    let temp = String( value ).replace('%', '');

    if ( Number.isNaN( Number(temp) ) ) {
        numberOfFails++;
        validationObj.isValid = false; //Set the cell's isValid to false. This will let us know to format the string.
        validationObj.errors.push('Not a valid percentage.');
    }

}


/**
 *
 * @param thing
 * @returns {boolean}
 */
function validateCheckbox ( value, validationObj ) {

    if ( typeof value != 'Boolean' ) {
        numberOfFails++;
        validationObj.isValid = false; //Set the cell's isValid to false. This will let us know to format the string.
        validationObj.errors.push('Expected a boolean (true or false) for a checkbox.');
    }

}


/**
 * (Multiple Select) List validation function
 * @param thing
 */
async function validateLists ( lookupList, recordType, sheetName, recordTypes ) {

    let data = {
        action       : 'validateList',
        recordType   : recordType,
        validateList : true,
        lookupList   : lookupList,
        sheetName    : sheetName,
        recordTypes  : recordTypes,
    };

    let postOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    };

    let response    = await fetch(SUITELET_URL, postOptions);
    let json        = await response.json();

    return json;

}

/**
 * Adds all list values to a lookup table which will be used to validate each cell's data to ensure we can match the data in the spreadsheet with NS data.
 * @param thing
 */
function addValueToLookup( sheet, row, column, lookupList, fieldId ) {

    let cellAddress = XLSX.utils.encode_cell({ c : column, r : row });
    let value       = sheet[cellAddress];

    if ( !value ) {
        return;
    }

    let isNum       = !isNaN(Number(value.v)); //Check to see if the value is a number or text.
    let sublistId   = ( sheet[ XLSX.utils.encode_cell({ c : column, r : ROW_DEFINITIONS.SUBLIST }) ] )   ? sheet[ XLSX.utils.encode_cell({ c : column, r : ROW_DEFINITIONS.SUBLIST}) ].v : null;
    let searchType  = ( sheet[ XLSX.utils.encode_cell({ c : column, r : ROW_DEFINITIONS.SEARCH_TYPE }) ] ) ? sheet[ XLSX.utils.encode_cell({ c : column, r : ROW_DEFINITIONS.SEARCH_TYPE }) ].v : null;
    let searchId    = ( sheet[ XLSX.utils.encode_cell({ c : column, r : ROW_DEFINITIONS.SEARCH_ID }) ] )   ? sheet[ XLSX.utils.encode_cell({ c : column, r : ROW_DEFINITIONS.SEARCH_ID }) ].v : null;
    let linkedRec   = ( sheet[ XLSX.utils.encode_cell({ c : column, r : ROW_DEFINITIONS.LINKED }) ] )   ? sheet[ XLSX.utils.encode_cell({ c : column, r : ROW_DEFINITIONS.LINKED }) ].v : null;

    if ( !lookupList[fieldId] ) {
        lookupList[fieldId] = {
            isInternalId : isNum,
            column       : column,
            row          : row,
            sublistId    : sublistId,
            searchType   : searchType,
            searchId     : searchId,
            linkedRec    : linkedRec,
            error        : null, //If any errors are thrown during validation, they will be recorded and passed back from the SLE
            values       : {}
        };
    }


    //Take the value in this field and ensure that there are no extraneous return characters in it.
    let rawValue = value.v;

    if ( !rawValue ) {
        return;
    }

    let pattern  = /[\r\n]/g; //Remove end of line characters from the received Excel field.
    let cleanValue = rawValue.replace(pattern, '');

    if ( lookupList[fieldId].values[cleanValue]) {
        lookupList[fieldId].values[cleanValue].addresses.push(cellAddress);
        return;
    }

    lookupList[fieldId].values[cleanValue] =  { addresses : [cellAddress], internalId : null, skipValidation : false };

}


/**
 * Date validation function
 * @param {String} - value - The incoming value to be validated
 * @param {Object} - validationObj - The object to be written to if there is an error.
 */
function valiDate ( value, validationObj ) { // Validate Date formatted as 'mm/dd/yyyy'
    //Derived from a solution on Stack Overflow
    // First check for the pattern
    if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test( value )) {
        numberOfFails++;
        validationObj.isValid = false; //Set the cell's isValid to false. This will let us know to format the string.
        validationObj.errors.push('Invalid Date Format. Dates must be entered in mm/dd/yyyy pattern only.');
        return;
    }

    // Parse the date parts to integers
    let parts = value.split('/');
    let day   = parseInt(parts[1], 10);
    let month = parseInt(parts[0], 10);
    let year  = parseInt(parts[2], 10);

    // Check the ranges of month and year
    if (year < 1000 || year > 3000 || month == 0 || month > 12) {
        numberOfFails++;
        validationObj.isValid = false; //Set the cell's isValid to false. This will let us know to format the string.
        validationObj.errors.push('Invalid Date. Year or month out of range.');
        return;
    }

    let monthLength = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    // Adjust for leap years
    if (year % 400 == 0 || ( year % 100 != 0 && year % 4 == 0 )) {
        monthLength[1] = 29;
    }

    // Check the range of the day
    if (day > 0 && day <= monthLength[month - 1]) {
        return;
    }
    else {
        numberOfFails++;
        validationObj.isValid = false; //Set the cell's isValid to false. This will let us know to format the string.
        validationObj.errors.push('Invalid date.  Day is out of range.');
        return;
    }
}


/**
 * Currency validation function
 * @param thing
 * @returns {boolean}
 */
function validateCurrency ( value, validationObj ) {

    // Only accounts for amounts less than 1,000,000,000 with commas included
    const regExp = /^\$?[0-9]\d*(((,\d{3}){1,2})?(\.\d{0,2})?)$/; // Derived from a regex on stack overflow

    if ( !regExp.test(value) ) {
        numberOfFails++;
        validationObj.isValid = false; //Set the cell's isValid to false. This will let us know to format the string.
        validationObj.errors.push('Does not match proper currency format.');
        return;
    }

}


/**
 * Phone number validation function
 * @param thingy
 * @returns {boolean}
 */
function validatePhone ( value, validationObj ) { // Argument name subject to change
    // RegEx derived from an existing one on Stack Overflow
    let phoneRegEx = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;      // Tests for the following formats: 'xxx.xxx.xxxx', 'xxx-xxx-xxxx', 'xxx xxx xxxx';
    if ( !value.match(phoneRegEx) ) {
        numberOfFails++;
        validationObj.isValid = false; //Set the cell's isValid to false. This will let us know to format the string.
        validationObj.errors.push('Invalid phone number. Please use one of the following formats : \'xxx.xxx.xxxx\', \'xxx-xxx-xxxx\', \'xxx xxx xxxx\' ');
        return true;
    }

}

/**
 * Date validation function
 * @param {Object} - currentCell - The cell in the table to be evaluated
 * @param {Object} - validationObj - The object to be written to if there is an error.
 * @param {Number} - numChars - The maximum number of characters specified by the excel sheet.
 */
function checkCellLength( currentCell, cellValidation, numChars ) {

    let thisValue = String(currentCell.value); //Convert to a string to avoid problems comparing two numbers.

    if ( !thisValue ) {
        return;
    }

    if ( thisValue.length && thisValue.length < numChars ) {
        return; //This value has passed validation
    }

    numberOfFails++;
    cellValidation.isValid = false;
    cellValidation.errors.push('Character limit exceeded.  Please enter a value with less than ' + numChars + ' characters.');

}


/**
 * Adds an error message to the second cell if the same message hasn't already been added.
 *
 * @param {Object} - sheet - The sheet being manipulated
 * @param {Number} - column - The index of the current column being validated
 * @param {String} - message - The error message to be added to the second row.
 */
function addErrorMessage( sheet, column, message ) {

    let errorCell = sheet[XLSX.utils.encode_cell({ c : column, r : 1 })];

    if ( !errorCell ) {
        sheet[XLSX.utils.encode_cell({ c : column, r : 1 })] = {
            v : '-- ' + message, //Value
            w : '-- ' + message, //Text only value (for CSV)
            t : 's',     //Type - set to s for String
            c : [],      //Comments
            s : { alignment : {horizontal : 'left', vertical : 'top', wrapText : true }}
        };
    }
    else if ( errorCell && !errorCell.v.includes(message) ) {
        errorCell.v += '\n -- ' + message;
    }

}

