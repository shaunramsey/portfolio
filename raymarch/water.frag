//water.frag
//  return normalize( vec3( terrainH(pos.xz-eps.xy) - terrainH(pos.xz+eps.xy), 2.0*eps.x, terrainH(pos.xz-eps.yx) - terrainH(pos.xz+eps.yx) ) );

//hash from https://www.shadertoy.com/view/XsXfRH
float hash( ivec3 p )    // this hash is not production ready, please
{                        // replace this by something better

    // 3D -> 1D
    int n = p.x*3 + p.y*113 + p.z*311;

    // 1D hash by Hugo Elias
	n = (n << 13) ^ n;
    n = n * (n * n * 15731 + 789221) + 1376312589;
    return -1.0+2.0*float( n & 0x0fffffff)/float(0x0fffffff);
}

// noise and derivs from: https://www.shadertoy.com/view/XsXfRH
// return value noise (in x) and its derivatives (in yzw)
vec4 noised1( in vec3 x )
{
    ivec3 i = ivec3(floor(x));
    vec3 w = fract(x);
    
    // quintic interpolation
    vec3 u = w*w*w*(w*(w*6.0-15.0)+10.0);
    vec3 du = 30.0*w*w*(w*(w-2.0)+1.0);
    
    // cubic interpolation
    //vec3 u = w*w*(3.0-2.0*w);
    //vec3 du = 6.0*w*(1.0-w);

    float a = hash(i+ivec3(0,0,0));
    float b = hash(i+ivec3(1,0,0));
    float c = hash(i+ivec3(0,1,0));
    float d = hash(i+ivec3(1,1,0));
    float e = hash(i+ivec3(0,0,1));
	float f = hash(i+ivec3(1,0,1));
    float g = hash(i+ivec3(0,1,1));
    float h = hash(i+ivec3(1,1,1));
    
    float k0 =   a;
    float k1 =   b - a;
    float k2 =   c - a;
    float k3 =   e - a;
    float k4 =   a - b - c + d;
    float k5 =   a - c - e + g;
    float k6 =   a - b - e + f;
    float k7 = - a + b + c - d + e - f - g + h;
    
    return vec4( k0 + k1*u.x + k2*u.y + k3*u.z + k4*u.x*u.y + k5*u.y*u.z + k6*u.z*u.x + k7*u.x*u.y*u.z, 
                 du * vec3( k1 + k4*u.y + k6*u.z + k7*u.y*u.z,
                            k2 + k5*u.z + k4*u.x + k7*u.z*u.x,
                            k3 + k6*u.x + k5*u.y + k7*u.x*u.y ) );
}



vec3 noised( in vec2 x )
{
    vec2 f = fract(x);
    vec2 u = f*f*f*(f*(f*6.0-15.0)+10.0);
    vec2 du = 30.0*f*f*(f*(f-2.0)+1.0);

    vec2 p = floor(x);
	float a = texture( iChannel1, (p+vec2(0.5,0.5))/256.0, 0.0 ).x;
	float b = texture( iChannel1, (p+vec2(1.5,0.5))/256.0, 0.0 ).x;
	float c = texture( iChannel1, (p+vec2(0.5,1.5))/256.0, 0.0 ).x;
	float d = texture( iChannel1, (p+vec2(1.5,1.5))/256.0, 0.0 ).x;
   
	return vec3(a+(b-a)*u.x+(c-a)*u.y+(a-b-c+d)*u.x*u.y,
				du*(vec2(b-a,c-a)+(a-b-c+d)*u.yx));
}

vec4 noised( vec3 p){
  
  //return noised1( p );
  return vec4( noised(p.xz), 0.0);
}


vec4 sinterrain(vec3 pos) {
    float sc = 0.5;
    float x = 0.5;
    return vec4 ( sc*sin(pos.x)-x + sc*sin(pos.z)-x,
                  sc*cos(pos.x),
                  0.0, 
                  sc*cos(pos.z)
    );
}

//rotation and inverse rotation matrices
const mat2 mrot = mat2(  0.80,  0.60,
                      -0.60,  0.80 );
const mat2 mroti = mat2( 0.80, -0.60,
                       0.60,  0.80 );
                       
                       
float noIterTerrain( in vec2 samplePos )
{
     vec3 n = noised(samplePos); //n.x is the noise n.yz is the derivative
     float height = 0.5 * n.x;   //add up the heights		
	 return height;
}


