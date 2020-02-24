'use strict';

return L.Class.extend({
	title: _('Kernel Log'),
	order: 1,
	description: '',
	formats: {
		'json': {
			'name': 'JSON',
			'mime_type': 'application/json',
			'extension': 'json',
			'command': '/usr/libexec/luci-logview/logview-dmesg',
			'args': [ 'json' ]
		},
		'plain': {
			'name': 'TXT',
			'mime_type': 'text/plain',
			'extension': 'txt',
			'command': '/usr/libexec/luci-logview/logview-dmesg',
			'args': [ 'plain' ]
		},
		'csv': {
			'name': 'CSV',
			'mime_type': 'text/csv',
			'extension': 'csv',
			'command': '/usr/libexec/luci-logview/logview-dmesg',
			'args': [ 'csv' ]
		}
	},
	fields: [
		{ name: 'ktime', display: _('Time') },
		{ name: 'priority', display: _('Priority') },
		{ name: 'message', display: _('Message') }
	]
});
