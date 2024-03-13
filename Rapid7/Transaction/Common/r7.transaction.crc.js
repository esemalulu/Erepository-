/**
 * r7.transaction.crc.js
 * @NApiVersion 2.1
 */

define(['N/search', 'N/error', 'N/runtime', './r7.crc.process.package'],
    (search, error, runtime, package) => {

        /**
         * function tranBeforeSubmit will apply to
         * Quotes & Sales Orders. This will check;
         *      1. If transaction has a RSKCMPLT, CRC-ESS or CRC-ADV
         *          interim package.
         *      2. If one of these is present on the transaction, it will;
         *          a. Set "Fulfilment at Scale" = true
         *          b. Check if an active package license is present on the lines,
         *              if not it will create an active package license & set
         *              on all lines of the package
         * 
         */
        function tranBeforeSubmit(context) {
            const DEAL_OPS_PKG_LIC = 1229;
            const DIVVYSAAS_SKU = 7479;
            let thisRecord = context.newRecord;
            let FAS_PACKAGES;
            //get packages that should be marked for fulfilment at scale
            let script = runtime.getCurrentScript();
            let str_fasPackages = script.getParameter({
                name: 'custscript_oldp_fulfil_at_scale_packages'
            });
            FAS_PACKAGES = str_fasPackages.split(",");
            log.debug("FAS_PACKAGES", FAS_PACKAGES);
            //first check if OldPrice Fulfilment at Scale is endabled
            let oldPriceFaSEnabled = script.getParameter({
                name: 'custscript_enable_oldp_fulfil_at_scale'
            });
            log.debug("oldPriceFaSEnabled", oldPriceFaSEnabled);
            if(oldPriceFaSEnabled){
                //check for any of these packages being present on a line
                let isCRC = false;
                FAS_PACKAGES.forEach(function(thisPkg){
                    let crcPackage = thisRecord.findSublistLineWithValue({
                        sublistId: 'item',
                        fieldId: 'custcol_r7_pck_package_level',
                        value: thisPkg
                    });
                    if (crcPackage != -1){
                        isCRC = true;
                    }
                });
                log.debug("Order has CRC OldPrice?", isCRC);
                if(isCRC){
                    //now we know that the transaction contains a CRC package,
                    //loop through the lines and set the required fields
                    let lineCount = thisRecord.getLineCount({
                        sublistId: 'item'
                    });
                    let PACKAGE_LICENSE;
                    for (let i = 0; i < lineCount; i++) {
                        let thisLinePkgLvl = thisRecord.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_r7_pck_package_level',
                            line: i
                        });

                        if(FAS_PACKAGES.indexOf(thisLinePkgLvl) >= 0){
                            //set requires fulfilment at scale = true
                            thisRecord.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_requires_fulfil_at_scale',
                                line: i,
                                value: true
                            });

                            //check Package License. If current value = Deal Operations,
                            //replace with an active Package License
                            let thisLinePkgLicense = thisRecord.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_r7_pck_package_license',
                                line: i
                            });
                            let thisLinePkgLvlName = getPackageLevelName(thisLinePkgLvl);
                            log.debug("thisLinePkgLicense", thisLinePkgLicense);
                            log.debug("PACKAGE_LICENSE", PACKAGE_LICENSE);
                            if(thisLinePkgLicense == DEAL_OPS_PKG_LIC && !PACKAGE_LICENSE) {
                                //create active package license
                                let newPackage = package.createPackageLicense(thisLinePkgLvlName);
                                PACKAGE_LICENSE = newPackage;
                                thisRecord.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_r7_pck_package_license',
                                    line: i,
                                    value: PACKAGE_LICENSE
                                });
                            } else if(PACKAGE_LICENSE) {
                                thisRecord.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_r7_pck_package_license',
                                    line: i,
                                    value: PACKAGE_LICENSE
                                });
                            }

                            //if this line is DIVVYSAAS, set ACL = true
                            let thisItem = thisRecord.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'item',
                                line: i
                            });

                            if(thisItem == DIVVYSAAS_SKU) {
                                log.debug("This Item == DIVVYSAAS. Setting ACL = True");
                                thisRecord.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcolr7transautocreatelicense',
                                    line: i,
                                    value: true
                                });
                            }
                        }
                    }
                } else {
                    //if not CRC, check if a TC product that needs FaS
                    const TC_FAS = [7637, 7638];//7637 - MDRP, 7638 - RMDRP
                    let lineCount = thisRecord.getLineCount({
                        sublistId: 'item'
                    });
                    for (let i = 0; i < lineCount; i++) {
                        let thisItem = thisRecord.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            line: i
                        });
                        //only needs FaS set to true 
                        if(TC_FAS.indexOf(thisItem) != -1){
                            thisRecord.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_requires_fulfil_at_scale',
                                line: i,
                                value: true
                            });
                        }
                    }
                }
            }
        }

        function getPackageLevelName(packageLvlId){
            let lookup = search.lookupFields({
                type: 'customrecord_r7_pck_level',
                id: packageLvlId,
                columns: ['name']
            });
            return lookup.name;
        }

        return {
            tranBeforeSubmit
        }
    });