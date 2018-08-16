$(function(){
    var $button = $('#addrow'),
        $row = $('.addable').clone();

    $button.click(function() {
        $row.clone().insertBefore( $button );
    });
})
