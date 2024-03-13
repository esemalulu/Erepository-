/**
 * Check_Custom_Permissions_2.0.js
 * @NApiVersion 2.x
 */
define(['N/search', 'N/runtime', 'N/log'], function (search, runtime, log) {
    var objCustomPermissions = null

    function getCustomPermissions() {
        var columns = [
            'name',
            'custrecordr7cusspfeatureid', // Feature ID field
            'custrecordr7cusspallemployees', // All Employees field
            'custrecordr7cusspemployees', // Employees field
            'custrecordr7cusspallroles', // All Roles field
            'custrecordr7cussproles', // Roles field
            'custrecordr7cusspalldepartments', // All Departments field
            'custrecordr7cusspdepartments' // Departments field
        ]

        var filters = []
        filters[filters.length] = search.createFilter({
            name: 'isinactive',
            operator: search.Operator.IS,
            values: false
        })

        var permissionRecordSearch = search.create({
            type: 'customrecordr7cussp',
            columns: columns,
            filters: filters
        })

        var objPerms = {}

        permissionRecordSearch.run().each(function (result) {
            log.debug({
                title: 'result',
                details: JSON.stringify({
                    result: result
                })
            })
            objPerms[result.getValue({ name: 'custrecordr7cusspfeatureid' })] = {
                internalid: result.id,
                name: result.getValue({ name: 'name' }),
                feature: result.getValue({
                    name: 'custrecordr7cusspfeatureid'
                }),
                all_employees: result.getValue({
                    name: 'custrecordr7cusspallemployees'
                }),
                employees: strToArray(result.getValue({ name: 'custrecordr7cusspemployees' })),
                all_roles: result.getValue({
                    name: 'custrecordr7cusspallroles'
                }),
                roles: strToArray(result.getValue({ name: 'custrecordr7cussproles' })),
                all_departments: result.getValue({
                    name: 'custrecordr7cusspalldepartments'
                }),
                departments: strToArray(result.getValue({ name: 'custrecordr7cusspdepartments' }))
            }
            return true
        })

        return objPerms
    }

    function userHasPermission(featureId) {
        // If the objCustomPermissions object doesn't exist then create it for the given feature ID
        if (!objCustomPermissions) {
            objCustomPermissions = getCustomPermissions()
        }

        if (!featureId || !objCustomPermissions.hasOwnProperty(featureId)) {
            // feature doesn't exist... should never happen
            log.error({
                title: 'Custom permission feature not found',
                details: 'feature id provided: ' + featureId
            })
            return false
        }

        var userObj = runtime.getCurrentUser()

        // Check if role is permitted access
        var roleId = userObj.role // -31 is returned if a user cannot be properly identified by NetSuite
        
        if (
            (objCustomPermissions[featureId].all_roles == true && roleId != -31) ||
            objCustomPermissions[featureId].roles.indexOf(roleId) != -1 ||
            objCustomPermissions[featureId].roles.indexOf(roleId.toString()) != -1
        ) {
            return true
        }
        // Check if department is permitted access
        var departmentId = userObj.department
        if (
            objCustomPermissions[featureId].all_departments == true ||
            objCustomPermissions[featureId].departments.indexOf(departmentId) != -1 ||
            objCustomPermissions[featureId].departments.indexOf(departmentId.toString()) != -1
        ) {
            return true
        }

        // Check if user is permitted access
        var userId = userObj.id //-4 is returned if a user cannot be properly identified by NetSuite.
        if (
            (objCustomPermissions[featureId].all_employees == true && userId != -4) ||
            objCustomPermissions[featureId].employees.indexOf(userId) != -1 ||
            objCustomPermissions[featureId].employees.indexOf(userId.toString()) != -1
        ) {
            return true
        }

        return false
    }

    function strToArray(val) {
        return val == null || val == '' ? [] : val.split(',')
    }

    return {
        userHasPermission: userHasPermission
    }
})
