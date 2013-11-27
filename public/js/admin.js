/*global Spine, EJS, tinyMCE, moment*/

window.exports = {};

if (!Array.prototype.forEach) {
    Array.prototype.forEach = function (fn, scope) {
        'use strict';
        var i, len;
        for (i = 0, len = this.length; i < len; ++i) {
            if (i in this) {
                fn.call(scope, this[i], i, this);
            }
        }
    };
}

var app = (function(Spine, $, exports, data) {

    var stripwhitespace = function() {
        $('textarea').each(function() {
            var html = this.innerHTML
            ,   nbspregex = /<p>&nbsp;<\/p>\n/g;
            this.innerHTML = html.replace(nbspregex, '');
        });
    };

    /********************************************************
        CONDITIONS
    ********************************************************/

    var Condition = Spine.Model.sub();

    Condition.configure('Condition', 'campus', 'name', 'status', 'severity', 'statusSeverityMap');
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
        hydrate: function(campus) {
            var conditionsMap = JSON.parse(document.getElementById('conditions_map').innerHTML);
            for (var conditionName in data.conditions[campus]) {
                this.create({
                    campus: campus,
                    name: conditionName,
                    status: data.conditions[campus][conditionName].status,
                    severity: data.conditions[campus][conditionName].severity,
                    statusSeverityMap: conditionsMap[conditionName]
                });
            }
        }
    });

    // update, render
    var ConditionsItem = Spine.Controller.sub({
        className: 'conditionsitem clearfix',

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
        init: function() {
            Condition.bind('create', this.proxy(this.addOne));
            Condition.hydrate(this.campus);
        },

        addOne: function(condition) {
            var view = new ConditionsItem({item: condition});
            this[this.campus + 'Conditions'].append(view.render().el);

        }
    });

    /********************************************************
        GENERIC TEXT ITEM
    ********************************************************/

    var TextItem = Spine.Model.sub();
    TextItem.configure('TextItem', 'content', 'position');
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
                this.create({content: data[type][i], position: i+1});
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

        el: $('#sidebars-container'),

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
        el: $('#announcements-container'),


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
            'change .linktext': 'updateText',
            'change .linkurl': 'updateUrl',
            'click .deletelink': 'destroy'
        },

        tag: 'p',

        className: 'link group clearfix',

        init: function() {
            this.item.bind('destroy', this.proxy(this.remove));
        },

        updateText: function(ev) {
            this.item.updateAttribute('text', ev.target.value);
        },

        updateUrl: function(ev) {
            this.item.updateAttribute('url', ev.target.value);
        },

        template: function() {
            var tmpl = document.getElementById('linkItemTmpl');
            return new EJS({ element: tmpl, type: '[' }).render(this.item);
        },

        render: function() {
            this.el.append(this.template());
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
            // hackityhackhack
            var el = $('#linkcategory-' + view.item.category_id);
            el.append(view.render().el);
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
        el: $('#links-container'),

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
            var view = new CategoriesItem( {item: category });
            this.linkCategories.append(view.render().el);
            if (category.name === '') {
                view.el.find('.linkCategoryName').focus();
                view.el.get(0).scrollIntoView();
            }
            new Links({
                categoryid: category.id,
                el: $('#linkcategory-' + category.id)
            });
        },

        create: function() {
            Category.create({name: ''});
        }
    });


    var App = Spine.Controller.sub({

        el: $('body'),

        init: function() {
            if (!String.prototype.toSentenceCase) {
                String.prototype.toSentenceCase = function() {
                    return this.toUpperCase().charAt(0) + this.substring(1);
                };
            }

            $('body').on('click', 'button', function(ev) { ev.preventDefault(); });
            $('#updateconditions').on('submit', function(ev) { ev.preventDefault(); });
            jQuery.validator.messages.required = "";
            jQuery.validator.messages.url = "";

            $('#updateconditions').submit(function(ev) { ev.preventDefault(); }).validate({
                focusInvalid: false,
                onfocusout: false,
                onkeyup: false,
                invalidHandler: function(form, validator) {
                    var numerrors = validator.numberOfInvalids();
                    var msg = '<strong>Whoa now, not so fast!</strong><br/>There ';
                    msg += numerrors === 1 ? 'was a problem ' : 'were some problems ';
                    msg += 'with your form input. ';
                    msg += numerrors === 1 ? 'It has been ' : 'They have been ';
                    msg += 'highlighted below. Please correct the problem and try again.';
                    msg = $('<div>').html(msg);
                    window.scrollTo(0, 1);
                    $('#message-container').removeClass().addClass('error').empty().append(msg).fadeIn();
                },
                submitHandler: function(form) {
                    var data = {
                        conditions: Condition.serialize(),
                        announcements: Announcement.serialize(),
                        sidebars: Sidebar.serialize(),
                        links: Category.serialize()
                    };

                    var nbspregex = /<p>&nbsp;<\/p>\n/g;
                    for (var i = 0; i < data.announcements.length; i++) {
                        data.announcements[i] = data.announcements[i].replace(nbspregex, '');
                    }

                    $.ajax({
                        type: 'POST',
                        url: form.action,
                        data: JSON.stringify(data),
                        beforeSend: function() {
                            $('input[type="submit"]').attr('disabled', true);
                        },
                        complete: function() {
                            $('input[type="submit"]').attr('disabled', false);
                        },
                        success: function(data, textStatus, jqXHR) {
                            $('#lastupdated span').text(moment(new Date(data.lastupdated)).format('[at] h:mm a [on] dddd, MMMM DD, YYYY'));
                            var msg = $('<div>').html('<strong>Success!</strong><br/>The Road and Traffic Report has been updated.');
                            $('#message-container').removeClass().addClass('success').empty().append(msg).fadeIn().delay(4000).fadeOut();
                            window.scrollTo(0, 1);
                            window.isDirty = false;
                        },
                        error: function(jqXHR, textStatus, errorThrown) {
                            var msg = $('<div>').html('<strong>Oh dear, something has gone awry.</strong><br/>The server reported an error when trying to process the form. Please wait a moment and try again.');
                            $('#message-container').removeClass().addClass('error').empty().append(msg).fadeIn();
                            window.scrollTo(0, 1);
                        },
                        dataType: 'json',
                        contentType: 'application/json'
                    });

                }
            });

            tinyMCE.init({
                mode: 'none',
                theme: 'advanced',
                oninit: 'setPlainText',
                plugins: 'paste',
                paste_remove_spans: true,
                paste_strip_class_attributes: 'all',
                paste_postprocess: function(pl, o) {
                    $(o.node).children().removeAttr('align style');
                    o.node.innerHTML = o.node.innerHTML.replace(/<p>\s*(<br>|&nbsp;)\s*<\/p>/ig, "");
                },
                theme_advanced_buttons1: 'bold,italic,|,link,unlink,|,cut,copy,paste',
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

            window.isDirty = false;
            $('#updateconditions :input').change(function() {
                window.isDirty = true;
            });
            window.onbeforeunload = function() {
                if (window.isDirty) {
                    return 'You\'ve made changes on this page which aren\'t saved. If you leave you will lose these changes.';
                }
            };

        }
    });

    return new App();


})(Spine, Spine.$, window.exports, JSON.parse(document.getElementById('conditions_json').innerHTML));