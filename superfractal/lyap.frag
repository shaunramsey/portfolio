
const float ab[5] = float[5](1.0,1.0,0.0,1.0,0.0); //AABAB
const int abLen = 5;

// constants for the super fracta
const float a = 4.3;
const float n = 4.0; //alternating time scale
const float ea = exp(a);
const int num_warmups = 1000;
const int lyap_iters = 4000;


float nextx(vec2 uv, float xnot, int i) {
   xnot = ab[i%abLen]*uv[0]*xnot*(1.0-xnot) + (1.0-ab[i%abLen])*uv[1]*xnot*(1.0-xnot);  //lyap
   //super fractal:
   return xnot;
}
float warmup(vec2 uv, float xnot) {
    for(int i = 0; i < num_warmups; i++) {
      xnot = nextx(uv, xnot, i);
    }
    return xnot;
}

float lyap(vec2 uv, float xnot) {
  float lyapv = 0.0;
  for(int i = 0; i < lyap_iters; i++){ 
    xnot = nextx(uv, xnot, i);
    // lyap: 
    float intermed =  abs(ab[i%5]*uv[0]*(1.0-2.0*xnot) + (1.0-ab[i%5])*uv[1]*(1.0-2.0*xnot));
    //float intermed = 1.0;
    if(intermed < 0.00001) {
      return -1e30;
    }
    lyapv += log(intermed);
  }
  return lyapv;
}

//smooth between two colors
vec3 smoothColors(vec3 a, vec3 b, float dist) {
//distance is assumed 0.0 to 1.0 with 0.0 "on" b and 1.0 "on" a
  return a*dist + b*(1.0-dist);
}

const float dropoff = 8000.0;
const float dropoff2 = 15.0;
vec3 getColor(float lyapv) {
 vec3 black = vec3(0.0, 0.0, 0.0);
 vec3 yellow = vec3(1.0, 0.849, 0.0);
 vec3 edge = vec3(1.0, 1.0, 1.0);
 if(lyapv < -dropoff) {
   return black;
 } else if(lyapv > -dropoff2) {
   return smoothColors(yellow, edge, -lyapv/dropoff2);
 } else {
   return smoothColors(black,yellow,-lyapv/dropoff);
 }
}

//lower bound area of interest
float La(float a) {
   //lya
  return 2.0;
  return ea + 1.0;
}

//upper bound on area of interest
float Ua(float a) {
  //lya
  return 4.0;
  return ( sqrt( exp(2.0*a) + (8.0 * ea) + ea + 2.0)) /2.0;
}


void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = fragCoord/iResolution.xy;
    uv *= (Ua(a)-La(a)); 
    uv[0] += La(a);
    uv[1] += La(a);
    float xnot = warmup(uv,0.5);
    float lyapv = lyap(uv,xnot);
    // Time varying pixel color
    //vec3 col = 0.5 + 0.5*cos(iTime+uv.xyx+vec3(0,2,4));
    vec3 col = lyapv < 0.0 ? getColor(lyapv)  : vec3(0.,0.,1.);
    // Output to screen
    fragColor = vec4(col,1.0);
}