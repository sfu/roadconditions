var data = JSON.parse(document.getElementById('conditions_json').innerHTML);


/********************************************************
    CONDITIONS
********************************************************/

var Condition = Spine.Model.sub();

Condition.configure('Condition', 'name', 'status', 'severity', 'statusSeverityMap');
Condition.extend({
    serialize: function() {},
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
        var severities = ['normal', 'warning', 'alert'];
        var selected;
        var html = '<label for="' + this.item.name + '">' + this.item.name + ': </label><select class="status" id="' + this.item.name + '">';

        for (var status in this.item.statusSeverityMap) {
            selected = status === this.item.status ? 'selected="selected"' : '';
            html += '<option value="' + status + '" ' + selected +'>' + status + '</option>';
        }

        html += '</select><label class="status_label" for="' + this.item.name + '_status">Status: </label><select class="severity" data-statusfor="' + this.item.name + '" id="' + this.item.name + '_status">';

        for (var i = 0; i < severities.length; i++) {
            selected = severities[i] === this.item.severity ? 'selected="selected"' : '';
            html += '<option value="' + severities[i] + '" ' + selected +'>' + severities[i] + '</option>';
        }

        html += '</select>';

        return html;
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
        this.item.bind('update', this.proxy(this.render));
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
        return '<textarea style="display:block;width:400px;height:100px;margin-bottom:5px">' + this.item.content + '</textarea><button class="deletesidebaritem">Delete</button>';
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
    },

    create: function(ev) {
        Sidebar.create({content: ''});
    }

});


/********************************************************
    ANNOUNCEMENTS
********************************************************/

var Announcement = TextItem.sub({
    validate: function() {
        if (Announcement.count() > 0) {
            return 'Can\'t create more announcements';
        }
    }
});
Announcement.configure('Announcement');

var AnnouncementsItem = TextItemController.sub({
    events: {
        'change .announcementsitem textarea': 'update'
    },

    className: 'announcementsitem',

    template: function(item) {
        return '<textarea style="display:block;width:400px;height:100px;margin-bottom:5px">' + this.item.content + '</textarea>';
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
        return '<div><input data-attr="url" value="' + this.item.url + '"><input data-attr="text" value="' + this.item.text + '"><button class="deletelink">Delete Link</button></div>';
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
Category.hasMany('links', 'Link');
Category.extend({
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
        'click .deleteCategory': 'destroy',
        'click .addLink': 'createLink'
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

        return '<div><label for="category-' + this.item.id + '">Category</label><br /><input class="linkCategoryName" id="category-' + this.item.id + '" value="' + this.item.name + '"/></div><div id="linkcategory-' + this.item.id + '" class="links"></div><button class="deleteCategory">Delete Category</button><button class="addLink">Add Link</button>';

//        return '<input class="linkCategoryName" type="text" value="' + this.item.name + '" /><div id="linkcategory-' + this.item.id + '" class="links"></div><button class="deleteCategory">Delete Category</button><button class="addLink">Add Link</button>';
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


new Conditions();
new Announcements({ attr: 'announcements' });
new Sidebars( { attr: 'sidebars' } );
new Categories();

$('body').on('click', 'button', function(ev) { ev.preventDefault(); });