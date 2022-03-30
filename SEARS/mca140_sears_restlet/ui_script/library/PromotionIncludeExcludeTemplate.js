/*
 * This is a js library to add Include >> Exclude <<  Behaviout for "Brand Multiselect Field" .. To enable this lib just add this to the form library files and please copy the content of the form init and form save function 
 * to form's init, save and fieldChange Events.
 */
  function initIncludeExcludeTemplateEnvironment(recordId,recordName) {
    existingValues = Array();
    if($.isNumeric(recordId)) {
      existingValues = nlapiGetFieldTexts(recordName);
    }
    createIncludeExcludeBehaviour(existingValues,recordName);
  }

  function createIncludeExcludeBehaviour(existingValues,recordName) {
    console.log(existingValues);
    element = '<div class="" style="display: inline-block;margin-right:3px"><div><div><input type="button" class="" style="visibility:hidden;"></div>  <div style="display:block;"><input type="button" class="bntBgB insertIncludeExcludeButtons" name="addDiscount" value=" >> " data-reference="'+recordName+'" onClick="insertIncludeExcludeValue(this)" ></div><div style="display:block;margin-top:10px;"><input type="button" class="bntBgB removeIncludeExcludeButtons" name="addDiscount" onClick="removeIncludeExcludeValue(this)" value=" << " data-reference="'+recordName+'" ></div>  <div style="margin-top:10px"><input type="button" class="" style="visibility:hidden;"></div>  </div>  </div>';
    $('#'+recordName+'_fs_lbl_uir_label').parents().eq(0).append(element);
    results =" <table><tbody><tr><select style='width:185px;height:120px' id='includeExcludeResultSelect_"+recordName+"' multiple></select></tr></tbody></table>";
    $('#'+recordName+'_fs_lbl_uir_label').parents().eq(0).append(results);
    createIncludeExcludeBehaviourChanged(recordName);
    insertingIncludeExcludeOptions(existingValues,recordName);
  }


  function createIncludeExcludeBehaviourChanged(recordName) {
    $('#'+recordName+'_fs > div').css('width','185px');
  }

  function insertIncludeExcludeValue(element) {
    console.log(element);
    option = $(element).attr('data-reference');
    console.log("includeBrand:"+option);
    selected = nlapiGetFieldTexts(option);
    console.log(selected);
    insertingIncludeExcludeOptions(selected,option);
  }

  function insertingIncludeExcludeOptions(selected,recordName) {
    $.each(selected,function(key,value) {
      if(!($("#includeExcludeResultSelect_"+recordName+" option[value='"+value+"']").length > 0)) {
        if(value!='- New -') {
          $('#includeExcludeResultSelect_'+recordName).append($('<option>', { 
              value: value,
              text : value 
          }));          
        }
      }
    });

  }

  function removeIncludeExcludeValue(element) {
    console.log(element);
    option = $(element).attr('data-reference');
    console.log("excludeCategory:"+option);
    $.each(($('#includeExcludeResultSelect_'+option).val()),function(key,value) {
      $("#includeExcludeResultSelect_"+option+" option[value='"+value+"']").remove();
    });
  }

  function setIncludeExcludeValue(recordName) {
    console.log("setIncludeExcludeCategory");
    values = Array();
    $.each($('#includeExcludeResultSelect_'+recordName+' option'),function(key,value) {
      console.log(key);
      console.log(value);
      value = $(this).val(); console.log("value: " + value);
      values.push(value);
      //$("#includeExcludeCategoryResultSelect option[value='"+value+"']").remove();
    });
    console.log(values);
    nlapiSetFieldTexts(recordName,values);
    console.log("recordname:" + nlapiGetFieldTexts(recordName));
  }  


/*
  function pageInit() {
    recordId = parseInt(nlapiGetRecordId());
    initIncludeExcludeTemplateEnvironment(recordId,"custrecord_pf_included_brand");
    initIncludeExcludeTemplateEnvironment(recordId,"custrecord_pf_included_category");
    initIncludeExcludeTemplateEnvironment(recordId,"custrecord_pf_exclude_brand");
    initIncludeExcludeTemplateEnvironment(recordId,"custrecord_pf_exclude_category");
  }

    function fieldChanged(type, field) { 
      switch(field) {

          case getIncludeBrandRecord():
              createIncludeBrandBehaviourChanged();
              break;
          default:
                    //console.log("no fieds " + field);
      }
  }

  function saveRecord() {    
    setIncludeExcludeValue('custrecord_pf_included_brand');
    setIncludeExcludeValue('custrecord_pf_included_category');
    setIncludeExcludeValue('custrecord_pf_exclude_brand');
    setIncludeExcludeValue('custrecord_pf_exclude_category');
  }
  */