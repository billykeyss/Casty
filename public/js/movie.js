$(document).ready(function() {
    $("#submit").click(function() {
        var movie = document.getElementById("movieName").value;
        var year = document.getElementById("year").value;
        var url = document.getElementById("url").value;
        post('/movie-list', {
            movie: movie,
            year: year,
            url: url
        });
    });

    $(".delete").click(function(){
      console.log("DELETE");


  //     var $this = $(this),
  //  myCol = $this.closest("td"),
  //  myRow = myCol.closest("tr"),
  //  targetArea = $("#selection");
  //  var rowId = $("td.data-id", myRow).text();

       var $row = $(this).closest("tr"); // Find the row
       var $title = $row.find(".title").text(); // Find the text
       var $year = $row.find(".year").text(); // Find the text
       // Let's test it out
       del('/movie-list', {
           title: $title,
           year: $year
       });
    });

    $(".play").click(function(){
       var $row = $(this).closest("tr"); // Find the row
       var $jobid = $row.find(".title").text(); // Find the text
       // Let's test it out
       console.log($jobid);
    });
});

function post(path, params, method) {
    method = method || "post"; // Set method to post by default if not specified.

    // The rest of this code assumes you are not using a library.
    // It can be made less wordy if you use one.
    var form = document.createElement("form");
    form.setAttribute("method", method);
    form.setAttribute("action", path);

    for (var key in params) {
        if (params.hasOwnProperty(key)) {
            var hiddenField = document.createElement("input");
            hiddenField.setAttribute("type", "hidden");
            hiddenField.setAttribute("name", key);
            hiddenField.setAttribute("value", params[key]);

            form.appendChild(hiddenField);
        }
    }

    document.body.appendChild(form);
    form.submit();
}

function del(path, params, method) {
  $.ajax({
      type: "DELETE",
      url: path,
      data: params,
      success: function(){
          console.log('test');
      }
  });
}
