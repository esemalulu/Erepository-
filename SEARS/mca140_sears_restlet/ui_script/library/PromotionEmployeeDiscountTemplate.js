

IS_EMPLOYEE_DISCOUNT = "custrecord_pf_is_employee";

DEPARTMENT_ID = "custpage_pf_department_id";
CATEGORY_ID = "custpage_pf_category";
DISCOUNT_PERCENTAGE = "custpage_pf_discount_percentage";
ADDED_DISCOUNTS = "custpage_pf_added_discounts";
ADDED_DISCOUNTS_ORIG = "custrecord_pf_added_discounts";

function PromotionDiscountTemplateSaveRecord() {  
    isEmployeeRecordExist = true;
    nlapiSetFieldText(DEPARTMENT_ID,'');
    nlapiSetFieldText(CATEGORY_ID,'');
    nlapiSetFieldValue(DISCOUNT_PERCENTAGE,'');   
    if(nlapiGetFieldValue(IS_EMPLOYEE_DISCOUNT) == "T") {
      isEmployeeRecordExist = true; 
      console.log(":"+trim(nlapiGetFieldValue(ADDED_DISCOUNTS_ORIG))+":");
      if(trim(nlapiGetFieldValue(ADDED_DISCOUNTS_ORIG))=="")
         {
          alert("Employee Discount Promotion must have atleast selected Departmet, Category, Percentage values under Employee Discounts Tab ");
          enableEmployeeDiscount('T');
          isEmployeeRecordExist = false;
         }
         console.log(isEmployeeRecordExist);
    }
    return isEmployeeRecordExist;
}

function initPromotionDiscountTemplate() {      
    console.log('pageInit');      
    row = "<tr id='PromotionDiscountTemplateDynamicFields' style='text-align:center'></tr>";
    $($("#"+DISCOUNT_PERCENTAGE+"_fs_lbl_uir_label").parents().eq(6)).append(row);
    recordId = parseInt(nlapiGetRecordId());
    startCount =1;
    console.log($.isNumeric(recordId));
    isEmployeeDiscount = nlapiGetFieldValue(IS_EMPLOYEE_DISCOUNT);
    if($.isNumeric(recordId)&&(isEmployeeDiscount=='T')) {
        exist = (nlapiGetFieldValue(ADDED_DISCOUNTS_ORIG)).split("\n");
        discounts = new Array();
        $.each(exist, function(key,value){
          startCount++; 
          discounts.push(value);
        });
        setEmployeeDiscountInputFields('normal');
        setEmployeeDiscountAddButton(startCount,'T');
        console.log(discounts);
        createExistingDiscounts(discounts,1);
    }
}

/*function fieldChanged(type, field) { 
  switch(field) {
      case "custrecord_pf_is_employee":
          enableEmployeeDiscount(nlapiGetFieldValue(field));
          if(nlapiGetFieldValue(field) == 'T') {
          } 
          break;
      default:
                //console.log("no fieds " + field);
  }
}

function saveRecord() {
     return PromotionDiscountTemplateSaveRecord();
} 


function pageInit() {
    initPromotionDiscountTemplate();
  }*/

