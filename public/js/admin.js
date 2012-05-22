/*global Spine, EJS, tinyMCE*/

window.exports = {};

var app = (function(Spine, $, exports, data) {

    /********************************************************
        CONDITIONS
    ********************************************************/

    var Condition = Spine.Model.sub();

    Condition.configure('Condition', 'name', 'status', 'severity', 'statusSeverityMap');
    Condition.extend({
        serialize: function() {
            var out = {};
            var conditions = this.all();
            for (var i = 0; i < conditions.length; i++) {
                var condition = conditions[i].attributes();
                out[condition.name] = {
                    status: condition.status,
                    severity: condition.severity
                };
            }
            return out;
        },
        hydrate: function() {
            var conditionsMap = JSON.parse(document.getElementById('conditions_map').innerHTML);
            for (var conditionName in data.conditions) {
                this.create({
                    name: conditionName,
                    status: data.conditions[conditionName].status,
                    severity: data.conditions[conditionName].severity,
                    statusSeverityMap: conditionsMap[conditionName]
                });
            }
        }
    });

    // update, render
    var ConditionsItem = Spine.Controller.sub({
        className: 'conditionsitem',

        events: {
            'change .status': 'updateStatus',
            'change .severity': 'updateSeverity'
        },

        init: function() {
            this.item.bind('update', this.proxy(this.render));
        },

        template: function(item) {
            var tmpl = document.getElementById('conditionItemTmpl');
            return new EJS({ element: tmpl, type: '[' }).render(this.item);
        },

        render: function(item) {
            this.el.html(this.template(item));
            return this;
        },

        updateStatus: function(ev) {
            var newStatus = ev.target.value;
            this.item.updateAttributes({
                status: newStatus,
                severity: this.item.statusSeverityMap[newStatus]
            });
        },

        updateSeverity: function(ev) {
            this.item.updateAttribute('severity', ev.target.value);
        }
    });

    // create
    var Conditions = Spine.Controller.sub({
        el: $('#conditionsContainer'),

        elements: {
            '#conditions': 'conditions'
        },

        init: function() {
            Condition.bind('create', this.proxy(this.addOne));
            Condition.hydrate();
        },

        addOne: function(condition) {
            var view = new ConditionsItem({item: condition});
            this.conditions.append(view.render().el);

        }
    });

    /********************************************************
        GENERIC TEXT ITEM
    ********************************************************/

    var TextItem = Spine.Model.sub();
    TextItem.configure('TextItem', 'content');
    TextItem.extend({
        serialize: function() {
            var out = [];
            var all = this.all();
            var i = 0;
            for ( ; i < all.length ; i++) {
                out.push(all[i].attributes().content);
            }
            return out;
        },

        hydrate: function(type) {
            for (var i = 0; i < data[type].length; i++) {
                this.create({content: data[type][i]});
            }
        }
    });

    //represents a controller for each individual announcement & sidebar item; handles updating, destorying and rendering
    var TextItemController = Spine.Controller.sub({
        init: function() {
            this.item.bind('destroy', this.proxy(this.remove));
        },

        update: function(ev) {
            this.item.updateAttribute('content', ev.target.value);
        },


        render: function(item) {
            this.el.html(this.template(item));
            return this;
        },

        remove: function() {
            this.el.remove();
            this.release();
        },

        destroy: function() {
            this.item.destroy();
        }
    });




    /********************************************************
        SIDEBARS
    ********************************************************/

    // Subclass TextItem for our Sidebar model
    var Sidebar = TextItem.sub();
    Sidebar.configure('Sidebar');

    // SidebarsItem represents a controller for each individual sidebar item; handles updating, destorying and rendering
    var SidebarsItem = TextItemController.sub({

        events: {
            'change .sidebaritem textarea': 'update',
            'click .deletesidebaritem': 'destroy'
        },

        className: 'sidebaritem',

        template: function(item) {
            var tmpl = document.getElementById('sidebarTmpl');
            return new EJS({ element: tmpl, type: '[' }).render(this.item);
        }

    });

    // Sidebars represents an overall controller for adding new SidebarsItems and bootstrapping form the cached data
    var Sidebars = Spine.Controller.sub({

        el: $('#sidebarsContainer'),

        events: {
            'click #addnewsidebar': 'create'
        },

        elements: {
            '#sidebars': 'sidebars'
        },

        init: function() {
            Sidebar.bind('create', this.proxy(this.addOne));
            Sidebar.hydrate(this.attr);
        },

        addOne: function(sidebar) {
            var view = new SidebarsItem({ item: sidebar });
            this.sidebars.append(view.render().el);
            tinyMCE.execCommand("mceAddControl", false, 'sidebar-' + sidebar.id);
        },

        create: function(ev) {
            Sidebar.create({content: ''});
        }

    });


    /********************************************************
        ANNOUNCEMENTS
    ********************************************************/

    var Announcement = TextItem.sub();
    Announcement.configure('Announcement');

    var AnnouncementsItem = TextItemController.sub({
        events: {
            'change .announcementsitem textarea': 'update'
        },

        className: 'announcementsitem',

        template: function() {
            var tmpl = document.getElementById('announcementTmpl');
            return new EJS({ element: tmpl, type: '[' }).render(this.item);
        }

    });

    var Announcements = Spine.Controller.sub({
        el: $('#announcementsContainer'),


        elements: {
            '#announcements': 'announcements'
        },

        init: function() {
            Announcement.bind('create', this.proxy(this.addOne));
            Announcement.hydrate(this.attr);
        },

        addOne: function(announcement) {
            var view = new AnnouncementsItem({ item: announcement });
            this.announcements.append(view.render().el);
            tinyMCE.execCommand("mceAddControl", false, 'announcement-' + announcement.id);
        }
    });


    /********************************************************
         LINKS
    ********************************************************/
    var Link = Spine.Model.sub();
    Link.configure('Link', 'url', 'text');
    Link.belongsTo('category', 'Category');

    var LinksItem = Spine.Controller.sub({

        events: {
            'change .link input': 'update',
            'click .deletelink': 'destroy'
        },

        tag: 'p',

        className: 'link',

        init: function() {
            this.item.bind('destroy', this.proxy(this.remove));
        },

        update: function() {
            console.log('update link');
        },

        template: function() {
            var tmpl = document.getElementById('linkItemTmpl');
            return new EJS({ element: tmpl, type: '[' }).render(this.item);
        },

        render: function() {
            $('#linkcategory-' + this.item.attributes().category_id).append(this.template());
            return this;
        },

        remove: function() {
            this.el.remove();
            this.release();
        },

        destroy: function() {
            this.item.destroy();
        }
    });

    var Links = Spine.Controller.sub({

        elements: {
            '.links' : 'linksEl'
        },


        init: function() {
            Link.unbind('create');
            Link.bind('create', this.proxy(this.addOne));
        },

        addOne: function(link) {
            var view = new LinksItem( {item: link });
            this.el.append(view.render().el);
        },

        create: function() {
            Link.create({url: '', text: ''});
        }
    });


    var Category = Spine.Model.sub();
    Category.configure('Category', 'name');
    Category.hasMany('links', 'exports.Link');
    Category.extend({

        serialize: function() {
            var out = [];
            var all = this.all();
            for (var i = 0; i < all.length; i++) {
                var set = all[i];
                var links = set.links().all();
                var obj = {};
                obj.category = set.attributes().name;
                obj.links = [];
                for (var ii = 0; ii < links.length; ii++) {
                    var link = links[ii].attributes();
                    obj.links.push({
                        url: link.url,
                        text: link.text
                    });
                }
                out.push(obj);
            }
            return out;
        },

        hydrate: function() {
            var linkCategories = data.links;
            for (var i = 0; i < linkCategories.length; i++) {
                var linkCategory = linkCategories[i];
                var newCategory = this.create({name: linkCategory.category});
                for (var ii = 0; ii < linkCategory.links.length; ii++) {
                    var link = linkCategory.links[ii];
                    newCategory.links().create(link);
                }
            }
        }
    });

    var CategoriesItem = Spine.Controller.sub({

        events: {
            'change .linkCategoryName': 'update',
            'click .deletecategory': 'destroy',
            'click .addlink': 'createLink'
        },

        elements: {
            '.linkCategoryName': 'linkCategoryName'
        },

        className: 'category-group',

        tag: 'fieldset',

        init: function() {
            this.item.bind('destroy', this.proxy(this.remove));
        },

        update: function(ev) {
            this.item.updateAttribute('name', ev.target.value);
        },

        template: function() {
            var tmpl = document.getElementById('linkCategoryTmpl');
            return new EJS({ element: tmpl, type: '[' }).render(this.item);
        },

        render: function() {
            this.el.html(this.template());
            return this;
        },

        remove: function() {
            this.el.remove();
            this.release();
        },

        destroy: function() {
            // remove associated links
            this.item.links().all().forEach(function(link) {
                link.destroy();
            });
            // remove the category
            this.item.destroy();
        },

        createLink: function() {
            this.item.links().create({url: '', text: ''});
        }

    });

    var Categories = Spine.Controller.sub({
        el: $('#linksContainer'),

        elements: {
            '#linkCategories' : 'linkCategories'
        },

        events: {
            'click #addnewlinkcategory': 'create'
        },

        init: function() {
            Category.bind('create', this.proxy(this.addOne));
            Category.hydrate();
        },

        addOne: function(category) {
            new Links({
                categoryid: category.id,
                el: $('#linkcategory-' + category.id)
            });
            var view = new CategoriesItem( {item: category });
            this.linkCategories.append(view.render().el);
            if (category.name === '') {
                view.el.find('.linkCategoryName').focus();
                view.el.get(0).scrollIntoView();
            }
        },

        create: function() {
            Category.create({name: ''});
        }
    });


    var App = Spine.Controller.sub({

        el: $('body'),

        init: function() {

            $('body').on('click', 'button', function(ev) { ev.preventDefault(); });
            $('form').on('submit', this.submit);

            tinyMCE.init({
                mode: 'textareas',
                theme: 'advanced',
                plugins: 'paste',
                theme_advanced_buttons1: 'bold,italic,|,link,unlink,|,cut,copy,paste,pastetext,pasteword',
                theme_advanced_buttons2: '',
                theme_advanced_buttons3: '',
                theme_advanced_toolbar_location : "top",
                theme_advanced_toolbar_align : "left",
                theme_advanced_resizing : true,
                setup : function(ed) {
                    ed.onChange.add(function(ed, l) {
                        ed.save();
                        $(ed.getElement()).trigger('change');
                    });
                }
            });

            exports.Condition = Condition;
            exports.Announcement = Announcement;
            exports.Sidebar = Sidebar;
            exports.Link = Link;
            exports.Category = Category;

            new Conditions();
            new Announcements({ attr: 'announcements' });
            new Sidebars( { attr: 'sidebars' } );
            new Categories();
        },

        submit: function(ev) {
            ev.preventDefault();
            var data = {
                conditions: Condition.serialize(),
                announcements: Announcement.serialize(),
                sidebars: Sidebar.serialize(),
                links: Category.serialize()
            };
            console.log(JSON.stringify(data));
        }
    });

    return new App();


})(Spine, Spine.$, exports, JSON.parse(document.getElementById('conditions_json').innerHTML));