const float PI = 3.14159265359;
const float DEG_TO_RAD = PI / 180.0;
const float stop_threshold = 0.001;

const vec3 light1pos = vec3( 20.0, 20.0, 20.0 );
const vec3 light2pos = vec3( -20.0, -20.0, -30.0 );
//distance to a sphere from a point p - sphere at the origin with radius r
float sphereSDF(vec3 p, float r) {
  return length(p) - r;
}
//a sphere with a center
float spherecSDF(vec3 p, vec3 c, float r) {
  return length(p-c) - r;
}
float boxSDF( vec3 p , vec3 b ) {
 vec3 d = abs(p) - b;
 return min(max(d.x,max(d.y,d.z)),0.0) + length(max(d,0.0));
}
float sdUnion_s( float a, float b, float k ) {
    float h = clamp( 0.5+0.5*(b-a)/k, 0.0, 1.0 );
    return mix( b, a, h ) - k*h*(1.0-h);
}
float sceneSDF(vec3 p) {
  float s1 =  sphereSDF(p, 0.8);
  float b1 = boxSDF(p, vec3(0.6));
  float delta = min(abs(sin(iTime)),0.7);
  float s2 = sphereSDF(p, delta);
  float place = sin(iTime*1.3);
  float place2 = sin(iTime*0.3);
  float s3 = spherecSDF(p, vec3(0.0, place*2.0, 0.0), 0.5);
  float s4 = spherecSDF(p, vec3(place2*2.1, 0.0, 0.0), 0.6);
  float ret =  sdUnion_s(sdUnion_s(max(max(s1,b1) , -s2), s3, 0.3), s4, 0.8);
  float v = 20.0;
  ret = sdUnion_s(ret, spherecSDF(p, light1pos, 1.0), 0.5);
  ret = sdUnion_s(ret, spherecSDF(p, light2pos, 1.0), 0.5);
  
  return ret;
}
// get gradient in the world
vec3 gradient( vec3 pos ) {
    const float grad_step = 0.02;
	const vec3 dx = vec3( grad_step, 0.0, 0.0 );
	const vec3 dy = vec3( 0.0, grad_step, 0.0 );
	const vec3 dz = vec3( 0.0, 0.0, grad_step );
	return normalize (
		vec3(
			sceneSDF( pos + dx ) - sceneSDF( pos - dx ),
			sceneSDF( pos + dy ) - sceneSDF( pos - dy ),
			sceneSDF( pos + dz ) - sceneSDF( pos - dz )			
		)
	);
}
vec3 fresnel( vec3 F0, vec3 h, vec3 l ) {
	return F0 + ( 1.0 - F0 ) * pow( clamp( 1.0 - dot( h, l ), 0.0, 1.0 ), 5.0 );
}
// phong shading
vec3 shading( vec3 v, vec3 n, vec3 dir, vec3 eye ) {
	// ...add lights here...
	
	float shininess = 16.0;
	
	vec3 final = vec3( 0.0 );
	
	vec3 ref = reflect( dir, n );
    
    vec3 Ks = vec3( 0.5 );
    vec3 Kd = vec3( 1.0 );
	
	// light 0
	{
		vec3 light_pos   = light1pos; 
		vec3 light_color = vec3( 1.0, 0.7, 0.7 );
	
		vec3 vl = normalize( light_pos - v );
	
		vec3 diffuse  = Kd * vec3( max( 0.0, dot( vl, n ) ) );
		vec3 specular = vec3( max( 0.0, dot( vl, ref ) ) );
		
        vec3 F = fresnel( Ks, normalize( vl - dir ), vl );
		specular = pow( specular, vec3( shininess ) );
		
		final += light_color * mix( diffuse, specular, F ); 
	}
	
	// light 1
	{
		vec3 light_pos   = light2pos;
		vec3 light_color = vec3( 0.5, 0.7, 1.0 );
	
		vec3 vl = normalize( light_pos - v );
	
		vec3 diffuse  = Kd * vec3( max( 0.0, dot( vl, n ) ) );
		vec3 specular = vec3( max( 0.0, dot( vl, ref ) ) );
        
        vec3 F = fresnel( Ks, normalize( vl - dir ), vl );
		specular = pow( specular, vec3( shininess ) );
		
		final += light_color * mix( diffuse, specular, F );
	}

    final += texture( iChannel0, ref ).rgb * fresnel( Ks, n, -dir );
    
	return final;
}

const float end = 3000.0;
float march(vec3 eye, vec3 viewRayDirection, inout float depth, inout vec3 n) {
    float start = 0.0;
    depth = start;
    for(int i = 0; i <512; i++) 
    {
        vec3 v = eye + viewRayDirection*depth;
        float dist = sceneSDF(v);
        if(dist < stop_threshold) {
          n = normalize( gradient(eye + viewRayDirection*depth));
          return depth;
        }
        depth += (abs(dist));
        if(depth >= end) { return end; }
     }
    return end;
}
//vec3(0.64,0.49,0.87);
vec4 noiseColor(float t) {
  return texture(iChannel1, vec2(t,0.0));
}


