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
const Shell = imports.gi.Shell;


function WorkspaceIndicator() {
	this._init.apply(this, arguments);
}


let _bookmarksSection;
let _customWorkspaces;
let _newEntry;

function NewWorkspace() {
	this._init.apply(this, arguments);
}
//TWorkspace constructor
function TWorkspace(name,indx,control,active,enabled){
	this._init(name,indx,control,active,enabled);
	//this._setup(name,enabled,active);
}

TWorkspace.prototype ={
		__proto__: PopupMenu.PopupSubMenuMenuItem.prototype,
		
		_init: function(name,indx,control,active,enabled){
			PopupMenu.PopupSubMenuMenuItem.prototype._init.call(this,name);
			global.log('Templated Workspace created');
			this._indx=indx;
			this._wname = name;
			this._control = control;
			this.apps = [];
			this.assoc_apps = new Array();
			//If we do not control the workspace (customWorkspace)
			if(!this._control)
			{
				this._enabled = false;
				this._active = false;
				return;
			}
			//create the submenu entry
			this._createSubMenuEntry(enabled,active,true);
		},
		_createSubMenuEntry:function (enabled,active,frominit){
		
			if(!frominit)
				PopupMenu.PopupSubMenuMenuItem.prototype._init.call(this,this._wname);
			
			this._enabled = enabled;
			this._active = active;
			
			//the toglle switches for
			//active: the tworkspace is open 
			//enabled: the tworkspace should be loaded on init
			 this._activeToggle = new PopupMenu.PopupSwitchMenuItem(_("active"),this._active);
			 this._enableToggle = new PopupMenu.PopupSwitchMenuItem(_("enabled"),this._enabled);
			
			 this.menu.addMenuItem(this._activeToggle);
			 this.menu.addMenuItem(this._enableToggle);
			 //Menu entry for Removing TWorkspace
			 let removeEntry = new PopupMenu.PopupMenuItem(_('Remove'),{style_class: 'RemoveButton'});
			 this.menu.addMenuItem(removeEntry);
			 
			 //connect remove entry signal with this_remove
			 removeEntry.connect("activate",Lang.bind(this,this._remove));
			 this._enableToggle.connect("toggled",Lang.bind(this,this._toggleEnable));
			 this._activeToggle.connect("toggled",Lang.bind(this,this._toggleActive));
		},
		
		//set control either we control it or not
		//Not needed at this time
		set_control:function(docontrol)
		{
			if(this._control)
			{
				if(docontrol)
				{
					global.log('already controlling the workspace');
				}
				else
				{
					global.log('Revoking Control for Workspace and removing submenuEntry')
					this._control = docontrol;
					this.emit('remove-sub-menu-entry',this);
				}
			}
			else{
				if(docontrol)
				{
					global.log('We do not  control the workspace');
				}
				else
				{
					//mark that we control the tworkspace and create the submenu entry for our basemenuItem
					
					this_control = docontrol;
					this._createSubMenuEntry(false,true);
					//emit the signal to add this as submenu entry
					this.emit('add-sub-menu-entry',this)
				}
			}
		},
		
		_toggleEnable:function(item)
		{
			//handler when toggling enable switch
			if(item != null)
			{
				this._enabled = item.state;
			}
			if(this._enabled == false)
			{
				//emit disable signal 
				//when this signal is emitted we must save the configuration with the disabled TWorkspace
				this.emit('disable');
				global.log('disable');
			}
			else{
				//emit enable signal
				//when enable is emitted if save the configuration with this workspace enabled;
				this.emit('enable');
				global.log('enable');
			}
		},
		
		_toggleActive:function(item)
		{
			if(item != null)
			{
				this._active = item.state;
			}
			if(this._active == false)
			{
				//Close workspace and all its windows
				this.emit('deactivate');
				global.log('deactivate');
			}
			else{
				//activate worspace (create it and then execute all the apps)
				this.emit('activate');
				global.log('activate');
			}
		},
		
		_remove:function()
		{
			//remove emits this signal the indicator should remove  TWorkspace is passed as an argument
			//and save configuration without this workspace
			this.emit('remove-sub-menu-entry',this);
		},
		
		//add an application
		//we use an assicative array in order to quickly check whether an app is alread in the workspace
		//instead of iterating over the apps array
		_addApplication:function(app){
			global.log(app);
			if(this.assoc_apps[app] == undefined)
			{
				this.assoc_apps[app] = new Boolean(true);
				this.apps[this.apps.length] = app;
			}
			else
			{
				global.log(app);
			}
	  },
	  
	  _getApplications: function(){
		  return this.apps;
	  }
};


