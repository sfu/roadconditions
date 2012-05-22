window.exports={};var app=(function(g,f,v,u){var t=g.Model.sub();t.configure("Condition","name","status","severity","statusSeverityMap");t.extend({serialize:function(){var w={};var y=this.all();for(var x=0;x<y.length;x++){var z=y[x].attributes();w[z.name]={status:z.status,severity:z.severity}}return w},hydrate:function(){var x=JSON.parse(document.getElementById("conditions_map").innerHTML);for(var w in u.conditions){this.create({name:w,status:u.conditions[w].status,severity:u.conditions[w].severity,statusSeverityMap:x[w]})}}});var b=g.Controller.sub({className:"conditionsitem",events:{"change .status":"updateStatus","change .severity":"updateSeverity"},init:function(){this.item.bind("update",this.proxy(this.render))},template:function(x){var w=document.getElementById("conditionItemTmpl");return new EJS({element:w,type:"["}).render(this.item)},render:function(w){this.el.html(this.template(w));return this},updateStatus:function(x){var w=x.target.value;this.item.updateAttributes({status:w,severity:this.item.statusSeverityMap[w]})},updateSeverity:function(w){this.item.updateAttribute("severity",w.target.value)}});var n=g.Controller.sub({el:f("#conditionsContainer"),elements:{"#conditions":"conditions"},init:function(){t.bind("create",this.proxy(this.addOne));t.hydrate()},addOne:function(x){var w=new b({item:x});this.conditions.append(w.render().el)}});var s=g.Model.sub();s.configure("TextItem","content");s.extend({serialize:function(){var w=[];var y=this.all();var x=0;for(;x<y.length;x++){w.push(y[x].attributes().content)}return w},hydrate:function(x){for(var w=0;w<u[x].length;w++){this.create({content:u[x][w]})}}});var i=g.Controller.sub({init:function(){this.item.bind("destroy",this.proxy(this.remove))},update:function(w){this.item.updateAttribute("content",w.target.value)},render:function(w){this.el.html(this.template(w));return this},remove:function(){this.el.remove();this.release()},destroy:function(){this.item.destroy()}});var d=s.sub();d.configure("Sidebar");var o=i.sub({events:{"change .sidebaritem textarea":"update","click .deletesidebaritem":"destroy"},className:"sidebaritem",template:function(x){var w=document.getElementById("sidebarTmpl");return new EJS({element:w,type:"["}).render(this.item)}});var r=g.Controller.sub({el:f("#sidebarsContainer"),events:{"click #addnewsidebar":"create"},elements:{"#sidebars":"sidebars"},init:function(){d.bind("create",this.proxy(this.addOne));d.hydrate(this.attr)},addOne:function(x){var w=new o({item:x});this.sidebars.append(w.render().el);tinyMCE.execCommand("mceAddControl",false,"sidebar-"+x.id)},create:function(w){d.create({content:""})}});var k=s.sub();k.configure("Announcement");var e=i.sub({events:{"change .announcementsitem textarea":"update"},className:"announcementsitem",template:function(){var w=document.getElementById("announcementTmpl");return new EJS({element:w,type:"["}).render(this.item)}});var q=g.Controller.sub({el:f("#announcementsContainer"),elements:{"#announcements":"announcements"},init:function(){k.bind("create",this.proxy(this.addOne));k.hydrate(this.attr)},addOne:function(x){var w=new e({item:x});this.announcements.append(w.render().el);tinyMCE.execCommand("mceAddControl",false,"announcement-"+x.id)}});var j=g.Model.sub();j.configure("Link","url","text");j.belongsTo("category","Category");var a=g.Controller.sub({events:{"change .link input":"update","click .deletelink":"destroy"},tag:"p",className:"link",init:function(){this.item.bind("destroy",this.proxy(this.remove))},update:function(){console.log("update link")},template:function(){var w=document.getElementById("linkItemTmpl");return new EJS({element:w,type:"["}).render(this.item)},render:function(){f("#linkcategory-"+this.item.attributes().category_id).append(this.template());return this},remove:function(){this.el.remove();this.release()},destroy:function(){this.item.destroy()}});var h=g.Controller.sub({elements:{".links":"linksEl"},init:function(){j.unbind("create");j.bind("create",this.proxy(this.addOne))},addOne:function(x){var w=new a({item:x});this.el.append(w.render().el)},create:function(){j.create({url:"",text:""})}});var m=g.Model.sub();m.configure("Category","name");m.hasMany("links","exports.Link");m.extend({serialize:function(){var x=[];var A=this.all();for(var y=0;y<A.length;y++){var D=A[y];var w=D.links().all();var C={};C.category=D.attributes().name;C.links=[];for(var z=0;z<w.length;z++){var B=w[z].attributes();C.links.push({url:B.url,text:B.text})}x.push(C)}return x},hydrate:function(){var B=u.links;for(var x=0;x<B.length;x++){var w=B[x];var A=this.create({name:w.category});for(var y=0;y<w.links.length;y++){var z=w.links[y];A.links().create(z)}}}});var p=g.Controller.sub({events:{"change .linkCategoryName":"update","click .deletecategory":"destroy","click .addlink":"createLink"},elements:{".linkCategoryName":"linkCategoryName"},className:"category-group",tag:"fieldset",init:function(){this.item.bind("destroy",this.proxy(this.remove))},update:function(w){this.item.updateAttribute("name",w.target.value)},template:function(){var w=document.getElementById("linkCategoryTmpl");return new EJS({element:w,type:"["}).render(this.item)},render:function(){this.el.html(this.template());return this},remove:function(){this.el.remove();this.release()},destroy:function(){this.item.links().all().forEach(function(w){w.destroy()});this.item.destroy()},createLink:function(){this.item.links().create({url:"",text:""})}});var c=g.Controller.sub({el:f("#linksContainer"),elements:{"#linkCategories":"linkCategories"},events:{"click #addnewlinkcategory":"create"},init:function(){m.bind("create",this.proxy(this.addOne));m.hydrate()},addOne:function(x){new h({categoryid:x.id,el:f("#linkcategory-"+x.id)});var w=new p({item:x});this.linkCategories.append(w.render().el);if(x.name===""){w.el.find(".linkCategoryName").focus();w.el.get(0).scrollIntoView()}},create:function(){m.create({name:""})}});var l=g.Controller.sub({el:f("body"),init:function(){if(!String.prototype.toSentenceCase){String.prototype.toSentenceCase=function(){return this.toUpperCase().charAt(0)+this.substring(1)}}f("body").on("click","button",function(w){w.preventDefault()});f("form").on("submit",this.submit);tinyMCE.init({mode:"textareas",theme:"advanced",plugins:"paste",theme_advanced_buttons1:"bold,italic,|,link,unlink,|,cut,copy,paste,pastetext,pasteword",theme_advanced_buttons2:"",theme_advanced_buttons3:"",theme_advanced_toolbar_location:"top",theme_advanced_toolbar_align:"left",theme_advanced_resizing:true,setup:function(w){w.onChange.add(function(y,x){y.save();f(y.getElement()).trigger("change")})}});v.Condition=t;v.Announcement=k;v.Sidebar=d;v.Link=j;v.Category=m;new n();new q({attr:"announcements"});new r({attr:"sidebars"});new c()},submit:function(w){w.preventDefault();var x={conditions:t.serialize(),announcements:k.serialize(),sidebars:d.serialize(),links:m.serialize()};f.ajax({type:"POST",url:w.target.action,data:JSON.stringify(x),success:function(y){console.log(y)},dataType:"json",contentType:"application/json"})}});return new l()})(Spine,Spine.$,exports,JSON.parse(document.getElementById("conditions_json").innerHTML));