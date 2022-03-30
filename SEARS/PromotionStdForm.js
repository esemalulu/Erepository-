/* Netsuite Custom Promotion Form Script
 * By Rajiv@mca140.com
 * 
 * Form Url: https://system.sandbox.netsuite.com/app/common/custom/custentryform.nl?id=75&nl=F&ft=OTHER&sbtp=ReferralCode&rt=&e=T
 */
/*
 * Form page initializing code, prepares field & subtabs for new record as well as existing record
 */
var eligibleQuantity, minimumOrderAmount, thresholdAmount, currency, isThresholdTypeSet=false;

function pageInit() {ShowTab("custpage_pf_tab_shipping", true);
    //add/ remove multiselect lib call
    recordId = parseInt(nlapiGetRecordId());
    initIncludeExcludeTemplateEnvironment(recordId, "custrecord_pf_included_brand");
    initIncludeExcludeTemplateEnvironment(recordId, "custrecord_pf_included_category");
    initIncludeExcludeTemplateEnvironment(recordId, "custrecord_pf_exclude_brand");
    initIncludeExcludeTemplateEnvironment(recordId, "custrecord_pf_exclude_category");

    //employee discounts lib call
    initPromotionDiscountTemplate();

    //delete temporary data holders on form
    $("span#custrecord_pf_discounttype_fs_lbl_uir_label").closest('table').closest('tr').hide();
    $("span#custrecord_pf_threshold_type_fs_lbl_uir_label").closest('tr').hide();
    $("span#custrecord_pf_fixed_price_type_fs_lbl_uir_label").closest('tr').hide();
    $("span#custrecord_pf_promotion_discount_type_fs_lbl_uir_label").closest('tr').hide();
    $("#custpage_pf_added_discounts_fs_lbl_uir_label").parent("div").hide();

    //hide New option popup with select & multiselect
    $("#custrecord_pf_included_brand_popup_new").remove();
    $("#custrecord_pf_include_selection_type_popup_new").remove();
    $("#custrecord_pf_included_category_popup_new").remove();
    $("#custrecord_pf_exclude_selection_type_popup_new").remove();
    $("#custrecord_pf_exclude_brand_popup_new").remove();
    $("#custrecord_pf_exclude_category_popup_new").remove();
    $("#custrecord_pf_currency_popup_new").remove();

    //$("#inpt_discount2").val("Discount (Sample)");  //Need to set a discount type item IF rate is specified (NS javascript not detecting that this field has set value) so do below
    nlapiSetFieldText('discount', "Discount (Sample)");
    $("#discount_fs_lbl_uir_label").parent().hide();
    //for setting 'items's default selection
    $("#fg_fieldGroup229").hide();

    initCoupons();
    initIncludeItems();
    initExcludeItems();

    /* BugFix: To fix default "Rate" value assignment in promotion form */
    currentRecordId = nlapiGetRecordId();
    if (currentRecordId != "") {
        rec = nlapiLoadRecord("promotionCode", currentRecordId);
        rateValue = rec["fields"]["rate"];
        nlapiSetFieldValue("rate", rateValue);
    }

    //adding amount/quantity input
    //$("#custrecord_pf_threshold_fs_lbl").children("a").remove();
    $("#custrecord_pf_threshold_fs_lbl").append('<span style="white-space: nowrap" id="custrecord_pf_threshold_fs" class="effectStatic" data-fieldtype="" data-helperbutton-count="0"><form id="myForm"><input type="radio" id="radio1" name="Amount" class="amountqty" value="quantity" /><label for="radio1">Quantity</label><input type="radio" class="amountqty"  id="radio2" name="Amount" value="amount" /><label for="radio2">Amount</label></form></span>');

    //adding amount/quantity radio for tiered promotions
    /*    $("#custrecord_pf_tiered_quantity_or_amount_fs_lbl").append('<span style="white-space: nowrap" id="custrecord_pf_tiered_promotion_fs" class="effectStatic" data-fieldtype="" data-helperbutton-count="0"><form id="myFormTP"><input type="radio" id="radioAmount" name="Amount" class="amountqty" value="quantity" /><label for="radioAmount">Quantity</label><input type="radio" class="amountqty"  id="radioOffer" name="Amount" value="amount" /><label for="radioOffer">Amount</label></form></span>');*/

    //hiding selected offers Text Area
    $("#custrecord_pf_tiered_promo_offer_list_fs_lbl_uir_label").parent("div").hide();

    //hiding tiered promotion amount type
    $("#custrecord_pf_tieredamount_type_fs_lbl_uir_label").parent("div").hide();

    //Insert New Popup Button for Campaign-id dropdownlist
    $("#custrecord_pf_campaign_id_fs").append('<span class="uir-field-widget"><a data-helperbuttontype="new" id="custrecord_pf_campaign_id_popup_new" tabindex="-1" class="smalltextul field_widget i_createnew" title="New" href="https://system.sandbox.netsuite.com/app/crm/marketing/campaign.nl?cf=61&ft=EVENT" target="_blank"></a></span>');

    //remove default currency minimum order amount div
    $("#minimumorderamount_mh").parent("td").parent("tr").parent("tbody").parent("table").remove();

    //enable add Button with count
    recordId = parseInt(nlapiGetRecordId());
    startCount = 1;
    if ($.isNumeric(recordId)) {
        //increase startCount based on available row.
    }
    setAddButton(startCount);
    //add Add new row button in discount eligibility
    $("#addMoreOfferButton").hide();

    //add button listener
    $("#addMoreOfferButton").click(function() {
        if ($("#custrecord_pf_tiered_quantity_or_amount").val() != "" && $("#custrecord_pf_tiered_discount_percentage").val() != "") {
            count = parseInt($(this).attr('data-count'));
            quantityValue = nlapiGetFieldValue('custrecord_pf_tiered_quantity_or_amount');
            offerValue = nlapiGetFieldValue('custrecord_pf_tiered_discount_percentage');
            nlapiSetFieldValue('custrecord_pf_tiered_quantity_or_amount', '');
            nlapiSetFieldValue('custrecord_pf_tiered_discount_percentage', '');
            addNewRow(quantityValue, offerValue, $(this).attr('data-count'));
            count++;
            $(this).attr('data-count', count);
            nlapiSetFieldValue("custrecord_pf_tiered_promo_offer_list", nlapiGetFieldValue("custrecord_pf_tiered_promo_offer_list").trim() + "\n" + quantityValue.trim() + "\t" + offerValue.trim());
        } else {
            alert("Please enter the offer details.\n");
        }
    });

    initfreeShipping();
    initTieredPromotion();
    initGiftSelection();

} //end of pageInit