//-bottom - the closer this is to 0, the more of a 'splat' it will make instead of blending in.
//-uvmov uv scaled by a mix with its distance: mix(uv,uvd,-0.4)
// a value like -12.0 would put the orb at a big distance and stick with the camera rather at a
// constant distance. having a variety amongst ghosts will give some depth to the ghosts
//- pos should be the screenspace pos of the light
//- scale - rgb - this scales the pos of each channel which shifts r/g/b spectrum
//- scalePower - take the length of uvmov+scaled pos to the power of scalePower
// effect: how big do you want your ghost to be?
//multiplier - rgb - strengthen the effects of all channels--make some ghosts dimmer/brighter
// or richer in r g or b than another

vec3 ghost(float bottom, vec2 uvmov, vec3 scale, vec2 pos, float scalePower, vec3 multiplier) {
    float r = max(bottom - pow( length(uvmov+scale.x*pos), scalePower), 0.0) * multiplier.x;
    float g = max(bottom - pow( length(uvmov+scale.y*pos), scalePower), 0.0) * multiplier.y;
    float b = max(bottom - pow( length(uvmov+scale.z*pos), scalePower), 0.0) * multiplier.z;
    return vec3(r,g,b);
}


//some of the starts of this are from musk's flare mod
//https://www.shadertoy.com/view/4sX3Rs

//uv is the screen coords of this pixel
//pos is the position of the light 
//sometimes we pass these in scaled to get different values

//LIGHT_SIZE - smaller is bigger - this is a division in f0
// try 12, or 16
#define FULL_LIGHT_SCALE 16.0
//exponent on the light's halo power, higher is 'diminished' wash out
//try 2.0 and 3.0
#define LIGHT_HALO_SIZE 2.0
//LIGHT_HALO_SIZE - bigger here means more 'washing out' of the scene
//try 0.4 and 0.6
#define LIGHT_CIRCLE_SCALE 0.4
//it is worth nothing that these three above settings work together
//TODO: turn these all into a single dial connected to one another

// how prominent are the spokes - 0 to wash them out
//try 0.05, 0.1, and 0.2 
#define LIGHT_SPOKE 0.2
#define NUMBER_OF_SPOKES 12.0
//how much glowy do we want the light to exhibit naturally
//try 0.4, 0.6 and 0.8
#define LIGHT_AMBIENCE 0.8

#define CHROMATIC_SPIKES false
// lower this to get more individually colored spikes - raise it to get 'bands'
// this will end up working somewhat in concert with number of spokes
#define CHROMATIC_SPIKE_VARIATION 2.0
//0 turns off the rotation of the chromatics
#define CHROMATIC_TIME_DEPENDENCY 0.1

vec3 lensflare(vec2 uv, vec2 pos, out vec3 lightflare, out vec3 lensflare)
{
	vec2 main = uv-pos; //a vector that points at this particular fragment
    //uv = (uv - 0.5)*1.5;
    //pos = (pos - 0.5)*1.5;
	vec2 uvd = uv*(length(uv)); // scaled by distance

	float angle = atan(main.y, main.x); //the angle of this fragment
	float dist = length(main); //how far away is this pixel from the light
    dist = pow(dist, 0.1); //scale the distance down


    //float n = noise(vec2((ang-iTime/18.0)*16.0,dist*32.0));

	float f0li = 1.0/(length(main) * FULL_LIGHT_SCALE+1.0);
	f0li = pow(f0li, LIGHT_HALO_SIZE) * LIGHT_CIRCLE_SCALE;

	//f0 = f0 + f0 *(sin((ang+1.0/18.0)*12.0)*.1 + dist * 0.1 + 0.8);
    float f0 = f0li * (sin((angle+0.1)*NUMBER_OF_SPOKES)*LIGHT_SPOKE + LIGHT_AMBIENCE);
    //f0 = f0+f0*(sin((ang+iTime/18.0 + noise(abs(ang)+n/2.0)*2.0)*12.0)*.1+dist*.1+.8);
    
    
    //f2 is the distance half reflection you'd get
    //TODO modularize these edge highlights and give handles to control their look and feel
	float f2 = max(1.0/(1.0+32.0*pow(length(uvd+0.8*pos),2.0)),.0)*0.25;
	float f22 = max(1.0/(1.0+32.0*pow(length(uvd+0.85*pos),2.0)),.0)*0.23;
	float f23 = max(1.0/(1.0+32.0*pow(length(uvd+0.9*pos),2.0)),.0)*0.21;


   //vec3 ghost(float bottom, vec2 uvmov, vec3 scale, vec2 pos, float scalePower, vec3 multiplier) {
    vec3 orb2 = vec3(0.0);
    orb2 = ghost(0.01, mix(uv,uvd,-0.4), vec3(0.4, 0.45, 0.5), pos, 2.4, vec3(5.0,5.0,3.0));    
    vec3 orb3 = vec3(0.0);
    orb3 = ghost(0.01, mix(uv,uvd,-0.4), vec3(0.2, 0.4, 0.6), pos, 3.5, vec3(2.0,2.0,2.0));
    vec3 orb4 = vec3(0.0);
    orb4 = ghost(0.01, mix(uv,uvd,-0.5), vec3(-0.85, -0.9, -0.95), pos, 1.6, vec3(6.0, 3.0, 5.0));
    vec3 orb5 = vec3(0.0);
    orb5 = ghost(0.01, mix(uv,uvd,-0.1), vec3(.8, .9, 1.0), pos, 1.3, vec3(2.0, 2.0, 2.0));
    
    if(CHROMATIC_SPIKES)  {
      lightflare = texture(iChannel1, vec2( (angle+0.1+iTime*CHROMATIC_TIME_DEPENDENCY)/(2.0*PI*CHROMATIC_SPIKE_VARIATION+0.1), 0.5)).rgb * f0 + vec3(f0li);
    }
    else {
      lightflare = vec3(f0+f0li);
    }
    
    
    lensflare = orb2 + orb3 + orb4 + orb5 + vec3(f2,f22,f23);

	return lightflare+lensflare;
}



