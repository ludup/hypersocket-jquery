// Main content div
var contentDiv = '#content';
var currentMenu = null;
var currentRealm = null;

// jQuery plugin for Spinner control
$.fn.spin = function(opts) {
	this
			.each(function() {
				var $this = $(this), data = $this.data();

				if (data.spinner) {
					data.spinner.stop();
					delete data.spinner;
				}
				if (opts !== false) {
					data.spinner = new Spinner($.extend({ color : $this.css('color') },
						opts)).spin(this);
				}
			});
	return this;
};

$.ajaxSetup({ error : function(xmlRequest) {

	log("AJAX ERROR: " + xmlRequest.status);

	if (xmlRequest.status == 401) {
		$(document).data('session', null);
		showLogon(null, getResource("error.sessionTimeout"));
	}
}, cache : false });

$.fn.prepareProperty = function(opts, id, originalValue, resourceKey) {
	// Setup the object, merge with defaults
	$(this).data('created', true);
	$(this).data('id', id);
	$(this).data('resourceKey', resourceKey);
	$(this).data('originalValue', originalValue);
	$(this).data('metaData', opts);
	$(this).data('updated', false);
	$(this).data('options', opts);
	if (opts.isPropertyInput && !$(this).hasClass('propertyInput')) {
		$(this).addClass('propertyInput');
	}

};

$.fn.revertProperty = function() {

	if ($(this).data('isMultipleSelect')) {
		$(this).multipleSelect();
	} else if ($(this).data('isMultipleTextInput')) {
		$(this).multipleTextInput();
	} else {
		var val = $(this).data('originalValue');
		$(this).val(val);
		if ($(this).hasClass('switch-input')) {
			val = (val == 'true' ? true : false);
			var checked = $(this).prop('checked');
			log($(this).attr('id') + ' checked=' + checked + ' and has value ' + val);
			if (checked != val) {
				$(this).trigger('click');
			}
		}
		$(this).attr('checked', val ? 'checked' : '');
		$(this).data('updated', false);
	}
	
	var meta = $(this).data('options');
	
	if(meta.inputType=='slider') {
		$(this).first('.propertyInput').slider('setValue', $(this).data('originalValue'));
	} else if(meta.inputType=='css' 
		|| meta.inputType=='java' 
			|| meta.inputType=='javascript'
				|| meta.inputType=='html'
					|| meta.inputType=='xml'
						|| meta.inputType=='sql') {
		
		var codeMirror = $(this).data('codeMirror');
		
		codeMirror.setValue($(this).data('originalValue'));
		
		setTimeout(function() {
			codeMirror.refresh();
    	},1);
	} 
};

$.fn.clearProperty = function() {
	$(this).val('');
	$(this).data('updated', false);
};

$.fn.markUpdated = function() {
	$(this).data('updated', true);
};

$.fn.isUpdated = function() {
	return $(this).data('updated');
};

$.fn.propertyId = function() {
	return $(this).data('id');
};

$.fn.resourceKey = function() {
	return $(this).data('resourceKey');
};

// jQuery validate plugin for metaData input tags
$.fn.validateProperty = function() {

	obj = $(this).data('metaData');

	log("Validating " + $(this).data('resourceKey'));
	if (obj.inputType == 'number') {
		return (parseInt(obj.minValue) <= parseInt($(this).val()) && parseInt(obj.maxValue) >= parseInt($(this).val()));
	} else if (obj.inputType == 'textarea') {
		return true;
	} else if (obj.inputType == 'text') {
		return true;
	} else if (obj.inputType == 'select') {
		return true;
	} else if (obj.inputType == 'password') {
		return true;
	} else if (obj.inputType == 'multipleSelect') {
		return true;
	} else if (obj.inputType == 'multipleTextInput') {
		return true;
	} else if (obj.inputType == 'boolean') {
		return true;
	} else if (obj.inputType == 'image') {
		return true;
	} else if (obj.inputType == 'switch') {
		return true;
	} else if (obj.inputType == 'css') {
		return true;
	} else if (obj.inputType == 'java') {
		return true;
	} else if (obj.inputType == 'javascript') {
		return true;
	} else if (obj.inputType == 'html') {
		return true;
	} else if (obj.inputType == 'xml') {
		return true;
	} else if (obj.inputType == 'sql') {
		return true;
	} 

	log("Validation failed for " + $(this).data('resourceKey'));
	return false;
};

