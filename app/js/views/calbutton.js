App.Views.calbutton = Backbone.View.extend({
	el:$("#calcubutton"),

	initialize:function(){
		var that = this;

		setTimeout(function(){
			that.$el.css("display","block");    
		},1000);
	},

	events:{
		"click":"calculate"
	},

	//正在显示中
	viewing:false,

	calculate:function(){
		var that = this;

		if (!this.$el.hasClass("btn-danger")) {
			return false;
		};

		if (!this.viewing) {
			that.$el.removeClass("btn-danger");
			this.$el.addClass("btn-primary");
			this.viewing = true;
			App.singleC.calculate();
		};	
	},

	enter:function(){
		var that = this;

		if (!this.$el.hasClass("btn-danger")) {
			this.$el.addClass("btn-danger");
			this.$el.removeClass("btn-primary");
		}
	},

	leave:function(){
		if (this.$el.hasClass("btn-danger")) {
			this.$el.removeClass("btn-danger");	
			this.$el.addClass("btn-primary");
		}
	}
});