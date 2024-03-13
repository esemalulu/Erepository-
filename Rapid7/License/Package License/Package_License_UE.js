/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/log'], function (record, search, log) {
    function beforeSubmit(context) {
        if (context.type === context.UserEventType.CREATE || context.type === context.UserEventType.COPY) {
            var packageIdentifier = generatePackageIdentifier(context);
            context.newRecord.setValue({
                fieldId: 'custrecord_r7_pl_package_id',
                value: packageIdentifier,
            });
        }
    }

    function generatePackageIdentifier() {
        var key = '';
        while (key == '' || packageIdentifierExists(key)) {
            var chars = 'BCDEFGHJKLMNPQRSTVWXYZ0123456789';
            var randomKey = 'SUPK-';
            for (var i = 0; i < 16; i++) {
                var rnum = Math.floor(Math.random() * chars.length);
                randomKey += chars.substring(rnum, rnum + 1);
                if (i == 3 || i == 7 || i == 11) {
                    randomKey += '-';
                }
            }
            key = randomKey;
        }
        return key;
    }

    function packageIdentifierExists(packageIdentifier) {
        if (packageIdentifier != null && packageIdentifier != '') {
            var filters = [search.createFilter({ name: 'custrecord_r7_pl_package_id', operator: search.Operator.IS, values: packageIdentifier })];
            var columns = [search.createColumn({ name: 'internalid' })]
            var packageLicenseSearch = search.create({
                type: 'customrecord_r7_pck_license',
                filters: filters,
                columns: columns,
            }).run().getRange({ start: 0, end: 1 });

            if (packageLicenseSearch != null && packageLicenseSearch.length > 0) {
                return true;
            }

            return false;
        }
        return true;
    }

    return {
        beforeSubmit: beforeSubmit,
    };
});
