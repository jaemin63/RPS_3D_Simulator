# RPS GLTF Viewer - 프로젝트 분석 문서

## 프로젝트 개요
- **프로젝트명**: rps-gltf-viewer
- **기술 스택**: React 19.1.1 + TypeScript + Vite 7.1.7 + Three.js 0.180.0
- **목적**: RPS(Rock-Paper-Scissors) 3D 모델을 브라우저에서 렌더링하는 GLTF 뷰어

## 디렉토리 구조
```
rps-gltf-viewer/
├── public/
│   ├── models/
│   │   ├── Multi_RPS.gltf      # RPS 3D 모델 (GLTF 포맷)
│   │   └── Multi_RPS.bin       # 모델 바이너리 데이터
│   └── vite.svg
├── src/
│   ├── components/
│   │   └── GLTFViewer.tsx      # 메인 3D 뷰어 컴포넌트
│   ├── assets/
│   │   └── react.svg
│   ├── App.tsx                 # 앱 루트 컴포넌트
│   ├── App.css                 # 앱 스타일
│   ├── main.tsx                # 앱 엔트리 포인트
│   └── index.css               # 글로벌 스타일
├── index.html                  # HTML 템플릿
├── package.json                # 프로젝트 의존성
├── vite.config.ts              # Vite 설정
├── tsconfig.json               # TypeScript 설정
├── tsconfig.app.json           # 앱용 TS 설정
├── tsconfig.node.json          # Node용 TS 설정
└── eslint.config.js            # ESLint 설정
```

## 주요 컴포넌트

### 1. App.tsx (src/App.tsx:1)
- 앱의 루트 컴포넌트
- GLTFViewer를 전체 화면으로 렌더링
- 모델 경로: `/models/Multi_RPS.gltf`

### 2. GLTFViewer.tsx (src/components/GLTFViewer.tsx:1)
핵심 3D 뷰어 컴포넌트로 다음 기능 포함:

#### 주요 기능
- **Three.js 씬 초기화** (GLTFViewer.tsx:23-108)
  - WebGLRenderer 설정 (antialias, tone mapping)
  - PerspectiveCamera 설정 (FOV 45도)
  - AmbientLight + DirectionalLight 조명
  - GridHelper, AxesHelper (helpers 옵션으로 제어)

- **OrbitControls** (GLTFViewer.tsx:56-75)
  - 카메라 회전, 줌, 팬 기능
  - Damping 활성화
  - 이벤트 로깅 (pointerdown, wheel, controls change)

- **GLTF 모델 로딩** (GLTFViewer.tsx:111-221)
  - GLTFLoader + DRACOLoader 사용
  - Meshopt 디코더 동적 import (선택적)
  - Fetch API로 .gltf 파일 로드
  - AbortController로 중단 처리

- **모델 처리** (GLTFViewer.tsx:162-191)
  - 메시 재질 DoubleSide 설정
  - 투명도 보정 (opacity < 0.2 → 1.0)
  - BoundingBox 기반 스케일 정규화 (5 유닛)
  - 원점 정렬

- **카메라 자동 피팅** (GLTFViewer.tsx:272-287)
  - `fitCameraToBox()`: 모델 크기에 맞춰 카메라 거리 조정
  - FOV와 aspect ratio 고려

- **리소스 정리** (GLTFViewer.tsx:262-271)
  - `disposeObject()`: 지오메트리, 재질, 텍스처 메모리 해제

#### Props
- `src: string` - GLTF 파일 경로 (필수)
- `background?: number` - 배경색 (기본값: 0x111214)
- `helpers?: boolean` - 그리드/축 헬퍼 표시 (기본값: true)

#### 상태 관리
- `status: string` - 로딩 상태 메시지 표시

## 의존성

### 런타임 의존성
- **react**: ^19.1.1
- **react-dom**: ^19.1.1
- **three**: ^0.180.0
- **@types/three**: ^0.180.0

### 개발 의존성
- **vite**: ^7.1.7
- **typescript**: ~5.9.3
- **eslint**: ^9.36.0
- **@vitejs/plugin-react**: ^5.0.4

## Three.js 사용 모듈
- `GLTFLoader` - GLTF/GLB 파일 로딩
- `DRACOLoader` - DRACO 압축 지오메트리 디코딩
- `OrbitControls` - 카메라 컨트롤
- `MeshoptDecoder` - Meshopt 압축 (선택적)

## 스타일링
- **index.css**: 전체 화면 레이아웃 (`overflow: hidden`)
- **App.css**: 사용하지 않음 (GLTFViewer가 전체 화면)
- **inline styles**: GLTFViewer 컴포넌트 내부 (position: absolute)

## 렌더링 파이프라인
1. Vite 개발 서버 시작 (`npm run dev`)
2. `main.tsx`가 `#root`에 React 앱 마운트
3. `App.tsx`가 `GLTFViewer` 렌더링
4. GLTFViewer가 Three.js 씬 초기화
5. GLTF 파일 fetch → parse → 씬에 추가
6. 애니메이션 루프 (requestAnimationFrame)

## 발견된 문제

### 주요 문제: DRACO 디코더 경로 오류
- **위치**: src/components/GLTFViewer.tsx:139
- **문제**: `draco.setDecoderPath("/draco/");` 경로가 존재하지 않음
- **영향**: DRACO 압축된 GLTF 모델 로딩 실패
- **해결 방법**:
  1. CDN 경로 사용 (권장)
  2. 또는 로컬에 DRACO 디코더 파일 복사

### 부차적 문제
- **App.css 미사용**: App.tsx에서 import하지만 GLTFViewer가 전체 화면이라 불필요
- **index.css 중복**: `html, body, #root` 스타일이 두 번 선언됨 (1-9행, 54-62행)

## 권장 수정 사항

1. **DRACO 경로 수정** (필수)
   ```typescript
   draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
   ```

2. **불필요한 코드 정리**
   - App.css 파일 삭제 또는 사용
   - index.css 중복 스타일 제거

3. **에러 처리 개선**
   - 더 자세한 에러 메시지
   - 폴백 UI

4. **성능 최적화**
   - React.memo로 GLTFViewer 래핑
   - useMemo로 로더 인스턴스 캐싱

## 빌드 및 실행

### 개발 모드
```bash
npm install
npm run dev
```

### 프로덕션 빌드
```bash
npm run build
npm run preview
```

### Lint
```bash
npm run lint
```

## 브라우저 호환성
- WebGL 2.0 지원 브라우저 필요
- 최신 Chrome, Firefox, Safari, Edge 권장

## 파일 크기
- Multi_RPS.gltf: GLTF 메타데이터
- Multi_RPS.bin: 실제 3D 데이터 (크기 확인 필요)

---

**작성일**: 2025-10-23
**분석 도구**: Claude Code
**프로젝트 버전**: 0.0.0
