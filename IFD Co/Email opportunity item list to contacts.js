/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 */
define(['N/email', 'N/record', 'N/log', 'N/search'], 
function(email, record, log, search) {
    function execute(context) {
        try {
            // Load the saved search for items
            var itemSearch = search.load({
                id: 'customsearch_ifd_opportunity_obsolete'
            });

            // Execute the search
            var resultSet = itemSearch.run();

            // Create an HTML table to store item information
            var itemTable = '<style>table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #dddddd; text-align: left; padding: 8px; } th { background-color: #f2f2f2; }</style>';
            itemTable +='<table><tr><th>IFD #</th><th>Description</th><th>Pack Size</th><th>Brand</th><th>QOH</th><th>Sell Price</th></tr>';

            // Iterate through the results and build the item table
            resultSet.each(function(result) {
                // Extract necessary information from the result
                var itemName = result.getValue({
                    name: 'itemid'
                });

                var itemDescription = result.getValue({
                    name: 'salesdescription'
                });
				
				var itemPacksize = result.getValue({
					name: 'custitem_ifd_field_packsize'
                });      
					
				var itemBrand = result.getValue({
					name: 'custitem_ifd_brand'
                });      
					
				var itemOnhand = result.getValue({
					name: 'quantityonhand'
                });      

				var itemSell = result.getValue({
					name: 'custitem_ifd_promo_sell_price'
                });     

                // Add a new row to the table
                itemTable += '<tr><td>' + itemName + '</td><td>' + itemDescription + '</td><td>' + itemPacksize + '</td><td>' + itemBrand + '</td><td>' + itemOnhand + '</td><td>' + itemSell + '</td></tr>';

                return true; // Continue processing remaining results
            });

            // Close the HTML table
            itemTable += '</table>';

            // Load the saved search for contacts
            var contactSearch = search.load({
                id: 'customsearch_ifd_opp_mailer_contacts'
            });

            // Execute the search
            var contactResultSet = contactSearch.run();

            // Iterate through the contact results and send emails
            contactResultSet.each(function(contactResult) {
                // Extract necessary information from the contact result
                var contactEmail = contactResult.getValue({
                    name: 'email'
                });

                // Send email to the contact with the item list
                email.send({
                    author: 50267, // ID of the sender 3/12 changed to new distribution group user
                    recipients: contactEmail,
                    subject: 'Open to see Opportunity Deals from IFD today!',
                    body: 'The listed items are being closed out from our inventory, items are priced at a substantial discount or make an offer. Limited to quantities on hand, orders fulfilled first come first serve. Reply to this email if you would like your order entered now, otherwise you can order on eInFoLink.<br><br>' + itemTable,
					isHTML: true
                });

                return true; // Continue processing remaining results
            });

            log.debug("Script Complete", "Emails sent successfully");
        } catch (e) {
            log.error("Error", e.message);
        }
    }

    return {
        execute: execute
    };
});