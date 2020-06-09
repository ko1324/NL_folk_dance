var albumBucketName = "t2est.com";
var bucketRegion = "ap-northeast-2";
var IdentityPoolId = 'ap-northeast-2:3a192d88-1f0f-4cef-8026-5fb8855bf8d6';

AWS.config.update({
  region: bucketRegion,
  credentials: new AWS.CognitoIdentityCredentials({
    IdentityPoolId: IdentityPoolId
  })
});


var s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  params: {
    Bucket: albumBucketName
  }
});

function listAlbums() {
  s3.listObjects({
    Delimiter: '/'
  }, function (err, data) {
    if (err) {
      return alert('There was an error listing your albums: ' + err.message);
    } else {
      console.log('앨범', data.CommonPrefixes)
      var albums = data.CommonPrefixes.map(function (commonPrefix) {
        var prefix = commonPrefix.Prefix;
        var albumName = decodeURIComponent(prefix.replace('/', ''));
        return getHtml([
          '<li>',
          '<span onclick="deleteAlbum(\'' + albumName + '\')">X</span>',
          '<span onclick="viewAlbum(\'' + albumName + '\')">',
          albumName,
          '</span>',
          '</li>'
        ]);
      });
      var message = albums.length ?
        getHtml([
          '<p>Click on an album name to view it.</p>',
          '<p>Click on the X to delete the album.</p>'
        ]) :
        '<p>You do not have any albums. Please Create album.';
      var htmlTemplate = [
        '<h2>Albums</h2>',
        message,
        '<ul>',
        getHtml(albums),
        '</ul>',
        '<button onclick="createAlbum(prompt(\'Enter Album Name:\'))">',
        'Create New Album',
        '</button>'
      ]
      document.getElementById('app').innerHTML = getHtml(htmlTemplate);
    }
  });
}

function createAlbum(albumName) {
  albumName = albumName.trim();
  if (!albumName) {
    return alert('Album names must contain at least one non-space character.');
  }
  if (albumName.indexOf('/') !== -1) {
    return alert('Album names cannot contain slashes.');
  }
  var albumKey = encodeURIComponent(albumName) + '/';
  s3.headObject({
    Key: albumKey
  }, function (err, data) {
    if (!err) {
      return alert('Album already exists.');
    }
    if (err.code !== 'NotFound') {
      return alert('There was an error creating your album: ' + err.message);
    }
    s3.putObject({
      Key: albumKey
    }, function (err, data) {
      if (err) {
        return alert('There was an error creating your album: ' + err.message);
      }
      alert('Successfully created album.');
      viewAlbum(albumName);
    });
  });
}

function viewAlbum(albumName) {
  var albumPhotosKey = encodeURIComponent(albumName) + '/';
  s3.listObjects({
    Prefix: albumPhotosKey
  }, function (err, data) {
    if (err) {
      return alert('There was an error viewing your album: ' + err.message);
    }
    // 'this' references the AWS.Response instance that represents the response
    var href = this.request.httpRequest.endpoint.href;
    var bucketUrl = href + albumBucketName + '/';
    console.log('앨범', data.Contents)

    var photos = data.Contents.map(function (photo) {
      var photoKey = photo.Key;
      var photoUrl = bucketUrl + encodeURIComponent(photoKey);
      return getHtml([
        '<span>',
        '<div>',
        '<img style="width:128px;height:128px;" src="' + photoUrl + '"/>',
        photoUrl,
        '</div>',
        '<div>',
        '<span onclick="deletePhoto(\'' + albumName + "','" + photoKey + '\')">',
        'X',
        '</span>',
        '<span>',
        photoKey.replace(albumPhotosKey, ''),
        '</span>',
        '</div>',
        '</span>',
      ]);
    });
    var message = photos.length ?
      '<p>Click on the X to delete the photo</p>' :
      '<p>You do not have any photos in this album. Please add photos.</p>';
    var htmlTemplate = [
      '<h2>',
      'Album: ' + albumName,
      '</h2>',
      message,
      '<div>',
      getHtml(photos),
      '</div>',
      '<input id="photoupload" type="file" accept="image/*">',
      '<button id="addphoto" onclick="addPhoto(\'' + albumName + '\')">',
      'Add Photo',
      '</button>',
      '<button onclick="listAlbums()">',
      'Back To Albums',
      '</button>',
    ]
    document.getElementById('app').innerHTML = getHtml(htmlTemplate);
  });
}

function addPhoto(albumName) {
  var files = document.getElementById('photoupload').files;
  if (!files.length) {
    return alert('Please choose a file to upload first.');
  }
  var file = files[0];
  var fileName = file.name;
  var albumPhotosKey = encodeURIComponent(albumName) + '/';

  var photoKey = albumPhotosKey + fileName;
  s3.upload({
    Key: photoKey,
    Body: file,
    ACL: 'public-read'
  }, function (err, data) {
    if (err) {
      console.log(err)
      return alert('There was an error uploading your photo: ', err.message);
    }
    alert('Successfully uploaded photo.');
    viewAlbum(albumName);
  });
}