$.fn.propertyPage = function(opts) {

	log("Creating property page for div " + $(this).attr('id'));

	var propertyDiv = $(this).attr('id');
	
	var options = $
			.extend(
				{ showButtons : true, displayMode: '', canUpdate : false, title : '', icon : 'fa-th', propertyTabsLast: true },
				opts);

	$('body').append('<div id="tabTemp' + propertyDiv + '"/>');
	$('#tabTemp' + propertyDiv).hide();
	if (options.additionalTabs) {
		$.each(options.additionalTabs, function(idx, obj) {
			$('#' + obj.id).appendTo('#tabTemp' + propertyDiv);
		});
	}
	$(this).empty();
	

	getJSON(
		options.url,
		null,
		function(data) {

			contentTabs = '#' + propertyDiv + 'Tabs';
			contentActions = '#' + propertyDiv + 'Actions';
			revertButton = '#' + propertyDiv + 'Revert';
			applyButton = '#' + propertyDiv + 'Apply';
			panel = '#' + propertyDiv + 'Panel';

			$('#' + propertyDiv)
					.append(
						'<div id="' + propertyDiv + 'Panel" class="panel panel-default"><div class="panel-heading"><h2><i class="fa ' 
						+ options.icon + '"></i><span class="break"></span>' + options.title + '</h2><ul id="' 
						+ propertyDiv + 'Tabs" class="nav nav-tabs"/></div><div class="panel-body"><div id="' 
						+ propertyDiv + 'Content" class="tab-content"></div></div></div>');

			if (options.showButtons) {
				$(panel)
						.append(
							'<div id="' + propertyDiv + 'Actions" class="panel-footer tabActions"><button class="btn btn-small btn-danger" id="' 
							+ propertyDiv + 'Revert"><i class="fa fa-ban"></i>' + getResource('text.revert')
							+ '</button><button class="btn btn-small btn-primary" id="' + propertyDiv 
							+ 'Apply"><i class="fa fa-check"></i>' + getResource('text.apply') + '</button></div>');
			}

			var first = true;
			
			var createAdditionalTabs = function() {
				$.each(options.additionalTabs,
						function(idx, o) {
							$(contentTabs)
									.append(
										'<li id="' + this.id + 'Li"><a href="#' + this.id + '" class="' +  propertyDiv + 'Tab ' +  propertyDiv + 'Tab2"><span>' + this.name + '</span></a></li>');
							$('#' + this.id).appendTo('#' + propertyDiv + 'Content');
							$('#' + this.id).addClass('tab-pane');
						});
			};
			
			if (options.additionalTabs && options.propertyTabsLast) {
				createAdditionalTabs();
			}
			
			if(data.resources) {
				$.each(	data.resources,
							function() {

								if(this.displayMode && this.displayMode != '') {
									if(this.displayMode != options.displayMode) {
										return;
									}
								}
								tab = "tab" + this.id;
								$(contentTabs)
										.append(
											'<li><a ' + (first ? 'class="active ' +  propertyDiv + 'Tab"' : 'class="' +  propertyDiv + 'Tab"')
											+ ' href="#' + tab + '"><span>' + getResource(this.categoryKey + '.label') + '</span></a></li>');
								first = false;
	
								$('#' + propertyDiv + 'Content').append(
									'<div id="' + tab + '" class="tab-pane"/>');
								
								// Overwrite template values with any items passed in options
								var values = [];
								if(options.items) {
									$.each(options.items, function() {
										values[this.id] = this.value;
									});
								}
								
								var toSort = [];
								$.each(this.templates, function() {
									if(values[this.resourceKey]) {
										this.value = values[this.resourceKey];
									}
									toSort.push(this);
								});
	
								
								toSort.sort(function(a, b) {
									if (a.weight < b.weight) {
										return -1;
									} else if (a.weight > b.weight) {
										return 1;
									}
									return 0;
								});
	
								$.each(toSort, function() {

										x = JSON.parse(this.metaData);
										var obj = $.extend(
											{ restart : false, nameIsResourceKey : false, readOnly: false, disabled: false }, x);

										if(obj.inputType!='hidden') {
											$('#' + tab).append('<div class="propertyItem form-group" id="' + tab + '_item' + this.id + '"/>');
											$('#' + tab + '_item' + this.id).append('<label class="col-md-3 control-label">' + getResource(this.resourceKey) + '</label>');
											$('#' + tab + '_item' + this.id).append('<div class="propertyValue col-md-9" id="' + tab + '_value' + this.id + '"></div>');
										}
										// Following vars are
										// needed for some
										// aysnchronous calls
										var inputId = this.id;
										var inputTab = tab;
										var inputObj = this;
										if (obj.inputType == 'textarea') {
											if(options.variables) {
												$('#' + tab + '_value' + this.id).textInputWithVariables({
													id: this.id,
													type: 'textarea',
													variables: options.variables,
													resourceKey: this.resourceKey,
													value: stripNull(this.value),
													metaData: obj
												});
											} else {
												$('#' + tab + '_value' + this.id).append(
														'<textarea ' + (options.canUpdate && !obj.readOnly && !obj.disabled ? '' : 'disabled="disabled" ')
														+ 'class="form-control propertyInput" id="' + tab + '_input' + this.id + '" name="input' 
														+ this.id + '" cols="' + (obj.cols ? obj.cols : 30) + '" rows="' + (obj.rows ? obj.rows : 5) 
														+ '" maxlength="' + obj.maxlength + '">' + stripNull(this.value) + '</textarea>');
											}
										} else if(obj.inputType == 'css' || obj.inputType == 'javascript' || obj.inputType=='java') {
									    	
									    	$('#' + tab + '_value' + this.id).append('<div class="code form-control propertyInput" id="' + tab + '_input' + this.id + '"></div>');
									    	var myCodeMirror = CodeMirror(document.getElementById(tab + '_input' + this.id), {
												  value: this.value,
												  mode:  obj.inputType=='java' ? 'text/java' : obj.inputType,
												  lineNumbers: obj.lineNumbers
											});
									    	
									    	myCodeMirror.on("change", function(cm, change) {
									    		
												  $('#' + tab + '_input' + this.id).markUpdated();
												  if (options.showButtons) {
														$(revertButton).attr('disabled', false);
														$(applyButton).attr('disabled', false);
												  }
									    	});
									    	
									    	$('#' + tab + '_input' + this.id).data('codeMirror', myCodeMirror);
									    	$('#' + tab + '_input' + this.id).show();
									    	
									    	setTimeout(function() {
									    	    myCodeMirror.refresh();
									    	},1);
									    } else if(obj.inputType == 'xml' || obj.inputType == 'html') {
									    	
									    	$('#' + tab + '_value' + this.id).append('<div class="code form-control propertyInput" id="' + tab + '_input' + this.id + '"></div>');
									    	var myCodeMirror = CodeMirror(document.getElementById(tab + '_input' + this.id), {
												  value: this.value,
												  htmlMode: obj.inputType=='html',
												  mode:  obj.inputType=='html' ? 'text/html' : 'application/xml',
												  lineNumbers: obj.lineNumbers
											});
									    	
									    	myCodeMirror.on("change", function(cm, change) {
												  $('#' + tab + '_input' + this.id).markUpdated();
												  if (options.showButtons) {
														$(revertButton).attr('disabled', false);
														$(applyButton).attr('disabled', false);
												  }
									    	});
									    	
									    	$('#' + tab + '_input' + this.id).data('codeMirror', myCodeMirror);
									    	$('#' + tab + '_input' + this.id).show();
									    	
									    	setTimeout(function() {
									    	    myCodeMirror.refresh();
									    	},1);
									    	
									    } else if(obj.inputType == 'editor') {
									    	
									    	$('#' + tab + '_value' + this.id).editor({
									    		isPropertyInput: true
									    	});
									    	
									    } else if (obj.inputType == 'select') {
											$('#' + tab + '_value' + this.id).selectButton(
												{ metaData : obj, 
													id: this.id,
													url : obj.url, 
													value: this.value,
													options : obj.options, 
													nameIsResourceKey: obj.nameIsResourceKey,
													nameAttr: obj.nameAttr,
													valueAttr: obj.valueAttr,
													disabled : !options.canUpdate  || this.readOnly, 
													resourceKey : this.resourceKey, 
													changed : function() {
													$(this).markUpdated();
													if (options.showButtons) {
														$(revertButton).attr('disabled', false);
														$(applyButton).attr('disabled', false);
													}
												} });

										} else if (obj.inputType == 'autoComplete') {
											$('#' + tab + '_value' + this.id).autoComplete(
													{ metaData : obj, 
														id: this.id,
														url : obj.url, 
														value: this.value,
														options : obj.options, 
														nameIsResourceKey: obj.nameIsResourceKey,
														nameAttr: obj.nameAttr,
														valueAttr: obj.valueAttr,
														disabled : !options.canUpdate  || this.readOnly, 
														resourceKey : this.resourceKey, 
														changed : function() {
														$(this).markUpdated();
														if (options.showButtons) {
															$(revertButton).attr('disabled', false);
															$(applyButton).attr('disabled', false);
														}
													} });

											} else if (obj.inputType == 'multipleSelect') {
											$('#' + tab + '_value' + this.id)
													.multipleSelect(
														{ metaData : obj, 
															id: this.id,
															url : obj.url, 
															values : obj.values, 
															variables: options.variables,
															disabled : !options.canUpdate  || this.readOnly || this.disabled, 
															selected : splitFix(this.value), 
															selectAllIfEmpty : obj.selectAllIfEmpty, 
															resourceKey : this.resourceKey, 
															change : function() {
															$(this).markUpdated();
															if (options.showButtons) {
																$(revertButton).attr('disabled', false);
																$(applyButton).attr('disabled', false);
															}
														} });
										} else if (obj.inputType == 'multipleTextInput') {
											$('#' + tab + '_value' + this.id)
													.multipleTextInput(
														{ metaData : obj, 
															id: this.id,
															values : splitFix(this.value), 
															variables: options.variables,
															disabled : !options.canUpdate || this.readOnly || this.disabled, 
															resourceKey : this.resourceKey, 
															change : function() {
															$(this).markUpdated();
															if (options.showButtons) {
																$(revertButton).attr('disabled', false);
																$(applyButton).attr('disabled', false);
															}
														} });

										} else if (obj.inputType == 'button') {
											$('#' + tab + '_value' + this.id).append(
												'<button ' + (options.canUpdate && !obj.readOnly && !obj.disabled ? '' : 'disabled="disabled" ') 
														+ ' class="btn ' + (obj.buttonClass ? obj.buttonClass : 'btn-primary') 
														+ '" id="' + tab + '_button' + this.id + '"><i class="fa ' + obj.buttonIcon 
														+ '"></i>' + getResource(obj.buttonLabel) + '</button>');
										
											var el = $('#'+tab + '_button' + this.id);
											$('#' + tab + '_button' + this.id).on('click', function(e) {
												window[obj.script].apply(null, [el]);
											});
										} else if (obj.inputType == 'password') {
											$('#' + tab + '_value' + this.id)
													.append(
														'<input ' + (options.canUpdate && !obj.readOnly && !obj.disabled ? '' : 'disabled="disabled" ') + 'type="password" class="form-control propertyInput" id="' + tab + '_input' + this.id + '" name="input' + this.id + '" value="' + stripNull(this.value) + '"/>');
										} else if (obj.inputType == 'boolean') {
											$('#' + tab + '_value' + this.id)
													.append(
														'<input ' + (options.canUpdate && !obj.readOnly && !obj.disabled ? '' : 'disabled="disabled" ') + 'type="checkbox" class="form-control propertyInput" id="' + tab + '_input' + this.id + '" name="input' + this.id + '" value="true"' + (stripNull(this.value) == 'true' ? ' checked' : '') + '/>');
										} else if (obj.inputType == 'switch') {

											$('#' + tab + '_value' + this.id)
													.append(
														'<label class="switch"><input ' + (options.canUpdate && !obj.readOnly && !obj.disabled ? '' : 'disabled="disabled" ') + 'type="checkbox" class="switch-input propertyInput" id="' + tab + '_input' + this.id + '" name="input' + this.id + '" value="true"' + (stripNull(this.value) == 'true' ? ' checked' : '') + '><span class="switch-label" data-on="' + getResource("text.on") + '" data-off="' + getResource("text.off") + '"></span> <span class="switch-handle"></span></label>');

										} else if (obj.inputType == 'image') {
											$('#' + tab + '_value' + this.id)
													.append(
														'<input ' + (options.canUpdate && !obj.readOnly && !obj.disabled ? '' : 'disabled="disabled" ') + 'type="file" class="form-control propertyInput" id="' + tab + '_input' + this.id + '" name="input' + this.id + '"/>');
											$('#' + tab + '_value' + this.id)
													.append(
														'<img class="imagePreview" src="' + this.value + '">');
											var input = $('#' + tab + '_input' + this.id);
											input.change(function() {
												var reader = new FileReader();
												reader.onload = function(readerEvt) {
													var binaryString = readerEvt.target.result;
													var encoded = btoa(binaryString);
													var fileName = input.val().split('/').pop().split(
														'\\').pop();
													input.data('encoded', fileName + ";" + encoded);
												};
												reader.readAsBinaryString(input[0].files[0]);
											});

										} else if (obj.inputType == 'slider') {

											$('#' + tab + '_value' + this.id)
											.append('<input class="propertyInput form-control" id="' + tab + '_input' 
													+ this.id + '" data-slider-id="slider_' + this.id + '" value="' + this.value + '" type="text">');
											
											$('#' + tab + '_input' + this.id).slider({
												min: parseInt(obj.minValue),
												max: parseInt(obj.maxValue),
												step: parseInt(obj.stepValue ? obj.stepValue : 1),
												handle: 'square',
												value: parseInt(this.value),
												tooltip: 'show',
												formater: function(value) {
													return value + ' ' + getResource(obj.labelResourceKey);
												}
											}).on('slide', function(ev){
												   if(options.showButtons) {
														$(revertButton).attr('disabled', false);
														$(applyButton).attr('disabled', false);
													}
											});
											
											$('#' + tab + '_input' + this.id).slider('setValue', this.value);

										} else if (obj.inputType != 'hidden') {
										
											if(options.variables) {
												$('#' + tab + '_value' + this.id).textInputWithVariables({
													id: this.id,
													variables: options.variables,
													resourceKey: this.resourceKey,
													value: this.value,
													metaData: obj
												});
											} else {
												$('#' + tab + '_value' + this.id)
													.append(
														'<input ' + (options.canUpdate && !obj.readOnly && !obj.disabled ? '' : 'disabled="disabled" ') 
														+ 'type="' + obj.inputType + '" class="form-control propertyInput" id="' + tab + '_input' 
														+ this.id + '" size="' + (obj.size ? obj.size : 30) + '" placeholder="' 
														+ (obj.placeholder ? obj.placeholder : '') + '" maxlength="' + (obj.maxlength ? obj.maxlength : '') 
														+ '" name="input' + this.id + '" value="' + stripNull(this.value) + '"/>');
											}
										}

										$('#' + tab + '_value' + this.id)
												.append(
													'<div><span class="help-block">' + getResource(this.resourceKey + '.info') + '</span></div>');

										$('#' + tab + '_input' + this.id).prepareProperty(obj,
											this.id, this.value, this.resourceKey);

										$('#' + tab + '_input' + this.id)
												.change(
													function() {
														$('#' + tab + '_error' + this.id).remove();
														if ($(this).validateProperty()) {
															$(this).markUpdated();
															if (options.showButtons) {
																$(revertButton).attr('disabled', false);
																$(applyButton).attr('disabled', false);
															}
														} else {
															if ($('#error' + this.id).length == 0) {
																$(this)
																		.after(
																			'<span id="' + tab + '_error' + this.id + '" class="ui-icon ui-icon-alert"></span>');
															}
															if (options.showButtons) {
																$(revertButton).attr('disabled', true);
																$(applyButton).attr('disabled', true);
															}
														}
													});

									});
	
							});
			}
			
			if (options.additionalTabs && !options.propertyTabsLast) {
				createAdditionalTabs();
			}
			
			$('#tabTemp' + propertyDiv).remove();

			$('.' +  propertyDiv + 'Tab').click(function(e) {
				e.preventDefault();
				if($(this).hasClass(propertyDiv + 'Tab2')) {
					$('#' + propertyDiv + 'Actions').hide();
				} else {
					$('#' + propertyDiv + 'Actions').show();
				}
				$(this).tab('show');
				$('.code').each(function() {
					$(this).data('codeMirror').refresh();
				});
			});

			$('.' +  propertyDiv + 'Tab').first().tab('show');
			$('.code').each(function() {
				$(this).data('codeMirror').refresh();
			});
			
			if (options.showButtons) {
				$(revertButton).attr('disabled', true);
				$(applyButton).attr('disabled', true);

				$(revertButton).click(function() {
					$('.propertyInput').each(function(i, obj) {
						$(this).revertProperty();
					});
					$(revertButton).attr('disabled', true);
					$(applyButton).attr('disabled', true);
				});
				$(applyButton).click(function() {

					$('#' + propertyDiv).saveProperties(false, function(items) {
						postJSON(options.url, items, function(data) {

							if (data.success) {
								showInformation(false, data.message);
								$('#' + propertyDiv).saveCompleted();
							} else {
								showError(false, data.message);
							}
							$(revertButton).attr('disabled', true);
							$(applyButton).attr('disabled', true);
						});
					});

				});
			}

			if (options.complete) {
				options.complete();
			}
		});
};

$.fn.resetProperties = function() {
	$('.propertyInput', '#' + $(this).attr('id')).each(function(i, obj) {
		$('#' + obj.id).revertProperty();
	});
};

$.fn.clearProperties = function() {
	$('.propertyInput', '#' + $(this).attr('id')).each(function(i, obj) {
		$('#' + obj.id).clearProperty();
	});
};

$.fn.saveProperties = function(includeAll, callback) {

	var items = new Array();
	var files = new Array();

	var invalid = false;

	$('.propertyInput', '#' + $(this).attr('id')).each(
		function(i, obj) {

			var item = $('#' + obj.id);

			if(item.data('resourceKey')==undefined) {
				return;
			}
			
			var meta = item.data('metaData');
			if(!invalid) {
				if(!item.validateProperty()) {
					invalid = true;
				}
			}
			
			log("Checking property " + item.data('resourceKey'));

			if (meta.inputType=='multipleSelect' || meta.inputType=='multipleTextInput') {
				if (includeAll || item.data('updated')) {
					items.push(new PropertyItem(item.data('resourceKey'), item
							.multipleSelectValues({ isProperty : true }).join("]|[")));
				}
			} else if(meta.inputType=='css' 
				|| meta.inputType=='java' 
					|| meta.inputType=='javascript'
						|| meta.inputType=='html'
							|| meta.inputType=='xml'
								|| meta.inputType=='sql') {
				
				var codeMirror = $(this).data('codeMirror');
				
				log(codeMirror.getValue());
				
				if (includeAll || item.data('updated')) {
					items.push(new PropertyItem(item.data('resourceKey'), codeMirror.getValue()));
				}
			} else if(meta.inputType=='editor') { 
				
				var editor = $(this).data('editor');
				
				if(includeAll || item.data('updated')) {
					items.push(new PropertyItem(item.data('resourceKey'), editor.getValue()));
				}
				
			} else {
			
				if (includeAll || item.isUpdated()) {
					log('Updating ' + item.data('resourceKey'));
					if (item.attr('type') == "checkbox") {
						items.push(new PropertyItem(item.data('resourceKey'), item
								.prop("checked") ? "true" : "false"));
					} else if (item.attr('type') == "file") {
						items.push(new PropertyItem(item.data('resourceKey'), item
								.data('encoded')));
					} else {
						items.push(new PropertyItem(item.data('resourceKey'), item.val()));
					}
				}
			}
		});

	callback(items);

	return invalid;

};

$.fn.saveCompleted = function() {

	$('.propertyInput', '#' + $(this).attr('id')).each(function(i, obj) {

		var item = $('#' + obj.id);

		if (item.data('multipleSelect')) {
			item.data('updated', false);
		} else {
			item.data('updated', false);
			item.data('originalValue', item.val());
		}
	});
};

$.fn.multipleSelectValues = function(data) {

	result = new Array();

	var id = $(this).attr('id');
	if(!id.endsWith('IncludedSelect')) {
		id += 'IncludedSelect';
	}

	$('#' + id + ' option').each(function() {
		result.push($(this).val());
	});
	return result;
};