//free shipping defaults
function initfreeShipping() {
    if (nlapiGetFieldValue("custpage_pf_free_shipping") == 'T') {
        nlapiGetField("custpage_pf_free_shipping_method").setDisplayType("normal");
    } else {
        nlapiGetField("custpage_pf_free_shipping_method").setDisplayType("hidden");
    }
}

function setAddButton(startCount) {
    //style="border:2px solid gray;margin-top:20px;"
    $("#custrecord_pf_tiered_quantity_or_amount_fs_lbl_uir_label").parent("div").parent("td").append('<div class="uir-field-wrapper uir-inline-tag" data-field-type="button"><span id="custrecord_pf_tieredp_discoiunt_amount_fs_lbl_uir_label" class="smallgraytextnolink uir-label "></span><span class="uir-field"><span style="white-space: nowrap" id="custrecord_pf_tieredp_discoiunt_amount_fs" class="effectStatic" data-fieldtype="" data-helperbutton-count="0"><button type="button" class="bntBgB" name="addDiscount" id="addMoreOfferButton" value=" Add " data-count=' + startCount + '>Add</button></span></span></div>');
    $("#custrecord_pf_tiered_quantity_or_amount_fs_lbl_uir_label").parent("div").parent("td").parent("tr").parent("tbody").append("<tr style='margin:20px;padding:20px;border:2px solid gray;'  class='tiered-promotion-offer-codes-edit-list'><div ></div></tr>");
}

function delTieredPromoGroup(event) {
    count = $(event.target).attr('data-count');
    $('#tiered-promo-group-' + count).remove();
}

