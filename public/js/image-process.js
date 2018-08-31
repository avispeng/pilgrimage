
var canvas = $("#canvas"),
    canvasBanner = $("#canvasBanner"),
    context = canvas.get(0).getContext("2d"),
    contextBanner = (canvasBanner.length)? canvasBanner.get(0).getContext("2d") : null,
    $result = $('#result'),
    $resultBanner = $('#resultBanner');
    croppedImageDataURL = null,
    croppedBannerDataURL = null,
    $btnCrop = $('#btnCrop'),
    $btnCropBanner = $('#btnCropBanner');

function validationCallback(event, form) {
    event.preventDefault();
    // console.log(this);
    // append cropped image to the form before submitting
    var imageInput = $("#image-input").val();
    if(imageInput == '') {
        // if file is not uploaded, do nothing and submit
        console.log("no file");
        form.submit();
    } else {
        console.log("file uploaded");

        // if file is uploaded but not cropped, default crop
        if(!croppedImageDataURL) {
            console.log("no cropping");
            croppedImageDataURL = canvas.cropper('getCroppedCanvas').toDataURL('image/jpeg');
        }
        if(canvasBanner.length && !croppedBannerDataURL) {
            croppedBannerDataURL = canvasBanner.cropper('getCroppedCanvas').toDataURL('image/jpeg');
        }
        // create formdata and append cropped image to it
        var fd = new FormData(document.forms[0]);

        if(!croppedBannerDataURL) {
            // for show poster
            var blob = dataURItoBlob(croppedImageDataURL);
            fd.set("image", blob, $('label.custom-file-label').text());
        } else {
            // for city
            fd.delete('image');
            var blob = dataURItoBlob(croppedImageDataURL);
            fd.append("images", blob, $('label.custom-file-label').text());
            var blobBanner = dataURItoBlob(croppedBannerDataURL);
            fd.append("images", blobBanner, 'banner-' + $('label.custom-file-label').text());
        }
        // console.log($('label.custom-file-label').text());
        // form.submit();
        // use ajax to post dataform
        $.ajax({
            type: form.method,
            url: form.action,
            data: fd,
            processData: false,
            contentType: false
        }).done(function(res) {
            if(res.url) {
                window.location.href = res.url;
            }
        });
    }
}
// crop the image
$('#image-input').on('change', function(){
    if (this.files && this.files[0]) {
      if ( this.files[0].type.match(/^image\//) ) {
          var name = this.files[0].name;
          $('label.custom-file-label').text(name);
          $btnCrop.prop('disabled', false);
          if($btnCropBanner.length) {
              $btnCropBanner.prop('disabled', false);
          }
          var reader = new FileReader();
          reader.onload = function(evt) {
           var img = new Image();
           img.onload = function() {
             context.canvas.height = img.height;
             context.canvas.width  = img.width;
             context.drawImage(img, 0, 0);
             if(contextBanner) {
                 contextBanner.canvas.height = img.height;
                 contextBanner.canvas.width  = img.width;
                 contextBanner.drawImage(img, 0, 0);
             }

             if(!contextBanner) {
                 // for show
                 var cropper = canvas.cropper({
                   aspectRatio: 25 / 37
                 });
             } else {
                 // for city photo
                 var cropper = canvas.cropper({
                   aspectRatio: 3 / 2
                 });
                 // for city banner
                 var cropperBanner = canvasBanner.cropper({
                     aspectRatio: 3.67 / 1
                 });
             }

             $btnCrop.click(function() {
                // Get a string base 64 data url
                croppedImageDataURL = canvas.cropper('getCroppedCanvas').toDataURL('image/jpeg');
                $result.show();
                $result.attr('src', croppedImageDataURL);
                // console.log(croppedImageDataURL);
             });

             if($btnCropBanner.length) {
                 $btnCropBanner.click(function() {
                    // Get a string base 64 data url
                    croppedBannerDataURL = canvasBanner.cropper('getCroppedCanvas').toDataURL('image/jpeg');
                    $resultBanner.show();
                    $resultBanner.attr('src', croppedBannerDataURL);
                    // console.log(croppedImageDataURL);
                 });
             }
             // $('#btnRestore').click(function() {
             //   canvas.cropper('reset');
             //   $result.empty();
             // });
           };
           img.src = evt.target.result;
                };
        reader.readAsDataURL(this.files[0]);
      }
      else {
        alert("Invalid file type! Please select an image file.");
      }
    }
    else {
      alert('No file(s) selected.');
    }
});

function dataURItoBlob(dataURI) {
    // convert base64/URLEncoded data component to raw binary data held in a string
    var byteString = atob(dataURI.split(',')[1]);

    // write the bytes of the string to a typed array
    var ia = new Uint8Array(byteString.length);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ia], {type:'image/jpeg'});
}
