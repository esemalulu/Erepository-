{{#if showAction}}
	<div class="payment-wizard-invoice-action-row">
		<a data-action="edit" class="payment-wizard-invoice-action-button" href="#" >
			{{#if isPayfull}}
			{{translate 'Edit Payment'}}
			{{else}}
			{{translate 'Partial Payment'}}
			{{/if}}
		</a>
		<a data-action="remove" class="payment-wizard-invoice-action">
			{{translate 'Remove'}}
		</a>
	</div>
{{/if}}

{{!----
Use the following context variables when customizing this template:

isPayfull (Boolean)
showAction (Boolean)

----}}