function addNewRow(quantityValue, offerValue, count) {
    quantity = "<input type='text' class='tieredpromoquantity' style='margin-right:10px' data-count=" + count + " name='tiered-promo-quantity-" + count + "' value=" + quantityValue + " />";
    offer = "<input type='text' class='tieredpromooffer' style='margin-right:5px' data-count=" + count + " name='tiered-promo-offer-" + count + "' value=" + offerValue + " />";
    deleteb = "<input type='button' style='cursor:pointer' class='tiered-group-del' onClick='delTieredPromoGroup(event)' data-count=" + count + " name='tiered-promo-del-" + count + "' value=' X '/>";
    promo_group = quantity + offer + deleteb;
    row = "<div style='margin:10px 10 0 10px;' id='tiered-promo-group-" + count + "'>" + promo_group + "</div>";
    $(".tiered-promotion-offer-codes-edit-list").append(row);

}

//coupon handler
function initCoupons() {
    if (nlapiGetRecordId() == "") {
        nlapiGetField("usetype").setDisplayType("disabled");
        nlapiGetField("code").setDisplayType("disabled");
        nlapiSetFieldValue("code", "NOCOUPON" + Math.floor(Math.random(100000.6) * 100000)); //no coupon code
    } else {
        if (nlapiGetFieldValue('custrecord_pf_coupon_code') == 'F') {
            nlapiGetField("usetype").setDisplayType("disabled");
            nlapiGetField("code").setDisplayType("disabled");
        }
    }
}

//included items initial settings
function initIncludeItems() {
    if (nlapiGetFieldValue('custrecord_pf_include_items') == 'T') {
        $("#fg_fieldGroup230").show();
        if (nlapiGetFieldText("custrecord_pf_include_selection_type") == 'Category') {
            nlapiGetField("custrecord_pf_included_category").setDisplayType("normal");
            nlapiGetField("custrecord_pf_included_brand").setDisplayType("hidden");
            nlapiGetField("custrecord_pf_included_items").setDisplayType("hidden");
        } else if (nlapiGetFieldText("custrecord_pf_include_selection_type") == 'Item') {
            nlapiGetField("custrecord_pf_included_category").setDisplayType("hidden");
            nlapiGetField("custrecord_pf_included_brand").setDisplayType("hidden");
            nlapiGetField("custrecord_pf_included_items").setDisplayType("normal");
        } else if (nlapiGetFieldText("custrecord_pf_include_selection_type") == 'Brand') {
            nlapiGetField("custrecord_pf_included_category").setDisplayType("hidden");
            nlapiGetField("custrecord_pf_included_brand").setDisplayType("normal");
            nlapiGetField("custrecord_pf_included_items").setDisplayType("hidden");
        } else {
            nlapiGetField("custrecord_pf_included_category").setDisplayType("hidden");
            nlapiGetField("custrecord_pf_included_brand").setDisplayType("hidden");
            nlapiGetField("custrecord_pf_included_items").setDisplayType("hidden");
        }
    } else {
        $("#fg_fieldGroup230").hide();
        nlapiGetField("custrecord_pf_included_category").setDisplayType("hidden");
        nlapiGetField("custrecord_pf_include_selection_type").setDisplayType("hidden");
        nlapiGetField("custrecord_pf_included_items").setDisplayType("hidden");
        nlapiGetField("custrecord_pf_included_brand").setDisplayType("hidden");
    }
}

