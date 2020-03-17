$(document).ready(function(){
    function gotoMenu() {
      document.querySelector(".navigation__checkbox").checked = false;
    }
    $(window).scroll(function () {
        var scrollPosition = $(window).scrollTop();
        if(scrollPosition>400){
            $('.header__main-video').trigger('pause');
        } else {
            $('.header__main-video').trigger('play');
        }

//        console.log(scrollPosition);
      });
});
