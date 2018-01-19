sap.ui.define(["sap/ui/core/Control",
	"./utils/ControlUtils",
	"sap/ui/model/json/JSONModel",
	"./libs/pdf"
], function(Control, ControlUtils, JSONModel) {
	"use strict";
	return Control.extend("ui5lab.wl.pdf.PdfViewer", {
		"metadata": {
			"properties": {
				"pdfSource": "string",
				"height": "string",
				"currentPage": "string",
				"totalPages": "string"
			},
			"events": {}
		},
		init: function() {
			this.count = 1;
			this.firstTime = true;
			this._toolbar = ControlUtils.getToolbar([
				ControlUtils.getSpacer(),
				ControlUtils.getButton(false, 'zoom-in', this.zoomin.bind(this)),
				ControlUtils.getButton(false, 'zoom-out', this.zoomout.bind(this)),
				ControlUtils.getText(this.getPageStatus.bind(this)),
				ControlUtils.getButton(false, 'sys-prev-page', this.prevPage.bind(this)),
				ControlUtils.getButton(false, 'sys-next-page', this.nextPage.bind(this)),
				ControlUtils.getSpacer()
			]);
			this._toolbar.setModel(new JSONModel({currentpage:0,pages:0}),"pdf");
		},
		renderer: function(oRm, oControl) {
			oRm.write("<div ");
			oRm.writeControlData(oControl); // writes the Control ID and enables event handling - important!
			oRm.write(">");
			oRm.renderControl(oControl._toolbar);

			oRm.write("<div");
			oRm.addClass("sapMScrollCont");
			oRm.addClass("sapMScrollContVH");
			oRm.writeClasses();
			oRm.addStyle("height", oControl.getHeight());
			oRm.addStyle("overflow", "auto");
			oRm.writeStyles();
			oRm.write(">");
			oRm.write("<canvas id='" + oControl.getId() + "-canvas'>");
			oRm.write("</canvas>");
			oRm.write("</div>");
			oRm.write("</div>");
		},
		onAfterRendering: function(evt) {
			if (sap.ui.core.Control.prototype.onAfterRendering) {
				sap.ui.core.Control.prototype.onAfterRendering.apply(this, arguments);
			}
			// this.setPdfSource(this.getPdfSource());
			if (!this.isRendering) {
				this.updatePDF();
			}

		},
		getPageStatus:function(){
			return '{pdf>/currentpage} / {pdf>/pages}';
		},
		setPdfSource: function(pdfsource) {
			this.setProperty("pdfSource", pdfsource, true);
			this.updatePDF();
		},
		zoomin: function() {
			this.scale = this.scale + 0.25;
			this.displayPDF(this.pageNumber);
		},
		zoomout: function() {
			this.scale = this.scale - 0.25;
			this.displayPDF(this.pageNumber);
		},
		nextPage: function() {
			if (this.pageNumber >= this.pdf.numPages) {
				return;
			}
			this.pageNumber++;
			this.displayPDF(this.pageNumber);
		},
		prevPage: function() {
			if (this.pageNumber <= 1) {
				return;
			}
			this.pageNumber--;
			this.displayPDF(this.pageNumber);
		},
		updatePDF: function() {
			// if (!this.firstTime && this.count !== 2) {
			// 	this.count = 0;
			// }
			var me = this;
			me.isRendering = true;
			if (this.getPdfSource()) { // && this.count < 2) { // && this.old !== this.getPdfSource()) {
				this.old = this.getPdfSource();
				this.count = this.count + 1;
				this.firstTime = false;
				var pdfData = atob(this.getPdfSource().split(",")[1]);

				PDFJS.workerSrc = jQuery.sap.getModulePath("ui5lab.wl.pdf.libs.pdf") + ".worker.js";

				var loadingTask = PDFJS.getDocument({
					data: pdfData
				});

				loadingTask.promise.then(function(pdf) {

					// Fetch the first page
					me.pageNumber = 1;
					me.scale = 1;
					me.pdf = pdf;
					me._toolbar.getModel("pdf").setProperty("/pages",me.pdf.numPages);
					me.displayPDF(me.pageNumber);
				}, function(reason) {
					// PDF loading error
					console.error(reason);
				});
				// } else {
				// 	this.old = "";
				// 	this.count = 1;
			}
		},
		displayPDF: function(num) {
			var me = this;
			if (this.pdf) {
				me._toolbar.getModel("pdf").setProperty("/currentpage",num);
				this.pdf.getPage(num).then(function(page) {
					me.renderPDF(page);
				});
			}
		},
		renderPDF: function(page) {
			var me = this;
			var viewport = page.getViewport(me.scale);

			// Prepare canvas using PDF page dimensions
			var canvas = jQuery.sap.domById(me.getId() + "-canvas");
			if (!canvas) {
				me.isRendering = false;
				return;
			}
			var context = canvas.getContext("2d");
			canvas.height = viewport.height;
			canvas.width = viewport.width;

			// Render PDF page into canvas context
			var renderContext = {
				canvasContext: context,
				viewport: viewport
			};
			var renderTask = page.render(renderContext);
			renderTask.then(function() {
				me.isRendering = false;
				// console.log('Page rendered');
			});
		}
	});
});