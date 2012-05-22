(function($) {

    var onlineJSON = {"services":[
        {"label":"SFU Connect + mySFU","link":"http://connect.sfu.ca"},
        {"label":"Alumni Mail","link":"http://www.sfu.ca/alumni/emailforwarding/"},
        {"label":"Student Information System","link":"http://go.sfu.ca"}
    ]};

    function aToZ(){
        var atoz = '';
        for( var i=65;i<91;i++){
            var letter = String.fromCharCode(i+32);
            atoz +='<li><a href="http://www.sfu.ca/dir/?'+letter+'">'+letter+'</a></li>';
        }
        $('<ul>').html(atoz).attr('id','AtoZ').css('zIndex', 999).appendTo('li#directory');
    }

    function online(jsonData){

        var data = jsonData;
        var menu = '';

        for (var i= 0; i < data.services.length; i++) {
            menu += '<li><a href="'+data.services[i].link+'">'+data.services[i].label+'</a></li>';
        }

        $('<ul>').html(menu).attr('id','onlineServices').css('zIndex', 1000).appendTo('#online');

    }

    $(document).ready(function(){
        //Creates A to Z menu
        aToZ();

        //Loading the JSON for the SFU Online menu
        online(onlineJSON);

        $('li.dropdown').hover(
            function() { $('ul', this).css('display', 'block'); },
            function() { $('ul', this).css('display', 'none'); }
        );

        $('#directory').hover(
            function() { $('#directory a.tabs').css('border-bottom', '10px solid #cb5a60'); },
            function() { $('#directory a.tabs').css('border-bottom', 'none'); }
        );

        $('#online').hover(
            function() { $('#online a.tabs').css('border-bottom', '10px solid #cb5a60'); },
            function() { $('#online a.tabs').css('border-bottom', 'none'); }
        );

        $("#s").focus(function() {
            if( this.value === this.defaultValue ){
                this.value = "";
            }
        }).blur(function() {
            if( !this.value.length ) {
                this.value = this.defaultValue;
            }
        });

    }); // End $(document).ready(function(){
})(jQuery);