vec3 fbm_with_derivs( in vec2 samplePos )
{
    float f = 1.9; //how much to scale the position change by
    float s = 0.55; // how much to scale 'b' by -- scale
    float height = 0.0; //final height
    float amplitude = 0.5; //how much to scale the result of the noise by related to H/G
    vec2  d = vec2(0.0); ///derivative 
    mat2  m = mat2(1.0,0.0,0.0,1.0); //identity matrix - will hold the rotates
    for( int i=0; i< 13; i++ )
    {
        vec3 n = noised(samplePos); //n.x is the noise n.yz is the derivative
        
        height += amplitude * n.x;   //add up the heights		
        d += amplitude * m * n.yz;       //add up the derivatives
        
        amplitude *= s; //so, each iteration is half amplitude
        samplePos = f * mrot * samplePos;  //and 
        m = f * mroti * m;
    }

	return vec3( height*2.0, d );
}



vec4 terrain2(vec3 pos) {

    //noise2 = vec4(0.0);
    mat3 m = mat3(1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0);
    //m = mat3(0.8, -0.6, 0.0, 0.6, 0.8, 0.0,  0.0, 0.0, 1.0 );
    mat3 mrot = mat3(0.8, 0.0, -0.6, 
                  0.0, 1.0, 0.0,
                  0.6, 0.0,  0.8);  
    mat3 mroti = mat3(-0.8, 0.0, 0.6, 
                  0.0, 1.0, 0.0,
                  -0.6, 0.0,  -0.8);  
    vec3 normals = vec3(0.0);
    float scale = 0.50;
    float height = 0.0;
    float s = 0.5;
    float posScale = 2.0;
    float posScaleUp = 1.9;
    pos = pos * posScale;
    for(int i = 0; i < 1; i++) {
        vec4 n = s * noised(pos);
        height += n.x;
        normals += mroti*n.yzw;
        m = posScaleUp*mroti*m;
        pos = m*pos*posScaleUp;
        s *= scale;
    }
    return vec4 (height*600.0+600.0, normals);
}

vec3 eye = vec3(0.0, 0.0, 20.0);


vec4 terrain(vec3 pos) {
    return vec4( fbm_with_derivs(pos.xz), 1.0);
}
float terrainx(vec2 pos) {
  return terrain(vec3(pos,0.0)).x;
}

vec3 calcNormal( in vec3 pos, float t )
{
    vec2  eps = vec2( 0.001*t, 0.0 );
    return normalize( vec3( terrainx(pos.xz-eps.xy) - terrainx(pos.xz+eps.xy),
                            2.0*eps.x,
                            terrainx(pos.xz-eps.yx) - terrainx(pos.xz+eps.yx) ) );
}

// get gradient in the noise
vec3 gradient( vec3 pos ) {
    const float grad_step = 0.001;
	const vec3 dx = vec3( grad_step, 0.0, 0.0 );
	const vec3 dy = vec3( 0.0, grad_step, 0.0 );
	const vec3 dz = vec3( 0.0, 0.0, grad_step );
	return normalize (
		vec3(
            noised( pos + dx ).x - noised( pos - dx ).x,
			noised( pos + dy ).x - noised( pos - dy ).x,
			noised( pos + dz ).x - noised( pos - dz ).x	
            ));
}


struct Wave {
  float amp, freq, speed;
  float cx, cy;
};

       //amp frq  spd    dir
Wave waves[5] = Wave[5](
    Wave( 0.2, 1.18, 2.14, 0.4, 1.0),
   Wave( 1.0, 1.0,  2.0, 0.0, 1.0), //-1.0, 5.0),
 
    
    
    Wave( 0.2, 1.3, 2.1, -0.3, 0.3),
    Wave( 1.5, 0.5, 1.0, -1.0, 5.0),
    Wave( 1.5, 0.5, 1.0, -1.0, 5.0)   
    );

vec3 dir(Wave w) {
  return (vec3(w.cx, 0.0, w.cy)); 
}

float waveVal(vec2 z, vec2 uv) {
        //return length(z-uv);
    return dot(z, uv);
}
vec4 water3(int w, vec2 uv) {
    Wave wave = waves[w];
    
    //float ht = amp * exp(sin(freq*pos.x + iTime*speed));
    //vec3 d =   amp * exp(sin(freq*pos.x + iTime*speed)) * cos(freq*pos.x + iTime*speed) * freq * freq*pos.yzw;
    vec3 waveDir = dir(wave); //waveDir.y is...0
    waveDir = normalize(waveDir);
    float waveentry = 1.0/(float(w)+1.0);
    float pos = waveVal(waveDir.xz, uv);
    float ht = wave.amp * sin( wave.freq*pos + iTime*wave.speed);
    vec3 d  =  wave.amp * cos( wave.freq*pos + iTime*wave.speed) * wave.freq * waveDir;
    vec4 n = vec4(ht,vec3(d));
    return n;
}

