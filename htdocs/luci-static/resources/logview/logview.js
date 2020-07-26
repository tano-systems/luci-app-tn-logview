'use strict';
'require ui';
'require fs';
'require uci';
'require rpc';

var callSessionAccess = rpc.declare({
	object: 'session',
	method: 'access',
	params: [ 'scope', 'object', 'function' ],
	expect: { 'access': false }
});

var logviewPlugins = {};

var priorityDisplay = {
	'panic'   : 'Panic',
	'emerg'   : 'Emergency',
	'crit'    : 'Critical',
	'alert'   : 'Alert',
	'err'     : 'Error',
	'error'   : 'Error',
	'warn'    : 'Warning',
	'warning' : 'Warning',
	'notice'  : 'Notice',
	'info'    : 'Info',
	'none'    : 'None',
	'debug'   : 'Debug',
};

function toggleTableSorting(plugin) {
	if (!plugin.opts.target)
		return;

	var t = plugin.opts.target.firstChild.firstChild.firstChild;
	var len = t.children.length;

	for (i = 1; i < len / 2; i++)
	{
		var r = t.children[i];
		var old = t.replaceChild(t.children[len - i], r);
		t.insertBefore(old, t.children[len - i - 1].nextSibling);
	}
}

function logviewTableCreate(e, columns) {
	while (e.firstChild)
		e.removeChild(e.firstChild);

	var tr = E('div', { 'class': 'tr table-titles' });

	columns.forEach(function(column) {
		if (!column.show || column.empty)
			return;

		tr.appendChild(E('div', { 'class': 'th top lf-' + column.name }, [
			column.display
		]));
	});

	var table = E('div', {
		'class': 'table-wrapper',
		'style': 'overflow-x: auto; ' +
		         'overflow-y: auto; ' +
		         'min-height: 400px;'
	}, [
		E('div', { 'class': 'table' }, tr)
	]);

	e.appendChild(table);
	return table.lastElementChild;
}

