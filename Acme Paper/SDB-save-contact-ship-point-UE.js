/**
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 */
define(["N/record", "N/search"], function (record, search)
{

    function beforeSubmit(context)
    {
        try
        {
            const oldContactRecord = context.oldRecord;
            const contactRecord = context.newRecord;

            const oldShipPointContact = oldContactRecord.getValue("custentity_sdb_ship_point_contact");
            const shipPointContact = contactRecord.getValue("custentity_sdb_ship_point_contact");

            // If there were no changes at all exit script
            if (!oldShipPointContact && !shipPointContact) return;

            // If the user is adding a new ship-point to the contact record
            if (!oldShipPointContact && shipPointContact)
            {
                log.audit("START CASE 1", "Entering case new ship point");

                // Get ship point record
                const shipPointContactId = getShipPointRecord(shipPointContact);

                // If association record between ship-point and contact does not exist, we are going to create one
                if (!shipPointContactId)
                {
                    createShipPointAssociationRecord(shipPointContact, contactRecord.id);
                }
                else
                {
                    // Get if contact is already inside record
                    let contactsShipPoint = getContactsShipPointRecord(shipPointContactId);

                    const contactFind = contactsShipPoint?.find((contact) => { return contact == contactRecord?.id }) || -1;

                    // Add contact to array
                    if (!contactFind || contactFind == -1)
                    {
                        contactsShipPoint.push(contactRecord.id);

                        try
                        {
                            // Submit new contacts inside ship point contact custom record
                            setContactList(contactsShipPoint, shipPointContactId, { title: "Saving", desc: `Saving contact ${contactRecord.id} inside ship point ${shipPointContact}` });
                        }
                        catch (error)
                        {
                            log.error("Error saving contact inside ship point custom record", error);
                        }
                    }

                }
            }

            // If the user is changing ship-point contact
            if (oldShipPointContact && shipPointContact && (oldShipPointContact != shipPointContact))
            {
                log.audit("START CASE 2", "Entering case modifying ship point");

                // ----------------- REMOVE CONTACT FROM OLD SHIP POINT ----------------------------

                // Get old ship point record
                const oldShipPointContactId = getShipPointRecord(oldShipPointContact);
                if (!oldShipPointContact) return;

                // Get if contact is already inside old record
                const contactsOldShipPoint = getContactsShipPointRecord(oldShipPointContactId);

                // Removing contact from contact list
                const newArray = contactsOldShipPoint?.filter(contact => contact != contactRecord?.id) || [];
                log.debug("🚀 ~ Old contacts filtered:", newArray);

                setContactList(newArray, oldShipPointContactId, { title: 'Removing contact from old ship point', desc: `Contact ${contactRecord.id} has been removed from ship point ${oldShipPointContact}` });

                // ----------------- ADD CONTACT TO NEW SHIP POINT ----------------------------

                // Get new ship point record
                const newShipPointContactId = getShipPointRecord(shipPointContact);

                // If ship point custom record does not exist we are going to create it
                if (!newShipPointContactId)
                {
                    createShipPointAssociationRecord(shipPointContact, contactRecord.id);
                }
                else
                {
                    // Get if contact is already inside record
                    let contactsShipPoint = getContactsShipPointRecord(newShipPointContactId);
                    log.debug("🚀 ~ contactsShipPoint:", contactsShipPoint)

                    const contactFind = contactsShipPoint?.find((contact) => { return contact?.value == contactRecord?.id }) || -1;
                    log.debug("🚀 ~ contactFind:", contactFind)

                    // Add contact to array
                    if (!contactFind || contactFind == -1)
                    {
                        contactsShipPoint.push(contactRecord.id);
                        log.debug("🚀 ~ contactsShipPoint after push:", contactsShipPoint)

                        try
                        {
                            // Submit new contacts inside ship point contact custom record
                            setContactList(contactsShipPoint, newShipPointContactId, { title: "Saving changed contact", desc: `Saving contact ${contactRecord.id} inside ship point ${shipPointContact}` });
                        }
                        catch (error)
                        {
                            log.error("Error saving contact inside ship point custom record", error);
                        }
                    }
                }
            }

            // If user is removing ship point contact
            if (oldShipPointContact && !shipPointContact)
            {
                log.audit("START CASE 3", "Removing contact from ship point");

                const shipPointContactId = getShipPointRecord(oldShipPointContact);
                if (!shipPointContactId) return;

                // Get if contact is already inside record
                const contactsShipPoint = getContactsShipPointRecord(shipPointContactId);
                log.debug("🚀 ~ contactsShipPoint:", contactsShipPoint)

                const contactFound = contactsShipPoint?.find((contact) => { return contact == contactRecord.id }) || -1;
                log.debug("🚀 ~ contactFound:", contactFound)

                if (contactFound)
                {
                    const newArray = contactsShipPoint?.filter(contact => contact != contactRecord?.id) || [];
                    log.debug("🚀 ~ newArray:", newArray);

                    try
                    {
                        setContactList(newArray, shipPointContactId, { title: "Contact removed", desc: `Contact ${contactRecord.id} has been removed from ship point ${oldShipPointContact}` });
                    }
                    catch (error)
                    {
                        log.error("Error removing contact from ship point custom record", error);
                    }
                }

            }
        }
        catch (e)
        {
            log.error("error", e);
        }
    }

    // ----------------------------------- AUXILIAR FUNCTIONS ----------------------------------------------------------

    function createShipPointAssociationRecord(shipPointId, contactId)
    {
        try
        {
            const shipPointContactRecord = record.create({
                type: 'customrecord_sdb_ship_point_contacts',
            });

            // Set ship point
            shipPointContactRecord.setValue({ fieldId: 'custrecord_sdb_ship_point', value: shipPointId });

            // Set contact
            shipPointContactRecord.setValue({ fieldId: 'custrecord_sdb_contacts_ship_point', value: contactId });

            shipPointContactRecord.save();

            log.debug("New record", `New association record has been created for ship point: ${shipPointId}`);
        }
        catch (error)
        {
            log.error("Error creating new association record", error);
        }

    }

    function getShipPointRecord(shipPoint)
    {
        let recordId = null;

        const customrecord_sdb_ship_point_contactsSearchObj = search.create({
            type: "customrecord_sdb_ship_point_contacts",
            filters:
                [
                    ["custrecord_sdb_ship_point", "anyof", shipPoint]
                ],
            columns:
                [
                    search.createColumn({
                        name: "scriptid",
                        sort: search.Sort.ASC,
                        label: "Script ID"
                    })
                ]
        });
        const searchResultCount = customrecord_sdb_ship_point_contactsSearchObj.runPaged().count;

        if (searchResultCount < 1) return false;

        customrecord_sdb_ship_point_contactsSearchObj.run().each(function (result)
        {
            recordId = result.id;
        });

        return recordId;
    }

    function getContactsShipPointRecord(shipPointId)
    {
        if (!shipPointId) return [];

        let contactsShipPoint = search.lookupFields({
            type: 'customrecord_sdb_ship_point_contacts',
            id: shipPointId,
            columns: "custrecord_sdb_contacts_ship_point"
        })?.custrecord_sdb_contacts_ship_point;

        if (!contactsShipPoint || contactsShipPoint?.length < 1) return [];

        // Only left internal id in array
        contactsShipPoint = contactsShipPoint.map(contact => contact.value);

        return contactsShipPoint;
    }

    function setContactList(contacts, shipPoint, message)
    {
        try
        {
            if (!shipPoint) return;

            record.submitFields({
                type: 'customrecord_sdb_ship_point_contacts',
                id: shipPoint,
                values: {
                    custrecord_sdb_contacts_ship_point: contacts
                }
            });

            log.debug(message.title, message.desc);
        }
        catch (error)
        {
            log.error("Error saving ship point custom record", error);
        }
    }

    return {
        beforeSubmit
    }
});
