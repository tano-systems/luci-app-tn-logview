'use strict';
'require fs';
'require ui';
'require logview.logview as logview';

var keyTimeout = null;

return L.view.extend({
	load: function() {
		this.logs = {};
		return logview.load();
	},

	handleTabActive: function(ev) {
		var log = this.logs[ev.detail.tab];
		var target = ev.target;

		return logview.display(log.name, log.filter, false).then(function() {
			target.querySelectorAll('.cbi-button, input[type="checkbox"]').forEach(function(e) {
				e.removeAttribute('disabled');
			});
		});
	},

	handleDownload: function(log, ev, dlname) {
		return logview.download(log.name, dlname);
	},

	handleSortingToggle: function(log, ev) {
		var checked = ev.target.checked;

		ev.target.setAttribute('disabled', true);
		logview.setSorting(log.name, checked);
		ev.target.removeAttribute('disabled');
	},

	handleRefresh: function(log, ev) {
		return logview.display(log.name, log.filter, true);
	},

	handleFilterKeyUp: function(log, ev) {
		if (keyTimeout !== null)
			window.clearTimeout(keyTimeout);

		keyTimeout = window.setTimeout(function() {
			log.filter = ev.target.value;
			return logview.display(log.name, log.filter, false);
		}, 250);
	},

	handleFilterReset: function(log, ev) {
		log.filter = '';
		logview.display(log.name, log.filter, false);
	},

	handleColumnToggle: function(log, column/*name*/, ev) {
		var checked = ev.target.checked;

		if (checked)
			ev.target.parentNode.classList.add('column-active');
		else
			ev.target.parentNode.classList.remove('column-active');

		if (checked) {
			logview.setColumnVisible(log.name, column.index, true);
			log.columns_visible++;

			if (log.columns_visible == 2) {
				var checkbox = ev.target.parentNode.parentNode.querySelector('input[disabled="disabled"]');
				checkbox.removeAttribute('disabled');
			}
		} else {
			logview.setColumnVisible(log.name, column.index, false);
			log.columns_visible--;

			if (log.columns_visible == 1) {
				var checkbox = ev.target.parentNode.parentNode.querySelector('input:checked');
				checkbox.setAttribute('disabled', 'disabled');
			}
		}

		logview.display(log.name, log.filter, false);
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

			this.logs[log_names[i]] = { name: log_names[i] };
			var log = this.logs[log_names[i]];

			var downloads = {
				value: null,
				choices: {},
				options: {
					click: ui.createHandlerFn(this, 'handleDownload', log),
					classes: {}
				}
			};

			logview.logDownloads(log.name).forEach(function(dl) {
				if (!downloads.value)
					downloads.value = dl.name;

				downloads.choices[dl.name] = '%s (%s)'.format(_('Download'), dl.display);
				downloads.options.classes[dl.name] = 'cbi-button cbi-button-action';
			});

			var downloadsButton = new ui.ComboButton(
				downloads.value,
				downloads.choices,
				downloads.options
			).render();

			downloadsButton.setAttribute('disabled', 'disabled');

			var buttons = [
				E('button', {
					'class': 'cbi-button cbi-button-action',
					'click': ui.createHandlerFn(this, 'handleRefresh', log),
					'disabled': 'disabled'
				}, _('Refresh')),
				downloadsButton
			];

			var logviewTable = E('div', { 'class': 'logview-table' }, [
				E('p', {}, [
					E('em', { 'class': 'spinning' }, [ _('Loading data…') ])
				])
			]);

			log.target = logviewTable;
			log.columns = logview.logColumns(log.name);
			log.columns_visible = 0;
			log.filter = '';

			logview.setTarget(log.name, log.target);

			var logviewColumns = [];
			log.columns.forEach(L.bind(function(column) {
				if (column.show)
					log.columns_visible++;

				var id = 'column-toggle-' + log.name + column.name;
				logviewColumns.push(
					E('div', { 'class': column.show ? 'column-active' : '' }, [
						E('input', {
							'id': id,
							'type': 'checkbox',
							'checked': column.show ? 'checked' : null,
							'click': ui.createHandlerFn(this, 'handleColumnToggle', log, column)
						}),
						E('label', { 'for': id }, column.display)
					])
				);
			}, this));

			container.appendChild(E('div', {
				'data-tab': log_names[i],
				'data-tab-title': logview.logTitle(log.name),
				'cbi-tab-active': L.bind(this.handleTabActive, this)
			}, [
				E('div', { 'class': 'cbi-section logview-controls' }, [
					E('div', {}, [
						E('input', {
							'type': 'checkbox',
							'id': 'sorting-toggle-' + log.name,
							'name': 'sorting-toggle-' + log.name,
							'checked': 'checked',
							'disabled': 'disabled',
							'click': L.bind(this.handleSortingToggle, this, log)
						}),
						E('label', { 'for': 'sorting-toggle-' + log.name },
							_('Display descending time (latest on top)'))
					]),
					E('div', {}, buttons)
				]),
				E('div', { 'class': 'cbi-section logview-columns' }, [
					E('label', {}, _('Display columns') + ':'),
					E('div', {}, logviewColumns)
				]),
				E('div', { 'class': 'cbi-section logview-filter' }, [
					E('label', {}, _('Entries filter') + ':'),
					E('input', {
						'type': 'text',
						'name': 'filter',
						'placeholder': _('Type to filter…'),
						'value': '',
						'keyup': L.bind(this.handleFilterKeyUp, this, log)
					}),
					E('button', {
						'class': 'cbi-button cbi-button-action',
						'click': L.bind(this.handleFilterReset, this, log)
					}, [ _('Clear') ])
				]),
				E('div', { 'class': 'cbi-section' }, [
					E('legend', {}, [
						_('Log Entries'),
						' (',
						E('span', { 'id': 'logview-count-info-' + log.name }, '?'),
						')'
					]),
					logviewTable
				]),
			]));
		}

		ui.tabs.initTabGroup(container.childNodes);
	},

	render: function() {
		var logTabs = E('div', { 'data-name': 'logs' });

		var view = E([], [
			E('link', { 'rel': 'stylesheet', 'href': L.resource('logview/logview.css')}),
			E('h2', {}, [ _('Logs View') ]),
			logTabs
		]);

		this.renderTabs(logTabs);
		return view;
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