function logviewTableAddRow(plugin, table, data, columns, filterPattern) {
	var priority = 'none';

	var r = E('div', { 'class': 'tr' }, []);
	var filterMatch = true;

	if (typeof(filterPattern) === 'string' && filterPattern.length > 0) {
		filterPattern = new RegExp(filterPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig');
		filterMatch = false;
	}

	for (var i = 0; i < columns.length; i++) {
		var cell_data = '';
		var name = columns[i].name
		var key = columns[i].field || name;

		if ((name == 'priority') && data.hasOwnProperty(key)) {
			priority = columns[i].modfunc(data[key]).trim();
		}

		if (!columns[i].show || columns[i].empty)
			continue;

		if (data.hasOwnProperty(key)) {
			if (name == 'timestamp') {
				var date = new Date(parseInt(columns[i].modfunc(data.timestamp)) * 1000);

				var ts = '%02d.%02d.%04d %02d:%02d:%02d'.format(
					date.getDate(),
					date.getMonth() + 1,
					date.getFullYear(),
					date.getHours(),
					date.getMinutes(),
					date.getSeconds()
				);

				cell_data = ts;
			}
			else if (name == 'priority') {
				cell_data = priorityDisplay.hasOwnProperty(priority)
					? priorityDisplay[priority] : priority;
			}
			else {
				cell_data = columns[i].modfunc(data[key]);
			}

			if (filterPattern instanceof RegExp) {
				if (cell_data.match(filterPattern)) {
					var node = document.createElement('span');
					node.innerHTML = cell_data.replace(filterPattern, '<ins>$&</ins>');
					cell_data = node;
					filterMatch = true;
				}
			}
		}

		r.appendChild(E('div', { 'class': 'td top lf-' + name }, [
			columns[i].nobr
				? E('nobr', {}, cell_data)
				: cell_data
		]));
	}

	r.classList.add('lv-p-' + priority);

	if (!filterMatch)
		return 0;

	/* Checking for priority visibility and update priorities count */
	if (priority !== 'none') { /* line.hasOwnProperty('priority') */
		if (plugin.priorities.hasOwnProperty(priority))
			plugin.priorities[priority].count++;
		else {
			plugin.priorities[priority] = {
				'count': 1,
				'display': priorityDisplay.hasOwnProperty(priority)
					? priorityDisplay[priority]
					: priority
			};
		}

		if (plugin.priorities[priority].hide)
			return 0;
	}

	if (plugin.opts.sortDescending) /* desc */
		table.insertBefore(r, table.children[1]);
	else /* asc */
		table.appendChild(r);

	return 1;
}

function logviewTableUpdate(plugin, logData, filterPattern) {
	var rows_filtered = 0;
	var row = 1;
	var rows_total = Array.isArray(logData) ? logData.length : 0;

	/* Clear all priorities count */
	Object.keys(plugin.priorities).forEach(function(priority) {
		plugin.priorities[priority].count = 0;
	});

	if (rows_total > 0) {
		/* column with index 0 is '№' (displayed always) */
		for (let i = 1; i < plugin.columns.length; i++) {
			plugin.columns[i].empty = true;
		}

		logData.forEach(function(line) {
			for (let i = 1; i < plugin.columns.length; i++) {
				if (!plugin.columns[i].empty)
					continue;

				var key = plugin.columns[i].field || plugin.columns[i].name;
				if (line.hasOwnProperty(key) && line[key] !== '')
					plugin.columns[i].empty = false;
			}
		});
	}

	var tableContainer = E('div', {});
	var table = logviewTableCreate(tableContainer, plugin.columns);

	if (rows_total > 0) {
		logData.forEach(function(line) {
			line.number = (row++).toString();
			rows_filtered += logviewTableAddRow(
				plugin, table, line, plugin.columns, filterPattern);
		});
	}

	var info = document.querySelector('#logview-count-info-' + plugin.name);

	if (plugin.opts.load_error) {
		table.appendChild(E('div', { 'class': 'tr placeholder' }, [
			E('div', { 'class': 'td left' }, [
				E('p', { 'class': 'alert-message error' }, [
					_('Failed to load log (error code %d)').format(plugin.opts.load_error.code),
					plugin.opts.load_error.stdout ? E('pre', {}, plugin.opts.load_error.stdout) : '',
					plugin.opts.load_error.stderr ? E('pre', {}, plugin.opts.load_error.stderr) : ''
				])
			])
		]));
	}
	else {
		if (!rows_total) {
			table.appendChild(E('div', { 'class': 'tr placeholder' }, [
				E('div', { 'class': 'td' }, _('Log is empty'))
			]));
		} else if (!rows_filtered && filterPattern) {
			table.appendChild(E('div', { 'class': 'tr placeholder' }, [
				E('div', { 'class': 'td' }, _('No entries matching \"%h\"').format(filterPattern))
			]));
		}
	}

	if (rows_total && (rows_filtered != rows_total)) {
		info.innerHTML = _('filtered %d from %d').format(rows_filtered, rows_total);
	} else {
		info.innerHTML = '%d'.format(rows_filtered);
	}

	L.dom.content(plugin.opts.target, tableContainer);
	plugin.opts.loaded = true;
	plugin.opts.data = logData;
}

function getActionTask(action) {
	var task = null;

	if (!action)
		return null;

	if (action.hasOwnProperty('command') && action.command) {
		task = fs.exec_direct(action.command, action.command_args || []);
	} else if (action.hasOwnProperty('file') && action.file) {
		task = fs.read_direct(action.file, type);
	}

	return task;
}

return L.Class.extend({
	load: function() {
		return Promise.all([
			L.resolveDefault(fs.list('/www' + L.resource('logview/plugins')), [])
		]).then(L.bind(function(data) {
			var plugins = data[0];

			logviewPlugins = {};
			var tasks = [];

			for (var i = 0; i < plugins.length; i++) {
				var m = plugins[i].name.match(/^(.+)\.js$/);

				if (plugins[i].type != 'file' || m == null)
					continue;

				tasks.push(L.require('logview.plugins.' + m[1]).then(L.bind(function(name, plugin) {
					if (!plugin.acl)
						return;

					return callSessionAccess('access-group', plugin.acl, 'read').then(L.bind(function(name, plugin, access) {
						if (!access)
							return;

						if (!plugin.order)
							plugin.order = 999;

						plugin.opts = {};
						plugin.name = name;
						plugin.opts.sortDescending = true;
						plugin.opts.loaded = false;
						plugin.opts.data = null;
						plugin.opts.load_error = null;

						plugin.priorities = {};

						plugin.columns.unshift({
							name: 'number',
							display: '№'
						});

						plugin.columns.forEach(function(column, index) {
							column.index = index;
							if (!column.hasOwnProperty('show'))
								column.show = true;

							if (!column.modfunc)
								column.modfunc = function(v) { return v; };

							column.empty = false;
						});

						logviewPlugins[name] = plugin;
					}, this, name, plugin))
				}, this, m[1])));
			}

			return Promise.all(tasks);
		}, this));
	},

	logTitle: function(logName) {
		var plugin = logviewPlugins[logName];
		return (plugin ? plugin.title : null) || logName;
	},

	logDescription: function(logName) {
		var plugin = logviewPlugins[logName];
		return (plugin ? plugin.description : null) || logName;
	},

	hasPlugin: function(logName) {
		return (logviewPlugins[logName] != null);
	},

	setTarget: function(logName, target) {
		if (logviewPlugins[logName])
			logviewPlugins[logName].opts.target = target;
	},

	setSorting: function(logName, descending) {
		if (!logviewPlugins[logName])
			return;

		if (logviewPlugins[logName].opts.sortDescending != descending) {
			logviewPlugins[logName].opts.sortDescending = descending;
			toggleTableSorting(logviewPlugins[logName]);
		}
	},

	logNames: function() {
		return Object.keys(logviewPlugins || {}).sort(function(a, b) {
			return logviewPlugins[a].order - logviewPlugins[b].order;
		});
	},

	logColumns: function(logName) {
		if (!logviewPlugins[logName])
			return [];

		return logviewPlugins[logName].columns;
	},

	setColumnVisible: function(logName, columnIndex, visible) {
		if (!logviewPlugins[logName])
			return;

		var plugin = logviewPlugins[logName];
		if (columnIndex >= plugin.columns.length)
			return;

		plugin.columns[columnIndex].show = visible;
	},

	logPriorities: function(logName) {
		if (!logviewPlugins[logName])
			return {};

		return logviewPlugins[logName].priorities;
	},

	setPriorityVisible: function(logName, priority, visible) {
		if (!logviewPlugins[logName])
			return;

		var plugin = logviewPlugins[logName];
		if (plugin.priorities.hasOwnProperty(priority))
			plugin.priorities[priority].hide = !visible;
	},

	logDownloads: function(logName) {
		if (!logviewPlugins[logName])
			return [];

		var plugin = logviewPlugins[logName];

		var downloads = [];

		Object.keys(plugin.downloads).forEach(function(dl, index) {
			downloads.push({
				name: dl,
				display: plugin.downloads[dl].display
			});
		});

		if (plugin.json_data.add_to_downloads) {
			downloads.push({ name: 'json', display: 'JSON' });
		}

		return downloads;
	},

	display: function(logName, filterPattern, forceReload) {
		var plugin = logviewPlugins[logName];

		if (!plugin || !plugin.opts.target)
			return Promise.resolve(false);

		if (!forceReload && plugin.opts.loaded) {
			logviewTableUpdate(plugin, plugin.opts.data, filterPattern);
			return Promise.resolve(plugin.opts.load_error ? false : true);
		}

		L.dom.content(plugin.opts.target, [
			E('p', {}, [
				E('em', { 'class': 'spinning' }, [ _('Loading data…') ])
			])
		]);

		return Promise.resolve(getActionTask(plugin.json_data.action)).then(function(data) {
			var json;

			if (data) {
				try {
					var json = JSON.parse(data);
					plugin.opts.load_error = null;
				}
				catch(e) {
					plugin.opts.load_error = {
						code: 0,
						stderr: _('Failed to parse JSON')
					};

					json = [];
				};
			}
			else {
				json = [];
				plugin.opts.load_error = {
					code: -1,
					stdout: '',
					stderr: _('No data')
				};
			}

			logviewTableUpdate(plugin, json, filterPattern);
			return Promise.resolve(plugin.opts.load_error ? false : true);
		});
	},

	download: function(logName, downloadName) {
		var plugin = logviewPlugins[logName];
		var download = null;

		if (!plugin)
			return null
			
		if (!plugin.downloads.hasOwnProperty(downloadName))
		{
			if ((downloadName === 'json') && plugin.json_data.add_to_downloads) {
				download = {
					action: plugin.json_data.action,
					mime_type: 'application/json',
					extension: 'json'
				};
			}
			else
				return null;
		}
		else
			download = plugin.downloads[downloadName];

		return Promise.resolve(getActionTask(download.action)).then(function(res) {
			var url = URL.createObjectURL(new Blob([res], {
				type: download.mime_type
			}));

			var link = document.createElement('a');
			link.href = url;
			link.download = logName + '.' + download.extension;
			link.click();
		}).catch(function(e) {
			L.ui.addNotification(null, E('p', e.message), 'error');
		});
	}
});
