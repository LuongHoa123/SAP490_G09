/*global QUnit*/

sap.ui.define([
	"upload/controller/batch.controller"
], function (Controller) {
	"use strict";

	QUnit.module("batch Controller");

	QUnit.test("I should test the batch controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
