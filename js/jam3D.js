/*
 * jam3D v2.0 2018 7.18 FlashMaj
 * 
 * 
 * dependences:
 * 		three.js
 * 		------
 * 		MTLLoader.js	---->	loadMTL(url,params,fun)
 * 		OBJLoader.js	---->	loadOBJ(url,params,fun)
 * 		Mirror.js	  	---->	createFloor(points,{reflect:reflect})
 * 		ThreeCSG.js   	---->   createWindow()
 */



var Jam3D;


/*
 * 局部声明
 */
function jam3D_load_init(){
	function Local_Jam3D(){
		var that=this;
		//args
		this.sensitivity=0.5;//旋转物件灵敏度
		this.ratio=100;//默认比例  1m对应的three长度
		//constructor
		if(arguments.length==3){//  (scene,camera,renderer)
			that.scene=arguments[0];
			that.camera=arguments[1];
			that.renderer=arguments[2];
		}
		//status
		this.operation={
			canTakeMove:true,
			touchingUnit:undefined,
			takeSenceMove:false,
			takeArticleMove:false,
			takeArticleRotate:false,
			takeMoveOnTheWall:false,
			takeMoveArticle:undefined,
			takeMoveTerrain:undefined,
			takeRotateArticle:undefined,
			onMouseArticle:undefined,
			articleOutMouseFun:null,
			articleOnMouse:false,
			mouseDownPosition:{x:0,y:0}
		}
		//array
		this.canTouchUnits=[];
		//object
		this.screenVector=new THREE.Vector2();
		this.raycaster = new THREE.Raycaster();
		this.eventManager=new EventManager(that);
		if(THREE.MTLLoader)this.mtlLoader=new THREE.MTLLoader();
		if(THREE.MTLLoader)this.objLoader=new THREE.OBJLoader();
		this.baseFloor=new THREE.Mesh(
			new THREE.PlaneGeometry(1000,1000,20,20),
			new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false})
		);
		this.baseFloor.renderOrder=-2;
		this.baseFloor.position.y=0;
		this.baseFloor.rotation.x=-Math.PI/2;
		if(this.scene.parent)this.scene.parent.add(that.baseFloor);
		//fun
		this.setRenderer=function(renderer){that.renderer=renderer};
		this.setScene=function(scene){that.scene=scene};
		this.setCamera=function(camera){that.camera=camera};
		this.setRatio=function(ratio){that.ratio=ratio};
		this.animate=animate;
		this.initObject=initObject;
		this.cleanObject=cleanObject;
		this.loadOBJ=loadOBJ;
		this.loadMTL=loadMTL;
		this.onTouchMove=null;
		this.onTouchDown=null;
		this.onTouchUp=null;
		this.onTouchClick=null;
		this.onClick=null;
		this.setTouchIdForArticle=setTouchIdForArticle;
		this.addTouchIdForArticle=addTouchIdForArticle;
		this.setTouchIdForTerrain=setTouchIdForTerrain;
		this.addTouchIdForTerrain=addTouchIdForTerrain;
		this.removeTouchIdForObject=removeTouchIdForObject;
		this.takeArticleOnMouse=takeArticleOnMouse;
		this.createWall=createWall;
		this.createFloor=createFloor;
		this.createPlatfond=createPlatfond;
		this.createWallByJamWall=createWallByJamWall;
		this.createFloorsByJamWall=createFloorsByJamWall;
		this.createPlatfondsByJamWall=createPlatfondsByJamWall;
		this.createWindowForWall=createWindowForWall;
		this.changeMapForObject3D=changeMapForObject3D;
		this.takeON=function(){
			addEventListeners(that);
			that.renderer.domElement.oncontextmenu = function(){
				return false;
			};
		};
		this.takeOFF=function(){
			removeEventListeners(that);
			that.renderer.domElement.oncontextmenu = function(){};
		};
		
		//other
		this.touchPosition={
			dx:0,
			dy:0,
			dz:0,
			d:0
		}
		this.takeON();
	}
	Jam3D=Local_Jam3D;
	
	function animate(){
		let obj=this;
		for(var i=0;i<obj.canTouchUnits.length;i++){
			let unit=obj.canTouchUnits[i];
			if(unit.jam3d_attribute.type=="floor"){
				unit.jam3d_attribute.mirror.render();
			}
		}
	}
	function onMouseDown(e,obj){
		let renderer = obj.renderer,
			camera = obj.camera,
			scene = obj.scene;
		let mouseX=e.pageX-obj.renderer.domElement.offsetLeft,
			mouseY=e.pageY-obj.renderer.domElement.offsetTop;
			
		obj.operation.mouseDownPosition={
			x:mouseX,
			y:mouseY
		};
		//-------
		obj.screenVector.x = (mouseX/renderer.domElement.clientWidth )*2-1;
		obj.screenVector.y = - (mouseY/renderer.domElement.clientHeight )*2+1;
		obj.raycaster.setFromCamera(obj.screenVector,camera);

		let intersects = obj.raycaster.intersectObjects(getAllObjectUnits(obj.canTouchUnits));
		if(intersects.length>0){
			//unit0
			let unit0 = (intersects[0].object.parent==scene)?intersects[0].object:intersects[0].object.parent;
			//onTouchDown for all
			if(obj.onTouchDown)obj.onTouchDown(unit0,intersects,e);
			obj.operation.touchingUnit=unit0;
			if(unit0.jam3d_attribute.onTouchDown)unit0.jam3d_attribute.onTouchDown(intersects,e);
			if(e.button==0){
				//articleOnMouse
				if(obj.operation.articleOnMouse){
					return;
				};
				//takeMove
				if(obj.operation.canTakeMove){
					let article,
						terrain,
						touchPoint,
						sameTouchIdterrains;
					for(var i=0;i<intersects.length;i++){
						let unit = (intersects[i].object.parent==scene)?intersects[i].object:intersects[i].object.parent;
						if(!article){
							if(unit.jam3d_attribute.isTerrainObject)break;
							if(unit.jam3d_attribute.isCanTouchArticle&&i!=intersects.length-1){
								article=unit;
								touchPoint = intersects[i].point;
							}
						}else{
							if(unit.jam3d_attribute.isTerrainObject){
								if(isHaveSameElement(article.jam3d_attribute.touchIds,unit.jam3d_attribute.touchIds)){
									terrain=unit;
								}
								break;
							}
						}
					}
					if((article!=undefined)&&(terrain!=undefined)){
						if(isBeforeTheTerrain(obj.raycaster,article,terrain)){
							obj.touchPosition.dx=article.position.x-touchPoint.x;
							obj.touchPosition.dy=article.position.y-touchPoint.y;
							obj.touchPosition.dz=article.position.z-touchPoint.z;
							if(terrain.jam3d_attribute.type!="wall"){
								//is not wall
								obj.touchPosition.d=touchPoint.y-terrain.position.y;
								obj.operation.takeMoveOnTheWall=false;
							}else{
								//is wall
								let tdx=touchPoint.x-(terrain.position.x+scene.position.x),
									tdz=touchPoint.z-(terrain.position.z+scene.position.z);
								let tl = Math.sqrt(Math.pow(tdx,2)+Math.pow(tdz,2));
								obj.touchPosition.d=tl*Math.sin(getAngle(tdx,tdz)+terrain.rotation.y);
								obj.operation.takeMoveOnTheWall=true;
							}
							obj.operation.takeArticleMove=true;
							obj.operation.takeMoveArticle=article;
							obj.operation.takeMoveTerrain=terrain;	
						}
					};
				}
				
			}
			if(e.button==2){
				if(obj.operation.articleOnMouse){
					obj.operation.takeArticleRotate=true;
					obj.operation.takeRotateArticle=obj.operation.onMouseArticle;
					return;
				}
				if(unit0.jam3d_attribute.type=="floor"){
					floor=unit0;
						obj.operation.takeSenceMove=true;
						obj.baseFloor.position.set(intersects[0].point.x,scene.position.y+floor.position.y,intersects[0].point.z);
						obj.touchPosition.dx=scene.position.x-intersects[0].point.x;
						obj.touchPosition.dz=scene.position.z-intersects[0].point.z;
					return;
				}
				if(unit0.jam3d_attribute.canRotate){
					obj.operation.takeArticleRotate=true;
					obj.operation.takeRotateArticle=unit0;
					return;
				}
			}
		}
	}
	function onMouseUp(e,obj){
		let mouseX=e.pageX-obj.renderer.domElement.offsetLeft,
			mouseY=e.pageY-obj.renderer.domElement.offsetTop;
		if(obj.operation.takeArticleMove){
			obj.operation.takeArticleMove=false;
			obj.operation.takeMoveOnTheWall=false;
			obj.operation.takeMoveArticle=undefined;
			obj.operation.takeMoveTerrain=undefined;
		}
		if(obj.operation.takeSenceMove){
			obj.operation.takeSenceMove=false;
		}
		if(obj.operation.takeArticleRotate){
			obj.operation.takeArticleRotate=false;
			obj.operation.takeRotateArticle=undefined;
		}
		if(obj.operation.touchingUnit){
			let unit = obj.operation.touchingUnit;
			if(unit.jam3d_attribute.onTouchUp)unit.jam3d_attribute.onTouchUp(e);
			if(obj.onTouchUp)obj.onTouchUp(unit,e);
			obj.operation.touchingUnit=undefined;
		}
		if(obj.operation.mouseDownPosition.x==mouseX&&obj.operation.mouseDownPosition.y==mouseY){
			onMouseClick(e,obj);
		}
	}
	function onMouseClick(e,obj){
		let renderer = obj.renderer,
			camera = obj.camera,
			scene = obj.scene;
		let mouseX=e.pageX-obj.renderer.domElement.offsetLeft,
			mouseY=e.pageY-obj.renderer.domElement.offsetTop;
		
		if(obj.onClick)obj.onClick(e);
		obj.screenVector.x = (mouseX/renderer.domElement.clientWidth )*2-1;
		obj.screenVector.y = - (mouseY/renderer.domElement.clientHeight )*2+1;
		obj.raycaster.setFromCamera(obj.screenVector,camera);
		
		let intersects = obj.raycaster.intersectObjects(getAllObjectUnits(obj.canTouchUnits));
		if(intersects.length>0){
			//unit0
			let unit0 = (intersects[0].object.parent==scene)?intersects[0].object:intersects[0].object.parent;
			//onTouchClick for all
			if(obj.onTouchClick)obj.onTouchClick(unit0,intersects,e);
			if(unit0.jam3d_attribute.onClick)unit0.jam3d_attribute.onClick(intersects,e);
			//articleOnMouse
			if(obj.operation.articleOnMouse){
				let article = obj.operation.onMouseArticle;
				for(var i=0;i<intersects.length;i++){
					let unit = (intersects[i].object.parent==scene)?intersects[i].object:intersects[i].object.parent;
					if(unit.jam3d_attribute.isTerrainObject){
						if(isHaveSameElement(unit.jam3d_attribute.touchIds,article.jam3d_attribute.touchIds)){
							obj.operation.articleOutMouseFun(e,article);
							obj.operation.onMouseArticle=undefined;
							obj.operation.articleOnMouse=false;
						}
						break;
					}
				}
			}
			
		}
	}
	function onMouseMove(e,obj){
		let renderer = obj.renderer,
			camera = obj.camera,
			scene = obj.scene;
		let mouseX=e.pageX-obj.renderer.domElement.offsetLeft,
			mouseY=e.pageY-obj.renderer.domElement.offsetTop,
			movementX = e.movementX || e.mozMovementX || e.webkitMovementX || 0,
			movementY = e.movementY || e.mozMovementY || e.webkitMovementY || 0;
		obj.screenVector.x = (mouseX/renderer.domElement.clientWidth )*2-1;
		obj.screenVector.y = - (mouseY/renderer.domElement.clientHeight )*2+1;
		obj.raycaster.setFromCamera(obj.screenVector,camera);
		
		let intersects = obj.raycaster.intersectObjects(getAllObjectUnits(obj.canTouchUnits));
		if(obj.onTouchMove){
			if(intersects.length>0){
				let unit0 = (intersects[0].object.parent==scene)?intersects[0].object:intersects[0].object.parent;
				obj.onTouchMove(unit0,intersects,e);
			}
		}
		if(obj.operation.takeArticleMove){
			let intersectPoint;
			for(var i=0;i<intersects.length;i++){
				let unit=(intersects[i].object.parent==scene)?intersects[i].object:intersects[i].object.parent;
				if(unit==obj.operation.takeMoveTerrain){
					intersectPoint=intersects[i].point;
					break;
				}
			}
			if(intersectPoint){
				if(!obj.operation.takeMoveOnTheWall){
					let touchPoint={
						x:intersectPoint.x+(camera.position.x-intersectPoint.x)*obj.touchPosition.d/(camera.position.y-intersectPoint.y),
						z:intersectPoint.z+(camera.position.z-intersectPoint.z)*obj.touchPosition.d/(camera.position.y-intersectPoint.y),
						y:intersectPoint.y+obj.touchPosition.d
					};
					obj.operation.takeMoveArticle.position.set(
						touchPoint.x+obj.touchPosition.dx,
						touchPoint.y+obj.touchPosition.dy,
						touchPoint.z+obj.touchPosition.dz
					);
				}else{
					let ca=getAngle(camera.position.x-intersectPoint.x,camera.position.z-intersectPoint.z);
					let cl=Math.sqrt(Math.pow(camera.position.x-intersectPoint.x,2)+Math.pow(camera.position.z-intersectPoint.z,2)+Math.pow(camera.position.y-intersectPoint.y,2)),
						ch=Math.sqrt(Math.pow(camera.position.x-intersectPoint.x,2)+Math.pow(camera.position.z-intersectPoint.z,2))*Math.sin(ca+obj.operation.takeMoveTerrain.rotation.y),
						tl=cl*obj.touchPosition.d/ch;
					
					
					let touchPoint={
						x:intersectPoint.x+tl*Math.cos(ca),
						z:intersectPoint.z+tl*Math.sin(ca),
						y:intersectPoint.y+(camera.position.y-intersectPoint.y)*tl/cl
					};
					obj.operation.takeMoveArticle.position.set(
						touchPoint.x+obj.touchPosition.dx,
						touchPoint.y+obj.touchPosition.dy,
						touchPoint.z+obj.touchPosition.dz
					);
				}
				
			}
		}
		if(obj.operation.takeArticleRotate){
			let article=obj.operation.takeRotateArticle;
			article.rotation.y=article.rotation.y+movementX*Math.PI/180*obj.sensitivity;
		}
		if(obj.operation.takeSenceMove){
			let intersects = obj.raycaster.intersectObject(obj.baseFloor);
			if(intersects.length>0){
				let touchPoint = intersects[0].point;
				let basePoint = obj.baseFloor.position;
				scene.position.x=basePoint.x+obj.touchPosition.dx+(touchPoint.x-basePoint.x);
				scene.position.z=basePoint.z+obj.touchPosition.dz+(touchPoint.z-basePoint.z);
				obj.baseFloor.position.set(touchPoint.x,scene.position.y+obj.baseFloor.position.y,touchPoint.z);
			}
		}
		if(obj.operation.articleOnMouse&&(!obj.operation.takeArticleRotate)){
			let article = obj.operation.onMouseArticle;
			let ratio = obj.ratio;
			if(intersects.length>0){
				for(var i=0;i<intersects.length;i++){
					let unit=(intersects[i].object.parent==scene)?intersects[i].object:intersects[i].object.parent;
					if(unit.jam3d_attribute.isTerrainObject&&isHaveSameElement(article.jam3d_attribute.touchIds,unit.jam3d_attribute.touchIds)){
						if(article.parent!=scene){
							scene.add(article);
						}
						let point=intersects[i].point;
						article.position.set(
							point.x-scene.position.x,
							point.y-scene.position.y,
							point.z-scene.position.z
						);
						if(unit.jam3d_attribute.type=="floor"){
							//is floor
						}else{
							//is wall
							let wallPoints = unit.resource.wall.points;
							let args = getTriangleFormatArgs(
									{x:camera.position.x,y:camera.position.z},
									{x:wallPoints[0].position.x*ratio,y:wallPoints[1].position.y*ratio},
									{x:wallPoints[1].position.x*ratio,y:wallPoints[1].position.y*ratio}
								),
								a=args.a,
								b=args.b,
								c=args.c,
								h = args.s*2/c;
							let l = Math.sqrt(Math.pow(a,2)-Math.pow(h,2));
							
							let x0,y0;
							if(Math.pow(a,2)+Math.pow(c,2)>=Math.pow(b,2)){
								x0 = wallPoints[0].position.x*ratio+l*Math.cos(unit.rotation.y);
								y0 = wallPoints[0].position.y*ratio+l*Math.sin(unit.rotation.y);
							}else{
								x0 = wallPoints[0].position.x*ratio-l*Math.cos(unit.rotation.y);
								y0 = wallPoints[0].position.y*ratio-l*Math.sin(unit.rotation.y);
							}
							
							let angleOfPoints = getAngle(x0-camera.position.x,y0-camera.position.z),
								angleOfWall = unit.rotation.y+Math.PI/2;
								
							let direction;
							if(wallPoints[0].position.x==wallPoints[1].position.x){
								if(Math.cos(angleOfPoints)*Math.cos(angleOfWall)>=0){
									direction=true;
								}else{
									direction=false;
								}
							}else if(wallPoints[0].position.y==wallPoints[1].position.y){
								if(Math.sin(angleOfPoints)*Math.sin(angleOfWall)>=0){
									direction=true;
								}else{
									direction=false;
								}
							}else{
								if((Math.cos(angleOfPoints)*Math.cos(angleOfWall)>0)&&(Math.sin(angleOfPoints)*Math.sin(angleOfWall)>0)){
									direction=true;
								}else if((Math.cos(angleOfPoints)*Math.cos(angleOfWall)<0)&&(Math.sin(angleOfPoints)*Math.sin(angleOfWall)<0)){
									direction=false;
								}	
							}
							if(direction){
								article.rotation.y=unit.rotation.y;
							}else{
								article.rotation.y=unit.rotation.y+Math.PI;
							}
						}
						break;
					}else{
						if(article.parent==scene){
							scene.remove(article);
						}
					}
				}
			}else{
				if(article.parent==scene){
					scene.remove(article);
				}
			}
		}
	}
	
	//eventManager
	function EventManager(obj){
		this.obj=obj;
		this.listening=false;
		this.eventListeners=[
			function(e){onMouseDown(e,obj);},
			function(e){onMouseUp(e,obj);},
			function(e){onMouseMove(e,obj);}
		];
		this.eventListeners[0].eventName="mousedown";
		this.eventListeners[1].eventName="mouseup";
		this.eventListeners[2].eventName="mousemove";
	}


	//eventListener
	function addEventListeners(obj){
		if(!obj.eventManager.listening){
			for(var i=0;i<3;i++){
				let eventListener = obj.eventManager.eventListeners[i];
				if(eventListener.eventName=="mousedown"){
					obj.renderer.domElement.addEventListener(eventListener.eventName,eventListener,false);
					continue;
				}
				window.addEventListener(eventListener.eventName,eventListener,false);
			}
			obj.eventManager.listening=true;
		}
	}
	function removeEventListeners(obj){
		if(obj.eventManager.listening){
			for(var i=0;i<3;i++){
				if(eventListener.eventName=="mousedown"){
					obj.renderer.domElement.removeEventListener(eventListener.eventName,eventListener);
					continue;
				}
				window.removeEventListener(eventListener.eventName,eventListener);
			}
			obj.eventManager.listening=false;
		}
	}
	
	//jam3D.function
	//initObject
	function initObject(object3D,spec){
		let obj=this;
		object3D.jam3d_attribute={
			canTouch:true,
			touchIds:[],
			isTerrainObject:false,
			isCanTouchArticle:false,
			canRotate:true
		};
		if(spec){
			for(var name in spec){
				object3D.jam3d_attribute[name]=spec[name];
			}
		}
		object3D.setMaterials=setMaterials;
		obj.canTouchUnits.push(object3D);
	}
	//cleanObject
	function cleanObject(object3D){
		let obj=this;
		//remove from canTouchUnits
		removeInArray(object3D,obj.canTouchUnits);
	}
	//article
	function takeArticleOnMouse(article,fun){
		let obj=this;
		if(arguments.length==0){
			let article;
			if(obj.operation.onMouseArticle){
				article=obj.operation.onMouseArticle;
			}
			obj.operation.articleOnMouse=false;
			obj.operation.onMouseArticle=undefined;
			obj.operation.articleOutMouseFun=null;
			return article;
		}
		obj.operation.articleOnMouse=true;
		obj.operation.onMouseArticle=article;
		if(fun)obj.operation.articleOutMouseFun=fun;
	}
	function setTouchIdForArticle(article,touchIds){
		let obj=this;
		if(article instanceof Array){
			for(var i=0;i<article.length;i++){
				article[i].jam3d_attribute.touchIds=[];
				obj.addTouchIdForArticle(article[i],touchIds);
			}
		}else{
			article.jam3d_attribute.touchIds=[];
			obj.addTouchIdForArticle(article,touchIds);
		}
	}
	function addTouchIdForArticle(article,touchIds){
		let obj=this;
		if(touchIds instanceof Array){
			if(touchIds.length==0){
				article.jam3d_attribute.touchIds=[];//清空数组
				return;
			}
			for(var i=0;i<touchIds.length;i++){
				article.jam3d_attribute.touchIds.push(touchIds[i]);
			}
		}else{
			article.jam3d_attribute.touchIds.push(touchIds);
		}
		article.jam3d_attribute.isCanTouchArticle=true;
	}
	//terrain
	function setTouchIdForTerrain(terrain,touchIds){
		let obj=this;
		if(terrain instanceof Array){
			for(var i=0;i<terrain.length;i++){
				terrain[i].jam3d_attribute.touchIds=[];
				obj.addTouchIdForTerrain(terrain[i],touchIds);
			}
		}else{
			terrain.jam3d_attribute.touchIds=[];
			obj.addTouchIdForTerrain(terrain,touchIds);
		}
	}
	function addTouchIdForTerrain(terrain,touchIds){
		let obj=this;
		if(touchIds instanceof Array){
			if(touchIds.length==0){
				terrain.jam3d_attribute.touchIds=[];//清除数组
				return;
			}
			for(var i=0;i<touchIds.length;i++){
				terrain.jam3d_attribute.touchIds.push(touchIds[i]);
			}
		}else{
			terrain.jam3d_attribute.touchIds.push(touchIds);
		}
		terrain.jam3d_attribute.isTerrainObject=true;
	}
	function removeTouchIdForObject(targetObj,touchIds){
		let obj=this;
		if(touchIds instanceof Array){
			for(var i=0;i<touchIds.length;i++){
				removeInArray(touchIds[i],targetObj.jam3d_attribute.touchIds,true);
			}
		}else{
			removeInArray(touchIds,targetObj.jam3d_attribute.touchIds,true);
		}
		if(targetObj.jam3d_attribute.touchIds.length=0){
			if(targetObj.jam3d_attribute.isCanTouchArticle)obj.addTouchIdForArticle(targetObj,[]);
			if(targetObj.jam3d_attribute.isTerrainObject)obj.addTouchIdForTerrain(targetObj,[]);
		}
	}
	function loadOBJ(){
		let that=this,
			url=arguments[0],
			fun,
			params;
			
		if(arguments.length==2){//  (url,fun)
			fun=arguments[1];
		}else if(arguments.length==3){//  (url,params,fun)
			params=arguments[1];
			fun=arguments[2];
		}
		
		if(params){
			let f=true;
			for(var name in params){
				if(f){
					url+="?";
					f=false;
				}else{
					url+="&";
				}
				url+=name+"="+params[name];
			}
		}
		that.objLoader.load(url,function(object3D){
			fun(object3D);
		});
	}
	
	function loadMTL(){
		let that=this,
			url=arguments[0],
			fun,
			params;
			
		if(arguments.length==2){//  (url,fun)
			fun=arguments[1];
		}else if(arguments.length==3){//  (url,params,fun)
			params=arguments[1];
			fun=arguments[2];
		}
		
		if(params){
			let f=true;
			for(var name in params){
				if(name=="texturePath")continue;
				if(f){
					url+="?";
					f=false;
				}else{
					url+="&";
				}
				url+=name+"="+params[name];
			}
			if(params.texturePath)that.mtlLoader.setTexturePath(params.texturePath);
		}
		
		that.mtlLoader.setCrossOrigin("Anonymous");
		that.mtlLoader.load(url,function(materials){
			materials.preload();
			//image.onload
			let mapMaterials = [];
			for(var name in materials.materials){
				let material = materials.materials[name];
				if(material.map){
					mapMaterials.push(material);
				}
			}
			let completeCounts=0;
			for(var i=0;i<mapMaterials.length;i++){
				let material = mapMaterials[i];
				material.map.image.onload=function(){
					material._needsUpdate=true;
					completeCounts++;
					if(completeCounts==mapMaterials.length){
						fun(materials);
					}
				}
			}
		});
	}
	function setMaterials(materials){
		let object3D = this;
		for(var i=0;i<object3D.children.length;i++){
			let materialName = object3D.children[i].material.name;
			object3D.children[i].material=materials.materials[materialName].clone();
			object3D.children[i].material._needsUpdate = true;
		}
	}
	function changeMapForObject3D(texture,object3D,spec){
		let xn=(spec&&spec.x)?spec.x:1,
			yn=(spec&&spec.y)?spec.y:1;
		
		object3D.geometry.computeBoundingBox();
        
        let max=object3D.geometry.boundingBox.max,
            min=object3D.geometry.boundingBox.min;
		
		texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
		texture.repeat.set( 
			(max.x-min.x)/(JAM3D_RATIO*xn),
			(max.y-min.y)/(JAM3D_RATIO*yn)
		);
		
		if(object3D.jam3d_attribute&&(object3D.jam3d_attribute.type=="floor")){
			object3D.material.opacity=1-texture.jam3d_attribute.img.reflect;
		}
		object3D.material.map=texture;
		texture.needsUpdate=true;
	}
	function createWall(wall,spec){
		let obj = this;
		let height=spec.height,
			ratio=obj.ratio,
			material=(spec&&spec.material)?spec.material.clone():new THREE.MeshBasicMaterial(),
			baseHeight=(spec&&spec.baseHeight)?baseHeight:0;
		let wall3D = new THREE.Mesh(
			new THREE.CubeGeometry(wall.getLength()*ratio,height*ratio,wall.getWidth()*ratio),
			material
		);
		obj.initObject(wall3D,{
			canRotate:false,
			isTerrainObject:true,
			type:"wall"
		});
		wall3D.resource={
			wall:wall
		};
		wall3D.rotation.y=-wall.getRotationY();
		wall3D.position.set(
			wall.getPosition().x*ratio,
			(height/2+baseHeight)*ratio,
			wall.getPosition().y*ratio
		);
		return wall3D;
	}
	function createFloor(points,spec){
		let obj=this;
		let height=(spec&&spec.height)?spec.height:0,
			material=(spec&&spec.material)?spec.material.clone():new THREE.MeshBasicMaterial({transparent:true,opacity:1});
		let floorGeometry = createGeometryByPoints(points,obj.ratio);
		
		let floor = new THREE.Mesh(floorGeometry,material);
		
		let renderer = obj.renderer,
			camera = obj.camera;
		let floorMirror =new THREE.Mirror(renderer,camera,{clipBias:0.003,textureWidth:window.innerWidth,textureHeight:window.innerHeight});
		let mirrorMesh =new THREE.Mesh(
			floorGeometry,
			floorMirror.material
		);
		floorMirror.material.depthWrite=false;
		mirrorMesh.renderOrder=-1;
		mirrorMesh.add(floorMirror);
		floor.add(mirrorMesh);
		mirrorMesh.position.y=-1;
		
		obj.initObject(floor,{
			canRotate:false,
			isTerrainObject:true,
			type:"floor",
			mirror:floorMirror
		});
		floor.rotation.x=-Math.PI/2;
		floor.position.y=height*obj.ratio;
		return floor;
	}
	function createPlatfond(points,spec){
		let obj=this;
		let height=(spec&&spec.height)?spec.height:0,
			material=(spec&&spec.material)?spec.material.clone():new THREE.MeshBasicMaterial();
		let platfond = new THREE.Mesh(
			createGeometryByPoints(points,obj.ratio),
			material
		);
		obj.initObject(platfond,{
			canRotate:false,
			isTerrainObject:true,
			type:"platfond"
		});
		platfond.material.side=THREE.BackSide;
		platfond.rotation.x=-Math.PI/2;
		platfond.position.y=height*obj.ratio;
		return platfond;
	}
	function createWindowForWall(wall3D,spec){
		let obj=this;
		let height = spec.height*obj.ratio,
			width = spec.width*obj.ratio;
		let wallParamters = wall3D.geometry.parameters;
		//save wall3D info
		let wallPosition = new THREE.Vector3(
			wall3D.position.x,
			wall3D.position.y,
			wall3D.position.z
		);
		let wallRotationY = wall3D.rotation.y;
		let wallParent = (wall3D.parent)?wall3D.parent:null;
		//initWall3D
		if(wallParent)wallParent.remove(wall3D);
		wall3D.position.set(0,0,0);
		wall3D.rotation.y=0;
		//create window3D
		let window3D = new THREE.Mesh(
			new THREE.CubeGeometry(width,height,wallParamters.depth+10)
		);
		//set position
		for(var name in spec){
			switch(name){
				case "top":{
					window3D.position.y=(wallParamters.height-height)/2-spec[name]*obj.ratio;
					break;
				}
				case "bottom":{
					window3D.position.y=(height-wallParamters.height)/2+spec[name]*obj.ratio;
					break;
				}
				case "left":{
					window3D.position.x=(width-wallParamters.width)/2+spec[name]*obj.ratio;
					break;
				}
				case "right":{
					window3D.position.x=(wallParamters.width-width)/2-spec[name]*obj.ratio;
					break;
				}
			}
		}
		
		//bsp
		let wallBsp = new ThreeBSP(wall3D),
			windowBsp = new ThreeBSP(window3D);
		var subtractBsp = wallBsp.subtract(windowBsp);
		wall3D = subtractBsp.toMesh();
		wall3D.geometry.computeVertexNormals();
		
		//restore
		if(wallParent)wallParent.add(wall3D);
		wall3D.position.set(
			wallPosition.x,
			wallPosition.y,
			wallPosition.z
		);
		wall3D.rotation.y=wallRotationY;
		
		return wall3D;
	}
	//jamWall
	function createWallByJamWall(jamWall,spec){
		let obj = this;
		let walls = [],
			ratio=obj.ratio;
		jamWall.updateInfo();
		for(var i=0;i<jamWall.walls.length;i++){
			let wall3D = obj.createWall(jamWall.walls[i],spec);
			walls.push(wall3D);
		}
		return walls;
	}
	function createFloorsByJamWall(jamWall,spec){
		let obj=this;
		let aroundWalls = jamWall.aroundWalls,
			floors = [];
		jamWall.updateInfo();
		for(var i=0;i<aroundWalls.length;i++){
			let floor = obj.createFloor(aroundWalls[i].points,spec);
			floors.push(floor);
		}
		return floors;
	}
	function createPlatfondsByJamWall(jamWall,spec){
		let obj=this;
		let aroundWalls = jamWall.aroundWalls,
			platfonds = [];
		jamWall.updateInfo();
		for(var i=0;i<aroundWalls.length;i++){
			let platfond = obj.createPlatfond(aroundWalls[i].points,spec);
			platfonds.push(platfond);
		}
		return platfonds;
	}
	//otherFun
	function isInArray(obj,_array){
		for(var i=0;i<_array.length;i++){
			if(obj==_array[i]){
				return true;
			}
		}
		return false;
	}
	function isHaveSameElement(a1,a2){
		let arr1=(a1.length>a2.length)?a1:a2,
			arr2=(arr1==a1)?a2:a1;
		for(var i=0;i<arr1.length;i++){
			if(isInArray(arr1[i],arr2)){
				return true;
			}
		}
		return false;
	}
	function removeInArray(obj,arr,removeAll){
		for(var i=0;i<arr.length;i++){
			if(obj==arr[i]){
				arr.splice(i,1);
				if(!removeAll){
					return;
				}else{
					i--;
				}
			}
		}
	}
	function createGeometryByPoints(points,ratio){
		let vectors = [],
			_ratio = (ratio)?ratio:1;
		for(var i=0;i<points.length;i++){
			let point=points[i];
			vectors.push(new THREE.Vector2(point.position.x*_ratio,-point.position.y*_ratio));
		}
		let shape = new THREE.Shape(vectors);
		var geometry = new THREE.ShapeGeometry(shape);
		assignUVs(geometry);
		return geometry;
	}
	function getAllObjectUnits(obj3D){
		let units=[];
		for(var i=0;i<obj3D.length;i++){
			if(obj3D[i].jam3d_attribute){
				if(!obj3D[i].jam3d_attribute.canTouch)continue;
			}
			if(obj3D[i].children.length>0&&(obj3D[i].jam3d_attribute.type!="floor")){
				for(var j=0;j<obj3D[i].children.length;j++){
					units.push(obj3D[i].children[j]);
				}
			}else{
				units.push(obj3D[i]);
			}
		}
		return units;
	}
	function getAngle(dx,dy){
		let l=Math.sqrt(Math.pow(dx,2)+Math.pow(dy,2));
		if(((dx>0)&&(dy>=0))||((dx>=0)&&(dy<0))){
			return Math.asin(dy/l);
		};
		if(((dx<=0)&&(dy>0))||((dx<0)&&(dy<=0))){
			return Math.PI-Math.asin(dy/l);
		};
	}
	//海伦公式 返回边长和面积
	function getTriangleFormatArgs(p1,p2,p3){
		let a = Math.sqrt(Math.pow(p2.x-p1.x,2)+Math.pow(p2.y-p1.y,2)),
			b = Math.sqrt(Math.pow(p3.x-p1.x,2)+Math.pow(p3.y-p1.y,2)),
			c = Math.sqrt(Math.pow(p2.x-p3.x,2)+Math.pow(p2.y-p3.y,2));
		let p = (a+b+c)/2;
		let s = Math.sqrt(p*(p-a)*(p-b)*(p-c));//三点面积
		
		return{
			a:a,
			b:b,
			c:c,
			s:s
		}
	}
	function isBeforeTheTerrain(raycaster,article,terrain){
		let allArticleUnits=getAllObjectUnits([article,terrain]);
		let intersects = raycaster.intersectObjects(allArticleUnits);
		if(intersects.length>0){
			let firstIntersect = intersects[0].object;
			if((firstIntersect==terrain)||(firstIntersect.parent==terrain)){
				return false;
			}else{
				return true;
			}
		}
		return false;
	}
	function assignUVs(geometry){
		geometry.computeBoundingBox();
        let _max=geometry.boundingBox.max,
            _min=geometry.boundingBox.min;
        let _offset=new THREE.Vector2(0-_min.x,0-_min.y);
        let _range=new THREE.Vector2(_max.x-_min.x,_max.y-_min.y);
        let _faces=geometry.faces;
        geometry.faceVertexUvs[0] = [];
		for (var i=0;i<_faces.length;i++){
            let _v1 = geometry.vertices[_faces[i].a],
                _v2 = geometry.vertices[_faces[i].b],
                _v3 = geometry.vertices[_faces[i].c];
            geometry.faceVertexUvs[0].push([
                new THREE.Vector2((_v1.x+_offset.x)/_range.x,(_v1.y+_offset.y)/_range.y),
                new THREE.Vector2((_v2.x+_offset.x)/_range.x,(_v2.y+_offset.y)/_range.y),
                new THREE.Vector2((_v3.x+_offset.x)/_range.x,(_v3.y+_offset.y)/_range.y)
            ]);
        }
        geometry.uvsNeedUpdate = true;
	};
	
}
jam3D_load_init();

/*
 * require
 */
try{
	define(function(){
		return Jam3D;
	})
}catch(e){
	console.log("Jam3D：非require方式加载.");
}
