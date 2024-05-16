/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 */
define(["N/ui/message", "N/search"], function (message, search)
{

    function pageInit()
    {
        //If map/reduce still updating let the user know and not let them try again
        if (checkMRStatus(2442) > 0)
        {
            var alertMsg = message.create({
                title: "Update result status",
                message: "Script is already running, this may take up to 5-10 minutes",
                type: message.Type.WARNING
            });
            alertMsg.show();
        }

        var secondaryBtn = document.querySelector(".uir-secondary-buttons");
        if (secondaryBtn) secondaryBtn.style.display = "none";
    }

    function reloadPage()
    {
        location.reload();
    }

    function triggerUpdateResults()
    {
        debugger;
        var idTask = "";

        jQuery.ajax({
            url: "/app/site/hosting/scriptlet.nl?script=2441&deploy=1&execute=true",
            type: "get",
            async: false,
            success: function (data)
            {
                debugger;
                idTask = data;
            },
            error: function (error)
            {
                console.log('something went wrong', error);
            }
        });

        debugger;

        var buttonUpdate = document.getElementById("tbl_update_results_btn");
        if (!buttonUpdate) return;

        buttonUpdate.style.display = "none";

        if (idTask == "alreadyrunning")
        {
            var alertMsg = message.create({
                title: "Update result status",
                message: "Script is already running, this may take up to 5-10 minutes",
                type: message.Type.WARNING
            });
            alertMsg.show();
        }
        else
        {
            var alertMsg = message.create({
                title: "Update result status",
                message: "Script is running, this may take up to 5-10 minutes",
                type: message.Type.WARNING
            });
            alertMsg.show();
        }
    }

    function checkMRStatus(MR_SCRIPT)
    {
        debugger;
        var mrScriptInstanceLookup = search.create({
            type: "scheduledscriptinstance",
            filters: [
                ["percentcomplete", "lessthan", "100"],
                "AND",
                ["script.internalid", "anyof", MR_SCRIPT],
            ],
            columns: [
                search.createColumn({
                    name: "status",
                    label: "Status",
                }),
            ],
        });
        var searchResultCount = mrScriptInstanceLookup.runPaged().count || 0;
        return searchResultCount;
    }

    return {
        pageInit: pageInit,
        reloadPage: reloadPage,
        triggerUpdateResults: triggerUpdateResults,
    }
});