//exclude items initial handler
function initExcludeItems() {
    if (nlapiGetFieldValue('excludeitems') == 'T') { //*************for checking exclude_items
        $("#fg_fieldGroup231").show();
        nlapiGetField("custrecord_pf_exclude_selection_type").setDisplayType("normal");

        if (nlapiGetFieldText("custrecord_pf_exclude_selection_type") == "Category") {
            nlapiGetField("custrecord_pf_exclude_category").setDisplayType("normal");
            nlapiGetField("custrecord_pf_exclude_brand").setDisplayType("hidden");
            nlapiGetField("custrecord_pf_exclude_items").setDisplayType("hidden");
        } else if (nlapiGetFieldText("custrecord_pf_exclude_selection_type") == "Brand") {
            nlapiGetField("custrecord_pf_exclude_category").setDisplayType("hidden");
            nlapiGetField("custrecord_pf_exclude_brand").setDisplayType("normal");
            nlapiGetField("custrecord_pf_exclude_items").setDisplayType("hidden");
        } else if (nlapiGetFieldText("custrecord_pf_exclude_selection_type") == "Item") {
            nlapiGetField("custrecord_pf_exclude_category").setDisplayType("hidden");
            nlapiGetField("custrecord_pf_exclude_brand").setDisplayType("hidden");
            nlapiGetField("custrecord_pf_exclude_items").setDisplayType("normal");
        } else {
            nlapiGetField("custrecord_pf_exclude_category").setDisplayType("hidden");
            nlapiGetField("custrecord_pf_exclude_brand").setDisplayType("hidden");
            nlapiGetField("custrecord_pf_exclude_items").setDisplayType("hidden");
        }
    } else {
        $("#fg_fieldGroup231").hide();
        nlapiGetField("custrecord_pf_exclude_selection_type").setDisplayType("hidden");
        nlapiGetField("custrecord_pf_exclude_brand").setDisplayType("hidden");
        nlapiGetField("custrecord_pf_exclude_category").setDisplayType("hidden");
        nlapiGetField("custrecord_pf_exclude_items").setDisplayType("hidden");
    }
}

//Tiered Promotion initial settings
function initTieredPromotion() {
    if (nlapiGetFieldValue("custrecord_pf_tired_promotion") == 'T') {
        nlapiGetField("custrecord_pf_tiered_quantity_or_amount").setDisplayType("normal");
        nlapiGetField("custrecord_pf_tiered_discount_percentage").setDisplayType("normal");
        //nlapiGetField("custrecord_pf_threshold").setDisplayType("hidden");
        $("#addMoreOfferButton").show();
        $(".tiered-promotion-offer-codes-edit-list").show();
        $("#custrecord_pf_threshold").hide();
    } else {
        nlapiGetField("custrecord_pf_tiered_quantity_or_amount").setDisplayType("hidden");
        nlapiGetField("custrecord_pf_tiered_discount_percentage").setDisplayType("hidden");
        nlapiGetField("custrecord_pf_threshold").setDisplayType("normal");
        $("#addMoreOfferButton").hide();
        $(".tiered-promotion-offer-codes-edit-list").hide();
        $("#custrecord_pf_threshold").show();
    }
}

//---------------------------------------------------------------------------------------------------------------Gift Options------------------------------------------
//Gift type selection event handler for same item radio button group
$(document).on('click', '#custrecord_pf_same_item_fs .proxy', function() {
    var value = $(this).val();
    if (value == "sameitem") {
        nlapiSetFieldValue("custrecord_pf_same_item", true);
        nlapiSetFieldValue("custrecord_pf_different_item", false);
    }
});

//Gift type selection event handler for different item radio button group
$(document).on('click', '#custrecord_pf_different_item_fs .proxy', function() {
    var value = $(this).val();
    if (value == "differentitem") {
        nlapiSetFieldValue("custrecord_pf_different_item", true);
        nlapiSetFieldValue("custrecord_pf_same_item", false);
    }
});

//showing radio buttons on checkboxes
function showRadioButtons() {
    $("#custrecord_pf_same_item_fs_inp").next().next().remove();
    $("#custrecord_pf_different_item_fs_inp").next().next().remove();
    $("#custrecord_pf_same_item_fs").prepend('<input type="radio" value="sameitem" class="proxy" name="gifttype" id="gifttype_same" />');
    $("#custrecord_pf_different_item_fs").prepend('<input type="radio" value="differentitem" class="proxy" name="gifttype" id="gifttype_different" />');
}