float gs(vec2 p) {
    return smoothstep(0.7, 1.0, noised1(vec3(p,1.0)).x);
}





vec4 water2(vec2 uv) {
    float height = 0.0;
    vec3 d = vec3(0.0);
    for( int i=0; i < 1; i++ )
    {
        vec4 n = water3(i,uv); // , amplitude, f2, 1.0).xyz; //n.x is the noise n.yz is the derivative
        height +=  n.x;   //add up the heights		
        d += n.yzw;       //add up the derivatives
    }

	return vec4( height-5.25, d);
}

vec4 waved(vec2 position, vec2 direction, float frequency, float phase) {
  float x = dot(direction, position) * frequency + phase;
  float wave = exp(sin(x) - 0.5);
  float d = wave * cos(x);
  return vec4(wave, -d, wave*cos(x)*direction*frequency);
}


vec4 water(vec2 uv) {

    float iter = 0.0;
    float freq = 1.0;
    float sped = 1.0;
    float amp = 0.25;
    float sumV = 0.0;
    float sumW = 0.0;
    vec2 derivs = vec2(0.0, 0.0);
    for(int i = 0; i < 6; i++) {
        vec2 dir = vec2(sin(iter), cos(iter));
        vec4 res = waved(uv, dir, freq, iTime*sped);
        derivs += res.zw;
        uv += dir*res.y*amp*0.9;
        sumV += res.x * amp;
        sumW += amp;
        amp *=  0.983;
        freq *= 1.18;
        sped *= 1.12;
        iter += 123451.14159;
    }
    return vec4(sumV, derivs, 0.0);
}



vec3 waternormal(vec2 pos) {
  vec2 e = vec2(0.01, 0.0);
  return normalize(vec3(
      (-water(pos+e).x +    water(pos-e).x)/(2.0*e.x),
      1.0,
      (-water(pos+e.yx).x + water(pos-e.yx).x)/(2.0*e.x)
  ));
}


const vec3 sun = vec3(-2.0, 0.1, -1.0); 
const float T_END=1000.0;
vec4 raymarch(vec3 o, vec3 dir) {
    float t = 0.0;
    float lastd = 0.0;
    for(int i = 0; i < 2560; i++) {
        vec3 pos = o + t*dir;
        vec4 terr = water(pos.xz);
        float d = pos.y - terr.x; //x is the height, yzw is the normal
        
        d = min(d, length(pos-sun) - 0.5);
        if(length(pos-sun)- 0.5 < 0.001) {
            return vec4(t, normalize(pos-sun));
        }
        if( d < 0.001 ) {
           t = t - lastd*0.15 * (d)/(lastd-d);
           return vec4(t, normalize(vec3(-terr.y, 1.0, -terr.z))); // calcNormal(pos,t));
           //return vec4(t, gradient(pos));
        }
        t = t + d * 0.25;// / length(terr.yzw); // slow down where it's steep
        lastd = d;

        if(t > T_END) { //too far
          return vec4(t + 1.0, vec3(0.0));
        }
    }
    return vec4(T_END + 1.0, vec3(0.0));
}

vec3 colByDistance(float t) {
    if(t < 0.0) {
       return vec3(0.0, 0.0, 0.0);
    } else if (t < 10.0) {
      return vec3(0.0, 0.0, 1.0);
    } else if (t < 20.0) {
      return vec3(0.0, 0.5, 1.0);
    } else if (t < 30.0) {
      return vec3(0.0, 1.0, 0.0);
    } else if (t < 40.0) {
      return vec3(0.5, 1.0, 0.0);
    }
    else if (t < 50.0) {
      return vec3(1.0, 1.0, 0.0);
    }
    return vec3(1.0, 1.0, 1.0);
    

}

float sunCol(vec3 dir, vec3 sun) {
 return pow( max(0.0, dot(dir, sun) ),900.0) * 100.0;

}


