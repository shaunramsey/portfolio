// "Interactive Volumetric Shadows in Participating Media with Single-Scattering"
// (Chris Wyman and Shaun Ramsey)
// (Proceedings of the 2008 IEEE Symposium on Interactive Ray Tracing)
//
// Creates a texture for reducing the computations in an airlight model shader.
//   This texture stores precompted airlight, based upon a cosine of the angle
//   between light and view rays (cos gamma from the Sun et al 2005 SIGGRAPH paper) 
//   and the distance from the eye to the fragment (or any other location to 
//   compute the fog computation).
//
// The idea is to reduce the computation to this:
//   vec3 toLight     = normalize( eyeSpaceLightPos.xyz );
//   vec3 toFrag      = normalize( eyeSpaceFragPos.xyz  );
//   float cosGamma   = dot( toLight, toFrag );
//   float distance   = length( eyeSpaceFragPos.xyz );
//   float fogContrib = resultTex( 0.5*cosGamma+0.5, distance/distMax ) - 
//                      resultTex( 0.5*cosGamma+0.5, 0 );
//
// Where resultTex is the texture resulting from this shader.  Given that eyeSpaceLightPos 
//   is constant over a frame, this dramatically reduces computations, especially when ray
//   marching, where the texture computations must be done 20, 40, or more times each pixel.
//   With this approach, extra steps on the ray require updating the distance and doing one
//   additional texture lookup.
//
// X coordinate (or S or U) varies based on cos(gamma), ranging at X=0 from cos(gamma) = -1 to
//   cos(gamma) = 1 at X=1
// Y coordinage (or T or V) varies based on distance from eye to the location where fog 
//   calculations are occuring.  At Y=0, the distance from the eye is 0.  At Y=1, the distance
//   is distMax (an input to this shader), typically the far plane.
//

uniform sampler2D fTex;       // Input F texture (we use one provided by Sun et al)
uniform vec4 fTexRange;       // Ranges specified in F downloaded texture

uniform float extinctionCoef; // The scattering coefficient K_s in the paper.
uniform float distMax;        // The maximum distance you'll need fog (say, on the far plane)
uniform vec2 imageSize;       // Output rendering size in pixels.
uniform vec3 lightPos;        // The eye space light position for this frame

void main( void )
{
  // Determine which pixel in the F' texture we'll be computing below
	vec2 pos = gl_FragCoord.xy / imageSize; 

	// Calculate distance data
	float distToLight = length( lightPos );
	float distToFrag  = pos.y * distMax;

	// Compute the angle variation
	float cosGamma = 2*pos.x - 1;
	float sinGamma = sqrt( 1 - cosGamma*cosGamma );
	float gamma_2 = 0.5*atan( sinGamma, cosGamma );

	// Compute T values
	float T_sv = extinctionCoef * distToLight; 
	float T_vp = extinctionCoef * distToFrag;  
	
	// Compute A values
	float A_0  = extinctionCoef * exp( -T_sv * cosGamma ) / ( 6.283185307 * distToLight * sinGamma );
	float A_1 = T_sv * sinGamma;
	
	// Compute the F value from the airlight texture / integral
	float v_frag = ( gl_FragCoord.y < 1 ? gamma_2 : 0.7853981634 + 0.5 * atan( (T_vp - T_sv*cosGamma)/A_1 ) );
	float f_frag  = texture2D( fTex, vec2( 1 - A_1/fTexRange.y, 1 - v_frag/fTexRange.w ) );

	// Output the result
	gl_FragColor = A_0 * f_frag;
}
