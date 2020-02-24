'use strict';
'require ui';
'require fs';
'require uci';

var logviewPlugins = {};

var priorityDisplay = {
	"panic"   : "Panic",
	"emerg"   : "Emergency",
	"crit"    : "Critical",
	"alert"   : "Alert",
	"err"     : "Error",
	"error"   : "Error",
	"warn"    : "Warning",
	"warning" : "Warning",
	"notice"  : "Notice",
	"info"    : "Info",
	"none"    : "Info",
	"debug"   : "Debug",
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

function logviewTableCreate(e, fields) {
	while (e.firstChild)
		e.removeChild(e.firstChild);

	var tr = E('div', { 'class': 'tr table-titles' });

	fields.forEach(function(f) {
		tr.appendChild(E('div', { 'class': 'th top left' }, [ f.display ]));
	});

	var table = E('div', { 'class': 'table-wrapper' }, [
		E('div', { 'class': 'table' }, tr)
	]);

	e.appendChild(table);
	return table.lastElementChild;
}

function logviewTableAddRow(plugin, table, data, fields, extra_class) {
	var lv_p_class = data.hasOwnProperty('priority')
		? data.priority : 'none';

	var r = E('div', { 'class': 'tr lv-p-' + lv_p_class + ' ' + extra_class }, []);

	fields.forEach(function(field) {
		var cell_data;

		var key = field.name;

		if (!data.hasOwnProperty(key))
			return;

		if (key == 'timestamp') {
			var date = new Date(parseInt(data.timestamp) * 1000);

			var ts = '%02d.%02d.%04d %02d:%02d:%02d'.format(
				date.getDate(),
				date.getMonth() + 1,
				date.getFullYear(),
				date.getHours(),
				date.getMinutes(),
				date.getSeconds()
			);

			cell_data = E('nobr', {}, [ ts ]);
		}
		else if (key == "priority") {
			cell_data = priorityDisplay.hasOwnProperty(data[key])
				? priorityDisplay[data[key]] : data[key];
		}
		else {
			cell_data = data[key];
		}

		r.appendChild(E('div', { 'class': 'td top lf-' + key }, [ cell_data ]));
	});

	if (plugin.opts.sortDescending) /* desc */
		table.insertBefore(r, table.children[1]);
	else /* asc */
		table.appendChild(r);
}

function logviewTableUpdate(plugin, logData) {
	var logDataJSON;

	var tableContainer = E('div', {});
	var table = logviewTableCreate(tableContainer, plugin.fields);

	try {
		logDataJSON = JSON.parse(logData);
	} catch(e) {
		table.appendChild(E('div', { 'class': 'tr placeholder' }, [
			E('div', { 'class': 'td' }, [
				E('div', { 'class': 'alert-message error' }, [
					_('Failed to parse log data')
				])
			])
		]));

		L.dom.content(plugin.opts.target, tableContainer);
		plugin.opts.loaded = true;
		return;
	}

	var row = 0;

	logDataJSON.forEach(function(line) {
		logviewTableAddRow(plugin, table, line, plugin.fields, '');
		row++;
	});

	if (!row) {
		table.appendChild(E('div', { 'class': 'tr placeholder' }, [
			E('div', { 'class': 'td' }, _('Log is empty'))
		]));
	}

	L.dom.content(plugin.opts.target, tableContainer);
	plugin.opts.loaded = true;
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
					if (!plugin.order)
						plugin.order = 999;

					plugin.opts = {};
					plugin.opts.sortDescending = true;
					plugin.opts.loaded = false;

					logviewPlugins[name] = plugin;

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

	refresh: function(logName, force) {
		var plugin = logviewPlugins[logName];

		if (!plugin || !plugin.opts.target)
			return Promise.resolve(null);

		if (!force && plugin.opts.loaded)
			return Promise.resolve(null);

		L.dom.content(plugin.opts.target, [
			E('p', {}, [
				E('em', { 'class': 'spinning' }, [ _('Loading data…') ])
			])
		]);

		return fs.exec_direct(
			plugin.formats['json'].command,
			plugin.formats['json'].args
		).then(function(data) {
			logviewTableUpdate(plugin, data);
		}).catch(function(e) {
			L.ui.addNotification(null, E('p', e.message), 'error');
		});
	},

	download: function(logName, format) {
		var plugin = logviewPlugins[logName];

		if (!plugin || !plugin.formats[format])
			return null;

		return fs.exec_direct(
			plugin.formats[format].command,
			plugin.formats[format].args,
			'blob'
		).then(function(res) {
			var url = URL.createObjectURL(new Blob([res], {
				type: plugin.formats[format].mime_type
			}));

			var link = document.createElement('a');
			link.href = url;
			link.download = logName + '.' + plugin.formats[format].extension;
			link.click();
		}).catch(function(e) {
			L.ui.addNotification(null, E('p', e.message), 'error');
		});
	}
});
