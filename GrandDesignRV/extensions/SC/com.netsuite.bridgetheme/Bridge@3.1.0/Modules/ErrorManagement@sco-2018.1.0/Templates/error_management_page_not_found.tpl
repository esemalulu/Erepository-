{{!
	© 2017 NetSuite Inc.
	User may not copy, modify, distribute, or re-bundle or otherwise make available this code;
	provided, however, if you are an authorized user with a NetSuite account or log-in, you
	may use this code subject to the terms that govern your access and use.
}}

{{! Edited for Bridge Theme }}

<div class="error-management-page-not-found">
    <div class="error-management-page-not-found-header" style="{{#if extraErrorMgtPageNotFoundView.backgroundImage}}background-image: url({{getThemeAssetsPathWithDefault extraErrorMgtPageNotFoundView.backgroundImage 'img/bridge-page-not-found.jpg'}}); {{/if}}{{#if extraErrorMgtPageNotFoundView.backgroundColor}}background-color: {{extraErrorMgtPageNotFoundView.backgroundColor}};{{/if}}">
		<div class="error-management-page-not-found-caption">
			<div class="error-management-page-not-found-caption-content">
				<div class="error-management-page-not-found-title">
					{{#if extraErrorMgtPageNotFoundView.title}}
					<h1>{{{extraErrorMgtPageNotFoundView.title}}}</h1>
					{{else}}
					<h1>{{extraErrorMgtPageNotFoundView.pageHeader}}</h1>
					{{/if}}
					{{#if extraErrorMgtPageNotFoundView.text}}
					<p class="error-management-page-not-found-text">{{extraErrorMgtPageNotFoundView.text}}</p>
					{{/if}}
				</div>
				{{#if extraErrorMgtPageNotFoundView.btnText}}
				<div class="error-management-page-not-found-button-container">
					<a href="{{extraErrorMgtPageNotFoundView.btnHref}}" class="error-management-page-not-found-button">
						{{extraErrorMgtPageNotFoundView.btnText}}
					</a>
				</div>
				{{/if}}
			</div>
		</div>
    </div>

	<div id="error-management-page-not-found-content" class="error-management-page-not-found-content"></div>

	<div id="error-management-page-not-found-cms" class="error-management-page-not-found-cms" data-cms-area="page_not_found_cms" data-cms-area-filters="page_type"></div>
</div>
