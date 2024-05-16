/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */

define(['N/currentRecord', 'N/record'
  ], function (currentRecordModule,  record) {
  


    //Administrator rol
    var viewLabel = document.getElementById('locations_searchid_fs_lbl')
    var selectSearchInput = document.getElementById('inpt_searchid')
    var selectSearchSpan = document.getElementById('locations_searchid_fs')

    //sales rol
    var selectSearchInputSalePerson = document.getElementById('inpt_searchid1')
    var searchIdArrow = document.getElementById('inpt_searchid1_arrow')

    //Customize button
    var customize = document.getElementById('tdbody_customize')

    //5100 Internal ID of save search with the required columns
    //search Id for administrator rol
    var searchId = document.getElementById('hddn_searchid15')
    if(searchId){
      searchId.value=5100
      searchId.onchange = function(){
        setWindowChanged(window, true);
        Synclocationsrange();
      }
      var event = new Event('change');
      searchId.dispatchEvent(event);  
    } 

    //serch id for sales rol
    var searchIdSalePerson = document.getElementById('hddn_searchid1')
    if(searchIdSalePerson){
      searchIdSalePerson.value=5100
      searchIdSalePerson.onchange = function(){
        setWindowChanged(window, true);
        Synclocationsrange();
      }
      var event = new Event('change');
      searchIdSalePerson.dispatchEvent(event);  
    } 

    if(selectSearchSpan)selectSearchSpan.style.display='none'
    if(viewLabel) viewLabel.style.display='none'
    if(selectSearchInput)selectSearchInput.style.display='none'
    if(selectSearchInputSalePerson) selectSearchInputSalePerson.style.display='none'
    if(searchIdArrow) searchIdArrow.style.display='none'
    if(customize) customize.style.display='none'

    

    function pageInit(context) {
    }
  
    return {
      pageInit: pageInit,
    };
  });
  