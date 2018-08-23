# pilgrimage
A guidebook for movie/TV lovers to travel and make pilgrimage to the places where the movies/TV series they love were filmed.

The project needs a **Cloudinary**(image/video storage in cloud) account to store images and a **mlab**(mongodb in cloud) account to store data. Also, the credentials for **Google Maps API** is needed.

Before starting, set environment variables.
You could either set them in command line or create an **.env** file and save lines below to it
```
GEOCODER_API_KEY=<YOUR_GOOGLE_MAPS_API_KEY>
DATABASEURL=<YOUR_mlab_URL>
CLOUDINARY_API_KEY=<YOUR_CLOUDINARY_API_KEY>
CLOUDINARY_API_SECRET=<YOUR_CLOUDINARY_API_SECRET>
```

In `views/matches/map.ejs`, change the key after `key=` on line 38 to your restricted Google Maps API credential.
