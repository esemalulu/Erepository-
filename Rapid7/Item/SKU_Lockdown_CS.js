/*
 * @author efagone
 */

var r7prevRate = null;

function r7skulock_fieldChanged(type, name, linenum) {
	if (name == "item") {
		lineInitLockdown(type);
	}
}

function r7skulock_lineInit(type) {
	if (type == "item") {
		r7prevRate = nlapiGetCurrentLineItemValue("item", "rate");
		lineInitLockdown(type);
	}
}

function r7skulock_validateLine(type) {
	var roleId = nlapiGetRole();
	var userId = nlapiGetUser();

	if (type == "item") {
		if (
			roleId != 3 &&
			roleId != 1065 &&
			roleId != 1057 &&
			roleId != 1155 &&
			roleId != 1172 &&
			roleId != 1173 &&
			userId != 340932 &&
			userId != 3889342
		) {
			var createdFromRA = nlapiGetCurrentLineItemValue(
				"item",
				"custcolr7createdfromra"
			);

			if (createdFromRA != null && createdFromRA != "") {
				var r7currentRate = nlapiGetCurrentLineItemValue("item", "rate");
				if (
					r7currentRate == null ||
					r7currentRate == "" ||
					parseFloat(r7currentRate) < parseFloat(r7prevRate)
				) {
					alert("RA Created line items rate cannot be reduced.");
					nlapiCancelLineItem(type);
					return false;
				}

				/*
                     var isChanged = nlapiIsLineItemChanged('item');
                     if (isChanged) {
                     alert('RA Created line items cannot be modified.');
                     nlapiCancelLineItem(type);
                     return false;
                     }
                     */
			}
		}
	}

	if (type == "item") {
		var objExcludedRoles = new Object();
		objExcludedRoles[3] = true;
		objExcludedRoles[1070] = true;
		//objExcludedRoles[1030] = true;
		objExcludedRoles[1019] = true;
		objExcludedRoles[1088] = true;
		objExcludedRoles[1073] = true;
		objExcludedRoles[1065] = true;
		objExcludedRoles[1090] = true;
		objExcludedRoles[1101] = true;
		objExcludedRoles[1077] = true;
		objExcludedRoles[1155] = true;
		objExcludedRoles[1172] = true;
		objExcludedRoles[1173] = true;

		if (!objExcludedRoles.hasOwnProperty(roleId)) {
			var item = nlapiGetCurrentLineItemValue("item", "item");

			if (item != null && item != "") {
				var maxQuantity = skulock_getItemProperties(
					item,
					"custitemr7itemlockquantitymaximum"
				);

				if (maxQuantity != null && maxQuantity != "") {
					var currentQuantity = nlapiGetCurrentLineItemValue(
						"item",
						"quantity"
					);

					if (
						currentQuantity != null &&
						currentQuantity != "" &&
						parseFloat(currentQuantity) > maxQuantity
					) {
						alert("The maximum quantity for this item is " + maxQuantity);
						nlapiSetCurrentLineItemValue("item", "quantity", maxQuantity);
						return false;
					}
				}

				var minQuantity = skulock_getItemProperties(
					item,
					"custitemr7itemlockquantityminimum"
				);

				if (minQuantity != null && minQuantity != "") {
					var currentQuantity = nlapiGetCurrentLineItemValue(
						"item",
						"quantity"
					);

					if (
						currentQuantity != null &&
						currentQuantity != "" &&
						parseFloat(currentQuantity) < parseInt(minQuantity)
					) {
						alert("The minimum quantity for this item is " + minQuantity);
						nlapiSetCurrentLineItemValue("item", "quantity", minQuantity);
						return false;
					}
				}
			}
		}
	}

	return true;
}

function r7skulock_validateDelete(type) {
	if (type == "item" && nlapiGetRecordType() != "estimate") {
		var roleId = nlapiGetRole();
		var userId = nlapiGetUser();

		if (
			roleId != 3 &&
			roleId != 1065 &&
			roleId != 1057 &&
			roleId != 1155 &&
			roleId != 1172 &&
			roleId != 1173 &&
			userId != 340932 &&
			userId != 3889342
		) {
			var itemId = nlapiGetCurrentLineItemValue("item", "item");
			var createdFromRA = nlapiGetCurrentLineItemValue(
				"item",
				"custcolr7createdfromra"
			);
			var partner = nlapiGetFieldValue("partner");

			if (
				createdFromRA != null &&
				createdFromRA != "" &&
				itemId != -6 &&
				itemId != 753
			) {
				//zannah asked to remove this 5/1/12
				alert("RA Created line items cannot be removed.");
				return false;
			}

			if (itemId == -6 && partner != null && partner != "") {
				alert(
					"Cannot remove Partner Discount with Partner still associated to transaction."
				);
				return false;
			}
		}
	}

	return true;
}
