'use strict';

return L.Class.extend({
	title: _('System Log'),
	description: '',
	order: 2,
	acl: 'luci-app-tn-logview-syslog',
	json_data: {
		add_to_downloads: true,
		action: {
			command: '/usr/libexec/luci-logview/logview-syslog',
			command_args: [ 'json' ]
		}
	},
	downloads: {
		'raw': {
			display: 'RAW',
			mime_type: 'text/plain',
			extension: 'txt',
			action: {
				command: '/usr/libexec/luci-logview/logview-syslog',
				command_args: [ 'plain' ]
			}
		},
		'csv': {
			display: 'CSV',
			mime_type: 'text/csv',
			extension: 'csv',
			action: {
				command: '/usr/libexec/luci-logview/logview-syslog',
				command_args: [ 'csv' ]
			}
		}
	},
	columns: [
		{ name: 'timestamp', display: _('Timestamp') },
		{ name: 'tag', display: _('Tag') },
		{ name: 'priority', display: _('Priority') },
		{ name: 'facility', display: _('Facility') },
		{ name: 'message', display: _('Message') }
	]
});
