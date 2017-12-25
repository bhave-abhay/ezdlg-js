
;var stepup = function ($) {
	'use strict';

	var Vetoable = function () {
		var fVetoed = false;
		var arrVetoReason = [];
		this.veto = function(sVetoReason, sTarget) {
			fVetoed = true;
			if (sVetoReason !== undefined || sTarget !== undefined) {
				arrVetoReason.push({
					sReason: sVetoReason,
					sTarget: sTarget
				});
			}
		};
		this.isVetoed = function() {
			return !!fVetoed;
		};
		this.getVetoReasons = function() {
			if (fVetoed) {
				return arrVetoReason.slice();
			}
			return null;
		}
	}

	var EzForm = function (objOptions) {
		//Defaults
		var _handlers = {
			cbGetData: function() { return {}; },
			cbShowData: function(objData) {},
			cbOnDirty: function() {}
		};
		var jqElts = {
			validationSummary: null
		};

		//init
		var eltvalidationSummary = this.find('*[data-ezform-tag="ValidationSummary"]')[0];

		jqElts.validationSummary = $(eltvalidationSummary);
		jqElts.validationSummary.empty().hide();

		if (objOptions === undefined) {
			objOptions = {};
		}
		if (typeof(objOptions.cbGetData) === 'function') {
			_handlers.cbGetData = objOptions.cbGetData;
		}
		if (typeof(objOptions.cbShowData) === 'function') {
			_handlers.cbShowData = objOptions.cbShowData;
		}

		//event handlers
		{
			let this_ = this;
			this_.on('change', '*[data-ezform-causesvalidation="true"]', function() {
				this_.validate();
			});
		}


		//members
		this.validate = function() {
			var evt = $.extend({},
				new $.Event("ezform:validate"),
				new Vetoable()
			);
			$('*[data-ezform-causesvalidation="true"]', this).removeClass(objOptions.sInvalidClass);

			jqElts.validationSummary.empty().hide();
			this.trigger(evt);
			if (evt.isVetoed()) {
				var arrReasons = evt.getVetoReasons();
				let ul = $('<ul></ul>');
				for (var i = 0; i < arrReasons.length; i++) {
					if(arrReasons[i].sTarget !== undefined){
						$('#' + arrReasons[i].sTarget).addClass(objOptions.sInvalidClass);
					}
					if(arrReasons[i].sReason !== undefined){
						ul.append(
							$('<li></li>').html(arrReasons[i].sReason)
						);
					}
				}
				jqElts.validationSummary.html(ul).show();
				return false;
			}
			return true;
		}
		this.ezval = function(newVal) {
			if (newVal === undefined) { //Get
				if (this.validate()) {
					return _handlers.cbGetData();
				}
				return undefined;
			} else { //Set
				_handlers.cbShowData(newVal);
				$('*[data-ezform-causesvalidation="true"]', this).removeClass(objOptions.sInvalidClass);
				jqElts.validationSummary.empty().hide();
			}
		};

		return this;
	};

	var EzDialog = function () {
		var timerID = null;
		var cbOnTimeout = null;
		var cbOnClose = null;
		var jqElts = {
			dialog_title: $(this.find('*[ data-ezdialog-tag="dialog_title"]')[0]),
			dialog_close: $(this.find('*[ data-ezdialog-tag="dialog_close"]')[0]),
			dialog_message: $(this.find('*[ data-ezdialog-tag="dialog_message"]')[0]),
			dialog_footer: $(this.find('*[ data-ezdialog-tag="dialog_footer"]')[0]),
			dialog_dialogForm: null
		};
		//evet handlers
		{
			var this_dialog = this;
			jqElts.dialog_close.on('click', function(e) {
				this_dialog.hide_dialog();
				e.preventDefault();
			});
			this_dialog.on('hidden.bs.modal', function() {
				jqElts.dialog_footer.empty();
				this_dialog.off('shown.bs.modal');
				$(document, jqElts.dialog).off('keyup');
				if (timerID !== null) {
					clearTimeout(timerID);
					timerID = null;
				}
				if (typeof(cbOnClose) === 'function') {
					cbOnClose();
					cbOnClose = null;
				}
			});
			$('body').on('click', '*[data-ezdialog-btn="true"]', function(e) {
				function getEventData(btnId){
					var data = {
						btnId: btnId,
						fValid: jqElts.dialog_dialogForm.validate()
					};
					if (data.fValid) {
						data.formData = jqElts.dialog_dialogForm.ezval();
					}
					return data;
				}
				var targetbtnid = $(e.target).data('btnid');
				if( targetbtnid !== undefined) {
					var evt = new $.Event('ezdialog:buttonclick');
					var dialogFormInfo = getEventData(targetbtnid);
					this_dialog.trigger(evt, dialogFormInfo);
					e.preventDefault();
				}
			});
		}

		//members
		this.hide_dialog = function() {
			jqElts.dialog_footer.empty();
			if(jqElts.dialog_dialogForm instanceof $){
				jqElts.dialog_dialogForm.hide().detach();
			}
			this_dialog.modal('hide');
		}
		this.show_dialog = function(sTitle, objMessage, objFormData, nTimeoutSec) {
			jqElts.dialog_title.html(sTitle);
			if(jqElts.dialog_dialogForm instanceof $){
				jqElts.dialog_dialogForm.hide().detach();
			}
			jqElts.dialog_dialogForm = null;
			if (typeof(objMessage) === 'string') {
				jqElts.dialog_dialogForm = $('<div></div>').append(objMessage).ezform();
			} else if (objMessage instanceof $) {
				jqElts.dialog_dialogForm = objMessage.show();
			}
			jqElts.dialog_message.html(jqElts.dialog_dialogForm);
			this_dialog.on('shown.bs.modal', function(){
				if (nTimeoutSec !== undefined) {
					if (timerID !== null) {
						clearTimeout(timerID);
						timerID = null;
					}
					timerID = setTimeout(this_dialog.hide_dialog, nTimeoutSec * 1000 /*milliseconds*/);
				}
				if (objFormData !== undefined) {
					jqElts.dialog_dialogForm.ezval(objFormData);
				}
				$(document, jqElts.dialog).keyup(function(e) {
					if (e.keyCode === 27) { // escape key
						this_dialog.hide_dialog();
						e.preventDefault();
					}
				});
			}).on('hidden.bs.modal', function(){
				if (timerID !== null) {
					clearTimeout(timerID);
					timerID = null;
				}
				$(document, jqElts.dialog).off('keyup');
			});

			this_dialog.modal({
				'backdrop': false,
				'keyboard': false,
				'show': true
			});
			return this;
		};
		this.buttons = function(arrButtons) {
			jqElts.dialog_footer.empty();
			for (var i = 0; i < arrButtons.length; i++) {
				var btn = $('<div></div>')
					.attr('data-ezdialog-btn', true)
					.attr('data-btnid', arrButtons[i].btnId)
					.addClass('btn').addClass(arrButtons[i].cssClasses)
					.html(arrButtons[i].sText)
					.appendTo(jqElts.dialog_footer);
			}
			return this;
		};

		this.detach();
		return this;
	}

	$.fn.ezform = EzForm;
	$.fn.ezdialog = EzDialog;
};
stepup(jQuery);
