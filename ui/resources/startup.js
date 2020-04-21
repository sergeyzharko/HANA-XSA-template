/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */

function localShellStartup(name) {
	sap.ui.getCore().attachInit(function() {
		const ComponentContainer = new sap.ui.core.ComponentContainer({
			height: '100%',
		});
		const username = 'Test User';
		// create a shell
		new sap.ui.unified.Shell({
			id: 'myShell',
			icon: '/images/sap_18.png',
			headEndItems: new sap.ui.unified.ShellHeadItem({
				icon: 'sap-icon://log',
				tooltip: 'Logoff',
				press: function() {
					window.location.href = '/my/logout';
				},
			}),
			user: new sap.ui.unified.ShellHeadUserItem({
				image: 'sap-icon://person-placeholder',
				username: username,
			}),
			content: ComponentContainer,
		}).placeAt('content');

		sap.ui.component({
			id: 'comp',
			name: name,
			manifestFirst: true,
			async: true,
		}).then(function(oComponent) {
			ComponentContainer.setComponent(oComponent);
		});
	});
}