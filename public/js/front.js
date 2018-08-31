$(function(){
    var $button = $('#addrow'),
        $row = $('.addable').clone();

    $button.click(function() {
        $row.clone().insertBefore( $button );
    });

    $(".summary-btn").click(function() {
        $(this).parent().parent().parent().find('p').toggle();
    });
})
