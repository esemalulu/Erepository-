/**
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @return {void}
 */
function hideItemSublistBeforeLoad(type, form, request) {
    var sblList = form.getSubList('item');
    if(sblList) {
        sblList.setDisplayType('hidden');
    }
}