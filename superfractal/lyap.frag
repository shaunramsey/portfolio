
const float ab[5] = float[5](1.0,1.0,0.0,1.0,0.0); //AABAB for lyap
const int abLen = 5;

// constants for the super fracta
const float a = 0.1;
const int n = 6; //alternating time scale 4 b1s then 4 b2s. (from uv)
const float ea = exp(a);
const int num_warmups = 4000; // should be 0 mod 2n
const float lyap_iters = 8000.0;

//super fractal fn
float F(float x, float b) {
  float t = (ea * x) * (((ea - 1.0) * x) - (b * x) + b + 1.0);
  float bot = pow(((ea - 1.0)*x + 1.0), 2.0);
  return t/bot;
}

//derivative of the super fractal fn
float Fprime(float x, float b) {
  float t = -ea *((x * ea + x - 1.0) * b - (x*ea) + x - 1.0);
  float bot = pow((ea - 1.0) * x + 1.0,3.0);
  return t/bot;
}

//this is next for the logistic /lyap eqn
float nextx(vec2 uv, float xnot, int i) {
   xnot = ab[i%abLen]*uv[0]*xnot*(1.0-xnot) + (1.0-ab[i%abLen])*uv[1]*xnot*(1.0-xnot);  //lyap
   return xnot;
}

//whats the b value from uv.x and uv.y given iters and n)
float getb(int i, vec2 uv) {
  return (i % (2 * n) < n) ? uv.x : uv.y;
}

float warmup(vec2 uv, float xnot) {
   // b value alternates with  uv.x n/2 times then uv.y n/2 times
    for(int i = 0; i < num_warmups; i++) {
      //lyap uses 
      // xnot = nextx(uv, xnot, i);
      // super fractal
        xnot = F(xnot, getb(i,uv));
    }
    return xnot;
}

float lyap(vec2 uv, float xnot) {
  float lyapv = 0.0;
  for(int i = 0; i < int(lyap_iters); i++){ 
      // lyap uses the next two lines:

      // float intermed =  abs(ab[i%5]*uv[0]*(1.0-2.0*xnot) + (1.0-ab[i%5])*uv[1]*(1.0-2.0*xnot));
      // xnot = nextx(uv, xnot, i);
    //super fractal
  
    float intermed = abs(Fprime(xnot, getb(i,uv)));
    xnot = F(xnot, getb(i,uv));
      
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
 vec3 red = vec3(1.0,0.5,0.2); //well not really red eh?

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
float La(float a) {
   //lya return 2.0
   // return 2.0;
  return ea + 1.0;
}

//upper bound on area of interest
float Ua(float a) {
  //lya return 4.0
  // return 4.0;
  return ( sqrt( exp(2.0 * a) + (8.0 * ea)) + ea + 2.0) * 0.5;
}


void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = fragCoord/iResolution.xy;
    uv *= (Ua(a)-La(a)); 
    uv[0] += La(a);
    uv[1] += La(a);
    float xnot = warmup(uv, 0.5);
    float lyapv = lyap(uv,xnot);
    // Time varying pixel color
    //vec3 col = 0.5 + 0.5*cos(iTime+uv.xyx+vec3(0,2,4));
    vec3 col = lyapv < 0.0 ? getColor(lyapv)  : vec3(0.,0.,1.);
    // Output to screen
    fragColor = vec4(col,1.0);
}