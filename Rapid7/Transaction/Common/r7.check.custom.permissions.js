/**
 * r7.check.custom.permissions.js
 * @NApiVersion 2.1
 */
define(['N/log', 'N/runtime', 'N/search'],
    (log, runtime, search) => {
        let objCustomPermissions = null

        const getCustomPermissions = () => {
            let columns = [
                'name',
                'custrecordr7cusspfeatureid', // Feature ID field
                'custrecordr7cusspallemployees', // All Employees field
                'custrecordr7cusspemployees', // Employees field
                'custrecordr7cusspallroles', // All Roles field
                'custrecordr7cussproles', // Roles field
                'custrecordr7cusspalldepartments', // All Departments field
                'custrecordr7cusspdepartments' // Departments field
            ]

            let filters = []
            filters[filters.length] = search.createFilter({
                name: 'isinactive',
                operator: search.Operator.IS,
                values: false
            })

            let permissionRecordSearch = search.create({
                type: 'customrecordr7cussp',
                columns: columns,
                filters: filters
            })

            let objPerms = {}

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

        const userHasPermission = (featureId) => {
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

            let userObj = runtime.getCurrentUser()

            // Check if role is permitted access
            let roleId = userObj.role // -31 is returned if a user cannot be properly identified by NetSuite

            if (
                (objCustomPermissions[featureId].all_roles === true && roleId !== -31) ||
                objCustomPermissions[featureId].roles.indexOf(roleId) !== -1 ||
                objCustomPermissions[featureId].roles.indexOf(roleId.toString()) !== -1
            ) {
                return true
            }
            // Check if department is permitted access
            let departmentId = userObj.department
            if (
                objCustomPermissions[featureId].all_departments === true ||
                objCustomPermissions[featureId].departments.indexOf(departmentId) !== -1 ||
                objCustomPermissions[featureId].departments.indexOf(departmentId.toString()) !== -1
            ) {
                return true
            }

            // Check if user is permitted access
            let userId = userObj.id //-4 is returned if a user cannot be properly identified by NetSuite.
            return (objCustomPermissions[featureId].all_employees === true && userId !== -4) ||
                objCustomPermissions[featureId].employees.indexOf(userId) !== -1 ||
                objCustomPermissions[featureId].employees.indexOf(userId.toString()) !== -1;


        }

        const strToArray = (val) => {
            return val == null || val === '' ? [] : val.split(',')
        }

        return {userHasPermission}

    });