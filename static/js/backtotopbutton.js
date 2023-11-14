    var backButton = document.getElementById("backtotopbutton");

    backButton.addEventListener("click", function() {
      // Scroll to the top of the page smoothly
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    // Show/hide the back-to-top button based on scroll position
    window.addEventListener("scroll", function() {
      if (window.pageYOffset > 300) {
        backButton.classList.add("show");
      } else {
        backButton.classList.remove("show");
      }
    });