$.fn.selectButton = function(data) {
	
	var obj = $.extend(
		{ idAttr: 'id', nameAttr: 'name', valueAttr: 'value', nameAttrIsResourceKey : false, 
			resourceKeyTemplate: '{0}', disabled : false, value: '', nameIsResourceKey: false }, data);
	
	var id = obj.id;

	$(this).append('<div class="btn-group"><input id="' 
			 + id + '" class="propertyInput" type="hidden" name="select_value_' + id + '" value="'
			 + obj.value + '"><button type="button" id="button_' + id + '" class="btn btn-primary dropdown-toggle" data-toggle="dropdown"><span id="select_button_' 
			 + id + '">' + (obj.nameIsResourceKey ? getResource(obj.name) : obj.name) + '</span>&nbsp;<span class="btn-icon caret"></span></button><ul id="'
			 + 'select_' + id + '" class="dropdown-menu" role="menu"></div>');

	var selected = null;
	
	if (obj.options) {
		for (var i = 0; i < obj.options.length; i++) {
			if (obj.value == obj.options[i][obj.valueAttr]) {
				selected = obj.options[i];
				$('#select_button_' + id).text(obj.nameIsResourceKey ? getResource(obj.resourceKeyTemplate.format(obj.options[i][obj.nameAttr])) : obj.options[i][obj.nameAttr]);
				$('#select_' + id).append('<li><a id="data_' + id + "_" + i + '" class="selectButton_' + id + '" href="#" data-value="' 
						+ stripNull(obj.options[i][obj['valueAttr']]) + '" data-label="' 
						+ (obj.nameIsResourceKey ? getResource(obj.resourceKeyTemplate.format(obj.options[i][obj['nameAttr']])) : obj.options[i][obj['nameAttr']]) + '">' 
						+ (obj.nameIsResourceKey ? getResource(obj.resourceKeyTemplate.format(obj.options[i][obj['nameAttr']])) : obj.options[i][obj['nameAttr']]) + '</a></li>');
			} else {
				$('#select_' + id).append('<li><a id="data_' + id + "_" + i + '" class="selectButton_' + id + '" href="#" data-value="' 
						+ stripNull(obj.options[i][obj['valueAttr']]) + '" data-label="'
						+ (obj.nameIsResourceKey ? getResource(obj.resourceKeyTemplate.format(obj.options[i][obj['nameAttr']])) : obj.options[i][obj['nameAttr']]) + '">'
						+ (obj.nameIsResourceKey ? getResource(obj.resourceKeyTemplate.format(obj.options[i][obj['nameAttr']])) : obj.options[i][obj['nameAttr']]) + '</a></li>');
			}
			$('#data_' + id + "_" + i).data('resource', obj.options[i]);
		}
		

		$('.selectButton_' + id).on(
			'click',
			function(evt) {
				evt.preventDefault();
				
				$('#' + id).val($(this).attr('data-value'));
				$('#select_button_' + id).text($(this).attr('data-label'));
				$('#' + id).markUpdated();
				if(obj.changed) {
					obj.changed($(this).data('resource'));
				}
			});
		
			/**
			 * This is causing property page to show apply/revert buttons as enabled
			 * on first load.
			 */
//			if(obj.changed) {
//				obj.changed(selected);
//			}
			
			if(selected==null) {
				var val = $('.selectButton_' + id).first().attr('data-value');
				$('#' + id).val(val);
				$('#' + id).trigger('change');
			}

	} else if (obj.url) {
		getJSON(obj.url, null,
			function(data) {
				$.each(data.resources, function(idx, option) {
								if (option[obj['valueAttr']] == obj.value) {
									selected = option;
									$('#select_button_' + id).text(obj.nameIsResourceKey ? getResource(obj.resourceKeyTemplate.format(option[obj['nameAttr']])) : option[obj['nameAttr']]);
									$('#select_' + id).append('<li><a id="data_' + id + "_" + idx + '" class="selectButton_' + id + '" href="#" data-value="' 
											+ stripNull(option[obj['valueAttr']]) + '" data-label="' 
											+ (obj.nameIsResourceKey ? getResource(obj.resourceKeyTemplate.format(option[obj['nameAttr']])) : option[obj['nameAttr']]) + '">' 
											+ (obj.nameIsResourceKey ? getResource(obj.resourceKeyTemplate.format(option[obj['nameAttr']])) : option[obj['nameAttr']]) + '</a></li>');
								} else {
									$('#select_' + id).append('<li><a id="data_' + id + "_" + idx + '" class="selectButton_' + id + '" href="#" data-value="' 
											+ stripNull(option[obj['valueAttr']]) + '" data-label="' 
											+ (obj.nameIsResourceKey ? getResource(obj.resourceKeyTemplate.format(option[obj['nameAttr']])) : option[obj['nameAttr']]) + '">' 
											+ (obj.nameIsResourceKey ? getResource(obj.resourceKeyTemplate.format(option[obj['nameAttr']])) : option[obj['nameAttr']]) + '</a></li>');
								}
								$('#data_' + id + "_" + idx).data('resource', option);
							});
		
				$('.selectButton_' + id).on(
					'click',
					function(evt) {
						evt.preventDefault();
						$('#' + id).val($(this).attr('data-value'));
						$('#select_button_' + id).text($(this).attr('data-label'));
						$('#' + id).markUpdated();
						if(obj.changed) {
							obj.changed($(this).data('resource'));
						}
					});
				
				/**
				 * This is causing property page to show apply/revert buttons as enabled
				 * on first load.
				 */
//				if(obj.changed) {
//					obj.changed(selected);
//				}

				if(selected==null) {
					var val = $('.selectButton_' + id).first().attr('data-value');
					$('#' + id).val(val);
					$('#' + id).trigger('change');
				}
			});
	}
	
	$('#' + obj.id).prepareProperty(obj, obj.id, obj.values, obj.resourceKey);
	
	$('#' + id).change(function() {
		var selected = $('#select_' + id).find('[data-value="' + $('#' + id).val() + '"]');
		$('#select_button_' + id).text(selected.attr('data-label'));
		$('#' + id).markUpdated();
		if(obj.changed) {
			obj.changed(selected.data('resource'));
		}
	});
	
	var callback = {
		setValue: function(val) {
			$('#' + id).val(val);
			var selected = $('#select_' + id).find('[data-value="' + $('#' + id).val() + '"]');
			$('#select_button_' + id).text(selected.attr('data-label'));
			$('#' + id).markUpdated();
		},
		getValue: function() {
			return $('#' + id).val();
		},
		reset: function() {
			var val = $('.selectButton_' + id).first().attr('data-value');
			$('#' + id).val(val);
			$('#' + id).trigger('change');
		},
		disable: function() {
			$('#button_' + id).removeAttr('data-toggle');
			$('#button_' + id).removeClass('btn-primary');
			$('#button_' + id).addClass('btn-disabled-dark');
		},
		enable: function() {
			$('#button_' + id).attr('data-toggle', 'dropdown');
			$('#button_' + id).removeClass('btn-disabled-dark');
			$('#button_' + id).addClass('btn-primary');
		}
	};

	if(obj.disabled) {
		callback.disable();
	}
	
	return callback;
}

$.fn.textInputWithVariables = function(data) {
	
	var options = $.extend(
			{  
				variableTemplate: '$\{{0}\}', disabled : false, isPropertyInput: true, type: 'text',
				readOnly: false
			}, data);
	
	if(data && data.metaData) {
		options = $.extend(options, data.metaData);
	}
  
	var id = (options.isPropertyInput ? 'input_' : '' ) + options.id;
	
	if(options.type=='textarea') {
		$(this).append('<div class="input-group"><textarea name="' + id + '" id="' + id + '" class="form-control propertyInput" value="' 
				+ stripNull(options.value) + '"' + (!options.readOnly && !options.disabled ? '' : 'disabled="disabled" ') + ' cols="' 
				+ (options.cols ? options.cols : 30) + '" rows="' + (options.rows ? options.rows : 5) + '" maxlength="' + options.maxlength + '">' + stripNull(options.value) + '</textarea>'
			 	  + '<ul id="' + id + 'Dropdown" class="dropdown-menu dropdown-menu-right" role="menu"></ul><span class="input-group-addon dropdown-toggle unselectable" '
			 	  + 'data-toggle="dropdown">${}</span></div>');
	} else {
		$(this).append('<div class="input-group"><input type="text" name="' + id + '" id="' + id + '" class="form-control propertyInput" value="' 
				+ stripNull(options.value) + '"' + (!options.readOnly && !options.disabled ? '' : 'disabled="disabled" ') + '>'
			 	  + '<ul id="' + id + 'Dropdown" class="dropdown-menu dropdown-menu-right" role="menu"></ul><span class="input-group-addon dropdown-toggle unselectable" '
			 	  + 'data-toggle="dropdown">${}</span></div>');
	}

	if(options.isPropertyInput) {
		$('#' + id).prepareProperty(options.metaData,
			options.id, options.value, options.resourceKey);
	}
	
 	if(options.variables) {
 		$.each(options.variables, function(idx, obj) {
 			$('#' + id + 'Dropdown').append('<li><a href="#" class="' + id + 'Class">' + options.variableTemplate.format(obj) + '</a></li>');
 		});
 		
 		$('.' + id + 'Class').click(function(e) {
 			e.preventDefault();
 			var position = $('#' + id).getCursorPosition();
 			var content = $('#' + id).val();
 	 		var newContent = content.substr(0, position) + $(this).text() + content.substr(position);
 	 		$('#' + id).val(newContent);
 		});
 	} 
 	  
}

