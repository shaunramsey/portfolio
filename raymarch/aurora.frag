//aurora.frag
vec3 aurora(vec3 ori, vec3 dir, float t, float dist, float time) {
  t = 500.0 / -dir.z; //howl ong does it take z to go 500.0
  float dy = dir.y;
  vec3 pos = ori + dir*t;
  //pos = pos * 0.01;
  float maxheight = eye.y + dist;
  float minheight = eye.y - 0.0*dist;
  float height = 1.0-(pos.y - minheight)/(maxheight-minheight);
  float aspect = 640.0/360.0;
  float left = eye.x - aspect*dist;
  float right = eye.x + aspect*dist;
  float x = (pos.x - left)/(right-left);
  float s = 0.5 * sin(x*(3.0 * 3.14159) + time*0.0125) + 0.5;
  s += 0.14 * sin(x*(4.0*3.14159)+time*0.125);
  float bottom = 0.96;
  float h1 = clamp(height*2.5-s, 0.0, 1.0);
  float area = h1 * (1.0 - smoothstep(0.7, 0.75, h1));
  float upper = h1 * (1.0 - smoothstep(0.0, 0.8, h1));
  vec3 base = vec3(0.0);

  //base += vec3(pow(area,2.0+sin(time*1.0) ))*vec3(0.0, 1.0, 1.0);
  base += 0.25*(exp(area)-1.0) * vec3(0.0, 1.0, 1.0);
  //float noise = length(texture(iChannel0,vec2(x,height + time)*0.5).xyz);
  vec3 curtain = vec3(0.0);
  float noise = max(noised1(pos.xxx*0.001 + time*0.01).x, noised1((pos.xxx+50.0)*0.004 + time*0.1).x);
  noise = smoothstep(pow(noise, 0.5)*2.0, 0.0, 1.0)*2.0;
  curtain += upper * noise * vec3(0.2, 0.0, 0.2)*2.0 * smoothstep(-1.5, 0.5, (1.0-height));
  vec3 baseline = vec3(0.0);
  baseline +=  area * vec3(0.0, 0.3, 0.3) * pow(exp(h1)-1.0, 4.0);
  vec3 col = base + baseline + curtain;
  float noise2 = exp(- (noised1(pos.xxx*0.01 + time*0.01).x) + upper*upper) * upper;
  col += vec3(0.0, 1.0, 1.0) * vec3(exp(-noise)*height*upper);
  col = mix(col, vec3(noise2)*vec3(0.1,-0.1,0.2), noise2);
  col *= 3.0 * vec3( pow(1.0 - exp(-area), 1.0) );
  return col;


}