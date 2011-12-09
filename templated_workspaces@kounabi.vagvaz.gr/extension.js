const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const GdkPixbuf = imports.gi.GdkPixbuf;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Meta = imports.gi.Meta;
const Clutter = imports.gi.Clutter;
const St = imports.gi.St;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Panel = imports.ui.panel;
const Tweener = imports.ui.tweener;
const Main = imports.ui.main;

function WorkspaceIndicator() {
	this._init.apply(this, arguments);
}


let _bookmarksSection;
let _customWorkspaces;
let _newEntry;

function NewWorkspace() {
	this._init.apply(this, arguments);
}

function TWorkspace(){
	this._init.apply(this,arguments);
}

TWorkspace.prototype ={
		__proto__: PopupMenu.PopupBaseMenuItem.prototype,
		
		_init: function(itemParams){
			global.log('Templated Workspace created');
			this._wname = '';
			this._enabled = false;
			this._active = false;
			
		}
};


NewWorkspace.prototype = {
				__proto__: PopupMenu.PopupBaseMenuItem.prototype,

				_init: function(itemParams) {
							PopupMenu.PopupBaseMenuItem.prototype._init.call(this, {reactive: false});

							let box = new St.BoxLayout({style_class: 'hamster-box'});
							box.set_vertical(true);
							
							let label = new St.Label({ style_class: 'helloworld-label'});
							label.set_text("Save Current Workspace");
							box.add(label);
 
   						this.text = new St.Entry({ name: 'searchEntry',
                               					hint_text: _("Type name of workspace..."),
                               					track_hover: false,
                              	 				can_focus: true 
                               				});

							this.text.clutter_text.connect('activate', Lang.bind(this, this._onEntryActivated));
							box.add(this.text);
								
							this.addActor(box);
				},


				_onEntryActivated: function() {
							this.emit('activate');
							this.text.set_text('');
				}
};

WorkspaceIndicator.prototype = {
	__proto__: PanelMenu.SystemStatusButton.prototype,

	_init: function(){
		PanelMenu.SystemStatusButton.prototype._init.call(this, 'folder');
		
	  this._currentWorkspace = global.screen.get_active_workspace().index();
		this.statusLabel = new St.Label({ text: this._labelText() });
		
		let item = new NewWorkspace();
		item.connect('activate', Lang.bind(this, this._newWorkspace));
		this._newEntry = item;
		this.menu.addMenuItem(item);
	  
	  // destroy all previously created children, and add our statusLabel
 	  this.actor.get_children().forEach(function(c) { c.destroy() });
		this.actor.add_actor(this.statusLabel);

		this.workspacesItems = [];
		
		this._workspaceSection = new PopupMenu.PopupMenuSection();
		this._customWorkspaces = new PopupMenu.PopupMenuSection();
		
		this.menu.addMenuItem(this._customWorkspaces);
		this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
		this.menu.addMenuItem(this._workspaceSection);
		
		global.screen.connect_after('workspace-added', Lang.bind(this,this._createWorkspacesSection));
		global.screen.connect_after('workspace-removed', Lang.bind(this,this._createWorkspacesSection));
		global.screen.connect_after('workspace-switched', Lang.bind(this,this._updateIndicator));
		this.actor.connect('scroll-event', Lang.bind(this, this._onScrollEvent));
		this._createWorkspacesSection();
	
	},

	_updateIndicator: function() {
	    this.workspacesItems[this._currentWorkspace].setShowDot(false);
	    this._currentWorkspace = global.screen.get_active_workspace().index();
	    this.workspacesItems[this._currentWorkspace].setShowDot(true);

	    this.statusLabel.set_text(this._labelText());
	},

	_labelText : function(workspaceIndex) {
	    if(workspaceIndex == undefined) {
				workspaceIndex = this._currentWorkspace;
	    }
	    return Meta.prefs_get_workspace_name(workspaceIndex);
	},

	_createWorkspacesSection : function() {
		this._workspaceSection.removeAll();
		this.workspacesItems = [];

		let i = 0;
		for(; i < global.screen.n_workspaces; i++) {
			this.workspacesItems[i] = new PopupMenu.PopupMenuItem(this._labelText(i));
			this._workspaceSection.addMenuItem(this.workspacesItems[i]);
			this.workspacesItems[i].workspaceId = i;
			this.workspacesItems[i].label_actor = this.statusLabel;
			let self = this;
			this.workspacesItems[i].connect('activate', Lang.bind(this, function(actor, event) {
				this._activate(actor.workspaceId);
			}));
		}
      			
	    this._updateIndicator();
	},

	_activate : function (index) {

		if(index >= 0 && index <  global.screen.n_workspaces) {
			let metaWorkspace = global.screen.get_workspace_by_index(index);
			metaWorkspace.activate(true);
		}		
	},

	_onScrollEvent : function(actor, event) {
		let direction = event.get_scroll_direction();
		let diff = 0;
		if (direction == Clutter.ScrollDirection.DOWN) {
			diff = 1;
		} else if (direction == Clutter.ScrollDirection.UP) {
			diff = -1;
		} else {
			return;
		}

		let newIndex = global.screen.get_active_workspace().index() + diff;
		this._activate(newIndex);
	},
	
	_newWorkspace: function() {
					let txt = this._newEntry.text.get_text();
					let item = new PopupMenu.PopupMenuItem(txt);
					let applications = [];
					let windowslist = global.screen.get_active_workspace().list_windows();
					let i=0;
					let j=0;
					global.log("mphka reeee");
					for(; i<windowslist.length; i++){
						//if (windowslist[i].get_meta_window().is_on_all_workspaces())
              //  continue;
						j++;
					
						applications[j] = windowslist[i].get_wm_class().toLowerCase()+".desktop";
						global.log(applications[j]);
						//this._customWorkspaces.addMenuItem(item);
					}
					
					

					this._customWorkspaces.addMenuItem(item);
	}
	
}

function init(meta) {
    // empty
}

let _indicator;

function enable() {
    _indicator = new WorkspaceIndicator;
    Main.panel.addToStatusArea('workspace-indicator', _indicator);
}

function disable() {
    _indicator.destroy();
}

