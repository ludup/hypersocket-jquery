/*******************************************************************************
 * Copyright (c) 2013 Hypersocket Limited.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the GNU Public License v3.0
 * which accompanies this distribution, and is available at
 * http://www.gnu.org/licenses/gpl.html
 ******************************************************************************/
package com.hypersocket.menus;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import javax.xml.bind.annotation.XmlRootElement;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.hypersocket.permissions.PermissionType;

@XmlRootElement(name = "menu")
public class MenuRegistration {

	String resourceKey;
	String bundle;
	Integer weight;
	PermissionType readPermission;
	PermissionType createPermission;
	PermissionType updatePermission;
	PermissionType deletePermission;
	String resourceName;
	String icon;
	boolean hidden;
	Map<String,PermissionType> additionalPermissions;
	
	List<MenuRegistration> modules = new ArrayList<MenuRegistration>();

	public MenuRegistration() {
	}

	public MenuRegistration(String bundle, String resourceKey, String icon, String url, Integer weight,
			PermissionType readPermision, PermissionType createPermission,
			PermissionType updatePermission, PermissionType deletePermission) {
		this(bundle, resourceKey, icon, url, weight, readPermision, createPermission,
				updatePermission, deletePermission, null);
	}
	
	public MenuRegistration(String bundle, String resourceKey, String icon, String url, Integer weight,
			PermissionType readPermision, PermissionType createPermission,
			PermissionType updatePermission, PermissionType deletePermission,
			Map<String,PermissionType> additionalPermissions) {
		this.bundle = bundle;
		this.resourceKey = resourceKey;
		this.icon = icon;
		this.resourceName = url;
		this.weight = weight;
		this.readPermission = readPermision;
		this.createPermission = createPermission;
		this.updatePermission = updatePermission;
		this.deletePermission = deletePermission;
		this.additionalPermissions = additionalPermissions;
	}

	public MenuRegistration(String bundle, String resourceKey, String icon, String url, Integer weight) {
		this.bundle = bundle;
		this.resourceKey = resourceKey;
		this.icon = icon;
		this.resourceName = url;
		this.weight = weight;
	}

	public String getId() {
		return resourceKey;
	}

	public String getResourceName() {
		return resourceName;
	}

	public String getResourceKey() {
		return resourceKey;
	}
	
	public String getIcon() {
		return icon;
	}

	public void addMenu(MenuRegistration module) {
		modules.add(module);
	}

	public List<MenuRegistration> getMenus() {
		return modules;
	}

	public Integer getWeight() {
		return weight;
	}

	@JsonIgnore
	public PermissionType getReadPermission() {
		return readPermission;
	}

	@JsonIgnore
	public PermissionType getCreatePermission() {
		return createPermission;
	}

	@JsonIgnore
	public PermissionType getUpdatePermission() {
		return updatePermission;
	}

	@JsonIgnore
	public PermissionType getDeletePermission() {
		return deletePermission;
	}
	
	@JsonIgnore
	public boolean canUpdate() {
		return true;
	}
	
	@JsonIgnore
	public boolean canDelete() {
		return true;
	}
	
	@JsonIgnore
	public boolean canRead() {
		return true;
	}

	@JsonIgnore
	public boolean canCreate() {
		return true;
	}
	
	public String getData() {
		return "";
	}
	
	public boolean isHidden() {
		return hidden;
	}
	
	public void setHidden(boolean hidden) {
		this.hidden=  hidden;
	}

}