function addEmployeeDiscount(event) {    
      console.log('addEmployeeDiscount');     
      //alert( nlapiGetFieldText('custrecord_pf_department_id') + nlapiGetFieldText('custrecord_pf_employee_discount_category') + nlapiGetFieldValue('custrecord_if_employee_discount_percent') );
      var count = parseInt($(event.target).attr('data-count'));
      if(count==1) {
      }
      $(event.target).attr('data-count',(count+1));
      departmentId = nlapiGetFieldText(DEPARTMENT_ID);
      discountCategory = nlapiGetFieldText(CATEGORY_ID);
      discountPercent = parseInt(nlapiGetFieldValue(DISCOUNT_PERCENTAGE));
      if(departmentId=="") {
        alert("Department Id should not be empty");
      }
      else if(discountCategory=="") {
        alert("Discount Category should not be empty");
      }
      else if((!$.isNumeric(discountPercent))||(discountPercent==0)) {
        alert("Discount Percent should not be 0 or empty");
      }
      else {
        createDepartmentGroup(departmentId); 
        exist = false;
        $(".empdepartmentId").each(function() {
          if($(this).val()==departmentId) {
            tempCount = parseInt($(this).attr('data-count'));
            if($('[name="emp-discount-category-'+tempCount+'"]').val()==discountCategory) {
              exist = true;
            }
          }
        });
        if(exist) {
          alert("This Category Promotion Already exist for the DepartmentId.");
        }
        else {
          createEmployeeDiscountRow(departmentId,discountCategory,discountPercent,count,"new");
          /*department_id="<input type='hidden' class='empdepartmentId' style='margin-right:5px' readonly data-count="+count+" name='emp-department-id-"+count+"' value="+departmentId+" />";
          discount_category="<input type='text' class='empDiscountCategory' style='margin-right:5px' readonly data-count="+count+" name='emp-discount-category-"+count+"' value="+discountCategory+" />";
          discount_percent="<input type='text' class='empDiscountPercent' style='margin-right:5px' readonly data-count="+count+" name='emp-discount-percentage-"+count+"' value="+discountPercent+" />";
          discount_delete = "<input type='button' style='cursor:pointer' class='emp_del_"+departmentId+"' data-class='"+departmentId+"' onClick='delEmployeeDiscount(event)' data-count="+count+" name='emp-dis-count-"+count+"' value=' X '/>";
          discount_group = "<div style='margin:10px 0 0 10px' class='emp-percent-group-"+count+"'>"+department_id+discount_category+discount_percent+discount_delete+"</div>";
          row = "<div id='emp-dis-count-"+count+"'>"+discount_group+"</div>";
          fillTextArea(departmentId+" - "+discountCategory+" - "+discountPercent);
          //alert($($($("#custrecord_if_employee_discount_percent_fs_lbl_uir_label").parents().eq(2)).siblings("tr:nth-child(2) td")).prop('tagName'));
          $("#emp-department-div-"+departmentId).append(row);*/
        }
      }
  }

  function createEmployeeDiscountRow(departmentId,discountCategory,discountPercent,count,newRecord) {    
      console.log('createEmployeeDiscountRow');
    department_id="<input type='hidden' class='empdepartmentId' style='margin-right:5px' readonly data-count="+count+" name='emp-department-id-"+count+"' value="+departmentId+" />";
    discount_category="<input type='text' class='empDiscountCategory' style='margin-right:5px' readonly data-count="+count+" name='emp-discount-category-"+count+"' value="+discountCategory+" />";
    discount_percent="<input type='text' class='empDiscountPercent' style='margin-right:5px' readonly data-count="+count+" name='emp-discount-percentage-"+count+"' value="+discountPercent+" />";
    discount_delete = "<input type='button' style='cursor:pointer' class='emp_del_"+departmentId+"' data-class='"+departmentId+"' onClick='delEmployeeDiscount(event)' data-count="+count+" name='emp-dis-count-"+count+"' value=' X '/>";
    discount_group = "<div style='margin:10px 0 0 10px' class='emp-percent-group-"+count+"'>"+department_id+discount_category+discount_percent+discount_delete+"</div>";
    row = "<div id='emp-dis-count-"+count+"'>"+discount_group+"</div>";
    if(newRecord == "new") {      
      fillTextArea(departmentId+" - "+discountCategory+" - "+discountPercent);
    }
    //alert($($($("#custrecord_if_employee_discount_percent_fs_lbl_uir_label").parents().eq(2)).siblings("tr:nth-child(2) td")).prop('tagName'));
    $("#emp-department-div-"+departmentId).append(row);
  }

  function createDepartmentGroup(department) {
      console.log('createDepartmentGroup');
    if($('#emp-department-div-'+department).length) {
      console.log("exist");
    }
    else {
      console.log('does not exist');
      $('#PromotionDiscountTemplateDynamicFields').append("<div style='display:inline-block;vertical-align:top' class='emp_discount_promotion' id='emp-department-div-"+department+"'><center><label style='font-size:14px;' >"+department+"</label></center></div>");

      //$($($("#custrecord_if_employee_discount_percent_fs_lbl_uir_label").parents().eq(2)).siblings()).append("<div style='display:inline-block;vertical-align:top' class='emp_discount_promotion' id='emp-department-div-"+department+"'><center><label style='font-size:14px;' >"+department+"</label></center></div>");

    }
  }

