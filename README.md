# Portfolio of Fun Renders

These are just fun images/animations from different renders throughout the years. The concept of fun or interesting applies to me - so your mileage may vary. I'll do my best to contextualize their creation.

March 2025
 Played around with raymarching and fragment shaders today. Produced some fun images. I find it really neat that this uses a single signed distance function which is is simply a composite of other signed distance functions. min/max and some smoothing is all you need. I used shadertoy to produce these images via a fragment shader. I did not fine tune the depth (although perhaps it does not need it?). I borrowed from [here](https://www.shadertoy.com/view/XsB3Rm) a bit in my code. You can see the [fragment shader](raymarch/raymarchshader.frag)


<img src="raymarch/raymarchimage.png" width="200"> <img src="raymarch/raymarchimage2.png" width="200">


2008. I worked on Interactive Volumentric Shadow in Participating Media with Chris Wyman in 2008. In this work we used ray marching between shadow volume slices to get those beautiful god rays in participating media. Our results looked so very close to ray traced results. The shader is quite straight forward: [fragment shader](volumetricshadows/shader.frag.glsl)

<img src="volumetricshadows/rtshadow.png" width="200">



Old Work early 2000s - Largely Fun Course Work - But work that has stuck with me.

Terrain Compression Using Wavelets. The left image is the original and the right uses 5% of the coefficients. More at: [my page](http://shaunramsey.com/research/waveletterraincompression/)

<img src="wavelets/orig.jpg"> <img src="wavelets/cubic5.jpg">

Some Image Compression. Left is DCT, Middle is HAAR, and Right is Linear B-Spline. The Wasatch is a beautiful backdrop for this, but I'm not sure of the source of the original image at this point. RMSE is about 3 at this level and storage is about 11061 bytes (without other compression techniques) vs raw 65336 bytes. There's some fuzzy math going on there, but you get the gist! More at [my page](http://shaunramsey.com/research/waveletimagecompression/)

<img src="wavelets/dct5.jpg"> <img src="wavelets/haar5.jpg"> <img src="wavelets/lbs5.jpg">


Ray Tracing with BRDFs using Ashikhmin's anisotropic phong BRDF. For this section and the next, you can see my progress of building up the renderer at [my pages](http://shaunramsey.com/research/imagesynth) along with lots more test values. These images were done as a study in an image synthesis course with Peter Shirley.

<img src="brdf/brdf1.gif"> <img src="brdf/brdf2.gif">


Photon Mapping with ray traced images using 100 rays per pixel.

In order these are: 1x1 Texels w/ 100k photons, 10x10 Texels with 100k photons and 200x200 Texels with 100m photons.

<img src="photonmapping/1.gif"> <img src="photonmapping/2.gif"> <img src="photonmapping/10m.gif">


