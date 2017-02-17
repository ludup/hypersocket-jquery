var newTable = true;

$.fn.ajaxResourcePageInsert = function(resource) {
	$(this).data('dataTable').fnAddData(resource);
};

$.fn.ajaxResourcePage = function(params) {

	if(newTable) {
		return $(this).resourceTable(params);
	} else {
		return $(this).oldResourcePage(params);
	}
	
}

$.fn.iconPage = function(params) {
	
	var divName = $(this).attr('id');
	
	$('#' + divName).append('<div class="panel panel-default"><div id="' + divName + 'Icons" class="panel-body"></div></div>');
	divName = '#' + divName + 'Icons';
	
	var options = $.extend({
		
	}, params);
	
	getJSON(options.url, null, function(data) {
		var row = 6;
		
		$(divName).append('<div class="row"></div>');
		$.each(data.resources, function(idx, resource) {
			
			row--;
			
			if(row==0) {
				$(divName).append('<div class="row"></div>');
				row = 12;
			}
			$(divName).children('.row').last().append('<div class="col-xs-2" style="height: 100px; margin: 10px;"></div>');
			
			if(!resource) {
				return;
			}

			var uri = getLogoPath(options.logoResourceTypeCallback ? options.logoResourceTypeCallback(resource) : 'default', resource.logo, resource.name);
			$(divName).children('.row').children('.col-xs-2').last().append('<img width="100" height="100" src="' + uri + '"/>');
		});
		
		if(options.complete) {
			options.complete();
		}
	});
};

$.fn.resourceDialog = function(params, params2) {
	$(this).bootstrapResourceDialog(params, params2);
};

function saveResource(resource, buttonElement, options, mode, closeCallback) {
	var icon = buttonElement.find('i');
	startSpin(icon, 'fa-save');
	
	log("Creating resource");

	if (options.validate) {
		if (!options.validate(mode === 'create' || mode === 'copy')) {
			stopSpin(icon, 'fa-save');
			log("Resource validation failed");
			return;
		}
	}

	log("Created resource object for posting");

	postJSON(options.resourceUrl, resource, function(data) {

		if (data.success) {
			
			log("Resource object created");
			if(closeCallback) {
				closeCallback();
			}
			if (options.resourceCreated) {
				options.resourceCreated(data.resource);
			}
			checkBadges(false);
			showSuccess(data.message);
		} else if(data.confirmation) {
			
			bootbox.confirm({
			    message: data.message.format(data.args),
			    buttons: {
			        confirm: {
			            label: getResource('text.yes'),
			            className: 'btn-success'
			        },
			        cancel: {
			            label: getResource('text.no'),
			            className: 'btn-danger'
			        }
			    },
			    callback: function (result) {
			        if(result) {
			        	if(options.confirmed) {
			        		options.confirmed(resource, data.args);
			        	}
			        	saveResource(resource, buttonElement, options, mode, closeCallback);
			        }
			    }
			});

		} else {
			log("Resource object creation failed " + data.message);
			showError(data.message);
		}
	}, null, function() { stopSpin(icon, 'fa-save');});
}

