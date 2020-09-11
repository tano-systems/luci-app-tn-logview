'use strict';
'require fs';
'require ui';
'require logview.logview as logview';

var keyTimeout = null;

const svgExpand =
	'<svg width="18" height="18" viewBox="0 0 438.54 438.54" ' +
	'xmlns="http://www.w3.org/2000/svg">' +
	'<path d="m407.42 159.03c3.62 3.616 7.898 5.428 12.847 5.428 2.282 0 ' +
	'4.668-0.476 7.139-1.429 7.426-3.235 11.136-8.853 11.136-16.846v-127.91c0-' +
	'4.949-1.807-9.231-5.428-12.847-3.61-3.617-7.898-5.424-12.847-5.424h-127.91c-' +
	'7.991 0-13.607 3.805-16.848 11.419-3.23 7.423-1.902 13.99 4 19.698l41.111 ' +
	'41.112-101.35 101.36-101.35-101.36 41.112-41.112c5.901-5.708 7.232-12.275 ' +
	'3.999-19.698-3.239-7.614-8.853-11.421-16.846-11.421h-127.91c-4.952 0-9.235 ' +
	'1.809-12.851 5.426-3.617 3.616-5.424 7.898-5.424 12.847v127.91c0 7.996 ' +
	'3.809 13.61 11.419 16.846 2.285 0.948 4.57 1.429 6.855 1.429 4.948 0 ' +
	'9.229-1.812 12.847-5.427l41.112-41.109 101.35 101.35-101.35 101.35-41.112-' +
	'41.113c-5.711-5.903-12.275-7.231-19.702-4.001-7.614 3.241-11.419 8.856-' +
	'11.419 16.854v127.91c0 4.948 1.807 9.229 5.424 12.847 3.619 3.614 7.902 ' +
	'5.421 12.851 5.421h127.91c7.996 0 13.61-3.806 16.846-11.416 3.234-7.427 ' +
	'1.903-13.99-3.999-19.705l-41.112-41.106 101.35-101.36 101.35 101.36-41.114 ' +
	'41.11c-5.899 5.708-7.228 12.279-3.997 19.698 3.237 7.617 8.856 11.423 ' +
	'16.851 11.423h127.91c4.948 0 9.232-1.813 12.847-5.428 3.613-3.613 ' +
	'5.42-7.898 5.42-12.847v-127.9c0-7.994-3.709-13.613-11.136-16.851-' +
	'7.802-3.23-14.462-1.903-19.985 4.004l-41.106 41.106-101.36-101.35 ' +
	'101.36-101.35 41.11 41.112z"/>' +
	'</svg>';

const svgCompress =
	'<svg width="18" height="18" viewBox="0 0 512 512" ' +
	'xmlns="http://www.w3.org/2000/svg">' +
	'<path d="M200 288H88c-21.4 0-32.1 25.8-17 41l32.9 31-99.2 99.3c-6.2 ' +
	'6.2-6.2 16.4 0 22.6l25.4 25.4c6.2 6.2 16.4 6.2 22.6 0L152 408l31.1 ' +
	'33c15.1 15.1 40.9 4.4 40.9-17V312c0-13.3-10.7-24-24-24zm112-64h112c21.4 0 ' +
	'32.1-25.9 17-41l-33-31 99.3-99.3c6.2-6.2 6.2-16.4 0-22.6L481.9 4.7c-6.2-' +
	'6.2-16.4-6.2-22.6 0L360 104l-31.1-33C313.8 55.9 288 66.6 288 88v112c0 ' +
	'13.3 10.7 24 24 24zm96 136l33-31.1c15.1-15.1 4.4-40.9-17-40.9H312c-13.3 ' +
	'0-24 10.7-24 24v112c0 21.4 25.9 32.1 41 17l31-32.9 99.3 99.3c6.2 6.2 16.4 ' +
	'6.2 22.6 0l25.4-25.4c6.2-6.2 6.2-16.4 0-22.6L408 360zM183 71.1L152 104 52.7 ' +
	'4.7c-6.2-6.2-16.4-6.2-22.6 0L4.7 30.1c-6.2 6.2-6.2 16.4 0 22.6L104 152l-33 ' +
	'31.1C55.9 198.2 66.6 224 88 224h112c13.3 0 24-10.7 24-24V88c0-21.3-25.9-' +
	'32-41-16.9z"/></svg>';

