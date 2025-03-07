
const float ab[5] = float[5](1.0,1.0,0.0,1.0,0.0); //AABAB for lyap
const int abLen = 5;

// constants for the super fracta

const int num_warmups = 4000; // should be 0 mod 2n
const float lyap_iters = 8000.0;
//super fractal fn
float F(float x, float b, float ea) {
  float t = (ea * x) * (((ea - 1.0) * x) - (b * x) + b + 1.0);
  float bot = pow(((ea - 1.0)*x + 1.0), 2.0);
  return t/bot;
}

//derivative of the super fractal fn
float Fprime(float x, float b, float ea) {
  float t = -ea *((x * ea + x - 1.0) * b - (x*ea) + x - 1.0);
  float bot = pow((ea - 1.0) * x + 1.0,3.0);
  return t/bot;
}

//this is next for the logistic /lyap eqn
float nextx(vec2 uv, float xnot, int i) {
   xnot = ab[i%abLen]*uv[0]*xnot*(1.0-xnot) + (1.0-ab[i%abLen])*uv[1]*xnot*(1.0-xnot);  //lyap
   return xnot;
}

//whats the b value from uv.x and uv.y given iters and n
float getb(int i, vec2 uv, int n) {
  return (i % (2 * n) < n) ? uv.x : uv.y;
}

float warmup(vec2 uv, float xnot, int n, float ea) {
   // b value alternates with  uv.x n/2 times then uv.y n/2 times
    for(int i = 0; i < num_warmups; i++) {
      //lyap uses 
      // xnot = nextx(uv, xnot, i);
      // super fractal
        xnot = F(xnot, getb(i, uv, n), ea);
    }
    return xnot;
}

float lyap(vec2 uv, float xnot, int n, float ea) {
  float lyapv = 0.0;
  for(int i = 0; i < int(lyap_iters); i++){ 
      // lyap uses the next two lines:

      // float intermed =  abs(ab[i%5]*uv[0]*(1.0-2.0*xnot) + (1.0-ab[i%5])*uv[1]*(1.0-2.0*xnot));
      // xnot = nextx(uv, xnot, i);
    //super fractal
  
    float intermed = abs(Fprime(xnot, getb(i, uv, n), ea));
    xnot = F(xnot, getb(i, uv, n), ea);
      
    if(intermed < 0.00001) {
      return -1e30;
    }
    lyapv += log(intermed);
  }
  return lyapv;// technically / lyap_iters;
}

//smooth between two colors
vec3 smoothColors(vec3 a, vec3 b, float dist) {
//distance is assumed 0.0 to 1.0 with 0.0 "on" b and 1.0 "on" a
  return a*dist + b*(1.0-dist);
}

//below dropoff get black
//between dropoff and dropoff2 get black to yellow
//over dropoff2 etc
const float dropoff = 10000.0;  //8000,15 for lyap
const float dropoff2 = 1000.0;
const float dropoff3 = 10.0;
const float dropoff4 = 0.0;

vec3 getColor(float lyapv) {
 vec3 black = vec3(0.0, 0.0, 0.0);
 vec3 yellow = vec3(1.0, 0.849, 0.0);
 vec3 edge = vec3(1.0, 0.5, 1.0);
 vec3 red = vec3(1.0, 0.5, 0.2);

 if(lyapv < -dropoff) {
   return black;
 } else if(lyapv < -dropoff2) {
    return smoothColors(black,yellow,(-lyapv-dropoff2)/(dropoff-dropoff2));
 } else if(lyapv < -dropoff3) {
 return smoothColors(yellow,red,(-lyapv-dropoff3)/(dropoff2-dropoff3));
 } else {
   return smoothColors(yellow, edge, (-lyapv-dropoff4)/(dropoff3-dropoff4));
 }
}

//lower bound area of interest
float La(float a, float ea) {
   //lya return 2.0
   // return 2.0;
  return ea + 1.0;
}

//upper bound on area of interest
float Ua(float a, float ea) {
  //lya return 4.0
  // return 4.0;
  return ( sqrt( exp(2.0 * a) + (8.0 * ea)) + ea + 2.0) * 0.5;
}

int nin = 10;
void mainImage( out vec4 fragColor, in vec2 fragCoord )
{

float a = 0.1;
float ea = exp(a);
a = iTime*.1;
ea = exp(a);
  
    //nin = (int(iTime*10.0))*2+2;
    //vec2 up = texelFetch(iChannel1, ivec2(38,0), 0).x * vec2(0, 1);
    //vec2 right = texelFetch(iChannel1, ivec2(39, 0), 0).x * vec2(1, 0);
    //vec2 down = texelFetch(iChannel1, ivec2(40, 0), 0).x * vec2(0, -1);
    
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = fragCoord/iResolution.xy;
    uv *= (Ua(a, ea)-La(a, ea)); 
    uv[0] += La(a, ea);
    uv[1] += La(a, ea);
    float xnot = warmup(uv, 0.5, nin, ea);
    float lyapv = lyap(uv, xnot, nin, ea);
    // Time varying pixel color
    //vec3 col = 0.5 + 0.5*cos(iTime+uv.xyx+vec3(0,2,4));
    vec3 col = lyapv < 0.0 ? getColor(lyapv) : vec3(0.,0.,1.);
    // Output to screen
      fragColor = vec4(col, 1.0);
}