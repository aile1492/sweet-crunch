import Phaser from 'phaser';

/**
 * 무지개 쉬머 PostFX 파이프라인 — colorBomb 발동 시 카메라/오브젝트에 적용
 *
 * GLSL ES 1.00 (WebGL 1 호환 — 모바일 지원)
 * - uTime: 경과 시간 (자동 증가)
 * - uIntensity: 이펙트 강도 (0.0~1.0)
 * - uCenter: 이펙트 중심점 (정규화 좌표)
 */
const FRAG_SHADER = `
precision mediump float;

uniform sampler2D uMainSampler;
uniform float uTime;
uniform float uIntensity;
uniform vec2 uCenter;

varying vec2 outTexCoord;

// HSV → RGB 변환 (GLSL 최적화)
vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
    vec4 texColor = texture2D(uMainSampler, outTexCoord);

    // 중심으로부터의 거리 기반 무지개 회전
    vec2 diff = outTexCoord - uCenter;
    float dist = length(diff);
    float angle = atan(diff.y, diff.x);

    // 시간 + 각도 + 거리 기반 색상 회전
    float hue = fract(angle / 6.28318 + uTime * 0.5 + dist * 2.0);
    vec3 rainbow = hsv2rgb(vec3(hue, 0.7, 1.0));

    // 디스토션: 원형 파동 (아주 미세하게)
    float wave = sin(dist * 30.0 - uTime * 8.0) * 0.003 * uIntensity;
    vec2 distortedUV = outTexCoord + normalize(diff + 0.001) * wave;
    vec4 distortedColor = texture2D(uMainSampler, distortedUV);

    // 무지개 오버레이를 ADD 블렌딩으로 합성
    float edgeFade = smoothstep(0.0, 0.4, dist) * smoothstep(1.0, 0.3, dist);
    vec3 finalColor = mix(distortedColor.rgb, distortedColor.rgb + rainbow * 0.35, uIntensity * edgeFade);

    // 중심부 밝은 플래시
    float centerGlow = exp(-dist * dist * 20.0) * uIntensity * 0.6;
    finalColor += vec3(1.0, 0.95, 0.8) * centerGlow;

    gl_FragColor = vec4(finalColor, distortedColor.a);
}
`;

export class RainbowPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  private _time = 0;
  private _intensity = 0;
  private _center = { x: 0.5, y: 0.5 };

  constructor(game: Phaser.Game) {
    super({
      game,
      name: 'RainbowPipeline',
      fragShader: FRAG_SHADER,
    });
  }

  /** 이펙트 강도 (0~1). 0이면 원본 그대로. */
  setIntensity(value: number): this {
    this._intensity = Phaser.Math.Clamp(value, 0, 1);
    return this;
  }

  /** 이펙트 중심점 (정규화 0~1 좌표) */
  setCenter(x: number, y: number): this {
    this._center.x = x;
    this._center.y = y;
    return this;
  }

  onPreRender(): void {
    this._time += 0.016; // ~60fps 기준 매 프레임
    this.set1f('uTime', this._time);
    this.set1f('uIntensity', this._intensity);
    this.set2f('uCenter', this._center.x, this._center.y);
  }
}

/**
 * 쉬머 글로우 PostFX — 특수 젬 아이들 상태에서 반짝이는 빛 줄기
 *
 * 가볍고 모바일 친화적. preFX 대비 고급 표현.
 */
const SHIMMER_FRAG = `
precision mediump float;

uniform sampler2D uMainSampler;
uniform float uTime;
uniform float uIntensity;

varying vec2 outTexCoord;

void main() {
    vec4 texColor = texture2D(uMainSampler, outTexCoord);

    // 대각선 스윕 라인
    float sweep = sin((outTexCoord.x + outTexCoord.y) * 8.0 - uTime * 3.0);
    sweep = smoothstep(0.6, 1.0, sweep);

    // 반짝임 하이라이트
    vec3 highlight = vec3(1.0, 0.98, 0.9) * sweep * uIntensity * 0.4;

    // 가장자리 비네트 (중심은 강하고 가장자리는 약하게)
    float cx = outTexCoord.x - 0.5;
    float cy = outTexCoord.y - 0.5;
    float vignette = 1.0 - (cx * cx + cy * cy) * 2.0;
    vignette = clamp(vignette, 0.0, 1.0);

    gl_FragColor = vec4(texColor.rgb + highlight * vignette, texColor.a);
}
`;

export class ShimmerPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  private _time = 0;
  private _intensity = 1.0;

  constructor(game: Phaser.Game) {
    super({
      game,
      name: 'ShimmerPipeline',
      fragShader: SHIMMER_FRAG,
    });
  }

  setIntensity(value: number): this {
    this._intensity = Phaser.Math.Clamp(value, 0, 1);
    return this;
  }

  onPreRender(): void {
    this._time += 0.016;
    this.set1f('uTime', this._time);
    this.set1f('uIntensity', this._intensity);
  }
}

/**
 * 충격파(Shockwave) PostFX — bomb/wrapped 발동 시 카메라에 적용
 *
 * 중심에서 원형으로 퍼지는 굴절 파동.
 */
const SHOCKWAVE_FRAG = `
precision mediump float;

uniform sampler2D uMainSampler;
uniform float uTime;
uniform float uProgress;
uniform vec2 uCenter;
uniform float uAmplitude;
uniform float uWavelength;

varying vec2 outTexCoord;

void main() {
    vec2 diff = outTexCoord - uCenter;
    float dist = length(diff);

    // 충격파 링: progress가 진행됨에 따라 퍼짐
    float ringDist = abs(dist - uProgress);
    float ringWidth = uWavelength;

    float wave = 0.0;
    if (ringDist < ringWidth) {
        float ratio = 1.0 - ringDist / ringWidth;
        wave = sin(ratio * 3.14159) * uAmplitude * (1.0 - uProgress);
    }

    vec2 displacement = normalize(diff + 0.0001) * wave;
    vec4 color = texture2D(uMainSampler, outTexCoord + displacement);

    // 링 가장자리에 밝은 하이라이트
    float highlight = 0.0;
    if (ringDist < ringWidth * 0.5) {
        highlight = (1.0 - ringDist / (ringWidth * 0.5)) * 0.15 * (1.0 - uProgress);
    }

    gl_FragColor = vec4(color.rgb + vec3(highlight), color.a);
}
`;

export class ShockwavePipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  private _progress = 0;
  private _center = { x: 0.5, y: 0.5 };
  private _amplitude = 0.03;
  private _wavelength = 0.12;

  constructor(game: Phaser.Game) {
    super({
      game,
      name: 'ShockwavePipeline',
      fragShader: SHOCKWAVE_FRAG,
    });
  }

  setProgress(value: number): this {
    this._progress = value;
    return this;
  }

  setCenter(x: number, y: number): this {
    this._center.x = x;
    this._center.y = y;
    return this;
  }

  setAmplitude(value: number): this {
    this._amplitude = value;
    return this;
  }

  setWavelength(value: number): this {
    this._wavelength = value;
    return this;
  }

  onPreRender(): void {
    this.set1f('uTime', 0);
    this.set1f('uProgress', this._progress);
    this.set2f('uCenter', this._center.x, this._center.y);
    this.set1f('uAmplitude', this._amplitude);
    this.set1f('uWavelength', this._wavelength);
  }
}
