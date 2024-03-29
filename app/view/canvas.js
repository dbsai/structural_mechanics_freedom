define(['app/collection/drawc','./canvasdraw','app/model/factory'],function(drawC,canvasdraw,factory){
  // 绘图区域





  return new (Backbone.View.extend({

    el: $("#canvaswrap"),

    initialize: function() {

      // 开闭拖动
      this.listenTo(factory, "change:type", this.movable)

      // 绘图数据已送达：监听drawC collection 加入新元素事件
      this.listenTo(drawC, "add", this.presolve)

      // 为了便于引用，定义canvas属性
      this.canvas = this.$el.find("canvas")

      // 引入绘图库
      this.drawlib = canvasdraw.draw()

      // 定义工厂，引入每个加工完成的元素
      this.factory = factory
    },
    
    presolve: function(newmodel) {
      var i = 0
        , models = drawC.models
        , l = models.length

        // 最近一次的绘制点作为下一根杆的起始点
        , xy = newmodel.get("category") == "constr" ? {
          "x": newmodel.get("x")
          , "y": newmodel.get("y")
        } : {
          "x": newmodel.get("x2")
          , "y": newmodel.get("y2")
        }

      this.factory.set(xy)

      // 绘制
      this.drawlib[newmodel.get("type")](newmodel)
    },

    // 初等集合的计算库（点到直线的距离、点到点的距离，斜率的近似...）
    tools: {
      connect: function(connect1, order1, connect2, order2) {
        if (!_.contains(connect1, order2)) connect1.push(order2)
        if (!_.contains(connect2, order1)) connect2.push(order1)
      }
      , p2pdistance: function(x1, y1, x2, y2,r) {
        if (x1 == null || y1 == null || x2 == null || y2 == null) return Infinity

        if (r == "x"){
          console.log(x1 + " " + x2 + " " + y1 + " " + y2)
          console.log(Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)))
        }

        return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1))
      }
      , p2ldistance: function(k, b, newx, newy) {
       
        return Math.abs((newx - newy / k + b / k) / Math.sqrt(1 + 1 / (k * k)))
      }
      , isp2l: function(x, y, x2, y2, k, b, newx, newy, d) {
        return this.region(newx, newy, x, y, x2, y2, d + 2, d + 2) && this.p2ldistance(k, b, newx, newy) <= d + 2
      }
      , b2bhead: function(x, y, x2, y2, newx, newy, newx2, newy2, d,r) {
        return this.p2pdistance(x, y, newx, newy,r) <= d ||
          this.p2pdistance(x2, y2, newx, newy,r) <= d ||
          this.p2pdistance(x, y, newx2, newy2,r) <= d ||
          this.p2pdistance(x2, y2, newx2, newy2,r) <= d
      }
      , b2bhead_p: function(x, y, x2, y2, newx, newy, newx2, newy2, d) {
        if (this.p2pdistance(x, y, newx, newy) <= d||this.p2pdistance(x, y, newx2, newy2) <= d){ 

          return ("x" + x + "y" + y)
        }
        else if (this.p2pdistance(x2, y2, newx, newy) <= d||this.p2pdistance(x2, y2, newx2, newy2) <= d) {          

          return ("x" + x2 + "y" + y2)
        } else {

          return false
        }
      } 
      , region: function(x, y, regionx1, regiony1, regionx2, regiony2, dx, dy) {

        var maxX = regionx1 >= regionx2 ? regionx1 : regionx2
          , minX = maxX == regionx1 ? regionx2 : regionx1
          , maxY = regiony1 >= regiony2 ? regiony1 : regiony2
          , minY = maxY == regiony1 ? regiony2 : regiony1


        if (_.isUndefined(maxX)||_.isUndefined(maxX)||_.isUndefined(maxX)||_.isUndefined(maxX)) return false        

        return x <= maxX + dx && y <= maxY + dy && x >= minX - dx && y >= minY - dy
      }
      , coorSet: function(factory, x, y, angle, barlength) {
        if (factory.get("x") && factory.get("type") == "linebar") {      
          factory.set({
            "x2": x
            , "y2": y
          })
        }
        else {
          if (!(factory.get("x")&&factory.get("category") == "constr")) {
            factory.set({
              "x": x
              , "y": y
            })
          }

          if (factory.get("type") == "linebar"&&!_.isUndefined(angle)&&barlength){
            var kx = Math.cos(Math.PI * angle / 180)
              , ky = Math.sin(Math.PI * angle / 180)

            factory.set({
              "x2": Number((x + kx*barlength).toFixed(0))
              , "y2": Number((y + ky*barlength).toFixed(0))
            })
          }
        }
      }
      , kSimilar: function(k){
        var k = Math.abs(k) > 9999 ? (k < 0 ? -10000 : 10000) : k
          , k = Math.abs(k) < 0.0001 ? 0.0001 : k

        return Number(k.toFixed(4))
      }
    },

    // 点击canvas画布触发事件
    events: {
      "click canvas": "setCoor"
    },

    // 向工厂中运送绘图的初始数据，该数据不直接用于绘制
    setCoor: function(e, X, Y) {

      if ($("canvas").hasClass("moving")) return

      if (drawC.models.length == 0) this.factory.set("order", 0)

      else this.factory.set("order", drawC.last().get("order") + 1)

      if (!this.factory.get("connects")) this.factory.set("connects", [])
      
      if (!this.factory.get("bodys")) this.factory.set("bodys", [])
            
      var leftpos = this.$el.css("left").indexOf("px")
        , toppos = this.$el.css("top").indexOf("px")
        , borderpos = this.$el.css("border-width").indexOf("px")
        , angle = Number(Number($("#angle").val()).toFixed(0))
        , bodys = this.factory.get("bodys")
        , barlength = Number(Number($("#line").val()).toFixed(0))
        , borderwidth = Number(this.$el.css("border-width").slice(0, borderpos))

        // 画布的left偏移等于其父元素的left偏移加上边框宽度
        , left = Number(Number(this.$el.css("left").slice(0, leftpos)).toFixed(0)) + borderwidth
        , top = Number(Number(this.$el.css("top").slice(0, toppos)).toFixed(0)) + borderwidth

        // 此次点击的坐标
        , X = e.type == "click" ? e.pageX - this.canvas.position().left - left : X
        , Y = e.type == "click" ? e.pageY - this.canvas.position().top - top : Y
        , newx = this.factory.get("x")
        , newy = this.factory.get("y")
        , neworder = this.factory.get("order")
        , newtype = this.factory.get("type")
        , newcategory = this.factory.get("category")
        , newconnects = this.factory.get("connects")
        , coinarr = []

        // 定向铰和固定端连接在n根杆上
        , bartime = 0

        // 点击与n跟杆接近
        , n = 0
        , pointx, pointy

        // 约束端部重合
        , coincide = false

        // 杆端部重合
        , barcide = 0
        , barcidearr = []
        , preventdraw = false
     
      this.factory.set("angle", angle)

      if (
        _.some(drawC.models, function(model) {
          var category = model.get("category")
            , type = model.get("type")
            , x1 = model.get("x")
            , x2 = model.get("x2")
            , y1 = model.get("y")
            , y2 = model.get("y2")
          
          if (category == "constr" && newcategory == "constr" && this.tools.p2pdistance(x1, y1, X, Y) < 10) {

            // 防止两约束重合
            return true
          } else if (newcategory == "bar" &&
            (type == "gdd" || type == "dxj") &&
            (
              this.tools.p2pdistance(X, Y, x1, y1) < 5 ||
              this.tools.p2pdistance(newx, newy, x1, y1) < 5
            ) && model.get("connects").length > 0
          ) {

            // 防止多根杆连接在定向铰和固定端上
            return true
          } else if (model.get("category") == "bar" &&
            (newtype == "gdd" || newtype == "dxj") &&
            (
              this.tools.p2pdistance(X, Y, x1, y1) < 5 || this.tools.p2pdistance(X, Y, x2, y2) < 5
            )
          ) {

            // 防止定向铰和固定端连接在多根杆上
            bartime++

            if (bartime > 1) return true
            else return false
          } else {
            return false
          }
        }.bind(this))) return
      
      _.each(drawC.models, function(model, index, list) {
        var k = model.get("k")
          , b = model.get("b")
          , x1 = model.get("x")
          , x2 = model.get("x2")
          , y1 = model.get("y")
          , y2 = model.get("y2")
          , d1 = this.tools.p2pdistance(x1, y1, X, Y) < 5
          , d2 = model.get("x2") ? this.tools.p2pdistance(x2, y2, X, Y) < 5 : undefined
          , order = model.get("order")
          , category = model.get("category")
          , connects = model.get("connects")
          , mbodys = model.get("bodys")
          , type = model.get("type")
          , coinx = d1 ? x1 : x2
          , coiny = d1 ? y1 : y2

          // 处理由于约束存在而造成的杆件断开
          , commonconnects
          , notbarbody = false

        // 约束与杆端部重合
        if ((d1 || d2) && newcategory == "constr") {

          if (!coincide) {
            
            this.tools.coorSet(this.factory, coinx, coiny)

            coincide = true
          }

          this.tools.connect(connects, order, newconnects, neworder)
        }

        // 切断杆
        if (coincide && index == list.length - 1) {

          _.each(newconnects, function(connect) {
            var connectmodel = drawC.at(connect)
              , preconnects = _.filter(newconnects, function(preconnect) {
                return preconnect !== connect
              })

            connectmodel.set("connects", _.filter(connectmodel.get("connects"), function(currentconnect) {
              return !_.contains(preconnects, currentconnect)
            }))
          })
        }

        if (newcategory == "bar") {

          if (this.factory.get("x") &&bodys.length == 0) {

            var anodj = _.filter(drawC.models,function(m){

              var m = m.toJSON()

              if (m.type == "linebar"){
                return false
              }

              return (m.x == this.factory.get("x") &&m.y == this.factory.get("y")) || this.tools.b2bhead(m.x, m.y, null, null, null, null, X, Y, 5)

            }.bind(this))
            
            if (anodj.length == 1) {

              var djbody = anodj[0].get("bodys")[0]
          
              if (!_.isUndefined(djbody)){
                bodys.push(djbody)   
              }               
            }              
          }

          // 杆端部相连
          if (this.tools.b2bhead(x1, y1, x2, y2, newx, newy, X, Y, 5)) {

            var barp = this.tools.b2bhead_p(x1, y1, x2, y2, newx, newy, X, Y, 5)

            if (!_.contains(barcidearr,barp)&& type == "linebar") {
              barcidearr.push(barp)
              barcide++    
            }
                    
            // bar和newbar连在了同一个约束上，那不添加到彼此的连接件上
            if (category == "bar" &&
              _.some(connects, function(connect) {
                if (!drawC.at(connect)) return false

                var category = drawC.at(connect).get("category")
                  , x1 = drawC.at(connect).get("x")
                  , y1 = drawC.at(connect).get("y")

                if (category == "constr" && this.tools.b2bhead(x1, y1, null, null, newx, newy, X, Y, 0)) return true
              }.bind(this))
            ) return

            if (this.tools.b2bhead(x1, y1, null, null, null, null, X, Y, 5)) {          

              X = x1  
              Y = y1
              notbarbody = true

              // 杆端连接的是链接在杆身上的约束
              if (type == "dj" &&mbodys.length > 0 &&bodys.length < 2) bodys.push(mbodys[0])                

            } else if (this.tools.b2bhead(x2, y2, null, null, null, null, X, Y, 5)) {
              
              X = x2
              Y = y2    
              notbarbody = true
            }

            this.tools.connect(connects, order, newconnects, neworder)
            this.factory.set("connects", newconnects)
          }
        }

        // 杆端部重合
        if (barcide >= 2){
          this.factory.set("bodys",[])
          return
        }
        
        // 点到杆的距离 作用域与值域范围 约束端部重合 
        if (this.tools.p2ldistance(k, b, X, Y) > 4 || 
          !this.tools.region(X, Y, x1, y1, x2, y2, 4, 4) ||
          coincide || (barcide == 1&& _.isUndefined(newx))) return
        
        // 垂线交点坐标 
        pointx = Number(((Y + X / k - b) / (k + 1 / k)).toFixed(0))
        pointy = Number((pointx * k + b).toFixed(0))
       
        // 杆身相连
        if (newcategory == "bar"&& !notbarbody) {
        
          X = pointx
          Y = pointy
          
          //  补丁：line的order比constr靠前，coincide尚未设置为true
          if (!((X == x1&& Y == y1)|| (X == x2&& Y == y2))) {
       
            bodys.push({
              p : "x" + X + "y" + Y
              , p1: "x" + x1 + "y" + y1
              , p2 : "x" + x2 + "y" + y2
            })

            this.factory.set("bodys",bodys)

            this.tools.connect(connects, order, newconnects, neworder)
          }
        }

        // 约束与杆身连接 偏移约束
        if (_.contains(["gdj", "hdj", "dj"], newtype)) {

          n++

          var dx = Number((6 / Math.sqrt(1 + (-1 / k) * (-1 / k))).toFixed(0))
            , dy = Number((6 * (-1 / k) / Math.sqrt(1 + (-1 / k) * (-1 / k))).toFixed(0))

          X = pointx > X ? pointx - dx : pointx + dx
          Y = pointy > Y ? pointy - dy : pointy + dy

          bodys.push({
            p : "x" + X + "y" + Y
            , p1: "x" + x1 + "y" + y1
            , p2 : "x" + x2 + "y" + y2
          })

          this.tools.connect(connects, order, newconnects, neworder)
        }

        // 防止定向支座和固定端与杆身相连
        if (_.contains(["gdd", "dxj"], newtype)) preventdraw = true

      }.bind(this))
      
      if (n > 1 || preventdraw) return

      this.tools.coorSet(this.factory, X, Y, angle, barlength)

      this.factory.drawelement()
    },

    movable: function(index, value) {
      if (value == "move") {
        this.canvas.draggable({
          disabled: false
        })
        
        this.canvas.css({
          cursor: "-moz-grab"
          , cursor: "-webkit-grab"
        })
      } else {
        this.canvas.draggable({
          disabled: true
        })

        this.canvas.css({
          cursor: "crosshair"
        })
      }
    }

  }))()
})