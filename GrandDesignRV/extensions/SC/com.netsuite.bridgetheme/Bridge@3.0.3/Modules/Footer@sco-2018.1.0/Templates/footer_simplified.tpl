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

    <section class="footer-content-nav-section">
        <div class="footer-content-copyright">
            {{#with extraFooterSimplifiedViewContext.copyright}}
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
    </section>
</div>



{{!----
The context variables for this template are not currently documented. Use the {{log this}} helper to view the context variables in the Console of your browser's developer tools.

----}}