//Gift selection default settings
function initGiftSelection() { //ShowTab("minimumorderamount");  //default open for faster debugging
    nlapiGetField("custrecord_pf_discounted_item").setDisplayType("disabled");
    showRadioButtons();
    if (nlapiGetFieldValue("custrecord_pf_gift") == 'T') {
        $("#gifttype_same").removeAttr("disabled");
        $("#gifttype_different").removeAttr("disabled");
    } else {
        $("#gifttype_same").attr("disabled", "disabled");
        $("#gifttype_different").attr("disabled", "disabled");
    }
    if (nlapiGetFieldValue("custrecord_pf_same_item") == 'T') {
        $("#gifttype_same").attr("checked", "checked");
        nlapiGetField("custrecord_pf_different_item").setDisplayType("disabled");
    } else if (nlapiGetFieldValue("custrecord_pf_different_item") == 'T') {
        $("#gifttype_different").attr("checked", "checked");
        nlapiGetField("custrecord_pf_same_item").setDisplayType("disabled");
        nlapiGetField("custrecord_pf_discounted_item").setDisplayType("normal");
    }
}
//-------------------------------end------------------------

/*
 * Field value change event-handler
 */
function fieldChanged(type, field) {
    console.log("changed field id: " + field);
    switch (field) {
        case "excludeitems":
            if (nlapiGetFieldValue(field) == 'T') {
                $("#fg_fieldGroup231").show(); //Exluded Items Tab
                nlapiGetField("custrecord_pf_exclude_selection_type").setDisplayType("normal");
            } else {
                $("#fg_fieldGroup231").hide();
                nlapiGetField("custrecord_pf_exclude_selection_type").setDisplayType("hidden");
                nlapiGetField("custrecord_pf_exclude_brand").setDisplayType("hidden");
                nlapiGetField("custrecord_pf_exclude_category").setDisplayType("hidden");
                nlapiGetField("custrecord_pf_exclude_items").setDisplayType("hidden");
            }
            break;

        case "custrecord_pf_exclude_selection_type":
            switch (nlapiGetFieldValue(field)) {
                case '6':
                    nlapiGetField("custrecord_pf_exclude_category").setDisplayType("normal");
                    nlapiGetField("custrecord_pf_exclude_brand").setDisplayType("hidden");
                    nlapiGetField("custrecord_pf_exclude_items").setDisplayType("hidden");
                    break;
                case '5':
                    nlapiGetField("custrecord_pf_exclude_brand").setDisplayType("normal");
                    nlapiGetField("custrecord_pf_exclude_category").setDisplayType("hidden");
                    nlapiGetField("custrecord_pf_exclude_items").setDisplayType("hidden");
                    break;
                case '7':
                    nlapiGetField("custrecord_pf_exclude_brand").setDisplayType("hidden");
                    nlapiGetField("custrecord_pf_exclude_category").setDisplayType("hidden");
                    nlapiGetField("custrecord_pf_exclude_items").setDisplayType("normal");
                    break;
                default:
                    nlapiGetField("custrecord_pf_exclude_brand").setDisplayType("hidden");
                    nlapiGetField("custrecord_pf_exclude_category").setDisplayType("hidden");
                    nlapiGetField("custrecord_pf_exclude_items").setDisplayType("hidden");
            }
            break;

        case "custrecord_pf_exclude_category":
            break;

        case "custrecord_pf_exclude_brand":
            break;

        case "custrecord_pf_exclude_items":
            break;

        case "custrecord_pf_include_selection_type":
            if (nlapiGetFieldText(field) == 'Category') {
                nlapiGetField("custrecord_pf_included_category").setDisplayType("normal");
                nlapiGetField("custrecord_pf_included_items").setDisplayType("hidden");
                nlapiGetField("custrecord_pf_included_brand").setDisplayType("hidden");
            } else if (nlapiGetFieldText(field) == 'Item') {
                nlapiGetField("custrecord_pf_included_items").setDisplayType("normal");
                nlapiGetField("custrecord_pf_included_category").setDisplayType("hidden");
                nlapiGetField("custrecord_pf_included_brand").setDisplayType("hidden");
            } else if (nlapiGetFieldText(field) == 'Brand') {
                nlapiGetField("custrecord_pf_included_brand").setDisplayType("normal");
                nlapiGetField("custrecord_pf_included_items").setDisplayType("hidden");
                nlapiGetField("custrecord_pf_included_category").setDisplayType("hidden");
            }
            break;

        case "custrecord_pf_include_items":
            if (nlapiGetFieldValue(field) == 'T') {
                $("#fg_fieldGroup230").show(); //Include Items Tab
                nlapiGetField("custrecord_pf_include_selection_type").setDisplayType("normal");
            } else {
                $("#fg_fieldGroup230").hide(); // 73 Include Items field-group //enough only hiding the field group alone, no need to hide below elements individually
                nlapiGetField("custrecord_pf_include_selection_type").setDisplayType("hidden");
                nlapiGetField("custrecord_pf_included_category").setDisplayType("hidden");
                nlapiGetField("custrecord_pf_included_items").setDisplayType("hidden");
                nlapiGetField("custrecord_pf_included_brand").setDisplayType("hidden");
            }
            break;

        case "custrecord_pf_gift":
            if (nlapiGetFieldValue(field) == 'T') {
                $("#gifttype_same").removeAttr("disabled");
                $("#gifttype_different").removeAttr("disabled");
            } else {
                $("#gifttype_same").attr("disabled", "disabled");
                $("#gifttype_different").attr("disabled", "disabled");
                $("#gifttype_same").removeAttr("checked");
                $("#gifttype_different").removeAttr("checked");
                nlapiSetFieldValue("custrecord_pf_same_item", false);
                nlapiSetFieldValue("custrecord_pf_different_item", false);
            }
            break;

        case "custrecord_pf_same_item":
            if (nlapiGetFieldValue(field) == 'T') {
                nlapiGetField("custrecord_pf_different_item").setDisplayType("disabled");
                nlapiGetField("custrecord_pf_discounted_item").setDisplayType("disabled");
            } else {
                nlapiGetField("custrecord_pf_different_item").setDisplayType("normal");
                if (nlapiGetFieldValue("custrecord_pf_different_item") == 'T') {
                    nlapiGetField("custrecord_pf_discounted_item").setDisplayType("normal");
                }
            }
            break;

        case "custrecord_pf_different_item":
            if (nlapiGetFieldValue(field) == 'T') {
                nlapiGetField("custrecord_pf_same_item").setDisplayType("disabled");
                nlapiGetField("custrecord_pf_discounted_item").setDisplayType("normal");
            } else {
                nlapiGetField("custrecord_pf_same_item").setDisplayType("normal");
                nlapiGetField("custrecord_pf_discounted_item").setDisplayType("disabled");
                nlapiSetFieldValue("custrecord_pf_discounted_item", null); // now (stop deleting) keeping "selected items" upto before record save.
            }
            break;

        case "custrecord_pf_coupon_code":
            if (nlapiGetFieldValue(field) == 'T') {
                nlapiGetField("usetype").setDisplayType("normal");
                nlapiGetField("code").setDisplayType("normal");
                //*****************
                if (nlapiGetFieldValue("code").indexOf("NOCOUPON") == 0) {
                    nlapiSetFieldValue("code", "");
                }
                //*****************
            } else {
                nlapiGetField("usetype").setDisplayType("disabled");
                nlapiGetField("code").setDisplayType("disabled");
                if (nlapiGetFieldValue("code") == "") {
                    nlapiSetFieldValue("code", "NOCOUPON" + Math.floor(Math.random(100000.6) * 100000)); //no coupon code
                }
            }
            break;

        case "custrecord_pf_tired_promotion":
            if (nlapiGetFieldValue(field) == 'T') {
                nlapiGetField("custrecord_pf_tiered_quantity_or_amount").setDisplayType("normal");
                nlapiGetField("custrecord_pf_tiered_discount_percentage").setDisplayType("normal");
                $("#addMoreOfferButton").show();
                $(".tiered-promotion-offer-codes-edit-list").show();
                //nlapiGetField("custrecord_pf_threshold").setDisplayType("hidden");
                $("#custrecord_pf_threshold").hide();
            } else {
                nlapiGetField("custrecord_pf_tiered_quantity_or_amount").setDisplayType("hidden");
                nlapiGetField("custrecord_pf_tiered_discount_percentage").setDisplayType("hidden");
                $("#addMoreOfferButton").hide();
                $(".tiered-promotion-offer-codes-edit-list").hide();
                //nlapiGetField("custrecord_pf_threshold").setDisplayType("normal");
                $("#custrecord_pf_threshold").show();
            }
            break;

        case "custpage_pf_free_shipping":
            nlapiSetFieldValue("custrecord_pf_free_shipping", nlapiGetFieldValue(field));
            if (nlapiGetFieldValue(field) == 'T') {
                nlapiGetField("custpage_pf_free_shipping_method").setDisplayType("normal");
            } else {
                nlapiGetField("custpage_pf_free_shipping_method").setDisplayType("hidden");
            }
            break;

      case "custrecord_pf_is_employee": //lib call
          if(nlapiGetFieldValue(field) == 'T') {
               ShowTab("custpage_pf_tab_employee_discounts", true);
               enableEmployeeDiscount(nlapiGetFieldValue(field));
          }
          break;

       default:
            console.log("changed field id: " + field);
    }
} //end of fieldChanged

