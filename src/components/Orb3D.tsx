import { useEffect, useRef } from 'react'

/** A lightweight, dependency-free WebGL sphere for the landing hero. */
export default function Orb3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl', { alpha: true, antialias: true })
    if (!gl) return
    const vertex = `attribute vec2 p; varying vec2 uv; void main(){ uv=p*.5+.5; gl_Position=vec4(p,0.,1.); }`
    const fragment = `precision mediump float; varying vec2 uv; uniform float t; uniform vec2 res;
    void main(){ vec2 q=(uv-.5)*vec2(res.x/res.y,1.); vec3 ro=vec3(0.,0.,2.7); vec3 rd=normalize(vec3(q,-1.55));
    float b=dot(ro,rd); float h=b*b-dot(ro,ro)+1.0; if(h<0.){ gl_FragColor=vec4(0.0); return; }
    float d=-b-sqrt(h); vec3 pos=ro+rd*d; vec3 n=normalize(pos); float a=t*.28;
    n.xz=mat2(cos(a),-sin(a),sin(a),cos(a))*n.xz; n.xy=mat2(cos(a*.6),-sin(a*.6),sin(a*.6),cos(a*.6))*n.xy;
    float bands=sin(n.y*18.+sin(n.x*8.+t)*1.8+t*.8); float shimmer=smoothstep(-.2,.9,bands);
    vec3 base=mix(vec3(.55,.20,.78),vec3(1.,.40,.72),smoothstep(-.7,.8,n.y+sin(n.x*5.+t)*.25));
    float light=max(dot(n,normalize(vec3(-.5,.8,1.))),0.); float rim=pow(1.-max(dot(n,vec3(0.,0.,1.)),0.),2.2);
    vec3 col=base*(.42+light*.75)+vec3(.32,.12,.5)*shimmer*.28+vec3(1.,.48,.82)*rim*.75;
    float alpha=smoothstep(0.,.025,h)*.97; gl_FragColor=vec4(col,alpha); }`
    function shader(type: number, source: string) { const s=gl!.createShader(type)!; gl!.shaderSource(s,source); gl!.compileShader(s); if(!gl!.getShaderParameter(s,gl!.COMPILE_STATUS)){ console.warn(gl!.getShaderInfoLog(s)); return null } return s }
    const vs=shader(gl.VERTEX_SHADER,vertex), fs=shader(gl.FRAGMENT_SHADER,fragment); if(!vs||!fs) return
    const program=gl.createProgram()!; gl.attachShader(program,vs); gl.attachShader(program,fs); gl.linkProgram(program); if(!gl.getProgramParameter(program,gl.LINK_STATUS)) return
    gl.useProgram(program); const buffer=gl.createBuffer()!; gl.bindBuffer(gl.ARRAY_BUFFER,buffer); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW)
    const loc=gl.getAttribLocation(program,'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0)
    const timeLoc=gl.getUniformLocation(program,'t'), resLoc=gl.getUniformLocation(program,'res'); let frame=0, raf=0
    const resize=()=>{const dpr=Math.min(window.devicePixelRatio||1,2);const w=Math.floor(canvas.clientWidth*dpr),h=Math.floor(canvas.clientHeight*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl!.viewport(0,0,w,h)}}
    const draw=(now:number)=>{resize();gl!.clearColor(0,0,0,0);gl!.clear(gl!.COLOR_BUFFER_BIT);gl!.uniform1f(timeLoc,now*.001);gl!.uniform2f(resLoc,canvas.width,canvas.height);gl!.drawArrays(gl!.TRIANGLES,0,6);raf=requestAnimationFrame(draw)}
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if(reduced){resize();gl.uniform1f(timeLoc,0);gl.uniform2f(resLoc,canvas.width,canvas.height);gl.drawArrays(gl.TRIANGLES,0,6)}else raf=requestAnimationFrame(draw)
    return()=>{cancelAnimationFrame(raf);gl.deleteProgram(program);gl.deleteBuffer(buffer);gl.deleteShader(vs);gl.deleteShader(fs)}
  }, [])
  return <canvas ref={canvasRef} className="orb-3d" aria-hidden="true" />
}
