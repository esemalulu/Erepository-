/**
 * @NApiVersion 2.x
 */

define(["N/runtime","N/url","N/file","N/config","N/email","N/search","N/record","N/format","N/task","N/error"], function(NS_Runtime,NS_Url,NS_File,NS_Config,NS_Email,NS_Search,NS_Record,NS_Format,NS_Task,NS_Error) {

    /*
     * Module Description
     * 
     * Version    Date            Author           Remarks
     * 1.00       18 Sep 2012     mburstein
     *
     */
    /**
     * This function is used to build a multi dimensional array for easy access to product specific values.
     *
     * @param acrId = internal ID of Product Type
     * @param acrFieldId = internal ID of ACR record field accessing specific value
     * @returns {Array} arrProductTypes[acrId][acrFiedlId]
     *
     */
    function grabAllProductTypes(byRecordId) {
        var arrProductTypes = new Array();
        var arrSearchFilters = new Array();
        arrSearchFilters[arrSearchFilters.length] = NS_Search.createFilter({
            name: 'isinactive',
            join: null,
            operator: 'is',
            values: false
        });
        var arrSearchColumns = new Array();
        arrSearchColumns[0] = NS_Search.createColumn({ name: 'custrecordr7acrrecordid' });
        arrSearchColumns[1] = NS_Search.createColumn({ name: 'custrecordr7acrexpirationfieldid' });
        arrSearchColumns[2] = NS_Search.createColumn({ name: 'custrecordr7acrlicensefieldid' });
        arrSearchColumns[3] = NS_Search.createColumn({ name: 'custrecordr7acrsalesrepfieldid' });
        arrSearchColumns[4] = NS_Search.createColumn({ name: 'custrecordr7acrsalesorderfieldid' });
        arrSearchColumns[5] = NS_Search.createColumn({ name: 'custrecordr7acritemoptionfieldid' });
        arrSearchColumns[6] = NS_Search.createColumn({ name: 'custrecordr7acritemoptionfieldname' });
        arrSearchColumns[7] = NS_Search.createColumn({ name: 'custrecordr7acrcustomerfieldid' });
        arrSearchColumns[8] = NS_Search.createColumn({ name: 'custrecordr7acrcontactfieldid' });
        arrSearchColumns[9] = NS_Search.createColumn({ name: 'custrecordr7acractivationid' });
        arrSearchColumns[10] = NS_Search.createColumn({ name: 'custrecordr7acrtemplatefieldid' });
        arrSearchColumns[11] = NS_Search.createColumn({ name: 'custrecordr7acrexpirationcomponentid' });
        arrSearchColumns[12] = NS_Search.createColumn({ name: 'custrecordr7acrfieldidstoempty' });
        arrSearchColumns[13] = NS_Search.createColumn({ name: 'custrecordr7acrserialnumberid' });
        //Product Serial Number
        arrSearchColumns[14] = NS_Search.createColumn({ name: 'custrecordr7acrresetrecid' });
        arrSearchColumns[15] = NS_Search.createColumn({ name: 'custrecordr7acrresetlicenseid' });
        arrSearchColumns[16] = NS_Search.createColumn({ name: 'custrecordr7acrresetactivation' });
        arrSearchColumns[17] = NS_Search.createColumn({ name: 'custrecordr7acrresetcomments' });
        arrSearchColumns[18] = NS_Search.createColumn({ name: 'custrecordr7acritemfamily_fieldid' });
        // License Monitoring and IPR
        arrSearchColumns[19] = NS_Search.createColumn({ name: 'custrecordr7acrlicmarketingtemplaterecid' });
        arrSearchColumns[20] = NS_Search.createColumn({ name: 'custrecordr7acrproductaccesscodeid' });
        arrSearchColumns[21] = NS_Search.createColumn({ name: 'custrecordr7acriprreturnpath' });
        // Display name
        arrSearchColumns[22] = NS_Search.createColumn({ name: 'name' });
        arrSearchColumns[23] = NS_Search.createColumn({ name: 'custrecordr7acriprscriptid' });
        arrSearchColumns[24] = NS_Search.createColumn({ name: 'custrecordr7acrdeployid' });
        arrSearchColumns[25] = NS_Search.createColumn({ name: 'custrecordr7acrlicenseserialnumber' });
        //License Serial Number
        arrSearchColumns[26] = NS_Search.createColumn({ name: 'custrecordr7acrexpirationdateindaysid' });
        //Expiration in Days
        arrSearchColumns[27] = NS_Search.createColumn({ name: 'custrecordr7acrmarklictemplaterecid' });
        //Marketing License Template Record Id
        //feature management stuff
        arrSearchColumns[28] = NS_Search.createColumn({ name: 'custrecordr7acrfeaturemngcreatedfieldid' });
        arrSearchColumns[29] = NS_Search.createColumn({ name: 'custrecordr7acrfeaturemngreclinkfieldid' });
        //other
        arrSearchColumns[30] = NS_Search.createColumn({ name: 'custrecordr7acropportunityfieldid' });
        arrSearchColumns[31] = NS_Search.createColumn({ name: 'custrecordr7acrcreatedfromlinehash' });
        arrSearchColumns[32] = NS_Search.createColumn({ name: 'custrecordr7acrsync_up_ipims' });
        arrSearchColumns[33] = NS_Search.createColumn({ name: 'custrecordr7acrpackagelicensefieldid' });
        var arrSearchResults = NS_Search.create({
                type: 'customrecordr7acrproducttype',
                filters: arrSearchFilters,
                columns: arrSearchColumns
            }).run().getRange(0, 1000)
        ;
        for (var i = 0; arrSearchResults != null && i < arrSearchResults.length; i++) {
            var prodFields = new Object();
            var searchResult = arrSearchResults[i];
            var prodTypeId = searchResult.id;
            var recordId = searchResult.getValue(arrSearchColumns[0]);
            prodFields['productid'] = prodTypeId;
            prodFields['recordid'] = recordId;
            prodFields['expiration'] = searchResult.getValue(arrSearchColumns[1]);
            prodFields['licenseid'] = searchResult.getValue(arrSearchColumns[2]);
            prodFields['salesrep'] = searchResult.getValue(arrSearchColumns[3]);
            prodFields['salesorder'] = searchResult.getValue(arrSearchColumns[4]);
            prodFields['optionid'] = searchResult.getValue(arrSearchColumns[5]);
            prodFields['optionname'] = searchResult.getValue(arrSearchColumns[6]);
            prodFields['customer'] = searchResult.getValue(arrSearchColumns[7]);
            prodFields['contact'] = searchResult.getValue(arrSearchColumns[8]);
            prodFields['activationid'] = searchResult.getValue(arrSearchColumns[9]);
            prodFields['templateid'] = searchResult.getValue(arrSearchColumns[10]);
            prodFields['componentid'] = searchResult.getValue(arrSearchColumns[11]);
            prodFields['emptyfields'] = searchResult.getValue(arrSearchColumns[12]);
            prodFields['serialid'] = searchResult.getValue(arrSearchColumns[13]);
            prodFields['resetrecid'] = searchResult.getValue(arrSearchColumns[14]);
            prodFields['resetlicenseid'] = searchResult.getValue(arrSearchColumns[15]);
            prodFields['resetactivation'] = searchResult.getValue(arrSearchColumns[16]);
            prodFields['resetcomments'] = searchResult.getValue(arrSearchColumns[17]);
            prodFields['itemfamily'] = searchResult.getValue(arrSearchColumns[18]);
            prodFields['marktemprecid'] = searchResult.getValue(arrSearchColumns[19]);
            prodFields['axscoderecid'] = searchResult.getValue(arrSearchColumns[20]);
            prodFields['returnpath'] = searchResult.getValue(arrSearchColumns[21]);
            prodFields['name'] = searchResult.getValue(arrSearchColumns[22]);
            prodFields['iprscriptid'] = searchResult.getValue(arrSearchColumns[23]);
            prodFields['iprdeployid'] = searchResult.getValue(arrSearchColumns[24]);
            prodFields['licserialid'] = searchResult.getValue(arrSearchColumns[25]);
            prodFields['expindaysid'] = searchResult.getValue(arrSearchColumns[26]);
            prodFields['marklictemprecid'] = searchResult.getValue(arrSearchColumns[27]);
            prodFields['fmrcreatedid'] = searchResult.getValue(arrSearchColumns[28]);
            prodFields['fmrreclinkid'] = searchResult.getValue(arrSearchColumns[29]);
            prodFields['opportunity'] = searchResult.getValue(arrSearchColumns[30]);
            prodFields['createdFromLineHash'] = searchResult.getValue(arrSearchColumns[31]);
            prodFields['syncUpWithIpims'] = searchResult.getValue(arrSearchColumns[32]);
            prodFields['packageLicense'] = searchResult.getValue(arrSearchColumns[33]);
            if (byRecordId) {
                arrProductTypes[recordId] = prodFields;
            } else {
                arrProductTypes[prodTypeId] = prodFields;
            }
        }
        return arrProductTypes;
    }

    return {
        grabAllProductTypes: grabAllProductTypes
    }

});