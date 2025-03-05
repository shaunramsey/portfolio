////shader.txt for fragment shader on toyshader
////implements raymarching for terrain generation

// math
const float PI = 3.14159265359;
const float DEG_TO_RAD = PI / 180.0;
const float stop_threshold = 0.001;

float sphereSDF(vec3 p, float r) {
  return length(p) - r;
}

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
  return sdUnion_s(sdUnion_s(max(max(s1,b1) , -s2), s3, 0.3), s4, 0.8);
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

    final += texture( iChannel0, ref ).rgb * fresnel( Ks, n, -dir );
    
	return final;
}

float march(vec3 eye, vec3 viewRayDirection, inout float depth, inout vec3 n) {
    float start = 0.0;
    float end = 20.0;
    depth = start;
    for(int i = 0; i < 128; i++) 
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
void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = fragCoord/iResolution.xy;

    // Time varying pixel color
    //vec3 col = 0.5 + 0.5*cos(iTime+uv.xyx+vec3(0,2,4));
    vec3 dir = ray_dir( 90.0, iResolution.xy, fragCoord.xy);
    float depth = 3.0;
    vec3 n; // the normal
    vec3 eye = vec3(0.0, 0.0, 3.5);
    mat3 rot = rotationXY( ( iMouse.xy - iResolution.xy * 0.5 ).yx * vec2( 0.01, -0.01 ) );
	dir = rot * dir;
	eye = rot * eye;
    
    
    march(eye, dir, depth, n);
    if(depth >= 9.9) {    // Output to screen
      fragColor = texture(iChannel0, dir);
      //fragColor = vec4(depth,depth,0.0,1.0);
    } else {
      vec3 pos = eye + dir * depth;
      vec3 col = shading(pos,n,dir,eye); 
      fragColor = vec4( pow(col, vec3(1.0/1.2)), 1.0); //vec4(1.0,1.0,1.0,1.0);
      
    }
    
    
}