$.fn.editor = function(data) {

	var options = $.extend(
		{ isPropertyInput : true, disabled : false, 
					value: ''}, data);

	if(data && data.metaData) {
		options = $.extend(options, data.metaData);
	}
	
	var id = $(this).attr('id') + 'Editor';
	
	$(this).data('resourceKey', options.resourceKey);
	$(this).data('created', true);
	$(this).data('updated', false);
	$(this).data('options', options);
	
	if (options.isPropertyInput) {
		$(this).addClass('propertyInput');
	}
	
	$(this).append( '<div class="btn-toolbar" data-role="editor-toolbar" data-target="#' + id + '">'
  + '  <div class="btn-group">'
  + '    <a class="btn btn-default dropdown-toggle" data-toggle="dropdown" title="" data-original-title="Font"><i class="fa fa-font"></i><b class="caret"></b></a>'
  + '      <ul class="dropdown-menu">'
  + '       <li><a data-edit="fontName Serif" style="font-family:\'Serif\'">Serif</a>'
  + '       <li><a data-edit="fontName Sans" style="font-family:\'Sans\'">Sans</a></li>'
  + '       <li><a data-edit="fontName Arial" style="font-family:\'Arial\'">Arial</a></li>'
  + '       <li><a data-edit="fontName Arial Black" style="font-family:\'Arial Black\'">Arial Black</a></li>'
  + '       <li><a data-edit="fontName Courier" style="font-family:\'Courier\'">Courier</a></li>'
  + '       <li><a data-edit="fontName Courier New" style="font-family:\'Courier New\'">Courier New</a></li>'
  + '       <li><a data-edit="fontName Comic Sans MS" style="font-family:\'Comic Sans MS\'">Comic Sans MS</a></li>'
  + '       <li><a data-edit="fontName Helvetica" style="font-family:\'Helvetica\'">Helvetica</a></li>'
  + '       <li><a data-edit="fontName Impact" style="font-family:\'Impact\'">Impact</a></li>'
  + '       <li><a data-edit="fontName Lucida Grande" style="font-family:\'Lucida Grande\'">Lucida Grande</a></li>'
  + '       <li><a data-edit="fontName Lucida Sans" style="font-family:\'Lucida Sans\'">Lucida Sans</a></li>'
  + '       <li><a data-edit="fontName Tahoma" style="font-family:\'Tahoma\'">Tahoma</a></li>'
  + '       <li><a data-edit="fontName Times" style="font-family:\'Times\'">Times</a></li>'
  + '       <li><a data-edit="fontName Times New Roman" style="font-family:\'Times New Roman\'">Times New Roman</a></li>'
  + '       <li><a data-edit="fontName Verdana" style="font-family:\'Verdana\'">Verdana</a></li>'
  + '      </ul>'
  + '    </div>'
  + '  <div class="btn-group">'
  + '    <a class="btn btn-default dropdown-toggle" data-toggle="dropdown" title="" data-original-title="Font Size"><i class="fa fa-text-height"></i>&nbsp;<b class="caret"></b></a>'
  + '      <ul class="dropdown-menu">'
  + '      <li><a data-edit="fontSize 5"><font size="5" localize="font.huge"></font></a></li>'
  + '      <li><a data-edit="fontSize 3"><font size="3" localize="font.normal"></font></a></li>'
  + '      <li><a data-edit="fontSize 1"><font size="1" localize="font.smal"></font></a></li>'
  + '      </ul>'
  + '  </div>'
  + '  <div class="btn-group">'
  + '    <a class="btn btn-default" data-edit="bold" title="" data-original-title="Bold (Ctrl/Cmd+B)"><i class="fa fa-bold"></i></a>'
  + '    <a class="btn btn-default" data-edit="italic" title="" data-original-title="Italic (Ctrl/Cmd+I)"><i class="fa fa-italic"></i></a>'
  + '    <a class="btn btn-default" data-edit="strikethrough" title="" data-original-title="Strikethrough"><i class="fa fa-strikethrough"></i></a>'
  + '    <a class="btn btn-default" data-edit="underline" title="" data-original-title="Underline (Ctrl/Cmd+U)"><i class="fa fa-underline"></i></a>'
  + '  </div>'
  + '  <div class="btn-group">'
  + '    <a class="btn btn-default" data-edit="insertunorderedlist" title="" data-original-title="Bullet list"><i class="fa fa-list-ul"></i></a>'
  + '    <a class="btn btn-default" data-edit="insertorderedlist" title="" data-original-title="Number list"><i class="fa fa-list-ol"></i></a>'
  + '    <a class="btn btn-default" data-edit="outdent" title="" data-original-title="Reduce indent (Shift+Tab)"><i class="fa fa-outdent"></i></a>'
  + '    <a class="btn btn-default" data-edit="indent" title="" data-original-title="Indent (Tab)"><i class="fa fa-indent"></i></a>'
  + '  </div>'
  + '  <div class="btn-group">'
  + '    <a class="btn btn-default" data-edit="justifyleft" title="" data-original-title="Align Left (Ctrl/Cmd+L)"><i class="fa fa-align-left"></i></a>'
  + '    <a class="btn btn-default" data-edit="justifycenter" title="" data-original-title="Center (Ctrl/Cmd+E)"><i class="fa fa-align-center"></i></a>'
  + '    <a class="btn btn-default" data-edit="justifyright" title="" data-original-title="Align Right (Ctrl/Cmd+R)"><i class="fa fa-align-right"></i></a>'
  + '    <a class="btn btn-default" data-edit="justifyfull" title="" data-original-title="Justify (Ctrl/Cmd+J)"><i class="fa fa-align-justify"></i></a>'
  + '  </div>'
  + '  <div class="btn-group">'
  + '<a class="btn btn-default dropdown-toggle" data-toggle="dropdown" title="" data-original-title="Hyperlink"><i class="fa fa-link"></i></a>'
  + '  <div class="dropdown-menu input-append">'
  + '	    <input class="span2" placeholder="URL" type="text" data-edit="createLink">'
  + '	    <button class="btn btn-default" type="button">Add</button>'
  + '    </div>'
  + '    <a class="btn btn-default" data-edit="unlink" title="" data-original-title="Remove Hyperlink"><i class="fa fa-unlink"></i></a>'
  + '  </div>'
  + '  <div class="btn-group">'
  + '    <a class="btn btn-default" title="" id="pictureBtn" data-original-title="Insert picture (or just drag &amp; drop)"><i class="fa fa-image"></i></a>'
  + '    <input type="file" data-role="magic-overlay" data-target="#pictureBtn" data-edit="insertImage" style="opacity: 0; position: absolute; top: 0px; left: 0px; width: 41px; height: 30px;">'
  + '  </div>'
  + '  <div class="btn-group">'
  + '    <a class="btn btn-default" data-edit="undo" title="" data-original-title="Undo (Ctrl/Cmd+Z)"><i class="fa fa-undo"></i></a>'
  + '    <a class="btn btn-default" data-edit="redo" title="" data-original-title="Redo (Ctrl/Cmd+Y)"><i class="fa fa-repeat"></i></a>'
  + '  </div>'
  + '  <input type="text" data-edit="inserttext" id="voiceBtn" x-webkit-speech="" style="position: absolute; top: 280px; left: 1287px;">'
  + '</div>'
  + '<div id="' + id + '" class="editor" contenteditable="true" style="overflow: scroll; height:300px">'
  + '</div>');

	$('#' + id).wysiwyg({
        hotKeys: {
            'ctrl+b meta+b': 'bold',
            'ctrl+i meta+i': 'italic',
            'ctrl+u meta+u': 'underline',
            'ctrl+z meta+z': 'undo',
            'ctrl+y meta+y meta+shift+z': 'redo'
        },
        dragAndDropImages: true
    });

	callback = {
		setValue: function(raw) {
			$('#' + id).html(raw);
		}, 
		getValue: function() {
			return $('#' + id).cleanHtml();
		},
		enable: function() {
			
		}, 
		disable: function() {
			
		}
	}
	
	$(this).data('editor', callback);
	callback.setValue(options.value);
	return callback;
}

$.fn.autoComplete = function(data) {
	
	var options = $
	.extend(
		{ valueAttr : 'value', nameAttr : 'name', nameAttrIsResourceKey : false, 
			selectAllIfEmpty : false, selectedIsObjectList : false, 
				isPropertyInput : true, disabled : false, remoteSearch: false,
					resourceKeyTemplate: '{0}' }, data);

	if(data && data.metaData) {
		options = $.extend(options, data.metaData);
	}
	
	var id = options.id;
	
	$(this).data('resourceKey', options.resourceKey);
	$(this).data('created', true);
	$(this).data('updated', false);
	$(this).data('options', options);

	$(this).append('<div class="dropdown input-group"><input type="hidden" class="propertyInput" id="actual_' + id 
			+ '"><input type="text" id="input_' + id + '" class="form-control dropdown-toggle" data-toggle="dropdown" value="">' 
			+ '<ul id="' + 'auto_' + id + '" class="dropdown-menu" role="menu"><li><a tabindex="-1" href="#">' + getResource('search.text') + '</a></li></ul>' 
			+ '<span class="input-group-addon"><i id="spin_' + id + '" class="fa fa-search"></i></span></div>');

	if (options.url && !options.remoteSearch) {
		getJSON(
			options.url,
			null,
			function(data) {
				
				var map = [];
				$.each(data.resources, function(idx, obj) {
					map[obj[options.valueAttr]] = obj;
					if(obj[options.valueAttr]==options.value) {
						$('#actual_' + id).val(options.value);
						$('#input_' + id).val(options.nameIsResourceKey ? getResource(obj[options.nameAttr]) : obj[options.nameAttr]);
					}
				});
				$('#input_' + id).data('values', data.resources);
				$('#input_' + id).data('map', map);
			});
	}
	
	$('#input_' + id).keyup(function() {
		$('#spin_' + id).removeClass('fa-search');
		$('#spin_' + id).addClass('fa-spin');
		$('#spin_' + id).addClass('fa-spinner');
		var text = $(this).val();
		
		var createDropdown = function() {
			
			var selected = new Array();
			$.each($('#input_' + id).data('values'), function(idx, obj) {
				var name = options.nameIsResourceKey ? getResource(obj[options.nameAttr]) : obj[options.nameAttr];
				if(name.toLowerCase().indexOf(text.toLowerCase()) > -1) {
					selected.push(obj);
				}
			});
			$('#auto_' + id).empty();
			if(selected.length > 0 && text != '') {
				$.each(selected, function(idx, obj) {
					$('#auto_' + id).append('<li><a tabindex="-1" class="optionSelect" data-value="' + obj[options.valueAttr] + '" href="#">' 
							+ (options.nameIsResourceKey ? getResource(obj[options.nameAttr]) : obj[options.nameAttr]) + '</a></li>');
				});
				$('.optionSelect').off('click');
				$('.optionSelect').on('click', function() {
					var value = $(this).data('value');
					var obj = $('#input_' + id).data('map')[value];
					$('#actual_' + id).val(value);
					$('#input_' + id).val($(this).text());
					$('[data-toggle="dropdown"]').parent().removeClass('open');
					
					if(options.changed) {
						options.changed(obj);
					}
				});
			} else {
				if(text=='') {
					$('#auto_' + id).append('<li><a tabindex="-1" class="optionSelect" href="#">' + getResource("search.text") + '</a></li>');
				} else {
					$('#auto_' + id).append('<li><a tabindex="-1" class="optionSelect" href="#">' + getResource("noResults.text") + '</a></li>');
				}
			}
			$('#input_' + id).dropdown();
			$('[data-toggle="dropdown"]').parent().removeClass('open');
			$('#input_' + id).dropdown('toggle');
			$('#spin_' + id).removeClass('fa-spin');
			$('#spin_' + id).removeClass('fa-spinner');
			$('#spin_' + id).addClass('fa-search');
		}
		if(!options.remoteSearch) {
			createDropdown();
		} else {
			getJSON(
					options.url + '?iDisplayStart=0&iDisplayLength=10&sSearch=' + text,
					null,
					function(data) {
						
						var map = [];
						$.each(data.aaData, function(idx, obj) {
							map[obj[options.valueAttr]] = obj;
							if(obj[options.valueAttr]==options.value) {
								$('#actual_' + id).val(options.value);
								$('#input_' + id).val(options.nameIsResourceKey ? getResource(obj[options.nameAttr]) : obj[options.nameAttr]);
							}
						});
						$('#input_' + id).data('values', data.resources);
						$('#input_' + id).data('map', map);
						
						createDropdown();
					});
			
		}
	});
	
	var callback = {
			setValue: function(val) {
				$.each($('#input_' + id).data('values'), function(idx, obj) {
					if(obj[options.valueAttr]==val) {
						$('#actual_' + id).val(val);
						$('#input_' + id).val(options.nameIsResourceKey ? getResource(obj[options.nameAttr]) : obj[options.nameAttr]);
						$('#actual_' + id).markUpdated();
						if(options.changed) {
							options.changed(obj);
						}
					}
				});
				
			},
			getValue: function() {
				return $('#actual_' + id).val();
				$('#input_' + id).val();
			},
			reset: function() {
				$('#actual_' + id).val('');
				$('#input_' + id).val('');
			},
			disable: function() {
				$('#input_' + id).attr('disabled', true);
			},
			enable: function() {
				$('#input_' + id).attr('disabled', false);
			}
		};

		if(options.disabled) {
			callback.disable();
		}
		
		return callback;
	
}


