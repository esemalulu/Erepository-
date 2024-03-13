/**
 * r7.package.js
 * @NApiVersion 2.1
 */

define(["N/search", "N/record", "N/runtime"], 
    (search, record, runtime) => {

        function createPackageLicense(currentItem){
            let packageObj = getPackageItemTemplate(currentItem);
            let packageLicenseId = createNewPackageLicenseRecord(packageObj);

            return packageLicenseId;
        }

        /**
         *
         * @param {string} currentItem - item ID or item Name if it is a package
         * @return {({id: String, name: String, level: String, version: String, itemId: String, collectionId: String}|null)} packageObj or Null
         */
        function getPackageItemTemplate(currentItem) {

            log.debug('getPackageItemTemplate', currentItem);
            log.debug('parseInt(currentItem)', '' + parseInt(currentItem));
            // comparsion to NaN does not work => comparing strings
            if ('' + parseInt(currentItem) === 'NaN') {
                // this expected to be package with a '-level-' suffix if JSON mapping didnt assing the ID of the package and left the itemName in item prop field
                var packageObj = null;

                var itemNameParts = currentItem.split('-');
                log.debug('itemNameParts', itemNameParts)
                // get package level from Package name (TODO execute getAllPackageLevels only once for both occurances)
                var packageLevels = getAllPackageLevels();
                var packageLevel = null;

                for(var i = 0; i < packageLevels.length; i++){
                    var levelObj = packageLevels[i];
                    //added prefix because different items couldnt share the same 'code'
                    //e.g. idr-adv-sub and thrt-adv-sub, only idr-adv was getting selected
                    //because it only checked the middle levelcode
                    var levelPrefix = levelObj.name.split('-')[0];
                    if(levelObj.name.split('-').length > 2 && levelObj.levelCode == 'ISP'){
                        var levelSuffix = levelObj.name.split('-')[2];
                        
                        if (itemNameParts[0] == levelPrefix && 
                                itemNameParts[1] == levelObj.levelCode &&
                                itemNameParts[2] == levelSuffix){

                            packageLevel = levelObj.id;
                            itemNameParts[2] = 'PACKAGE';
                            break;
                        }
                    }
                    else if (itemNameParts[0] == levelPrefix && itemNameParts[1] == levelObj.levelCode) {
                        // convert example: IDR-ADV-SUB => IDR-PACKAGE-SUB
                        packageLevel = levelObj.id;
                        itemNameParts[1] = 'PACKAGE';
                        break;
                    }
                    else if(levelObj.name.split('-').length == 2 && levelObj.name.indexOf("-SUB") < 0) {
                        log.debug("This item name", currentItem);
                        //package is not a OnePrice Package
                        //add hypen to stat of itemNameParts[1] to match package level level code
                        itemNameParts[1] = itemNameParts[1].indexOf("-") == -1 ? "-"+itemNameParts[1] : itemNameParts[1];
                        log.debug("New itemNameParts[1]",itemNameParts[1]);
                        if (itemNameParts[0] == levelPrefix && 
                            itemNameParts[1] == levelObj.levelCode) {
                                packageLevel = levelObj.id;
                                itemNameParts[1] = 'PACKAGE';
                                break;
                            }

                        log.debug("new package name for interim package", itemNameParts.join('-'));
                    }
                };

                if(currentItem == "RSKCMPLT") {
                    packageLevel = 103;
                    var packageName = "RSK-PACKAGE";
                } else {
                    var packageName = itemNameParts.join('-');
                }

                var packageVersion = '1.0'; // default for now, calculation TB identified

                var packageSearch = search.create({
                    type: 'customrecord_r7_pck_item_template',
                    filters: [
                        ['name', 'is', packageName],
                    ],
                    columns: ['internalid', 'custrecord_r7_pit_item'],
                });
                packageSearch.run().each(function (result) {
                    packageObj = {
                        id: result.getValue({
                            name: 'internalid',
                        }),
                        name: packageName,
                        level: packageLevel,
                        version: packageVersion,
                        itemId: result.getValue({
                            name: 'custrecord_r7_pit_item',
                        }),
                        itemName: result.getText({
                            name: 'custrecord_r7_pit_item',
                        })
                    };
                    return false;
                });

                packageObj.collectionId = getPackageCollection(packageObj);

                log.debug('package', JSON.stringify(packageObj));
                return packageObj;
            } else {
                log.debug('package', 'not a package');
                return null;
            }
        }

        function getAllPackageLevels() {
            var packageLevels = [];
            var packageLevelSearch = search.create({
                type: 'customrecord_r7_pck_level',
                filters: [],
                columns: ['internalid', 'name', 'custrecord_r7_pl_code'],
            });
            packageLevelSearch.run().each(function (result) {
                var packageLevel = {
                    id: result.getValue({ name: 'internalid' }),
                    name: result.getValue({ name: 'name' }),
                    levelSuffix: '-' + result.getValue({ name: 'custrecord_r7_pl_code' }) + '-',
                    levelCode: result.getValue({ name: 'custrecord_r7_pl_code' }),
                };
                packageLevels.push(packageLevel);
                return true;
            });
            return packageLevels;
        }

        function getPackageCollection(packageObj) {
            var collectionId = null;
            var collectionSearch = search.create({
                type: 'customrecord_r7_pck_collection',
                filters: [
                    ['custrecord_r7_pcol_item_template', 'anyof', packageObj.id],
                    'AND',
                    ['custrecord_r7_pcol_level', 'anyof', packageObj.level],
                    'AND',
                    ['formulatext: {custrecord_r7_pcol_version}', 'is', packageObj.version],
                ],
                columns: ['internalid'],
            });
            collectionSearch.run().each(function (result) {
                collectionId = result.getValue({
                    name: 'internalid'
                })
                // expecting single result
                return false;
            });
            return collectionId;
        }

        function createNewPackageLicenseRecord(packageObj) {
            var packageLicenseId = null;

            log.debug('creating new package license')

            var packageLicenseRec = record.create({
                type: 'customrecord_r7_pck_license'
            });

            var packageIdentifier = generatePackageIdentifier();

            packageLicenseRec.setValue({
                fieldId: 'custrecord_r7_pl_package_id',
                value: packageIdentifier,
            });
            packageLicenseRec.setValue({
                fieldId: 'custrecord_r7_pl_package_template',
                value: packageObj.id
            });
            packageLicenseRec.setValue({
                fieldId: 'custrecord_r7_pl_item',
                value: packageObj.itemId
            });
            packageLicenseRec.setValue({
                fieldId: 'custrecord_r7_pl_current_collection',
                value: packageObj.collectionId
            });
            packageLicenseRec.setValue({
                fieldId: 'custrecord_r7_pl_current_level',
                value: packageObj.level
            });

            packageLicenseId = packageLicenseRec.save();

            return packageLicenseId;
        }

        function generatePackageIdentifier() {
            var newPackageIdentifier = '';
            while (newPackageIdentifier == '' || getPackageLicenseByIdentifier(newPackageIdentifier) !== null) {
                var chars = 'BCDEFGHJKLMNPQRSTVWXYZ0123456789';
                var randomKey = 'SUPK-';
                for (var i = 0; i < 16; i++) {
                    var rnum = Math.floor(Math.random() * chars.length);
                    randomKey += chars.substring(rnum, rnum + 1);
                    if (i == 3 || i == 7 || i == 11) {
                        randomKey += '-';
                    }
                }
                newPackageIdentifier = randomKey;
            }
            return newPackageIdentifier;
        }

        function getPackageLicenseByIdentifier(packageIdentifier) {
            if (packageIdentifier != null && packageIdentifier != '') {
                var packageInternalId = null;
                packageIdentifier = packageIdentifier.split(',')[0];
                var filters = [search.createFilter({ name: 'custrecord_r7_pl_package_id', operator: search.Operator.IS, values: packageIdentifier })];
                var columns = [search.createColumn({ name: 'internalid' })]
                var packageLicenseSearch = search.create({
                    type: 'customrecord_r7_pck_license',
                    filters: filters,
                    columns: columns,
                })
                packageLicenseSearch.run().each(function (result) {
                    packageInternalId = result.getValue({
                        name: 'internalid'
                    })
                    // expecting single result
                    return false;
                });
                return packageInternalId;
            } else {
                return null
            }
        }

        return{
            createPackageLicense
        }
    });
