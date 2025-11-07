/**
 * @NApiVersion 2.1
 * @NModuleScope public
 */

define(['N/runtime'], function (runtime) {

    const configurations = {
        //TODO
        // Production
        "1072652": {
            "token_url" : "https://account.veic.org/connect/token",
            "client_id": "NetSuite",
            "client_secret": "&qehBj9wp-2XT3r$RJaDSzFmg8Nsv/L5d",

            "tracker_url": "https://api.veic.org/trackerintegration/api/vouchers/updatestatus",
            "tracker_user_id": 91694,
        },

        // Development
        "1072652_SB1": {
            "token_url" : "https://accounttest.veic.org/connect/token",
            "client_id": "NetSuite",
            "client_secret": "&qehBj9wp-2XT3r$RJaDSzFmg8Nsv/L5d",

            //"tracker_url": "https://trackerpreview.veic.org/api/evt/vouchers/updatestatus",
             "tracker_url": "https://apipreview.veic.org/trackerintegration/api/vouchers/updatestatus",
            //"tracker_url": "https://apidev.veic.org/trackerintegration/api/vouchers/updatestatus",
            "tracker_user_id": 91694,
        },
      
        // TODO
        // Staging/Test/Preview
        "1072652_SB2": {
            "token_url" : "https://accounttest.veic.org/connect/token",
            "client_id": "NetSuite",
            "client_secret": "&qehBj9wp-2XT3r$RJaDSzFmg8Nsv/L5d",

            //"tracker_url": "https://trackerpreview.veic.org/api/evt/vouchers/updatestatus",
            "tracker_url": "https://apipreview.veic.org/trackerintegration/api/vouchers/updatestatus",
            "tracker_user_id": 91694,
        },
    }


    return {
        getConfigurations:  () => {
            if(configurations.hasOwnProperty(runtime.accountId)){
                return configurations[runtime.accountId];
            }
            return null;
        },

        getConfiguration:  (configName) => {
            if(configurations.hasOwnProperty(runtime.accountId)){
                if(configurations[runtime.accountId].hasOwnProperty(configName)){
                    return configurations[runtime.accountId][configName];
                }
            }
            return null;
        }
    }
});