$.fn.multipleSelect = function(data) {

	if ($(this).data('created')) {

		options = $(this).data('options');
		if ((options.selected && options.selected.length == 0) && options.selectAllIfEmpty) {
			var allExcludedOptions = $('#' + $(this).attr('id') + 'ExcludedSelect option');
			if (allExcludedOptions.length > 0) {
				$('#' + $(this).attr('id') + 'IncludedSelect').append(
					$(allExcludedOptions).clone());
				$(allExcludedOptions).remove();
			}
			;
		} else {
			var allIncludedOptions = $('#' + $(this).attr('id') + 'IncludedSelect option');
			if (allIncludedOptions.length > 0) {
				$('#' + $(this).attr('id') + 'ExcludedSelect').append(
					$(allIncludedOptions).clone());
				$(allIncludedOptions).remove();
			}
			;
		}
		var select = $('#' + $(this).attr('id') + 'ExcludedSelect');
		var toSelect = $('#' + $(this).attr('id') + 'IncludedSelect');

		if (options.selected) {
			$.each(
				options.selected,
				function(idx, id) {
					var selectedOpt;
					if (options.selectedIsObjectList) {
						selectedOpt = $('#' + select.attr('id') + ' option[value="' + id[options.idAttr] + '"]');
					} else {
						selectedOpt = $('#' + select.attr('id') + ' option[value="' + id + '"]');
					}
					if (selectedOpt) {
						toSelect.append($(selectedOpt).clone());
						$(selectedOpt).remove();
					}
				});
		}

		if (data && data.insert) {
			$
					.each(
						data.insert,
						function(idx, obj) {

							select
									.append('<option ' + 'value="' + obj[options.idAttr] + '">' + (options.nameAttrIsResourceKey ? (getResource(obj[options.nameAttr]) == undefined ? obj[options.nameAttr] : getResource(obj[options.nameAttr])) : obj[options.nameAttr]) + "</option>");
						});
		}

		if (data && data.remove) {
			$
					.each(
						data.remove,
						function(idx, obj) {
							if (options.selectedIsObjectList) {
								selectedOpt = $('#' + select.attr('id') + ' option[value="' + obj[options.idAttr] + '"]');
								if (!selectedOpt) {
									selectedOpt = $('#' + toSelect.attr('id') + ' option[value="' + obj[options.idAttr] + '"]');
								}
							} else {
								selectedOpt = $('#' + select.attr('id') + ' option[value="' + obj + '"]');
								if (!selectedOpt) {
									selectedOpt = $('#' + toSelect.attr('id') + ' option[value="' + obj + '"]');
								}
							}
							if (selectedOpt) {
								$(selectedOpt).remove();
							}
						});
		}

		if (data && data.selected) {
			$
					.each(
						data.selected,
						function(idx, id) {
							var selectedOpt;
							if (options.selectedIsObjectList) {
								selectedOpt = $('#' + select.attr('id') + ' option[value="' + id[options.idAttr] + '"]');
							} else {
								selectedOpt = $('#' + select.attr('id') + ' option[value="' + id + '"]');
							}
							if (selectedOpt) {
								toSelect.append($(selectedOpt).clone());
								$(selectedOpt).remove();
							}
						});
		}

		if(data) {
			select.attr('disabled', data.disabled);
			toSelect.attr('disabled', data.disabled);
			$('#' + $(this).attr('id') + 'AddButton').attr('disabled', data.disabled);
			$('#' + $(this).attr('id') + 'RemoveButton').attr('disabled', data.disabled);
		}
		return;

	} else {

		var options = $
				.extend(
					{ idAttr : 'id', nameAttr : 'name', nameAttrIsResourceKey : false, 
						selectAllIfEmpty : false, selectedIsObjectList : false, 
							isPropertyInput : true, disabled : false, valuesIsObjectList: true,
								resourceKeyTemplate: '{0}' }, data);
		
		if(data && data.metaData) {
			options = $.extend(options, data.metaData);
		}

		$('#' + $(this).attr('id') + 'Excluded').remove();
		$('#' + $(this).attr('id') + 'Buttons').remove();
		$('#' + $(this).attr('id') + 'Included').remove();

		$(this).addClass('container-fluid');
		
		$(this).append('<div class="excludedList col-md-5" id="' + $(this).attr('id') 
				+ 'Excluded"><label>' + getResource('text.excluded') + '</label></div>');
		
		$('#' + $(this).attr('id') + 'Excluded').append(
					'<select ' + (!options.disabled ? '' : 'disabled="disabled" ') + 'multiple="multiple" id="' + $(
						this).attr('id') + 'ExcludedSelect" class="formInput text form-control"/>');

		$(this).append('<div class="listButtons" id="' + $(this).attr('id') + 'Buttons"/>');
		
		$('#' + $(this).attr('id') + 'Buttons').append(
					'<button class="btn-multiple-select btn btn-primary" id="' + $(this)
							.attr('id') + 'AddButton"><i class="fa fa-chevron-circle-right"></i></button><br/>');
		
		$('#' + $(this).attr('id') + 'Buttons').append(
					'<button class="btn-multiple-select btn btn-primary" id="' + $(this)
							.attr('id') + 'RemoveButton"><i class="fa fa-chevron-circle-left"></i></button>');
		
		$(this).append('<div class="includedList col-md-5" id="' + $(this).attr('id') 
				+ 'Included"><label>' + getResource('text.included') + '</label></div>');
		
		$('#' + $(this).attr('id') + 'Included').append('<select ' + (!options.disabled ? '' : 'disabled="disabled" ') 
				+ 'multiple="multiple" id="' + $(this).attr('id') + 'IncludedSelect" class="formInput text form-control"/>');

		$('#' + $(this).attr('id') + 'AddButton').button();
		$('#' + $(this).attr('id') + 'RemoveButton').button();

		var select = $('#' + $(this).attr('id') + 'ExcludedSelect');
		var toSelect = $('#' + $(this).attr('id') + 'IncludedSelect');

		$('#' + $(this).attr('id') + 'AddButton').click(function(e) {
			var selectedOpts = $('#' + select.attr('id') + ' option:selected');
			if (selectedOpts.length == 0) {
				e.preventDefault();
			}

			toSelect.append($(selectedOpts).clone());
			$(selectedOpts).remove();
			e.preventDefault();

			toSelect.data('updated', true);
			if (data.change) {
				data.change();
			}
		});

		$('#' + $(this).attr('id') + 'RemoveButton').click(function(e) {
			var selectedOpts = $('#' + toSelect.attr('id') + ' option:selected');
			if (selectedOpts.length == 0) {
				e.preventDefault();
			}

			select.append($(selectedOpts).clone());
			$(selectedOpts).remove();
			e.preventDefault();

			toSelect.data('updated', true);

			if (data.change) {
				data.change();
			}
		});

	}

	if(options.useVariablesAsValues) {
		options.values = options.variables;
		options.valuesIsObjectList = false;
	}
	
	if (options.values) {

		$.each(options.values,
			function(idx, obj) {
				var selectItem = options.selectAllIfEmpty == "true" && (options.selected && options.selected.length==0) ? toSelect : select;
				
				if(options.valuesIsObjectList) {
					selectItem.append('<option ' + 'value="' + obj[options.idAttr] + '">' + (options.nameAttrIsResourceKey 
							? (getResource(options.resourceKeyTemplate.format(obj[options.nameAttr])) == undefined ? obj[options.nameAttr] 
								: getResource(options.resourceKeyTemplate.format(obj[options.nameAttr]))) : obj[options.nameAttr]) + "</option>");
				} else {
					selectItem.append('<option ' + 'value="' + obj + '">' + (options.nameAttrIsResourceKey 
							? (getResource(options.resourceKeyTemplate.format(obj)) == undefined ? obj
								: getResource(options.resourceKeyTemplate.format(obj))) : obj) + "</option>");
				}
		});

		if (options.selected) {
			$.each(options.selected,
				function(idx, id) {
					var selectedOpt;
					if (options.selectedIsObjectList) {
						selectedOpt = $('#' + select.attr('id') + ' option[value="' + id[options.idAttr] + '"]');
					} else {
						selectedOpt = $('#' + select.attr('id') + ' option[value="' + id + '"]');
					}
					if (selectedOpt) {
						toSelect.append($(selectedOpt).clone());
						$(selectedOpt).remove();
					}
				});
		}

	} else if (options.url) {
		getJSON(
			options.url,
			null,
			function(data) {
				$.each(data.resources,
					function(idx, obj) {
						var selectItem = ((!options.selected || (options.selected && options.selected.length == 0)) && options.selectAllIfEmpty ? toSelect : select);
						selectItem
								.append('<option ' + 'value="' + obj[options.idAttr] + '">' + (options.nameAttrIsResourceKey ? (getResource(options.resourceKeyTemplate.format(obj[options.nameAttr])) == undefined ? obj[options.nameAttr] : getResource(options.resourceKeyTemplate.format(obj[options.nameAttr]))) : obj[options.nameAttr]) + "</option>");
				});

				if (options.selected) {
					$.each(options.selected,
						function(idx, id) {
							var selectedOpt;
							if (options.selectedIsObjectList) {
								selectedOpt = $('#' + select.attr('id') + ' option[value="' + id[options.idAttr] + '"]');
							} else {
								selectedOpt = $('#' + select.attr('id') + ' option[value="' + id + '"]');
							}
							if (selectedOpt) {
								toSelect.append($(selectedOpt).clone());
								$(selectedOpt).remove();
							}
						});
				}
			});
	}

	toSelect.data('isMultipleSelect', true);
	$(this).data('created', true);
	$(this).data('options', options);
	toSelect.prepareProperty(options,
			options.id, options.values, options.resourceKey);
};

$.fn.multipleTextInput = function(data) {

	if ($(this).data('created')) {

		options = $(this).data('options');

		var inputText = $('#' + $(this).attr('id') + 'ExcludedSelect');
		inputText.val('');
		var allIncludedOptions = $('#' + $(this).attr('id') + 'IncludedSelect option');
		if (allIncludedOptions.length > 0) {
			$(allIncludedOptions).remove();
		}

		var toSelect = $('#' + $(this).attr('id') + 'IncludedSelect');

		if(data && data.values) {
			options.values = data.values;
		} 
		
		if (options.values) {
			$.each(options.values, function(idx, obj) {
				toSelect.append('<option ' + 'value="' + obj + '">' + obj + "</option>");
			});
		}

		return;

	} else {

		var options = $
				.extend(
					{ idAttr : 'id', nameAttr : 'name', nameAttrIsResourceKey : false, selectAllIfEmpty : false, selectedIsObjectList : false, isPropertyInput : true, disabled : false },
					data);

		$(this).data('created', true);
		$(this).data('isMultipleTextInput', true);
		$(this).data('options', options);

		$('#' + $(this).attr('id') + 'Excluded').remove();
		$('#' + $(this).attr('id') + 'Buttons').remove();
		$('#' + $(this).attr('id') + 'Included').remove();

		$(this).append('<div class="excludedList" id="' + $(this).attr('id') + 'Excluded"></div>');

		if(options.variables) {
			$('#' + $(this).attr('id') + 'Excluded').textInputWithVariables({
				id: $(this).attr('id') + 'ExcludedSelect',
				isPropertyInput: false,
				variables: options.variables
			});
		} else {
			$('#' + $(this).attr('id') + 'Excluded').append(
					'<input type="text" ' + (!options.disabled ? '' : 'disabled="disabled" ') + 'id="' + $(
						this).attr('id') + 'ExcludedSelect" class="formInput text form-control" />');
		}

		$(this)
				.append(
					'<div class="multipleTextInputButtons" id="' + $(this).attr('id') + 'Buttons"/>');
		
		$('#' + $(this).attr('id') + 'Buttons').append(
		'<button class="btn-multiple-select btn btn-primary" id="' 
				+ $(this).attr('id') 
				+ 'AddButton"><i class="fa fa-chevron-circle-right"></i></button><br/>');
		
		$('#' + $(this).attr('id') + 'Buttons').append(
				'<button class="btn-multiple-select btn btn-primary" id="' 
						+ $(this).attr('id') 
						+ 'RemoveButton"><i class="fa fa-chevron-circle-left"></i></button>');

		$(this)
				.append(
					'<div class="includedList" id="' + $(this).attr('id') + 'Included"></div>');
		$('#' + $(this).attr('id') + 'Included')
				.append(
					'<select ' + (!options.disabled ? '' : 'disabled="disabled" ') + 'multiple="multiple" id="' + $(
						this).attr('id') + 'IncludedSelect" class="formInput text form-control' + (options.isPropertyInput ? ' propertyInput' : '') + '"/>');

		var select = $('#' + $(this).attr('id') + 'ExcludedSelect');
		var toSelect = $('#' + $(this).attr('id') + 'IncludedSelect');
		
		if(options.allowOrdering) {
			$(this).append('<div class="multipleTextInputButtons" id="' + $(this).attr('id') + 'OrderButtons"/>');
			
			$('#' + $(this).attr('id') + 'OrderButtons').append(
					'<button class="btn-multiple-select btn btn-primary" id="' 
					+ $(this).attr('id') 
					+ 'UpButton"><i class="fa fa-chevron-circle-up"></i></button><br/>');
			
			$('#' + $(this).attr('id') + 'OrderButtons').append(
					'<button class="btn-multiple-select btn btn-primary" id="' 
					+ $(this).attr('id') 
					+ 'DownButton"><i class="fa fa-chevron-circle-down"></i></button>');
			
			$('#' + $(this).attr('id') + 'UpButton').click(function(e) {
					e.preventDefault();
					$('#' + toSelect.attr('id') + ' option:selected').each(function(){
						$(this).insertBefore($(this).prev());
					});
			});
			
			$('#' + $(this).attr('id') + 'DownButton').click(function(e) {
				e.preventDefault();
				$('#'  + toSelect.attr('id') + ' option:selected').each(function(){
					$(this).insertAfter($(this).next());
				});
			});
		}

		

		$('#' + $(this).attr('id') + 'AddButton')
				.click(
					function(e) {
						e.preventDefault();
						var selectedText = select.val();
						if (selectedText == '') {

							return;
						}

						toSelect
								.append('<option ' + 'value="' + selectedText + '">' + selectedText + "</option>");
						select.val('');
						toSelect.data('updated', true);
						if (data.change) {
							data.change();
						}
					});

		$('#' + $(this).attr('id') + 'RemoveButton').click(function(e) {
			e.preventDefault();
			var selectedOpts = $('#' + toSelect.attr('id') + ' option:selected');
			if (selectedOpts.length == 0) {
				return;
			}

			select.val($(selectedOpts).val());
			$(selectedOpts).remove();

			toSelect.data('updated', true);

			if (data.change) {
				data.change();
			}
		});

	}

	toSelect.data('id', options.resourceKey);
	toSelect.data('restart', options.restart);
	toSelect.data('updated', false);

	toSelect.prepareProperty(options.metaData,
			options.id, options.values, options.resourceKey);
	if (options.values) {

		$.each(options.values, function(idx, obj) {
			toSelect.append('<option ' + 'value="' + obj + '">' + obj + "</option>");
		});
	}
};

