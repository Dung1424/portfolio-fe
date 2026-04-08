/*
* Template Name: MyPortfolio
* Template URL: https://bootstrapmade.com/myportfolio-bootstrap-portfolio-website-template/
* License: https://bootstrapmade.com/license/
*/

(function ($) {
  "use strict";

  var burgerMenu = function() {
	  $('.burger').click(function(e) {
	  	$(window).scrollTop(0);
	    if(!$('.burger').hasClass('active'))
	      $('.burger').addClass('active');
	    else
	      $('.burger').removeClass('active');
	  });
  }
  burgerMenu();

  /* Isotope on #portfolio-grid removed — home feed uses CSS grid + Tailwind. */
  $(window).on('load', function () {
    var $container = $('#portfolio-grid')
    if ($container.length && $.fn.isotope) {
      $container.isotope({
        itemSelector: '.item',
        isFitWidth: true
      })
      $(window).on('resize', function () {
        $container.isotope({ columnWidth: '.col-sm-3' })
      })
      $container.isotope({ filter: '*' })
      $('#filters').on('click', 'a', function (e) {
        e.preventDefault()
        var filterValue = $(this).attr('data-filter')
        $container.isotope({ filter: filterValue })
        $('#filters a').removeClass('active')
        $(this).addClass('active')
      })
    }
  })


  var siteOwlCarousel = function() {
  	$('.testimonial-carousel').owlCarousel({
		  center: true,
	    items: 1,
	    loop: true,
	    margin: 0,
	    autoplay: true,
	    smartSpeed: 1000,
		});
  };
  siteOwlCarousel();


})(jQuery);

AOS.init({
	easing: 'ease',
	duration: 1000,
	once: true
});

var __navHamburger = document.querySelector('.hamburger');
if (__navHamburger) {
  __navHamburger.addEventListener('click', function() {
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) {
      navLinks.style.display = (navLinks.style.display === 'flex') ? 'none' : 'flex';
    }
  });
}
// dropdown
function toggleDropdown(id) {
    const dropdownElement = document.getElementById(id);
    if (dropdownElement) {
        dropdownElement.classList.toggle("show");
    } else {
        console.error(`Element with ID ${id} not found`);
    }
}

// Đóng dropdown nếu người dùng nhấp ra ngoài
window.onclick = function(event) {
    if (!event.target.matches('.fa-bell') && !event.target.matches('.user-dropdown img')) {
        var dropdowns = document.getElementsByClassName("dropdown-content");
        for (var i = 0; i < dropdowns.length; i++) {
            var openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
}