vec3 ray_dir(float fov, vec2 size, vec2 pos) {
 vec2 xy = pos - size * 0.5;
 float cot_half_fov = tan( ( 90.0 - fov * 0.5 ) * DEG_TO_RAD );	
 float z = size.y * 0.5 * cot_half_fov;	
 return normalize( vec3( xy, -z ) );
}

// camera rotation : pitch, yaw
mat3 rotationXY( vec2 angle ) {
	vec2 c = cos( angle );
	vec2 s = sin( angle );
	
	return mat3(
		c.y      ,  0.0, -s.y,
		s.y * s.x,  c.x,  c.y * s.x,
		s.y * c.x, -s.x,  c.y * c.x
	);
}



void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = fragCoord/iResolution.xy;

    // Time varying pixel color
    //vec3 col = 0.5 + 0.5*cos(iTime+uv.xyx+vec3(0,2,4));
    vec3 dir = ray_dir( 90.0, iResolution.xy, fragCoord.xy);
    float depth = 3.0;
    vec3 n; // the normal
    vec3 origEyePos = vec3(0.0, 0.0 ,3.5);
    vec3 eye = origEyePos;
    vec2 rotmouse = iMouse.xy;
    rotmouse.x = -200.0;
    rotmouse.y = 320.0 + sin(iTime*0.25)*200.0;
    mat3 rot = rotationXY( ( rotmouse - iResolution.xy * 0.5 ).yx * vec2( 0.01, -0.01 ) );
    //rot = mat3(1.0, 0.0, 0.0,0.0, 1.0, 0.0,	0.0, 0.0, 1.0);
    //rot = rotationXY( vec2(30.0, 300.0) * vec2(0.01, 0.01) );
	dir = rot * dir;
	eye = rot * eye;
    
    vec3 lightloc = light1pos;
    lightloc = lightloc * rot;
    vec3 lightlocoff = lightloc -  origEyePos; // transpose(rot)*(lightloc-eye);
    float ratio = iResolution.x / iResolution.y;
    vec2 p = vec2(lightlocoff.x / ratio, lightlocoff.y) / lightlocoff.z;
    vec2 screen = vec2(-p.x, -p.y)*0.5 + 0.5;
    // lightloc = eye + t*dir;
    #define DTEST false
    #define DEBUG false
    march(eye, dir, depth, n);
    if(DEBUG) { //lil yellow dot for the light1pos...
     if(dot( normalize(dir), normalize(light1pos)) > 0.0 && length(uv-screen) < 0.005) {
        fragColor = vec4(1.0, 1.0, 0.0, 1.0);
     }
     else if(DTEST) { 
         fragColor =  vec4(  vec3( dot( normalize(dir), normalize(light1pos)) ), 1.0);
     }
    }
    else if(depth >= end-1.0) {    // Output to screen
      fragColor = vec4(0.0); //texture(iChannel0, dir);
      //fragColor = vec4(depth,depth,0.0,1.0);
    } else {
      vec3 pos = eye + dir * depth;
      vec3 col = shading(pos,n,dir,eye); 
      fragColor = vec4( pow(col, vec3(1.0/1.2)), 1.0); //vec4(1.0,1.0,1.0,1.0);
      
    }
    
    //uv.x *= ratio;
    uv = uv;
    screen = screen ;
    vec3 lightflare, orbflare;
    vec2 flarepos = uv - 0.5;
    vec2 screenpos = screen - 0.5;
    vec3 flare = lensflare(flarepos, screenpos, lightflare, orbflare);
    vec3 col = vec3(0.0);
    vec3 light1 = vec3(0.0);
    //vec3 suncolor = vec3(0.643, 0.494, 0.867);
    vec3 light1color = vec3(1.0, 0.7, 0.7 );
    light1 += (flare)*light1color*2.0;
    col += light1; 
    col = pow(col, vec3(0.4));
   
     //for only ray marched scene just comment below
     if(lightlocoff.z < 0.0) {
        fragColor += vec4(col, 1.0);
     }
    //fragColor.g += clamp(lightlocoff.z, 0.0, 1.0);
    //fragColor = vec4(col, 1.0);    //debug the flare or see the flare alone
}