return L.view.extend({
	load: function() {
		return logview.load();
	},

	expandedView: false,
	logs: {},
	controls: {},

	handleDisplayErrors: function(e) {
		if (e.name == 'PermissionError') {
			if (e.message.trim() == 'Exec permission denied') {
				if (this.expandedView)
					this.handleExpandedViewToggle(null);

				L.notifySessionExpiry();
				return;
			}
		}

		L.ui.addNotification(null, E('p', e.message), 'error');
	},

	updateControls: function(log_name, loaded) {
		if (!this.controls.hasOwnProperty(log_name))
			return;

		var controls = this.controls[log_name];

		controls.querySelectorAll('.cbi-button, input[type="checkbox"]').forEach(function(e) {
			e.setAttribute('disabled', 'disabled');
		});

		if (loaded) {
			controls.querySelectorAll('.cbi-button, input[type="checkbox"]').forEach(function(e) {
				e.removeAttribute('disabled');
			});
		} else {
			controls.querySelector('.logview-btn-refresh')
				.removeAttribute('disabled');
		};
	},

	handleTabActive: function(ev) {
		var log = this.logs[ev.detail.tab];
		var target = ev.target;

		return logview.display(log.name, log.filter, false).then(L.bind(function(loaded) {
			this.updateControls(log.name, loaded);
			this.update(log);
		}, this)).catch(L.bind(function(e) {
			this.handleDisplayErrors(e);
		}, this));
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
		if (log.priorities_filter) {
			/* Add spinner to priorities filter */
			var node = document.querySelector('div[data-tab="' + log.name + '"] div.logview-priorities > div');
			L.dom.content(node, E('em', { 'class': 'spinning' }, _('Loading data…')));
		}

		/* Add spinner to columns filter */
		var node = document.querySelector('div[data-tab="' + log.name + '"] div.logview-columns > div');
		L.dom.content(node, E('em', { 'class': 'spinning' }, _('Loading data…')));

		return logview.display(log.name, log.filter, true).then(L.bind(function(loaded) {
			this.updateControls(log.name, loaded);
			this.update(log);
		}, this)).catch(L.bind(function(e) {
			this.handleDisplayErrors(e);
		}, this));
	},

	handleFilterKeyUp: function(log, ev) {
		if (keyTimeout !== null)
			window.clearTimeout(keyTimeout);

		keyTimeout = window.setTimeout(L.bind(function() {
			log.filter = ev.target.value;
			return logview.display(log.name, log.filter, false).then(L.bind(function() {
				this.update(log);
			}, this)).catch(L.bind(function(e) {
			this.handleDisplayErrors(e);
		}, this));
		}, this), 250);
	},

	handleFilterReset: function(log, ev) {
		log.filter = '';
		var filterEl = document.querySelector('div[data-tab="' + log.name + '"] input[name="filter"]');
		filterEl.value = log.filter;
		logview.display(log.name, log.filter, false).then(L.bind(function() {
			this.update(log);
		}, this)).catch(L.bind(function(e) {
			this.handleDisplayErrors(e);
		}, this));
	},

	handlePriorityToggle: function(log, priority, ev) {
		if (!log.priorities_filter)
			return;

		if (ev.target.getAttribute('disabled') == 'disabled')
			return;

		var checked = (ev.target.getAttribute('data-hide') === 'true');

		if (checked) {
			log.priorities_visible++;
			ev.target.classList.add('cb-active');
			ev.target.setAttribute('data-hide', false);
			logview.setPriorityVisible(log.name, priority, checked);
		} else {
			/* Uncheck prioritiy */
			if (log.priorities_visible == 1) {
				/*
				 * Unchecked last one priority
				 * Enable all priorities
				 */
				log.priorities_visible = log.priorities_total;

				Object.keys(logview.logPriorities(log.name)).forEach(function(p) {
					logview.setPriorityVisible(log.name, p, true);
				});

				ev.target.parentNode.querySelectorAll('div:not(.cb-active)').forEach(function(e) {
					e.classList.add('cb-active');
					e.setAttribute('data-hide', false);
				});
			} else if (log.priorities_visible == log.priorities_total) {
				/*
				 * Unchecked priority when all priorities is checked
				 * Enable only clicked priority
				 */
				log.priorities_visible = 1;

				ev.target.parentNode.querySelectorAll('.cb-active').forEach(function(e) {
					if (e !== ev.target) {
						e.classList.remove('cb-active');
						e.setAttribute('data-hide', true);
					}
				});

				Object.keys(logview.logPriorities(log.name)).forEach(function(p) {
					logview.setPriorityVisible(log.name, p, (p == priority) ? true : false);
				});

			} else {
				log.priorities_visible--;
				ev.target.classList.remove('cb-active');
				ev.target.setAttribute('data-hide', true);
				logview.setPriorityVisible(log.name, priority, checked);
			}
		}

		logview.display(log.name, log.filter, false).then(L.bind(function() {
			this.update(log);
		}, this)).catch(L.bind(function(e) {
			this.handleDisplayErrors(e);
		}, this));
	},

	handleColumnToggle: function(log, column, ev) {
		if (ev.target.getAttribute('disabled') == 'disabled')
			return;

		var checked = (ev.target.getAttribute('data-hide') === 'true')

		if (checked)
			ev.target.classList.add('cb-active');
		else
			ev.target.classList.remove('cb-active');

		ev.target.setAttribute('data-hide', !checked);
		logview.setColumnVisible(log.name, column.index, checked);

		if (checked) {
			log.columns_visible++;
			if (log.columns_visible == 2) {
				var node = ev.target.parentNode.querySelector('div[disabled="disabled"]');
				node.removeAttribute('disabled');
			}
		} else {
			log.columns_visible--;
			if (log.columns_visible == 1) {
				var node = ev.target.parentNode.querySelector('div.cb-active');
				node.setAttribute('disabled', 'disabled');
			}
		}

		logview.display(log.name, log.filter, false).then(L.bind(function() {
			this.update(log);
		}, this)).catch(L.bind(function(e) {
			this.handleDisplayErrors(e);
		}, this));
	},

	handleExpandedViewToggle: function() {
		var view = document.querySelector('div#maincontent');
		var footer = document.querySelector('.footer');
		var button = view.querySelector('div.logview > h2 > a');

		if (this.expandedView) {
			view.style.width = null;
			view.style.height = null;
			view.style.position = null;
			view.style.zIndex = null;
			view.style.left = null;
			view.style.top = null;
			view.style.background = null;
			view.style.padding = null;
			view.style.margin = null;
			view.style.overflowY = null;
			button.innerHTML = svgExpand;

			if (footer)
				footer.style.display = null;
		} else {
			view.style.width = '100%';
			view.style.height = '100%';
			view.style.position = 'fixed';
			view.style.zIndex = '999999999';
			view.style.left = '0';
			view.style.top = '0';
			view.style.background = '#ffffff';
			view.style.padding = '0px 16px 0px 16px';
			view.style.margin = '0';
			view.style.overflowY = 'scroll';
			button.innerHTML = svgCompress;

			if (footer)
				footer.style.display = 'none';
		}

		this.expandedView = !this.expandedView;
		this.handleTableHeight();
	},

	update: function(log) {
		this.updateColumns(log);
		if (log.priorities_filter)
			this.updatePriorities(log);
		this.handleTableHeight();
	},

	updateColumns: function(log) {
		var columns = logview.logColumns(log.name);
		log.columns_visible = 0;

		var logviewColumns = [];
		columns.forEach(L.bind(function(column) {
			if (column.empty)
				return;

			if (column.show)
				log.columns_visible++;

			logviewColumns.push(
				E('div', {
					'class': column.show ? 'cb-active' : '',
					'data-hide': column.show ? false : true,
					'click': ui.createHandlerFn(this, 'handleColumnToggle', log, column)
				}, [ column.display ])
			);
		}, this));

		/* div[data-tab="..." .logview-priorities > div > ... */
		var node = document.querySelector('div[data-tab="' + log.name + '"] div.logview-columns > div');
		L.dom.content(node, logviewColumns);
	},

	updatePriorities: function(log) {
		if (!log.priorities_filter)
			return;

		var priorities = logview.logPriorities(log.name);
		var logviewPriorities = [];

		log.priorities_visible = 0;
		log.priorities_total = 0;

		Object.keys(priorities).forEach(L.bind(function(p) {
			log.priorities_total++;
			if (!priorities[p].hide)
				log.priorities_visible++;

			logviewPriorities.push(
				E('div', {
					'class': 'lv-p-' + p + (priorities[p].hide ? '' : ' cb-active'),
					'data-hide': priorities[p].hide ? true : false,
					'data-count': priorities[p].count,
					'click': ui.createHandlerFn(this, 'handlePriorityToggle', log, p)
				}, [ priorities[p].display + ' (%d)'.format(priorities[p].count) ])
			);
		}, this));

		/* div[data-tab="..." .logview-priorities > div > ... */
		var node = document.querySelector('div[data-tab="' + log.name + '"] div.logview-priorities > div');
		L.dom.content(node, logviewPriorities);
	},

	renderTabs: function(container) {
		var log_names = logview.logNames();

		L.dom.content(container, null);

		if (container.hasAttribute('data-initialized')) {
			container.removeAttribute('data-initialized');
			container.parentNode.removeChild(container.previousElementSibling);
		}

		if (log_names.length == 0) {
			container.appendChild(
				E('div', { 'class': 'alert-message warning' }, [
					_('No logs available for display. Probably you do not have enough permissions to view the logs.')
				])
			);

			return;
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

				downloads.choices[dl.name] = '%s (%s)'.format(
					_('Download', 'Download data (action)'), dl.display);
				downloads.options.classes[dl.name] =
					'cbi-button cbi-button-action logview-btn-download';
			});

			var downloadsButton = new ui.ComboButton(
				downloads.value,
				downloads.choices,
				downloads.options
			).render();

			downloadsButton.setAttribute('disabled', 'disabled');

			var buttons = [
				E('button', {
					'class': 'cbi-button cbi-button-action logview-btn-refresh',
					'click': ui.createHandlerFn(this, 'handleRefresh', log),
					'disabled': 'disabled',
					'title': _('Reload log contents')
				}, _('Refresh')),
				downloadsButton
			];

			var logviewTable = E('div', { 'class': 'logview-table' }, [
				E('p', {}, [
					E('em', { 'class': 'spinning' }, [ _('Loading data…') ])
				])
			]);

			log.target = logviewTable;
			log.priorities_filter = false;
			log.filter = '';

			logview.setTarget(log.name, log.target);

			logview.logColumns(log.name).forEach(function(column) {
				if (column.name == 'priority')
					log.priorities_filter = true;
			});

			if (log.priorities_filter) {
				log.priorities_visible = 0;
				log.priorities_total = 0;
			}

			this.controls[log.name] = E('div', { 'class': 'cbi-section logview-controls' }, [
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
			]);

			container.appendChild(E('div', {
				'data-tab': log_names[i],
				'data-tab-title': logview.logTitle(log.name),
				'cbi-tab-active': L.bind(this.handleTabActive, this)
			}, [
				this.controls[log.name],
				E('div', { 'class': 'logview-cbfilters-container' }, [
					log.priorities_filter ? E('div', { 'class': 'cbi-section logview-cbfilter logview-priorities' }, [
						E('label', {}, _('Display priorities') + ':'),
						E('div', {}, E('em', { 'class': 'spinning' }, _('Loading data…')))
					]) : E('div', {}),
					E('div', { 'class': 'cbi-section logview-cbfilter logview-columns' }, [
						E('label', {}, _('Display columns') + ':'),
						E('div', {}, E('em', { 'class': 'spinning' }, _('Loading data…')))
					])
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

	handleTableHeight: function() {
		var mc     = document.querySelector('.main-content');
		var view   = document.querySelector('div#maincontent');
		var tables = view.querySelectorAll('.logview-table .table-wrapper');

		var windowHeight = window.innerHeight;
		var footerHeight = 0;

		if (!this.expandedView) {
			var footer = document.querySelector('div.footer');
			if (footer) {
				var footerStyle = footer.currentStyle || window.getComputedStyle(footer);
				footerHeight = parseInt(footerStyle.height, 10) +
				               parseInt(footerStyle.marginTop, 10) +
				               parseInt(footerStyle.marginBottom, 10);
			}
		}

		var mcStyle = mc.currentStyle || window.getComputedStyle(mc);

		tables.forEach(function(table) {
			var tableRect = table.getBoundingClientRect();
			var padding = parseInt(mcStyle.paddingBottom, 10);

			if (!footerHeight && !padding)
				padding = 16;

			table.style.height = (windowHeight - tableRect.top - padding - footerHeight) + 'px';
		});
	},

	render: function() {
		var logTabs = E('div', { 'data-name': 'logs' });

		var view = E([], [
			E('div', { 'class': 'logview' }, [
				E('link', { 'rel': 'stylesheet', 'href': L.resource('logview/logview.css')}),
				E('h2', {}, [
					_('Logs View'),
					E('a', {
						'title': _('Toggle expanded view mode'),
						'click': L.bind(this.handleExpandedViewToggle, this),
					}, svgExpand)
				]),
				logTabs
			])
		]);

		window.addEventListener('resize', this.handleTableHeight);

		this.renderTabs(logTabs);
		return view;
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