void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
   
    // fragcoord/ iResolution.xy gives Normalized pixel coordinates (from 0 to 1)
    vec2 uv = fragCoord/iResolution.y; // gives 0 to 1 in y and a little bigger in x
    uv = fragCoord/iResolution.y * 2.0 - iResolution.xy/iResolution.y; 
    float scale = 5.5;
    float stand_back = 11.0;
     //lookat is 0,0,0
    //eye.z = -iTime;
    eye.y += 4.5;
    vec3 dir = normalize(vec3(uv.x, uv.y-0.5, -1.0));
  
    //dir = normalize(vec3(uv,-stand_back));
    vec4 hit = raymarch(eye, dir);
    vec3 normal = normalize(hit.yzw); 
   
    normal = normalize(vec3(hit.y, 1.0, hit.z));
   
    vec3 lightpos = sun; 
    vec3 hitpos = eye+hit.x*dir;
   
    //normal = waternormal(hitpos.xz);
    vec3 tolight = normalize(lightpos); // -hitpos);
    float scol = clamp(dot(tolight,normal), 0.0, 1.0 );
    scol = dot(tolight,normal);
    vec3  dotColor = vec3(0.18, 0.34, 0.64);
    //scol = max(scol, pow(scol, 5.0));
    //dotColor = vec3(1.0,1.0,1.0);
    
    
    vec3 normColor = scol*dotColor; // 
    //normColor = (vec3(scol)*0.9 +0.1)*dotColor + 0.1;
    vec3 col = normColor;
  
  
    vec3 skyColoro = vec3(0.2, 0.4, 1.0);
    
    vec3 skyColor = mix (vec3(1.0, 0.5, 0.1), skyColoro, smoothstep(0.0, 0.9, uv.y));
    col = mix(col, skyColoro*normal.y, 0.5);
    
    vec3 R = normalize(reflect(dir, normal));
    
    float fres = 0.04 + (1.0-0.04)*pow(1.0 - max(0.0, dot(-normal,dir)), 11.0);
    
    float amt = pow(clamp(dot(tolight,dir), 0.0, 1.0), 600.0);
    col = col + fres*amt*skyColor;
    col = col + fres*sunCol(R, tolight);
    //col = col + 0.2*skyColor;
  
    vec3 sunColor = vec3(1.0, 1.0, 0.0);
    skyColor = skyColor + pow(clamp(dot(dir,tolight),0.0,1.0), 123.0)*sunColor;

    col = (hit.x < T_END) ? col : skyColor;
  
    col = mix(col, sunColor, 0.1);
  
    if(hit.x > 40.0) {
        float fogexp = clamp(0.0, 1.0, pow(hit.x*0.3,1.5));
       // col = mix(col, skyColor,fogexp);  
        }
    fragColor = vec4(normal,1.0);
    //turn;
    //col = colByDistance(hit.x);
    //col = len;
    float len =  pow(length(hitpos.y*0.5),7.0);
    if(hit.x < T_END) {
        col = col + len*vec3(0.5);
    float lookupt = eye.y / dir.y;
    vec2 lookup = (eye+dir*lookupt).xz * 0.01 + iTime*0.01;
    float tex =  pow(1.0 - texture(iChannel1, lookup).x, 7.0) ;
    col =col + tex *vec3(0.0,1.0,1.0)*0.25;
    vec2 lookup2 = (eye+dir*lookupt).xz * 0.01 + vec2(1.0, 1.0) + iTime*.01;
    float tex2 =  pow(texture(iChannel1, lookup2).x,1.0) ;
    tex2 = smoothstep(0.5, 1.0, tex2);
    col = col + tex2 *vec3(0.0,0.5,0.2)*scol;
    
    }
    //col = vec3(0.0, 0.3, 0.3);
    fragColor = vec4(col, 1.0);
    //fragColor = vec4(vec3(tex),1.0);
    //fragColor = vec4(col, 1.0);
    
    #ifdef DEBUG
    int t = int(iTime)%10 * 4;
    //vec4 n = noised( vec3(uv, 0.0) );
    //vec3 normaln = gradient(vec3(uv, 0.0));
    //n.yzw = normaln.xyz;
    n.yzw = vec3(1.0);
    
    if(t < 10) {
        fragColor = vec4 ( vec3 ( n.y, -n.y, 0.0 ), 1.0);
    } else if(t < 20) {
        fragColor = vec4 ( vec3 ( n.z, -n.z, 0.0 ), 1.0);
    } else if(t < 30) {
        fragColor = vec4 ( vec3 ( n.w, -n.w, 0.0 ), 1.0);
    } else if(t < 40) {
        fragColor = vec4 (vec3 ( n.x*0.5+0.5 ), 1.0);
    }
    #endif
    //fragColor = vec4(abs(normal), 1.0);
    //fragColor = vec4(abs(normal.z), normal.z, 0.0, 1.0);
    //fragColor = vec4(abs(normal.z), normal.z, 0.0, 1.0);
    //fragColor = vec4(abs(normal.x), normal.x, 0.0, 1.0);
    //fragColor = vec4(vec3(hit.x)*0.2, 1.0);
    //fragColor = vec4(abs(dir), 1.0);
    //fragColor = vec4( abs(uv.y),uv.y, uv.x, 1.0);
    //fragColor = vec4( vec3( terrain(vec3(uv/0.3,0.5)).x), 1.0);
}