function delEmployeeDiscount(event) {
  console.log('delEmployeeDiscount');
  class_val = $(event.target).attr('data-class');
  count_val = $(event.target).attr('data-count');
  stringToRemove = $('[name="emp-department-id-'+count_val+'"]').val()+' - '+$('[name="emp-discount-category-'+count_val+'"]').val()+' - '+$('[name="emp-discount-percentage-'+count_val+'"]').val();
  removeFromTextArea(stringToRemove);
  times = 0;
  //console.log($(".emp_del_"+class_val).length);
  $(".emp_del_"+class_val).each(function(){ times++;});
  //console.log("times="+times);
  if(times==1) {
    $('#emp-department-div-'+class_val).remove();
  }
  element = $(event.target).attr('name');
  $('#'+element).remove();
}

function fillTextArea(sstring) {
  console.log('fillTextArea');
  var string = nlapiGetFieldValue(ADDED_DISCOUNTS_ORIG) + "\n" + sstring;
  nlapiSetFieldValue(ADDED_DISCOUNTS_ORIG, string.trim());
  nlapiSetFieldValue(ADDED_DISCOUNTS_ORIG, $.unique((nlapiGetFieldValue(ADDED_DISCOUNTS_ORIG).trim().replace(new RegExp('\n\n', 'g'), '\n')).split("\n")).join("\n"));                                           
}

function removeFromTextArea(sstring) {
  console.log('removeFromTextArea');
  console.log("removeFromTextArea");
  var string = nlapiGetFieldValue(ADDED_DISCOUNTS_ORIG);
  console.log(string);
  console.log(sstring);
  string = string.replace(sstring,'');
  console.log(string);
  nlapiSetFieldValue(ADDED_DISCOUNTS_ORIG, string.trim());
  nlapiSetFieldValue(ADDED_DISCOUNTS_ORIG, $.unique((nlapiGetFieldValue(ADDED_DISCOUNTS_ORIG).trim().replace(new RegExp('\n\n', 'g'), '\n')).split("\n")).join("\n"));                                           
}

function enableEmployeeDiscount(status) {
  console.log('enableEmployeeDiscount');
  fieldStatus = 'disabled';
  if(status == 'T') {
    //ShowTab("partner", true);
    fieldStatus = 'normal';        
  }
  setEmployeeDiscountAddButton(startCount,status);
  console.log(fieldStatus);
  console.log(nlapiGetField(DEPARTMENT_ID));
  setEmployeeDiscountInputFields(fieldStatus);
  console.log("enbaling Employee discount Promotion Mode");
  //add other things to enable employee discount promotion mode
}

function setEmployeeDiscountAddButton(startCount,status) {
    console.log("setEmployeeDiscountAddButton");
    if(status =='T') {
        console.log("setting button");
      if($('#jqueryaddEmployeeDiscount').length==0) {
        $( "<div class='uir-field-wrapper uir-inline-tag'><input type='button' class='bntBgB' name='addDiscount' id='jqueryaddEmployeeDiscount' value=' Add ' onClick='addEmployeeDiscount(event)' data-count="+startCount+" /></div>" ).insertAfter( $("#"+DISCOUNT_PERCENTAGE+"_fs_lbl_uir_label").parent() );
      }
    }
    else {
        console.log("removingEmployeeDiscount");
      $($('#jqueryaddEmployeeDiscount').parents().eq(0)).remove();
    }
}

function setEmployeeDiscountInputFields(fieldStatus) {
    nlapiGetField(DEPARTMENT_ID).setDisplayType(fieldStatus);
    nlapiGetField(CATEGORY_ID).setDisplayType(fieldStatus);
    nlapiGetField(DISCOUNT_PERCENTAGE).setDisplayType(fieldStatus);    
}

function createExistingDiscounts(discounts,startCount) {
    console.log(discounts);
    console.log(startCount);
      console.log('createExistingDiscounts');
    discountsHtml = '';
    $.each(discounts,function (key,value){
      console.log("foreach");
      discount = value.split(" - ");  
      departmentId = discount[0];
      discountCategory = discount[1];
      discountPercent = discount[2];
      console.log(departmentId+discountCategory+discountPercent+startCount+"old");      
      createDepartmentGroup(departmentId);    
      createEmployeeDiscountRow(departmentId,discountCategory,discountPercent,startCount,"old");
      startCount++;
    });
}
