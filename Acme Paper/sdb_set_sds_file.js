/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
 define(["N/log", "N/search", "N/record"], function (log, search, record) {
	function afterSubmit(context) {
		try {
			var oldRecord = context.oldRecord;
			var newRecord = context.newRecord;
			var deleteItem;
            log.debug('context.type ',context.type);
			if (context.type === context.UserEventType.EDIT || context.type === context.UserEventType.DELETE) deleteItem = oldRecord.getValue("custrecord_extfile_inventory_item_pref");
			var itemId = newRecord.getValue("custrecord_extfile_inventory_item_pref");
			if (deleteItem) itemId = deleteItem;
			log.debug("ITEM TO SET", "======================== " + itemId + " ========================");
			log.debug("deleteItem", deleteItem);
			if (!itemId) return;
			var extendFilesRecords = getExtendFilesRecords(itemId);
			log.debug("extendFilesRecords", extendFilesRecords);
			var fileIds = "";
			extendFilesRecords.forEach(function (file) {
				fileIds.length ? fileIds += "," + file.fileUrl : fileIds += file.fileUrl;
			});
			var itemType = getItemType(itemId);
			log.debug("itemType", itemType);
			if (!itemType) return;
			setFilesIdsInItem(itemId, itemType, fileIds);
		} catch (e) {
			log.error("ERROR AFTER SUBMIT: ", e);
		}
	}

	// Auxiliaar functions

	function getItemType(itemId) {
		var itemType = search.lookupFields({
			type: search.Type.ITEM,
			id: itemId,
			columns: ["type"]
		});
		return getItemTypeId(itemType.type[0].value);
	}

	function getItemTypeId(type) {
		var CONST_ITEMTYPE = {
			'Assembly': 'ASSEMBLY_ITEM',
			'Description': 'DESCRIPTION_ITEM',
			'Discount': 'DISCOUNT_ITEM',
			'GiftCert': 'GIFT_CERTIFICATE_ITEM',
			'InvtPart': 'INVENTORY_ITEM',
			'Group': 'ITEM_GROUP',
			'Kit': 'KIT_ITEM',
			'Markup': 'MARKUP_ITEM',
			'NonInvtPart': 'NON_INVENTORY_ITEM',
			'OthCharge': 'OTHER_CHARGE_ITEM',
			'Payment': 'PAYMENT_ITEM',
			'Service': 'SERVICE_ITEM',
			'Subtotal': 'SUBTOTAL_ITEM',
			'InvtParttrue': 'LOT_NUMBERED_INVENTORY_ITEM',
			'Assemblytrue': 'LOT_NUMBERED_ASSEMBLY_ITEM'
		};
		return CONST_ITEMTYPE[type];
	}

	function setFilesIdsInItem(itemId, itemType, fileIds) {
		var id = record.submitFields({
			type: search.Type[itemType],
			id: itemId,
			values: {
				'custitem_sds_fileid': fileIds
			}
		});
		log.audit("SAVED ITEM " + id, fileIds)
	}

	function getExtendFilesRecords(itemId) {
		var arrToReturn = [];
		var extendSearchObj = search.create({
			type: "customrecord_extend_files_aut",
			filters:
				[
					["custrecord_extfile_inventory_item_pref", "anyof", itemId],
                    "AND",                    
                    ["custrecord_extfile_type_custlist","anyof","6"]
				],
			columns:
				[
					"custrecord_extfile_file_cabinet_id",
					"custrecord_extfile_link"
				]
		});
		extendSearchObj.run().each(function (result) {
			var fileUrl = result.getValue("custrecord_extfile_link");
			if (fileUrl) arrToReturn.push({ fileUrl: fileUrl });
			return true;
		});
		return arrToReturn;
	}

	return {
		afterSubmit: afterSubmit
	}
});
