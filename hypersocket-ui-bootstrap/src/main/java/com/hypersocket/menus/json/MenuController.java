/*******************************************************************************
 * Copyright (c) 2013 Hypersocket Limited.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the GNU Public License v3.0
 * which accompanies this distribution, and is available at
 * http://www.gnu.org/licenses/gpl.html
 ******************************************************************************/
package com.hypersocket.menus.json;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.ResponseStatus;

import com.hypersocket.auth.json.AuthenticatedController;
import com.hypersocket.auth.json.AuthenticationRequired;
import com.hypersocket.auth.json.UnauthorizedException;
import com.hypersocket.json.ResourceList;
import com.hypersocket.menus.AbstractTableAction;
import com.hypersocket.menus.MenuService;
import com.hypersocket.permissions.AccessDeniedException;
import com.hypersocket.permissions.PermissionService;
import com.hypersocket.permissions.PermissionStrategy;
import com.hypersocket.permissions.SystemPermission;
import com.hypersocket.realm.RealmPermission;
import com.hypersocket.realm.RealmService;
import com.hypersocket.session.json.SessionTimeoutException;

@Controller
public class MenuController extends AuthenticatedController {

	@Autowired
	MenuService menuService;

	@Autowired
	PermissionService permissionService;

	@Autowired
	RealmService realmService;

	@AuthenticationRequired
	@RequestMapping(value = "menus", method = RequestMethod.GET, produces = { "application/json" })
	@ResponseBody
	@ResponseStatus(value = HttpStatus.OK)
	public MenuList getModules(HttpServletRequest request,
			HttpServletResponse response) throws AccessDeniedException,
			UnauthorizedException, SessionTimeoutException {

		setupAuthenticatedContext(sessionUtils.getSession(request),
				sessionUtils.getLocale(request));
		try {
			return getModuleList(request);
		} finally {
			clearAuthenticatedContext();
		}
	}

	private MenuList getModuleList(HttpServletRequest request)
			throws UnauthorizedException, AccessDeniedException,
			SessionTimeoutException {

		setupAuthenticatedContext(sessionUtils.getSession(request),
				sessionUtils.getLocale(request));
		try {

			MenuList list = new MenuList(menuService.getMenus());
			if (permissionService.hasSystemPermission(sessionUtils
					.getPrincipal(request))) {
				list.setSystemAdmin(true);
			}

			try {
				permissionService.verifyPermission(
						sessionUtils.getPrincipal(request),
						PermissionStrategy.EXCLUDE_IMPLIED, 
						RealmPermission.READ, 
						SystemPermission.SWITCH_REALM);
				list.setRealms(realmService.allRealms());
			} catch (AccessDeniedException e) {
			}

			return list;
		} finally {
			clearAuthenticatedContext();
		}
	}

	@AuthenticationRequired
	@RequestMapping(value = "menus/tableActions/{table}", method = RequestMethod.GET, produces = { "application/json" })
	@ResponseBody
	@ResponseStatus(value = HttpStatus.OK)
	public ResourceList<AbstractTableAction> getTableActions(
			HttpServletRequest request, HttpServletResponse respone,
			@PathVariable String table) throws UnauthorizedException,
			SessionTimeoutException {

		setupAuthenticatedContext(sessionUtils.getSession(request),
				sessionUtils.getLocale(request));

		try {
			return new ResourceList<AbstractTableAction>(
					menuService.getTableActions(table));
		} finally {
			clearAuthenticatedContext();
		}
	}
}
