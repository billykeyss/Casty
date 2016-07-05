/* eslint no-undef: "off"*/

function post(path, params, methodInput) {
    const method = methodInput || 'post'; // Set method to post by default if not specified.

    // The rest of this code assumes you are not using a library.
    // It can be made less wordy if you use one.
    const form = document.createElement('form');
    form.setAttribute('method', method);
    form.setAttribute('action', path);

    for (var key in params) { // eslint-disable-line no-var
        if (params.hasOwnProperty(key)) {
            const hiddenField = document.createElement('input');
            hiddenField.setAttribute('type', 'hidden');
            hiddenField.setAttribute('name', key);
            hiddenField.setAttribute('value', params[key]);

            form.appendChild(hiddenField);
        }
    }

    document.body.appendChild(form);
    form.submit();
}

function del(path, params) {
    $.ajax({
        type: 'DELETE',
        url: path,
        data: params,
        success: function () {
            console.log('test');
        }
    });
}

$(document).ready(function () {
    $('.submit').click(function () {
        const movie = document.getElementById('movieName').value;
        const year = document.getElementById('year').value;
        const url = document.getElementById('url').value;
        post('/movie-list', {
            movie: movie,
            year: year,
            url: url,
            post: true
        });
    });

    $('.play-btn').click(function () {
        const $grid = $(this).parent().parent().parent(); // Find the row
        const $title = $grid.find('.grid-title').text(); // Find the text
        const $year = $grid.find('.grid-year').text(); // Find the text
        post('/movie-list', {
            movie: $title,
            year: $year,
            post: false
        });
    });

    $('.delete-btn').click(function () {
        const $grid = $(this).parent().parent().parent(); // Find the row
        const $title = $grid.find('.grid-title').text(); // Find the text
        const $year = $grid.find('.grid-year').text(); // Find the text
        setTimeout(function myFunction() {
            location.reload();
        }, 500);
            // Let's test it out
        del('/movie-list', {
            title: $title,
            year: $year
        });
    });

    $(function () {
        function callback() {
            setTimeout(function () {
                $('#button').removeClass('validate');
            }, 1250);
        }

        function validate() {
            setTimeout(function () {
                $('#button').removeClass('onclic');
                $('#button').addClass('validate');
                setTimeout(callback, 450);
            }, 2250);
        }

        $('#button').click(function () {
            $('#button').addClass('onclic');
            setTimeout(validate, 250);
        });
    });
});
