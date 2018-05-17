"use strict";
/*
自定义拓扑结构布局，用于显示孤立节点信息
不考虑循环依赖情况，如需处理请扩展doLayout函数
*/
function TopologyLayout(){
	go.Layout.call(this);
	//设置参数
	this._spacing = 120;//默认的组件空间
	this._hspacing = 40;
	this._maxSingleNode = 5;//默认的孤立节点显示数量
}
//声明继承关系
go.Diagram.inherit(TopologyLayout,go.Layout);

//复写属性复制方法
TopologyLayout.prototype.cloneProtected = function(copy) {
  go.Layout.prototype.cloneProtected.call(this, copy);
  copy._spacing = this._spacing;
  copy._maxSingleNode = this._maxSingleNode;
};
//复写布局方法
/*
坐标计算逻辑说明：
1、首先遍历获取根节点和孤立节点
2、从根节点出发，依次找出子节点和下级节点，最终到整个拓扑树，同时形成depth的层级形式。
	需要处理循环依赖、记录父级节点和直接父级节点
3、对不同层次节点进行排序，排序规则，根节点层数最大的优先，子节点，根据父级节点的排序规则依次排序
4、对排序后的矩阵，按照逐级递减形式依次寻找子矩阵，计算节点纵坐标，同时子节点坐标不应低于父级节点坐标位。
5、对覆盖坐标进行处理。
*/
TopologyLayout.prototype.doLayout = function(coll){
	
	var levelNodes = [];
	var singleNodes = [];
	var me = this;
	if(this.network == null) {
		this.network = this.makeNetwork(coll);
	}
	this.arrangementOrigin = this.initialOrigin(this.arrangementOrigin);
	var originx = this.arrangementOrigin.x;
	var originy = this.arrangementOrigin.y;
	//遍历节点
	var it = this.network.vertexes.iterator;
	while(it.next()){
		var v = it.value;
		if(v.sourceEdges.count == 0){
			if(v.destinationEdges.count == 0){
				singleNodes.push(v);
			}else {
				var roots = levelNodes[0]||[];
				levelNodes[0] = roots;
				v.depth = 0;
				v.parentNode = [];
				v.rootNode = v;
				v.maxDepth = 1;
				roots.push(v);
			}
		}
	}
	//遍历根节点绘制图形
	if(levelNodes[0]){
		//递归查找所有依赖关系图，从根节点出发。
		for(var i = 0; i < levelNodes[0].length; i++ ){
			var depth = 1;
			var v = levelNodes[0][i];
			v.destinationEdges.iterator.each(function(edge){
				me.findDestinationDG(edge,depth,v,levelNodes,v);
			});
		}
	}
	var maxY = originy;
	//计算坐标，采用二维矩阵，递归取中值操作，需要记录每一层的当前位置
	var currpos = [];
	//计算依赖图的坐标
	for(var i = 0; i < levelNodes.length ;i++){
		currpos[i] = 0;//完成当前位置初始化
		//分别排序
		levelNodes[i].sort((a,b)=>{
			if(i == 0){
				return b.maxDepth - a.maxDepth;//顶级节点深度大的优先级高。
			}
			//如果不是顶级节点。需要根据当前depth逐步找到对应父级节点计算相关值
			for(var k = 0; k < i;k++){
				//计算a值
				var suma = 0;
				var counta = 1;
				for(var m = 0; m < a.parentNode.length; m++){
					if(a.parentNode[m].depth == k){
						suma += a.parentNode[m].nodeIndex;
						counta++;
					}
				}
				var valuea = suma/counta;
				var sumb = 0;
				var countb = 1;
				for(var m = 0; m < b.parentNode.length; m++){
					if(b.parentNode[m].depth == k){
						suma += b.parentNode[m].nodeIndex;
						counta++;
					}
				}
				var valueb = sumb/countb;
				if(valuea == valueb){
					continue;
				}
				return valueb - valuea;//index越小，排名越靠前
			}
			return 0;//如果这里没有返回，肯定是相等。
		});
		//给nodexIndex赋值。
		for(var j = 0; j < levelNodes[i].length; j++){
			levelNodes[i][j].nodeIndex = j+1;
			
		}
	}
	//遍历计算坐标位置
	/**
	根据矩阵，最大行数计算坐标
	*/
	for(var i = 0; i < levelNodes.length;i++) {
		var cols = levelNodes[i];
		if(maxY < cols.length){
			maxY = cols.length;
		}
		for(var k = 0; k < cols.length; k++ ){
			var node = cols[k];
			var maxrows = 1;
			for(var j = i+1;j < levelNodes.length; j++){
				var childs = levelNodes[j];
				var colsrows = 0;
				//考虑共用依赖，就不做优化处理
				for(var m = 0; m < childs.length ;m++){
					if(childs[m].parentNode.indexOf(node) == -1){
						break;
					}
					colsrows++;//计算当前列的该节点子节点数
				}
				if(colsrows > maxrows){
					maxrows = colsrows;
				}
			}
			var minppos = 0;
			for(var n = 0; node.realParent&&n < node.realParent.length; n++){
				if(n == 0){
					minppos = node.realParent[n].currpos;
				}
				minppos = Math.min(node.realParent[n].currpos,minppos);
			}
		
			currpos[i] = Math.max(currpos[i],minppos);
			//计算该节点坐标
			node.centerX = originx + this._spacing*i;
			node.centerY = originy + this._hspacing*(maxrows-1)/2 + currpos[i]*this._hspacing;
			node.currpos = currpos[i];//记录坐标位置

		//	console.log(i + ":::" + maxrows + "----" + currpos[i] + "----" + node.nodeIndex)
			//判断父级坐标
			var py = [];
			for(var n = 0; node.realParent&&n < node.realParent.length; n++){
				if(py.indexOf(node.realParent[n].centerY) > -1){
					node.centerY = node.centerY - me._hspacing/2;
					
				}else {
					py.push(node.realParent[n].centerY);
				}
			}
			
			if(maxY < node.centerY){
				maxY = node.centerY;
			}
			//更新当前位置
			currpos[i] = currpos[i] + maxrows;
		}
		
	}
	
	//计算孤立节点坐标
	for(var i = 0; i < singleNodes.length; i++ ){
		singleNodes[i].centerX = i%this._maxSingleNode*this._spacing;
		singleNodes[i].centerY = (Math.floor(i/this._maxSingleNode)+ 1)*this._hspacing + maxY;
	}
	
	//更新页面节点
	this.updateParts();
	this.network = null;
}