$.fn.resourceTable = function(params) {
	
	var divName = $(this).attr('id');

	log("Creating resource table for div " + divName);

	var options = $.extend({
		checkbox: false,
		radio: false,
		divName : divName,
		striped	: true,
		method : 'get',
		pagination : true,
		page : 1,
		pageSize: 5,
		pageList : [ 5, 10, 20, 50, 100 ],
		search: true,
		showColumns : true,
		showRefresh : true,
	    showToggle : false,
		canCreate : false,
		canCopy : true,
		canUpdate : false,
		checkReadOnly: true,
		canDelete : false,
		icon : 'fa-cog',
		sortName: 'name',
		sortOrder: 'asc',
		disableDecoration: false,
		disableActionsDropdown: false,
		createButtonText: "text.add",
		createButtonIcon: "fa-plus-circle",
		logo: false,
		defaultView: 'table',
		logoResourceTypeCallback: false,
		hasResourceTable: true,
		onSave : false,
		stayOnPageAfterSave: false,
		bulkAssignment: false
		},params);

	options.tableView = $('#' + divName);
	
	$(this).data('options', options);

	var resourceType  = "";
	if(options.resourceUrl.indexOf("/") != -1) {
	    var parts = options.resourceUrl.split("/");
	    resourceType = parts[0];
	}

	var html = '';
	if(!options.disableDecoration) {
		html += '<div class="panel panel-default"><div class="panel-heading"><h2><i class="fa '
			+ options.icon + '"></i><span class="break">' 
			+ options.title + '</span></h2></div>';
	}

	html += '<table id="' + divName + 'Placeholder"></table>';
	
	html += '<div id="' + divName + 'Actions" class="tabActions panel-footer"></div>';
	
	if(!options.disableDecoration) {
		html += '</div>';
	}
	
	$(this).append(html);
	
	if(options.infoHtml) {
		var theDiv = $(this).find('.panel-heading');
		if(!theDiv.length) {
			theDiv = $(this).find('.modal');
		}
		getState(divName+'-infoPanel', true, function(data) {
			if(data.resources.length == 0 || data.resources[0].show) {
				theDiv.after('<div id="infoPanel" class="col-xs-12"><div class="alert alert-info"><i class="fa fa-2x fa-info"></i><i id="messageDismiss" '
						+ 'class="fa fa-times dismiss-icon"></i>&nbsp;&nbsp;<span>' + options.infoHtml + '</span></div></div>');
			
				$('.dismiss-icon').click(function(e) {
					var prefs = new Object();
					prefs.show = false;
					saveState(divName+'-infoPanel', prefs, true, function() {
						$('#infoPanel').fadeOut(1000);
					});
				});
			}
			
		});
	}
	
	if(options.resourceView === 'samePage') {
		options.view = $('div[dialog-for="' + divName + '"]').samePageResourceView(options);
	} else {
		options.view = $('div[dialog-for="' + divName + '"]').bootstrapResourceDialog(options);
	}

	var columns = new Array();
	var columnsDefs = new Array();
	var sortColumns = new Array();
	
	if(options.logo) {
		var c = { field : 'logo',
				title: getResource(options.resourceKey + '.logo.label'),
				align:'left',
				sortable: false,
				width: 40,
				formatter: function(value, row, index) {
					var prefix = "logo://";
					var resource = $('#' + divName + 'Placeholder').bootstrapTable('getData')[index];
					if(!resource) {
						return '';
					}
					return '<img class="resource-logo" src="' + ( getLogoPath(options.logoResourceTypeCallback ? options.logoResourceTypeCallback(resource) : 'default', value, resource.name) ) + '"/>';
				}
		};
		columns.push(c);	
	}

	$.each(options.fields,function(idx, obj) {
		var c = { field : obj.name,
				title: getResource(options.resourceKey + "." + obj.name + '.label'),
				align: obj.align ? obj.align : 'left',
				sortable: obj.sortable || obj.name === options.sortName,
				formatter: obj.formatter
		};
		if(obj.width) {
			c.width = obj.width;
		}
		columns.push(c);	
	});
	
	if(options.searchFields) {
		$.each(options.searchFields,function(idx, obj) {
			var c = { value : obj.name,
					name: getResource(options.resourceKey + "." + obj.name + '.label')
			};
			sortColumns.push(c);	
		});
	}
	
	
	if(!$('#additionalActions').length) {
		$('body').append('<div id="additionalActions"></div>');
	}
	
	if(options.exportUrl) {
		if(!options.additionalActions) {
			options.additionalActions = new Array();
		}
		if(!options.toolbarButtons) {
			options.toolbarButtons = new Array();
		}

		options.additionalActions.push({
			resourceKey : 'exportResource',
			iconClass : 'fa-download',
			action : function(resource, callback) {
				window.location = basePath + '/api/' + options.exportUrl + '/' + resource.id;
				callback();
			},
			enabled : true
		});
		
		options.toolbarButtons.push({ 
			resourceKey: 'exportResources',
			icon: 'fa-download',
			action: function(selections, callback) {
				window.location = basePath + '/api/' + options.exportUrl;
				callback();
			}
		});
	}
	
	if(options.importUrl) {

		if(!options.toolbarButtons) {
			options.toolbarButtons = new Array();
		}
		
		if(!$('#importResourcesPlaceholder').length) {
			$('body').append('<div id="importResourcesPlaceholder"></div>');
			$('#importResourcesPlaceholder').load(uiPath + "content/importResourceDialog.html");
		}
		options.toolbarButtons.push({ 
			resourceKey: 'importResources',
			icon: 'fa-upload',
			action: function(selections, callback) {
				$('#importResources').data('importUrl', options.importUrl);
				$('#importResources').data('action')(callback);
			}
		});
	}
	
	var renderActions = function(value, row, index) {
		var id = row.id;
		var renderedActions = '';
		
		if (options.additionalActions) {

			if(!options.disableActionsDropdown && options.additionalActions.length > 1) {
				renderedActions += '<div id="dropdown_' + id + '" class="btn-group"><a class="btn btn-success row-additional dropdown-toggle btn-action" data-toggle="dropdown" href="#"><i class="fa fa-gears"></i></a>';
				renderedActions += '<ul class="dropdown-menu dropdown-menu-right" role="menu">';
				$.each(
						options.additionalActions,
						function(x, act) {
							if (act.enabled) {
								renderedActions += '<li><a class="row-' + act.resourceKey + '" href="#"><i class="fa ' + act.iconClass + '"></i>&nbsp;&nbsp;<span>' + getResource(act.resourceKey + ".label") + '</span></a></li>';
			
								$(document).off('click',
									'#' + divName + 'Actions' + id + ' .row-' + act.resourceKey);
								$(document).on(
									'click',
									'#' + divName + 'Actions' + id + ' .row-' + act.resourceKey,
									function() {
										var curRow = $.inArray($(this).closest("tr").get(0), $('#' + divName + 'Placeholder').find('tbody').children()); 
										var resource = $('#' + divName + 'Placeholder').bootstrapTable('getData')[curRow];
										act.action(resource, function(resource) {
											$('#' + divName + 'Placeholder').bootstrapTable('refresh');
											checkBadges(false);
										});
									});
							}
				});
				renderedActions += '</ul></div>';
				
				$(document).on('show.bs.dropdown', '#' + divName + 'Actions' + id, function () {
					var dropdown = $(this);
					
					var curRow = $.inArray($(this).closest("tr").get(0), $('#' + divName + 'Placeholder').find('tbody').children()); 
					var resource = $('#' + divName + 'Placeholder').bootstrapTable('getData')[curRow];
					
					$.each(options.additionalActions, function(x, act) {
						if(act.enabled) {
							if(act.displayFunction && act.displayFunction != '') {
								var display = window[act.displayFunction].apply(null, [resource, act]);
								var el = $('.row-' + act.resourceKey, dropdown);   
								if(display) {
									el.show();
								} else {
									el.hide();
								}
							} 
							if(act.isDisplayable) {
								var el = $('.row-' + act.resourceKey, dropdown);   
								if(act.isDisplayable(resource)) {
									el.show();
								} else {
									el.hide();
								}
							}
							if(act.enableFunction && act.enableFunction != '') {
								if(!window[act.enableFunction].apply(null, [resource, act])) {
									var el = $('.row-' + act.resourceKey, dropdown);    
									el.parent().addClass('disabled');
									el.attr('disabled', true);
								}
							} 
							if(act.isEnabled && !act.isEnabled(resource)) {
								var el = $('.row-' + act.resourceKey, dropdown);    
								el.parent().addClass('disabled');
								el.attr('disabled', true);
							} 
						}
						
					});
				});
				
			}  else {
				$.each(options.additionalActions,
						function(x, act) {
							if (act.enabled) {

								renderedActions += '<a class="btn ' + (act.buttonClass ? act.buttonClass : 'btn-success') + ' row-' 
												+ act.resourceKey + ' btn-action" href="#" data-toggle="tooltip" data-placement="top" title="' 
												+ getResource(act.resourceKey + ".label") + '"><i class="fa ' + act.iconClass + '"></i></a>';

								$(document).off('click','#' + divName + 'Actions' + id + ' .row-' + act.resourceKey);
								$(document).on('click',
									'#' + divName + 'Actions' + id + ' .row-' + act.resourceKey,
									function() {
										var curRow = $.inArray($(this).closest("tr").get(0), $('#' + divName + 'Placeholder').find('tbody').children()); 
										var resource = $('#' + divName + 'Placeholder').bootstrapTable('getData')[curRow];
										act.action(resource, function(resource) {
											$('#' + divName + 'Placeholder').bootstrapTable('refresh');
											checkBadges(false);
										});
								});
						}
					});
				}
		}
		
		var canUpdate = options.canUpdate;
		if(options.checkUpdate) {
			canUpdate = options.checkUpdate(row);
		}

		if(!options.disableEditView) {
			renderedActions += '<a class="btn btn-info row-edit btn-action" href="#"><i class="fa ' + (canUpdate && (options.checkReadOnly ? !row.readOnly : true) ? 'fa-edit' : 'fa-search') + '"></i></a>';
			$(document).off('click', '#' + divName + 'Actions' + id + ' .row-edit');
			$(document).on(
				'click',
				'#' + divName + 'Actions' + id + ' .row-edit',
				function() {
					var curRow = $.inArray($(this).closest("tr").get(0), $('#' + divName + 'Placeholder').find('tbody').children()); 
					var resource = $('#' + divName + 'Placeholder').bootstrapTable('getData')[curRow];
					if(canUpdate && (options.checkReadOnly ? !resource.readOnly : true)) {
						options.view.editResource(resource);
					} else {
						options.view.viewResource(resource);
					}
			});
			if(options.canCopy) {
				renderedActions += '<a class="btn btn-primary row-copy btn-action" href="#"><i class="fa fa-copy"></i></a>';
				$(document).off('click', '#' + divName + 'Actions' + id + ' .row-copy');
				$(document).on(
					'click',
					'#' + divName + 'Actions' + id + ' .row-copy',
					function() {
						var curRow = $.inArray($(this).closest("tr").get(0), $('#' + divName + 'Placeholder').find('tbody').children()); 
						var resource = $('#' + divName + 'Placeholder').bootstrapTable('getData')[curRow];
						options.view.copyResource(resource);
				});
			}
		}

		if (options.canDelete) {
			
			var canDelete = !row.system;
			if(options.checkDelete) {
				canDelete = !row.system && options.checkDelete(row);
			}
			
			if(canDelete) {
				renderedActions += '<a class="btn btn-danger row-delete btn-action" href="#"><i class="fa fa-trash-o"></i></a>';
	
				$(document).off('click', '#' + divName + 'Actions' + id + ' .row-delete');
	
				$(document).on(
					'click',
					'#' + divName + 'Actions' + id + ' .row-delete',
					function() {
						
						log("Entering resource delete for id " + id);
	
						var row = $.inArray($(this).closest("tr").get(0), $('#' + divName + 'Placeholder').find('tbody').children()); 
						var resource = $('#' + divName + 'Placeholder').bootstrapTable('getData')[row];
	
						bootbox.confirm(getResource(options.resourceKey + ".delete.desc")
								.format(resource.name), function(confirmed) {
							if (confirmed) {
								
								deleteJSON(options.resourceUrl + "/" + id, null, function(data) {
									if (data.success) {
										if (options.resourceDeleted) {
											options.resourceDeleted(resource, data.message);
										}
										$('#' + divName + 'Placeholder').bootstrapTable('remove', {
						                    field: 'id',
						                    values: [resource.id]
						                });
										$('#' + divName + 'Placeholder').bootstrapTable('refresh');
										checkBadges(false);
										showSuccess(data.message);
									} else {
										showError(data.message);
									}
								});
							}
					});
				});
			} else {
				renderedActions += '<a class="btn btn-disabled btn-action" href="#"><i class="fa fa-trash-o"></i></a>';
			}
			
		}

		return '<div id="' + divName + 'Actions' + id + '" class="tableActions">' + renderedActions + '</div>';
	};
	
	columns.push({ field : "actions",
		align:'right',
		formatter: renderActions,
		width: 175
	});

	if (options.canCreate) {

		$('#' + divName + 'Actions').append('<button id="' + divName + 'Add" class="btn btn-primary"><i class="fa ' + options.createButtonIcon + '"></i>' + getResource(options.createButtonText) + '</button>');
		$('#' + divName + 'Add').click(function() {
			if (options.showCreate) {
				options.showCreate();
			}
			options.view.createResource($('#'+divName).data('createCallback'));
		});
	}

	$('#' + divName + 'Placeholder').on('post-body.bs.table', function() {
		$('[data-toggle="tooltip"]').tooltip();
	});
	
	getState(options.id, true, function(data){
		if(data.success && data.resources.length && data.resources[0].preferences){
			var preferences = JSON.parse(data.resources[0].preferences);
			if(preferences && preferences.sortName){
				options.sortName = preferences.sortName;				
			}
			if(preferences && preferences.sortOrder){
				options.sortOrder = preferences.sortOrder;
			}
			if(preferences && preferences.pageSize){
				options.pageSize = preferences.pageSize;
			}
		}
		$('#' + divName + 'Placeholder').bootstrapTable({
		    pagination: options.pagination,
		    checkbox: options.checkbox,
		    radio: options.radio,
		    showHeader: true,
		    page : options.page,
		    pageSize: options.pageSize,
		    pageList: options.pageList,
		    search: options.search,
		    showColumns : columns.length > 2 && options.showColumns,
			showRefresh : options.showRefresh,
		    method: options.method,
		    striped: options.striped,
		    showToggle : options.showToggle,
		    sidePagination: 'server',
		    url: basePath + '/api/' + options.tableUrl,
		    columns: columns,
		    sortName: options.sortName,
		    sortOrder: options.sortOrder,
		    sortable: true,
		    cache: false,
		    uniqueId: 'id',
		    onSort: function(name, order) {

		    	$('#' + divName + 'Placeholder').bootstrapTable('refreshOptions', {
		    		sortName: name,
		    		sortOrder: order
		    	});
		    	
		    	$('#' + divName + 'Placeholder').bootstrapTable('refresh');
		    },
		    detailView: options.detailFormatter != undefined,
		    detailFormatter: options.detailFormatter,
		    onClickRow: function(row) {
		    	if(options.selected) {
		    		options.selected(row);
		    	}
		    },
		    queryParams: function(params) {
		    	if($('#searchColumn').widget()) {
		    		params.searchColumn = $('#searchColumn').widget().getValue();
		    	}
		    	if(options.queryParams) {
		    		options.queryParams(params);
		    	}
		    	return params;
		    },
		    onPageChange: function(number, size){
		    	if(options.id){
		    		var sortName = $('#' + divName + 'Placeholder').bootstrapTable('getOptions').sortName;
		    		var sortOrder = $('#' + divName + 'Placeholder').bootstrapTable('getOptions').sortOrder;
		    		saveState(options.id, {'pageSize': size, 'sortOrder': sortOrder, 'sortName': sortName}, true);
		    	}
		    },
		    onSort: function(name, order){
		    	if(options.id){
		    		var size = $('#' + divName + 'Placeholder').bootstrapTable('getOptions').pageSize;
		    		saveState(options.id, {'pageSize': size, 'sortOrder': order, 'sortName': name}, true);
		    	}
		    },
		    classes: 'table table-hover ' + divName,
		    onPostHeader: function() {
		    	
		    	if($('#searchRendered' + divName).length==0) {
		    		
		    		log("Rendering search");
		    		
		    		if(sortColumns.length > 0) {
						$('.' + divName).closest('.bootstrap-table').find('.fixed-table-toolbar').append('<div class="tableToolbar pull-right search"><label>Search By:</label><div class="toolbarWidget" id="searchColumn"></div></div>');
						$('#searchColumn').textDropdown({
							values: sortColumns,
							value: sortColumns[0].name,
							changed: function(widget) {
								
								$('.search input[placeholder="Search"]').val('');
								$('#' + divName + 'Placeholder').bootstrapTable('refresh');
							}
						});
					}

                    if(options.bulkAssignment) {
                        var bulkAssignableTarget = resourceType + 'BulkAssignable';
                        if($('#' + bulkAssignableTarget).length == 0) {
                            $('#' + divName).append('<div id="' + bulkAssignableTarget + '"></div>');
                        }

                        $('.' + divName).closest('.bootstrap-table').find('.fixed-table-toolbar').find('.btn-group').first().prepend('<button id="'
                                + divName + 'BulkTableAction" class="btn btn-default" title="'
                                + getResource('bulk.assignment.tab.title') + '"><i class="fa fa-exchange"></i></button>');


                        $('#' + divName + 'BulkTableAction').hide();

                        $('#' + divName + 'BulkTableAction').click(function(){
                            var bulkAction = $('#' + bulkAssignableTarget).bulkAssignmentDialog({
                                resource : resourceType,
                                modalCallback : function(data) {$('#' + divName + 'Placeholder').bootstrapTable('refresh');}
                            });
                            bulkAction.show();
                        });
                    }

					if(options.toolbarButtons) {
						$.each(options.toolbarButtons, function(idx, action) {
							$('.' + divName).closest('.bootstrap-table').find('.fixed-table-toolbar').find('.btn-group').first().prepend('<button id="' 
									+ divName + action.resourceKey + 'TableAction" class="btn btn-default" data-toggle="tooltip" title="' 
									+ getResource(action.resourceKey + '.label') + '"><i class="fa ' 
									+ action.icon + '"></i></button>');
							
							$('#' + divName + action.resourceKey + 'TableAction').on('click', function(e) {
								if(action.action) {
									action.action($('#' + divName + 'Placeholder').bootstrapTable('getAllSelections'), function() {
										$('#' + divName + 'Placeholder').bootstrapTable('refresh');
										checkBadges(false);
									});
								}
							});
						});
					}
					$('.' + divName).closest('.bootstrap-table').find('.fixed-table-toolbar').last().append('<div id="searchRendered' + divName + '"></div>');
		    	}
		    },
		    onLoadSuccess: function() {
		    	
		    	if (options.logo) {
		    		
		    		log("Rendering logo");
		    		
		    		$('#' + divName + 'Placeholder').parent().append('<div id="' + divName + 'Grid" class="fixed-table-container" style="padding-bottom: 0px; display: none;"></div>');
		    		
		    		var gridResourceList = $('#' + divName + 'Placeholder').bootstrapTable('getData');
		    		if(!gridResourceList.length){
		    			$('#' + divName + 'Grid').append('<div class="no-records-found">' + getResource('text.noMatchingRecords') + '</div>');
		    		}else{
		    		    var roleTestResource = gridResourceList[0];
		    		    if(options.bulkAssignment && typeof roleTestResource.roles != 'undefined') {
		    		        $('#' + divName + 'BulkTableAction').show();
		    		    }

		    			$.each(gridResourceList, function(index, resource){
							var prefix = "logo://";
							var value = resource.logo;
							var itype = options.logoResourceTypeCallback ? options.logoResourceTypeCallback(resource) : 'default';
							if(!resource) {
								return;
							}
							if(!value) {
								value = 'logo://100_autotype_autotype_auto.png';
							}
							
							if(value.slice(0, prefix.length) == prefix) {
								var txt = resource.name;
								if(!txt || txt == '')
									txt = 'Default';
								var uri = basePath + '/api/logo/' + encodeURIComponent(itype) + "/" + encodeURIComponent(txt) + '/' + value.slice(prefix.length);
								$('#' + divName + 'Grid').append('<div id="' + resource.id + 'GridDiv" class="template" style="float:left; height:180px;"><div><img width="100" height="100" src="' + uri + '"/></div><span>' + resource.name + '</span><div id="' + resource.id + 'GridOptions" class="gridOptions"></div></div>');
							}
							else {
								var idx = value.indexOf('/');
								if(idx == -1) {
									$('#' + divName + 'Grid').append('<div id="' + resource.id + 'GridDiv" class="template" style="float:left; height:180px;"><div><img width="100" height="100" src="' + (basePath + '/api/files/download/' + value)+ '"/></div><span>' + resource.name + '</span><div id="' + resource.id + 'GridOptions" class="gridOptions"></div></div>');
								} else {
									$('#' + divName + 'Grid').append('<div id="' + resource.id + 'GridDiv" class="template" style="float:left; height:180px;"><div><img width="100" height="100" src="' + (basePath + '/api/' + value)+ '"/></div><span>' + resource.name + '</span><div id="' + resource.id + 'GridOptions" class="gridOptions"></div></div>');
								}
							}
							$('#' + resource.id + 'GridOptions').hide();
							$('#' + resource.id + 'GridDiv').hover(function() {
								$('#' + resource.id + 'GridOptions').show();
							}, function() {
								$('#' + resource.id + 'GridOptions').hide();
							});
							var renderedActions = '';
							if (options.additionalActions) {

								if(!options.disableActionsDropdown && options.additionalActions.length > 1) {
									renderedActions += '<div id="gridDropdown_' + resource.id + '" class="btn-group"><a class="btn btn-success row-additional dropdown-toggle btn-action" data-toggle="dropdown" href="#"><i class="fa fa-gears"></i></a>';
									renderedActions += '<ul class="dropdown-menu dropdown-menu-right" role="menu">';
									$.each(options.additionalActions, function(x, act) {
										if (act.enabled) {
											renderedActions += '<li><a class="row-' + act.resourceKey + '" href="#"><span>' + getResource(act.resourceKey + ".label") + '</span>&nbsp;&nbsp;<i class="fa ' + act.iconClass + '"></i></a></li>';
						
											$(document).off('click', '#' + resource.id + 'GridOptions .row-' + act.resourceKey);
											$(document).on('click', '#' + resource.id + 'GridOptions .row-' + act.resourceKey, function() {
												act.action(resource, function(resource) {
													$('#' + divName + 'Placeholder').bootstrapTable('refresh');
													checkBadges(false);
												});
											});
										}
									});
									renderedActions += '</ul></div>';
									
									$(document).on('show.bs.dropdown', '#' + divName + 'GridActions' + resource.id, function () {
										var dropdown = $(this);
										$.each(options.additionalActions, function(x, act) {
											if(act.enabled) {
												if(act.displayFunction && act.displayFunction != '') {
													var display = window[act.displayFunction].apply(null, [resource, act]);
													var el = $('.row-' + act.resourceKey, dropdown);   
													if(display) {
														el.show();
													} else {
														el.hide();
													}
												}
												if(act.enableFunction && act.enableFunction != '') {
													if(!window[act.enableFunction].apply(null, [resource, act])) {
														var el = $('.row-' + act.resourceKey, dropdown);    
														el.parent().addClass('disabled');
														el.attr('disabled', true);
													}
												} 
											}
										});
									});
								}else{
									$.each(options.additionalActions, function(x, act) {
										if (act.enabled) {
											renderedActions += '<a class="btn ' + (act.buttonClass ? act.buttonClass : 'btn-success') + ' row-' 
													+ act.resourceKey + ' btn-action" href="#" data-toggle="tooltip" data-placement="top" title="' 
													+ getResource(act.resourceKey + ".label") + '"><i class="fa ' + act.iconClass + '"></i></a>';
											$(document).off('click', '#' + resource.id + 'GridOptions .row-' + act.resourceKey);
											$(document).on('click', '#' + resource.id + 'GridOptions .row-' + act.resourceKey, function() {
												act.action(resource, function(resource) {
													$('#' + divName + 'Placeholder').bootstrapTable('refresh');
													checkBadges(false);
												});
											});
										}
									});
								}
							}
							var canUpdate = options.canUpdate;
							if(options.checkUpdate) {
								canUpdate = options.checkUpdate(resource);
							}

							if(!options.disableEditView) {
								renderedActions += '<a class="btn btn-info row-edit btn-action" href="#"><i class="fa ' + (options.canUpdate && canUpdate && !resource.readOnly ? 'fa-edit' : 'fa-search') + '"></i></a>';
								$(document).off('click', '#' + resource.id + 'GridOptions .row-edit');
								$(document).on('click', '#' + resource.id + 'GridOptions .row-edit', function() {
									if(options.showEdit) {
										options.showEdit(resource);
									}
									if(options.canUpdate && canUpdate && !resource.readOnly) {
										options.view.editResource(resource);
									} else {
										options.view.viewResource(resource);
									}
								});
								$(document).off('click', '#' + resource.id + 'GridDiv img');
								$(document).on('click', '#' + resource.id + 'GridDiv img', function() {
									if(options.showEdit) {
										options.showEdit(resource);
									}
									if(options.canUpdate && canUpdate && !resource.readOnly) {
										options.view.editResource(resource);
									} else {
										options.view.viewResource(resource);
									}
								});
								
								if(options.canCopy) {
									renderedActions += '<a class="btn btn-info row-copy btn-action" href="#"><i class="fa fa-copy"></i></a>';
									$(document).off('click', '#' + resource.id + 'GridOptions .row-copy');
									$(document).on('click', '#' + resource.id + 'GridOptions .row-copy', function() {
										if(options.showCopy) {
											options.showCopy(resource);
										}
										options.view.copyResource(resource);
									});
								}
								
								$(document).off('click', '#' + resource.id + 'GridDiv img');
								$(document).on('click', '#' + resource.id + 'GridDiv img', function() {
									if(options.showEdit) {
										options.showEdit(resource);
									}
									if(options.canUpdate && canUpdate) {
										options.view.editResource(resource);
									} else {
										options.view.viewResource(resource);
									}
								});
								$('#' + resource.id + 'GridDiv img').css('cursor', 'pointer');
							}

							if (options.canDelete) {
								var canDelete = !resource.system;
								if(options.checkDelete) {
									canDelete = !resource.system && options.checkDelete(resource);
								}
								
								if(canDelete) {
									renderedActions += '<a class="btn btn-danger row-delete btn-action" href="#"><i class="fa fa-trash-o"></i></a>';
									$(document).off('click', '#' + resource.id + 'GridOptions .row-delete');
									$(document).on('click', '#' + resource.id + 'GridOptions .row-delete', function() {
										log("Entering resource delete for id " + resource.id);
										bootbox.confirm(getResource(options.resourceKey + ".delete.desc").format(resource.name), function(confirmed) {
											if (confirmed) {
												deleteJSON(options.resourceUrl + "/" + resource.id, null, function(data) {
													if (data.success) {
														if (options.resourceDeleted) {
															options.resourceDeleted(resource, data.message);
														}
														$('#' + divName + 'Placeholder').bootstrapTable('remove', {field: 'id', values: [resource.id]});
														$('#' + divName + 'Placeholder').bootstrapTable('refresh');
														checkBadges(false);
														showSuccess(data.message);
													} else {
														showError(data.message);
													}
												});
											}
										});
									});
								} else {
									renderedActions += '<a class="btn btn-disabled btn-action" href="#"><i class="fa fa-trash-o"></i></a>';
								}
							}
							$('#' + resource.id + 'GridOptions').append(renderedActions);
						});
						$('#' + divName + 'Grid').append('<div class="template" style="float:left; width:100%; height:0px;"></div>');
		    		}
				}
		    }
		});

		
		if(options.additionalButtons) {
			
			$.each(options.additionalButtons, function() {
				if(this.showButton && !this.showButton()) {
					return;
				}
				$('#' + divName + 'Actions').append(
					'<button id="' + this.resourceKey + '" class="btn ' + this.buttonClass + '"><i class="fa ' + this.icon + '"></i>' + getResource(this.resourceKey + '.label') + '</button>');
				var button = this;
				$('#' + this.resourceKey).click(function() {
					if(button.action) {
						button.action(function() {
							$('#' + divName + 'Placeholder').bootstrapTable('refresh');
							checkBadges(false);
						});
					}
				});
			});
		}
		
		var views = [];
		views.push({ id: 'table', div: '#' + divName + 'Placeholder', icon: 'fa-list'});
		if(options.logo) {
			views.push({ id: 'icon', div: '#' + divName + 'Grid', icon: 'fa-picture-o'});
		}

		if(options.additionalViews) {
			
			$.each(options.additionalViews, function(idx, view) {
				
				var viewDiv = divName + view.name;
				$('#' + divName + 'Placeholder').parent().append('<div id="' + viewDiv + '" class="fixed-table-container" style="padding-bottom: 0px;"></div>');
				$(view.div).detach().appendTo('#' + viewDiv);
				
				views.push({ id: view.id, div: '#' + viewDiv, icon: view.icon, onShow: view.onShow, onHide: view.onHide});
	
			});
		}
		
		var currentView;
		$.each(views, function(idx, obj) {
			if(obj.id === options.defaultView) {
				currentView = obj;
			}
			$(obj.div).hide();
			if(obj.onHide) {
				obj.onHide();
			}
		});
		
		if(!currentView) {
			currentView = views[0];
		}
	
		var i = 0;
		while(currentView.id !== views[0].id && i < views.length) {
			var v = views.pop();
			views.unshift(v);
			i++
		}

		$(views[0].div).show();
		if(views[0].onShow) {
			views[0].onShow();
		}
		$('#' + divName).find('.fixed-table-toolbar').find('.columns.columns-right.btn-group.pull-right').append('<button id="' 
				+ divName + 'ToggleGrid" class="btn btn-default" type="button" name="grid" title="' 
				+ getResource('text.toggleViewMode') + '"><i class="glyphicon fa ' + currentView.icon + '"></button>');
		
		
    	$('#' + divName + 'ToggleGrid').click(function(){
    		var prev = views[0];
    		var v = views.pop();
    		views.unshift(v);
    		$(this).find('i').removeClass(prev.icon);
    		$(this).find('i').addClass(views[0].icon);
    		$(prev.div).hide();
    		$(views[0].div).show();
    		if(views[0].onShow) {
    			views[0].onShow();
    		}
    	});
		
		if (options.complete) {
			options.complete();
		}
		
	});
		
	
	var callback = {
		refresh: function() {
			$('#' + divName + 'Placeholder').bootstrapTable('refresh');
			checkBadges(false);
		},
		close: function() {
			options.view.closeResource();
		},
		openPage: function(page) {
			options.view.openPage(page);
		},
		options: function() {
			return options;
		},
		showCreate: function(callback) {
			options.currentView = 'create';
			if(options.showCreate) {
				options.showCreate();
			}
			options.view.createResource(callback);
		},
		showEdit: function(resource, callback) {
			options.currentView = 'edit';
			if(options.showEdit) {
				options.showEdit(resource);
			}
			options.view.editResource(resource);
		},
		showRead: function(resource, callback) {
			options.currentView = 'read';
			if(options.showView) {
				options.showView(resource);
			}
			options.view.viewResource(resource);
		},
		showCopy: function(resource, callback) {
			options.currentView = 'copy';
			if(options.showCopy) {
				options.showCopy(resource);
			}
			options.view.copyResource(resource);
		},
		saveResource: function(buttonElement, closeCallback) {
			saveResource(options.createResource(), buttonElement, options, options.currentView, closeCallback);
		},
		deleteResource: function(resource, callback) {
			if (options.canDelete) {
				var canDelete = !resource.system;
				if(options.checkDelete) {
					canDelete = !resource.system && options.checkDelete(resource);
				}
				
				if(canDelete) {
					log("Entering resource delete for id " + resource.id);
					bootbox.confirm(getResource(options.resourceKey + ".delete.desc").format(resource.name), function(confirmed) {
						if (confirmed) {
							deleteJSON(options.resourceUrl + "/" + resource.id, null, function(data) {
								if (data.success) {
									if (options.resourceDeleted) {
										options.resourceDeleted(resource, data.message);
									}
									$('#' + divName + 'Placeholder').bootstrapTable('remove', {field: 'id', values: [resource.id]});
									$('#' + divName + 'Placeholder').bootstrapTable('refresh');
									showSuccess(data.message);
									checkBadges(false);
								} else {
									showError(data.message);
								}
							});
						}
					});
				}
			}
		}
	}
	
	$(this).data('callback', callback);
	return callback;
};

