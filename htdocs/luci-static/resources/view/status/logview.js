'use strict';
'require fs';
'require ui';
'require logview.logview as logview';

return L.view.extend({
	load: function() {
		return logview.load();
	},

	handleTabActive: function(ev) {
		var target = ev.target;
		return logview.refresh(ev.detail.tab, false).then(function() {
			target.querySelectorAll('button, input[type="checkbox"]').forEach(function(e) {
				e.removeAttribute('disabled');
			});
		});
	},

	handleDownload: function(logname, format, extension, ev) {
		return logview.download(logname, format);
	},

	handleSortingToggle: function(logname, ev) {
		var checked = ev.target.checked;

		ev.target.setAttribute('disabled', true);
		logview.setSorting(logname, checked);
		ev.target.removeAttribute('disabled');
	},

	handleRefresh: function(logname, ev) {
		return logview.refresh(logname, true);
	},

	renderTabs: function(container) {
		var log_names = logview.logNames();

		L.dom.content(container, null);

		if (container.hasAttribute('data-initialized')) {
			container.removeAttribute('data-initialized');
			container.parentNode.removeChild(container.previousElementSibling);
		}

		for (var i = 0; i < log_names.length; i++) {
			if (!logview.hasPlugin(log_names[i]))
				continue;

			var buttons = [
				E('button', {
					'class': 'cbi-button cbi-button-apply',
					'click': ui.createHandlerFn(this, 'handleRefresh', log_names[i]),
					'disabled': 'disabled'
				}, _('Refresh')),
				E('button', {
					'class': 'cbi-button cbi-button-apply',
					'click': ui.createHandlerFn(this, 'handleDownload', log_names[i], 'plain', 'txt'),
					'disabled': 'disabled'
				}, _('Download (TXT)')),
				E('button', {
					'class': 'cbi-button cbi-button-apply',
					'click': ui.createHandlerFn(this, 'handleDownload', log_names[i], 'csv', 'csv'),
					'disabled': 'disabled'
				}, _('Download (CSV)'))
			];

			var logviewTable = E('div', { 'class': 'logview-table' }, [
				E('p', {}, [
					E('em', { 'class': 'spinning' }, [ _('Loading data…') ])
				])
			]);

			logview.setTarget(log_names[i], logviewTable);

			container.appendChild(E('div', {
				'data-tab': log_names[i],
				'data-tab-title': logview.logTitle(log_names[i]),
				'cbi-tab-active': L.bind(this.handleTabActive, this)
			}, [
				E('div', { 'class': 'cbi-section logview-controls' }, [
					E('div', {}, [
						E('input', {
							'type': 'checkbox',
							'id': 'sorting-toggle-' + log_names[i],
							'name': 'sorting-toggle-' + log_names[i],
							'checked': 'checked',
							'disabled': 'disabled',
							'click': L.bind(this.handleSortingToggle, this, log_names[i])
						}),
						E('label', { 'for': 'sorting-toggle-' + log_names[i] },
							_('Display descending time (latest on top)'))
					]),
					E('div', {}, buttons)
				]),
				E('div', { 'class': 'cbi-section' }, [
					E('legend', {}, _('Log Entries')), logviewTable
				]),
			]));
		}

		ui.tabs.initTabGroup(container.childNodes);
	},

	render: function() {
		var logTabs = E('div', { 'data-name': 'logs' });

		var view = E([], [
			E('link', { 'rel': 'stylesheet', 'href': L.resource('logview/logview.css')}),
			E('h2', {}, [ _('Log View') ]),
			logTabs
		]);

		this.renderTabs(logTabs);
		return view;
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