/*查找子节点*/
TopologyLayout.prototype.findDestinationDG = function(edge,depth,root,levelNodes,parentv){
	var v = edge != null ? edge.toVertex:null;
	var me = this;
	if(v != null && parentv.parentNode.indexOf(v) == -1){//节点不在当前父级节点的父级节点中，处理循环依赖
		if(v.depth&&v.depth < depth){//比现有层级小。需要处理，且需要将原层级删除
			var index = levelNodes[v.depth].indexOf(v);
			if (index > -1) {
				levelNodes[v.depth].splice(index, 1);
			}
		}else if(v.depth){
			return;//如果v.depth深度大于depth，就不在处理。
		}
		v.depth = depth;
		var nodes = levelNodes[v.depth] ||[];
		levelNodes[v.depth] = nodes;
		v.rootNode = root;
		v.parentNode = parentv.parentNode.concat();//复制数组
		if(v.parentNode.indexOf(v) > -1){//如果节点已经在父级序列中，表示循环依赖，不在处理，到此结束。
			return;
		}
		v.parentNode.push(parentv);//将数据添加到父级序列中。
		if(!v.realParent){//记录直系父类
			v.realParent = [];
		}
		v.realParent.push(parentv);
		root.maxDepth = Math.max(root.maxDepth,v.depth);
		nodes.push(v);
		if(v.destinationEdges.count > 0){
			v.destinationEdges.each(function(edge){
				me.findDestinationDG(edge,depth+1,root,levelNodes,v);
			});
		}
	}
}

//设置属性方法
Object.defineProperty(TopologyLayout.prototype, "spacing", {
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
Object.defineProperty(TopologyLayout.prototype, "hspacing", {
  get: function() { return this._hspacing; },
  set: function(val) {
    if (typeof val !== "number") throw new Error("new value for SpiralLayout.radius must be a number, not: " + val);
    if (this._hspacing !== val) {
      this._hspacing = val;
      this.invalidateLayout();
    }
  }
});
Object.defineProperty(TopologyLayout.prototype, "maxSingleNode", {
  get: function() { return this._maxSingleNode; },
  set: function(val) {
    if (typeof val !== "number") throw new Error("new value for SpiralLayout.radius must be a number, not: " + val);
    if (this._maxSingleNode !== val) {
      this._maxSingleNode = val;
      this.invalidateLayout();
    }
  }
});