$.fn.resourcePage = function() {
	return $(this).data('callback');
}

$.fn.samePageResourceView = function(params, params2) {

	var dialog = $(this);
	var dialogOptions = $(this).data('options');
	
	var addActions = function(save, copy) {
		
		var html = '<div class="panel-footer">';
		html+= '<button id="' + dialog.attr('id') + 'Cancel" + class="btn btn-danger"><i class="fa fa-ban"></i>' + getResource('text.cancel') + '</button>';
		if(save) {
			html += '<button id="' + dialog.attr('id') + 'Save" + class="btn btn-primary"><i class="fa fa-save"></i>' + getResource('text.save') + '</button>';
		}
		html += '</div>';
		dialog.find('.panel-body').first().after(html);
		
		if(save) {
			$('#' + dialog.attr('id') + 'Save').click(function() {
				var resource = dialogOptions.createResource();
				if(copy) {
					resource.id = null;
				}
				saveResource(resource, $('#' + dialog.attr('id') + 'Save'), dialogOptions, params, function() {
					if(dialogOptions.stayOnPageAfterSave) {
						if(dialogOptions.onSave)
							dialogOptions.onSave(resource);
					}
					else {
						dialog.samePageResourceView('close');
						if (dialogOptions.hasResourceTable) {
							$('#' + dialogOptions.divName + 'Placeholder').bootstrapTable('refresh');
						}
					}
					if(dialogOptions.resourceSaved) {
						dialogOptions.resourceSaved(resource);
					}
				});
			});
		}
		$('#' + dialog.attr('id') + 'Cancel').click(function() {
			dialog.samePageResourceView('close');
		});
	
	}
	
	var showView = function(view) {
		$('#mainContainer').removeClass('col-md-10');
		$('#mainContainer').addClass('col-md-12');
		$('#mainContainer').removeClass('col-sm-11');
		$('#mainContainer').addClass('col-sm-12');
		$('#main-menu').hide();
		$('#mainContent').hide();
		//dialogOptions.tableView.hide();
		view.show();
	}
	
	if(params === 'open') {
		
		$('#mainContainer').append('<div id="pageContent"></div>');
		$('#pageContent').load(params2);
		showView($('#pageContent'));
		
	} else if (params === 'create') {
		
		dialogOptions.clearDialog(true);
		if(dialogOptions.propertyOptions) {
			var propertyOptions = $.extend({},
					dialogOptions.propertyOptions,
					{ url: dialogOptions.propertyOptions.templateUrl,
				      title: getResource(dialogOptions.resourceKey + '.create.title').formatAll(dialogOptions.propertyOptions.resourceArgsCallback ? dialogOptions.propertyOptions.resourceArgsCallback(params2) : dialogOptions.propertyOptions.resourceArgs),
				      icon: dialogOptions.icon,
					  complete: function() {
						  showView(dialog);
						  if(dialogOptions.propertyOptions.complete) {
							  dialogOptions.propertyOptions.complete();
						  }
						  addActions(true);
						  
					  }	
			});
			if(dialogOptions.propertyOptions.additionalTabs) {
				$.each(dialogOptions.propertyOptions.additionalTabs, function(idx, obj) {
					$('body').append($('#' + obj.id).detach());
				});
			}
			$(dialogOptions.propertyOptions.propertySelector).empty();
			$(dialogOptions.propertyOptions.propertySelector).propertyPage(propertyOptions);
		} else {
			showView(dialog);
			addActions(true);
		}
		
		return;
		
	} else if(params === 'edit') {
		
		dialogOptions.clearDialog(false);
		dialogOptions.displayResource(params2, false);
		
		if(dialogOptions.propertyOptions) {
			var propertyOptions = $.extend({},
					dialogOptions.propertyOptions,
					{ url: dialogOptions.propertyOptions.propertiesUrl + params2.id,
					  title: getResource(dialogOptions.resourceKey + '.update.title').formatAll(dialogOptions.propertyOptions.resourceArgsCallback ? dialogOptions.propertyOptions.resourceArgsCallback(params2) : dialogOptions.propertyOptions.resourceArgs),
					  icon: dialogOptions.icon,
				  	  complete: function() {
						  showView(dialog);
						  if(dialogOptions.propertyOptions.complete) {
							  dialogOptions.propertyOptions.complete(params2);
						  }
						  addActions(true);
						  
					  }	
			});
			if(dialogOptions.propertyOptions.additionalTabs) {
				$.each(dialogOptions.propertyOptions.additionalTabs, function(idx, obj) {
					$('body').append($('#' + obj.id).detach());
				});
			}
			$(dialogOptions.propertyOptions.propertySelector).empty();
			$(dialogOptions.propertyOptions.propertySelector).propertyPage(propertyOptions);
		} else {
			showView(dialog);
			addActions(true);
		}
		
		return;
		
	} else if(params === 'read') {
		
		dialogOptions.clearDialog(false);
		dialogOptions.displayResource(params2, true);
		if(dialogOptions.propertyOptions) {
			var propertyOptions = $.extend({},
					dialogOptions.propertyOptions,
					{ url: dialogOptions.propertyOptions.propertiesUrl + params2.id,
				      title: getResource(dialogOptions.resourceKey + '.view.title'),
				      icon: dialogOptions.icon,
				      canUpdate: false,
					  complete: function() {
						  showView(dialog);
						  if(dialogOptions.propertyOptions.complete) {
							  dialogOptions.propertyOptions.complete(params2);
						  }
						  addActions(false);
						  
					  }	
			});
			if(dialogOptions.propertyOptions.additionalTabs) {
				$.each(dialogOptions.propertyOptions.additionalTabs, function(idx, obj) {
					$('body').append($('#' + obj.id).detach());
				});
			}
			$(dialogOptions.propertyOptions.propertySelector).empty();
			$(dialogOptions.propertyOptions.propertySelector).propertyPage(propertyOptions);
		} else {
			showView(dialog);
			addActions(false);
		}
		
		return;
		
	} else if(params === 'copy') {
		
		if(dialogOptions.remoteCopy) {
			getJSON(dialogOptions.copyUrl + "/" + params2.id, null, function(data) {

				if (data.success) {
					log("Resource copied");
					$('#' + dialogOptions.divName + 'Placeholder').bootstrapTable('refresh');
					checkBadges(false);
					showSuccess(data.message);
				} else {
					log(data.message);
					showError(data.message);
				}
			});
		} else {
			dialogOptions.clearDialog(false);
			var copiedResource = $.extend(true, {}, params2);
			copiedResource.name = copiedResource.name + " (" + getResource('text.copy') + ")";
			dialogOptions.displayResource(copiedResource, false, true);
			if(dialogOptions.propertyOptions) {
				var propertyOptions = $.extend({},
						dialogOptions.propertyOptions,
						{ url: dialogOptions.propertyOptions.propertiesUrl + copiedResource.id,
					      title: getResource(dialogOptions.resourceKey + '.create.title'),
					      icon: dialogOptions.icon,
						  complete: function() {
							  showView(dialog)
							  if(dialogOptions.propertyOptions.complete) {
								  dialogOptions.propertyOptions.complete(copiedResource);
							  }
							  addActions(true, true);
						  }	
				});
				if(dialogOptions.propertyOptions.additionalTabs) {
					$.each(dialogOptions.propertyOptions.additionalTabs, function(idx, obj) {
						$('body').append($('#' + obj.id).detach());
					});
				}
				$(dialogOptions.propertyOptions.propertySelector).empty();
				$(dialogOptions.propertyOptions.propertySelector).propertyPage(propertyOptions);
			} else {
				showView(dialog);
				addActions(true, true);
			}
		}
		
		return;
	} else if(params === 'close') {
		
		if(dialogOptions) {
			dialog.hide();
			if(dialogOptions.onClose) {
				dialogOptions.onClose();
			}
			
			dialogOptions.parent.show();
		}
		
		$('#mainContainer').removeClass('col-md-12');
		$('#mainContainer').addClass('col-md-10');
		$('#mainContainer').removeClass('col-sm-12');
		$('#mainContainer').addClass('col-sm-11');
		$('#main-menu').show();
		$('#mainContent').show();
		window.scrollTo(0,0);
		return;
	}
	
	var parent = $(this).parent();
	dialog.hide();
	$('#mainContent').after(dialog.detach());
	
	var options = $.extend(
			{ hasResourceTable : true,
			  parent: parent, },
			  params);
	
	dialog.data('options', options);
	
	return {
		openPage: function(page) {
			dialog.samePageResourceView('open', page);
		},
		createResource: function(callback) {
			dialog.samePageResourceView('create', callback);
		},
		editResource: function(resource) {
			dialog.samePageResourceView('edit', resource);
		},
		viewResource: function(resource) {
			dialog.samePageResourceView('read', resource);
		},
		copyResource: function(resource) {
			dialog.samePageResourceView('copy', resource);
		},
		closeResource: function() {
			dialog.samePageResourceView('close');
		}
	};
};