$.fn.ajaxResourcePage = function(params) {

	var divName = $(this).attr('id');

	log("Creating ajax resource page for div " + divName);

	var options = $
			.extend(
				{ divName : divName, canCreate : false, canUpdate : false, canDelete : false,
					icon : 'fa-cog', disableDecoration: false },
				params);

	$(this).data('options', options);

	var html = '';
	
	if(!options.disableDecoration) {
		html += '<div class="panel panel-default"><div class="panel-heading"><h2><i class="fa '
			+ options.icon + '"></i><span class="break">' 
			+ options.title + '</span></h2></div><div id="'
			+ divName + 'Panel" class="panel-body">'
	}
	
	html +=	'<table class="table' 
		+ (options.selected ? '' : ' table-striped') + '" id="'
		+ divName + 'Table' + '"><thead><tr id="' 
		+ divName + 'TableHeader"></tr></thead></table>';
	
	if(!options.disableDecoration) {
		html +=	'</div>';
	}
	
	if(options.canCreate) {
		html += '<div id="' + divName + 'Actions" class="tabActions panel-footer"></div>';
	}

	if(!options.disableDecoration) {
		html += '</div>';
	}
	
	$(this).append(html);

	$('div[dialog-for="' + divName + '"]').resourceDialog(options);

	var columns = new Array();
	var columnsDefs = new Array();

	$.each(options.fields,
		function(idx, obj) {
			$('#' + divName + 'TableHeader')
					.append(
						'<th>' + getResource(options.resourceKey + "." + obj.name + '.label') + '</th>');
			columns.push({ "mData" : obj.name, });
			if (obj.isResourceKey) {
				columnsDefs
						.push({ "aTargets" : [ idx ], "mData" : null, "mRender" : function(data, type, full) {
							return getResource(options.resourceKey + "." + data + '.label');
						} });
		}
	});

	var renderActions = function(idCol) {
		var id = idCol.aData.id;
		var renderedActions = '';

		if (options.additionalActions) {

			if(options.additionalActionsDropdown && options.additionalActions.length > 0) {
				renderedActions += '<div id="dropdown_' + id + '" class="btn-group"><a class="btn btn-success row-additional dropdown-toggle" data-toggle="dropdown" href="#"><i class="fa fa-gears"></i></a>';
				renderedActions += '<ul class="dropdown-menu dropdown-menu-right" role="menu">';
				$.each(
						options.additionalActions,
						function(x, act) {
							if (act.enabled) {
								renderedActions += '<li><a class="row-' + act.resourceKey + '" href="#"><span>' + getResource(act.resourceKey + ".label") + '</span>&nbsp;&nbsp;<i class="fa ' + act.iconClass + '"></i></a></li>';
			
								$(document).off('click',
									'#' + divName + 'Actions' + id + ' .row-' + act.resourceKey);
			
								$(document).on(
									'click',
									'#' + divName + 'Actions' + id + ' .row-' + act.resourceKey,
									function() {
										var curRow = $('#' + divName + 'Table').dataTable()
												.fnGetPosition($(this).closest("tr").get(0));
										var resource = $('#' + divName + 'Table').dataTable()
												.fnGetData(curRow);
										act.action(resource, function(resource) {
											$('#' + divName + 'Table').dataTable().fnUpdate(resource, curRow);
											$('#' + divName + 'Table').dataTable().fnDraw();
										});
									});
							}
				});
				renderedActions += '</ul></div>';
				
				$(document).on('show.bs.dropdown', '#' + divName + 'Actions' + id, function () {
					var dropdown = $(this);
					var curRow = $('#' + divName + 'Table').dataTable().fnGetPosition($(this).closest("tr").get(0));
					var resource = $('#' + divName + 'Table').dataTable().fnGetData(curRow);
					$.each(options.additionalActions, function(x, act) {
						if(act.enabled) {
							if(act.displayFunction && act.displayFunction != '') {
								var display = window[act.displayFunction].apply(null, [resource]);
								var el = $('.row-' + act.resourceKey, dropdown);   
								el.empty();
								el.append('<span>' + getResource(display.resourceKey) 
										+ '</span>&nbsp;&nbsp;<i class="fa ' 
										+ display.iconClass + '"></i>');
							}
							if(act.enableFunction && act.enableFunction != '') {
								if(!window[act.enableFunction].apply(null, [resource])) {
									var el = $('.row-' + act.resourceKey, dropdown);    
									el.parent().addClass('disabled');
									el.attr('disabled', true);
								}
							} 
						}
						
					});
				});
				
			} else {
				$.each(options.additionalActions,
					function(x, act) {
						if (act.enabled) {

							renderedActions += '<a class="btn ' + (act.buttonClass ? act.buttonClass : 'btn-success') + ' row-' + act.resourceKey + '" href="#"><i class="fa ' + act.iconClass + '"></i></a>';

							$(document).off('click','#' + divName + 'Actions' + id + ' .row-' + act.resourceKey);

							$(document).on('click',
								'#' + divName + 'Actions' + id + ' .row-' + act.resourceKey,
								function() {
									var curRow = $('#' + divName + 'Table').dataTable()
											.fnGetPosition($(this).closest("tr").get(0));
									var resource = $('#' + divName + 'Table').dataTable()
											.fnGetData(curRow);
									act.action(resource);
							});
					}

				});
			}

		}

//		if (options.canUpdate) {
			
			var canUpdate = options.canUpdate;
			if(options.checkUpdate) {
				canUpdate = options.checkUpdate(idCol.aData);
			}
//			if(canUpdate) {
				renderedActions += '<a class="btn btn-info row-edit" href="#"><i class="fa ' + (options.canUpdate && canUpdate ? 'fa-edit' : 'fa-search') + '"></i></a>';
	
				$(document).off('click', '#' + divName + 'Actions' + id + ' .row-edit');
	
				$(document).on(
					'click',
					'#' + divName + 'Actions' + id + ' .row-edit',
					function() {
						var curRow = $('#' + divName + 'Table').dataTable().fnGetPosition(
							$(this).closest("tr").get(0));
						var resource = $('#' + divName + 'Table').dataTable().fnGetData(
							curRow);
						$('div[dialog-for="' + divName + '"]').resourceDialog(options.canUpdate && canUpdate ? 'edit' : 'read',
							{ row : curRow, resource : resource });
				});
//			} else {
//				renderedActions += '<a class="btn btn-disabled" href="#"><i class="fa fa-edit"></i></a>';
//			}
//		}

		if (options.canDelete) {
			
			var canDelete = !idCol.aData.system;
			if(options.checkDelete) {
				canDelete = !idCol.aData.system && options.checkDelete(idCol.aData);
			}
			
			if(canDelete) {
				renderedActions += '<a class="btn btn-danger row-delete" href="#"><i class="fa fa-trash-o"></i></a>';
	
				$(document).off('click', '#' + divName + 'Actions' + id + ' .row-delete');
	
				$(document).on(
					'click',
					'#' + divName + 'Actions' + id + ' .row-delete',
					function() {

						log("Entering resource delete for id " + id);
	
						//$(document).data('modal', true);
	
						var row = $(this).closest("tr").get(0);
						var resource = $('#' + divName + 'Table').dataTable().fnGetData(row);
	
						bootbox.confirm(getResource(options.resourceKey + ".delete.desc")
								.format(resource.name), function(confirmed) {
							if (confirmed) {
								deleteJSON(options.resourceUrl + "/" + id, null, function(data) {
									if (data.success) {
										if (options.resourceDeleted) {
											options.resourceDeleted(resource);
										}
										$('#' + divName + 'Table').dataTable().fnDeleteRow(row);
										showInformation(true, data.message);
									} else {
										bootbox.alert(data.message);
									}
								});
							}
					});
				});
			} else {
				renderedActions += '<a class="btn btn-disabled" href="#"><i class="fa fa-trash-o"></i></a>';
			}
			
		}

		return '<div id="' + divName + 'Actions' + id + '" class="tableActions">' + renderedActions + '</div>';
	};

	$('#' + divName + 'TableHeader').append(
		'<th localize="text.actions" class="col-md-2"></th>');
	columns.push({ "mData" : null, 
		"fnRender" : renderActions, 
		"bAutoWidth" : false, 
		"sWidth" : "150px", 
		"bSortable" : false 
		});

	var oTable = $('#' + divName + 'Table')
			.dataTable(
				{ "bProcessing" : true, 
					"bServerSide" : true, 
					"sAjaxSource" : basePath + "/api/" + options.tableUrl, 
					"iDisplayLength": 10,
					"aoColumns" : columns, 
					"aoColumnDefs" : columnsDefs });

	if(options.selected) {
	    var tableTools = new $.fn.dataTable.TableTools( oTable, {
	        sRowSelect: "os",
	        fnRowSelected: function ( nodes ) {
	        	var full = oTable.fnGetData(nodes[0]);
	        	options.selected(full);
	        }
	    });
	}
	
	if (options.canCreate) {

		$('#' + divName + 'Actions')
				.append(
					'<button id="' + divName + 'Add" class="btn btn-primary"><i class="fa fa-plus-circle"></i>' + getResource('text.add') + '</button>');
		$('#' + divName + 'Add').click(function() {
			if (options.showCreate) {
				options.showCreate();
			}
			$('div[dialog-for="' + divName + '"]').resourceDialog('create');
		});
	}
	
	if(options.additionalButtons) {
		
		$.each(options.additionalButtons, function() {
			$('#' + divName + 'Actions').append(
				'<button id="' + this.resourceKey + '" class="btn ' + this.buttonClass + '"><i class="fa ' + this.icon + '"></i>' + getResource(this.resourceKey + '.label') + '</button>');
			var button = this;
			$('#' + this.resourceKey).click(function() {
				if(button.action) {
					button.action();
				}
			});
		});
	}

	if (options.complete) {
		options.complete();
	}

};

