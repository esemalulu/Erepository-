/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
define(['N/cache', 'N/https', 'SuiteScripts/Lib/veic_sync_vb_status_with_tracker_lib.js'],
    /**
 * @param{cache} cache
 * @param{https} https
 * @param{lib} lib
 */
    (cache, https, lib) => {
        /**
         * Defines the WorkflowAction script trigger point.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.workflowId - Internal ID of workflow which triggered this action
         * @param {string} scriptContext.type - Event type
         * @param {Form} scriptContext.form - Current form that the script uses to interact with the record
         * @since 2016.1
         */
        const onAction = (scriptContext) => {
            const id = scriptContext.newRecord.id;
            log.debug("VB " + id, scriptContext.type);

            try {
                // Only when the External Id is populated we proceed.
                const externalId = scriptContext.newRecord.getValue({ fieldId: "externalid" });
                if (!externalId) {
                    log.debug("No Extrnal Id", "Skipping VB Id " + id);
                    return;
                }

                const createdById = scriptContext.newRecord.getValue({ fieldId: "custbody_cp_createdby" });

                // Only if the Created By User Id is the Tracker Integration User Id we proceed
                const trackerIntegrationUserId = lib.getConfiguration("tracker_user_id");
                log.debug("Created by Id", createdById);
                if (createdById != trackerIntegrationUserId) {
                    const createdBy = scriptContext.newRecord.getText({ fieldId: "custbody_cp_createdby" });
                    log.debug("Not created by Tracker Integration, instead by " + createdBy, "Skipping VB Id " + id);
                    return;
                }

                const approvalStatusId = scriptContext.newRecord.getValue({ fieldId: "approvalstatus" });
                log.debug("Approval Status Id", approvalStatusId);
                const approvalStatus = scriptContext.newRecord.getText({ fieldId: "approvalstatus" });
                log.debug("Approval Status", approvalStatus);

                const status = scriptContext.newRecord.getText({ fieldId: "status" });
                log.debug("Status", status);
                const statusId = scriptContext.newRecord.getValue({ fieldId: "status" });
                log.debug("Status Id", statusId);
                const rejectionReason = scriptContext.newRecord.getValue({ fieldId: "custbody_cp_rejectionreason" });
                const nextApprover = scriptContext.newRecord.getText({ fieldId: "nextapprover" });                                    
                log.debug("Next Approver", nextApprover);

                const body = JSON.stringify(
                    [
                        {
                        //    InternalId: id,
                            VoucherNumber: externalId,
                        //    FinanceStatus: statusId,
                            FinanceApprovalStatus: approvalStatus,
                            FinanceRejectionReason: rejectionReason,
                        //    FinanceNextApprover: nextApprover
                        }
                    ]
                );

                log.audit("Request for VB Id " + id, body);

                let token = getToken();
                log.debug("Token", token);

                if (token) {
                    const response = https.post({
                        url: lib.getConfiguration("tracker_url"),
                        body: body,
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": "Bearer " + token
                        }
                    });

                    log.audit("Response for VB Id " + id, response.code + " | " + response.body);
                } else {
                    log.error("No token availble", "");
                }

            } catch (ex) {
                log.error("Unexpected Error", ex.message)
            }

        }

          /**
         * Retrieves the cached access token, if available. Otherwise, retrieves a new one from VEIC.org.
         * @returns {string} access_token - Cached access token. If not available or expired, retrieves a new one.
         */
          const getToken = () => {
            return cache.getCache({
                name: "TRACKET_INTEGRATION_CACHE"
            }).get({
                key: "access_token",
                ttl: 60 * 60, // 60 minutes
                loader: () => {
                    try {
                        const tokenUrl = lib.getConfiguration("token_url");
                        const clientId = lib.getConfiguration("client_id");
                        const clientSecret = lib.getConfiguration("client_secret");

                        const properties = {
                            'grant_type': 'client_credentials',
                            'client_id': clientId,
                            'client_secret': clientSecret
                        };

                        const encodedBody = Object.keys(properties).map(key => encodeURIComponent(key) + '=' + encodeURIComponent(properties[key])).join('&');

                        const response = https.post({
                            url: tokenUrl,
                            body: encodedBody,
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded'
                            }
                        });

                        if (response.code == 200) {
                            const jsonBody = JSON.parse(response.body);
                            const accessToken = jsonBody.access_token;
                            log.audit("Got a new access token", accessToken);
                            return accessToken;
                        } else {
                            log.error("Error getting a new access token", response.code + " | " + response.body);
                            return null;
                        }
                    } catch (ex) {
                        log.error("Error in getToken", ex.message);
                        return null;
                    }
                }
            });
        }
        return {onAction};
    });