NewWorkspace.prototype = {
				__proto__: PopupMenu.PopupBaseMenuItem.prototype,

				_init: function(itemParams) {
							PopupMenu.PopupBaseMenuItem.prototype._init.call(this, {reactive: false});

							//create the box layout
							let box = new St.BoxLayout({style_class: 'hamster-box'});
							box.set_vertical(true);
							//create the Save Current workspace label
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
							
							//add the box to our entry
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
		//initialize our array of workspaces;
		//the array which keeps all the Template Workspaces for our indicator
		this.tworkspaces = [];
		//the assoc array which handles wheether a certain name is used
		this.tworkspaces_assoc = {};
	   this._currentWorkspace = global.screen.get_active_workspace().index();
		this.statusLabel = new St.Label({ text: this._labelText() });
		
		let item = new NewWorkspace();
		item.connect('activate', Lang.bind(this, this._newWorkspace));
		this._newEntry = item;
		this.menu.addMenuItem(item);
	  
	   // destroy all previously created children, and add our statusLabel
	   //clear the old ui of indicator
 	   this.actor.get_children().forEach(function(c) { c.destroy() });
		this.actor.add_actor(this.statusLabel);

		this.workspacesItems = [];
		
		this._workspaceSection = new PopupMenu.PopupMenuSection();
		//create our custom Template Workspaces PopupMenu Section
		this._customWorkspaces = new PopupMenu.PopupMenuSection();
		
		this.menu.addMenuItem(this._customWorkspaces);
		this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
		this.menu.addMenuItem(this._workspaceSection);
		
		//Connect the signals when a workspace workspace is added, removed or switched
		//We must change what we do when a workspace is added or removed
		global.screen.connect_after('workspace-added', Lang.bind(this,this._createWorkspacesSection));
		global.screen.connect_after('workspace-removed', Lang.bind(this,this._createWorkspacesSection));
		global.screen.connect_after('workspace-switched', Lang.bind(this,this._updateIndicator));
		this.actor.connect('scroll-event', Lang.bind(this, this._onScrollEvent));
		this._createWorkspacesSection();
		this._parseConfig();
		//~ this._createCustomWorkspacesSection();
	
	},

	
	//update indicator label
	_updateIndicator: function() {
	    this.workspacesItems[this._currentWorkspace].setShowDot(false);
	    this._currentWorkspace = global.screen.get_active_workspace().index();
	    this.workspacesItems[this._currentWorkspace].setShowDot(true);
		this.statusLabel.set_text(this.workspacesItems[this._currentWorkspace].twork._wname);
	},

	_labelText : function(workspaceIndex) {
	    if(workspaceIndex == undefined) {
				workspaceIndex = this._currentWorkspace;
	    }
	    return Meta.prefs_get_workspace_name(workspaceIndex);
	},
//creates the submenu WorkspaceSection
	_createWorkspacesSection : function() {
		this._workspaceSection.removeAll();
		this.workspacesItems = [];
		
		let i = 0;
		for(; i < global.screen.n_workspaces; i++) {
			this.workspacesItems[i] = new PopupMenu.PopupMenuItem(this._labelText(i));
			this._workspaceSection.addMenuItem(this.workspacesItems[i]);
			this.workspacesItems[i].twork = new TWorkspace(this._labelText(i),false,false,false) ;
			this._addTWorkspace(this.workspacesItems[i].twork);
			this.workspacesItems[i].workspaceId = i;
			this.workspacesItems[i].label_actor = this.statusLabel;
			let self = this;
			this.workspacesItems[i].connect('activate', Lang.bind(this, function(actor, event) {
				this._activate(actor.workspaceId);
			}));
		}
      			
	    this._updateIndicator();
	},

	//activate the workspace on index
	_activate : function (index) {

		if(index >= 0 && index <  global.screen.n_workspaces) {
			let metaWorkspace = global.screen.get_workspace_by_index(index);
			metaWorkspace.activate(true);
		}		
	},

	//catch scroll event and change Workspace in the same direction
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
	
	//Replace a workspace
	_replaceWorkspace:function(workspace){
		//update label text for menu
		this.workspacesItems[workspace._indx].actor.get_children()[0].set_text(workspace._wname);
		this._updateIndicator();
	},
	
	_enableTWorkspace:function(twork){
		let index = this.tworkspaces_assoc[twork._wname];
		if(index == undefined)
		{
			global.logError("enabling TWorkspace failed because index was undefined");
			return;
		}
		this.tworkspaces[index]._enabled =true;
		this._saveConfig();
	},
	
	_disableTWorkspace:function(twork){
		let index = this.tworkspaces_assoc[twork._wname];
		if(index == undefined)
		{
			global.logError("Disabling TWorkspace failed because index was undefined");
			return;
		}
		this.tworkspaces[index]._enabled =false;
		this._saveConfig();
	},
	//add a new Template Workspace
	_addTWorkspace: function(newTWorkspace)
	{
		if(this.tworkspaces_assoc[newTWorkspace._wname] == undefined)
		{ // if the association array does not have somthine then it is a new TWorkspace so we must add it
			//add it to the workspaces array
			newTWorkspace.connect('enable',Lang.bind(this,function(workspace){
			 this._enableTWorkspace(workspace) }));
			newTWorkspace.connect('disable',Lang.bind(this,function(workspace){
			 this._disableTWorkspace(workspace) }));
			
			newTWorkspace.connect('activate',Lang.bind(this,function(workspace){
			 this._activateTWorkspace(workspace) })); 
			  
			newTWorkspace.connect('deactivate',Lang.bind(this,function(workspace){
			 this._deactivateTWorkspace(workspace) }));
			 
			newTWorkspace.connect('remove-sub-menu-entry',Lang.bind(this,function(workspace){
			 this._removeTWorkspace(workspace) })); 
			this.tworkspaces[this.tworkspaces.length] = newTWorkspace;
			//association name -> index in the array
			this.tworkspaces_assoc[newTWorkspace._wname] = this.tworkspaces.length-1;
			if(newTWorkspace._control)
				this._customWorkspaces.addMenuItem(newTWorkspace);
		}
	},
	//remove a TEmplate workspace
	_removeTWorkspace: function(oldWorkspace)
	{
		//remove a Template Workspace
		if(this.tworkspaces_assoc[oldWorkspace._wname] != undefined)
		{
		//get index of workspace
			let indx = this.tworkspaces_assoc[oldWorkspace._wname];
		//remove from association array 
			let reload = this.tworkspaces[indx]._control;
			this.tworkspaces_assoc[oldWorkspace._wname] = undefined;
		//remove it from actual array
			for(let i = this.tworkspaces.length-1; i > indx; i--)
			{
				this.tworkspaces_assoc[this.tworkspaces[i]._wname]=i-1;
			}
			let old = this.tworkspaces.splice(indx,1);
			//old = undefined;
			this._saveConfig();
		//remove from menu
			//If we control the tworkspace we must update the customWorkspaces menu section
			if(reload)
			{
				let menuitems = this._customWorkspaces._getMenuItems();

				for(let i = 0; i < menuitems.length;i++)
				{
					//add all the Template Workspaces we control
					if(menuitems[i].label.text.toString() == oldWorkspace._wname.toString())
					{
						this._customWorkspaces.box.remove_actor(menuitems[i].actor);
						old = undefined;
						break;
					}
					
				}
				
			}
		}
	},
	_activateTWorkspace: function(twork)
	{
		let index = this.tworkspaces_assoc[twork._wname];
		if(index == undefined)
		{
			global.logError("Activating TWorkspace failed because index was undefined");
			return;
		}
		
		
		
		if(this.tworkspaces[index]._active)
		{
			global.log('TWorkspace ' + this.tworkspaces[index]._wname.toString() + ' is already active');
		//	return;
		}
		
		let workapps = this.tworkspaces[index]._getApplications();
		this.tworkspaces[index]._indx = global.screen.get_n_workspaces();
		global.screen.append_new_workspace(true, global.get_current_time());
		let newindx = global.screen.get_active_workspace_index();
		this._currentWorkspace = newindx;
		
		for(let i = 0; i < workapps.length;i++)
		{
			app = Gio.DesktopAppInfo.new(workapps[i]);
			app.launch([],null);
		}
	},
	
	_deactivateTWorkspace: function(twork)
	{
		let index = this.tworkspaces_assoc[twork._wname];
		if(index == undefined)
		{
			global.logError("Deactivating TWorkspace failed because index was undefined");
			return;
		}

		if(!this.tworkspaces[index]._active)
		{
			global.log('TWorkspace' + twork._wname.toString() + ' is already inactive');
			return;
		}
		
		workapps = this.tworkspaces[index]._getApplications();
		this.tworkspaces[index]._indx = global.screen.get_n_workspaces();
		let oldWorkspace = global.screen.get_workspace_by_index(this.tworkspaces[index]._indx);
		let active_windows = oldWorkspace.list_windows();		
		let winTracker =  Shell.WindowTracker.get_default();
		let target_workspace_index = 0;
		if(this.tworkspace[index]._indx == 0)
			target_workspace_index = 1;
		for(let i = 0; i < active_windows.length;i++)
		{
			let app = winTracker.get_window_app(active_windows[i]);
			if(this.tworkspaces[index][app.get_id()] != undefined)
			{
				let windowsapp = app.get_windows();
				for(let j = windowsapp.length;j>=0;j--)
				{
					windowsapp.delete();
				}
			}
			else
			{
				let windowsapp = app.get_windows();
				for(let j = windowsapp.length;j>=0;j--)
				{
					windowsapp.change_workspace_by_index(target_workspace_index);
				}
			}
		}

	},
	//the action when we want to save a new workspace
	_newWorkspace: function() {
					let txt = this._newEntry.text.get_text();
					let indx = global.screen.get_active_workspace().index() ;
					if(this.workspacesItems[indx].twork._control)
						return;
					this._removeTWorkspace(this.workspacesItems[indx].twork);
					this.workspacesItems[indx].twork.destroy();
					this.workspacesItems[indx].twork = new TWorkspace(txt,indx,true,true,false);
					this._addTWorkspace(this.workspacesItems[indx].twork);
					let item = this.workspacesItems[indx].twork;
					let applications = [];
					let windowslist = global.screen.get_active_workspace().list_windows();
					let i=0;
					let j=0;
					//global.log("mphka reeee");
					
					for(; i<windowslist.length; i++){
						//ignore windows when they are on all workspaces
						if (windowslist[i].is_on_all_workspaces())
							continue;
						j++;
					
						applications[j] = windowslist[i].get_wm_class().toLowerCase()+".desktop";
						//global.log(applications[j]);
						//add application to workspace
						this.workspacesItems[indx].twork._addApplication(applications[j]);
						global.log("after addding one app apps are ");
					}
					
					global.log('-------------- start of apps -----------');
					let oops = this.workspacesItems[indx].twork._getApplications();
					for(let p = 0; p < oops.length;p++)
					{
						global.log(oops[p]);
					}
					global.log("---------------- end of apps ------------");

					this._replaceWorkspace(this.workspacesItems[indx].twork);
					//addTWorkspace(this.workspacesItems[indx].twork);
					this._saveConfig();
	},
	 _parseConfig: function() {
        
	// Search for configuration files first in system config dirs and after in the user dir
	let _configDirs = [GLib.get_system_config_dirs(), GLib.get_user_config_dir()];
		for(var i = 0; i < _configDirs.length; i++)
		{
			//our config file
            let _configFile = _configDirs[i] + "/gnome-shell-templated-workspaces/gnome_shell_tworkspaces.json";
					
            if (GLib.file_test(_configFile, GLib.FileTest.EXISTS)) {
				let filedata = null;

				try {
					//load Templated Worksapces from configuration
							 filedata = GLib.file_get_contents(_configFile, null, 0);
							 global.log("Template Workspaces: Using config file = " + _configFile);

							 let jsondata = JSON.parse(filedata[1]);
							 let workspacenum =  jsondata['numberofworkspaces'];
							 for(let i = 0; i < workspacenum;i++)
							 {
									
									 
									 let wname = jsondata[i]['wname'];
									 let enabled = jsondata[i]['enabled'];
									 let active = false; //this should not activate the previous active 
									 let apps = jsondata[i]['apps'];
									 let control = true; //we control this tworkspace since we load it from configFile
									 let savedWorkspace = new TWorkspace(wname,-1,true,active,enabled);
									 for(let index = 0; index < apps.length; index++)
									 {
										 savedWorkspace._addApplication(apps[index]);
									 }
									 this._addTWorkspace(savedWorkspace);
							}
							global.log('Saved Workspaces were loaded');
					}
				catch (e) {
								  global.logError("Template Workspaces: Error reading config file " + _configFile + ", error = " + e);
				}
				finally {
								  filedata = null;
				}
			}
       }
    },


    _saveConfig: function() {
        let _configDir = GLib.get_user_config_dir() + "/gnome-shell-templated-workspaces";
        let _configFile = _configDir + "/gnome_shell_tworkspaces.json";
        let filedata = null;
        let jsondata = {};

        if (GLib.file_test(_configDir, GLib.FileTest.EXISTS | GLib.FileTest.IS_DIR) == false &&
                GLib.mkdir_with_parents(_configDir, 0x1ED) != 0) { // 0755 base 8 = 0x1ED base 16
                    global.logError("Templated Workspaces: Failed to create configuration directory. Path = " +
                            _configDir + ". Configuration will not be saved.");
                }

        try {
					 //save data from configuration 
                let counter = 0; //counter to save it at the end of the procedure
                for(let i = 0; i < this.tworkspaces.length;i++)
                {
						 
						 if(this.tworkspaces[i]._control)
						 {
							 jsondata[counter] ={};
							 jsondata[counter]['wname']   = this.tworkspaces[i]._wname;
							 jsondata[counter]['enabled'] = this.tworkspaces[i]._enabled;
							 jsondata[counter]['active']  = this.tworkspaces[i]._active;
							 jsondata[counter]['apps'] = [];
							 let apps = this.tworkspaces[i]._getApplications();
							 for(let index = 0; index < apps.length; index++)
							 {
								 jsondata[counter]['apps'][index] = apps[index];
							 }
							 counter = counter +1;
						 }
					 }
            jsondata["numberofworkspaces"]=counter;
            filedata = JSON.stringify(jsondata, null, "  ");
            GLib.file_set_contents(_configFile, filedata, filedata.length);
            
        }
        catch (e) {
            global.logError("Templated Workspaces: Error writing config file = " + e);
        }
        finally {
            jsondata = null;
            filedata = null;
        }
        global.log("Templated Workspaces: Updated config file = " + _configFile);
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