/*
 * Before save need to clean the unwanted data from the form
 */
function saveRecord() {
    //include exclude template lib functions for saving data
    setIncludeExcludeValue('custrecord_pf_included_brand');
    setIncludeExcludeValue('custrecord_pf_included_category');
    setIncludeExcludeValue('custrecord_pf_exclude_brand');
    setIncludeExcludeValue('custrecord_pf_exclude_category');
/* Disable only saving anyone of these selection data --> all field data can be stored now
    if (nlapiGetFieldText("custrecord_pf_include_selection_type") == 'Category') {
        nlapiSetFieldText("custrecord_pf_included_items", null);
        nlapiSetFieldText("custrecord_pf_included_brand", null);
    } else if (nlapiGetFieldText("custrecord_pf_include_selection_type") == 'Brand') {
        nlapiSetFieldText("custrecord_pf_included_items", null);
        nlapiSetFieldText("custrecord_pf_included_category", null);
    } else if (nlapiGetFieldText("custrecord_pf_include_selection_type") == 'Item') {
        nlapiSetFieldText("custrecord_pf_included_category", null);
        nlapiSetFieldText("custrecord_pf_included_brand", null);
    } else {
        nlapiSetFieldText("custrecord_pf_included_category", null);
        nlapiSetFieldText("custrecord_pf_included_items", null);
        nlapiSetFieldText("custrecord_pf_included_brand", null);
    }
*/
    if (nlapiGetFieldValue('excludeitems') == 'F') {
        nlapiSetFieldText("custrecord_pf_exclude_selection_type", "");
        nlapiSetFieldValue("custrecord_pf_exclude_brand", null);
        nlapiSetFieldValue("custrecord_pf_exclude_category", null);
        nlapiSetFieldValue("custrecord_pf_exclude_items", null);
    }
    if (nlapiGetFieldValue('custrecord_pf_include_items') == 'F') {
        nlapiSetFieldText("custrecord_pf_include_selection_type", "");
        nlapiSetFieldValue("custrecord_pf_included_items", null);
        nlapiSetFieldValue("custrecord_pf_included_category", null);
        nlapiSetFieldValue("custrecord_pf_included_brand", null);
    }

    //delete selected tiered offers data if Tiered Promotion is false
    if (nlapiGetFieldValue('custrecord_pf_tired_promotion') == 'F') {
        nlapiSetFieldValue("custrecord_pf_tiered_promo_offer_list", "");
    } else {
        nlapiSetFieldValue("custrecord_pf_threshold", "");
    }
    //% / Flat  discounttype to custom _pf_discounttype variable
    nlapiSetFieldValue("custrecord_pf_discounttype", nlapiGetFieldValue("discounttype"));
    // Getting discount rate for (Webservices) unavailable rate date when "Percentage" is selected
    nlapiSetFieldValue("custrecord_pf_discount_rate", nlapiGetFieldValue("rate"));

    //decide the promotion type
    getPromotionDiscountType();

    //***********couponcode exception handler On Saving
    if (nlapiGetFieldValue('custrecord_pf_coupon_code') == 'F') { //set nocoupon when coupon is disabled while saving the promotion 
        nlapiSetFieldValue("code", "NOCOUPON" + Math.floor(Math.random(100000.6) * 100000)); //no coupon code
    }

    //if free ship checkbox unchecked then delete the free shipping method data
    if (nlapiGetFieldValue("custpage_pf_free_shipping") == 'F') {
        nlapiSetFieldValue("custpage_pf_free_shipping_method", "");
    }else{ alert("saving static to dymanic");
        nlapiSetFieldText("freeshipmethod", nlapiGetFieldText("custpage_pf_free_shipping_method"));
        alert(nlapiGetFieldText("freeshipmethod"));
    }

    //gift option handler
    if (nlapiGetFieldValue("custrecord_pf_gift") == 'T' && nlapiGetFieldValue("custrecord_pf_same_item") == 'F' && nlapiGetFieldValue("custrecord_pf_different_item") == 'F') {
        alert("Select the Gift Option 'Same Item' or 'Different Item'\n");
    }

    //return true;
    // lib call
     return PromotionDiscountTemplateSaveRecord();
} //end of saveRecord