function deletePhoto(albumName, photoKey) {
    var deleteOk = prompt('정말로 삭제하시겠습니까?');
    if(deleteOk) {
        s3.deleteObject({
          Key: photoKey
        }, function (err, data) {
          if (err) {
            return alert('There was an error deleting your photo: ', err.message);
          }
          alert('Successfully deleted photo.');
          viewAlbum(albumName);
        });
    }
}

function deleteAlbum(albumName) {
    var deleteOk = prompt('정말로 삭제하시겠습니까?');
    if(deleteOk) {
        var albumKey = encodeURIComponent(albumName) + '/';
        s3.listObjects({
          Prefix: albumKey
        }, function (err, data) {
          if (err) {
            return alert('There was an error deleting your album: ', err.message);
          }
          var objects = data.Contents.map(function (object) {
            return {
              Key: object.Key
            };
          });
          s3.deleteObjects({
            Delete: {
              Objects: objects,
              Quiet: true
            }
          }, function (err, data) {
            if (err) {
              return alert('There was an error deleting your album: ', err.message);
            }
            alert('Successfully deleted album.');
            listAlbums();
          });
        });
    }
}

/** 관리자 화면에서 S3 업로드 기능추가 */
function ImgfileUpload(name) {
  var names = window.location.search.split("=")[1] + "IMG";
  if (name === "update") {
    var files = document.getElementById("inputGroupFile03").files;
  } else {
    var files = document.getElementById("inputGroupFile02").files;
  }
  if (!files.length) {
    return alert("Please choose a file to upload first.");
  }

  // var names = window.location.search.split("=")[1] + "IMG";
  // if (name === "update") {
  //   var files = document.getElementById("inputGroupFile03").files;
  // } else if(name === "updateorigin"){
  //   var files = document.getElementById("inputGroupFile02").files;
  // }
  // if (name === "update2") {
  //   var files = document.getElementById("inputGroupFile05").files;
  // } else if(name === "update2origin"){
  //   var files = document.getElementById("inputGroupFile04").files;
  // }



  var file = files[0];
  var fileName = file.name;
  var albumPhotosKey = encodeURIComponent(names) + "/";

  var photoKey = albumPhotosKey + fileName;

  s3.upload(
    {
      Key: photoKey,
      Body: file,
      ACL: "public-read",
    },
    function (err, data) {
      if (err) {
        console.log(err);
        return alert("There was an error uploading your photo: ", err.message);
      }
      console.log(data);
      if (name === "update") {
        $("#updateImage").val(data.Location);
        $("#inputGroupFile03Img").attr("src", data.Location);
      } else {
        $("#formGroupExampleInput5").val(data.Location);
        $("#inputGroupFile02Img").attr("src", data.Location);
      }
      alert("Successfully uploaded photo.");
      viewAlbum(names);

      // if (name === "update2") {
      //   $("#updateSI").val(data.Location);
      //   $("#inputGroupFile05Img").attr("src", data.Location);
      // } else {
      //   $("#formGroupExampleInput6").val(data.Location);
      //   $("#inputGroupFile04Img").attr("src", data.Location);
      // }
      // alert("Successfully uploaded photo.");
      // viewAlbum(names);

    }
  );


}

function ImgfileUpload2(name) {
  var names = window.location.search.split("=")[1] + "IMG";
  if (name === "update") {
    var files = document.getElementById("inputGroupFile05").files;
  } else {
    var files = document.getElementById("inputGroupFile04").files;
  }

  //66:라벨, 인풋 , 04: 이미지띄우는 - 등록하기  //updateSI, 05: -수정하기
  if (!files.length) {
    return alert("Please choose a file to upload first.");
  }

  var file = files[0];
  var fileName = file.name;
  var albumPhotosKey = encodeURIComponent(names) + "/";

  var photoKey = albumPhotosKey + fileName;

  s3.upload(
    {
      Key: photoKey,
      Body: file,
      ACL: "public-read",
    },
    function (err, data) {
      if (err) {
        console.log(err);
        return alert("There was an error uploading your photo: ", err.message);
      }
      console.log(data);
      if (name === "update") {
        $("#updateSI").val(data.Location);
        $("#inputGroupFile05Img").attr("src", data.Location);
      } else {
        $("#formGroupExampleInput66").val(data.Location);
        $("#inputGroupFile04Img").attr("src", data.Location);
      }
      //등록하기
      alert("Successfully uploaded photo.");
      viewAlbum(names);

    }
  );


}