$.fn.bulkAssignmentDialog = function(options) {
    var dialog = $(this);
    var parent = $(this).parent();

    options = $.extend({tabResourceLabel : 'bulk.assignment.resource.label',
                        tabRoleLabel : 'bulk.assignment.role.label',
                        tabModeLabel : 'bulk.assignment.mode.label',
                        modeInputLabel : 'bulk.assignment.input.mode.label',
                        modeInputInfo : 'bulk.assignment.input.mode.info',
                        tabTitle : 'bulk.assignment.tab.title'}, options);

    var id = $(this).attr('id');
    var resource = options.resource;

    if(typeof $(this).data('options') == 'undefined') {
        $(this).data('options', $.extend({init : true}, options));
        var dataOptions = $(this).data('options');

        $(this).empty();
        var modalForm = '<div class="modal" id="' + id + 'Form" tabindex="-1" role="dialog" dialog-for="' + id + '">' +
                '<div class="modal-dialog">' +
                    '<div class="modal-content">' +
                        '<div class="modal-header">' +
                            '<button type="button" class="close" data-dismiss="modal"' +
                                    'aria-hidden="true">&times;</button>' +
                            '<h4 class="modal-title">' + getResource(dataOptions.tabTitle)  + '</h4>' +
                        '</div>' +
                        '<div class="modal-body">' +
                            '<div id="' + id + 'TabContent">' +
                                '<div id="' + id + 'Tabs"></div>' +
                                '<div id="' + id + 'TabResources"><div class="col-xs-12" id="' + id + 'ResourceComponent"></div></div>' +
                                '<div id="' + id + 'TabRoles"><div class="col-xs-12" id="' + id + 'RoleComponent"></div></div>' +
                                '<div id="' + id + 'TabMode" class="col-xs-12"></div>' +
                            '</div>' +
                        '</div>' +
                        '<div class="modal-footer"></div>' +
                    '</div>' +
                '</div>' +
            '</div>';
        $(this).html(modalForm);

        $(this).find('.modal-footer').empty();
        $(this).find('.modal-footer').append(
                    '<button type="button" id="' + id + 'Action" class="btn btn-primary"><i class="fa fa-save"></i>' + getResource("text.update") + '</button>');
        $('#' + id + "Action").off('click');

        $('#' + id + "Action").on('click', function() {
            var bulkAssignment = new Object();
            bulkAssignment.roleIds = $('#' + id + 'RoleComponent').multipleSelectValues();
            bulkAssignment.resourceIds = $('#' + id + 'ResourceComponent').multipleSelectValues();
            var mode = $('#' + id + 'ModeComponentInput').data('widget').getValue();
            bulkAssignment.mode =  mode == '' ? "0" : mode;

            if(valid(bulkAssignment)) {
                postJSON(resource + '/bulk', bulkAssignment, function(data) {
                    if(data.success) {
                        showSuccess(data.message);
                    } else {
                        showError(data.message);
                    }
                    if(typeof options.modalCallback != "undefined") {
                        options.modalCallback(data);
                    }
                    $('#' + id + 'Form').modal('hide');
                });
            }
        });

        $('#' + id + 'Tabs').tabPage({
            title : '',
            icon : 'fa-cog',
            tabs : [ {
                id : id + "TabResources",
                name : getResource(dataOptions.tabResourceLabel)
            }, {
                id : id + "TabRoles",
                name : getResource(dataOptions.tabRoleLabel)
            }, {
                 id : id + "TabMode",
                 name : getResource(dataOptions.tabModeLabel)
             }],
            complete : function() {
                loadComplete();
            }
        });

        var modeComponent = '<div id="' + id + 'ModeComponent" class="propertyItem form-group">' +
                            '<label id="' + id  + 'ModeComponentInputLabel" for="' + id + 'ModeComponentInput" class="col-md-3 control-label optionalField">' + getResource(dataOptions.modeInputLabel) + '</label>' +
                            '<div class="propertyValue col-md-9">' +
                            '<div id="' + id +'ModeComponentInput"></div><div class="clear">'+
                            '<span class="help-block">' + getResource(dataOptions.modeInputInfo) + '</span></div></div></div>';
        $('#' + id + 'TabMode').empty().append(modeComponent);

    }

    var valid = function(bulkAssignment) {
        if(bulkAssignment.roleIds.length == 0) {
            showError(getResource('bulk.assignment.error.no.resource'));
            return false;
        }
        if(bulkAssignment.resourceIds.length == 0) {
            showError(getResource('bulk.assignment.error.no.role'));
            return false;
        }
        return true;
    }

    var show = function() {
        $.when(
            getJSON(resource + '/list', null, function(data) {
                $('#' + id + 'ResourceComponent').multipleSelect({
                    values : data.resources
                });
            }),
            getJSON('roles/list', null, function(data) {
               $('#' + id + 'RoleComponent').multipleSelect({
                    values : data.resources
                });
            }),
            getJSON('enum/displayable/com.hypersocket.bulk.BulkAssignmentMode/', null, function(data) {
               $('#' + id + 'ModeComponentInput').empty();
               $('#' + id + 'ModeComponentInput').selectButton({options: data.resources,
                    valueAttr : 'id',
                    nameAttr : 'display'}
               );
            })
        ).then(function(){
            $('#' + id + 'Form').modal('show');
            $('#' + id + ' a:first').tab('show')
        });
    }

    return {
        show : show
    }

}
$.fn.bootstrapResourceDialog = function(params, params2) {

	var dialog = $(this);
	var parent = $(this).parent();
	var options = $.extend(
		{ dialogWidth : 700, dialogHeight : 'auto', hasResourceTable : true },
		params);
	var dialogOptions = $(this).data('options');

	if (params === 'create') {

		log("Creating resource dialog");

		dialogOptions.clearDialog(true);
		removeMessage();

		if(dialogOptions.propertyOptions)
			$(this).find('.modal-title').text(
					getResource(dialogOptions.resourceKey + '.create.title').formatAll(dialogOptions.propertyOptions.resourceArgsCallback ? dialogOptions.propertyOptions.resourceArgsCallback(params2) : dialogOptions.propertyOptions.resourceArgs));
		else
			$(this).find('.modal-title').text(getResource(dialogOptions.resourceKey + '.create.title'));

		$(this).find('.modal-footer').empty();
		$(this).find('.modal-footer').append(
					'<button type="button" id="' + $(this).attr('id') + 'Action" class="btn btn-primary"><i class="fa fa-save"></i>' + getResource("text.create") + '</button>');
		$('#' + $(this).attr('id') + "Action").off('click');

		$('#' + $(this).attr('id') + "Action").on('click', function() {				
			saveResource(dialogOptions.createResource(), $(this), dialogOptions, 'create', function() {
				dialog.bootstrapResourceDialog('close');
				if (dialogOptions.hasResourceTable) {
					$('#' + dialogOptions.divName + 'Placeholder').bootstrapTable('refresh');
				}
				if(dialogOptions.resourceSaved) {
					dialogOptions.resourceSaved(resource);
				}
			});

		});
		dialog.modal('show');
		return;

	} else if (params === 'edit' || params === 'read' || params === 'copy') {
		var readOnly = params==='read';
		dialogOptions.clearDialog(false);
		removeMessage();
		
		if(params === 'copy') {
			if(dialogOptions.remoteCopy) {
				var copiedResource = $.extend(true, {}, params2);
				postJSON(dialogOptions.copyUrl + '/' + params2.id, null, function(data) {
	
					if (data.success) {
						log("Resource copied");
						$('#' + dialogOptions.divName + 'Placeholder').bootstrapTable('refresh');
						checkBadges(false);
						showSuccess(data.message);
					} else {
						log(data.message);
						showError(data.message);
					}
				});
			} else {
				var copiedResource = $.extend(true, {}, params2);
				copiedResource.name = copiedResource.name + ' (' + getResource('text.copy') + ')';
				dialogOptions.displayResource(copiedResource, readOnly, true);
			}
		} else {
			dialogOptions.displayResource(params2, readOnly, false);
		}
		if(readOnly) {
			$(this).find('.modal-title').text(
					getResource(dialogOptions.resourceKey + '.view.title'));
		} else {
			$(this).find('.modal-title').text(
					getResource(dialogOptions.resourceKey + '.update.title'));
		}

		if(dialogOptions.propertyOptions) {
			if(readOnly)
				$(this).find('.modal-title').text(
						getResource(dialogOptions.resourceKey + '.view.title').formatAll(dialogOptions.propertyOptions.resourceArgsCallback ? dialogOptions.propertyOptions.resourceArgsCallback(params2) : dialogOptions.propertyOptions.resourceArgs));
			else
				$(this).find('.modal-title').text(
						getResource(dialogOptions.resourceKey + '.update.title').formatAll(dialogOptions.propertyOptions.resourceArgsCallback ? dialogOptions.propertyOptions.resourceArgsCallback(params2) : dialogOptions.propertyOptions.resourceArgs));
		
		} else {
			if(readOnly)
				$(this).find('.modal-title').text(getResource(dialogOptions.resourceKey + '.view.title'));
			else 
				$(this).find('.modal-title').text(getResource(dialogOptions.resourceKey + '.update.title'));

		}

		$(this).find('.modal-footer').empty();
		if(!readOnly) {
			
			if(!dialogOptions.disableUpdateButton) {
				$(this).find('.modal-footer').append(
						'<button type="button" id="' + $(this).attr('id') + 'Action" class="btn btn-primary"><i class="fa fa-save"></i>' 
						+ getResource("text.update") + '</button>');
			}
			
			if(dialogOptions.buildUpdateButtons) {
				dialogOptions.buildUpdateButtons(params2, function(button, onclick) {
					dialog.find('.modal-footer').append(
							'<button type="button" id="' + button.id + 'Action" class="updateButton btn ' 
							+ button.cssClass + '"><i class="fa ' 
							+ button.icon + '"></i>' 
							+ getResource(button.resourceKey) + '</button>');
					$('#' + button.id + 'Action').click(function() {
						onclick(button, $('#' + button.id + 'Action'));
					});
				});
			}
			
			$('#' + $(this).attr('id') + "Action").off('click');
			$('#' + $(this).attr('id') + "Action").on('click', function() {

				var resource = dialogOptions.createResource();
				if(params === 'copy') {
					resource.id = null;
					saveResource(resource, $(this), dialogOptions, params, function() {
						dialog.bootstrapResourceDialog('close');
						if (dialogOptions.hasResourceTable) {
							$('#' + dialogOptions.divName + 'Placeholder').bootstrapTable('refresh');
						}
						if(dialogOptions.resourceSaved) {
							dialogOptions.resourceSaved(resource);
						}
					});
				} else {
					saveResource(resource, $(this), dialogOptions, params, function() {
						dialog.bootstrapResourceDialog('close');
						if (dialogOptions.hasResourceTable) {
							$('#' + dialogOptions.divName + 'Placeholder').bootstrapTable('updateByUniqueId',	{ id: resource.id, row: resource });
							$('#' + dialogOptions.divName + 'Placeholder').bootstrapTable('refresh');
						}
						if (dialogOptions.resourceUpdated) {
							dialogOptions.resourceUpdated(resource);
						}
						if(dialogOptions.resourceSaved) {
							dialogOptions.resourceSaved(resource);
						}
						if(params2.resourceUpdated) {
							params2.resourceUpdated(resource);
						}
					});
				}

			});
		}
		
		dialog.modal('show');
		return;

	} else if (params === 'close') {
		dialog.modal('hide');
		return;
	} else if (params === 'error') {
		if(params2 == 'reset') {
			removeMessage();
		} else {
			showError(params2);
		}
		return;
	} else {
		if (!options.resourceKey) {
			alert("Bad usage, resourceKey not set");
		} else {
			$(this).data('options', options);
		}
	}
	
	return {
		createResource: function(callback) {
			dialog.bootstrapResourceDialog('create', callback);
		},
		editResource: function(resource) {
			dialog.bootstrapResourceDialog('edit', resource);
		},
		viewResource: function(resource) {
			dialog.bootstrapResourceDialog('read', resource);
		},
		copyResource: function(resource) {
			dialog.bootstrapResourceDialog('copy', resource);
		},
		closeResource: function() {
			dialog.bootstrapResourceDialog('close');
		}
	};
};