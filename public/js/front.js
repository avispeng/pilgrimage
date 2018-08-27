$(function(){
    var $button = $('#addrow'),
        $row = $('.addable').clone();

    $button.click(function() {
        $row.clone().insertBefore( $button );
    });


    $('.intro-div').click(function() {
        $(this).children('p').show();
        $(this).children('button').hide();
    });
})
