#version 300 es
// this code runs on glsl.app
// - an adaptation of my instanced work that began with https://www.shadertoy.com/view/XsB3Rm from "gltracy" as the code base
// however, I've nuked the cube map for a 2d texture  - wasn't sure how to load a cubemap there

////implements raymarching for terrain generation


// math
precision highp float;
// math
const float PI = 3.14159265359;
const float DEG_TO_RAD = PI / 180.0;
const float stop_threshold = 0.001;
uniform sampler2D u_tex[16];
uniform vec2 u_tex0Resolution;
const float max_depth = 50.0;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;

in vec2 uv;
out vec4 fragColor;

// Octahedron SDF - https://iquilezles.org/articles/distfunctions/
float sdOctahedron(vec3 p, float s) {
    p = abs(p);
    return (p.x+p.y+p.z-s)*0.57735027;
}


// Custom gradient - https://iquilezles.org/articles/palettes/
vec3 palette(float t) {
    return .5+.5*cos(6.28318*(t+vec3(.3,.416,.557)));
}


//2d rotation matrix
mat2 rot(float angle) {
return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
}


float sphereSDF(vec3 p, float r) {
  return length(p) - r;
}

float spherecSDF(vec3 p, vec3 c, float r) {
  return length(p-c) - r;
}

float boxSDF( vec3 p , vec3 b ) {
 p.xz *= rot(u_time);
 p.xy *= rot(u_time*0.2);
 vec3 d = abs(p) - b;
  
 float sd = min(max(d.x,max(d.y,d.z)),0.0) + length(max(d,0.0));
 return sd;
}

float sdUnion_s( float a, float b, float k ) {
    float h = clamp( 0.5+0.5*(b-a)/k, 0.0, 1.0 );
    return mix( b, a, h ) - k*h*(1.0-h);
}



float sceneSDF(vec3 p) {
  vec3 q = p;
  p.xy *= rot(u_time*0.2);
  p.z += u_time*0.3;
  q.x = fract(p.x) - 0.5;     // spacing: 1
  q.y = fract(p.y) - 0.5;
  q.z = fract(p.z) - 0.5;// fract(p.z) - 0.5; // + u_time - 0.5; // fract(p.z) - .5; // spacing: .25
  
  float sf = 1.5;
  
  
  float s1 =  sphereSDF(q, 0.2*sf);
  float b1 = boxSDF(q, vec3(0.15*sf));
  float vm = 0.35*sin(u_time*0.7);
  float v1 = spherecSDF(q, vec3(0.0,vm*sf,0.0), 0.1*sf);
  float s3 = sphereSDF(q, 0.18*sf);
  float s4 = spherecSDF(q, vec3(0.0,-vm*sf,0.0), 0.1*sf);
  //float s2 = sdUnion_s(spherecSDF(q, vec3(0.0, vm*0.1, 0.0), 0.15), max(s1,b1), 0.2);
  float s2 = sdUnion_s(s4, sdUnion_s(v1, max(max(s1,b1), -s3), 0.2), 0.2);
  
  return s2;
  
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
		vec3 light_pos   = vec3( 20.0, 20.0, 20.0 );
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
		vec3 light_pos   = vec3( -20.0, -20.0, -30.0 );
		vec3 light_color = vec3( 0.5, 0.7, 1.0 );
	
		vec3 vl = normalize( light_pos - v );
	
		vec3 diffuse  = Kd * vec3( max( 0.0, dot( vl, n ) ) );
		vec3 specular = vec3( max( 0.0, dot( vl, ref ) ) );
        
        vec3 F = fresnel( Ks, normalize( vl - dir ), vl );
		specular = pow( specular, vec3( shininess ) );
		
		final += light_color * mix( diffuse, specular, F );
	}
    vec4 tex = texture(u_tex[0], ref.xy);
    final += tex.xyz* fresnel( Ks, n, -dir); // texture( iChannel0, ref ).rgb * fresnel( Ks, n, -dir );
    //final = texture(iChannel0, ref).rgb;
	return final;
}

float march(vec3 eye, vec3 viewRayDirection, inout float depth, inout vec3 n) {
    float start = 0.0;
    float end = max_depth;
    depth = start;
    for(int i = 0; i < 512; i++) 
    {
        vec3 v = eye + viewRayDirection*depth;
       
        float dist = sceneSDF(v);
        if(dist < stop_threshold) {
          n = normalize( gradient(eye + viewRayDirection*depth));
          return depth;
        }
        depth += min(abs(dist),0.2);
        if(depth >= end) { return end; }
     }
    return end;
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


void main() // out vec4 fragColor, in vec2 fragCoord )
{
    // Normalized pixel coordinates (from 0 to 1)
    //vec2 uv =  gl_FragCoord.xy/u_resolution.xy;
    //uv *= rot(iTime*0.001);

    // Time varying pixel color
    //vec3 col = 0.5 + 0.5*cos(iTime+uv.xyx+vec3(0,2,4));
    vec3 dir = ray_dir( 45.0, u_resolution.xy,  gl_FragCoord.xy);
    float depth = 0.0;
    vec3 n; // the normal
    vec3 eye = vec3(0.0, 0.0, 3.5);
   
    mat3 rot = rotationXY( ( u_mouse.xy - u_resolution.xy * 0.5 ).yx * vec2( 0.01, -0.01 ) );
	dir = rot * dir;
	eye = rot * eye;
    
    
    march(eye, dir, depth, n);
    if(depth >= max_depth) {    // Output to screen
      //fragColor = texture(u_tex[0], dir.xy);
      fragColor = vec4(1.0, 0.0, 0.0, 1.0);
      fragColor = texture(u_tex[0], dir.xy);
      //fragColor = vec4(depth,depth,0.0,1.0);
    } else {
      vec3 pos = eye + dir * depth;
      vec3 col = shading(pos,n,dir,eye); 
      fragColor = vec4( pow(col, vec3(1.0/1.2)), 1.0); //vec4(1.0,1.0,1.0,1.0);
      
    }
    
    
}

// precision highp float;
// precision highp sampler2D;

// in vec2 uv;
// out vec4 out_color;

// uniform vec2 u_resolution;
// uniform float u_time;
// uniform vec4 u_mouse;
// uniform sampler2D u_textures[16];

// void main(){
//     vec2 st = (2. * uv - 1.) * vec2(u_resolution.x / u_resolution.y, 1.);

//     vec2 mouse = u_mouse.xy / u_resolution;

//     out_color = vec4(
//         0.5 * sin(u_time) + 0.5, 
//         abs(st), 
//         1.
//     );

//     out_color = texture(u_textures[0], st);
// }