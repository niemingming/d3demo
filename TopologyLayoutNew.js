"use strict";
/*
自定义拓扑结构布局，用于显示孤立节点信息
不考虑循环依赖情况，如需处理请扩展doLayout函数
*/
function TopologyLayoutNew(){
	go.LayeredDigraphLayout.call(this);
	//设置参数
	//设置参数
	this._spacing = 120;//默认的组件空间
	this._hspacing = 40;
	this._maxSingleNode = 5;//默认的孤立节点显示数量
}
//声明继承关系
go.Diagram.inherit(TopologyLayoutNew,go.LayeredDigraphLayout);

//复写属性复制方法
TopologyLayoutNew.prototype.cloneProtected = function(copy) {
  go.LayeredDigraphLayout.prototype.cloneProtected.call(this, copy);
};
//复写makeNetwork方法
TopologyLayoutNew.prototype.makeNetwork = function(coll){
	this.oldnetwork = go.LayeredDigraphLayout.prototype.makeNetwork.call(this,coll);
	//处理孤立节点
	var it = this.oldnetwork.vertexes.iterator;
	this.singleNodes = [];
	while(it.next()){
		var v = it.value;
		if(v.sourceEdges.count == 0){
			if(v.destinationEdges.count == 0){
				this.singleNodes.push(v);
			}
		}
	}
	//删除孤立节点
	for(var i = 0; i < this.singleNodes.length; i++){
		this.oldnetwork.deleteVertex(this.singleNodes[i]);
	}
	return this.oldnetwork;
}
//复写doLayout方法
TopologyLayoutNew.prototype.doLayout = function(coll){
	//通过LayerDigraphLayout进行布局计算
	go.LayeredDigraphLayout.prototype.doLayout.call(this,coll);
	//重新添加孤立节点，并根据上一步计算结果重新计算孤立节点坐标。
	var it = this.oldnetwork.vertexes.iterator;
	var xiaxs = [];
	var yiaxs = [];
	var minX = 999;
	while(it.next()){
		var v = it.value;
		var x = v.centerX.toFixed(3);
		if(xiaxs.indexOf(x) == -1){
			xiaxs.push(x);
		}
		minX = Math.min(minX,x);
		var y = v.centerY.toFixed(3);
		if(yiaxs.indexOf(y) == -1){
			yiaxs.push(y);
		}
	}
	xiaxs.sort((a,b)=>{
		return a-b;
	});
	yiaxs.sort((a,b)=>{
		return a-b;
	});
	console.log(yiaxs)
	//计算横纵坐标差值和最大横坐标数。
	this._spacing = xiaxs.length > 1 ? (xiaxs[1] - xiaxs[0]) : this._spacing;
	this._hspacing = yiaxs.length > 1 ? (yiaxs[1] - yiaxs[0]):this._hspacing;
	var maxY = yiaxs.length > 0 ? yiaxs[yiaxs.length - 1]:10;
	maxY = maxY - 0;
	this._maxSingleNode = xiaxs.length > this._maxSingleNode ? xiaxs.length:this._maxSingleNode;
	for(var i = 0; i < this.singleNodes.length; i++){
		this.singleNodes[i].centerX = i%this._maxSingleNode*this._spacing + minX;
		this.singleNodes[i].centerY = (Math.floor(i/this._maxSingleNode)+ 1)*this._hspacing + maxY;
		this.oldnetwork.addVertex(this.singleNodes[i]);
	}
	
	this.network = this.oldnetwork;
	//不在调用updateParts函数，根据源码可以判断，LayerDigrap和Layout重写了commitLayout函数，所有的updateParts函数都是通过该方法刷新页面
	//这里我们直接调用原生刷新方法即可
	this.commitLayoutHlht();
	this.oldnetwork = null;
	this.network = null;
}
TopologyLayoutNew.prototype.commitLayoutHlht = function() {
	//调用顶层图形刷新方法，孤立节点不需要额外计算坐标信息。
	go.Layout.prototype.commitLayout.call(this)
};

//设置属性方法
Object.defineProperty(TopologyLayoutNew.prototype, "spacing", {
  get: function() { return this._spacing; },
  set: function(val) {
    if (typeof val !== "number") throw new Error("new value for SpiralLayout.radius must be a number, not: " + val);
    if (this._spacing !== val) {
      this._spacing = val;
      this.invalidateLayout();
    }
  }
});
//设置属性方法
Object.defineProperty(TopologyLayoutNew.prototype, "hspacing", {
  get: function() { return this._hspacing; },
  set: function(val) {
    if (typeof val !== "number") throw new Error("new value for SpiralLayout.radius must be a number, not: " + val);
    if (this._hspacing !== val) {
      this._hspacing = val;
      this.invalidateLayout();
    }
  }
});
Object.defineProperty(TopologyLayoutNew.prototype, "maxSingleNode", {
  get: function() { return this._maxSingleNode; },
  set: function(val) {
    if (typeof val !== "number") throw new Error("new value for SpiralLayout.radius must be a number, not: " + val);
    if (this._maxSingleNode !== val) {
      this._maxSingleNode = val;
      this.invalidateLayout();
    }
  }
});