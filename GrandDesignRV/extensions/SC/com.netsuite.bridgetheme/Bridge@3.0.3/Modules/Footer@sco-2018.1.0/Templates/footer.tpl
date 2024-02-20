{{!
	© 2017 NetSuite Inc.
	User may not copy, modify, distribute, or re-bundle or otherwise make available this code;
	provided, however, if you are an authorized user with a NetSuite account or log-in, you
	may use this code subject to the terms that govern your access and use.
}}

{{! Edited for Bridge Theme }}

<div data-view="Global.BackToTop"></div>
<div class="footer-content">

	<!-- CMS -->
	<div id="banner-footer" class="content-banner banner-footer" data-cms-area="global_banner_footer" data-cms-area-filters="global"></div>

	<section class="footer-content-upper-section"{{#if extraFooterViewContext.backgroundUrl}} style="background-image: url('{{getThemeAssetsPath extraFooterViewContext.backgroundUrl}}');"{{/if}}>
		<div class="footer-content-upper">
			<div class="footer-content-upper-icon-text">
				<div class="footer-content-upper-icon">
					<i class="footer-location-icon icon-{{#if extraFooterViewContext.iconClass}}{{extraFooterViewContext.iconClass}}{{else}}map-marker{{/if}}"></i>
				</div>
				<div class="footer-content-upper-primarytext">
					{{#if extraFooterViewContext.title}}<h3>{{extraFooterViewContext.title}}</h3>{{/if}}
                    {{#if extraFooterViewContext.primaryText}}
					<div data-view="PrimaryText">{{extraFooterViewContext.primaryText}}</div>
                    {{/if}}
				</div>
			</div>
			<div class="row footer-content-upper-icon-text">
				<div class="footer-content-upper-secondarytext">
                    {{#if extraFooterViewContext.primaryText}}
					<div data-view="SecondaryText">{{extraFooterViewContext.secondaryText}}</div>
                    {{/if}}
				</div>
			</div>
		</div>
		<div class="footer-content-newsletter">
      {{#if extraFooterViewContext.showLegacyNewsletter}}
        <div data-view="FooterContent"></div>
      {{else}}
        <div class="newsletter-cct-area" data-cms-area="newsletter-cct-area" data-cms-area-filters="global"></div>
      {{/if}}
			{{#if extraFooterViewContext.socialMediaLinks}}
	        <div class="footer-content-social">
	            <ul class="footer-content-social-list">
	            {{#if extraFooterViewContext.socialMediaLinksTitle}}<li class="footer-content-social-media-links-title">{{extraFooterViewContext.socialMediaLinksTitle}}</li>{{/if}}
	            {{#each extraFooterViewContext.socialMediaLinks}}
	                <li><a {{objectToAtrributes item}} data-hashtag="{{datahashtag}}" data-touchpoint="{{datatouchpoint}}" data-target="{{datatarget}}" target="_blank">{{#if icon}}<i class="footer-content-social-icon icon-{{icon}}"></i>{{else}}{{text}}{{/if}}</a></li>
	            {{/each}}
	            </ul>
	        </div>
	        {{/if}}
		</div>
	</section>

	<section class="footer-content-nav-section">
		<div class="footer-content-copyright">
            {{#with extraFooterViewContext.copyright}}
		        {{#unless hide}}
		            {{#if showRange}}
		                {{translate '&copy; $(0) &#8211; $(1) $(2)' initialYear currentYear companyName}}
		                <!-- an en dash &#8211; is used to indicate a range of values -->
		            {{else}}
		                {{translate '&copy; $(0) $(1)' currentYear companyName}}
		            {{/if}}
		        {{/unless}}
		    {{/with}}
		</div>
		<div class="footer-content-nav">
			{{#if showFooterNavigationLinks}}
			<ul class="footer-content-nav-list">
			{{#each footerNavigationLinks}}
				<li>
					<a {{objectToAtrributes item}}>{{text}}</a>
				</li>
			{{/each}}
			</ul>
			{{/if}}
		</div>

		<div class="footer-columns">
	        {{#if extraFooterViewContext.col1Links}}
	        <div class="footer-column-links">
	            <ul>
	            {{#each extraFooterViewContext.col1Links}}
	            {{#if href}}
	                <li class="footer-column-link-listitem"><a class="footer-column-link" {{objectToAtrributes item}} data-hashtag="{{datahashtag}}" data-touchpoint="{{datatouchpoint}}" data-target="{{datatarget}}">{{text}}</a></li>
	            {{else}}
	                <li class="footer-column-heading-listitem"><h4 class="footer-column-heading">{{text}}</h4></li>
	            {{/if}}
	            {{/each}}
	            </ul>
	        </div>
	        {{/if}}
	        {{#if extraFooterViewContext.col2Links}}
	        <div class="footer-column-links">
	            <ul>
	            {{#each extraFooterViewContext.col2Links}}
	            {{#if href}}
	                <li class="footer-column-link-listitem"><a class="footer-column-link" {{objectToAtrributes item}} data-hashtag="{{datahashtag}}" data-touchpoint="{{datatouchpoint}}" data-target="{{datatarget}}">{{text}}</a></li>
	            {{else}}
	                <li class="footer-column-heading-listitem"><h4 class="footer-column-heading">{{text}}</h4></li>
	            {{/if}}
	            {{/each}}
	            </ul>
	        </div>
	        {{/if}}
	        {{#if extraFooterViewContext.col3Links}}
	        <div class="footer-column-links">
	            <ul>
	            {{#each extraFooterViewContext.col3Links}}
	            {{#if href}}
	                <li class="footer-column-link-listitem"><a class="footer-column-link" {{objectToAtrributes item}} data-hashtag="{{datahashtag}}" data-touchpoint="{{datatouchpoint}}" data-target="{{datatarget}}">{{text}}</a></li>
	            {{else}}
	                <li class="footer-column-heading-listitem"><h4 class="footer-column-heading">{{text}}</h4></li>
	            {{/if}}
	            {{/each}}
	            </ul>
	        </div>
	        {{/if}}
	        {{#if extraFooterViewContext.col4Links}}
	        <div class="footer-column-links">
	            <ul>
	            {{#each extraFooterViewContext.col4Links}}
	            {{#if href}}
	                <li class="footer-column-link-listitem"><a class="footer-column-link" {{objectToAtrributes item}} data-hashtag="{{datahashtag}}" data-touchpoint="{{datatouchpoint}}" data-target="{{datatarget}}">{{text}}</a></li>
	            {{else}}
	                <li class="footer-column-heading-listitem"><h4 class="footer-column-heading">{{text}}</h4></li>
	            {{/if}}
	            {{/each}}
	            </ul>
	        </div>
	        {{/if}}
	    </div>

	</section>
</div>




{{!----
Use the following context variables when customizing this template:

	showFooterNavigationLinks (Boolean)
	footerNavigationLinks (Array)

----}}