// Deleting New option value in selectboxes & multiselect boxes
$(document).ready(function() {
    //for selectbox "New" option deletion
    $(document).on('click', '.dropdownInput', function() {
        $(".dropdownDiv").find(".dropdownNotSelected").each(function() {
            if ($(this).html() == "- New -") {
                $(this).css('display', 'none');
            }
        });
    });
    //for multiselectbox "New" option deletion
    $("#row_custrecord_pf_included_category5_0").hide();
    $("#row_custrecord_pf_included_category6_0").hide();
    $("#row_custrecord_pf_included_brand6_0").hide()
    $("#row_custrecord_pf_included_brand7_0").hide();
    $("#custrecord_pf_include_selection_type_popup_new").hide();
    $("#custrecord_pf_included_brand_popup_new").hide();
    $("#custrecord_pf_included_category_popup_new").hide();
    $("#custrecord_pf_exclude_selection_type_popup_new").hide();
    $("#custrecord_pf_exclude_brand_popup_new").hide();
    $("#custrecord_pf_exclude_category_popup_new").hide();
}); //end of document ready

//Minimum Order Amount/Quantity Selection
$(document).on('click', '#custrecord_pf_threshold_fs .amountqty', function() {
    var value = $(this).val();
    if (value == "quantity") {
        nlapiSetFieldValue("custrecord_pf_threshold_type", "quantity");
    } else {
        nlapiSetFieldValue("custrecord_pf_threshold_type", "amount");
    }
});