$.fn.ajaxResourcePage2 = function(params) {

	var divName = $(this).attr('id');

	log("Creating ajax resource page 2 for div " + divName);

	var options = $
			.extend(
				{ divName : divName, canCreate : false, canUpdate : false, canDelete : false, icon : 'fa-cog' },
				params);

	$(this).data('options', options);

	var html = '<div class="panel panel-default"><div class="panel-heading"><h2><i class="fa '
		+ options.icon + '"></i><span class="break">' 
		+ options.title + '</span></h2></div><div id="'
		+ divName + 'Panel" class="panel-body"><table class="table' 
		+ (options.selected ? '' : ' table-striped') + '" id="'
		+ divName + 'Table' + '"><thead><tr id="' 
		+ divName + 'TableHeader"></tr></thead></table></div>';

	if(options.canCreate) {
		html += '<div id="' + divName + 'Actions" class="tabActions panel-footer"/>';
	}
	
	html += '</div>';
	$(this).append(html);

	$('div[page-for="' + divName + '"]').hide();
	$('div[page-for="' + divName + '"]').append('<div class="panel-footer">'
			+ '<button class="btn btn-primary" id="saveResource"><i class="fa fa-save"></i>&nbsp'
			+ '<span>' + getResource("text.save") + '</span></button>'
			+ '<button class="btn btn-danger" id="cancelResource"><i class="fa fa-times"></i>&nbsp'
			+ '<span>' + getResource("text.cancel") + '</span></button>'
			+ '</div>');
	
	$('#cancelResource').click(function() {
		
		options.clearDialog();
		$('div[page-for="' + divName + '"]').hide();
		$('#'+divName).show();
	});
	
	$('#saveResource').click(function() {
		if (options.validate) {
			if (!options.validate()) {
				log("Resource validation failed");
				return;
			}
		}
		var resource = options.createResource();

		log("Created resource object for posting");

		postJSON(options.resourceUrl, resource, function(data) {
			if (data.success) {
				log("Resource object created");
				
				if (options.hasResourceTable) {
					if($('#'+divName).data('editing')) {
						$('#' + dialogOptions.divName + 'Table').dataTable().fnUpdate(data.resource, $('#'+divName).data('row'));
					} else {
						$('#' + options.divName + 'Table').dataTable().fnAddData(data.resource);
					}
				}
				if (options.resourceCreated) {
					options.resourceCreated(data.resource);
				}
				
				$('div[page-for="' + divName + '"]').hide();
				$('#'+divName).show();
				
				showInformation(true, data.message);
			} else {
				log("Resource object creation failed " + data.message);
				showError(false, data.message);
			}
		});
	});
	
	var columns = new Array();
	var columnsDefs = new Array();

	$.each(
		options.fields,
		function(idx, obj) {
			$('#' + divName + 'TableHeader')
					.append(
						'<th>' + getResource(options.resourceKey + "." + obj.name + '.label') + '</th>');
			columns.push({ "mData" : obj.name, });
			if (obj.isResourceKey) {
				columnsDefs
						.push({ "aTargets" : [ idx ], "mData" : null, "mRender" : function(data, type, full) {
							return getResource(options.resourceKey + "." + data + '.label');
						} });
			}
	});

	var renderActions = function(idCol) {
		var id = idCol.aData.id;
		var renderedActions = '';

		if (options.additionalActions) {
			$
					.each(
						options.additionalActions,
						function(x, act) {
							if (act.enabled) {

								renderedActions += '<a class="btn ' + (act.buttonClass ? act.buttonClass : 'btn-success') + ' row-' + act.resourceKey + '" href="#"><i class="fa ' + act.iconClass + '"></i></a>';

								$(document).off('click',
									'#' + divName + 'Actions' + id + ' .row-' + act.resourceKey);

								$(document).on(
									'click',
									'#' + divName + 'Actions' + id + ' .row-' + act.resourceKey,
									function() {
										var curRow = $('#' + divName + 'Table').dataTable()
												.fnGetPosition($(this).closest("tr").get(0));
										var resource = $('#' + divName + 'Table').dataTable()
												.fnGetData(curRow);
										act.action(resource);
									});
							}

						});
		}

//		if (options.canUpdate) {
			renderedActions += '<a class="btn btn-info row-edit" href="#"><i class="fa fa-edit"></i></a>';

			$(document).off('click', '#' + divName + 'Actions' + id + ' .row-edit');

			$(document).on(
				'click',
				'#' + divName + 'Actions' + id + ' .row-edit',
				function() {
					var curRow = $('#' + divName + 'Table').dataTable().fnGetPosition(
						$(this).closest("tr").get(0));
					var resource = $('#' + divName + 'Table').dataTable().fnGetData(
						curRow);

					$('#'+divName).data('editing', true);
					$('#'+divName).data('row', curRow);
					$('#'+divName).data('creating', false);
					
					options.displayResource(resource);
					
					$('#'+divName).hide();
					$('div[page-for="' + divName + '"]').show();
				});
//		}

		if (options.canDelete) {
			renderedActions += '<a class="btn btn-danger row-delete" href="#"><i class="fa fa-trash-o"></i></a>';

			$(document).off('click', '#' + divName + 'Actions' + id + ' .row-delete');

			$(document).on(
				'click',
				'#' + divName + 'Actions' + id + ' .row-delete',
				function() {

					log("Entering resource delete for id " + id);

					var row = $(this).closest("tr").get(0);
					var resource = $('#' + divName + 'Table').dataTable().fnGetData(row);

					bootbox.confirm(getResource(options.resourceKey + ".delete.desc")
							.format(resource.name), function(confirmed) {
						if (confirmed) {
							deleteJSON(options.resourceUrl + "/" + id, null, function(data) {
								if (data.success) {
									if (options.resourceDeleted) {
										options.resourceDeleted(resource);
									}
									$('#' + divName + 'Table').dataTable().fnDeleteRow(row);
									showInformation(true, data.message);
								} else {
									bootbox.alert(data.message);
								}
							});
						}
					});
				});
		}

		return '<div id="' + divName + 'Actions' + id + '" class="tableActions">' + renderedActions + '</div>';
	};

	$('#' + divName + 'TableHeader').append(
		'<th localize="text.actions" class="col-md-2"></th>');
	columns.push({ "mData" : null, 
		"fnRender" : renderActions, 
		"bAutoWidth" : false, 
		"sWidth" : "150px", 
		"bSortable" : false 
		});

	var oTable = $('#' + divName + 'Table')
			.dataTable(
				{ "bProcessing" : true, 
					"bServerSide" : true, 
					"sAjaxSource" : basePath + "/api/" + options.tableUrl, 
					"iDisplayLength": 10,
					"aoColumns" : columns, 
					"aoColumnDefs" : columnsDefs });

	if(options.selected) {
	    var tableTools = new $.fn.dataTable.TableTools( oTable, {
	        sRowSelect: "os",
	        fnRowSelected: function ( nodes ) {
	        	var full = oTable.fnGetData(nodes[0]);
	        	options.selected(full);
	        }
	    });
	}
	
	if (options.canCreate) {

		$('#' + divName + 'Actions')
				.append(
					'<button id="' + divName + 'Add" class="btn btn-primary"><i class="fa fa-plus-circle"></i>' + getResource('text.add') + '</button>');
		$('#' + divName + 'Add').click(function() {
			if (options.showCreate) {
				options.showCreate();
			}
			$('#'+divName).data('editing', false);
			$('#'+divName).data('creating', true);
			$('#'+divName).hide();
			$('div[page-for="' + divName + '"]').show();
		});
	}
	
	if(options.additionalButtons) {
		
		$.each(options.additionalButtons, function() {
			$('#' + divName + 'Actions').append(
				'<button id="' + this.resourceKey + '" class="btn ' + this.buttonClass + '"><i class="fa ' + this.icon + '"></i>' + getResource(this.resourceKey + '.label') + '</button>');
			var button = this;
			$('#' + this.resourceKey).click(function() {
				if(button.action) {
					button.action();
				}
			});
		});
	}

	if (options.complete) {
		options.complete();
	}

};

$.fn.resourceDialog = function(params, params2) {

	var dialog = $(this);
	var parent = $(this).parent();
	var options = $.extend(
		{ dialogWidth : 700, dialogHeight : 'auto', hasResourceTable : true },
		params);
	var dialogOptions = $(this).data('options');

	if (params === 'create') {

		log("Creating resource dialog");

		dialogOptions.clearDialog(true);
		dialog.resourceDialog('error', 'reset');

		$(this).find('.modal-title').text(
			getResource(dialogOptions.resourceKey + '.create.title'));

		$(this).find('.modal-footer').empty();
		$(this).find('.modal-footer').append(
					'<button type="button" id="' + $(this).attr('id') + 'Action" class="btn btn-primary"><i class="fa fa-save"></i>' + getResource("text.create") + '</button>');
		$('#' + $(this).attr('id') + "Action").off('click');
		$('#' + $(this).attr('id') + "Action").on('click', function() {
				
				var icon = $(this).find('i');
				startSpin(icon, 'fa-save');
				
				log("Creating resource");

				if (dialogOptions.validate) {
					if (!dialogOptions.validate(true)) {
						stopSpin(icon, 'fa-save');
						log("Resource validation failed");
						return;
					}
				}
				
				var resource = dialogOptions.createResource();

				log("Created resource object for posting");

				postJSON(dialogOptions.resourceUrl, resource, function(data) {
					if (data.success) {
						log("Resource object created");
						dialog.resourceDialog('close');
						if (dialogOptions.hasResourceTable) {
							$('#' + dialogOptions.divName + 'Table').dataTable().fnAddData(
								data.resource);
						}
						if (dialogOptions.resourceCreated) {
							dialogOptions.resourceCreated(data.resource);
						}
						showInformation(true, data.message);
					} else {
						log("Resource object creation failed " + data.message);
						dialog.resourceDialog('error', data.message);
					}
				}, null, function() { stopSpin(icon, 'fa-save');});
			});
		dialog.modal('show');

	} else if (params === 'edit' || params === 'read') {
		var readOnly = params==='read';
		dialogOptions.clearDialog(false);
		dialog.resourceDialog('error', 'reset');
		dialogOptions.displayResource(params2.resource, readOnly);
		
		if(readOnly) {
			$(this).find('.modal-title').text(
					getResource(dialogOptions.resourceKey + '.view.title'));
		} else {
			$(this).find('.modal-title').text(
					getResource(dialogOptions.resourceKey + '.update.title'));
		}

		$(this).find('.modal-footer').empty();
		if(!readOnly) {
			$(this).find('.modal-footer').append(
						'<button type="button" id="' + $(this).attr('id') + 'Action" class="btn btn-primary"><i class="fa fa-save"></i>' + getResource("text.update") + '</button>');
			$('#' + $(this).attr('id') + "Action").off('click');
			$('#' + $(this).attr('id') + "Action").on('click', function() {

				var icon = $(this).find('i');
				startSpin(icon, 'fa-save');
				
				log('Updating resource');
				
				if (dialogOptions.validate) {
					if (!dialogOptions.validate(false)) {
						stopSpin(icon, 'fa-save');
						return;
					}
				}
				
				var resource = dialogOptions.createResource();

				postJSON(dialogOptions.resourceUrl, resource, function(data) {
					if (data.success) {
						dialog.resourceDialog('close');
						if (dialogOptions.hasResourceTable) {
							$('#' + dialogOptions.divName + 'Table').dataTable().fnUpdate(
								data.resource, params2.row);
						}
						if (dialogOptions.resourceUpdated) {
							dialogOptions.resourceUpdated(data.resource);
						}
						showInformation(true, data.message);
					} else {
						dialog.resourceDialog('error', data.message);
					}
				}, null, function() { stopSpin(icon, 'fa-save');});

			});
		}
		
		dialog.modal('show');

	} else if (params === 'close') {
		dialog.modal('hide');
	} else if (params === 'error') {

		$(this).find('.dialogError')

		$('#dialogErrorHighlight' + $(this).attr('id'), $(this)).remove();

		if (params2 != 'reset') {
			$(this)
					.prepend(
						'<div id="dialogErrorHighlight' + $(this).attr('id') + '" class="alert alert-danger"/>');
			$('#dialogErrorHighlight' + $(this).attr('id'))
					.append(
						'<i class="fa fa-warning"></i>&nbsp;&nbsp;<span>' + (getResourceNoDefault(params2) == undefined ? params2 : getResource(params2)) + '</span>');
		}
	} else {
		if (!options.resourceKey) {
			alert("Bad usage, resourceKey not set");
		} else {
			$(this).data('options', options);
		}
	}
};

function startSpin(element, iconClass) {
	element.removeClass(iconClass);
	element.addClass('fa-spin');
	element.addClass('fa-spinner');
}

function stopSpin(element, iconClass) {
	element.removeClass('fa-spin');
	element.removeClass('fa-spinner');
	element.addClass(iconClass);
}


function PropertyItem(id, value) {
	this.id = id;
	this.value = value;
}

var progressOptions = { lines : 11, // The number of lines to draw
	length : 0, // The length of each line
	width : 3, // The line thickness
	radius : 7, // The radius of the inner circle
	corners : 1, // Corner roundness (0..1)
	rotate : 0, // The rotation offset
	color : '#fff', // #rgb or #rrggbb
	speed : 1, // Rounds per second
	trail : 46, // Afterglow percentage
	shadow : false, // Whether to render a shadow
	hwaccel : false, // Whether to use hardware acceleration
	className : 'spinner', // The CSS class to assign to the spinner
	zIndex : 2e9, // The z-index (defaults to 2000000000)
	top : 'auto', // Top position relative to parent in px
	left : 'auto' // Left position relative to parent in px
};

function showBusy() {

	log("Showing busy");

	if ($('#progress')) {
		$('#progress').spin(progressOptions);
	}
};

function hideBusy() {

	log("Hiding busy");

	if ($('#progress')) {
		$('#progress').spin(false);
	}
};

/**
 * Clear the main content div
 */
function clearContent() {
	log("Clearing content");
	$('#informationBar').empty();
	$(contentDiv).empty();
};


function startLogon() {
	logon(null, {
		showBusy: showBusy,
		hideBusy: hideBusy,
		logonStarted: function() {
			$('div[role="dialog"]').remove();
			$('#actionLogoff').remove();
			$('#nav').hide();
			$('#navMenu').empty();
		},
		processResponse: function(data) {
			$('#version').text(getResource("label.version") + " " + data.version);
			clearContent();
			$('#currentRealm').remove();
			$('#lang').remove();
			$('#navMenu').empty();
		},
		processForm: function(data) {
			if (data.showLocales) {
				$('#navMenu')
						.append(
							'<li class="navicon" id="langMenu" class="dropdown"><a class="dropdown-toggle" data-toggle="dropdown" href="#"><i class="fa fa-globe"></i></a></li>');
				$('#langMenu')
						.append(
							'<ul id="lang" class="dropdown-menu dropdown-menu-right" role="menu" aria-labelledby="dropdownMenu1"></ul>');
				$('#lang')
						.append(
							'<li role="presentation"><a role="menuitem" tabindex="-1" href="#">' + getResource("en") + '</li>');

				$('#lang').change(function() {

					log("Switching language to " + this.value);

					getJSON('switchLanguage/' + this.value, null, function() {
						document.location.reload();
					});
				});
			}
		},
		logonCompleted: function(data) {
			if(data.homePage != '') {
				window.open(data.homePage, "_self", false);
			} else {
				home(data);
			}
		},
		formContent: $(contentDiv)
	});
}

function logoff() {

	log("Logging off");

	$(document).data('session', null);
	
	showBusy();

	$.get(basePath + '/api/logoff', null, function() {
		startLogon();
	});

}

