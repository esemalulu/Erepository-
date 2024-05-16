/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(["N/render", "N/log", "N/email", "N/runtime", "N/record"], function (render, log, email, runtime, record)
{
	function onRequest(context)
	{
		try
		{
			var userName;
			const user = runtime.getCurrentUser();
			if (user && user != null) userName = user?.email;

			const email_author = runtime.getCurrentScript().getParameter({
				name: "custscript_email_author",
			});

			let record_id = context.request.parameters["record_id"];
			const po_number = context.request.parameters["po_number"];
			const email_to_send = context.request.parameters["email"];
			const author_from_request = context.request.parameters["author"];

			record_id = parseInt(record_id);
			let renderer = render.transaction({
				entityId: record_id,
				printMode: render.PrintMode.PDF,
				inCustLocale: true,
			});
			renderer.name = `${po_number}.pdf`;
			log.debug("email_to_send", email_to_send);
			log.debug("author_from_request", author_from_request);

			if (email_to_send && author_from_request)
			{
				// Save who was the person that sent email
				record.submitFields({
					type: record.Type.PURCHASE_ORDER,
					id: record_id,
					values: {
						'custbody_return_confirmation_by_email': userName
					},
					options: {
						ignoreMandatoryFields: true
					}
				});

				renderer = render.transaction({
					entityId: record_id,
					printMode: render.PrintMode.PDF,
					inCustLocale: true,
				});

				email.send({
					author: author_from_request,
					recipients: email_to_send,
					subject: "Purchase Order - " + po_number,
					body: "Attached file",
					attachments: [renderer],
					relatedRecords: {
						transactionId: record_id,
					},
				});
			} else
			{
				context.response.writeFile(renderer, true);
			}
		} 
		catch (error)
		{
			log.error("error", error);
		}
	}

	return {
		onRequest: onRequest,
	};
});