//Tiered Promotion Amount/Quantity Selection
$(document).on('click', '#custrecord_pf_tiered_promotion_fs .amountqty', function() {
    var value = $(this).val();
    if (value == "quantity") {
        nlapiSetFieldValue("custrecord_pf_tieredamount_type", "quantity");
    } else {
        nlapiSetFieldValue("custrecord_pf_tieredamount_type", "amount");
    }
});

function getPromotionDiscountType() {
    eligibleQuantity = nlapiGetFieldValue('custrecord_pf_eligible_quantity');
    thresholdQuantity = nlapiGetFieldValue('custrecord_pf_threshold');
    promotionDiscountTypeId = 'custrecord_pf_promotion_discount_type';

    //finding promotion discount type
    if (eligibleQuantity.localeCompare("") == 0 && (thresholdQuantity.localeCompare("") == 0 && nlapiGetFieldValue("custrecord_pf_tired_promotion") == 'F')) {
        nlapiSetFieldText(promotionDiscountTypeId, "simple-discount");
        console.log("simple-discount");
    } else if (eligibleQuantity.localeCompare("") == 0 && (thresholdQuantity.localeCompare("") != 0 || nlapiGetFieldValue("custrecord_pf_tired_promotion") == 'T')) {
        nlapiSetFieldText(promotionDiscountTypeId, "discounts");
        console.log("discounts");
    } else if (eligibleQuantity.localeCompare("") != 0 && thresholdQuantity.localeCompare("") != 0) {
        nlapiSetFieldText(promotionDiscountTypeId, "bogo");
        console.log("bogo");
    }
}

function getAmountAndCurrency() {
    for (var x = 1; x <= nlapiGetLineItemCount("currency"); x++) {
        if (nlapiGetLineItemValue("currency", "minimumorderamount", x) != "") {
            return [nlapiGetLineItemValue("currency", "minimumorderamount", x), nlapiGetLineItemValue("currency", "currency", x)];
        }
    }
    return [];
}