function home(data) {

	log("Entering home");

	showBusy();

	// Menu
	$('#navMenu').empty();
	$('#nav').show();
	$('#informationBar').empty();
	$('#main-menu').remove();

	$(contentDiv).empty();
	$(contentDiv)
			.append(
				'<div id="main-menu" class="sidebar col-md-2 col-sm-1"><div id="menu" class="sidebar-collapse"></div></div>');

	currentRealm = data.session.currentRealm;
	var showLocales = data.showLocales;
	getJSON(
		'menus',
		null,
		function(data) {

			log("Received menus");

			$('#menu').empty();

			$.each(
				data.menus,
				function() {
					$('#menu')
							.append(
								'<div id="menu_' + this.id + '" class="nav-sidebar title"><span>' + getResource(this.resourceKey + '.label') + '</span></div>');

					if (this.menus.length > 0) {
						var menu = '#sub_' + this.id;
						$("#menu").append(
							'<ul id="sub_' + this.id + '" class="nav nav-sidebar"/>');
						$
								.each(
									this.menus,
									function() {
										$(menu)
												.append(
													'<li><a id="' + this.id + '" href="#" class="sideMenu"><i class="fa ' + this.icon + '"></i><span class="hidden-sm text">' + getResource(this.resourceKey + '.label') + '</span></span></a></li>');
										$('#' + this.id).data('menu', this);
										$('#' + this.id).click(function() {
											$(".sideMenu").removeClass("active");
											$(this).addClass("active");
											loadMenu($('#' + $(this).attr('id')).data('menu'));
										});
										if (currentMenu == null) {
											currentMenu = this;
										}
									});
					}

					$('#' + this.id).click(function() {
						$(this).addClass("active");
						loadMenu($(this).data('menu'));
					});

				});

			$('#navMenu')
					.append(
						'<li class="navicon"><a id="main-menu-toggle" class="hidden-sm hidden-md hidden-lg" href="#"><i class="fa fa-bars"></i></a></li>');

			$('#currentRealm').remove();
			if (data.realms) {
				if(data.realms.length > 1) {
					loadRealms(data.realms);
				}
			}
			
			$(window).resize(function() {
				if ($(this).width() < 959) {
					if (!$('#main-menu').data('toggled')) {
						$('#main-menu').addClass('hidden-xs');
					}
				} else {
					$('#main-menu').data('toggled', false);
					$('#main-menu').removeClass('hidden-xs');
				}
			})

			$('#main-menu-toggle').click(function() {
				if ($(window).width() < 959) {
					$('#main-menu').data('toggled', true);
					if ($('#main-menu').hasClass('hidden-xs')) {
						$('#main-menu').removeClass('hidden-xs');
						$('#main-menu').show();
					} else {
						$('#main-menu').addClass('hidden-xs');
					}
				} else {
					$('#main-menu').data('toggled', false);
					if (!$('#main-menu').is(':visible')) {
						$('#main-menu').show();
					} else {
						$('#main-menu').hide();
					}

				}
			});

			$('#navMenu').append('<li class="navicon" id="powerMenu" class="dropdown"><a class="dropdown" data-toggle="dropdown" href="#"><i class="fa fa-power-off"></i></a></li>');
			
			$('#powerMenu')
			.append(
				'<ul id="power" class="dropdown-menu dropdown-menu-right" role="menu"></ul>');
			$('#power')
				.append(
					'<li role="presentation"><a class="powerClick" data-value="shutdown" role="menuitem" tabindex="-1" href="#">' + getResource("shutdown.label") + '</li>');
			$('#power')
				.append(
					'<li role="presentation"><a class="powerClick" data-value="restart" role="menuitem" tabindex="-1" href="#">' + getResource("restart.label") + '</li>');
			
			$('.powerClick').click(function(e) {
				var action = $(this).attr('data-value');
					bootbox.confirm(getResource("power.confirm").format(getResource(action + '.label')), function(result) {
							if(result) {
								getJSON('server/' + action + '/5', function(data) {
										if(data.success) {
											showInformation(false, getResource("power.completed").format(getResource(action + '.label')));
										} else {
												showError(data.error);
										}
								});
							}
					});
			});
	
		if (showLocales) {
				
				$('#navMenu')
						.append(
							'<li class="navicon" id="langMenu" class="dropdown"><a class="dropdown-toggle" data-toggle="dropdown" href="#"><i class="fa fa-globe"></i></a></li>');
				$('#langMenu')
						.append(
							'<ul id="lang" class="dropdown-menu dropdown-menu-right" role="menu" aria-labelledby="dropdownMenu1"></ul>');
				$('#lang')
						.append(
							'<li role="presentation"><a class="langSelect" role="menuitem" tabindex="-1" data-value="en" href="#">' + getResource("en") + '</li>');
				/** 
				$('#lang')
						.append(
							'<li role="presentation"><a class="langSelect" role="menuitem" tabindex="-1" data-value="da" href="#">' + getResource("da") + '</li>');
				$('#lang')
						.append(
							'<li role="presentation"><a class="langSelect" role="menuitem" tabindex="-1" data-value="nl" href="#">' + getResource("nl") + '</li>');
				$('#lang')
						.append(
							'<li role="presentation"><a class="langSelect" role="menuitem" tabindex="-1" data-value="fi" href="#">' + getResource("fi") + '</li>');
				$('#lang')
						.append(
							'<li role="presentation"><a class="langSelect" role="menuitem" tabindex="-1" data-value="fr" href="#">' + getResource("fr") + '</li>');
				$('#lang')
						.append(
							'<li role="presentation"><a class="langSelect" role="menuitem" tabindex="-1" data-value="de" href="#">' + getResource("de") + '</li>');
				$('#lang')
						.append(
							'<li role="presentation"><a class="langSelect" role="menuitem" tabindex="-1" data-value="it" href="#">' + getResource("it") + '</li>');
				$('#lang')
						.append(
							'<li role="presentation"><a class="langSelect" role="menuitem" tabindex="-1" data-value="no" href="#">' + getResource("no") + '</li>');
				$('#lang')
						.append(
							'<li role="presentation"><a class="langSelect" role="menuitem" tabindex="-1" data-value="pl" href="#">' + getResource("pl") + '</li>');
				$('#lang')
						.append(
							'<li role="presentation"><a class="langSelect" role="menuitem" tabindex="-1" data-value="ru" href="#">' + getResource("ru") + '</li>');
				$('#lang')
						.append(
							'<li role="presentation"><a class="langSelect" role="menuitem" tabindex="-1" data-value="sv" href="#">' + getResource("sv") + '</li>');
				$('#lang')
						.append(
							'<li role="presentation"><a class="langSelect" role="menuitem" tabindex="-1" data-value="es" href="#">' + getResource("es") + '</li>');
				$('#lang')
						.append(
							'<li role="presentation"><a class="langSelect" role="menuitem" tabindex="-1" data-value="ja" href="#">' + getResource("ja") + '</li>');
				**/
				$('.langSelect').click(function(e) {

					e.preventDefault();
					
					log("Switching language to " + $(this).attr('data-value'));

					getJSON('session/switchLanguage/' + $(this).attr('data-value'), null, function() {
						document.location.reload();
					});
				});
			}

			// Load current page
			$(contentDiv).append(
				'<div class="col-md-10 col-sm-11 main"><div id="informationBar"/><div id="mainContent"/></div>');

			// Setup header actions
			$('#navMenu')
					.append(
						'<li class="navicon"><a id="actionLogoff" href="#"><i class="fa fa-sign-out"></i></a></li>');

			$('#actionLogoff').tooltip();
			$('#actionLogoff').click(function() {
				logoff();
			});

			$('#' + currentMenu.id).trigger('click');

			hideBusy();
		});

	// checkNotifications();

}

function loadRealms(realms) {

	$('#currentRealm').remove();
	
	var deletedCurrentRealm = true;
	$.each(realms, function() {
		if (currentRealm.id === this.id) {
			deletedCurrentRealm = false;
		}
	});

	if (deletedCurrentRealm) {
		currentRealm = realms[0];
	}
	
	var func = function(realm) {
		getJSON('session/switchRealm/' + realm, null,
			function(data) {
				if (!data.success) {
					showError(false, data.errorMsg);
				} else { 
					// TODO reload and load the same page.
					document.location.reload();
				}
			});
	};
	
	if(realms.length > 1) {
		$('#main-menu-toggle').parent().after('<li id="currentRealm" class="navicon" class="dropdown"><a class="dropdown" data-toggle="dropdown" href="#"><i class="fa fa-database"></i></a></li>');

		$('#currentRealm').append('<ul id="realm" class="dropdown-menu dropdown-menu-right" role="menu" aria-labelledby="dropdownMenu1"></ul>');
		$.each(realms, function() {
			$('#realm').append(
				'<li role="presentation"><a class="realmSelect" href="#" role="menuitem" tabindex="-1" data-value="' + this.id + '">' + this.name + '</a></li>');
		});
	
		$('.realmSelect').on(
			'click', function(evt) {
				evt.preventDefault();
				func($(this).attr('data-value'));
			}
		);
	}
	
	if (deletedCurrentRealm) {
		func(currentRealm.id);
	}
}

function reloadRealms() {
	$.getJSON(basePath + "/api/realms/list", null, function(data) {
		loadRealms(data.resources);
		// This should not be needed but some areas reload the page and so the state does not get updated
		// http://stackoverflow.com/questions/11519660/twitter-bootstrap-modal-backdrop-doesnt-disappear
		$('body').removeClass('modal-open');
		$('.modal-backdrop').remove();
	});
}

function checkNotifications() {

	if ($(document).data('session') != null) {
		$
				.getJSON(
					basePath + "/api/notifications/notification/core",
					null,
					function(data) {

						if (data.success) {
							$.pnotify.defaults.styling = "jqueryui";

							$
									.each(
										data.resource,
										function(idx, obj) {
											$
													.pnotify({ title : obj.titleIsResourceKey ? getResource(obj.title) : obj.title, text : obj.textIsResourceKey ? getResource(obj.text) : obj.text });
										});

						}
					}).always(function() {
					if ($(document).data('session') != null) {
						log("Posting next notification check in 60 secs");
						setTimeout(function() {
							checkNotifications();
						}, 60000);
					}
				});
	}

}

function loadComplete(pageChange) {
	log("Signaling load complete");
	$('#mainContent').data('loadComplete', true);
	$('#mainContent').data('pageChange', pageChange);
}

function loadWait() {

	log("Waiting for page load");

	if($('#mainContent').data('pageChange')) {
		$('#mainContent').data('pageChange')();
		$('#mainContent').data('pageChange', null);
	}
	
	setTimeout(function() {
		if ($('#mainContent').data('loadComplete')) {
			log("Page has loaded");
			$('#mainContent').show();
			hideBusy();
		} else {
			loadWait();
		}
	}, 100);
}

function loadMenu(menu) {

	log("Loading menu " + menu);

	showBusy();

	if (currentMenu) {
		$('#' + currentMenu.id).removeClass('active');
	}
	currentMenu = menu;

	$('#mainContent').hide();
	$('#informationBar').empty();
	$('#mainContent').empty();
	
	$('div[role="dialog"]').remove();
	$('#mainContent').data('loadComplete', false);

	if(menu.menus.length > 0) {

		$('#mainContent').append('<div class="col-xs-12" id="subMenuContent">'
				+ '<div class="row">'
					+ '<div class="panel panel-default">'
						+ '<div id="subMenuIconPanel" class="panel-body"></div>'
					+ '</div>'
				+ '</div>'
			+ '</div>'
			+ '<div id="subMenuPageContent">'
				+ '<div class="row">'
					+ '<div class="col-xs-12" id="menuContent"></div>'
				+ '</div>'
			+ '</div>');
						
		$.each(menu.menus, function() {
			$('#subMenuIconPanel').append(
				'<div class="col-xs-2"><a class="large-button subMenu" data-value="' + this.resourceName + '" id="button_' + this.resourceName + '">'
						+ '<i class="fa ' + this.icon + '"></i><p>' + getResource(this.resourceKey + '.title') + '</p>'
					+ '</a>'
				+ '</div>');
		});
	
		for(var i=0;i<menu.menus.length;i++) {
			$('#subMenuIconPanel').append('<div class="col-xs-2"></div>');
			$(document).data(menu.menus[i].resourceName, menu.menus[i]);
		}
		
		currentMenu = menu.menus[0];

		$('.subMenu').click(function(e) {
			e.preventDefault();
			currentMenu = $(document).data($(this).attr('data-value'));
			loadSubPage($(this).attr('data-value'), $(this));
		});
		
		$('.subMenu').first().trigger('click');
		
	} else {
	
	
		$('#mainContent').load('content/' + menu.resourceName + '.html', function() {
			loadWait();
		});
	}
}

function loadSubPage(page, element) {
	
	$('#subMenuIconPanel').find('.large-button-active').removeClass('large-button-active');
	element.addClass('large-button-active');
	$('#menuContent').load('content/' + page + '.html', function() {
		loadWait();
	});
}

