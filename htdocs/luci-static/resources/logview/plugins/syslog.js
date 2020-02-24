'use strict';

return L.Class.extend({
	title: _('System Log'),
	order: 2,
	description: '',
	formats: {
		'json': {
			'name': 'JSON',
			'mime_type': 'application/json',
			'extension': 'json',
			'command': '/usr/libexec/luci-logview/logview-syslog',
			'args': [ 'json' ]
		},
		'plain': {
			'name': 'TXT',
			'mime_type': 'text/plain',
			'extension': 'txt',
			'command': '/usr/libexec/luci-logview/logview-syslog',
			'args': [ 'plain' ]
		},
		'csv': {
			'name': 'CSV',
			'mime_type': 'text/csv',
			'extension': 'csv',
			'command': '/usr/libexec/luci-logview/logview-syslog',
			'args': [ 'csv' ]
		}
	},
	fields: [
		{ name: 'timestamp', display: _('Timestamp') },
		{ name: 'tag', display: _('Tag') },
		{ name: 'priority', display: _('Priority') },
		{ name: 'facility', display: _('Facility') },
		{ name: 'message', display: _('Message') }
	]
});
