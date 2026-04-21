$(document).ready(function () {
 
  // Smooth fade-in on page load
  $("main").css("opacity", 0).animate({ opacity: 1 }, 300);
 
  // Highlight active nav link
  const path = window.location.pathname;
  $(".nav-links a").each(function () {
    if (path.startsWith($(this).attr("href"))) {
      $(this).addClass("active");
    }
  });
 
});
