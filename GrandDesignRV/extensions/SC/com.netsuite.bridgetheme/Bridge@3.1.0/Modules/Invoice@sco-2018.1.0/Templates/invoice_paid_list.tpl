{{#if showBackToAccount}}
	<a href="/" class="invoice-paid-list-button-back">
		<i class="invoice-paid-list-button-back-icon"></i>
		{{translate 'Back to Account'}}
	</a>
{{/if}}

<section class="invoice-paid-list">
	<header class="invoice-paid-list-header">
		<h2 class="invoice-paid-list-title">{{pageHeader}}</h2>
	</header>

	<div class="invoice-paid-list-header-nav">
		<div class="invoice-paid-list-header-button-group">
			<a href="/invoices" class="invoice-paid-list-header-button-open">{{translate 'Open'}}</a>
			<span class="invoice-paid-list-header-button-paid">{{translate 'Paid in Full'}}</span>

		</div>
	</div>

	<div data-view="ListHeader"></div>

	<div class="invoice-paid-list-body">
		{{#if showInvoices}}
			<table class="invoice-paid-list-records">
				<thead class="invoice-paid-list-records-head">
				<tr class="invoice-paid-list-records-head-row">
					<th class="invoice-paid-list-head-invoicenumber">{{translate 'Invoice No.'}}</th>
					{{#each columns}}
					<th>
						{{label}}
					</th>
					{{/each}}
				</tr>
				</thead>
				<tbody class="invoice-paid-list-records-body" data-view="Invoice.Results"></tbody>
			</table>
		{{else}}
			<div class="invoice-paid-list-no-records">
				<h5>{{translate 'You don\'t have any Invoices Paid In Full at the moment,<br/> see <a href="/invoices" class="invoice-paid-list-anchor-open" >Open Invoices</a>'}}</h5>
			</div>
		{{/if}}
	</div>
	{{#if showPagination}}
		<div class="invoice-paid-list-paginator">
			<div data-view="GlobalViews.Pagination"></div>
		</div>
	{{/if}}
</section>

{{!----
The context variables for this template are not currently documented. Use the {{log this}} helper to view the context variables in the Console of your browser's developer tools.

----}}
