(function () {
    var myFunctions = {};
    myFunctions.validateStageBin = function () {
        var statedata = mobile.getRecordFromState();

        var stageBin = mobile.getValueFromPage('binPutaway_toBinList_scanBin');
        var stdRESTURL = '/app/site/hosting/restlet.nl?script=2787&deploy=1';
        var xhr = new XMLHttpRequest();
        var dataObj = {"params" : {}};
        var xhrResponseData = "";
        var response = {};
        dataObj.params.binName = stageBin;
        dataObj.params.warehouseLocationId = statedata.auxParams.warehouseLocation_LocationTbl.id;
        dataObj.params.opentaskid = statedata.scriptParams.opentaskid;

        var dataTxt  = JSON.stringify(dataObj);

        console.log(dataTxt);
        xhr.open("POST", stdRESTURL, false);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.onreadystatechange = function () { 
                xhrResponseData = JSON.parse(xhr.responseText);
                console.log('stdRESTURL: xhrResponseData: ', xhrResponseData);
                if(xhrResponseData.isValid == true ){
                    response = {
                        isValid: true,
                        errorMessage: ''
                    };
                }
                else{
                    mobile.setValueInPage('binPutaway_toBinList_scanBin', '');

                    response = {
                        isValid: false,
                        errorMessage: "Please Enter A Valid Bin "
                    };
                }
        }
        xhr.send(dataTxt);
        return response;
    }
    return myFunctions;
}());

