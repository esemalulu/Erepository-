
//load both records
var sir = nlapiLoadRecord('inventoryitem',29);
var tir = nlapiLoadRecord('noninventoryitem',2317);

var salesDesc = sir.getFieldValue('salesdescription');
var storeDesc = sir.getFieldValue('storedescription');
var detailDesc = sir.getFieldValue('storedetaileddescription');
var metaTagHtml = sir.getFieldValue('metataghtml');
var storeDisplayThumb = sir.getFieldValue('storedisplaythumbnail');
var storeDisplayImg = sir.getFieldValue('storedisplayimage');

//set it on target item record
tir.setFieldValue('salesdescription', salesDesc);
tir.setFieldValue('storedescription', storeDesc);
tir.setFieldValue('storedetaileddescription', detailDesc);
tir.setFieldValue('metataghtml', metaTagHtml);
tir.setFieldValue('storedisplaythumbnail', storeDisplayThumb);
tir.setFieldValue('storedisplayimage', storeDisplayImg);

//save it
nlapiSubmitRecord(tir, true, true);