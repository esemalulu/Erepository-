// custom code from https://663271-sb5.app.netsuite.com/app/common/custom/custrecordform.nl?l=T&rectype=1219&id=230&id=230&h=75a9ead312a7627f7434
function saveRecord() {
    var elementsArray = document.getElementsByClassName('showHiddenText');
    for (var i = 0; i < elementsArray.length; i++) {
        var checkBoxChecked = elementsArray[i].checked;
        if (checkBoxChecked) {
            window.open("https://gtnr.it/36kow5S");
            return true;
        }
    }
}